/**
 * TRACY USA — Stripe webhook handler
 * ---------------------------------------------------------------------
 * Verifies the Stripe signature on the RAW request body (critical —
 * platform wrappers must NOT JSON-parse the body before calling this),
 * and on `checkout.session.completed` writes an order document to
 * Firestore and decrements inventory for each purchased product.
 *
 * Configure the endpoint in the Stripe Dashboard → Developers →
 * Webhooks → Add endpoint:
 *   https://yourdomain.com/api/stripe-webhook
 * Events to send: checkout.session.completed
 */

import Stripe from "stripe";
import { getAdminDb } from "./firebaseAdmin.js";

export async function handleStripeWebhook({ rawBody, signatureHeader }) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    const err = new Error("Stripe webhook is not configured (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET missing).");
    err.statusCode = 500;
    throw err;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const wrapped = new Error(`Webhook signature verification failed: ${err.message}`);
    wrapped.statusCode = 400;
    throw wrapped;
  }

  if (event.type === "checkout.session.completed") {
    await fulfillOrder(stripe, event.data.object);
  }
  // Other event types (payment_intent.payment_failed, charge.refunded, etc.)
  // can be handled here as your operations flow requires — safely ignored
  // otherwise, which is the correct default per Stripe's webhook guidance.

  return { statusCode: 200, jsonBody: { received: true } };
}

async function fulfillOrder(stripe, session) {
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(session.id);

  const existing = await orderRef.get();
  if (existing.exists) return; // idempotent — Stripe may retry webhook delivery

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

  const order = {
    id: session.id,
    stripeSessionId: session.id,
    stripePaymentIntentId: session.payment_intent || null,
    customerEmail: session.customer_details?.email || session.customer_email || null,
    locale: session.metadata?.locale || "en",
    currency: session.currency,
    amountSubtotal: session.amount_subtotal,
    amountTotal: session.amount_total,
    shippingAddress: session.shipping_details
      ? {
          name: session.shipping_details.name,
          line1: session.shipping_details.address?.line1,
          line2: session.shipping_details.address?.line2,
          city: session.shipping_details.address?.city,
          state: session.shipping_details.address?.state,
          postalCode: session.shipping_details.address?.postal_code,
          country: session.shipping_details.address?.country,
        }
      : null,
    lineItems: lineItems.data.map((li) => ({
      description: li.description,
      quantity: li.quantity,
      amountTotal: li.amount_total,
    })),
    status: "paid",
    createdAt: new Date().toISOString(),
  };

  await orderRef.set(order);

  // Best-effort inventory decrement, matched via the productIds we stashed
  // in session metadata at checkout-session creation time.
  const productIds = (session.metadata?.productIds || "").split(",").filter(Boolean);
  await Promise.all(
    productIds.map(async (productId) => {
      const productRef = db.collection("products").doc(productId);
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists) return;
          const data = snap.data();
          if (!data.inventory?.trackInventory) return;
          const matchingLine = lineItems.data.find((li) => li.description === data.translations?.en?.title);
          const qty = matchingLine?.quantity || 1;
          const nextQty = Math.max(0, (data.inventory.quantity || 0) - qty);
          tx.update(productRef, { "inventory.quantity": nextQty });
        });
      } catch (err) {
        console.error(`Inventory decrement failed for ${productId}:`, err.message);
      }
    })
  );
}

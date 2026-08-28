/**
 * THE BOTANICAL APOTHECARY — Stripe webhook handler
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

function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format((cents || 0) / 100);
  } catch (e) {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }
}

/**
 * Sends a branded order confirmation email via Resend's HTTP API
 * (https://resend.com — a simple email API, generous free tier, no SDK
 * dependency needed since this is one plain fetch call).
 *
 * Requires two env vars to actually send:
 *   RESEND_API_KEY     — from the Resend dashboard
 *   ORDER_EMAIL_FROM   — a "From" address on a domain verified in Resend,
 *                         e.g. "The Botanical Apothecary <orders@yourdomain.com>"
 *
 * Silently skipped (order still saves fine) if either is missing — order
 * confirmation email is a nice-to-have on top of Stripe's own payment
 * receipt, not something checkout should ever depend on.
 */
async function sendOrderConfirmationEmail(order) {
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM) {
    console.warn("Order confirmation email skipped: RESEND_API_KEY / ORDER_EMAIL_FROM not configured.");
    return;
  }
  if (!order.customerEmail) return;

  const itemsHtml = (order.lineItems || [])
    .map((li) => `<tr><td style="padding:6px 0;">${li.quantity}× ${escapeHtmlEmail(li.description)}</td><td style="padding:6px 0;text-align:right;">${formatMoney(li.amountTotal, order.currency)}</td></tr>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
      <h1 style="font-size:20px;">Thank you for your order!</h1>
      <p style="color:#555;">Order confirmation — ${escapeHtmlEmail(order.id)}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">${itemsHtml}</table>
      <p style="font-weight:bold;">Total: ${formatMoney(order.amountTotal, order.currency)}</p>
      ${order.shippingAddress ? `<p style="color:#555;">Shipping to:<br/>${[order.shippingAddress.name, order.shippingAddress.line1, order.shippingAddress.line2, `${order.shippingAddress.city || ""} ${order.shippingAddress.state || ""} ${order.shippingAddress.postalCode || ""}`, order.shippingAddress.country].filter(Boolean).map(escapeHtmlEmail).join("<br/>")}</p>` : ""}
      <p style="color:#999;font-size:12px;margin-top:24px;">The Botanical Apothecary</p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM,
        to: order.customerEmail,
        subject: "Your The Botanical Apothecary order is confirmed",
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Order confirmation email failed (${res.status}):`, body);
    }
  } catch (err) {
    console.error("Order confirmation email failed:", err.message);
  }
}

function escapeHtmlEmail(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function fulfillOrder(stripe, session) {
  const db = getAdminDb();
  const orderRef = db.collection("tracy_orders").doc(session.id);

  const existing = await orderRef.get();
  if (existing.exists) return; // idempotent — Stripe may retry webhook delivery

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

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

  await sendOrderConfirmationEmail(order);

  // Best-effort inventory decrement, matched via the productIds we stashed
  // in session metadata at checkout-session creation time.
  //
  // Matching is done via each line item's underlying Stripe Product
  // metadata.productId (set at checkout-session creation in
  // checkoutHandler.js's price_data.product_data.metadata) — NOT by
  // comparing product titles, because Stripe Checkout renders the line
  // item description in the customer's own checkout locale (any of the
  // site's 24 languages), so a title comparison against the English
  // Firestore title would silently fail for every non-English purchase.
  // Falls back to positional matching (line items are created in the
  // same order as the cart's `items` array) for the rare case a product
  // uses an admin-preset Stripe priceId, whose Product metadata this
  // codebase doesn't control.
  const productIds = (session.metadata?.productIds || "").split(",").filter(Boolean);

  function findLineItemFor(productId, index) {
    const byMetadata = lineItems.data.find((li) => li.price?.product?.metadata?.productId === productId);
    return byMetadata || lineItems.data[index] || null;
  }

  await Promise.all(
    productIds.map(async (productId, index) => {
      const productRef = db.collection("tracy_products").doc(productId);
      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(productRef);
          if (!snap.exists) return;
          const data = snap.data();
          if (!data.inventory?.trackInventory) return;
          const matchingLine = findLineItemFor(productId, index);
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

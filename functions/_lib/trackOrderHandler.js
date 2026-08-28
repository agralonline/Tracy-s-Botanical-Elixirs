/**
 * THE BOTANICAL APOTHECARY — "Track Order" core handler (public, no login required)
 * ---------------------------------------------------------------------
 * A customer looks up their order with Order ID + the email used at
 * checkout — no account system needed. Only a small, safe subset of the
 * order is returned (never the full shipping address or raw Stripe IDs),
 * and the email must match exactly (case-insensitive) or the lookup
 * fails the same way as "not found", so this can't be used to fish for
 * other customers' orders by guessing IDs.
 */

import { getAdminDb } from "./firebaseAdmin.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

export async function handleTrackOrder({ body }) {
  const orderId = (body?.orderId || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  if (!orderId || !email) throw badRequest("orderId and email are required.");

  const db = getAdminDb();
  const snap = await db.collection("tracy_orders").doc(orderId).get();

  const notFound = () => {
    const err = new Error("No order found with that Order ID and email.");
    err.statusCode = 404;
    throw err;
  };

  if (!snap.exists) notFound();
  const order = snap.data();
  if ((order.customerEmail || "").trim().toLowerCase() !== email) notFound();

  return {
    statusCode: 200,
    jsonBody: {
      id: snap.id,
      status: order.status || "paid",
      trackingNumber: order.trackingNumber || "",
      carrier: order.carrier || "",
      trackingUrl: order.trackingUrl || "",
      lineItems: (order.lineItems || []).map((li) => ({ description: li.description, quantity: li.quantity })),
      amountTotal: order.amountTotal,
      currency: order.currency,
      createdAt: order.createdAt,
    },
  };
}

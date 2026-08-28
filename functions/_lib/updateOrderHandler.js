/**
 * THE BOTANICAL APOTHECARY — "Update Order" core handler
 * ---------------------------------------------------------------------
 * tracy_orders is never client-writable (see firestore.rules — only the
 * Stripe webhook, via the Admin SDK, may write it) so the admin panel's
 * Status / Tracking Number / Carrier fields go through this endpoint
 * instead of a direct Firestore write. Admin-only (requireAdmin).
 *
 * Also powers the public order-tracking lookup (trackOrderHandler.js),
 * which reads exactly the fields this endpoint writes.
 */

import { getAdminDb, requireAdmin } from "./firebaseAdmin.js";

const ALLOWED_STATUSES = ["paid", "processing", "shipped", "delivered"];

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

export async function handleUpdateOrder({ body, authorizationHeader }) {
  await requireAdmin(authorizationHeader);

  const orderId = (body?.orderId || "").trim();
  if (!orderId) throw badRequest("orderId is required.");

  const db = getAdminDb();
  const orderRef = db.collection("tracy_orders").doc(orderId);
  const snap = await orderRef.get();
  if (!snap.exists) {
    const err = new Error("Order not found.");
    err.statusCode = 404;
    throw err;
  }

  const update = {};
  if (body?.status !== undefined) {
    const status = String(body.status).trim();
    if (!ALLOWED_STATUSES.includes(status)) throw badRequest(`status must be one of: ${ALLOWED_STATUSES.join(", ")}`);
    update.status = status;
  }
  if (body?.trackingNumber !== undefined) update.trackingNumber = String(body.trackingNumber).trim();
  if (body?.carrier !== undefined) update.carrier = String(body.carrier).trim();
  if (body?.trackingUrl !== undefined) update.trackingUrl = String(body.trackingUrl).trim();

  await orderRef.set(update, { merge: true });

  return { statusCode: 200, jsonBody: { id: orderId, ...update } };
}

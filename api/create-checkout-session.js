/**
 * Vercel Serverless Function — POST /api/create-checkout-session
 */
import { handleCreateCheckoutSession } from "../functions/_lib/checkoutHandler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const body = { ...req.body, origin: `https://${req.headers.host || ""}` };
    const { statusCode, jsonBody } = await handleCreateCheckoutSession({ body });
    res.status(statusCode).json(jsonBody);
  } catch (err) {
    console.error("create-checkout-session error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
  }
}

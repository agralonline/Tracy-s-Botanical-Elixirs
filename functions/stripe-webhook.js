/**
 * Netlify Function wrapper — POST /api/stripe-webhook
 * (mapped from /.netlify/functions/stripe-webhook via netlify.toml redirects)
 *
 * IMPORTANT: Netlify Functions deliver `event.body` as the raw string
 * body (base64-decoded automatically when `isBase64Encoded` is true),
 * which is exactly what Stripe's signature verification needs — no
 * body-parsing middleware sits in front of this function, so no extra
 * configuration is required (unlike Vercel, see /api/stripe-webhook.js).
 */
import { handleStripeWebhook } from "./_lib/webhookHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body;
    const signatureHeader = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

    const { statusCode, jsonBody } = await handleStripeWebhook({ rawBody, signatureHeader });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

/**
 * Netlify Function wrapper — POST /api/create-checkout-session
 * (mapped from /.netlify/functions/create-checkout-session via netlify.toml redirects)
 */
import { handleCreateCheckoutSession } from "./_lib/checkoutHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    body.origin = `https://${event.headers.host || ""}`;

    const { statusCode, jsonBody } = await handleCreateCheckoutSession({ body });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

/**
 * Netlify Function wrapper — POST /api/track-order
 * (mapped from /.netlify/functions/track-order via netlify.toml redirects)
 */
import { handleTrackOrder } from "./_lib/trackOrderHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body) : {};

    const { statusCode, jsonBody } = await handleTrackOrder({ body });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("track-order error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

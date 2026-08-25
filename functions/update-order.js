/**
 * Netlify Function wrapper — POST /api/update-order
 * (mapped from /.netlify/functions/update-order via netlify.toml redirects)
 */
import { handleUpdateOrder } from "./_lib/updateOrderHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body) : {};
    const authorizationHeader = event.headers.authorization || event.headers.Authorization;

    const { statusCode, jsonBody } = await handleUpdateOrder({ body, authorizationHeader });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("update-order error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

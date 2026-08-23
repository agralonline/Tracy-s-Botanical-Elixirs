/**
 * Netlify Function wrapper — POST /api/chat
 * (mapped from /.netlify/functions/chat via netlify.toml redirects)
 */
import { handleChat } from "./_lib/chatHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { statusCode, jsonBody } = await handleChat({ body });
    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("chat error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

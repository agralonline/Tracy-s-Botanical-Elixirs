/**
 * Netlify Function wrapper — POST /api/translate-and-save
 * (mapped from /.netlify/functions/translate-and-save via netlify.toml redirects)
 *
 * Thin adapter: parses the Netlify `event`, delegates to the
 * platform-agnostic core in _lib/translateAndSaveHandler.js, and
 * serializes the result back into Netlify's expected response shape.
 */
import { handleTranslateAndSave } from "./_lib/translateAndSaveHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body) : {};
    const authorizationHeader = event.headers.authorization || event.headers.Authorization;

    const { statusCode, jsonBody } = await handleTranslateAndSave({ body, authorizationHeader });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("translate-and-save error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

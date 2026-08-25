/**
 * Netlify Function wrapper — POST /api/translate-category
 * (mapped from /.netlify/functions/translate-category via netlify.toml redirects)
 *
 * Thin adapter: parses the Netlify `event`, delegates to the
 * platform-agnostic core in _lib/translateCategoryHandler.js, and
 * serializes the result back into Netlify's expected response shape.
 */
import { handleTranslateCategory } from "./_lib/translateCategoryHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body) : {};
    const authorizationHeader = event.headers.authorization || event.headers.Authorization;

    const { statusCode, jsonBody } = await handleTranslateCategory({ body, authorizationHeader });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("translate-category error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

/**
 * Netlify Function wrapper — POST /api/translate-announcement
 * (mapped from /.netlify/functions/translate-announcement via netlify.toml redirects)
 */
import { handleTranslateAnnouncement } from "./_lib/translateAnnouncementHandler.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const body = event.body ? JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf-8") : event.body) : {};
    const authorizationHeader = event.headers.authorization || event.headers.Authorization;

    const { statusCode, jsonBody } = await handleTranslateAnnouncement({ body, authorizationHeader });

    return {
      statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    };
  } catch (err) {
    console.error("translate-announcement error:", err);
    return {
      statusCode: err.statusCode || 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};

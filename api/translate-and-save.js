/**
 * Vercel Serverless Function — POST /api/translate-and-save
 * (Vercel auto-routes anything in /api as a function — no config needed)
 */
import { handleTranslateAndSave } from "../functions/_lib/translateAndSaveHandler.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const authorizationHeader = req.headers.authorization;
    // Vercel's Node runtime auto-parses JSON bodies into req.body when
    // Content-Type: application/json is set (as our frontend does).
    const { statusCode, jsonBody } = await handleTranslateAndSave({ body: req.body, authorizationHeader });
    res.status(statusCode).json(jsonBody);
  } catch (err) {
    console.error("translate-and-save error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
  }
}

/**
 * Vercel Serverless Function — POST /api/stripe-webhook
 *
 * IMPORTANT: Stripe signature verification requires the exact raw
 * request body bytes, so Vercel's automatic JSON body-parsing MUST be
 * disabled for this route (`bodyParser: false` below) and the raw
 * body read manually from the request stream.
 */
import { handleStripeWebhook } from "../functions/_lib/webhookHandler.js";

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureHeader = req.headers["stripe-signature"];

    const { statusCode, jsonBody } = await handleStripeWebhook({ rawBody, signatureHeader });
    res.status(statusCode).json(jsonBody);
  } catch (err) {
    console.error("stripe-webhook error:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Internal server error" });
  }
}

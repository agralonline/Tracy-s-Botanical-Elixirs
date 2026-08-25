/**
 * TRACY USA — AI chatbot backend
 * ---------------------------------------------------------------------
 * A thin proxy to the Google Gemini API (https://ai.google.dev) — kept
 * server-side so the API key never reaches the browser. Answers general
 * shipping/ingredient/return-policy/product questions; does NOT have
 * access to order data, so it's instructed to route order-specific
 * questions to the Contact page or the Return/Refund Request form.
 *
 * Requires GEMINI_API_KEY (see .env.example). Returns a friendly
 * 503 (not a crash) when it's missing, so the storefront can show a
 * "chat is temporarily unavailable" message instead of breaking.
 *
 * The admin panel (Settings → Chatbot Knowledge) can append extra
 * free-text knowledge to this prompt without any code change — see
 * getChatbotKnowledge() below, read fresh from tracy_settings/site on
 * every request so edits take effect immediately.
 *
 * Human handoff: the model is instructed to end its reply with the
 * literal tag [[HUMAN]] whenever it doesn't know the answer or the
 * question needs a real person. That tag is stripped out of the reply
 * text here and surfaced instead as `needsHuman: true` in the JSON
 * response, which the storefront widget (chatbot.js) uses to show a
 * "Talk to a Human" button under that message.
 */

import { getAdminDb } from "./firebaseAdmin.js";

const HUMAN_TAG = "[[HUMAN]]";

const BASE_SYSTEM_PROMPT = `You are the friendly storefront assistant for Tracy's Botanical Elixirs, a luxury essential oils and organic skincare brand shipping worldwide from the United States.

What you know and can help with:
- Shipping: ships from the US within 1-2 business days; domestic US orders over $75 ship free, otherwise a flat rate is calculated at checkout; international shipping cost/time is calculated at checkout and the customer covers any customs duties.
- Returns: unopened products can be returned within 30 days for a full refund; opened products only if damaged/defective; customers can start a return at /return-request.html.
- Payments: processed securely by Stripe; the site never stores card details.
- Products: essential oils, face serums, skincare (creams/balms), and hair care oils — all vegan and cruelty-free, most organic-certified.
- The site is available in 24 languages via the language selector in the header.

What you must NOT do:
- Never invent specific order status, tracking numbers, or account details — you have no access to order data. For "where is my order" or account-specific questions, direct the customer to email support@tracyusa.com or use the Contact page (/contact.html), and for returns point them to /return-request.html.
- Never give medical advice. If asked about using products during pregnancy or for a medical condition, advise consulting a physician and note that a patch test is recommended before first use.
- Keep answers short (2-4 sentences), warm, and concrete.
- Always reply in the same language the customer is writing in — the storefront supports 24 languages.

Human handoff: if you don't know the answer, the question is order-specific, or the customer seems to want a real person (a complaint, something outside what you know), say so briefly and end your reply with the exact tag ${HUMAN_TAG} on its own line. Never mention the tag itself to the customer — it is only read by the website, not shown to them.`;

/** Reads the admin-editable extra knowledge from tracy_settings/site (Settings → Chatbot Knowledge). Returns "" on any failure so chat still works if Firestore is briefly unavailable. */
async function getChatbotKnowledge() {
  try {
    const snap = await getAdminDb().collection("tracy_settings").doc("site").get();
    const text = snap.exists ? snap.data()?.chatbotKnowledge : "";
    return typeof text === "string" ? text.slice(0, 4000).trim() : "";
  } catch (err) {
    console.warn("Could not read chatbotKnowledge from tracy_settings/site:", err.message);
    return "";
  }
}

export async function handleChat({ body }) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error("Chat is not configured on the server (GEMINI_API_KEY missing).");
    err.statusCode = 503;
    throw err;
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (!messages.length) {
    const err = new Error("No messages provided.");
    err.statusCode = 400;
    throw err;
  }
  // Cap history length + message size sent to the model — keeps cost and
  // abuse surface bounded regardless of what the client sends.
  const trimmed = messages
    .slice(-12)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!trimmed.length) {
    const err = new Error("No valid messages provided.");
    err.statusCode = 400;
    throw err;
  }

  // Gemini has no "assistant" role — it uses "model" — and takes the system
  // prompt as a separate systemInstruction rather than a history entry.
  const contents = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const knowledge = await getChatbotKnowledge();
  const systemPrompt = knowledge
    ? `${BASE_SYSTEM_PROMPT}\n\nAdditional store-specific information provided by the store owner (treat as authoritative, use it to answer questions):\n${knowledge}`
    : BASE_SYSTEM_PROMPT;

  const model = process.env.GEMINI_CHAT_MODEL || "gemini-3.5-flash-lite";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 400 },
      }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(errBody?.error?.message || `Chat provider responded ${res.status}`);
    err.statusCode = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  let reply =
    (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim() ||
    "Sorry, I didn't catch that — could you rephrase?";

  const needsHuman = reply.includes(HUMAN_TAG);
  if (needsHuman) {
    reply = reply.split(HUMAN_TAG).join("").trim();
  }

  return { statusCode: 200, jsonBody: { reply, needsHuman } };
}

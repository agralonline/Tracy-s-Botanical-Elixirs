/**
 * TRACY USA — "Translate Announcement Bar" core handler
 * ---------------------------------------------------------------------
 * Translates the single `announcementText` field on the tracy_settings/site
 * doc into all 24 locales and merges the result into `announcementTranslations`
 * on that same doc, without touching any other settings field.
 */

import { getAdminDb, requireAdmin } from "./firebaseAdmin.js";
import { translateProductCopy, SUPPORTED_LOCALES } from "./translate.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

export async function handleTranslateAnnouncement({ body, authorizationHeader }) {
  await requireAdmin(authorizationHeader);

  const text = (body?.text || "").trim();
  if (!text) throw badRequest("text is required.");

  const db = getAdminDb();
  const docRef = db.collection("tracy_settings").doc("site");

  const result = await translateProductCopy({ text }, { locales: SUPPORTED_LOCALES, fields: ["text"] });
  const announcementTranslations = {};
  for (const locale of SUPPORTED_LOCALES) {
    announcementTranslations[locale] = (result.translations[locale] || { text }).text;
  }

  await docRef.set(
    {
      announcementText: text,
      announcementTranslations,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  return { statusCode: 200, jsonBody: { announcementText: text, announcementTranslations, errors: result.errors } };
}

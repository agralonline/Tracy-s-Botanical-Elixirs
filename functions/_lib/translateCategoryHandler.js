/**
 * TRACY USA — "Translate & Save Category" core handler
 * ---------------------------------------------------------------------
 * Same pattern as translateAndSaveHandler.js, but for the `tracy_categories`
 * collection (just `name` + `description`, no pricing/inventory/images).
 * Platform-agnostic: takes a parsed request body + raw Authorization
 * header, returns { statusCode, jsonBody }.
 */

import { getAdminDb, requireAdmin } from "./firebaseAdmin.js";
import { translateProductCopy, SUPPORTED_LOCALES } from "./translate.js";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const ALL_TRANSLATABLE_FIELDS = ["name", "description"];

export async function handleTranslateCategory({ body, authorizationHeader }) {
  const admin = await requireAdmin(authorizationHeader);

  const payload = body || {};
  const source = payload.sourceText || {};

  if (!source.name) throw badRequest("sourceText.name is required.");

  const slug = payload.slug ? slugify(payload.slug) : slugify(source.name);
  if (!slug) throw badRequest("Could not derive a slug from the name — please provide one explicitly.");

  const db = getAdminDb();
  const docRef = db.collection("tracy_categories").doc(payload.id || slug);
  const existingSnap = await docRef.get();
  const existingTranslations = existingSnap.exists ? existingSnap.data().translations || {} : {};

  const requestedFields = Array.isArray(payload.translateFields) ? payload.translateFields : ALL_TRANSLATABLE_FIELDS;
  const fieldsToTranslate = existingSnap.exists
    ? requestedFields.filter((f) => ALL_TRANSLATABLE_FIELDS.includes(f))
    : ALL_TRANSLATABLE_FIELDS;

  let translations;
  let errors = [];

  if (fieldsToTranslate.length) {
    const result = await translateProductCopy(source, { locales: SUPPORTED_LOCALES, fields: fieldsToTranslate });
    errors = result.errors;
    translations = { en: { ...source } };
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      translations[locale] = {
        ...ALL_TRANSLATABLE_FIELDS.reduce((acc, f) => ({ ...acc, [f]: source[f] || "" }), {}),
        ...(existingTranslations[locale] || {}),
        ...(result.translations[locale] || {}),
      };
    }
  } else {
    translations = { ...existingTranslations, en: { ...source } };
  }

  const now = new Date().toISOString();

  const doc = {
    id: docRef.id,
    slug,
    name: source.name,
    description: source.description || "",
    image: payload.image ?? (existingSnap.exists ? existingSnap.data().image || "" : ""),
    translations,
    translationMeta: {
      sourceLocale: "en",
      provider: (process.env.TRANSLATION_PROVIDER || "google").toLowerCase(),
      translatedAt: now,
      failedLocales: errors.map((e) => e.locale),
    },
    createdAt: existingSnap.exists ? existingSnap.data().createdAt || now : now,
    updatedAt: now,
    updatedBy: admin.email || admin.uid,
  };

  await docRef.set(doc, { merge: false });

  return { statusCode: 200, jsonBody: doc };
}

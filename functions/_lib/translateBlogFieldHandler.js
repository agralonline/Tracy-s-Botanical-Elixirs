/**
 * THE BOTANICAL APOTHECARY — "Translate Blog Post Short Fields" core handler
 * ---------------------------------------------------------------------
 * Translates just Title/SEO Title/Meta Description into ONE selected
 * locale (never all 24, and never the body — a full article is too long
 * to safely auto-translate, so the admin pastes their own translation of
 * the body manually). Does NOT write to Firestore itself — returns the
 * translated fields for the admin to review before saving (see
 * handleSavePostTranslation in admin.js).
 */

import { requireAdmin } from "./firebaseAdmin.js";
import { translateProductCopy, SUPPORTED_LOCALES } from "./translate.js";

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const FIELDS = ["title", "seoTitle", "metaDescription"];

export async function handleTranslateBlogField({ body, authorizationHeader }) {
  await requireAdmin(authorizationHeader);

  const payload = body || {};
  const locale = payload.locale;
  const source = payload.sourceText || {};

  if (!locale || !SUPPORTED_LOCALES.includes(locale) || locale === "en") {
    throw badRequest("A valid, non-English `locale` is required.");
  }
  if (!source.title) throw badRequest("sourceText.title is required.");

  const result = await translateProductCopy(source, { locales: [locale], fields: FIELDS });
  const translated = result.translations[locale] || {};

  return {
    statusCode: 200,
    jsonBody: {
      title: translated.title || source.title,
      seoTitle: translated.seoTitle || source.seoTitle || "",
      metaDescription: translated.metaDescription || source.metaDescription || "",
      errors: result.errors,
    },
  };
}

/**
 * TRACY USA — "Translate & Save" core handler
 * ---------------------------------------------------------------------
 * Platform-agnostic: takes a parsed request body + raw Authorization
 * header, returns { statusCode, jsonBody }. The thin platform wrappers
 * in /functions (Netlify) and /api (Vercel) adapt this to each
 * platform's request/response shape.
 *
 * Flow:
 *   1. Verify the caller is a signed-in admin (Firebase Auth + `admins`
 *      collection membership) — see firebaseAdmin.js.
 *   2. Validate the English source payload.
 *   3. Call translateProductCopy() to generate all 24 locale variants
 *      in one pass (see translate.js).
 *   4. Assemble the full Firestore product document (matching
 *      /firestore-schema.md) and write it with a merge-set, keyed by
 *      slug so re-saving an existing product updates it in place.
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

export async function handleTranslateAndSave({ body, authorizationHeader }) {
  const admin = await requireAdmin(authorizationHeader); // throws 401/403 on failure

  const payload = body || {};
  const source = payload.sourceText || {};

  if (!source.title || !source.shortDescription || !source.description) {
    throw badRequest("sourceText.title, shortDescription, and description are all required.");
  }
  if (!payload.sku) throw badRequest("sku is required.");
  if (!payload.pricing || typeof payload.pricing.basePrice !== "number") {
    throw badRequest("pricing.basePrice (number) is required.");
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(source.title);
  if (!slug) throw badRequest("Could not derive a slug from the title — please provide one explicitly.");

  const { translations, errors } = await translateProductCopy(source, { locales: SUPPORTED_LOCALES });

  const db = getAdminDb();
  const docRef = db.collection("products").doc(payload.id || slug);
  const existingSnap = await docRef.get();
  const now = new Date().toISOString();

  const doc = {
    id: docRef.id,
    sku: payload.sku,
    slug,
    category: payload.category || "essential-oils",
    status: payload.status || "active",
    featured: !!payload.featured,
    pricing: {
      currency: payload.pricing.currency || "USD",
      basePrice: payload.pricing.basePrice,
      compareAtPrice: payload.pricing.compareAtPrice ?? null,
    },
    stripePriceId: existingSnap.exists ? existingSnap.data().stripePriceId || "" : "",
    stripeProductId: existingSnap.exists ? existingSnap.data().stripeProductId || "" : "",
    images: Array.isArray(payload.images) && payload.images.length
      ? payload.images
      : (existingSnap.exists ? existingSnap.data().images || [] : []),
    attributes: {
      volumeMl: payload.attributes?.volumeMl ?? null,
      ingredients: payload.attributes?.ingredients || [],
      scentProfile: payload.attributes?.scentProfile || [],
      skinType: payload.attributes?.skinType || [],
      vegan: !!payload.attributes?.vegan,
      crueltyFree: !!payload.attributes?.crueltyFree,
      organic: !!payload.attributes?.organic,
    },
    inventory: {
      trackInventory: payload.inventory?.trackInventory ?? true,
      quantity: payload.inventory?.quantity ?? 0,
      allowBackorder: !!payload.inventory?.allowBackorder,
    },
    rating: existingSnap.exists ? existingSnap.data().rating || { average: 0, count: 0 } : { average: 0, count: 0 },
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

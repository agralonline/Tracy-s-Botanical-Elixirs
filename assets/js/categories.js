/**
 * TRACY USA — Category catalog: fetch, cache, and label lookup.
 * ---------------------------------------------------------------------
 * Data source priority (same pattern as products.js):
 *   1. Firestore `tracy_categories` collection, if Firebase is configured.
 *   2. Local CATEGORIES bundled in /data/seed-products.js.
 *
 * Category label policy:
 *   - The 4 built-in seed categories carry a `labelKey` and ship with
 *     full 24-language translations in /locales/*.json — those are
 *     displayed via t(labelKey), exactly like other UI chrome strings.
 *   - Categories an admin creates later through the admin panel have no
 *     labelKey. They store a plain English `name`/`description` field
 *     (the same English-only policy already used for blog posts) and are
 *     displayed as-is, in every locale — this avoids the impossible task
 *     of auto-translating a category an admin can type in freely.
 */

import { getFirebaseServices } from "/assets/js/firebase-config.js";
import { CATEGORIES as SEED_CATEGORIES } from "/data/seed-products.js";
import { t, getProductText } from "/assets/js/i18n.js";

let categoryCache = null; // Array<Category> | null until first fetch resolves

/** Fetch all categories, preferring Firestore and falling back to seed data. */
export async function fetchCategories({ forceRefresh = false } = {}) {
  if (categoryCache && !forceRefresh) return categoryCache;

  const services = await getFirebaseServices();
  if (services) {
    try {
      const { db, firestoreMod } = services;
      const { collection, getDocs, query, orderBy } = firestoreMod;
      let snap;
      try {
        snap = await getDocs(query(collection(db, "tracy_categories"), orderBy("createdAt", "asc")));
      } catch (err) {
        // orderBy can fail if the field/index isn't present yet — fall back to an unordered fetch.
        snap = await getDocs(collection(db, "tracy_categories"));
      }
      if (!snap.empty) {
        categoryCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Respect the admin's ▲/▼ display order (see admin.js) when set;
        // categories never reordered keep their createdAt order.
        categoryCache.sort((a, b) => (typeof a.order === "number" ? a.order : Infinity) - (typeof b.order === "number" ? b.order : Infinity));
        return categoryCache;
      }
    } catch (err) {
      console.warn("Firestore category fetch failed, using local seed data.", err);
    }
  }

  categoryCache = SEED_CATEGORIES;
  return categoryCache;
}

/** Synchronous read of whatever is currently cached (seed data before the first fetch resolves). */
export function getCategoriesSync() {
  return categoryCache || SEED_CATEGORIES;
}

export function getCategoryBySlug(slug) {
  return getCategoriesSync().find((c) => c.slug === slug) || null;
}

/** Resolve the display label for a category slug or category object. */
export function getCategoryLabel(categoryOrSlug) {
  const category = typeof categoryOrSlug === "string" ? getCategoryBySlug(categoryOrSlug) : categoryOrSlug;
  if (!category) return "";
  if (category.labelKey) return t(category.labelKey);
  return (category.translations && getProductText(category, "name")) || category.name || category.slug || "";
}

export function getCategoryImage(categoryOrSlug) {
  const category = typeof categoryOrSlug === "string" ? getCategoryBySlug(categoryOrSlug) : categoryOrSlug;
  return category?.image || "/assets/img/categories/category-essential-oils.jpg";
}

export function getCategoryDescription(categoryOrSlug) {
  const category = typeof categoryOrSlug === "string" ? getCategoryBySlug(categoryOrSlug) : categoryOrSlug;
  if (!category) return "";
  return (category.translations && getProductText(category, "description")) || category.description || "";
}

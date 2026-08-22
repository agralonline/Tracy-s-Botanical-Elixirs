#!/usr/bin/env node
/**
 * One-off script: pushes the 4 bundled SEED_PRODUCTS (with their
 * already-hand-translated 24-language copy) into Firestore. Run this
 * once after setting up a new Firebase project so the live storefront
 * has the same starter catalog as the local fallback.
 *
 * Since the seed data already ships with full translations, this does
 * NOT call the translation API — it writes the existing 24-locale
 * copy directly, so running it costs zero translation-API quota.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_BASE64=... node scripts/seed-firestore.js
 * (or set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)
 */
import { getAdminDb } from "../functions/_lib/firebaseAdmin.js";
import { SEED_PRODUCTS } from "../data/seed-products.js";

async function main() {
  const db = getAdminDb();
  const now = new Date().toISOString();

  for (const product of SEED_PRODUCTS) {
    const doc = {
      ...product,
      translationMeta: {
        sourceLocale: "en",
        provider: "hand-authored-seed",
        translatedAt: now,
        failedLocales: [],
      },
      createdAt: now,
      updatedAt: now,
      updatedBy: "seed-script",
    };
    await db.collection("products").doc(product.id).set(doc, { merge: true });
    console.log(`✓ Seeded ${product.id} (${Object.keys(product.translations).length} locales)`);
  }

  console.log(`\nDone. ${SEED_PRODUCTS.length} products seeded into Firestore.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});

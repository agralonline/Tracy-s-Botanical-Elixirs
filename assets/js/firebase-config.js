/**
 * TRACY USA — Firebase bootstrap
 * ---------------------------------------------------------------------
 * Loads the Firebase v10 modular SDK straight from Google's CDN (no
 * bundler required) and initializes Firestore + Auth + Storage.
 *
 * The storefront is designed to run beautifully with ZERO Firebase
 * configuration — it falls back to the local SEED_PRODUCTS in
 * /data/seed-products.js. The moment you drop in real config values
 * below (or via a runtime <script> that sets window.__TRACY_FIREBASE_CONFIG__
 * before this module loads — handy for injecting per-environment values
 * on Vercel/Netlify without committing secrets), the site automatically
 * starts reading/writing live Firestore data instead.
 *
 * Get these values from: Firebase Console → Project settings → General
 * → "Your apps" → Web app → SDK setup and configuration → Config.
 */

const DEFAULT_CONFIG = {
  apiKey: "AIzaSyB_SlR_qBwXGCCfkNmy4zz7ZjoY0oUeIU8",
  authDomain: "agralonline-apps.firebaseapp.com",
  projectId: "agralonline-apps",
  storageBucket: "agralonline-apps.firebasestorage.app",
  messagingSenderId: "742972120760",
  appId: "1:742972120760:web:81e7b87a643d93e076de4d",
};

export const firebaseConfig = (typeof window !== "undefined" && window.__TRACY_FIREBASE_CONFIG__)
  ? window.__TRACY_FIREBASE_CONFIG__
  : DEFAULT_CONFIG;

function isConfigured(cfg) {
  return !!cfg.apiKey && !cfg.apiKey.startsWith("REPLACE_WITH");
}

const SDK_VERSION = "10.14.1";
const CDN = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;

let servicesPromise = null;

/**
 * Lazily loads and initializes Firebase. Returns `null` (never throws)
 * when no real config has been supplied, so callers can cleanly fall
 * back to local seed data / disable admin write features.
 */
export function getFirebaseServices() {
  if (servicesPromise) return servicesPromise;

  if (!isConfigured(firebaseConfig)) {
    servicesPromise = Promise.resolve(null);
    return servicesPromise;
  }

  servicesPromise = (async () => {
    try {
      const [{ initializeApp }, firestoreMod, authMod, storageMod] = await Promise.all([
        import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
        import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`),
        import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
        import(/* @vite-ignore */ `${CDN}/firebase-storage.js`),
      ]);

      const app = initializeApp(firebaseConfig);
      const db = firestoreMod.getFirestore(app);
      const auth = authMod.getAuth(app);
      const storage = storageMod.getStorage(app);

      return { app, db, auth, storage, firestoreMod, authMod, storageMod };
    } catch (err) {
      console.error("Firebase failed to initialize — falling back to local seed data.", err);
      return null;
    }
  })();

  return servicesPromise;
}

export function isFirebaseConfigured() {
  return isConfigured(firebaseConfig);
}

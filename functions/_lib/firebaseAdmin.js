/**
 * TRACY USA — Firebase Admin bootstrap (server-side only)
 * ---------------------------------------------------------------------
 * Used exclusively by serverless functions (never shipped to the
 * browser). Initializes firebase-admin once per cold start using a
 * service account key supplied via environment variable, in one of
 * two forms:
 *
 *   FIREBASE_SERVICE_ACCOUNT_BASE64  — the full service account JSON,
 *     base64-encoded (recommended: works cleanly as a single env var
 *     on both Netlify and Vercel without escaping issues).
 *
 *   or the three discrete values:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Get a service account key from: Firebase Console → Project settings
 * → Service accounts → Generate new private key.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function loadCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf-8");
    return JSON.parse(json);
  }

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Env vars can't hold literal newlines cleanly — private keys are
      // stored with escaped "\n" and unescaped here.
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  throw new Error(
    "Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT_BASE64, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
  );
}

let app;
export function getAdminApp() {
  if (!app) {
    if (getApps().length) {
      app = getApps()[0];
    } else {
      app = initializeApp({ credential: cert(loadCredential()) });
    }
  }
  return app;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

/**
 * Verify a Firebase Auth ID token from an `Authorization: Bearer <token>`
 * header AND confirm the user is listed in the `admins` collection.
 * Throws on any failure — callers should catch and respond 401/403.
 */
export async function requireAdmin(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    const err = new Error("Missing Authorization header.");
    err.statusCode = 401;
    throw err;
  }
  const idToken = authorizationHeader.slice("Bearer ".length);
  const decoded = await getAdminAuth().verifyIdToken(idToken);

  const adminDoc = await getAdminDb().collection("admins").doc(decoded.uid).get();
  if (!adminDoc.exists) {
    const err = new Error("This account is not authorized as an admin.");
    err.statusCode = 403;
    throw err;
  }

  return { uid: decoded.uid, email: decoded.email, adminRecord: adminDoc.data() };
}

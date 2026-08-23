/**
 * TRACY USA — Site settings (storefront-facing)
 * ---------------------------------------------------------------------
 * A single Firestore doc (tracy_settings/site) holding admin-editable,
 * non-catalog site configuration: the announcement bar, footer social
 * links, and the free-shipping threshold (also read server-side by
 * functions/_lib/checkoutHandler.js to build Stripe shipping options).
 *
 * Public read (see firestore.rules) — the storefront always falls back
 * to sensible defaults when Firebase isn't configured or the doc
 * doesn't exist yet, so nothing breaks before an admin ever saves it.
 */

import { getFirebaseServices } from "/assets/js/firebase-config.js";

export const DEFAULT_SETTINGS = {
  announcementEnabled: false,
  announcementText: "",
  freeShippingThresholdCents: 7500,
  social: { instagram: "", facebook: "", tiktok: "", pinterest: "" },
};

let settingsCache = null;

export async function fetchSiteSettings({ forceRefresh = false } = {}) {
  if (settingsCache && !forceRefresh) return settingsCache;

  const services = await getFirebaseServices();
  if (services) {
    try {
      const { db, firestoreMod } = services;
      const snap = await firestoreMod.getDoc(firestoreMod.doc(db, "tracy_settings", "site"));
      if (snap.exists()) {
        settingsCache = { ...DEFAULT_SETTINGS, ...snap.data(), social: { ...DEFAULT_SETTINGS.social, ...(snap.data().social || {}) } };
        return settingsCache;
      }
    } catch (err) {
      console.warn("Firestore settings fetch failed, using defaults.", err);
    }
  }

  settingsCache = DEFAULT_SETTINGS;
  return settingsCache;
}

const SOCIAL_ICONS = {
  instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/></svg>',
  facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15 3h-2a5 5 0 0 0-5 5v2H6v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/></svg>',
  tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v11a3 3 0 1 1-3-3"/><path d="M14 3a5 5 0 0 0 5 5"/></svg>',
  pinterest: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M9.5 19c1-3 2-6.5 2.5-8.5a2.5 2.5 0 1 1 3 1.7c-.3 1-1 3-1.5 4.3-.4 1 .2 1.9 1.2 1.9 2 0 3.5-2.3 3.5-4.9 0-2.6-2-4.9-5-4.9-3.4 0-5.5 2.5-5.5 5.1 0 1 .3 1.7.8 2.2"/></svg>',
};

/** Render the social icon row into `container` (only icons with a non-empty URL); hides the container entirely if none are set. */
export function renderSocialLinks(container, social = {}) {
  if (!container) return;
  const entries = Object.entries(social).filter(([, url]) => url && url.trim());
  if (!entries.length) {
    container.classList.add("hidden");
    return;
  }
  container.classList.remove("hidden");
  container.innerHTML = entries
    .map(([platform, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="btn-ghost p-2" aria-label="${platform}">${SOCIAL_ICONS[platform] || ""}</a>`)
    .join("");
}

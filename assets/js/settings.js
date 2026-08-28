/**
 * THE BOTANICAL APOTHECARY — Site settings (storefront-facing)
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
  paypalLink: "",
  heroLayout: "background", // "background" (full-bleed images behind text) or "box" (left text, right auto-scroll image box)
  heroImages: [], // falls back to hero-slider.js's bundled HERO_SLIDES when empty
  goalImages: {}, // { "better-sleep": url, ... } — falls back to wellness-goals.js's bundled defaults per-slug when a slug is missing/blank
  chatbotKnowledge: "",
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

// Real brand-colored marks (not the site's monochrome stroke-icon style) —
// social badges are one place customers expect to recognize the actual logo.
const SOCIAL_ICONS = {
  instagram: `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFDC80"/><stop offset="25%" stop-color="#FCAF45"/>
      <stop offset="50%" stop-color="#E1306C"/><stop offset="75%" stop-color="#C13584"/>
      <stop offset="100%" stop-color="#5851DB"/>
    </linearGradient></defs>
    <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)"/>
    <circle cx="12" cy="12" r="4.6" fill="none" stroke="#fff" stroke-width="1.7"/>
    <circle cx="17.3" cy="6.7" r="1.15" fill="#fff"/>
  </svg>`,
  facebook: `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#1877F2"/>
    <path d="M15.1 12.5h-2v7h-2.9v-7H8.6v-2.5h1.6V8.4c0-1.6.8-3 3.3-3h2.1v2.4h-1.5c-.5 0-.6.3-.6.7v1.5h2.2l-.6 2.5z" fill="#fff"/>
  </svg>`,
  tiktok: `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="20" height="20" rx="6" fill="#010101"/>
    <path d="M14.3 6.2c.35 1.4 1.35 2.4 3 2.6v2.05c-1.05.05-2-.25-3-.85v4.15c0 2.4-1.85 4.05-4.05 4.05-2.25 0-4.05-1.7-4.05-3.95 0-2.35 2-4.15 4.6-3.9v2.1c-.3-.05-.6-.05-.9.05-1.05.3-1.75 1.15-1.75 2.15 0 1.15.95 2 2.05 2 1.35 0 2.15-1.05 2.15-2.5V4.9h2z" fill="#25F4EE" transform="translate(-0.4,-0.4)"/>
    <path d="M14.3 6.2c.35 1.4 1.35 2.4 3 2.6v2.05c-1.05.05-2-.25-3-.85v4.15c0 2.4-1.85 4.05-4.05 4.05-2.25 0-4.05-1.7-4.05-3.95 0-2.35 2-4.15 4.6-3.9v2.1c-.3-.05-.6-.05-.9.05-1.05.3-1.75 1.15-1.75 2.15 0 1.15.95 2 2.05 2 1.35 0 2.15-1.05 2.15-2.5V4.9h2z" fill="#FE2C55" transform="translate(0.4,0.4)"/>
    <path d="M14.3 6.2c.35 1.4 1.35 2.4 3 2.6v2.05c-1.05.05-2-.25-3-.85v4.15c0 2.4-1.85 4.05-4.05 4.05-2.25 0-4.05-1.7-4.05-3.95 0-2.35 2-4.15 4.6-3.9v2.1c-.3-.05-.6-.05-.9.05-1.05.3-1.75 1.15-1.75 2.15 0 1.15.95 2 2.05 2 1.35 0 2.15-1.05 2.15-2.5V4.9h2z" fill="#fff"/>
  </svg>`,
  pinterest: `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#E60023"/>
    <path d="M12.15 6.2c-3.35 0-5.05 2.4-5.05 4.4 0 1.2.46 2.28 1.43 2.68.16.07.3 0 .35-.17l.14-.55c.05-.17.03-.23-.1-.38-.28-.33-.45-.76-.45-1.37 0-1.77 1.32-3.35 3.45-3.35 1.88 0 2.91 1.15 2.91 2.68 0 2.02-.9 3.72-2.22 3.72-.73 0-1.28-.6-1.1-1.35.21-.88.62-1.83.62-2.47 0-.57-.31-1.05-.94-1.05-.75 0-1.35.77-1.35 1.8 0 .66.22 1.1.22 1.1s-.76 3.2-.89 3.77c-.26 1.1-.04 2.44-.02 2.58.01.08.11.1.16.04.06-.08 1-1.24 1.31-2.31.09-.32.51-1.98.51-1.98.25.48.98.9 1.76.9 2.32 0 3.9-2.11 3.9-4.94 0-2.14-1.81-4.13-4.64-4.13z" fill="#fff"/>
  </svg>`,
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

/**
 * TRACY USA — i18n engine
 * ---------------------------------------------------------------------
 * Handles the 24-locale language switcher: loads /locales/<code>.json,
 * caches it, persists the chosen locale to localStorage, flips the
 * document direction for Arabic (RTL), and re-renders every DOM node
 * tagged with data-i18n-* attributes WITHOUT a full page reload.
 *
 * Any other module (products.js, cart.js, main.js) can subscribe to
 * locale changes via `onLocaleChange(callback)` to re-render dynamic
 * content (product cards, cart totals, etc.) in the newly selected
 * language.
 *
 * IMPORTANT product-copy vs. UI-copy split:
 *  - UI chrome strings (nav, buttons, footer) come from this module's
 *    /locales/<code>.json files, shipped statically with the site.
 *  - Product title/description strings come from Firestore's
 *    `translations` map on each product document (see products.js).
 *  - Blog content is ALWAYS English, by design — it is intentionally
 *    excluded from this system to avoid burning translation-API quota
 *    on long-form articles.
 */

export const SUPPORTED_LOCALES = [
  "en", "es", "pt", "fr", "de", "it", "nl", "sv", "el", "pl", "ro", "cs",
  "hu", "uk", "ru", "bg", "sk", "lt", "ar", "tr", "zh-CN", "zh-TW", "ja", "ko"
];

export const RTL_LOCALES = ["ar"];

const LOCALE_STORAGE_KEY = "tracy_locale";
const LOCALES_BASE_PATH = "/locales";

const localeCache = new Map();
const changeListeners = new Set();

let currentLocale = "en";
let currentDict = null;

/** Resolve the locale path relative to the current page (works from /admin/ too). */
function localesBase() {
  return document.documentElement.dataset.localesBase || LOCALES_BASE_PATH;
}

/**
 * Detect the best starting locale:
 * 1. Previously saved choice in localStorage
 * 2. Browser language (navigator.language / languages), matched against SUPPORTED_LOCALES
 * 3. English fallback
 */
export function detectInitialLocale() {
  try {
    const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch (e) {
    /* localStorage unavailable (privacy mode) — fall through */
  }

  const browserLangs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || "en"];

  for (const lang of browserLangs) {
    if (SUPPORTED_LOCALES.includes(lang)) return lang;
    const base = lang.split("-")[0];
    // Special-case the two Chinese variants before falling through to a bare match.
    if (base === "zh") {
      if (/-(hk|tw|mo)$/i.test(lang)) return "zh-TW";
      return "zh-CN";
    }
    const match = SUPPORTED_LOCALES.find((code) => code.split("-")[0] === base);
    if (match) return match;
  }
  return "en";
}

async function fetchLocaleDict(code) {
  if (localeCache.has(code)) return localeCache.get(code);
  const res = await fetch(`${localesBase()}/${code}.json`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Failed to load locale "${code}": ${res.status}`);
  const dict = await res.json();
  localeCache.set(code, dict);
  return dict;
}

/** Translate a UI string key. Supports {placeholder} interpolation via `vars`. */
export function t(key, vars) {
  const dict = currentDict || {};
  let str = dict[key];
  if (str === undefined) {
    // Fall back to English key name so missing translations never render as "undefined".
    str = (localeCache.get("en") || {})[key] ?? key;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function getCurrentLocale() {
  return currentLocale;
}

export function isRTL(code = currentLocale) {
  return RTL_LOCALES.includes(code);
}

/** Register a callback fired every time the locale changes (after the new dict has loaded). */
export function onLocaleChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

/** Walk the DOM applying data-i18n / data-i18n-placeholder / data-i18n-html attributes. */
export function applyDomTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
  });
}

function applyDocumentDirection(code) {
  const dir = isRTL(code) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", code === "zh-CN" || code === "zh-TW" ? code : code.split("-")[0]);
}

/** Load, persist, and apply a locale. Re-renders all tagged DOM + notifies subscribers. */
export async function setLocale(code) {
  if (!SUPPORTED_LOCALES.includes(code)) code = "en";
  const dict = await fetchLocaleDict(code).catch(async (err) => {
    console.error(err);
    if (code !== "en") return fetchLocaleDict("en");
    throw err;
  });

  currentLocale = code;
  currentDict = dict;

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch (e) {
    /* ignore write failures */
  }

  applyDocumentDirection(code);
  applyDomTranslations(document);

  const selector = document.getElementById("languageSelector");
  if (selector && selector.value !== code) selector.value = code;

  for (const cb of changeListeners) {
    try {
      cb(code, dict);
    } catch (err) {
      console.error("i18n change listener failed:", err);
    }
  }

  document.dispatchEvent(new CustomEvent("tracy:localechange", { detail: { locale: code } }));
}

/** Populate a <select id="languageSelector"> with all 24 locales and wire instant switching. */
export function initLanguageSelector(selectEl) {
  if (!selectEl) return;
  const LOCALE_NAMES = {
    en: "English", es: "Español", pt: "Português", fr: "Français", de: "Deutsch",
    it: "Italiano", nl: "Nederlands", sv: "Svenska", el: "Ελληνικά", pl: "Polski",
    ro: "Română", cs: "Čeština", hu: "Magyar", uk: "Українська", ru: "Русский",
    bg: "Български", sk: "Slovenčina", lt: "Lietuvių", ar: "العربية", tr: "Türkçe",
    "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어",
  };

  selectEl.innerHTML = "";
  for (const code of SUPPORTED_LOCALES) {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = LOCALE_NAMES[code] || code;
    selectEl.appendChild(opt);
  }
  selectEl.value = currentLocale;

  selectEl.addEventListener("change", (e) => {
    setLocale(e.target.value);
  });
}

/** Call once on page load. Detects the best locale, loads it, wires the selector if present. */
export async function initI18n() {
  const initial = detectInitialLocale();
  await setLocale(initial);
  const selector = document.getElementById("languageSelector");
  if (selector) initLanguageSelector(selector);
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
  return initial;
}

/**
 * Resolve a localized field off a Firestore/seed product document with a
 * graceful fallback chain: current locale -> English -> first available.
 * `field` is one of "title" | "shortDescription" | "description".
 */
export function getProductText(product, field) {
  if (!product || !product.translations) return "";
  const t1 = product.translations[currentLocale];
  if (t1 && t1[field]) return t1[field];
  const en = product.translations.en;
  if (en && en[field]) return en[field];
  const first = Object.values(product.translations).find((v) => v && v[field]);
  return first ? first[field] : "";
}

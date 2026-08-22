/**
 * TRACY USA — Translation provider adapter
 * ---------------------------------------------------------------------
 * Real, functional REST calls to either Google Cloud Translation API v2
 * (default) or DeepL, selected via the TRANSLATION_PROVIDER env var.
 * Both are simple API-key based REST APIs — no SDK dependency needed.
 *
 *   TRANSLATION_PROVIDER=google   (default) — needs GOOGLE_TRANSLATE_API_KEY
 *   TRANSLATION_PROVIDER=deepl    — needs DEEPL_API_KEY (free or pro key)
 *
 * translateProductCopy() is the single entry point used by
 * translateAndSaveHandler.js: given the English { title, shortDescription,
 * description } and the full 24-locale list, it returns a translations
 * map with the same shape for every locale, with `en` passed through
 * verbatim (no API call needed for the source language).
 */

export const SUPPORTED_LOCALES = [
  "en", "es", "pt", "fr", "de", "it", "nl", "sv", "el", "pl", "ro", "cs",
  "hu", "uk", "ru", "bg", "sk", "lt", "ar", "tr", "zh-CN", "zh-TW", "ja", "ko",
];

// Google Cloud Translation API expects BCP-47-ish codes; it understands
// "zh-CN" and "zh-TW" directly, so no remapping is required for our list.
const GOOGLE_LOCALE_MAP = {};

// DeepL uses its own target-language codes (mostly upper-case, and it has
// no separate "es"/"pt" vs. regional variants at the free tier level, and
// notably does NOT support every language in our 24-locale list — for any
// locale DeepL can't translate, we transparently fall back to Google if a
// Google key is also present, otherwise we fall back to the English text
// so the storefront never renders a blank string).
const DEEPL_LOCALE_MAP = {
  en: "EN-US", es: "ES", pt: "PT-PT", fr: "FR", de: "DE", it: "IT", nl: "NL",
  sv: "SV", el: "EL", pl: "PL", ro: "RO", cs: "CS", hu: "HU", uk: "UK",
  ru: "RU", bg: "BG", sk: "SK", lt: "LT", tr: "TR", "zh-CN": "ZH",
  ja: "JA", ko: "KO",
  // Not supported by DeepL as of writing: Arabic (ar), Traditional Chinese (zh-TW).
};

async function translateBatchGoogle(texts, targetLocale, apiKey) {
  const target = GOOGLE_LOCALE_MAP[targetLocale] || targetLocale;
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source: "en", target, format: "text" }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google Translate API error (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.data.translations.map((t) => t.translatedText);
}

async function translateBatchDeepL(texts, targetLocale, apiKey) {
  const target = DEEPL_LOCALE_MAP[targetLocale];
  if (!target) return null; // signal "unsupported" to the caller so it can fall back

  const host = apiKey.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const params = new URLSearchParams();
  texts.forEach((t) => params.append("text", t));
  params.append("source_lang", "EN");
  params.append("target_lang", target);

  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`DeepL API error (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.translations.map((t) => t.text);
}

/**
 * Translate a batch of English strings into ONE target locale.
 * Returns an array of translated strings, same order/length as `texts`.
 */
async function translateBatch(texts, targetLocale) {
  const provider = (process.env.TRANSLATION_PROVIDER || "google").toLowerCase();

  if (provider === "deepl" && process.env.DEEPL_API_KEY) {
    const result = await translateBatchDeepL(texts, targetLocale, process.env.DEEPL_API_KEY);
    if (result) return result;
    // DeepL doesn't cover this locale — fall through to Google if available.
  }

  if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    return translateBatchGoogle(texts, targetLocale, process.env.GOOGLE_TRANSLATE_API_KEY);
  }

  throw new Error(
    "No translation provider configured. Set GOOGLE_TRANSLATE_API_KEY (or DEEPL_API_KEY with TRANSLATION_PROVIDER=deepl) in your environment."
  );
}

/**
 * Translate { title, shortDescription, description } from English into
 * every locale in SUPPORTED_LOCALES. Runs target locales with limited
 * concurrency to stay within provider rate limits.
 */
export async function translateProductCopy(sourceText, { locales = SUPPORTED_LOCALES, concurrency = 5 } = {}) {
  const fields = ["title", "shortDescription", "description"];
  const texts = fields.map((f) => sourceText[f] || "");
  const targets = locales.filter((l) => l !== "en");

  const translations = { en: { ...sourceText } };
  const errors = [];

  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const locale = targets[cursor++];
      try {
        const translated = await translateBatch(texts, locale);
        translations[locale] = Object.fromEntries(fields.map((f, i) => [f, translated[i] ?? texts[i]]));
      } catch (err) {
        console.error(`Translation failed for locale "${locale}":`, err.message);
        errors.push({ locale, error: err.message });
        // Graceful degradation: never leave a locale undefined — fall back to English
        // so the storefront always has *something* to render for every language.
        translations[locale] = { ...sourceText };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));

  return { translations, errors };
}

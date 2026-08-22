/**
 * TRACY USA — Cookie consent banner
 * ---------------------------------------------------------------------
 * Simple GDPR-friendly baseline: shown once until the visitor accepts,
 * remembered in localStorage. Shared by both bootstrapPage() (full pages)
 * and the lighter initI18n()-only pages (About, FAQ, legal pages, etc.)
 * so it appears site-wide, not just on the shop pages.
 */

export function injectCookieConsent() {
  if (localStorage.getItem("tracy_cookie_consent") === "accepted") return;
  if (document.getElementById("cookie-consent-banner")) return;

  const bar = document.createElement("div");
  bar.id = "cookie-consent-banner";
  bar.className = "cookie-consent-banner";
  bar.innerHTML = `
    <p data-i18n="cookie_banner_text">We use cookies to improve your experience and remember your language preference.</p>
    <button type="button" id="cookie-consent-accept" class="btn-gold" data-i18n="cookie_banner_accept">Accept</button>
  `;
  document.body.appendChild(bar);

  document.getElementById("cookie-consent-accept").addEventListener("click", () => {
    localStorage.setItem("tracy_cookie_consent", "accepted");
    bar.remove();
  });

  import("/assets/js/i18n.js").then(({ applyDomTranslations, onLocaleChange }) => {
    applyDomTranslations(bar);
    onLocaleChange(() => applyDomTranslations(bar));
  });
}

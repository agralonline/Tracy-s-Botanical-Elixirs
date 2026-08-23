/**
 * TRACY USA — Page bootstrap
 * ---------------------------------------------------------------------
 * Shared init logic included (as a module) on every storefront page:
 * language system, cart UI, mobile nav, newsletter form, and the
 * ambient background layer. Page-specific rendering (home grid,
 * product detail, cart page) is triggered from inline <script type="module">
 * blocks in each HTML file, after this has finished setting up i18n.
 */

import { initI18n, onLocaleChange, t } from "/assets/js/i18n.js";
import { initCartUI } from "/assets/js/cart.js";
import { injectCookieConsent } from "/assets/js/cookie-consent.js";

export async function bootstrapPage() {
  injectAmbientBackground();
  await initI18n();
  initCartUI();
  wireMobileNav();
  wireNewsletterForm();
  wireYear();
  injectCookieConsent();
}

function injectAmbientBackground() {
  if (document.querySelector(".ambient-bg")) return;
  const bg = document.createElement("div");
  bg.className = "ambient-bg";
  bg.innerHTML = '<div class="glow-gold"></div>';
  document.body.prepend(bg);
  const noise = document.createElement("div");
  noise.className = "noise-overlay";
  document.body.prepend(noise);
}

function wireMobileNav() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const nav = document.getElementById("mobile-nav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.toggle("hidden");
  });
  nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nav.classList.add("hidden")));

  // Tap/click anywhere outside the open menu (the backdrop) closes it.
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("hidden")) return;
    if (nav.contains(e.target) || toggle.contains(e.target)) return;
    nav.classList.add("hidden");
  });

  // Escape key also closes it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !nav.classList.contains("hidden")) {
      nav.classList.add("hidden");
    }
  });
}

function wireNewsletterForm() {
  document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input[type=email]");
      const msg = form.querySelector("[data-newsletter-message]");
      if (!input || !input.value) return;
      // Client-side confirmation only. Wire this to your ESP (Klaviyo, Mailchimp,
      // etc.) or a Firestore `newsletterSignups` collection write in production.
      if (msg) {
        msg.textContent = t("footer_newsletter_success");
        msg.classList.remove("hidden");
      }
      input.value = "";
    });
  });

  onLocaleChange(() => {
    document.querySelectorAll("[data-newsletter-message]:not(.hidden)").forEach((msg) => {
      msg.textContent = t("footer_newsletter_success");
    });
  });
}

function wireYear() {
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });
}

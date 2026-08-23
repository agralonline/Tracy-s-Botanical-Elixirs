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
import { fetchSiteSettings } from "/assets/js/settings.js";
import { injectChatbot } from "/assets/js/chatbot.js";

export async function bootstrapPage() {
  injectAmbientBackground();
  await initI18n();
  initCartUI();
  wireMobileNav();
  wireNewsletterForm();
  wireYear();
  injectCookieConsent();
  await injectAnnouncementBar();
  injectChatbot();
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

const ANNOUNCEMENT_DISMISS_KEY = "tracy_announcement_dismissed";

/** Admin-configurable announcement bar, shown at the very top of every page. English-only text, like blog posts. */
async function injectAnnouncementBar() {
  const settings = await fetchSiteSettings();
  if (!settings.announcementEnabled || !settings.announcementText?.trim()) return;

  let dismissedText = "";
  try {
    dismissedText = window.localStorage.getItem(ANNOUNCEMENT_DISMISS_KEY) || "";
  } catch (e) {
    /* ignore */
  }
  // Re-show automatically if the admin changes the message, even if an older one was dismissed.
  if (dismissedText === settings.announcementText) return;

  const bar = document.createElement("div");
  bar.id = "announcement-bar";
  bar.setAttribute("role", "note");
  bar.style.cssText = "position:relative;background:linear-gradient(120deg,var(--gold-dim),var(--gold-soft) 45%,var(--gold) 75%,var(--gold-soft));color:#0a0f1d;font-size:.8rem;font-weight:600;text-align:center;padding:.6rem 2.4rem;letter-spacing:.02em;";
  bar.innerHTML = `<span></span><button type="button" aria-label="Dismiss" style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;color:#0a0f1d;font-size:1rem;line-height:1;cursor:pointer;padding:.25rem;">&times;</button>`;
  bar.querySelector("span").textContent = settings.announcementText;
  bar.querySelector("button").addEventListener("click", () => {
    try {
      window.localStorage.setItem(ANNOUNCEMENT_DISMISS_KEY, settings.announcementText);
    } catch (e) {
      /* ignore */
    }
    bar.remove();
  });

  document.body.prepend(bar);
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

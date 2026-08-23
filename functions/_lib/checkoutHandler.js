/**
 * TRACY USA — Stripe Checkout session creation
 * ---------------------------------------------------------------------
 * Uses Stripe Checkout in "direct" mode — Stripe's standard per-
 * transaction fee (no separate monthly platform fee), fully compatible
 * with static/serverless hosting since there's no backend to run other
 * than this one function.
 *
 * Builds line items with `price_data` on the fly (so products don't
 * strictly need pre-created Stripe Price objects — though if a product
 * DOES have a `priceId` set by the admin panel's Stripe sync, that is
 * used instead, which is the recommended path for accurate reporting
 * in the Stripe Dashboard).
 */

import Stripe from "stripe";
import { getAdminDb } from "./firebaseAdmin.js";

const STRIPE_LOCALE_MAP = {
  en: "en", es: "es", pt: "pt", fr: "fr", de: "de", it: "it", nl: "nl",
  sv: "sv", el: "el", pl: "pl", ro: "ro", cs: "cs", hu: "hu", uk: "auto",
  ru: "ru", bg: "bg", sk: "sk", lt: "lt", ar: "auto", tr: "tr",
  "zh-CN": "zh", "zh-TW": "zh-TW", ja: "ja", ko: "ko",
};

// A broad, curated set of shippable countries with a US-first focus.
// Add/remove as your fulfillment provider's reach changes.
const SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "IE", "AU", "NZ",
  "DE", "FR", "IT", "ES", "PT", "NL", "BE", "AT", "CH", "SE", "NO", "DK", "FI",
  "PL", "CZ", "SK", "HU", "RO", "BG", "GR", "LT", "LV", "EE",
  "JP", "KR", "SG", "AE", "SA", "TR", "MX", "BR",
];

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 7500; // $75, matches the site's existing "free_shipping_note" copy
const STANDARD_SHIPPING_RATE_CENTS = 695; // $6.95 flat rate below the free-shipping threshold

/** Read the admin-configurable free-shipping threshold from tracy_settings/site, falling back to the default. */
async function getFreeShippingThresholdCents() {
  try {
    const snap = await getAdminDb().collection("tracy_settings").doc("site").get();
    const cents = snap.exists ? snap.data()?.freeShippingThresholdCents : null;
    return typeof cents === "number" && cents >= 0 ? cents : DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
  } catch (err) {
    console.warn("Could not read free-shipping threshold from tracy_settings/site, using default.", err.message);
    return DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
  }
}

function buildShippingOptions(subtotalCents, freeShippingThresholdCents) {
  const standard = {
    shipping_rate_data: {
      type: "fixed_amount",
      fixed_amount: { amount: STANDARD_SHIPPING_RATE_CENTS, currency: "usd" },
      display_name: "Standard Shipping",
      delivery_estimate: {
        minimum: { unit: "business_day", value: 3 },
        maximum: { unit: "business_day", value: 7 },
      },
    },
  };

  if (subtotalCents >= freeShippingThresholdCents) {
    const free = {
      shipping_rate_data: {
        type: "fixed_amount",
        fixed_amount: { amount: 0, currency: "usd" },
        display_name: "Free Shipping",
        delivery_estimate: {
          minimum: { unit: "business_day", value: 3 },
          maximum: { unit: "business_day", value: 7 },
        },
      },
    };
    // Free option listed first so it's the default-selected radio in Stripe Checkout.
    return [free, standard];
  }

  return [standard];
}

export async function handleCreateCheckoutSession({ body }) {
  if (!process.env.STRIPE_SECRET_KEY) {
    const err = new Error("Stripe is not configured on the server (STRIPE_SECRET_KEY missing).");
    err.statusCode = 500;
    throw err;
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const payload = body || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) throw badRequest("Cart is empty.");
  if (!payload.successUrl || !payload.cancelUrl) throw badRequest("successUrl and cancelUrl are required.");

  const line_items = items.map((item) => {
    if (!item.unitAmount || !item.quantity) {
      throw badRequest(`Invalid line item for product "${item.productId}".`);
    }
    if (item.priceId) {
      return { price: item.priceId, quantity: item.quantity };
    }
    return {
      quantity: item.quantity,
      price_data: {
        currency: item.currency || "usd",
        unit_amount: item.unitAmount,
        product_data: {
          name: item.title || item.sku || item.productId,
          images: item.image ? [absoluteUrl(item.image, payload.origin)] : undefined,
          metadata: { productId: item.productId, sku: item.sku || "" },
        },
      },
    };
  });

  const subtotalCents = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
  const freeShippingThresholdCents = await getFreeShippingThresholdCents();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: payload.successUrl,
    cancel_url: payload.cancelUrl,
    customer_email: payload.email || undefined,
    locale: STRIPE_LOCALE_MAP[payload.locale] || "auto",
    shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
    shipping_options: buildShippingOptions(subtotalCents, freeShippingThresholdCents),
    billing_address_collection: "auto",
    phone_number_collection: { enabled: true },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
    // Lets customers enter a promo code at checkout. Create/manage codes in
    // the Stripe Dashboard → Product catalog → Coupons — no site code needed.
    allow_promotion_codes: true,
    metadata: {
      locale: payload.locale || "en",
      productIds: items.map((i) => i.productId).join(","),
    },
  });

  return { statusCode: 200, jsonBody: { id: session.id, url: session.url } };
}

// NOTE: Stripe Checkout line-item thumbnails expect a JPEG/PNG/WebP URL.
// The bundled SVG placeholder art renders fine on the storefront itself,
// but swap each product's primary image for a real JPG/PNG (via the
// admin panel's image upload) before relying on the thumbnail Stripe
// shows during checkout — until then Stripe will simply omit the image
// rather than error, so checkout still works either way.
function absoluteUrl(url, origin) {
  if (/^https?:\/\//i.test(url)) return url;
  if (!origin) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

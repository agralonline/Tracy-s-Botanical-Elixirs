/**
 * TRACY USA — Product catalog: fetch, cache, filter, and render.
 * ---------------------------------------------------------------------
 * Data source priority:
 *   1. Firestore `products` collection (status == "active"), if Firebase
 *      is configured (see firebase-config.js).
 *   2. Local SEED_PRODUCTS bundled in /data/seed-products.js.
 *
 * Both sources share the exact same document shape (see
 * /firestore-schema.md), so every render function below works
 * identically no matter where the data came from.
 *
 * Re-rendering on language change: every render function reads the
 * *currently selected* locale via getProductText() at call time, and
 * main.js re-invokes the active render function from an
 * onLocaleChange() subscription — so switching languages updates the
 * DOM instantly with no page reload and no network refetch.
 */

import { SEED_PRODUCTS, CATEGORIES } from "/data/seed-products.js";
import { getProductText, t } from "/assets/js/i18n.js";
import { getFirebaseServices } from "/assets/js/firebase-config.js";
import { getCartQuantityFor } from "/assets/js/cart.js";

let productCache = null; // Array<Product> | null until first fetch resolves

/** Inventory count at or below which the storefront shows an urgency message. */
const LOW_STOCK_THRESHOLD = 5;

/** True when a product is tracked, in stock, and at/under the low-stock threshold. */
function isLowStock(product) {
  const inv = product.inventory;
  return !!(inv?.trackInventory && inv.quantity > 0 && inv.quantity <= LOW_STOCK_THRESHOLD);
}

/** Fetch all active products, preferring Firestore and falling back to seed data. */
export async function fetchProducts({ forceRefresh = false } = {}) {
  if (productCache && !forceRefresh) return productCache;

  const services = await getFirebaseServices();
  if (services) {
    try {
      const { db, firestoreMod } = services;
      const { collection, getDocs, query, where } = firestoreMod;
      const q = query(collection(db, "tracy_products"), where("status", "==", "active"));
      const snap = await getDocs(q);
      if (!snap.empty) {
        productCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return productCache;
      }
    } catch (err) {
      console.warn("Firestore product fetch failed, using local seed data.", err);
    }
  }

  productCache = SEED_PRODUCTS;
  return productCache;
}

export function getCategories() {
  return CATEGORIES;
}

export async function getProductBySlug(slug) {
  const products = await fetchProducts();
  return products.find((p) => p.slug === slug) || null;
}

export function formatPrice(amount, currency = "USD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch (e) {
    return `$${Number(amount).toFixed(2)}`;
  }
}

/** Convert a Firestore Timestamp, ISO string, or plain Date-ish value to a comparable number. */
function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis(); // Firestore Timestamp
  if (typeof value.seconds === "number") return value.seconds * 1000; // Firestore Timestamp (plain object)
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Sort a product array in place-safe fashion. sortBy: "" | "price-asc" | "price-desc" | "newest". */
function sortProducts(products, sortBy) {
  const list = [...products];
  if (sortBy === "price-asc") {
    list.sort((a, b) => (a.pricing?.basePrice ?? 0) - (b.pricing?.basePrice ?? 0));
  } else if (sortBy === "price-desc") {
    list.sort((a, b) => (b.pricing?.basePrice ?? 0) - (a.pricing?.basePrice ?? 0));
  } else if (sortBy === "newest") {
    list.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }
  return list;
}

function computeBadge(product) {
  if (product.pricing?.compareAtPrice && product.pricing.compareAtPrice > product.pricing.basePrice) {
    return { key: "badge_sale", cls: "chip" };
  }
  if (product.rating?.average >= 4.8 && product.rating?.count >= 50) {
    return { key: "badge_bestseller", cls: "chip-gold" };
  }
  return null;
}

/** Build the inner HTML for a single product card. Pure function of (product, locale-dependent t()). */
export function productCardHTML(product) {
  const title = getProductText(product, "title");
  const short = getProductText(product, "shortDescription");
  const badge = computeBadge(product);
  const primaryImage = (product.images && product.images.find((i) => i.isPrimary)) || product.images?.[0];
  const qtyInCart = getCartQuantityFor(product.id);
  const outOfStock = product.inventory?.trackInventory && product.inventory.quantity <= 0 && !product.inventory.allowBackorder;
  const lowStock = !outOfStock && isLowStock(product);

  return `
    <article class="product-card animate-fade-up" data-product-id="${product.id}" data-category="${product.category}">
      <a href="/product.html?slug=${encodeURIComponent(product.slug)}" class="block" aria-label="${escapeHtml(title)}">
        <div class="media-wrap">
          ${badge ? `<span class="chip ${badge.cls} absolute top-3 ${document.dir === "rtl" ? "right-3" : "left-3"} z-10" data-i18n="${badge.key}">${t(badge.key)}</span>` : ""}
          <img src="${primaryImage?.url || ""}" alt="${escapeHtml(title)}" loading="lazy" width="600" height="600" />
        </div>
      </a>
      <div class="p-5 flex flex-col gap-2">
        <p class="eyebrow">${escapeHtml(t(categoryLabelKey(product.category)))}</p>
        <a href="/product.html?slug=${encodeURIComponent(product.slug)}" class="heading-serif text-lg leading-snug hover:text-gold-soft transition-colors">${escapeHtml(title)}</a>
        <p class="text-sm text-ink-300 line-clamp-2">${escapeHtml(short)}</p>
        <div class="flex items-center justify-between mt-2">
          <div class="flex items-baseline gap-2">
            <span class="text-gold font-semibold">${formatPrice(product.pricing.basePrice, product.pricing.currency)}</span>
            ${product.pricing.compareAtPrice ? `<span class="text-xs text-ink-700 line-through">${formatPrice(product.pricing.compareAtPrice, product.pricing.currency)}</span>` : ""}
          </div>
          ${product.rating ? `<span class="text-xs text-ink-500">★ ${product.rating.average.toFixed(1)} (${product.rating.count})</span>` : ""}
        </div>
        ${lowStock ? `<p class="text-xs text-amber-400" data-i18n-count>${escapeHtml(t("product_low_stock", { count: product.inventory.quantity }))}</p>` : ""}
        <button
          type="button"
          class="btn-gold w-full mt-3 add-to-cart-btn"
          data-product-id="${product.id}"
          ${outOfStock ? "disabled style=\"opacity:.45;cursor:not-allowed;\"" : ""}
        >
          ${outOfStock ? escapeHtml(t("product_out_of_stock")) : escapeHtml(t("product_add_to_cart")) + (qtyInCart ? ` (${qtyInCart})` : "")}
        </button>
      </div>
    </article>
  `;
}

function categoryLabelKey(categorySlug) {
  const map = {
    "essential-oils": "category_essential_oils",
    serums: "category_serums",
    skincare: "category_skincare",
    "hair-care": "category_hair_care",
  };
  return map[categorySlug] || "category_essential_oils";
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Render (or re-render) a grid of product cards into `containerEl`.
 * Safe to call repeatedly — e.g. once on load, and again from an
 * onLocaleChange() subscription to instantly re-localize every card
 * without a full page refresh.
 */
export async function renderProductGrid(containerEl, { category = null, featuredOnly = false, searchTerm = "", sortBy = "" } = {}) {
  if (!containerEl) return;
  containerEl.innerHTML = skeletonGridHTML(8);

  const products = await fetchProducts();
  let filtered = products;

  if (category) filtered = filtered.filter((p) => p.category === category);
  if (featuredOnly) filtered = filtered.filter((p) => p.featured);
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const title = getProductText(p, "title").toLowerCase();
      const desc = getProductText(p, "shortDescription").toLowerCase();
      return title.includes(term) || desc.includes(term) || p.sku.toLowerCase().includes(term);
    });
  }

  filtered = sortProducts(filtered, sortBy);

  if (!filtered.length) {
    containerEl.innerHTML = `<p class="col-span-full text-center text-ink-500 py-16" data-i18n="search_no_results">${t("search_no_results")}</p>`;
    return;
  }

  containerEl.innerHTML = filtered.map(productCardHTML).join("");
  wireAddToCartButtons(containerEl);
}

function skeletonGridHTML(count) {
  return Array.from({ length: count })
    .map(
      () => `
      <div class="product-card">
        <div class="media-wrap skeleton" style="aspect-ratio:1/1;"></div>
        <div class="p-5 space-y-2">
          <div class="skeleton h-3 w-1/3 rounded"></div>
          <div class="skeleton h-4 w-2/3 rounded"></div>
          <div class="skeleton h-3 w-full rounded"></div>
          <div class="skeleton h-9 w-full rounded-full mt-3"></div>
        </div>
      </div>`
    )
    .join("");
}

function wireAddToCartButtons(root) {
  root.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const id = btn.getAttribute("data-product-id");
      const products = await fetchProducts();
      const product = products.find((p) => p.id === id);
      if (!product) return;
      document.dispatchEvent(new CustomEvent("tracy:addtocart", { detail: { product } }));
    });
  });
}

/** Render the full product detail view into `containerEl` (used by product.html). */
export async function renderProductDetail(containerEl, slug) {
  if (!containerEl) return;
  const product = await getProductBySlug(slug);
  if (!product) {
    containerEl.innerHTML = `<p class="text-center text-ink-500 py-24" data-i18n="search_no_results">${t("search_no_results")}</p>`;
    return;
  }

  const title = getProductText(product, "title");
  const desc = getProductText(product, "description");
  const primaryImage = (product.images && product.images.find((i) => i.isPrimary)) || product.images?.[0];
  const outOfStock = product.inventory?.trackInventory && product.inventory.quantity <= 0 && !product.inventory.allowBackorder;
  const lowStock = !outOfStock && isLowStock(product);

  containerEl.innerHTML = `
    <div class="grid md:grid-cols-2 gap-10 items-start">
      <div class="glass-static p-8">
        <div class="media-wrap" style="border-radius:0.85rem;">
          <img src="${primaryImage?.url || ""}" alt="${escapeHtml(title)}" width="600" height="600" />
        </div>
      </div>
      <div class="flex flex-col gap-5">
        <p class="eyebrow">${escapeHtml(t(categoryLabelKey(product.category)))}</p>
        <h1 class="heading-serif text-4xl gold-gradient-text">${escapeHtml(title)}</h1>
        ${product.rating ? `<p class="text-sm text-ink-500">★ ${product.rating.average.toFixed(1)} · <span data-i18n-count>${t("rating_reviews", { count: product.rating.count })}</span></p>` : ""}
        <div class="flex items-baseline gap-3">
          <span class="text-3xl text-gold font-semibold">${formatPrice(product.pricing.basePrice, product.pricing.currency)}</span>
          ${product.pricing.compareAtPrice ? `<span class="text-base text-ink-700 line-through">${formatPrice(product.pricing.compareAtPrice, product.pricing.currency)}</span>` : ""}
        </div>
        ${lowStock ? `<p class="text-sm text-amber-400" data-i18n-count>${escapeHtml(t("product_low_stock", { count: product.inventory.quantity }))}</p>` : ""}
        <hr class="hairline-gold" />
        <div>
          <h2 class="text-sm eyebrow mb-2" data-i18n="product_description_title">${t("product_description_title")}</h2>
          <p class="text-ink-300 leading-relaxed">${escapeHtml(desc)}</p>
        </div>
        ${product.attributes?.ingredients?.length ? `
        <div>
          <h2 class="text-sm eyebrow mb-2" data-i18n="product_ingredients_title">${t("product_ingredients_title")}</h2>
          <p class="text-ink-300 text-sm">${escapeHtml(product.attributes.ingredients.join(", "))}</p>
        </div>` : ""}
        <div class="flex flex-wrap gap-2">
          ${product.attributes?.organic ? `<span class="chip-gold chip">${escapeHtml(t("why_organic_title"))}</span>` : ""}
          ${product.attributes?.crueltyFree ? `<span class="chip">${escapeHtml(t("why_cruelty_title"))}</span>` : ""}
          ${product.attributes?.vegan ? `<span class="chip">Vegan</span>` : ""}
        </div>
        <button
          type="button"
          class="btn-gold w-full sm:w-auto add-to-cart-btn mt-2"
          data-product-id="${product.id}"
          ${outOfStock ? "disabled style=\"opacity:.45;cursor:not-allowed;\"" : ""}
        >
          ${outOfStock ? escapeHtml(t("product_out_of_stock")) : escapeHtml(t("product_add_to_cart"))}
        </button>
      </div>
    </div>
  `;
  wireAddToCartButtons(containerEl);
}

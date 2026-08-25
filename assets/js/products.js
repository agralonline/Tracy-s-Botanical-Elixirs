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

import { SEED_PRODUCTS } from "/data/seed-products.js";
import { getProductText, t } from "/assets/js/i18n.js";
import { getFirebaseServices } from "/assets/js/firebase-config.js";
import { getCartQuantityFor } from "/assets/js/cart.js";
import { fetchCategories, getCategoryLabel } from "/assets/js/categories.js";

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
        // Respect the admin's ▲/▼ display order (see admin.js) when set;
        // products never reordered fall back to most-recently-updated first.
        productCache.sort((a, b) => {
          const ao = typeof a.order === "number" ? a.order : Infinity;
          const bo = typeof b.order === "number" ? b.order : Infinity;
          if (ao !== bo) return ao - bo;
          return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        });
        return productCache;
      }
    } catch (err) {
      console.warn("Firestore product fetch failed, using local seed data.", err);
    }
  }

  productCache = SEED_PRODUCTS;
  return productCache;
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
    return { key: "badge_sale", cls: "chip-sale" };
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
    <article class="product-card animate-fade-up" data-product-id="${product.id}" data-category="${product.category}" data-card-href="/product.html?slug=${encodeURIComponent(product.slug)}" style="cursor:pointer;">
      <a href="/product.html?slug=${encodeURIComponent(product.slug)}" class="block" aria-label="${escapeHtml(title)}">
        <div class="media-wrap">
          ${badge ? `<span class="chip ${badge.cls} absolute top-3 ${document.dir === "rtl" ? "right-3" : "left-3"} z-10" data-i18n="${badge.key}">${t(badge.key)}</span>` : ""}
          <img src="${primaryImage?.url || ""}" alt="${escapeHtml(title)}" loading="lazy" width="600" height="600" />
        </div>
      </a>
      <div class="p-5 flex flex-col gap-2">
        <p class="eyebrow">${escapeHtml(getCategoryLabel(product.category))}</p>
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
export async function renderProductGrid(containerEl, { category = null, featuredOnly = false, searchTerm = "", sortBy = "", goal = null, onSaleOnly = false } = {}) {
  if (!containerEl) return;
  containerEl.innerHTML = skeletonGridHTML(8);

  const [products] = await Promise.all([fetchProducts(), fetchCategories()]);
  let filtered = products;

  if (category) filtered = filtered.filter((p) => p.category === category);
  if (featuredOnly) filtered = filtered.filter((p) => p.featured);
  if (goal) filtered = filtered.filter((p) => Array.isArray(p.goals) && p.goals.includes(goal));
  if (onSaleOnly) filtered = filtered.filter((p) => p.pricing?.compareAtPrice && p.pricing.compareAtPrice > p.pricing.basePrice);
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

/**
 * Render a single horizontal-scrolling row of product cards (Netflix-style
 * lane) into `containerEl` — used for the homepage's "Shop by Category"
 * rows and Bestsellers row, and the shop page's "All" view. Give the
 * container the `product-row-scroll` CSS class for the swipe-lane styling.
 * Returns the number of products rendered, so callers can hide an empty row.
 */
export async function renderProductRow(containerEl, { category = null, featuredOnly = false, searchTerm = "", sortBy = "", goal = null, onSaleOnly = false } = {}) {
  if (!containerEl) return 0;
  const products = await fetchProducts();
  let filtered = products;
  if (category) filtered = filtered.filter((p) => p.category === category);
  if (featuredOnly) filtered = filtered.filter((p) => p.featured);
  if (goal) filtered = filtered.filter((p) => Array.isArray(p.goals) && p.goals.includes(goal));
  if (onSaleOnly) filtered = filtered.filter((p) => p.pricing?.compareAtPrice && p.pricing.compareAtPrice > p.pricing.basePrice);
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const title = getProductText(p, "title").toLowerCase();
      const desc = getProductText(p, "shortDescription").toLowerCase();
      return title.includes(term) || desc.includes(term) || p.sku.toLowerCase().includes(term);
    });
  }
  filtered = sortProducts(filtered, sortBy);

  containerEl.innerHTML = filtered.map(productCardHTML).join("");
  wireAddToCartButtons(containerEl);
  return filtered.length;
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
      e.stopPropagation(); // don't also trigger the card-wide click-to-open below
      const id = btn.getAttribute("data-product-id");
      const products = await fetchProducts();
      const product = products.find((p) => p.id === id);
      if (!product) return;
      document.dispatchEvent(new CustomEvent("tracy:addtocart", { detail: { product } }));
    });
  });
  wireClickableProductCards(root);
}

/** Makes the whole product card open the product, not just the image/title — the "Add to Cart" button and any other links inside the card keep their own behavior (see stopPropagation above and the <a> check below). */
function wireClickableProductCards(root) {
  root.querySelectorAll(".product-card[data-card-href]").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return; // own handler (add-to-cart) or its own link already navigates
      window.location.href = card.getAttribute("data-card-href");
    });
  });
}

/** Render the full product detail view into `containerEl` (used by product.html). */
export async function renderProductDetail(containerEl, slug) {
  if (!containerEl) return;
  const [product] = await Promise.all([getProductBySlug(slug), fetchCategories()]);
  if (!product) {
    containerEl.innerHTML = `<p class="text-center text-ink-500 py-24" data-i18n="search_no_results">${t("search_no_results")}</p>`;
    return;
  }

  const title = getProductText(product, "title");
  const desc = getProductText(product, "description");
  const images = (product.images && product.images.length ? product.images : [{}]);
  const primaryImage = images.find((i) => i.isPrimary) || images[0];
  const outOfStock = product.inventory?.trackInventory && product.inventory.quantity <= 0 && !product.inventory.allowBackorder;
  const lowStock = !outOfStock && isLowStock(product);
  const ingredientsText = product.attributes?.ingredients?.length ? (getProductText(product, "ingredients") || product.attributes.ingredients.join(", ")) : "";

  // Amazon-style: a thumbnail rail (only shown when there's more than one
  // image — most products still have just the one primary shot) next to a
  // large main image, and the long-form info below the fold split into
  // expandable sections so the page opens short instead of one wall of text.
  const galleryHTML = `
    <div class="glass-static p-8">
      <div class="media-wrap" id="pdp-main-media" style="border-radius:0.85rem;">
        <img id="pdp-main-image" src="${primaryImage?.url || ""}" alt="${escapeHtml(title)}" width="600" height="600" />
      </div>
      ${images.length > 1 ? `
      <div class="flex gap-3 mt-4 overflow-x-auto">
        ${images.map((img, i) => `
          <button type="button" class="pdp-thumb-btn ${i === 0 ? "pdp-thumb-active" : ""}" data-thumb-src="${escapeHtml(img.url || "")}" style="flex:0 0 64px;width:64px;height:64px;border-radius:.5rem;overflow:hidden;border:1.5px solid ${i === 0 ? "var(--gold)" : "rgba(255,255,255,.12)"};background:var(--navy-850);padding:0;cursor:pointer;">
            <img src="${escapeHtml(img.url || "")}" alt="" style="width:100%;height:100%;object-fit:contain;" />
          </button>
        `).join("")}
      </div>` : ""}
    </div>
  `;

  function accordionSection({ id, title, content, openByDefault }) {
    if (!content) return "";
    return `
      <div class="pdp-accordion" style="border-top:1px solid rgba(255,255,255,.08);">
        <button type="button" class="pdp-accordion-trigger" data-accordion-trigger="${id}" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:.9rem 0;background:none;border:none;cursor:pointer;color:inherit;text-align:left;">
          <span class="text-sm eyebrow">${title}</span>
          <svg data-accordion-chevron="${id}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition:transform .2s;${openByDefault ? "transform:rotate(180deg);" : ""}"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div data-accordion-panel="${id}" style="${openByDefault ? "" : "display:none;"}padding-bottom:1rem;">
          ${content}
        </div>
      </div>
    `;
  }

  containerEl.innerHTML = `
    <a href="/shop.html?category=${encodeURIComponent(product.category)}" id="pdp-back-link" class="text-sm text-ink-500 hover:text-gold-soft inline-flex items-center gap-1 mb-6" style="text-decoration:none;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      <span>${escapeHtml(t("pdp_back_to_category"))} ${escapeHtml(getCategoryLabel(product.category))}</span>
    </a>
    <div class="grid md:grid-cols-2 gap-10 items-start">
      ${galleryHTML}
      <div class="flex flex-col gap-5">
        <p class="eyebrow">${escapeHtml(getCategoryLabel(product.category))}</p>
        <h1 class="heading-serif text-4xl gold-gradient-text">${escapeHtml(title)}</h1>
        ${product.rating ? `<p class="text-sm text-ink-500">★ ${product.rating.average.toFixed(1)} · <span data-i18n-count>${t("rating_reviews", { count: product.rating.count })}</span></p>` : ""}
        <div class="flex items-baseline gap-3">
          <span class="text-3xl text-gold font-semibold">${formatPrice(product.pricing.basePrice, product.pricing.currency)}</span>
          ${product.pricing.compareAtPrice ? `<span class="text-base text-ink-700 line-through">${formatPrice(product.pricing.compareAtPrice, product.pricing.currency)}</span>` : ""}
        </div>
        ${product.attributes?.volumeMl ? `<p class="text-xs text-ink-500">${product.attributes.volumeMl} mL</p>` : ""}
        ${lowStock ? `<p class="text-sm text-amber-400" data-i18n-count>${escapeHtml(t("product_low_stock", { count: product.inventory.quantity }))}</p>` : ""}
        <div class="flex flex-wrap gap-2">
          ${product.attributes?.organic ? `<span class="chip-gold chip">${escapeHtml(t("why_organic_title"))}</span>` : ""}
          ${product.attributes?.crueltyFree ? `<span class="chip">${escapeHtml(t("why_cruelty_title"))}</span>` : ""}
          ${product.attributes?.vegan ? `<span class="chip">${escapeHtml(t("product_vegan_label"))}</span>` : ""}
        </div>
        <button
          type="button"
          class="btn-gold w-full sm:w-auto add-to-cart-btn mt-1"
          data-product-id="${product.id}"
          ${outOfStock ? "disabled style=\"opacity:.45;cursor:not-allowed;\"" : ""}
        >
          ${outOfStock ? escapeHtml(t("product_out_of_stock")) : escapeHtml(t("product_add_to_cart"))}
        </button>

        <div class="mt-2">
          ${accordionSection({ id: "desc", title: t("product_description_title"), content: `<p class="text-ink-300 leading-relaxed text-sm">${escapeHtml(desc)}</p>`, openByDefault: true })}
          ${accordionSection({ id: "ingredients", title: t("product_ingredients_title"), content: ingredientsText ? `<p class="text-ink-300 text-sm">${escapeHtml(ingredientsText)}</p>` : "", openByDefault: false })}
          ${accordionSection({ id: "shipping", title: t("footer_shipping"), content: `<p class="text-ink-300 text-sm leading-relaxed">Ships from the US within 1-2 business days. Domestic US orders over $75 ship free; other orders and international shipping are calculated at checkout. Unopened products can be returned within 30 days for a full refund — <a href="/return-request.html" class="text-gold-soft hover:underline">start a return</a>.</p>`, openByDefault: false })}
        </div>
      </div>
    </div>
  `;
  wireAddToCartButtons(containerEl);
  wirePdpGallery(containerEl);
  wirePdpAccordions(containerEl);
  wirePdpBackLink(containerEl);
}

// If the visitor actually came from shop/home on this site, going back
// through browser history returns them to the exact scroll position and
// filters they had (see shop.html's sessionStorage restore). Otherwise
// (direct link, new tab, search engine) fall back to a plain navigation
// to the category — still useful, just without the exact scroll restore.
function wirePdpBackLink(root) {
  const link = root.querySelector("#pdp-back-link");
  if (!link) return;
  link.addEventListener("click", (e) => {
    const ref = document.referrer;
    if (ref && ref.startsWith(window.location.origin) && window.history.length > 1) {
      e.preventDefault();
      window.history.back();
    }
  });
}

function wirePdpGallery(root) {
  const mainImg = root.querySelector("#pdp-main-image");
  root.querySelectorAll(".pdp-thumb-btn").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (!mainImg) return;
      mainImg.src = thumb.getAttribute("data-thumb-src");
      root.querySelectorAll(".pdp-thumb-btn").forEach((t) => {
        t.classList.remove("pdp-thumb-active");
        t.style.borderColor = "rgba(255,255,255,.12)";
      });
      thumb.classList.add("pdp-thumb-active");
      thumb.style.borderColor = "var(--gold)";
    });
  });
}

function wirePdpAccordions(root) {
  root.querySelectorAll("[data-accordion-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const id = trigger.getAttribute("data-accordion-trigger");
      const panel = root.querySelector(`[data-accordion-panel="${id}"]`);
      const chevron = root.querySelector(`[data-accordion-chevron="${id}"]`);
      if (!panel) return;
      const isOpen = panel.style.display !== "none";
      panel.style.display = isOpen ? "none" : "";
      if (chevron) chevron.style.transform = isOpen ? "" : "rotate(180deg)";
    });
  });
}

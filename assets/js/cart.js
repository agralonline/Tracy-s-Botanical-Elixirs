/**
 * THE BOTANICAL APOTHECARY — Shopping cart
 * ---------------------------------------------------------------------
 * Cart state lives entirely in localStorage (key: "tracy_cart") as a
 * simple array of { productId, quantity }. This module owns all cart
 * CRUD, the slide-out cart drawer UI, and kicking off Stripe Checkout.
 *
 * It listens for the "tracy:addtocart" custom event dispatched by
 * products.js whenever an "Add to Cart" button is clicked, so
 * products.js never has to import cart internals directly — it just
 * fires an event.
 */

import { t, getProductText, onLocaleChange } from "/assets/js/i18n.js";
import { fetchProducts, formatPrice } from "/assets/js/products.js";

const CART_STORAGE_KEY = "tracy_cart";
const changeListeners = new Set();

function readRaw() {
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function writeRaw(items) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    /* ignore quota / privacy-mode errors */
  }
  notifyChange(items);
}

function notifyChange(items) {
  for (const cb of changeListeners) {
    try {
      cb(items);
    } catch (err) {
      console.error("Cart change listener failed:", err);
    }
  }
  document.dispatchEvent(new CustomEvent("tracy:cartchange", { detail: { items } }));
}

export function onCartChange(callback) {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

export function getCart() {
  return readRaw();
}

export function getCartQuantityFor(productId) {
  const items = readRaw();
  const item = items.find((i) => i.productId === productId);
  return item ? item.quantity : 0;
}

export function getCartCount() {
  return readRaw().reduce((sum, i) => sum + i.quantity, 0);
}

export function addItem(productId, quantity = 1) {
  const items = readRaw();
  const existing = items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({ productId, quantity });
  }
  writeRaw(items);
}

export function setQuantity(productId, quantity) {
  let items = readRaw();
  if (quantity <= 0) {
    items = items.filter((i) => i.productId !== productId);
  } else {
    const existing = items.find((i) => i.productId === productId);
    if (existing) existing.quantity = quantity;
    else items.push({ productId, quantity });
  }
  writeRaw(items);
}

export function removeItem(productId) {
  const items = readRaw().filter((i) => i.productId !== productId);
  writeRaw(items);
}

export function clearCart() {
  writeRaw([]);
}

/** Resolve cart line items against full product records (price, title, image). */
export async function getEnrichedCart() {
  const [items, products] = await Promise.all([Promise.resolve(readRaw()), fetchProducts()]);
  return items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter(Boolean);
}

export async function getCartTotals() {
  const enriched = await getEnrichedCart();
  const currency = enriched[0]?.product.pricing.currency || "USD";
  const subtotal = enriched.reduce((sum, i) => sum + i.product.pricing.basePrice * i.quantity, 0);
  return { subtotal, currency, itemCount: enriched.reduce((s, i) => s + i.quantity, 0) };
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Renders the cart drawer contents into #cart-drawer-body and updates the header badge. */
export async function renderCart() {
  const body = document.getElementById("cart-drawer-body");
  const footer = document.getElementById("cart-drawer-footer");
  const badge = document.getElementById("cart-count-badge");

  const count = getCartCount();
  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "flex" : "none";
  }

  if (!body) return;

  const enriched = await getEnrichedCart();

  if (!enriched.length) {
    body.innerHTML = `<p class="text-ink-500 text-center py-16" data-i18n="cart_empty">${t("cart_empty")}</p>`;
    if (footer) footer.innerHTML = "";
    return;
  }

  body.innerHTML = enriched
    .map(({ product, quantity }) => {
      const title = getProductText(product, "title");
      const img = (product.images && (product.images.find((i) => i.isPrimary) || product.images[0])) || {};
      return `
      <div class="flex gap-3 py-4 border-b border-white/5" data-cart-line="${product.id}">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style="background:var(--navy-850)">
          <img src="${img.url || ""}" alt="${escapeHtml(title)}" class="w-full h-full object-contain p-1" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${escapeHtml(title)}</p>
          <p class="text-xs text-gold">${formatPrice(product.pricing.basePrice, product.pricing.currency)}</p>
          <div class="flex items-center gap-2 mt-2">
            <button type="button" class="cart-qty-btn" data-action="dec" data-id="${product.id}" aria-label="-">−</button>
            <span class="text-sm w-6 text-center" data-qty="${product.id}">${quantity}</span>
            <button type="button" class="cart-qty-btn" data-action="inc" data-id="${product.id}" aria-label="+">+</button>
            <button type="button" class="text-xs text-ink-500 hover:text-gold-soft ms-auto cart-remove-btn" data-id="${product.id}" data-i18n="cart_remove">${t("cart_remove")}</button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  const totals = await getCartTotals();

  if (footer) {
    footer.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <span class="text-ink-300" data-i18n="cart_subtotal">${t("cart_subtotal")}</span>
        <span class="text-gold font-semibold text-lg">${formatPrice(totals.subtotal, totals.currency)}</span>
      </div>
      <a href="/cart.html" class="btn-gold w-full mb-2" data-i18n="cart_checkout">${t("cart_checkout")}</a>
      <button type="button" id="cart-continue-shopping" class="btn-outline-gold w-full" data-i18n="cart_continue_shopping">${t("cart_continue_shopping")}</button>
    `;
    document.getElementById("cart-continue-shopping")?.addEventListener("click", closeCart);
  }

  wireCartLineEvents(body);
}

function wireCartLineEvents(root) {
  root.querySelectorAll(".cart-qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const current = getCartQuantityFor(id);
      setQuantity(id, action === "inc" ? current + 1 : current - 1);
    });
  });
  root.querySelectorAll(".cart-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => removeItem(btn.getAttribute("data-id")));
  });
}

export function openCart() {
  document.getElementById("cart-drawer")?.classList.add("open");
  document.getElementById("cart-overlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

export function closeCart() {
  document.getElementById("cart-drawer")?.classList.remove("open");
  document.getElementById("cart-overlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

export function toggleCart() {
  const drawer = document.getElementById("cart-drawer");
  if (drawer?.classList.contains("open")) closeCart();
  else openCart();
}

function showToast(message) {
  let toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    toastRoot.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center";
    document.body.appendChild(toastRoot);
  }
  const toast = document.createElement("div");
  toast.className = "toast glass-panel px-5 py-3 rounded-full text-sm text-gold-soft shadow-lg";
  toast.textContent = message;
  toastRoot.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

/** Wire global cart UI: header cart button, drawer close controls, add-to-cart events. */
export function initCartUI() {
  renderCart();

  document.getElementById("cart-toggle-btn")?.addEventListener("click", () => {
    toggleCart();
    renderCart();
  });
  document.getElementById("cart-close-btn")?.addEventListener("click", closeCart);
  document.getElementById("cart-overlay")?.addEventListener("click", closeCart);

  document.addEventListener("tracy:addtocart", (e) => {
    const product = e.detail?.product;
    if (!product) return;
    addItem(product.id, 1);
    showToast(t("toast_added_to_cart"));
    renderCart();
    openCart();
  });

  document.addEventListener("tracy:cartchange", () => renderCart());
  onLocaleChange(() => renderCart());
}

/**
 * Kick off Stripe Checkout: posts the cart line items + selected locale
 * to the create-checkout-session serverless function and redirects the
 * browser to the returned Stripe-hosted Checkout URL.
 */
export async function startCheckout({ email, locale } = {}) {
  const enriched = await getEnrichedCart();
  if (!enriched.length) return;

  const payload = {
    locale,
    email,
    items: enriched.map(({ product, quantity }) => ({
      productId: product.id,
      sku: product.sku,
      title: getProductText(product, "title"),
      priceId: product.stripePriceId || null,
      unitAmount: Math.round(product.pricing.basePrice * 100),
      currency: (product.pricing.currency || "USD").toLowerCase(),
      quantity,
      image: (product.images?.find((i) => i.isPrimary) || product.images?.[0])?.url,
    })),
    successUrl: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/cancel.html`,
  };

  const res = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Checkout session failed (${res.status})`);
  }

  const { url } = await res.json();
  if (url) window.location.href = url;
}

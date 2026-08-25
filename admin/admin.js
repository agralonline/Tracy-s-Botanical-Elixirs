/**
 * TRACY USA — Admin panel
 * ---------------------------------------------------------------------
 * Auth-gated single-page admin for managing products. The core workflow:
 *   1. Admin signs in with Firebase Auth (email/password).
 *   2. Admin fills out ONE English product form.
 *   3. Admin clicks "Translate & Save".
 *   4. This file POSTs the English payload + a Firebase ID token to
 *      functions/translate-and-save.js, which verifies the admin,
 *      calls the translation provider for all 23 non-English locales,
 *      and writes the complete 24-language product document straight
 *      to Firestore.
 *   5. This file re-fetches the product list to show the result.
 *
 * Requires Firebase to be configured (see /assets/js/firebase-config.js)
 * — the admin panel intentionally does NOT fall back to local seed data,
 * since it exists to manage live Firestore content.
 */

import { getFirebaseServices, isFirebaseConfigured } from "/assets/js/firebase-config.js";
import { CATEGORIES as SEED_CATEGORIES, SEED_PRODUCTS } from "/data/seed-products.js";
import { SEED_POSTS, bodyToHtml } from "/assets/js/blog.js";
import { SUPPORTED_LOCALES, LOCALE_NAMES } from "/assets/js/i18n.js";

const state = {
  services: null, user: null,
  products: [], editingId: null,
  categories: [], editingCategoryId: null,
  posts: [], editingPostId: null, editingPost: null, postsLoaded: false,
  orders: [], ordersLoaded: false,
  requests: [], requestsLoaded: false,
  settingsLoaded: false,
};

const $ = (id) => document.getElementById(id);

function showBanner(message, tone = "info") {
  const el = $("admin-status-banner");
  el.textContent = message;
  el.classList.remove("hidden");
  el.style.borderColor = tone === "error" ? "rgba(248,113,113,0.4)" : "rgba(212,175,55,0.3)";
  el.style.color = tone === "error" ? "#f87171" : "#E8C766";
}

async function init() {
  if (!isFirebaseConfigured()) {
    showBanner(
      "Firebase is not configured yet. Add your project's config to /assets/js/firebase-config.js (or set window.__TRACY_FIREBASE_CONFIG__) to enable the admin panel.",
      "error"
    );
    $("login-form").querySelector("button[type=submit]").disabled = true;
    return;
  }

  state.services = await getFirebaseServices();
  if (!state.services) {
    showBanner("Firebase failed to initialize. Check your config values and the browser console.", "error");
    return;
  }

  const { auth, authMod } = state.services;
  authMod.onAuthStateChanged(auth, async (user) => {
    state.user = user;
    if (user) {
      $("login-view").classList.add("hidden");
      $("dashboard-view").classList.remove("hidden");
      $("admin-user-chip").classList.remove("hidden");
      $("admin-user-chip").classList.add("flex");
      $("admin-user-email").textContent = user.email;
      await loadCategories();
      await loadProducts();
    } else {
      $("login-view").classList.remove("hidden");
      $("dashboard-view").classList.add("hidden");
      $("admin-user-chip").classList.add("hidden");
    }
  });
}

async function handleLogin(e) {
  e.preventDefault();
  const { auth, authMod } = state.services;
  const errorEl = $("login-error");
  errorEl.classList.add("hidden");
  try {
    await authMod.signInWithEmailAndPassword(auth, $("login-email").value, $("login-password").value);
  } catch (err) {
    errorEl.textContent = mapAuthError(err);
    errorEl.classList.remove("hidden");
  }
}

function mapAuthError(err) {
  const code = err?.code || "";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential")) {
    return "Incorrect email or password.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  return err.message || "Sign-in failed.";
}

async function handleLogout() {
  const { auth, authMod } = state.services;
  await authMod.signOut(auth);
}

async function loadProducts() {
  const { db, firestoreMod } = state.services;
  const { collection, getDocs, orderBy, query } = firestoreMod;
  const tbody = $("product-table-body");
  tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-ink-500">Loading…</td></tr>`;

  try {
    const snap = await getDocs(query(collection(db, "tracy_products"), orderBy("updatedAt", "desc")));
    state.products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Missing index or empty collection on a fresh project — fall back to unordered fetch.
    const { collection: col2, getDocs: getDocs2 } = firestoreMod;
    const snap = await getDocs2(col2(db, "tracy_products"));
    state.products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // The storefront reads Firestore first and only falls back to the bundled
  // SEED_PRODUCTS when tracy_products is completely EMPTY (see products.js).
  // That means the moment even one real product exists in Firestore, any
  // seed product that was never actually saved as a Firestore doc silently
  // stops showing on the storefront. Fill in only the gaps — any seed
  // product whose slug isn't already a real Firestore doc — so nothing an
  // admin already created/edited gets touched or duplicated.
  const existingSlugs = new Set(state.products.map((p) => p.slug).filter(Boolean));
  const missing = SEED_PRODUCTS.filter((p) => !existingSlugs.has(p.slug));
  if (missing.length) {
    await seedMissingProducts(missing);
    const snap2 = await getDocs(collection(db, "tracy_products"));
    state.products = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Admin-controlled display order (▲/▼ buttons) wins over recency whenever
  // it's been explicitly set; never-reordered products keep falling back to
  // most-recently-updated first, same as before.
  state.products.sort((a, b) => {
    const ao = typeof a.order === "number" ? a.order : Infinity;
    const bo = typeof b.order === "number" ? b.order : Infinity;
    if (ao !== bo) return ao - bo;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  renderProductTable();
}

/** Currently displayed (filtered) product list — the ▲/▼ buttons reorder within this view. */
function getFilteredProducts() {
  const categoryFilter = $("product-filter-category")?.value || "";
  const searchTerm = ($("product-filter-search")?.value || "").trim().toLowerCase();
  return state.products.filter((p) => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (!searchTerm) return true;
    const title = (p.translations?.en?.title || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();
    return title.includes(searchTerm) || sku.includes(searchTerm);
  });
}

/** Fill in any seed product that doesn't yet exist as a real Firestore doc (matched by slug). */
async function seedMissingProducts(missing) {
  const { db, firestoreMod } = state.services;
  try {
    await Promise.all(
      missing.map((p) =>
        firestoreMod.setDoc(firestoreMod.doc(db, "tracy_products", p.slug), {
          ...p,
          createdAt: firestoreMod.serverTimestamp(),
          updatedAt: firestoreMod.serverTimestamp(),
        })
      )
    );
  } catch (err) {
    console.warn("Could not seed missing products:", err);
  }
}

function renderProductTable() {
  const tbody = $("product-table-body");
  populateProductCategoryFilter();
  const filtered = getFilteredProducts();

  if (!state.products.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-ink-500">No products yet. Click "New Product" to add your first one.</td></tr>`;
    return;
  }
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-8 text-center text-ink-500">No products match this filter/search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((p, i) => {
      const title = p.translations?.en?.title || "(untitled)";
      const translatedCount = p.translations ? Object.keys(p.translations).length : 0;
      const img = (p.images && (p.images.find((i2) => i2.isPrimary) || p.images[0])) || {};
      return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
        <td class="p-4">
          <div class="flex flex-col gap-1">
            <button class="btn-ghost text-xs px-1.5 py-0.5" data-move-product-up="${p.id}" ${i === 0 ? "disabled style='opacity:.3'" : ""} title="Move up">▲</button>
            <button class="btn-ghost text-xs px-1.5 py-0.5" data-move-product-down="${p.id}" ${i === filtered.length - 1 ? "disabled style='opacity:.3'" : ""} title="Move down">▼</button>
          </div>
        </td>
        <td class="p-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-md overflow-hidden flex-shrink-0" style="background:var(--navy-850)">
            ${img.url ? `<img src="${img.url}" class="w-full h-full object-contain p-1" alt="" />` : ""}
          </div>
          <span class="font-medium">${escapeHtml(title)}</span>
        </td>
        <td class="p-4 text-ink-500">${escapeHtml(p.sku || "")}</td>
        <td class="p-4 text-ink-500">${escapeHtml(p.category || "")}</td>
        <td class="p-4">$${Number(p.pricing?.basePrice || 0).toFixed(2)}</td>
        <td class="p-4">
          <span class="chip ${translatedCount >= 24 ? "chip-gold" : ""}">${translatedCount}/24</span>
        </td>
        <td class="p-4 text-ink-500 capitalize">${escapeHtml(p.status || "draft")}</td>
        <td class="p-4 text-right whitespace-nowrap">
          <button class="btn-ghost text-xs mr-3" data-edit="${p.id}">Edit</button>
          <button class="btn-ghost text-xs text-red-400" data-delete="${p.id}">Delete</button>
        </td>
      </tr>`;
    })
    .join("");

  tbody.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openProductForm(state.products.find((p) => p.id === btn.getAttribute("data-edit"))));
  });
  tbody.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteProduct(btn.getAttribute("data-delete")));
  });
  tbody.querySelectorAll("[data-move-product-up]").forEach((btn) => {
    btn.addEventListener("click", () => moveProduct(btn.getAttribute("data-move-product-up"), "up"));
  });
  tbody.querySelectorAll("[data-move-product-down]").forEach((btn) => {
    btn.addEventListener("click", () => moveProduct(btn.getAttribute("data-move-product-down"), "down"));
  });
}

/** Fill the Category filter dropdown above the product table from the live category list. */
function populateProductCategoryFilter() {
  const select = $("product-filter-category");
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML =
    `<option value="">All categories</option>` +
    state.categories.map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name || c.slug)}</option>`).join("");
  select.value = previousValue;
}

/** Swap this product with its neighbor WITHIN THE CURRENT FILTERED VIEW and persist order across the full product list — this is how an admin controls which product shows first per category / on the homepage. */
async function moveProduct(id, direction) {
  const filtered = getFilteredProducts();
  const idx = filtered.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= filtered.length) return;

  // Swap the two products' order values directly (rather than reindexing the
  // whole list) so reordering inside a category filter doesn't disturb the
  // relative order of products in other categories.
  const a = filtered[idx];
  const b = filtered[swapIdx];
  const aOrder = typeof a.order === "number" ? a.order : state.products.indexOf(a);
  const bOrder = typeof b.order === "number" ? b.order : state.products.indexOf(b);
  a.order = bOrder;
  b.order = aOrder;

  state.products.sort((x, y) => {
    const xo = typeof x.order === "number" ? x.order : Infinity;
    const yo = typeof y.order === "number" ? y.order : Infinity;
    if (xo !== yo) return xo - yo;
    return String(y.updatedAt || "").localeCompare(String(x.updatedAt || ""));
  });
  renderProductTable();

  const { db, firestoreMod } = state.services;
  try {
    await Promise.all([
      firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_products", a.id), { order: a.order }),
      firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_products", b.id), { order: b.order }),
    ]);
  } catch (err) {
    console.error(err);
    showBanner(err.message || "Could not save the new order.", "error");
  }
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/* -----------------------------------------------------------------
 * Categories
 * Same translate-and-save pattern as products (see buildCategoryPayload /
 * postTranslateCategory below) — name + description are auto-translated
 * into all 24 languages via the trusted serverless function.
 * --------------------------------------------------------------- */

async function loadCategories() {
  const { db, firestoreMod } = state.services;
  const { collection, getDocs, orderBy, query } = firestoreMod;
  const tbody = $("category-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-ink-500">Loading…</td></tr>`;

  try {
    const snap = await getDocs(query(collection(db, "tracy_categories"), orderBy("createdAt", "asc")));
    state.categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const { collection: col2, getDocs: getDocs2 } = firestoreMod;
    const snap = await getDocs2(col2(db, "tracy_categories"));
    state.categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  // Admin-controlled display order (set via the ↑/↓ buttons below) wins over
  // creation order whenever it's been explicitly set; categories that have
  // never been reordered keep falling back to createdAt order.
  state.categories.sort((a, b) => {
    const ao = typeof a.order === "number" ? a.order : Infinity;
    const bo = typeof b.order === "number" ? b.order : Infinity;
    return ao - bo;
  });

  // The original 4 categories (Essential Oils, Serums, Skincare, Hair Care)
  // only ever existed as hardcoded fallback data for the storefront — they
  // were never actual saved records, so a brand-new tracy_categories
  // collection shows up empty here even though the storefront displays them
  // fine. The first time this admin panel finds the collection completely
  // empty, seed it with those 4 as real, editable/deletable records.
  if (!state.categories.length) {
    await seedDefaultCategories();
    const snap2 = await getDocs(collection(db, "tracy_categories"));
    state.categories = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  renderCategoryTable();
  populateCategorySelect();
}

/** One-time bootstrap: write the 4 built-in categories into Firestore as real records. */
async function seedDefaultCategories() {
  const { db, firestoreMod } = state.services;
  try {
    await Promise.all(
      SEED_CATEGORIES.map((cat) =>
        firestoreMod.setDoc(firestoreMod.doc(db, "tracy_categories", cat.slug), {
          name: cat.name,
          slug: cat.slug,
          description: cat.description || "",
          image: cat.image || "",
          createdAt: firestoreMod.serverTimestamp(),
          updatedAt: firestoreMod.serverTimestamp(),
        })
      )
    );
  } catch (err) {
    console.warn("Could not seed default categories:", err);
  }
}

function renderCategoryTable() {
  const tbody = $("category-table-body");
  if (!tbody) return;
  if (!state.categories.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-ink-500">No categories yet. Click "New Category" to add your first one.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.categories
    .map((c, i) => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
        <td class="p-4">
          <div class="flex flex-col gap-1">
            <button class="btn-ghost text-xs px-1.5 py-0.5" data-move-category-up="${c.id}" ${i === 0 ? "disabled style='opacity:.3'" : ""} title="Move up">▲</button>
            <button class="btn-ghost text-xs px-1.5 py-0.5" data-move-category-down="${c.id}" ${i === state.categories.length - 1 ? "disabled style='opacity:.3'" : ""} title="Move down">▼</button>
          </div>
        </td>
        <td class="p-4">
          <div class="w-12 h-12 rounded-md overflow-hidden flex-shrink-0" style="background:var(--navy-850)">
            ${c.image ? `<img src="${escapeHtml(c.image)}" class="w-full h-full object-cover" alt="" />` : ""}
          </div>
        </td>
        <td class="p-4 font-medium">${escapeHtml(c.name || "")}</td>
        <td class="p-4 text-ink-500">${escapeHtml(c.slug || "")}</td>
        <td class="p-4 text-ink-500 max-w-xs truncate">${escapeHtml(c.description || "")}</td>
        <td class="p-4 text-right whitespace-nowrap">
          <button class="btn-ghost text-xs mr-3" data-edit-category="${c.id}">Edit</button>
          <button class="btn-ghost text-xs text-red-400" data-delete-category="${c.id}">Delete</button>
        </td>
      </tr>`)
    .join("");

  tbody.querySelectorAll("[data-edit-category]").forEach((btn) => {
    btn.addEventListener("click", () => openCategoryForm(state.categories.find((c) => c.id === btn.getAttribute("data-edit-category"))));
  });
  tbody.querySelectorAll("[data-delete-category]").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(btn.getAttribute("data-delete-category")));
  });
  tbody.querySelectorAll("[data-move-category-up]").forEach((btn) => {
    btn.addEventListener("click", () => moveCategory(btn.getAttribute("data-move-category-up"), "up"));
  });
  tbody.querySelectorAll("[data-move-category-down]").forEach((btn) => {
    btn.addEventListener("click", () => moveCategory(btn.getAttribute("data-move-category-down"), "down"));
  });
}

/** Swap this category with its neighbor and persist the whole list's display order (the small ▲/▼ buttons in the table — this is how an admin controls which category shows first on the homepage/shop page). */
async function moveCategory(id, direction) {
  const idx = state.categories.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= state.categories.length) return;

  [state.categories[idx], state.categories[swapIdx]] = [state.categories[swapIdx], state.categories[idx]];
  state.categories.forEach((c, i) => (c.order = i));
  renderCategoryTable();

  const { db, firestoreMod } = state.services;
  try {
    await Promise.all(
      state.categories.map((c) => firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_categories", c.id), { order: c.order }))
    );
  } catch (err) {
    console.error(err);
    showBanner(err.message || "Could not save the new order.", "error");
  }
}

/** Keep the product form's Category dropdown in sync with the live category list. */
function populateCategorySelect() {
  const select = $("pf-category");
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = state.categories.map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name || c.slug)}</option>`).join("");
  if (state.categories.some((c) => c.slug === previousValue)) select.value = previousValue;
}

async function deleteCategory(id) {
  if (!confirm("Delete this category? Products already assigned to it will keep their category value, but it will no longer appear as a filter or tile until reassigned.")) return;
  const { db, firestoreMod } = state.services;
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "tracy_categories", id));
  showBanner("Category deleted.");
  await loadCategories();
}

function openCategoryForm(category = null) {
  state.editingCategoryId = category?.id || null;
  $("category-modal-title").textContent = category ? "Edit Category" : "New Category";
  $("category-status").textContent = "";

  $("cf-id").value = category?.id || "";
  $("cf-name").value = category?.name || "";
  $("cf-slug").value = category?.slug || "";
  $("cf-description").value = category?.description || "";
  $("cf-image-url").value = category?.image || "";
  $("cf-image-file").value = "";

  const isEditing = !!category;
  document.querySelectorAll(".category-field-translate-btn").forEach((btn) => btn.classList.toggle("hidden", !isEditing));
  $("category-save-btn").textContent = isEditing ? "Save" : "Translate & Save";

  $("category-modal-overlay").classList.remove("hidden");
  $("category-modal-overlay").classList.add("flex");
  const panel = $("category-modal-panel");
  if (panel) panel.scrollTop = 0;
}

function categoryFormHasUnsavedInput() {
  const textFields = ["cf-name", "cf-slug", "cf-description", "cf-image-url"];
  if (textFields.some((id) => $(id) && $(id).value.trim())) return true;
  if ($("cf-image-file")?.files?.length) return true;
  return false;
}

function closeCategoryForm({ skipConfirm = false } = {}) {
  if (!skipConfirm && categoryFormHasUnsavedInput()) {
    const ok = window.confirm("Discard this category? What you've typed hasn't been saved yet.");
    if (!ok) return;
  }
  $("category-modal-overlay").classList.add("hidden");
  $("category-modal-overlay").classList.remove("flex");
}

async function uploadCategoryImageIfNeeded() {
  const file = $("cf-image-file").files?.[0];
  const manualUrl = $("cf-image-url").value.trim();
  if (!file) return manualUrl || null;

  const { storage, storageMod } = state.services;
  const path = `category-images/${Date.now()}-${file.name}`;
  const storageRef = storageMod.ref(storage, path);
  await storageMod.uploadBytes(storageRef, file);
  return storageMod.getDownloadURL(storageRef);
}

async function buildCategoryPayload() {
  const imageUrl = await uploadCategoryImageIfNeeded();
  return {
    id: $("cf-id").value || null,
    slug: $("cf-slug").value.trim() || slugify($("cf-name").value),
    image: imageUrl || "",
    sourceText: {
      name: $("cf-name").value.trim(),
      description: $("cf-description").value.trim(),
    },
  };
}

async function postTranslateCategory(payload) {
  const idToken = await state.user.getIdToken();
  const res = await fetch("/api/translate-category", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Server responded ${res.status}`);
  }
  return res.json();
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const btn = $("category-save-btn");
  const statusEl = $("category-status");
  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Uploading image…";

  try {
    const isEditing = !!$("cf-id").value;
    const payload = await buildCategoryPayload();
    if (isEditing) payload.translateFields = []; // plain save — leave existing translations untouched
    statusEl.textContent = isEditing ? "Saving…" : "Translating into 24 languages…";
    const saved = await postTranslateCategory(payload);

    statusEl.textContent = "Saved.";
    showBanner(isEditing ? `"${saved.name}" category saved.` : `"${saved.name}" category saved and translated into 24 languages.`);
    await loadCategories();
    setTimeout(() => closeCategoryForm({ skipConfirm: true }), 500);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Saving the category failed.", "error");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

/** Small per-field "🌐 Translate this field" button for the category form — same pattern as products. */
async function handleCategoryFieldTranslate(field, btn) {
  const statusEl = $("category-status");
  const categoryId = $("cf-id").value;
  if (!categoryId) return;

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Translating…";
  statusEl.textContent = "Translating just this field into 24 languages…";

  try {
    const payload = await buildCategoryPayload();
    payload.translateFields = [field];
    await postTranslateCategory(payload);
    statusEl.textContent = "Saved.";
    showBanner(`"${field}" re-translated into 24 languages.`);
    await loadCategories();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Translate failed.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

const TABS = ["products", "categories", "blog", "orders", "requests", "settings"];

function switchTab(tab) {
  TABS.forEach((name) => {
    $(`${name}-panel`).classList.toggle("hidden", name !== tab);
    $(`tab-${name}-btn`).classList.toggle("admin-tab-active", name === tab);
  });
  if (tab === "blog" && !state.postsLoaded) loadPosts();
  if (tab === "orders" && !state.ordersLoaded) loadOrders();
  if (tab === "requests" && !state.requestsLoaded) loadRequests();
  if (tab === "settings" && !state.settingsLoaded) loadSettings();
}

/* -----------------------------------------------------------------
 * Blog / Journal posts — English-only, same policy as before, just
 * now editable from here instead of hand-edited into blog.html.
 * --------------------------------------------------------------- */

async function loadPosts() {
  const { db, firestoreMod } = state.services;
  const { collection, getDocs, orderBy, query } = firestoreMod;
  const tbody = $("post-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-ink-500">Loading…</td></tr>`;

  try {
    const snap = await getDocs(query(collection(db, "tracy_blogPosts"), orderBy("publishedAt", "desc")));
    state.posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const { collection: col2, getDocs: getDocs2 } = firestoreMod;
    const snap = await getDocs2(col2(db, "tracy_blogPosts"));
    state.posts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  // Same gap-filling as products/categories: the Journal's launch posts only
  // ever existed as bundled SEED_POSTS fallback data, never as real
  // Firestore docs, so a fresh tracy_blogPosts collection shows empty here
  // even though the storefront displays all of them fine from the fallback.
  const existingIds = new Set(state.posts.map((p) => p.id).filter(Boolean));
  const missingPosts = SEED_POSTS.filter((p) => !existingIds.has(p.id));
  if (missingPosts.length) {
    await seedMissingPosts(missingPosts);
    const snap2 = await getDocs(collection(db, "tracy_blogPosts"));
    state.posts = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  state.postsLoaded = true;
  renderPostTable();
}

/** Fill in any seed Journal post that doesn't yet exist as a real Firestore doc. */
async function seedMissingPosts(missing) {
  const { db, firestoreMod } = state.services;
  try {
    await Promise.all(
      missing.map(({ id, ...post }) =>
        firestoreMod.setDoc(firestoreMod.doc(db, "tracy_blogPosts", id), {
          ...post,
          createdAt: firestoreMod.serverTimestamp(),
          updatedAt: firestoreMod.serverTimestamp(),
        })
      )
    );
  } catch (err) {
    console.warn("Could not seed missing blog posts:", err);
  }
}

function formatDateShort(value) {
  if (!value) return "";
  const ms = typeof value.toMillis === "function" ? value.toMillis() : typeof value.seconds === "number" ? value.seconds * 1000 : new Date(value).getTime();
  if (!ms || Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleDateString();
}

function renderPostTable() {
  const tbody = $("post-table-body");
  if (!tbody) return;
  if (!state.posts.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-ink-500">No posts yet. Click "New Post" to write your first one.</td></tr>`;
    return;
  }
  tbody.innerHTML = state.posts
    .map((p) => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
        <td class="p-4 font-medium">${escapeHtml(p.title || "")}</td>
        <td class="p-4 text-ink-500">${escapeHtml(p.category || "")}</td>
        <td class="p-4 text-ink-500 capitalize">${escapeHtml(p.status || "draft")}</td>
        <td class="p-4 text-ink-500">${formatDateShort(p.publishedAt)}</td>
        <td class="p-4 text-right whitespace-nowrap">
          <button class="btn-ghost text-xs mr-3" data-edit-post="${p.id}">Edit</button>
          <button class="btn-ghost text-xs text-red-400" data-delete-post="${p.id}">Delete</button>
        </td>
      </tr>`)
    .join("");

  tbody.querySelectorAll("[data-edit-post]").forEach((btn) => {
    btn.addEventListener("click", () => openPostForm(state.posts.find((p) => p.id === btn.getAttribute("data-edit-post"))));
  });
  tbody.querySelectorAll("[data-delete-post]").forEach((btn) => {
    btn.addEventListener("click", () => deletePost(btn.getAttribute("data-delete-post")));
  });
}

async function deletePost(id) {
  if (!confirm("Delete this post? This cannot be undone.")) return;
  const { db, firestoreMod } = state.services;
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "tracy_blogPosts", id));
  showBanner("Post deleted.");
  await loadPosts();
}

function openPostForm(post = null) {
  state.editingPostId = post?.id || null;
  state.editingPost = post || null;
  $("post-modal-title").textContent = post ? "Edit Post" : "New Post";
  $("post-status-msg").textContent = "";
  $("pof-id").value = post?.id || "";
  $("pof-title").value = post?.title || "";
  $("pof-category").value = post?.category || "";
  $("pof-body").value = post?.body || "";
  $("pof-status").value = post?.status || "published";
  $("pof-slug").value = post?.slug || "";
  $("pof-seo-title").value = post?.seoTitle || "";
  $("pof-meta-description").value = post?.metaDescription || "";
  $("pof-body-preview").classList.add("hidden");
  $("pof-preview-toggle").textContent = "Preview";

  // Translations only make sense once a post is actually saved (needs an id
  // to attach translations to) — hidden for a brand-new, not-yet-saved post.
  $("pof-translations-section").classList.toggle("hidden", !post);
  if (post) populatePostTranslationLocaleSelect();

  updateSeoScore();
  $("post-modal-overlay").classList.remove("hidden");
  $("post-modal-overlay").classList.add("flex");
  const panel = $("post-modal-panel");
  if (panel) panel.scrollTop = 0;
}

function postFormHasUnsavedInput() {
  return ["pof-title", "pof-category", "pof-body", "pof-seo-title", "pof-meta-description"].some((id) => $(id) && $(id).value.trim());
}

/** Simple, real (not a stub) on-page SEO checklist — updates live as the admin types. */
function computeSeoScore() {
  const title = $("pof-title").value.trim();
  const seoTitle = $("pof-seo-title").value.trim() || title;
  const meta = $("pof-meta-description").value.trim();
  const body = $("pof-body").value;
  const slug = $("pof-slug").value.trim();

  let score = 0;
  const tips = [];

  if (seoTitle.length >= 30 && seoTitle.length <= 60) score += 25;
  else tips.push(`SEO title should be 30–60 characters (currently ${seoTitle.length}).`);

  if (meta.length >= 120 && meta.length <= 160) score += 25;
  else tips.push(`Meta description should be 120–160 characters (currently ${meta.length}).`);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount >= 300) score += 25;
  else tips.push(`Body is ${wordCount} words — aim for 300+ words for better SEO.`);

  if (/^\*\*.+?\*\*/m.test(body)) score += 15;
  else tips.push("Add at least one **bold** lead-in at the start of a paragraph — it becomes a colored sub-heading readers (and search engines) can scan.");

  if (slug && /^[a-z0-9-]+$/.test(slug) && slug.length <= 60) score += 10;
  else tips.push("Slug should be lowercase letters, numbers, and hyphens only, under 60 characters.");

  return { score, tips };
}

function updateSeoScore() {
  const { score, tips } = computeSeoScore();
  const color = score >= 80 ? "#5fae82" : score >= 50 ? "#E8C766" : "#d16a6a";
  const label = score >= 80 ? "Good" : score >= 50 ? "Needs work" : "Poor";
  $("pof-seo-score").innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <span class="eyebrow">SEO Score</span>
      <span style="color:${color};font-weight:600;">${score}/100 · ${label}</span>
    </div>
    ${tips.length ? `<ul class="text-ink-500" style="list-style:disc;padding-left:1.1rem;">${tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>` : `<p class="text-ink-500">All checks pass.</p>`}
  `;
  $("pof-seo-title-count").textContent = $("pof-seo-title").value.trim() ? `(${$("pof-seo-title").value.trim().length} chars)` : "";
  $("pof-meta-desc-count").textContent = $("pof-meta-description").value.trim() ? `(${$("pof-meta-description").value.trim().length} chars)` : "";
}

function closePostForm({ skipConfirm = false } = {}) {
  if (!skipConfirm && postFormHasUnsavedInput()) {
    const ok = window.confirm("Discard this post? What you've typed hasn't been saved yet.");
    if (!ok) return;
  }
  $("post-modal-overlay").classList.add("hidden");
  $("post-modal-overlay").classList.remove("flex");
}

async function handleSavePost(e) {
  e.preventDefault();
  const btn = $("post-save-btn");
  const statusEl = $("post-status-msg");
  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Saving…";

  try {
    const { db, firestoreMod } = state.services;
    const editingId = $("pof-id").value || null;
    const data = {
      title: $("pof-title").value.trim(),
      category: $("pof-category").value.trim(),
      body: $("pof-body").value.trim(),
      status: $("pof-status").value,
      slug: $("pof-slug").value.trim() || slugify($("pof-title").value),
      seoTitle: $("pof-seo-title").value.trim(),
      metaDescription: $("pof-meta-description").value.trim(),
      updatedAt: firestoreMod.serverTimestamp(),
    };

    if (editingId) {
      await firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_blogPosts", editingId), data);
    } else {
      data.publishedAt = firestoreMod.serverTimestamp();
      data.createdAt = firestoreMod.serverTimestamp();
      await firestoreMod.addDoc(firestoreMod.collection(db, "tracy_blogPosts"), data);
    }

    statusEl.textContent = "Saved.";
    showBanner(`"${data.title}" saved.`);
    await loadPosts();
    setTimeout(() => closePostForm({ skipConfirm: true }), 500);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Saving the post failed.", "error");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

/* -----------------------------------------------------------------
 * Blog post Translations — manual, per-language, unlike products/
 * categories. The admin picks ONE language at a time (never all 24 at
 * once — a full article is too long/expensive to blanket-translate and
 * get right), can auto-translate just the short Title/SEO fields for
 * that language via the server, and pastes their own translation of the
 * body. Saved into post.translations[locale] directly from the client,
 * same as categories' plain fields — no server round-trip needed since
 * nothing here is computed beyond the optional short-field translate.
 * --------------------------------------------------------------- */

function populatePostTranslationLocaleSelect() {
  const select = $("pof-tr-locale");
  select.innerHTML = SUPPORTED_LOCALES.filter((l) => l !== "en")
    .map((code) => `<option value="${code}">${LOCALE_NAMES[code] || code}</option>`)
    .join("");
  loadPostTranslationIntoForm();
}

/** Fill the Translations sub-form with whatever this post already has saved for the selected language (blank if none yet). */
function loadPostTranslationIntoForm() {
  const locale = $("pof-tr-locale").value;
  const existing = state.editingPost?.translations?.[locale] || {};
  $("pof-tr-title").value = existing.title || "";
  $("pof-tr-seo-title").value = existing.seoTitle || "";
  $("pof-tr-meta-description").value = existing.metaDescription || "";
  $("pof-tr-body").value = existing.body || "";
  $("pof-tr-status").textContent = "";
}

/** 🌐 Auto-translate ONLY the short fields (Title/SEO Title/Meta Description) into the ONE selected language — never the body, which the admin pastes in manually. */
async function handleBlogFieldAutoTranslate() {
  const btn = $("pof-tr-autotranslate-btn");
  const statusEl = $("pof-tr-status");
  const locale = $("pof-tr-locale").value;
  const title = $("pof-title").value.trim();
  if (!title) {
    showBanner("Write the English Title first.", "error");
    return;
  }

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Translating…";
  statusEl.textContent = `Translating into ${LOCALE_NAMES[locale] || locale}…`;

  try {
    const idToken = await state.user.getIdToken();
    const res = await fetch("/api/translate-blog-field", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        locale,
        sourceText: {
          title,
          seoTitle: $("pof-seo-title").value.trim() || title,
          metaDescription: $("pof-meta-description").value.trim(),
        },
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded ${res.status}`);
    }
    const translated = await res.json();
    $("pof-tr-title").value = translated.title || "";
    $("pof-tr-seo-title").value = translated.seoTitle || "";
    $("pof-tr-meta-description").value = translated.metaDescription || "";
    statusEl.textContent = "Translated — review below, then paste in the body and Save This Language.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Translate failed.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function handleSavePostTranslation() {
  const btn = $("pof-tr-save-btn");
  const statusEl = $("pof-tr-status");
  const postId = $("pof-id").value;
  const locale = $("pof-tr-locale").value;
  if (!postId) return;

  btn.disabled = true;
  statusEl.textContent = "Saving…";
  try {
    const { db, firestoreMod } = state.services;
    const translationData = {
      title: $("pof-tr-title").value.trim(),
      seoTitle: $("pof-tr-seo-title").value.trim(),
      metaDescription: $("pof-tr-meta-description").value.trim(),
      body: $("pof-tr-body").value.trim(),
    };
    await firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_blogPosts", postId), {
      [`translations.${locale}`]: translationData,
      updatedAt: firestoreMod.serverTimestamp(),
    });
    // Keep the in-memory copy in sync so switching languages in this same
    // session shows what was just saved.
    state.editingPost = state.editingPost || {};
    state.editingPost.translations = { ...(state.editingPost.translations || {}), [locale]: translationData };
    statusEl.textContent = "Saved.";
    showBanner(`${LOCALE_NAMES[locale] || locale} translation saved.`);
    await loadPosts();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Saving the translation failed.", "error");
  } finally {
    btn.disabled = false;
  }
}

/* -----------------------------------------------------------------
 * Blog export/import — a full JSON backup of every post (all fields,
 * including translations), downloadable and re-importable. This is the
 * "so at least you have a backup if anything ever goes wrong" safety net.
 * --------------------------------------------------------------- */

function handleExportPosts() {
  const payload = JSON.stringify(state.posts, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tracy-blog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showBanner(`Exported ${state.posts.length} post(s).`);
}

async function handleImportPosts(e) {
  const file = e.target.files?.[0];
  e.target.value = ""; // allow re-selecting the same file later
  if (!file) return;

  try {
    const text = await file.text();
    const posts = JSON.parse(text);
    if (!Array.isArray(posts)) throw new Error("Backup file must contain a JSON array of posts.");

    const ok = window.confirm(`Import ${posts.length} post(s)? Posts with a matching id will be overwritten; others will be added.`);
    if (!ok) return;

    const { db, firestoreMod } = state.services;
    await Promise.all(
      posts.map(({ id, ...post }) => {
        if (!id) return Promise.resolve();
        return firestoreMod.setDoc(firestoreMod.doc(db, "tracy_blogPosts", id), { ...post, updatedAt: firestoreMod.serverTimestamp() }, { merge: true });
      })
    );
    showBanner(`Imported ${posts.length} post(s).`);
    await loadPosts();
  } catch (err) {
    console.error(err);
    showBanner(err.message || "Import failed — check the file is a valid backup JSON.", "error");
  }
}

/* -----------------------------------------------------------------
 * Orders — read-only view of tracy_orders, written by the Stripe
 * webhook. This doubles as the customer database (email + shipping
 * address per order).
 * --------------------------------------------------------------- */

async function loadOrders() {
  const { db, firestoreMod } = state.services;
  const { collection, getDocs, orderBy, query } = firestoreMod;
  const tbody = $("order-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-ink-500">Loading…</td></tr>`;

  try {
    const snap = await getDocs(query(collection(db, "tracy_orders"), orderBy("createdAt", "desc")));
    state.orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const { collection: col2, getDocs: getDocs2 } = firestoreMod;
    const snap = await getDocs2(col2(db, "tracy_orders"));
    state.orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  state.ordersLoaded = true;
  renderOrderTable();
}

function formatMoney(cents, currency = "usd") {
  if (typeof cents !== "number") return "";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch (e) {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function renderOrderTable() {
  const tbody = $("order-table-body");
  if (!tbody) return;
  if (!state.orders.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-ink-500">No orders yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = state.orders
    .map((o) => {
      const addr = o.shippingAddress;
      const addrText = addr ? [addr.name, addr.line1, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(", ") : "";
      const itemsText = (o.lineItems || []).map((li) => `${li.quantity}× ${li.description}`).join(", ");
      return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
        <td class="p-4 text-ink-500 whitespace-nowrap">${formatDateShort(o.createdAt)}</td>
        <td class="p-4">${escapeHtml(o.customerEmail || "")}</td>
        <td class="p-4 text-ink-500 max-w-xs">${escapeHtml(itemsText)}</td>
        <td class="p-4">${formatMoney(o.amountTotal, o.currency)}</td>
        <td class="p-4 text-ink-500 max-w-xs">${escapeHtml(addrText)}</td>
        <td class="p-4 text-ink-500 capitalize">${escapeHtml(o.status || "paid")}</td>
      </tr>`;
    })
    .join("");
}

/* -----------------------------------------------------------------
 * Return / refund requests — submitted from the storefront's
 * return-request.html form (tracy_refundRequests, client create-only).
 * --------------------------------------------------------------- */

async function loadRequests() {
  const { db, firestoreMod } = state.services;
  const { collection, getDocs, orderBy, query } = firestoreMod;
  const tbody = $("request-table-body");
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-ink-500">Loading…</td></tr>`;

  try {
    const snap = await getDocs(query(collection(db, "tracy_refundRequests"), orderBy("createdAt", "desc")));
    state.requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    const { collection: col2, getDocs: getDocs2 } = firestoreMod;
    const snap = await getDocs2(col2(db, "tracy_refundRequests"));
    state.requests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  state.requestsLoaded = true;
  renderRequestTable();
}

function renderRequestTable() {
  const tbody = $("request-table-body");
  if (!tbody) return;
  if (!state.requests.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-ink-500">No return/refund requests yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = state.requests
    .map((r) => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
        <td class="p-4 text-ink-500 whitespace-nowrap">${formatDateShort(r.createdAt)}</td>
        <td class="p-4">${escapeHtml(r.email || "")}</td>
        <td class="p-4 text-ink-500">${escapeHtml(r.orderReference || "")}</td>
        <td class="p-4 text-ink-500 max-w-xs">${escapeHtml(r.reason || "")}</td>
        <td class="p-4 text-ink-500 capitalize">${escapeHtml(r.status || "new")}</td>
        <td class="p-4 text-right whitespace-nowrap">
          ${r.status !== "resolved" ? `<button class="btn-ghost text-xs mr-3" data-resolve-request="${r.id}">Mark Resolved</button>` : ""}
          <button class="btn-ghost text-xs text-red-400" data-delete-request="${r.id}">Delete</button>
        </td>
      </tr>`)
    .join("");

  tbody.querySelectorAll("[data-resolve-request]").forEach((btn) => {
    btn.addEventListener("click", () => resolveRequest(btn.getAttribute("data-resolve-request")));
  });
  tbody.querySelectorAll("[data-delete-request]").forEach((btn) => {
    btn.addEventListener("click", () => deleteRequest(btn.getAttribute("data-delete-request")));
  });
}

async function resolveRequest(id) {
  const { db, firestoreMod } = state.services;
  await firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_refundRequests", id), { status: "resolved" });
  await loadRequests();
}

async function deleteRequest(id) {
  if (!confirm("Delete this request? This cannot be undone.")) return;
  const { db, firestoreMod } = state.services;
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "tracy_refundRequests", id));
  await loadRequests();
}

/* -----------------------------------------------------------------
 * Settings — a single tracy_settings/site doc (announcement bar,
 * social links, free-shipping threshold).
 * --------------------------------------------------------------- */

async function loadSettings() {
  const { db, firestoreMod } = state.services;
  const statusEl = $("settings-status");
  if (statusEl) statusEl.textContent = "Loading…";

  let data = {};
  try {
    const snap = await firestoreMod.getDoc(firestoreMod.doc(db, "tracy_settings", "site"));
    if (snap.exists()) data = snap.data();
  } catch (err) {
    console.warn("Could not load settings:", err);
  }

  $("sf-announcement-enabled").checked = !!data.announcementEnabled;
  $("sf-announcement-text").value = data.announcementText || "";
  $("sf-free-shipping").value = typeof data.freeShippingThresholdCents === "number" ? (data.freeShippingThresholdCents / 100) : 75;
  $("sf-social-instagram").value = data.social?.instagram || "";
  $("sf-social-facebook").value = data.social?.facebook || "";
  $("sf-social-tiktok").value = data.social?.tiktok || "";
  $("sf-social-pinterest").value = data.social?.pinterest || "";

  state.settingsLoaded = true;
  if (statusEl) statusEl.textContent = "";
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const btn = $("settings-save-btn");
  const statusEl = $("settings-status");
  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Saving…";

  try {
    const { db, firestoreMod } = state.services;
    const data = {
      announcementEnabled: $("sf-announcement-enabled").checked,
      announcementText: $("sf-announcement-text").value.trim(),
      freeShippingThresholdCents: Math.round(Number($("sf-free-shipping").value || 75) * 100),
      social: {
        instagram: $("sf-social-instagram").value.trim(),
        facebook: $("sf-social-facebook").value.trim(),
        tiktok: $("sf-social-tiktok").value.trim(),
        pinterest: $("sf-social-pinterest").value.trim(),
      },
      updatedAt: firestoreMod.serverTimestamp(),
    };
    await firestoreMod.setDoc(firestoreMod.doc(db, "tracy_settings", "site"), data, { merge: true });
    statusEl.textContent = "Saved.";
    showBanner("Settings saved.");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Saving settings failed.", "error");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

/** "🌐 Translate this field" for the announcement bar text — translates + saves just that one field into all 24 languages via a server call, independent of the rest of Save Settings. */
async function handleAnnouncementTranslate() {
  const btn = $("sf-announcement-translate-btn");
  const statusEl = $("settings-status");
  const text = $("sf-announcement-text").value.trim();
  if (!text) return;

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Translating…";
  statusEl.textContent = "Translating announcement into 24 languages…";

  try {
    const idToken = await state.user.getIdToken();
    const res = await fetch("/api/translate-announcement", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded ${res.status}`);
    }
    statusEl.textContent = "Saved.";
    showBanner("Announcement text translated into 24 languages.");
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Translate failed.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteProduct(id) {
  if (!confirm("Delete this product? This cannot be undone.")) return;
  const { db, firestoreMod } = state.services;
  await firestoreMod.deleteDoc(firestoreMod.doc(db, "tracy_products", id));
  showBanner("Product deleted.");
  await loadProducts();
}

function openProductForm(product = null) {
  state.editingId = product?.id || null;
  $("product-modal-title").textContent = product ? "Edit Product" : "New Product";
  $("translate-status").textContent = "";

  $("pf-id").value = product?.id || "";
  $("pf-title").value = product?.translations?.en?.title || "";
  $("pf-short").value = product?.translations?.en?.shortDescription || "";
  $("pf-desc").value = product?.translations?.en?.description || "";
  $("pf-sku").value = product?.sku || "";
  $("pf-slug").value = product?.slug || "";
  $("pf-category").value = product?.category || "essential-oils";
  $("pf-status").value = product?.status || "active";
  $("pf-price").value = product?.pricing?.basePrice ?? "";
  $("pf-compare-price").value = product?.pricing?.compareAtPrice ?? "";
  $("pf-volume").value = product?.attributes?.volumeMl ?? "";
  $("pf-quantity").value = product?.inventory?.quantity ?? "";
  $("pf-ingredients").value = (product?.attributes?.ingredients || []).join(", ");
  $("pf-image-url").value = (product?.images && (product.images.find((i) => i.isPrimary) || product.images[0])?.url) || "";
  $("pf-image-file").value = "";
  $("pf-image-gallery").value = (product?.images || []).filter((img) => !img.isPrimary).map((img) => img.url).join("\n");
  $("pf-organic").checked = !!product?.attributes?.organic;
  $("pf-vegan").checked = !!product?.attributes?.vegan;
  $("pf-cruelty-free").checked = !!product?.attributes?.crueltyFree;
  $("pf-featured").checked = !!product?.featured;

  // The three small per-field "🌐 Translate this field" buttons (and the
  // note explaining them) only make sense once a product already has
  // translations to selectively preserve — hide them for a brand-new
  // product, where the main button always translates all three fields.
  const isEditing = !!product;
  document.querySelectorAll(".field-translate-btn").forEach((btn) => btn.classList.toggle("hidden", !isEditing));
  $("pf-field-translate-note")?.classList.toggle("hidden", !isEditing);
  $("translate-save-btn").textContent = isEditing ? "Save" : "Translate & Save";

  $("product-modal-overlay").classList.remove("hidden");
  $("product-modal-overlay").classList.add("flex");
  // Always start scrolled to the top of the form (Title field), regardless
  // of where a previous open of this modal was left scrolled to.
  const panel = $("product-modal-panel");
  if (panel) panel.scrollTop = 0;
}

/** True if any field in the New/Edit Product form has user-entered content. */
function productFormHasUnsavedInput() {
  const textFields = ["pf-title", "pf-short", "pf-desc", "pf-sku", "pf-slug", "pf-price", "pf-compare-price", "pf-volume", "pf-quantity", "pf-ingredients", "pf-image-url", "pf-image-gallery"];
  if (textFields.some((id) => $(id) && $(id).value.trim())) return true;
  if ($("pf-image-file")?.files?.length) return true;
  return false;
}

function closeProductForm({ skipConfirm = false } = {}) {
  if (!skipConfirm && productFormHasUnsavedInput()) {
    const ok = window.confirm("Discard this product? What you've typed hasn't been saved yet.");
    if (!ok) return;
  }
  $("product-modal-overlay").classList.add("hidden");
  $("product-modal-overlay").classList.remove("flex");
}

async function uploadImageIfNeeded() {
  const file = $("pf-image-file").files?.[0];
  const manualUrl = $("pf-image-url").value.trim();
  if (!file) return manualUrl || null;

  const { storage, storageMod } = state.services;
  const path = `product-images/${Date.now()}-${file.name}`;
  const storageRef = storageMod.ref(storage, path);
  await storageMod.uploadBytes(storageRef, file);
  return storageMod.getDownloadURL(storageRef);
}

/** Build the request payload shared by the full Save and the per-field Translate buttons. */
async function buildProductPayload() {
  const imageUrl = await uploadImageIfNeeded();
  return {
    id: $("pf-id").value || null,
    sku: $("pf-sku").value.trim(),
    slug: $("pf-slug").value.trim() || slugify($("pf-title").value),
    category: $("pf-category").value,
    status: $("pf-status").value,
    featured: $("pf-featured").checked,
    pricing: {
      currency: "USD",
      basePrice: parseFloat($("pf-price").value || "0"),
      compareAtPrice: $("pf-compare-price").value ? parseFloat($("pf-compare-price").value) : null,
    },
    images: [
      ...(imageUrl ? [{ url: imageUrl, isPrimary: true }] : []),
      ...$("pf-image-gallery")
        .value.split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url, isPrimary: false })),
    ],
    attributes: {
      volumeMl: $("pf-volume").value ? Number($("pf-volume").value) : null,
      ingredients: $("pf-ingredients").value.split(",").map((s) => s.trim()).filter(Boolean),
      organic: $("pf-organic").checked,
      vegan: $("pf-vegan").checked,
      crueltyFree: $("pf-cruelty-free").checked,
    },
    inventory: {
      trackInventory: true,
      quantity: $("pf-quantity").value ? Number($("pf-quantity").value) : 0,
      allowBackorder: false,
    },
    sourceText: {
      title: $("pf-title").value.trim(),
      shortDescription: $("pf-short").value.trim(),
      description: $("pf-desc").value.trim(),
      ingredients: $("pf-ingredients").value.trim(),
    },
  };
}

async function postTranslateAndSave(payload) {
  const idToken = await state.user.getIdToken();
  const res = await fetch("/api/translate-and-save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `Server responded ${res.status}`);
  }
  return res.json();
}

/** Main form submit — full Save when editing (translateFields: [], touches nothing translation-wise), full translate on first creation. */
/** Warn (not block) when the SKU or slug being saved already belongs to a different product — catches accidental duplicate entries before they're written. */
function findDuplicateProduct({ sku, slug, excludeId }) {
  return state.products.find(
    (p) => p.id !== excludeId && ((sku && p.sku?.toLowerCase() === sku.toLowerCase()) || (slug && p.slug === slug))
  );
}

async function handleTranslateAndSave(e) {
  e.preventDefault();
  const btn = $("translate-save-btn");
  const statusEl = $("translate-status");
  const isEditing = !!$("pf-id").value;

  const dupe = findDuplicateProduct({ sku: $("pf-sku").value.trim(), slug: $("pf-slug").value.trim(), excludeId: $("pf-id").value || null });
  if (dupe) {
    const ok = window.confirm(`A product with this SKU or slug already exists: "${dupe.translations?.en?.title || dupe.sku}". Save anyway?`);
    if (!ok) return;
  }

  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Uploading image…";

  try {
    const payload = await buildProductPayload();
    if (isEditing) payload.translateFields = []; // plain save — leave existing translations untouched

    statusEl.textContent = isEditing ? "Saving…" : "Translating into 24 languages…";
    const saved = await postTranslateAndSave(payload);

    statusEl.textContent = isEditing ? "Saved." : `Saved — ${Object.keys(saved.translations || {}).length}/24 languages translated.`;
    showBanner(isEditing ? `"${saved.translations?.en?.title}" saved.` : `"${saved.translations?.en?.title}" saved and translated into all 24 languages.`);
    await loadProducts();
    setTimeout(() => closeProductForm({ skipConfirm: true }), 900);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Save failed.", "error");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "";
  }
}

/** One of the small per-field "🌐 Translate this field" buttons — re-translates ONLY that field into all 24 languages, leaving the other two fields' existing translations (and every other product detail) untouched. Only shown when editing an existing product. */
async function handleFieldTranslate(field, btn) {
  const statusEl = $("translate-status");
  const productId = $("pf-id").value;
  if (!productId) return; // shouldn't happen — buttons are hidden for new products

  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Translating…";
  statusEl.textContent = `Translating just this field into 24 languages…`;

  try {
    const payload = await buildProductPayload();
    payload.translateFields = [field];
    const saved = await postTranslateAndSave(payload);
    statusEl.textContent = "Saved.";
    showBanner(`"${field}" re-translated into 24 languages — other fields untouched.`);
    // Refresh the in-memory product list so the table/edit state stays in sync,
    // but keep the form open — the admin may want to translate another field next.
    await loadProducts();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Translate failed.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function wireStaticUI() {
  $("login-form").addEventListener("submit", handleLogin);
  $("admin-logout-btn").addEventListener("click", handleLogout);
  $("new-product-btn").addEventListener("click", () => openProductForm(null));
  $("product-modal-close").addEventListener("click", () => closeProductForm());
  // Tapping the dark backdrop no longer closes the form — on mobile a stray
  // tap while scrolling/pasting was silently discarding everything typed.
  // Use the visible × button (which now confirms before discarding) instead.
  $("product-form").addEventListener("submit", handleTranslateAndSave);
  $("pf-title").addEventListener("blur", () => {
    if (!$("pf-slug").value) $("pf-slug").value = slugify($("pf-title").value);
  });
  document.querySelectorAll("#product-form .field-translate-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleFieldTranslate(btn.dataset.field, btn));
  });
  $("product-filter-category")?.addEventListener("change", renderProductTable);
  $("product-filter-search")?.addEventListener("input", renderProductTable);

  TABS.forEach((name) => {
    $(`tab-${name}-btn`).addEventListener("click", () => switchTab(name));
  });

  $("new-category-btn").addEventListener("click", () => openCategoryForm(null));
  $("category-modal-close").addEventListener("click", () => closeCategoryForm());
  $("category-form").addEventListener("submit", handleSaveCategory);
  $("cf-name").addEventListener("blur", () => {
    if (!$("cf-slug").value) $("cf-slug").value = slugify($("cf-name").value);
  });
  document.querySelectorAll(".category-field-translate-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleCategoryFieldTranslate(btn.dataset.field, btn));
  });

  $("new-post-btn").addEventListener("click", () => openPostForm(null));
  $("post-modal-close").addEventListener("click", () => closePostForm());
  $("post-form").addEventListener("submit", handleSavePost);
  $("pof-title").addEventListener("blur", () => {
    if (!$("pof-slug").value) $("pof-slug").value = slugify($("pof-title").value);
  });
  ["pof-title", "pof-seo-title", "pof-meta-description", "pof-body", "pof-slug"].forEach((id) => {
    $(id).addEventListener("input", updateSeoScore);
  });
  $("pof-bold-btn").addEventListener("click", () => {
    const ta = $("pof-body");
    const { selectionStart: s, selectionEnd: en, value } = ta;
    if (s === en) return; // nothing selected — nothing to wrap
    ta.value = value.slice(0, s) + "**" + value.slice(s, en) + "**" + value.slice(en);
    ta.focus();
    ta.setSelectionRange(s + 2, en + 2);
    updateSeoScore();
  });
  $("pof-preview-toggle").addEventListener("click", () => {
    const previewEl = $("pof-body-preview");
    const isHidden = previewEl.classList.contains("hidden");
    if (isHidden) previewEl.innerHTML = bodyToHtml($("pof-body").value);
    previewEl.classList.toggle("hidden", !isHidden);
    $("pof-preview-toggle").textContent = isHidden ? "Hide Preview" : "Preview";
  });
  $("pof-tr-locale").addEventListener("change", loadPostTranslationIntoForm);
  $("pof-tr-autotranslate-btn").addEventListener("click", handleBlogFieldAutoTranslate);
  $("pof-tr-save-btn").addEventListener("click", handleSavePostTranslation);
  $("export-posts-btn").addEventListener("click", handleExportPosts);
  $("import-posts-input").addEventListener("change", handleImportPosts);

  $("settings-form").addEventListener("submit", handleSaveSettings);
  $("sf-announcement-translate-btn").addEventListener("click", handleAnnouncementTranslate);
}

wireStaticUI();
init();

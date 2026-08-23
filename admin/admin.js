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

const state = { services: null, user: null, products: [], editingId: null, categories: [], editingCategoryId: null };

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

  renderProductTable();
}

function renderProductTable() {
  const tbody = $("product-table-body");
  if (!state.products.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-ink-500">No products yet. Click "New Product" to add your first one.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.products
    .map((p) => {
      const title = p.translations?.en?.title || "(untitled)";
      const translatedCount = p.translations ? Object.keys(p.translations).length : 0;
      const img = (p.images && (p.images.find((i) => i.isPrimary) || p.images[0])) || {};
      return `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
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
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/* -----------------------------------------------------------------
 * Categories
 * Unlike products, categories are NOT auto-translated — they store a
 * plain English name/description (same policy as Journal posts) and
 * are written straight to Firestore from this admin panel with the
 * client SDK, since there's no translation step that needs the
 * trusted serverless function.
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

  renderCategoryTable();
  populateCategorySelect();
}

function renderCategoryTable() {
  const tbody = $("category-table-body");
  if (!tbody) return;
  if (!state.categories.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-ink-500">No categories yet. Click "New Category" to add your first one.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.categories
    .map((c) => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02]">
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

async function handleSaveCategory(e) {
  e.preventDefault();
  const btn = $("category-save-btn");
  const statusEl = $("category-status");
  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Uploading image…";

  try {
    const imageUrl = await uploadCategoryImageIfNeeded();
    const { db, firestoreMod } = state.services;
    const editingId = $("cf-id").value || null;

    const data = {
      name: $("cf-name").value.trim(),
      slug: $("cf-slug").value.trim() || slugify($("cf-name").value),
      description: $("cf-description").value.trim(),
      image: imageUrl || "",
      updatedAt: firestoreMod.serverTimestamp(),
    };

    statusEl.textContent = "Saving…";

    if (editingId) {
      await firestoreMod.updateDoc(firestoreMod.doc(db, "tracy_categories", editingId), data);
    } else {
      data.createdAt = firestoreMod.serverTimestamp();
      await firestoreMod.addDoc(firestoreMod.collection(db, "tracy_categories"), data);
    }

    statusEl.textContent = "Saved.";
    showBanner(`"${data.name}" category saved.`);
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

function switchTab(tab) {
  const isProducts = tab === "products";
  $("products-panel").classList.toggle("hidden", !isProducts);
  $("categories-panel").classList.toggle("hidden", isProducts);
  $("tab-products-btn").classList.toggle("admin-tab-active", isProducts);
  $("tab-categories-btn").classList.toggle("admin-tab-active", !isProducts);
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
  $("pf-organic").checked = !!product?.attributes?.organic;
  $("pf-vegan").checked = !!product?.attributes?.vegan;
  $("pf-cruelty-free").checked = !!product?.attributes?.crueltyFree;
  $("pf-featured").checked = !!product?.featured;

  $("product-modal-overlay").classList.remove("hidden");
  $("product-modal-overlay").classList.add("flex");
  // Always start scrolled to the top of the form (Title field), regardless
  // of where a previous open of this modal was left scrolled to.
  const panel = $("product-modal-panel");
  if (panel) panel.scrollTop = 0;
}

/** True if any field in the New/Edit Product form has user-entered content. */
function productFormHasUnsavedInput() {
  const textFields = ["pf-title", "pf-short", "pf-desc", "pf-sku", "pf-slug", "pf-price", "pf-compare-price", "pf-volume", "pf-quantity", "pf-ingredients", "pf-image-url"];
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

async function handleTranslateAndSave(e) {
  e.preventDefault();
  const btn = $("translate-save-btn");
  const statusEl = $("translate-status");
  btn.disabled = true;
  btn.style.opacity = ".6";
  statusEl.textContent = "Uploading image…";

  try {
    const imageUrl = await uploadImageIfNeeded();

    const payload = {
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
      images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
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
      },
    };

    statusEl.textContent = "Translating into 24 languages…";

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

    const saved = await res.json();
    statusEl.textContent = `Saved — ${Object.keys(saved.translations || {}).length}/24 languages translated.`;
    showBanner(`"${saved.translations?.en?.title}" saved and translated into all 24 languages.`);
    await loadProducts();
    setTimeout(() => closeProductForm({ skipConfirm: true }), 900);
  } catch (err) {
    console.error(err);
    statusEl.textContent = "";
    showBanner(err.message || "Translate & Save failed.", "error");
  } finally {
    btn.disabled = false;
    btn.style.opacity = "";
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

  $("tab-products-btn").addEventListener("click", () => switchTab("products"));
  $("tab-categories-btn").addEventListener("click", () => switchTab("categories"));

  $("new-category-btn").addEventListener("click", () => openCategoryForm(null));
  $("category-modal-close").addEventListener("click", () => closeCategoryForm());
  $("category-form").addEventListener("submit", handleSaveCategory);
  $("cf-name").addEventListener("blur", () => {
    if (!$("cf-slug").value) $("cf-slug").value = slugify($("cf-name").value);
  });
}

wireStaticUI();
init();

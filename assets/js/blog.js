/**
 * TRACY USA — Journal / Blog (storefront-facing)
 * ---------------------------------------------------------------------
 * Data source priority (same pattern as products.js / categories.js):
 *   1. Firestore `tracy_blogPosts` collection (status == "published").
 *   2. Local SEED_POSTS below (the site's original 2 launch posts), so
 *      the Journal page still looks complete before an admin has
 *      written anything through the admin panel's Blog tab.
 *
 * English-only by design — same policy as before, just now editable
 * from the admin panel instead of hand-edited into blog.html.
 */

import { getFirebaseServices } from "/assets/js/firebase-config.js";

const SEED_POSTS = [
  {
    id: "lavender-evening-routine",
    title: "5 Ways to Use Lavender Oil in Your Evening Routine",
    category: "Rituals",
    status: "published",
    publishedAt: "2026-08-01T00:00:00.000Z",
    body:
      "Lavender has been used as a calming agent for centuries, and a few drops go a long way in an evening wind-down routine. Here are five simple rituals to try tonight with our Lavender Serenity Essential Oil.\n\n" +
      "**1. Pillow mist.** Add two to three drops to a cotton ball and tuck it inside your pillowcase for a subtly scented night's sleep.\n\n" +
      "**2. Warm bath soak.** Combine five drops with a tablespoon of unscented carrier oil and swirl into a warm bath just before stepping in.\n\n" +
      "**3. Temple massage.** Dilute one drop into a fingertip of your Velvet Nourish Night Cream and gently massage into temples and the back of the neck.\n\n" +
      "**4. Diffuser blend.** Pair four drops of lavender with two drops of a citrus oil in a diffuser an hour before bed.\n\n" +
      "**5. Linen spray.** Mix 10 drops with two ounces of distilled water in a small glass spray bottle and mist your sheets before you turn them down.",
  },
  {
    id: "cold-pressed-argan",
    title: `What "Cold-Pressed" Actually Means for Your Hair Oil`,
    category: "Ingredients",
    status: "published",
    publishedAt: "2026-07-18T00:00:00.000Z",
    body:
      "Not all argan oil is created equal. Cold-pressing extracts oil from argan kernels using only mechanical pressure and low, controlled temperatures — no heat, no chemical solvents. The result preserves more of the naturally occurring vitamin E and fatty acids that give hair its shine and strength, which is why every bottle in our Argan & Rosemary Hair Oil Duo is cold-pressed in small batches.\n\n" +
      "Heat- or solvent-extracted oils are cheaper to produce at scale, but they strip out much of what makes argan oil worth using in the first place. When you're shopping for hair oil, \"cold-pressed\" on the label is worth looking for.",
  },
];

let postCache = null;

export async function fetchBlogPosts({ forceRefresh = false } = {}) {
  if (postCache && !forceRefresh) return postCache;

  const services = await getFirebaseServices();
  if (services) {
    try {
      const { db, firestoreMod } = services;
      const { collection, getDocs, query, where, orderBy } = firestoreMod;
      let snap;
      try {
        snap = await getDocs(query(collection(db, "tracy_blogPosts"), where("status", "==", "published"), orderBy("publishedAt", "desc")));
      } catch (err) {
        // Composite index may not exist yet on a fresh project — fall back to an unordered filtered fetch.
        snap = await getDocs(query(collection(db, "tracy_blogPosts"), where("status", "==", "published")));
      }
      if (!snap.empty) {
        postCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return postCache;
      }
    } catch (err) {
      console.warn("Firestore blog fetch failed, using local seed data.", err);
    }
  }

  postCache = SEED_POSTS;
  return postCache;
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatPostDate(value) {
  const ms = toMillis(value);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function escapeHtml(str = "") {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Convert admin-authored plain text (blank-line paragraphs, **bold**) into safe HTML. */
export function bodyToHtml(body = "") {
  return body
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const escaped = escapeHtml(para).replace(/\*\*(.+?)\*\*/g, '<strong class="text-gold-soft">$1</strong>');
      return `<p class="text-ink-300 leading-relaxed mb-4">${escaped}</p>`;
    })
    .join("");
}

/** Render the full Journal list (each post as its own article block) into `containerEl`. */
export async function renderBlogList(containerEl) {
  if (!containerEl) return;
  const posts = await fetchBlogPosts();

  if (!posts.length) {
    containerEl.innerHTML = `<p class="text-center text-ink-500 py-16">No posts yet.</p>`;
    return;
  }

  containerEl.innerHTML = posts
    .map(
      (post) => `
    <article class="glass p-8 mb-8">
      ${post.category ? `<p class="eyebrow mb-2">${escapeHtml(post.category)}</p>` : ""}
      <h2 class="heading-serif text-2xl mb-3">${escapeHtml(post.title)}</h2>
      ${bodyToHtml(post.body)}
      <p class="text-xs text-ink-700 mt-6">Tracy's Botanical Elixirs Editorial${post.publishedAt ? ` · Published ${formatPostDate(post.publishedAt)}` : ""}</p>
    </article>`
    )
    .join("");
}

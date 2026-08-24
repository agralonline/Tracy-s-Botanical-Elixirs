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

export const SEED_POSTS = [
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
  {
    id: "essential-oils-for-stress-relief-guide",
    title: "The Ultimate Guide to Essential Oils for Stress Relief and Relaxation",
    category: "Rituals",
    status: "published",
    publishedAt: "2026-08-20T00:00:00.000Z",
    body:
      "If you've searched for essential oils for stress relief, you've probably noticed the same handful of names come up again and again: lavender, chamomile, frankincense, bergamot. There's a reason these particular oils dominate the conversation around aromatherapy for relaxation — they're some of the best-studied, most versatile botanicals for winding down a busy nervous system, and they layer beautifully with an evening self-care ritual.\n\n" +
      "**Lavender** is the classic choice for a reason. Our Lavender Serenity Essential Oil is steam-distilled from French lavender and works well in a diffuser, a warm bath, or diluted onto pulse points before bed. **Frankincense** brings a deeper, resinous note that pairs naturally with meditation or breathwork — our Frankincense Grounding Essential Oil is formulated specifically for that kind of grounding ritual. **Chamomile** is gentler still, which is why we bottled our Chamomile Calm Roll-On Oil pre-diluted in jojoba for direct, on-the-go application without any mixing required.\n\n" +
      "**How to actually use a calming essential oil.** Aromatherapy works through two channels: inhalation (a diffuser, a pillow mist, or simply cupping your hands over a drop and breathing in) and topical application, always diluted into a carrier oil first — never applied undiluted to skin. A good starting ritual is two to three drops in a diffuser thirty minutes before bed, or a single diluted drop massaged into the temples and the back of the neck.\n\n" +
      "**Building a stress-relief oil rotation.** Many customers keep two or three oils on rotation rather than relying on just one — a bright citrus blend like our Citrus Sunrise Essential Oil Blend for daytime resets, and a deeper floral or resinous oil like lavender or frankincense for evening wind-down. Scent fatigue is real, and rotating oils keeps your nervous system responsive to the cues you're giving it.\n\n" +
      "One important note: essential oils are a wellness ritual, not a medical treatment. If you're managing a diagnosed anxiety or sleep condition, these oils can be a lovely complement to your routine, but they're not a substitute for advice from a physician.",
  },
  {
    id: "vitamin-c-retinol-niacinamide-which-serum",
    title: "Vitamin C, Retinol, or Niacinamide: Which Serum Does Your Skin Actually Need?",
    category: "Ingredients",
    status: "published",
    publishedAt: "2026-08-12T00:00:00.000Z",
    body:
      "Walk into any conversation about serums and you'll hear the same three ingredients thrown around: vitamin C, retinol, and niacinamide. They're the most searched-for actives in skincare for good reason, but they solve different problems, and layering all three at once without a plan is a common way to irritate your skin instead of improving it. Here's how to think about each one.\n\n" +
      "**Vitamin C is for brightness and evenness.** It's an antioxidant, meaning its main job is defending skin against environmental stress while gently fading the look of uneven tone and dullness over time. It's best used in the morning, underneath sunscreen. Our Radiant Renewal Face Serum pairs vitamin C with hyaluronic acid so it hydrates while it brightens, rather than leaving skin feeling stripped.\n\n" +
      "**Retinol is for texture and renewal.** It's a nighttime-only ingredient that encourages skin to behave the way it did when it was renewing itself faster, which is why it's the go-to active for anyone focused on the visible look of fine lines and rough texture. Our Overnight Retinol Renewal Serum uses an encapsulated form specifically to release more slowly and reduce the irritation that gives retinol its reputation — start two to three nights a week and build up, and always follow with SPF the next morning.\n\n" +
      "**Niacinamide is for balance and pores.** It's the gentlest of the three and the easiest to layer with almost anything, which is why it's often the first active people reach for. It helps regulate the appearance of oil and refine the visible look of pores without the sensitivity that vitamin C or retinol can bring. Our Niacinamide Pore Refine Serum is formulated to sit comfortably under moisturizer, morning or night.\n\n" +
      "**Can you use more than one?** Yes, with a schedule. A common, well-tolerated routine is vitamin C in the morning and retinol at night, with niacinamide layered in on the mornings or nights you're not using the other two actives. If you're new to actives, introduce one at a time, two to three weeks apart, so you know exactly what your skin is responding to.",
  },
  {
    id: "vegan-cruelty-free-skincare-routine-guide",
    title: "How to Build a Vegan, Cruelty-Free Skincare Routine That Actually Works",
    category: "Ingredients",
    status: "published",
    publishedAt: "2026-08-05T00:00:00.000Z",
    body:
      "Vegan skincare and cruelty-free skincare get used interchangeably online, but they mean different things. Cruelty-free means a product (and its ingredients) were never tested on animals. Vegan means the formula itself contains no animal-derived ingredients — no beeswax, no lanolin, no carmine, no collagen sourced from animals. A product can be one without being the other. Every formula across Tracy's Botanical Elixirs is both, which is a deliberate formulation choice, not a marketing label.\n\n" +
      "**Start with a gentle cleanse and a purpose-built serum, not a ten-step routine.** The biggest myth in clean beauty is that more steps means more results. A simple, effective routine is a cleanser, a targeted serum, and a moisturizer suited to your skin's actual needs — plus SPF every morning, no exceptions. Our Daylight Defense Day Cream carries a mineral SPF 30 specifically so that step isn't a separate bottle to remember.\n\n" +
      "**Choose your actives around what you need,** not what's trending — see our full breakdown of vitamin C vs. retinol vs. niacinamide serums if you're unsure where to start. Vegan formulations of these actives work identically to their non-vegan counterparts; the difference is purely in the inactive, supporting ingredients (emulsifiers, waxes, preservative systems), where plant-derived alternatives now perform on par with animal-derived ones.\n\n" +
      "**Read the ingredient list, not just the front label.** \"Natural\" and \"clean\" aren't regulated terms in the US the way \"organic\" is. Look for plant-derived emulsifiers (cetearyl alcohol, glyceryl stearate), plant waxes (candelilla, carnauba, or jojoba wax instead of beeswax), and a clear absence of animal-derived collagen, keratin, or squalene (as opposed to plant-derived squalane, which is vegan and appears in many of our formulas). Our Botanical Lip Balm Duo, for example, uses candelilla wax specifically to keep the formula fully vegan without sacrificing the balm-like texture beeswax normally provides.\n\n" +
      "**Vegan and organic aren't the same thing either.** A product can be vegan without being organic, and organic without being vegan (honey and beeswax are both organic-certifiable and animal-derived). If both matter to you, check for both callouts on the product page — we mark `organic: true` products individually rather than applying it as a blanket brand claim, because not every formula uses certified-organic ingredients.",
  },
  {
    id: "hair-oiling-guide-how-often-which-oil",
    title: "The Complete Guide to Hair Oiling: How Often, How Much, and Which Oil for Your Hair Type",
    category: "Ingredients",
    status: "published",
    publishedAt: "2026-07-28T00:00:00.000Z",
    body:
      "Hair oiling is one of the oldest hair care rituals in the world, and also one of the most misunderstood — used incorrectly, oil sits on the surface of the hair and looks greasy instead of glossy. Used correctly, it's one of the simplest ways to visibly improve shine, manageability, and the look of damaged ends. Here's how to actually do it.\n\n" +
      "**Pick your oil by hair type, not by trend.** Fine or oily hair generally does better with lighter oils applied sparingly and only to the ends — our Silk Leave-In Oil Mist is formulated specifically to be light enough for root-to-tip use without weighing fine hair down. Thicker, curlier, or drier hair can usually handle richer oils and more frequent use — our Argan & Rosemary Hair Oil Duo and Intensive Repair Hair Mask are both built for that heavier, more intensive end of the spectrum.\n\n" +
      "**How often should you oil your hair?** For a leave-in style oil, most hair types do well with light daily-to-every-other-day use focused on the mid-lengths and ends. For a deeper pre-wash treatment or a mask, once or twice a week is typically enough — oiling more than that on fine hair can lead to buildup, while coarser or chemically treated hair can often handle more frequent treatments.\n\n" +
      "**Pre-wash vs. leave-in: they're not the same ritual.** A pre-wash oil treatment (applying oil to dry hair thirty minutes to overnight before shampooing) is about deep conditioning the hair shaft and protecting it from the stripping effect of cleansing. A leave-in oil, applied to towel-dried or dry hair as a finishing step, is about sealing in moisture and adding shine after the wash is already done. Our Intensive Repair Hair Mask is built for the first use case; our Silk Leave-In Oil Mist and Anti-Frizz Smoothing Serum are built for the second.\n\n" +
      "**Don't forget the scalp.** Hair oiling and scalp care are related but different rituals — a heavy oil that's perfect for dry ends can feel too rich directly on the scalp for some hair types. If your focus is scalp comfort rather than length, a lighter, purpose-built formula like our Scalp Renewal Serum is designed to be used closer to the roots without the heaviness of a full-length oil.",
  },
  {
    id: "what-does-organic-certified-mean-skincare",
    title: "What Does \"Organic Certified\" Actually Mean in Skincare? A Buyer's Guide",
    category: "Ingredients",
    status: "published",
    publishedAt: "2026-07-10T00:00:00.000Z",
    body:
      "\"Organic\" is one of the most searched — and most misused — words on a skincare label. Unlike \"natural\" or \"clean,\" which have no legal definition in the US, organic claims are actually regulated, which means the word means something specific when it's used correctly, and nothing at all when a brand uses it loosely.\n\n" +
      "**What organic actually refers to.** An organic-certified ingredient was grown without synthetic pesticides, herbicides, or fertilizers, following certification standards similar to those used for organic food. When we mark a product's `organic` attribute as true, it means the formula is built primarily around botanical ingredients grown to that standard — for example, our Rosewater Balancing Toner is built on organic Rosa damascena flower water, and our Whipped Body Butter is built on organic cocoa seed butter and shea butter.\n\n" +
      "**Why not every product is organic.** Some of our most effective formulas — like our Niacinamide Pore Refine Serum or Overnight Retinol Renewal Serum — are built around lab-formulated actives (niacinamide, encapsulated retinol) rather than botanical extracts. These ingredients aren't \"organic\" in the agricultural sense because they're not grown, they're synthesized — but that doesn't make them lower quality. Organic and effective aren't the same axis, and a good routine often mixes both: an organic-based moisturizer alongside a lab-formulated active serum.\n\n" +
      "**How to actually check.** Don't rely on the front-of-bottle language alone — check the specific product page for an explicit organic callout, and look at the ingredient list itself. A genuinely organic-forward formula will list recognizable botanical ingredients (shea butter, jojoba oil, rosehip oil, rose water) at or near the top of the list, not buried after a long string of synthetic fillers.\n\n" +
      "**The bottom line.** \"Organic\" tells you something true and specific about how an ingredient was farmed — it doesn't automatically mean \"better for your skin\" or \"free of all synthetic ingredients.\" Use it as one useful data point among several (alongside vegan status, cruelty-free status, and the actual active ingredients) rather than the single deciding factor.",
  },
  {
    id: "skincare-routine-order-morning-vs-night",
    title: "Morning vs. Night Skincare Routine: What Order Should You Apply Your Products?",
    category: "Rituals",
    status: "published",
    publishedAt: "2026-06-25T00:00:00.000Z",
    body:
      "One of the most common questions in skincare isn't which products to buy — it's what order to put them on in. Apply products in the wrong order and even excellent formulas can underperform, because heavier products applied too early can block lighter, more active ones from reaching the skin at all. Here's the order that actually works, and why.\n\n" +
      "**The rule of thumb: thinnest to thickest, water-based before oil-based.** Cleanser first, always. Then any toner (like our Rosewater Balancing Toner) to rebalance the skin and prep it to absorb what comes next. Then your serums, from lightest to richest — a water-based hyaluronic acid serum before a richer oil-based one. Moisturizer seals everything in, and in the morning, sunscreen is always the final step, applied on top of everything else, not mixed in with your moisturizer.\n\n" +
      "**A simple morning routine:** cleanse, Rosewater Balancing Toner, Radiant Renewal Face Serum or Hyaluronic Hydra Serum, a light moisturizer, then Daylight Defense Day Cream (SPF 30) as your final step. If you use an eye product like our Awaken Eye Serum-Cream, apply it after your serum and before your heavier moisturizer.\n\n" +
      "**A simple night routine:** cleanse, toner, your active serum of choice (this is when to use Overnight Retinol Renewal Serum, alternating nights with gentler options like Niacinamide Pore Refine Serum or Rosehip Glow Serum while your skin adjusts), then a richer night cream like our Velvet Nourish Night Cream to seal it all in. Lip balm and any leave-in hair treatments are a natural last step in an evening ritual, not strictly a \"skincare order\" concern but worth doing while everything else absorbs.\n\n" +
      "**A note on actives.** Not every active belongs in the same routine on the same night. Retinol and vitamin C, in particular, are usually better used at different times of day (retinol at night, vitamin C in the morning) rather than layered together, and a weekly treatment like our Purifying Clay Mask should replace your usual serum step that day, not stack on top of it. When in doubt, simpler is almost always better than more.",
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

// Each card in the carousel gets one of these accent colors, cycling in
// order (red, green, blue, purple, sky) so a long row of posts reads as a
// deliberate chain rather than a wall of identical cards.
const ACCENT_COLORS = ["#d16a6a", "#5fae82", "#6a93d1", "#a687d1", "#6ecbe0"];

/** Render the Journal as a horizontally-scrolling row of cards into `containerEl`. */
export async function renderBlogList(containerEl) {
  if (!containerEl) return;
  const posts = await fetchBlogPosts();

  if (!posts.length) {
    containerEl.innerHTML = `<p class="text-center text-ink-500 py-16">No posts yet.</p>`;
    return;
  }

  const cards = posts
    .map((post, i) => {
      const accent = ACCENT_COLORS[i % ACCENT_COLORS.length];
      return `
    <article class="blog-card glass" style="--accent:${accent};">
      ${post.category ? `<p class="eyebrow mb-2" style="color:${accent};">${escapeHtml(post.category)}</p>` : ""}
      <h2 class="heading-serif text-2xl mb-3" style="color:${accent};">${escapeHtml(post.title)}</h2>
      ${bodyToHtml(post.body)}
      <p class="text-xs text-ink-700 mt-6">Tracy's Botanical Elixirs Editorial${post.publishedAt ? ` · Published ${formatPostDate(post.publishedAt)}` : ""}</p>
    </article>`;
    })
    .join("");

  containerEl.innerHTML = `
    <div class="blog-carousel-wrap">
      <div class="blog-carousel" id="blog-carousel-track">${cards}</div>
      <button type="button" class="blog-scroll-hint" id="blog-scroll-hint" aria-label="Scroll to next post">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>
    </div>`;

  const track = document.getElementById("blog-carousel-track");
  const hint = document.getElementById("blog-scroll-hint");
  if (track && hint) {
    hint.addEventListener("click", () => {
      const card = track.querySelector(".blog-card");
      const step = card ? card.getBoundingClientRect().width + 24 : 400;
      track.scrollBy({ left: step, behavior: "smooth" });
    });
    // Hide the hint once there's nothing left to scroll to.
    const updateHint = () => {
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      hint.classList.toggle("hidden", atEnd);
    };
    track.addEventListener("scroll", updateHint);
    updateHint();
  }
}

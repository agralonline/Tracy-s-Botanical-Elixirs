/**
 * TRACY USA — "Shop by Wellness Goal" tiles
 * ---------------------------------------------------------------------
 * An alternate way to browse the catalog by intent/use-case ("Better
 * Sleep", "Stress Relief"...) rather than only by product category —
 * a common, high-converting pattern on wellness/botanical sites.
 *
 * Each product can be tagged with one or more of these goal slugs via
 * the admin product form (Wellness Goals checkboxes) — stored as
 * product.goals: string[]. A goal tile links to
 * /shop.html?goal=<slug>, which filters the shop grid to matching
 * products (see shop.html + renderProductGrid's `goal` option).
 *
 * Edit GOAL_SLIDES to add/remove/reorder tiles or swap images — no
 * other code changes needed (same pattern as hero-slider.js's
 * HERO_SLIDES before it became admin-editable).
 */
export const WELLNESS_GOALS = [
  { slug: "better-sleep", i18nKey: "goal_better_sleep", image: "/assets/img/hero/hero-model.jpg" },
  { slug: "stress-relief", i18nKey: "goal_stress_relief", image: "/assets/img/categories/category-essential-oils.jpg" },
  { slug: "glowing-skin", i18nKey: "goal_glowing_skin", image: "/assets/img/categories/category-skincare.jpg" },
  { slug: "hair-care", i18nKey: "goal_hair_care", image: "/assets/img/categories/category-hair-care.jpg" },
];

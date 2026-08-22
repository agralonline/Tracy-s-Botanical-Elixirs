import { chromium } from "playwright";

const BASE = "http://localhost:8080";
const pages = [
  "/index.html",
  "/shop.html",
  "/shop.html?category=serums",
  "/product.html?slug=lavender-serenity-essential-oil",
  "/cart.html",
  "/about.html",
  "/blog.html",
  "/admin/index.html",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", headless: true }).catch(async () => {
  return chromium.launch({ headless: true });
});

let hadError = false;

// This sandbox's egress allowlist blocks cdn.tailwindcss.com / fonts.googleapis.com
// (403 on CONNECT). That's a sandbox network restriction, not a site bug — real
// hosting (Vercel/Netlify) has full internet access. To verify our OWN application
// logic (i18n, cart, product rendering) independent of that restriction, stub the
// external CDN requests here rather than let them hard-fail the page.
async function stubExternalCDNs(page) {
  await page.route("https://cdn.tailwindcss.com*", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "window.tailwind = { config: function(){} };" })
  );
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
}

for (const path of pages) {
  const page = await browser.newPage();
  await stubExternalCDNs(page);
  const errors = [];
  page.on("console", (msg) => {
    // The Google Fonts request is deliberately aborted by stubExternalCDNs()
    // above (this sandbox has no internet access) — that's expected here and
    // harmless on real hosting, so it's filtered out rather than reported.
    if (msg.type() === "error" && !msg.text().includes("net::ERR_FAILED")) errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(400);

  console.log(`\n--- ${path} ---`);
  if (errors.length) {
    hadError = true;
    errors.forEach((e) => console.log("  ERROR:", e));
  } else {
    console.log("  OK — no console errors");
  }

  // Quick sanity checks per page
  if (path.startsWith("/index.html") || path === "/") {
    const cardCount = await page.locator(".product-card").count();
    console.log(`  product cards rendered: ${cardCount}`);
  }
  if (path.startsWith("/shop.html")) {
    const cardCount = await page.locator(".product-card").count();
    console.log(`  product cards rendered: ${cardCount}`);
  }
  if (path.startsWith("/product.html")) {
    const title = await page.locator("h1").first().textContent().catch(() => null);
    console.log(`  product title: ${title}`);
  }

  await page.close();
}

// Language switcher test on index.html
{
  const page = await browser.newPage();
  await stubExternalCDNs(page);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(BASE + "/index.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const before = await page.locator("#product-grid .product-card").first().locator("a.heading-serif").textContent();
  await page.selectOption("#languageSelector", "es");
  await page.waitForTimeout(500);
  const after = await page.locator("#product-grid .product-card").first().locator("a.heading-serif").textContent();
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  console.log(`\n--- language switch test ---`);
  console.log(`  before (en): ${before}`);
  console.log(`  after (es):  ${after}`);
  console.log(`  changed: ${before !== after}`);

  // RTL test
  await page.selectOption("#languageSelector", "ar");
  await page.waitForTimeout(500);
  const dirAr = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  console.log(`  dir after switching to ar: ${dirAr}`);

  if (errors.length) {
    hadError = true;
    errors.forEach((e) => console.log("  ERROR:", e));
  }
  await page.close();
}

// Cart flow test
{
  const page = await browser.newPage();
  await stubExternalCDNs(page);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(BASE + "/shop.html", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.locator(".add-to-cart-btn").first().click();
  await page.waitForTimeout(300);
  const badge = await page.locator("#cart-count-badge").textContent();
  console.log(`\n--- cart test ---`);
  console.log(`  cart badge after add: ${badge}`);
  if (errors.length) {
    hadError = true;
    errors.forEach((e) => console.log("  ERROR:", e));
  }
  await page.close();
}

await browser.close();
console.log(hadError ? "\nSMOKE TEST: FAILURES FOUND" : "\nSMOKE TEST: ALL CLEAR");
process.exit(hadError ? 1 : 0);

import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });

for (const url of ["http://localhost:8080/faq.html", "http://localhost:8080/contact.html"]) {
  errors.length = 0;
  await page.goto(url, { waitUntil: "networkidle" }).catch((e) => errors.push("NAV ERROR: " + e.message));
  const navLinks = await page.$$eval(".nav-link", (els) => els.map((e) => e.textContent.trim()));
  const hasHamburger = (await page.$("#mobile-nav-toggle")) !== null;
  const hasCart = (await page.$("#cart-toggle-btn")) !== null;
  console.log(url, "| navLinks:", [...new Set(navLinks)], "| hamburger:", hasHamburger, "| cart:", hasCart);
  console.log("  real errors:", errors.filter((e) => !e.includes("ERR_TUNNEL") && !e.includes("Firebase failed")));
}
await browser.close();

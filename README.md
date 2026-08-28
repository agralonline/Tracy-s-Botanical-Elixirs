# The Botanical Apothecary — Luxury Essential Oils & Organic Skincare

A production-ready, multi-language (24 locales) e-commerce storefront with
a "Dark Luxury" glassmorphism design system, an admin panel with one-click
AI translation, Firebase Firestore as the database, and direct Stripe
Checkout — deployable to Vercel or Netlify with zero monthly platform fees
beyond Stripe's standard per-transaction rate.

## What's in the box

```
├── index.html, shop.html, product.html, cart.html   ← storefront pages
├── success.html, cancel.html                        ← Stripe redirect pages
├── about.html, contact.html, blog.html,              ← content pages
│   shipping.html, privacy.html, terms.html             (blog = English only)
├── admin/                                            ← admin panel (Firebase Auth-gated)
│   ├── index.html
│   └── admin.js
├── assets/
│   ├── css/style.css                                 ← Dark Luxury design system
│   ├── js/
│   │   ├── i18n.js            ← 24-locale language switcher engine
│   │   ├── firebase-config.js ← Firebase bootstrap (graceful no-config fallback)
│   │   ├── products.js        ← catalog fetch/filter/render
│   │   ├── cart.js            ← localStorage cart + Stripe Checkout kickoff
│   │   └── main.js            ← shared page bootstrap
│   └── img/products/*.svg     ← 4 built-in placeholder product illustrations
├── locales/*.json (24 files)  ← UI chrome strings per language
├── data/seed-products.js      ← 4 starter products, fully translated, used
│                                 as the local fallback catalog
├── functions/                 ← Netlify Functions (+ shared _lib/ core logic)
│   ├── translate-and-save.js
│   ├── create-checkout-session.js
│   ├── stripe-webhook.js
│   └── _lib/{translate,firebaseAdmin,translateAndSaveHandler,checkoutHandler,webhookHandler}.js
├── api/                       ← Vercel Serverless Functions (same core logic)
│   ├── translate-and-save.js
│   ├── create-checkout-session.js
│   └── stripe-webhook.js
├── scripts/seed-firestore.js  ← pushes the 4 seed products into Firestore
├── firestore.rules
├── firestore-schema.md        ← exact Firestore document model
├── netlify.toml / vercel.json
└── .env.example
```

## Runs with zero configuration

Open `index.html` (or `npm run dev`, which serves the folder on
`localhost:5173`) and the site works immediately — every page renders
the 4 bundled products from `data/seed-products.js`, the 24-language
switcher works fully offline against the static `/locales/*.json` files,
and the cart/localStorage flow is fully functional. Firebase and Stripe
are **optional upgrades**, not requirements to see the site working.

## 1. Firebase setup (enables live product data + admin panel)

1. Create a project at https://console.firebase.google.com.
2. Enable **Firestore** (Native mode, any region) and **Authentication**
   → Email/Password provider.
3. Enable **Storage** if you want the admin panel's image upload to work
   (otherwise admins can paste an image URL directly — no Storage needed).
4. Project settings → General → "Your apps" → Add a Web app → copy the
   config object into `assets/js/firebase-config.js` (`DEFAULT_CONFIG`),
   or inject it at runtime with a `window.__TRACY_FIREBASE_CONFIG__`
   script tag before that module loads (handy for per-environment values
   without committing secrets — see `.env.example`).
5. Project settings → Service accounts → Generate new private key. Base64
   encode the downloaded JSON and set it as `FIREBASE_SERVICE_ACCOUNT_BASE64`
   in your hosting provider's environment variables (used only by the
   server-side functions in `/functions` and `/api`, never shipped to
   the browser).
6. Deploy security rules: `firebase deploy --only firestore:rules` (using
   `firestore.rules` in this repo), or paste them into the Firebase
   Console's Rules tab.
7. Create your first admin user:
   - Firebase Console → Authentication → add a user (email + password).
   - Firestore → create collection `admins` → document ID = that user's
     UID (find it in the Authentication tab) → any fields, e.g.
     `{ "email": "you@tracyusa.com", "role": "owner" }`.
   - Sign in at `/admin/index.html` with that email/password.
8. Optional: seed Firestore with the same 4 starter products the local
   fallback uses (no translation-API calls — the seed data already ships
   translated):
   ```bash
   npm install
   FIREBASE_SERVICE_ACCOUNT_BASE64=... npm run seed
   ```

## 2. Translation API setup (powers the admin's "Translate & Save" button)

Choose one provider via the `TRANSLATION_PROVIDER` env var:

- **Google Cloud Translation API v2** (default) — enable it in Google
  Cloud Console, create an API key, set `GOOGLE_TRANSLATE_API_KEY`.
- **DeepL** — set `TRANSLATION_PROVIDER=deepl` and `DEEPL_API_KEY` (a
  free-tier key, ending in `:fx`, works). Note DeepL doesn't cover every
  locale in our list (notably Arabic and Traditional Chinese) — for any
  locale it can't translate, the code automatically falls back to Google
  (if configured) or to the English text, so a product is never left
  with a blank field.

Without either key configured, "Translate & Save" will return a clear
error explaining what's missing — it never fails silently.

## 3. Stripe setup (enables real checkout)

1. Create a Stripe account and grab your **test** secret key from the
   Dashboard → Developers → API keys.
2. Set `STRIPE_SECRET_KEY` in your hosting environment.
3. Deploy the site, then in the Stripe Dashboard → Developers → Webhooks
   → Add endpoint, pointing at `https://yourdomain.com/api/stripe-webhook`,
   subscribed to the `checkout.session.completed` event. Copy the signing
   secret into `STRIPE_WEBHOOK_SECRET`.
4. Swap to your **live** keys when you're ready to accept real payments.
   Stripe Checkout charges its standard per-transaction processing fee —
   there is no separate monthly SaaS fee for this integration, matching
   the "zero monthly fees" requirement.
5. Optional: enable Stripe Tax in the Dashboard and set
   `STRIPE_AUTOMATIC_TAX=true` to have Stripe calculate sales tax/VAT
   automatically at checkout.

Test the full loop with Stripe's test card `4242 4242 4242 4242`, any
future expiry, any CVC.

## 4. Deploying

### Netlify
- Connect the repo. Build command: none needed (`netlify.toml` already
  sets a no-op). Publish directory: `.` (repo root).
- Functions are auto-detected from `functions/` (see `netlify.toml`).
- Add all server-side env vars from `.env.example` in Site settings →
  Environment variables.

### Vercel
- Import the repo. Vercel auto-detects the `api/` folder as Serverless
  Functions — no framework preset needed ("Other").
- Add the same env vars in Project settings → Environment Variables.

Both platforms are genuinely zero-fee at hobby/free tier for a site this
size — you only pay Stripe's per-transaction fee once you're selling.

## 5. Adding real product photography

The 4 bundled products ship with inline SVG illustrations (in
`assets/img/products/`) so the site looks complete out of the box. To
replace them with real photography: open `/admin/index.html`, edit the
product, and either upload a file (goes to Firebase Storage) or paste a
hosted image URL — no code changes required. Prefer JPG/PNG for the
image used in Stripe Checkout's line-item thumbnail (see the comment in
`functions/_lib/checkoutHandler.js`).

## 6. The blog / translation-quota policy

Per the product requirements, blog content (`blog.html`) is **always
English** — it is intentionally excluded from the translation pipeline.
Only product `title`, `shortDescription`, and `description` are ever
sent to the translation API, which keeps quota usage predictable
regardless of how much editorial content you publish.

## 7. Design system

See `assets/css/style.css` for the full "Dark Luxury" token set — deep
navy backgrounds (`#0a0f1d` / `#050b14`) with ambient cyan/emerald glow,
brushed-gold accents (`#D4AF37`), and glassmorphism cards
(`rgba(255,255,255,0.03)` + `backdrop-filter: blur(12px)` + a soft
gold/cyan border). Fonts are Cormorant Garamond (display/serif) and
Inter (body/sans), loaded from Google Fonts.

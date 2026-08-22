# Firestore Data Model — Tracy USA

Project: Cloud Firestore (Native mode). All collections below live at the
root of the default database unless noted.

## Collection: `products`

Document ID: slug string (e.g. `lavender-serenity-essential-oil`) — human
readable, stable, safe to use directly in URLs (`/product.html?slug=...`).

```json
{
  "id": "lavender-serenity-essential-oil",
  "sku": "TRC-EO-001",
  "slug": "lavender-serenity-essential-oil",
  "category": "essential-oils",
  "status": "active",
  "featured": true,
  "pricing": {
    "currency": "USD",
    "basePrice": 48.00,
    "compareAtPrice": 58.00
  },
  "stripePriceId": "price_1PXXXXXXXXXXXXXXXXXXXXXX",
  "stripeProductId": "prod_XXXXXXXXXXXXXX",
  "images": [
    {
      "url": "https://firebasestorage.googleapis.com/.../product-1.jpg",
      "isPrimary": true,
      "alt": {
        "en": "Violet glass lavender essential oil bottle",
        "es": "Frasco de aceite esencial de lavanda de vidrio violeta"
      }
    }
  ],
  "attributes": {
    "volumeMl": 30,
    "ingredients": ["Lavandula angustifolia (Lavender) Oil"],
    "scentProfile": ["floral", "herbaceous"],
    "skinType": ["all"],
    "vegan": true,
    "crueltyFree": true,
    "organic": true
  },
  "inventory": {
    "trackInventory": true,
    "quantity": 240,
    "allowBackorder": false
  },
  "rating": { "average": 4.9, "count": 214 },
  "translations": {
    "en": {
      "title": "Lavender Serenity Essential Oil",
      "shortDescription": "Pure calming lavender in a violet glass dropper bottle.",
      "description": "A 100% pure, steam-distilled French lavender oil that eases tension and restores calm..."
    },
    "es": { "title": "...", "shortDescription": "...", "description": "..." },
    "pt": { "title": "...", "shortDescription": "...", "description": "..." },
    "fr":  { "...": "..." },
    "de":  { "...": "..." },
    "it":  { "...": "..." },
    "nl":  { "...": "..." },
    "sv":  { "...": "..." },
    "el":  { "...": "..." },
    "pl":  { "...": "..." },
    "ro":  { "...": "..." },
    "cs":  { "...": "..." },
    "hu":  { "...": "..." },
    "uk":  { "...": "..." },
    "ru":  { "...": "..." },
    "bg":  { "...": "..." },
    "sk":  { "...": "..." },
    "lt":  { "...": "..." },
    "ar":  { "...": "..." },
    "tr":  { "...": "..." },
    "zh-CN": { "...": "..." },
    "zh-TW": { "...": "..." },
    "ja":  { "...": "..." },
    "ko":  { "...": "..." }
  },
  "translationMeta": {
    "sourceLocale": "en",
    "provider": "google-translate-v2",
    "translatedAt": "2026-08-22T10:00:00.000Z",
    "reviewedLocales": []
  },
  "createdAt": "2026-08-22T10:00:00.000Z",
  "updatedAt": "2026-08-22T10:00:00.000Z"
}
```

**Notes**

- Every `translations.<locale>` object has exactly the same three keys:
  `title`, `shortDescription`, `description`. The admin never edits these
  by hand except `en` — `functions/translate-and-save.js` generates the
  other 23 in one call.
- `translations` only ever holds *product copy*. Blog content is never
  translated (see `blogPosts` below) and UI chrome strings live in the
  static `/locales/<code>.json` files shipped with the frontend, not in
  Firestore.
- `category` is a slug referencing a small static `CATEGORIES` list
  (see `data/seed-products.js`) — categories are not localized in the
  database; their display labels come from the UI locale files via
  `labelKey`.
- `stripePriceId` / `stripeProductId` are populated after the admin
  syncs the product to Stripe (button in the admin panel, or the
  `syncStripe` flag sent to `translate-and-save`).

## Collection: `blogPosts`

Blog is **English only** — this is a hard product rule to conserve
translation-API quota, since long-form articles would consume it fast.

```json
{
  "id": "5-ways-to-use-lavender-oil",
  "slug": "5-ways-to-use-lavender-oil",
  "title": "5 Ways to Use Lavender Oil in Your Evening Routine",
  "excerpt": "Simple, luxurious rituals for winding down...",
  "bodyHtml": "<p>...</p>",
  "coverImage": "https://.../blog/lavender-routine.jpg",
  "author": "Tracy USA Editorial",
  "tags": ["lavender", "self-care", "rituals"],
  "status": "published",
  "publishedAt": "2026-07-01T09:00:00.000Z",
  "updatedAt": "2026-07-01T09:00:00.000Z"
}
```

## Collection: `orders`

Written by `functions/stripe-webhook.js` on `checkout.session.completed`.

```json
{
  "id": "cs_test_XXXXXXXXXXXX",
  "stripeSessionId": "cs_test_XXXXXXXXXXXX",
  "stripePaymentIntentId": "pi_XXXXXXXXXXXX",
  "customerEmail": "jane@example.com",
  "locale": "es",
  "currency": "usd",
  "amountSubtotal": 11200,
  "amountTotal": 12100,
  "shippingAddress": {
    "name": "Jane Doe",
    "line1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "lineItems": [
    { "productId": "lavender-serenity-essential-oil", "sku": "TRC-EO-001", "quantity": 2, "unitAmount": 4800 }
  ],
  "status": "paid",
  "createdAt": "2026-08-22T10:05:00.000Z"
}
```

## Collection: `admins`

Document ID = Firebase Auth UID. Used by Firestore security rules to gate
writes to `products` / `blogPosts` to admin users only.

```json
{ "email": "admin@tracyusa.com", "role": "owner", "createdAt": "..." }
```

## Indexes

- `products`: composite index on (`status` ASC, `category` ASC, `featured` DESC) for the catalog/category views.
- `orders`: single-field index on `createdAt` DESC (created automatically).

See `firestore.rules` for the full security rule set enforcing the
translations/read-public, writes/admin-only model described above.

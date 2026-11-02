# Rongdhonu Fashion — রঙধনু ফ্যাশন (v2.1 — audit + fix pass)

A complete demo boutique storefront + admin for a Bangladeshi online fashion shop.
Node.js (Express, only dependency) + SQLite via built-in `node:sqlite`. No build step.

## Run

```bash
npm install
npm start          # http://localhost:3000
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin — demo PIN **1234** (change in Settings before real use)
- Staff viewer demo PIN **7777** (read-only — writes are blocked server-side)

Requires Node 22+. The database file is created automatically on first run
(`rongdhonu.db`, git-ignored). The shop ships with 7 demo products, 3 categories
(শাড়ি / থ্রি-পিস / কুর্তি), SKUs, SEO meta, shipping zones and 6 FAQs seeded.

## Storefront (v2)

- Announcement bar, hero with delivery info grid (৳60 inside Dhaka / ৳120 outside,
  free delivery over ৳1000), category showcase, featured / new arrivals / discounted
  sections, flash sale with countdown, product gallery, ratings + reviews, related
  products, recently viewed, compare (up to 3), wishlist, sorting + price filter,
  search with suggestions, About / Delivery / Return policy sections with real text
  and figures, 6 FAQs, newsletter, big footer with business email + maps link.
- Bangla/English language switch for interface strings.
- Promo popup once per session (from the real promo coupon in Settings).
- Checkout: district + thana, COD / bKash / Nagad (manual — admin confirms payment),
  delivery slot, gift wrap (৳50) + message, loyalty redeem, referral code, and a
  live order summary (subtotal, all discounts, delivery, total) before ordering.
- GA4 and Facebook Pixel load only when the owner saves their own IDs in Settings.
- Coupons: `WELCOME10` (10% off, min ৳1000), `FLASH20` (20% off, min ৳2000).
- Combo offer: buy 2 get 1 free (cheapest unit free). Loyalty: 1 point per ৳100
  spent, 1 point = ৳1, redeem up to 50%. Referral: 50 points on registration,
  100 points on the referrer's side when the referred customer places an order.
- Pre-order products with an ETA. Order tracking by order number + phone.
- Customer account: register / login with phone + PIN (PIN stored as a hash only),
  multiple addresses, My Orders, reorder.
- SEO meta, Open Graph, JSON-LD Store schema, sitemap.xml, robots.txt.
  PWA manifest (install button only — no service worker / offline mode).

## Admin (22 modules, grouped sidebar)

Overview: Dashboard & analytics, Reports, Launch checklist.
Sales: Orders (bulk actions, internal notes, status flow), Customers, Payments
editable ledger ("Payment Khata"), Returns & exchanges (incl. customer self-service
requests), Coupons.
Catalog: Products, Categories & subcategories, Collections, Variants, Vendors.
Inventory & delivery: Centralised inventory + stock-movement ledger, Courier &
shipping (Steadfast bulk CSV, Pathao/RedX CSV, consignment ID / status / fee,
printable parcel label), Shipping zones.
Marketing & content: Campaigns, Banners, CMS pages, FAQs, Testimonials,
Review moderation, Product Q&A, Subscribers.
Management: Expenses ("Lav o Khoroch" — gross/net profit), Staff & roles
(Owner / Manager / Viewer — Viewer writes blocked server-side, staff + PIN change
Owner-only), Settings, Notifications, SMS queue, Audit log.

The Launch checklist ($200 pack) is a 14-point check computed from real
settings and data (domain, hosting, business email, GA4, Search Console, Pixel,
About / Delivery / Return texts, ≥10 products, real WhatsApp number, PIN changed,
gateway, courier key, SMS, support package). One-click "fill gaps" fills empty
About / Delivery / Return texts, categories, shipping zones, SKUs and SEO meta
without overwriting anything that already exists.

Exports: Orders CSV, Steadfast bulk CSV, Pathao/RedX CSV, Products CSV,
full-shop JSON backup. Product CSV import (1–200 rows).

## Deploy on Render (free tier)

A `render.yaml` Blueprint is included in this repo: on https://render.com →
New → Blueprint → connect this repo, and Render creates the service
(build `npm install`, start `npm start`, health check `/health`) for you.
Or manually:
1. Push this folder to GitHub (or use the repo it came from).
2. On https://render.com → New → Web Service → connect the repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Free plan is enough for a demo. Render gives you a
     `https://<name>.onrender.com` URL.
3. Persistence warning: Render's free tier has an ephemeral filesystem —
   `rongdhonu.db` will reset when the service restarts. For real use, attach
   a Render Disk (paid) or a managed database, and set `DB_PATH` to that
   location. For a demo, the free tier is fine.

## Order flow (invariants)

- Stock decreases on order (product + variant), restores on cancel — exactly what
  was taken, once (variant stock too; bulk cancel included). Pre-order lines take
  only the stock that exists; stock never goes below 0.
- A cancelled order is terminal and a delivered order cannot go back to
  pending/confirmed/shipped. Returns marked "received" restock exactly once,
  and never if the order was already cancelled.
- A product that appears in a live order cannot be deleted (deactivate it instead).
- Loyalty earned = floor(total / 100) when loyalty is enabled. Referral bonus
  (100 points) is paid only on the referred customer's first order.
- Free delivery when the after-discount subtotal reaches the threshold.
- The whole order is written in one transaction — a failure leaves no partial order.
- Settings saves never wipe a saved API key (empty key fields mean "unchanged")
  and a cleared number field keeps its old value instead of becoming 0.
- The launch checklist "PIN changed" item is computed from the real PIN hash —
  it is done only when the demo PIN 1234 has actually been changed.

## v2.1 audit fixes (2026-11-02)

Full audit pass (API harness + live checks) after Naim reported many things wrong:
variant stock was never restored on cancel, bulk cancel skipped the stock ledger,
pre-orders drove stock to −1, the sitemap listed API URLs (`/api/products/…`)
instead of real pages, admin CSV/backup download links returned 401 (the UI uses
plain `<a href>` links, which send no auth header), the launch checklist claimed
the PIN was "done" while 1234 was still in use, products in live orders could be
deleted, a settings save with empty key fields wiped Steadfast/SMS keys, cleared
number fields became 0, the parcel-label button crashed from the order-detail
view, product edit and generic edit were missing from the admin UI, CSV import
inserted a fake sample product, the checkout showed no order summary before
ordering, the promo popup could hijack an open cart/checkout modal, and the
storefront showed a blank page when the API was slow (free-tier cold start).
All fixed and re-tested. Testimonials are intentionally not seeded — real
customer words only. The live Render URL currently returns 404
(`x-render-routing: no-server`) on every path: no web service is running behind
that hostname yet — check the Render dashboard (service type must be Web
Service, not Static Site; check Events/Logs for a failed deploy).

## Honest limits (v2.0)

- **Payments are manual.** bKash / Nagad appear as options, but the customer sends
  money by hand and the admin confirms it. Live charging needs a real merchant
  account, API key and approval — nothing is auto-charged.
- **No live courier booking.** Steadfast / Pathao / RedX export as CSV files that
  are uploaded to the courier's panel. Live API auto-booking needs a courier
  API key in Settings.
- **No auto-SMS.** The SMS queue lists messages to send by hand; auto-send needs
  an SMS gateway key.
- **SQLite, not PostgreSQL.** The database is a local SQLite file. On a free
  hosting tier the file can reset — keep a JSON backup (Dashboard → Download).
- **No deploy, domain, or real seller test yet.** No service worker / offline PWA.

## API surface (highlights)

Public: `/api/storefront`, `/api/products`, `/api/products/:id`, `/api/reviews`,
`/api/questions`, `/api/subscribe`, `/api/coupons/preview`, `/api/orders`,
`/api/track`, `/api/my-orders`, `/api/returns/request`, `/api/customers/*`,
`/sitemap.xml`, `/robots.txt`, `/health`.
Admin (header `x-admin-token`, 12h session): `/api/admin/login`, `/api/admin/data`,
CRUD under `/api/admin/<resource>`, order status / bulk-status / note / courier /
label, stock adjust, payments, returns, staff (Owner only), settings, fill-gaps,
launch-checklist, exports, backup, product import.

## Security notes

- Admin PIN and customer PINs are stored only as SHA-256 hashes.
- API keys (Steadfast, SMS) are stored in the local DB and never returned by the API.
- The demo PIN 1234 is documented here on purpose — change it in Settings before
  any real use, and never put a real API key in the repo. `.env` and `*.db` files
  are git-ignored.

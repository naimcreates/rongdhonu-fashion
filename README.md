# Rongdhonu Fashion — Demo Boutique Storefront + Admin

A runnable standalone version of Naim's website-building service demo:
a Bangladeshi boutique storefront ("রঙধনু ফ্যাশন") with cart, checkout,
coupons, order tracking, reviews, wishlist and variants — plus a PIN-protected
admin panel with dashboard, products, categories, orders, customers, coupons,
courier/Steadfast, payments ledger and settings.

Stack: **Node.js (Express) + SQLite** (built-in `node:sqlite`, Node 22+).
No build step, no frontend framework. Data lives in `rongdhonu.db`
(created on first run; it is gitignored — never commit it).

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin — demo PIN: **1234**
  (change it in Admin → Settings. The PIN is stored only as a SHA-256 hash.)

Demo data: 7 products, categories (শাড়ি / থ্রি-পিস / কুর্তি), coupons
`WELCOME10` (10% off, min ৳1000) and `FLASH20` (20% off, min ৳2000).

Delivery: ৳60 inside Dhaka, ৳120 outside, free over ৳1000.
Payment: COD + bKash/Nagad (manual — see below).

## What is included

- Storefront: category filter, search (name/SKU/category), sorting, product
  detail with size/color variants, reviews, wishlist, cart, checkout with
  64-district + thana, gift wrap, coupons, free-delivery progress, WhatsApp
  order link, order tracking by order number + phone.
- Admin: dashboard with real totals, product CRUD (+ cost price), category
  CRUD, order status flow + bulk status + internal notes, customer list with
  loyalty points, coupon CRUD, courier tab (consignment ID/status/fee,
  Steadfast bulk CSV export), editable Payments ledger ("Payment Khata"),
  settings (shop name, WhatsApp/bKash/Nagad numbers, delivery charges, PIN).
- Exports: Orders CSV, Products CSV, Steadfast bulk CSV, full shop JSON
  backup (Admin → Dashboard) — backups never contain PIN hashes or keys.

## Deploy on Render (free tier)

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

## Connect a custom domain

1. Buy a domain (e.g. Namecheap/GoDaddy, ~$10–12/year).
2. In Render → your service → Settings → Custom Domain → add your domain.
3. At your domain registrar, add the DNS record Render shows you
   (usually a CNAME to `<name>.onrender.com`).
4. Wait a few minutes — Render issues the SSL certificate automatically
   (https). Do not share your registrar password with anyone.

## What still needs real keys / accounts (not included)

- **Live bKash/Nagad gateway** — needs a merchant account + API keys and
  merchant approval. This demo records the payment method and the shop's
  bKash/Nagad numbers; it never charges a real payment.
- **Steadfast live API auto-booking** — needs a Steadfast API key/secret
  (Settings has fields for them in the Muse version; here use the
  Steadfast bulk CSV export and upload it in the Steadfast panel).
- **SMS gateway** — needs a paid SMS provider for OTP / auto-SMS.
  Customer login in the Muse version uses PIN, not OTP, for this reason.
- **Domain + hosting** — your own accounts (see above).
- **PostgreSQL** — this standalone demo uses SQLite on purpose (zero setup).
  For a production shop with many users, move the same schema to PostgreSQL.

## Security notes

- Change the demo admin PIN (1234) before any real use.
- Never commit `.env`, `*.db`, or any API key/secret. `.gitignore` already
  covers `node_modules/`, `.env`, `*.db` and `*.sqlite`.
- This is demo code for Naim's website-building service, not a certified
  production system. Review it before putting real customer money through it.

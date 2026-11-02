// Rongdhonu Fashion — standalone boutique (Express + SQLite, Node 22+)
// Run: npm install && npm start  ->  http://localhost:3000  (admin PIN 1234)
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');
const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rongdhonu.db');
// Uploaded product pictures live here (served statically as /uploads/...).
// NOTE: on Render's free tier this folder is ephemeral — uploads vanish on
// restart/redeploy. URL pictures (image_url) survive because they are links.
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
function validImageUrl(u) {
  if (u === undefined || u === null || u === '') return '';
  const s = String(u).trim().slice(0, 500);
  if (/^https?:\/\//i.test(s) || s.startsWith('/uploads/')) return s;
  return null; // rejected: not a safe http(s) URL or a local upload path
}
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function nowIso() { return new Date().toISOString(); }
function money(n) { return Math.round(Number(n) || 0); }
function escCsv(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK (id = 1), shop_name TEXT NOT NULL DEFAULT 'রঙধনু ফ্যাশন', whatsapp_number TEXT NOT NULL DEFAULT '8801700000000', bkash_number TEXT NOT NULL DEFAULT '', nagad_number TEXT NOT NULL DEFAULT '', delivery_inside INTEGER NOT NULL DEFAULT 60, delivery_outside INTEGER NOT NULL DEFAULT 120, free_delivery_threshold INTEGER NOT NULL DEFAULT 1000, announcement TEXT NOT NULL DEFAULT '', about_text TEXT NOT NULL DEFAULT '', delivery_info TEXT NOT NULL DEFAULT '', return_policy TEXT NOT NULL DEFAULT '', pin_hash TEXT NOT NULL DEFAULT '', business_email TEXT NOT NULL DEFAULT '', maps_url TEXT NOT NULL DEFAULT '', ga4_id TEXT NOT NULL DEFAULT '', pixel_id TEXT NOT NULL DEFAULT '', gsc_code TEXT NOT NULL DEFAULT '', support_package TEXT NOT NULL DEFAULT '', support_until TEXT NOT NULL DEFAULT '', promo_code TEXT NOT NULL DEFAULT 'WELCOME10', flash_name TEXT NOT NULL DEFAULT '', flash_percent INTEGER NOT NULL DEFAULT 0, flash_ends_at TEXT NOT NULL DEFAULT '', gift_wrap_fee INTEGER NOT NULL DEFAULT 50, loyalty_enabled INTEGER NOT NULL DEFAULT 1, combo_enabled INTEGER NOT NULL DEFAULT 1, combo_buy INTEGER NOT NULL DEFAULT 2, combo_free INTEGER NOT NULL DEFAULT 1, preorder_enabled INTEGER NOT NULL DEFAULT 1, steadfast_api_key TEXT NOT NULL DEFAULT '', steadfast_secret TEXT NOT NULL DEFAULT '', sms_api_key TEXT NOT NULL DEFAULT '', bkash_username TEXT NOT NULL DEFAULT '', nagad_username TEXT NOT NULL DEFAULT '', seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '', pickup_address TEXT NOT NULL DEFAULT '', hotline TEXT NOT NULL DEFAULT '', hero_image_url TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, parent_id INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subcategories (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS collections (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', product_ids TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL, cost_price INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0, sku TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', image_emoji TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, seo_title TEXT NOT NULL DEFAULT '', seo_description TEXT NOT NULL DEFAULT '', vendor_id INTEGER NOT NULL DEFAULT 0, allow_preorder INTEGER NOT NULL DEFAULT 0, preorder_eta TEXT NOT NULL DEFAULT '', tags TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS variants (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '', price_delta INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS product_images (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, label TEXT NOT NULL DEFAULT '', colour TEXT NOT NULL DEFAULT '#7a1f2b', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS product_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, customer_name TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, address TEXT NOT NULL DEFAULT '', loyalty_points INTEGER NOT NULL DEFAULT 0, pin_hash TEXT NOT NULL DEFAULT '', referral_code TEXT NOT NULL DEFAULT '', referred_by TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS customer_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER NOT NULL, label TEXT NOT NULL DEFAULT 'বাড়ি', address TEXT NOT NULL, district TEXT NOT NULL DEFAULT '', is_default INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, percent INTEGER NOT NULL, min_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL, customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, district TEXT NOT NULL DEFAULT '', thana TEXT NOT NULL DEFAULT '', subtotal INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, coupon_code TEXT NOT NULL DEFAULT '', flash_discount INTEGER NOT NULL DEFAULT 0, bundle_discount INTEGER NOT NULL DEFAULT 0, delivery_charge INTEGER NOT NULL, total INTEGER NOT NULL, payment_method TEXT NOT NULL DEFAULT 'COD', payment_status TEXT NOT NULL DEFAULT 'pending', status TEXT NOT NULL DEFAULT 'pending', consignment_id TEXT NOT NULL DEFAULT '', courier_status TEXT NOT NULL DEFAULT '', courier_fee INTEGER NOT NULL DEFAULT 0, courier TEXT NOT NULL DEFAULT 'Steadfast', gift_wrap INTEGER NOT NULL DEFAULT 0, gift_message TEXT NOT NULL DEFAULT '', delivery_slot TEXT NOT NULL DEFAULT '', has_preorder INTEGER NOT NULL DEFAULT 0, internal_note TEXT NOT NULL DEFAULT '', loyalty_earned INTEGER NOT NULL DEFAULT 0, loyalty_redeemed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id INTEGER NOT NULL, product_name TEXT NOT NULL, variant_label TEXT NOT NULL DEFAULT '', qty INTEGER NOT NULL, price INTEGER NOT NULL, variant_id INTEGER NOT NULL DEFAULT 0, stock_taken INTEGER NOT NULL DEFAULT 0, variant_taken INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, amount INTEGER NOT NULL, reference TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE, customer_name TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', approved INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '', position TEXT NOT NULL DEFAULT 'hero', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS campaigns (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', discount_percent INTEGER NOT NULL DEFAULT 0, start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS cms_pages (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS faqs (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, answer TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS testimonials (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT NOT NULL, comment TEXT NOT NULL, rating INTEGER NOT NULL DEFAULT 5, approved INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shipping_zones (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, districts TEXT NOT NULL DEFAULT '', charge INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS staff (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'manager', pin_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS returns (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, order_number TEXT NOT NULL, phone TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT 'return', status TEXT NOT NULL DEFAULT 'requested', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sms_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, message TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS stock_movements (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, qty INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vendors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', commission_percent INTEGER NOT NULL DEFAULT 10, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscribers (id INTEGER PRIMARY KEY AUTOINCREMENT, contact TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS referrals (id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_phone TEXT NOT NULL, referred_phone TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
`);
// Migrate older v1 databases: add columns if missing
function addCol(table, col, def) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all().map(c => c.name);
  if (!cols.includes(col)) { try { db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + col + ' ' + def); } catch (_) {} }
}
[['settings','business_email',"TEXT NOT NULL DEFAULT ''"],['settings','maps_url',"TEXT NOT NULL DEFAULT ''"],['settings','ga4_id',"TEXT NOT NULL DEFAULT ''"],['settings','pixel_id',"TEXT NOT NULL DEFAULT ''"],['settings','gsc_code',"TEXT NOT NULL DEFAULT ''"],['settings','support_package',"TEXT NOT NULL DEFAULT ''"],['settings','support_until',"TEXT NOT NULL DEFAULT ''"],['settings','promo_code',"TEXT NOT NULL DEFAULT 'WELCOME10'"],['settings','flash_name',"TEXT NOT NULL DEFAULT ''"],['settings','flash_percent',"INTEGER NOT NULL DEFAULT 0"],['settings','flash_ends_at',"TEXT NOT NULL DEFAULT ''"],['settings','gift_wrap_fee',"INTEGER NOT NULL DEFAULT 50"],['settings','loyalty_enabled',"INTEGER NOT NULL DEFAULT 1"],['settings','combo_enabled',"INTEGER NOT NULL DEFAULT 1"],['settings','combo_buy',"INTEGER NOT NULL DEFAULT 2"],['settings','combo_free',"INTEGER NOT NULL DEFAULT 1"],['settings','preorder_enabled',"INTEGER NOT NULL DEFAULT 1"],['settings','steadfast_api_key',"TEXT NOT NULL DEFAULT ''"],['settings','steadfast_secret',"TEXT NOT NULL DEFAULT ''"],['settings','sms_api_key',"TEXT NOT NULL DEFAULT ''"],['settings','bkash_username',"TEXT NOT NULL DEFAULT ''"],['settings','nagad_username',"TEXT NOT NULL DEFAULT ''"],['settings','seo_title',"TEXT NOT NULL DEFAULT ''"],['settings','seo_description',"TEXT NOT NULL DEFAULT ''"],['settings','pickup_address',"TEXT NOT NULL DEFAULT ''"],['settings','hotline',"TEXT NOT NULL DEFAULT ''"],['products','image_url',"TEXT NOT NULL DEFAULT ''"],['settings','hero_image_url',"TEXT NOT NULL DEFAULT ''"],['products','seo_title',"TEXT NOT NULL DEFAULT ''"],['products','seo_description',"TEXT NOT NULL DEFAULT ''"],['products','vendor_id',"INTEGER NOT NULL DEFAULT 0"],['products','allow_preorder',"INTEGER NOT NULL DEFAULT 0"],['products','preorder_eta',"TEXT NOT NULL DEFAULT ''"],['products','tags',"TEXT NOT NULL DEFAULT ''"],['categories','parent_id',"INTEGER NOT NULL DEFAULT 0"],['orders','flash_discount',"INTEGER NOT NULL DEFAULT 0"],['orders','bundle_discount',"INTEGER NOT NULL DEFAULT 0"],['orders','delivery_slot',"TEXT NOT NULL DEFAULT ''"],['orders','has_preorder',"INTEGER NOT NULL DEFAULT 0"],['orders','courier_label',"TEXT NOT NULL DEFAULT ''"],['order_items','variant_id',"INTEGER NOT NULL DEFAULT 0"],['order_items','stock_taken',"INTEGER NOT NULL DEFAULT 0"],['order_items','variant_taken',"INTEGER NOT NULL DEFAULT 0"],['customers','pin_hash',"TEXT NOT NULL DEFAULT ''"],['customers','referral_code',"TEXT NOT NULL DEFAULT ''"],['customers','referred_by',"TEXT NOT NULL DEFAULT ''"]].forEach(a => addCol(a[0], a[1], a[2]));

function audit(actor, action, detail) { try { db.prepare('INSERT INTO audit_logs (actor, action, detail, created_at) VALUES (?, ?, ?, ?)').run(actor, action, detail || '', nowIso()); } catch (_) {} }
function notify(title, body) { try { db.prepare('INSERT INTO notifications (title, body, created_at) VALUES (?, ?, ?)').run(title, body || '', nowIso()); } catch (_) {} }
function queueSms(phone, message) { try { db.prepare('INSERT INTO sms_queue (phone, message, created_at) VALUES (?, ?, ?)').run(phone, message, nowIso()); } catch (_) {} }
function getSettings() { return db.prepare('SELECT * FROM settings WHERE id = 1').get(); }
function publicSettings() { const s = getSettings(); if (!s) return {}; const { pin_hash, steadfast_api_key, steadfast_secret, sms_api_key, bkash_username, nagad_username, ...rest } = s; return { ...rest, steadfast_ready: Boolean(s.steadfast_api_key), bkash_ready: Boolean(s.bkash_username), nagad_ready: Boolean(s.nagad_username), sms_ready: Boolean(s.sms_api_key) }; }

// ---------- seed + fill gaps (idempotent, never overwrites) ----------
function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM settings').get().c === 0) {
    db.prepare("INSERT INTO settings (id, shop_name, whatsapp_number, delivery_inside, delivery_outside, free_delivery_threshold, announcement, about_text, delivery_info, return_policy, pin_hash, business_email, maps_url, hotline, pickup_address, seo_title, seo_description) VALUES (1, 'রঙধনু ফ্যাশন', '8801700000000', 60, 120, 1000, 'ঈদ অফার — সব শাড়িতে ১০% ছাড়!', ?, ?, ?, ?, 'hello@rongdhonufashion.example', 'https://maps.google.com/?q=Dhaka', '01700000000', 'রঙধনু ফ্যাশন, ঢাকা, বাংলাদেশ', 'রঙধনু ফ্যাশন — শাড়ি, থ্রি-পিস ও কুর্তি | সারা দেশে ক্যাশ অন ডেলিভারি', 'রঙধনু ফ্যাশন — হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি। ঢাকায় ৳৬০, ঢাকার বাইরে ৳১২০ ডেলিভারি। ৳১,০০০+ অর্ডারে ফ্রি ডেলিভারি।')")
      .run('রঙধনু ফ্যাশন — ঢাকার একটি ছোট বুটিক। আমরা হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি সারা দেশে ডেলিভারি দিই। মানসম্মত কাপড়, সঠিক দাম ও যত্নশীল সেবাই আমাদের অঙ্গীকার।',
        'ঢাকার ভিতরে ডেলিভারি চার্জ ৳৬০, ঢাকার বাইরে ৳১২০। ৳১,০০০ বা তার বেশি অর্ডারে ডেলিভারি সম্পূর্ণ ফ্রি। অর্ডার কনফার্মের পর ঢাকায় ১–২ দিনে ও ঢাকার বাইরে ২–৪ দিনে ডেলিভারি হয়। Steadfast / Pathao / RedX কুরিয়ারে পার্সেল পাঠানো হয়।',
        'পণ্য হাতে পাওয়ার ৪৮ ঘণ্টার মধ্যে ত্রুটিপূর্ণ বা ভুল পণ্য বদলানো যাবে। পণ্য অব্যবহৃত ও ট্যাগসহ থাকতে হবে। এক্সচেঞ্জের ক্ষেত্রে ডেলিভারি চার্জ প্রযোজ্য হতে পারে। রিটার্ন অনুরোধ করতে ট্র্যাকিং পেজ থেকে আবেদন করুন অথবা WhatsApp-এ জানান।', sha256('1234'));
  }
  if (db.prepare('SELECT COUNT(*) c FROM products').get().c === 0) {
    const insC = db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)');
    ['শাড়ি', 'থ্রি-পিস', 'কুর্তি'].forEach(c => insC.run(c, nowIso()));
    const insP = db.prepare('INSERT INTO products (name, category, price, cost_price, stock, sku, description, featured, seo_title, seo_description, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insV = db.prepare('INSERT INTO variants (product_id, size, color, sku, price_delta, stock) VALUES (?, ?, ?, ?, ?, ?)');
    const items = [
      ['লাল জামদানি শাড়ি', 'শাড়ি', 4850, 3200, 8, 'SKU-001', 'হাতে বোনা জামদানি, উৎসবের জন্য সেরা।', 1, 'jamdani, shari, lal'],
      ['নীল লিনেন শাড়ি', 'শাড়ি', 3650, 2400, 5, 'SKU-002', 'হালকা লিনেন, গরমে আরামদায়ক।', 0, 'linen, shari, nil'],
      ['হলুদ কুর্তি প্যান্ট সেট', 'কুর্তি', 1680, 1100, 12, 'SKU-003', 'দৈনন্দিন পরার জন্য আরামদায়ক কুর্তি সেট।', 1, 'kurti, holud'],
      ['সবুজ থ্রি-পিস', 'থ্রি-পিস', 2150, 1450, 10, 'SKU-004', 'সুতি থ্রি-পিস, তিনটি রঙে পাওয়া যায়।', 0, 'three-piece, sobuj'],
      ['গোলাপি কুর্তি সেট', 'কুর্তি', 1450, 950, 15, 'SKU-005', 'নরম কাপড়ের কুর্তি সেট।', 0, 'kurti, golapi'],
      ['কালো জর্জেট শাড়ি', 'শাড়ি', 2950, 1900, 6, 'SKU-006', 'পার্টি ও অনুষ্ঠানের জন্য জর্জেট শাড়ি।', 0, 'georgette, shari, kalo'],
      ['সাদা চিকন থ্রি-পিস', 'থ্রি-পিস', 2450, 1600, 7, 'SKU-007', 'চিকন কাজের প্রিমিয়াম থ্রি-পিস।', 0, 'three-piece, sada'],
    ];
    items.forEach(it => {
      const r = insP.run(it[0], it[1], it[2], it[3], it[4], it[5], it[6], it[7], it[0] + ' — রঙধনু ফ্যাশন', it[6] + ' সারা দেশে ক্যাশ অন ডেলিভারি।', it[8], nowIso());
      if (it[1] === 'কুর্তি' || it[1] === 'থ্রি-পিস') {
        insV.run(r.lastInsertRowid, 'M', '', it[5] + '-M', 0, Math.max(2, Math.floor(it[4] / 2)));
        insV.run(r.lastInsertRowid, 'L', '', it[5] + '-L', 100, Math.max(2, Math.floor(it[4] / 2)));
      }
      const colours = { 'শাড়ি': '#7a1f2b', 'থ্রি-পিস': '#4a5d43', 'কুর্তি': '#5b4a68' };
      db.prepare('INSERT INTO product_images (product_id, label, colour, created_at) VALUES (?, ?, ?, ?)').run(r.lastInsertRowid, 'মূল ছবি', colours[it[1]] || '#7a1f2b', nowIso());
      db.prepare('INSERT INTO product_images (product_id, label, colour, created_at) VALUES (?, ?, ?, ?)').run(r.lastInsertRowid, 'বিস্তারিত', '#3f3a36', nowIso());
    });
    db.prepare("INSERT INTO coupons (code, percent, min_order) VALUES ('WELCOME10', 10, 1000), ('FLASH20', 20, 2000)").run();
    db.prepare("INSERT INTO reviews (product_id, customer_name, rating, comment, created_at) VALUES (1, 'আয়েশা', 5, 'শাড়িটা খুব সুন্দর, কাপড় ভালো।', ?), (3, 'রিমা', 4, 'সাইজ ঠিকঠাক, ডেলিভারি দ্রুত।', ?)").run(nowIso(), nowIso());
  }
  fillGaps();
}
function fillGaps() {
  const s = getSettings(); if (!s) return 0;
  let filled = 0;
  const set = (f, v) => { if (!String(s[f] || '').trim()) { db.prepare('UPDATE settings SET ' + f + ' = ? WHERE id = 1').run(v); filled++; } };
  set('about_text', 'রঙধনু ফ্যাশন — ঢাকার একটি ছোট বুটিক। আমরা হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি সারা দেশে ডেলিভারি দিই। মানসম্মত কাপড়, সঠিক দাম ও যত্নশীল সেবাই আমাদের অঙ্গীকার।');
  set('delivery_info', 'ঢাকার ভিতরে ডেলিভারি চার্জ ৳৬০, ঢাকার বাইরে ৳১২০। ৳১,০০০ বা তার বেশি অর্ডারে ডেলিভারি সম্পূর্ণ ফ্রি। অর্ডার কনফার্মের পর ঢাকায় ১–২ দিনে ও ঢাকার বাইরে ২–৪ দিনে ডেলিভারি হয়।');
  set('return_policy', 'পণ্য হাতে পাওয়ার ৪৮ ঘণ্টার মধ্যে ত্রুটিপূর্ণ বা ভুল পণ্য বদলানো যাবে। পণ্য অব্যবহৃত ও ট্যাগসহ থাকতে হবে।');
  set('seo_title', 'রঙধনু ফ্যাশন — শাড়ি, থ্রি-পিস ও কুর্তি | সারা দেশে ক্যাশ অন ডেলিভারি');
  set('seo_description', 'রঙধনু ফ্যাশন — হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি। ঢাকায় ৳৬০, ঢাকার বাইরে ৳১২০ ডেলিভারি।');
  set('pickup_address', 'রঙধনু ফ্যাশন, ঢাকা, বাংলাদেশ');
  set('business_email', 'hello@rongdhonufashion.example');
  set('maps_url', 'https://maps.google.com/?q=Dhaka');
  set('hotline', '01700000000');
  if (db.prepare('SELECT COUNT(*) c FROM categories').get().c === 0) { ['শাড়ি', 'থ্রি-পিস', 'কুর্তি'].forEach(c => db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)').run(c, nowIso())); filled++; }
  if (db.prepare('SELECT COUNT(*) c FROM shipping_zones').get().c === 0) { db.prepare("INSERT INTO shipping_zones (name, districts, charge, created_at) VALUES ('ঢাকার ভিতরে', 'ঢাকা', 60, ?), ('ঢাকার বাইরে', 'সারা দেশ', 120, ?)").run(nowIso(), nowIso()); filled++; }
  if (db.prepare('SELECT COUNT(*) c FROM faqs').get().c === 0) {
    const faqs = [['ডেলিভারি চার্জ কত?', 'ঢাকার ভিতরে ৳৬০, ঢাকার বাইরে ৳১২০। ৳১,০০০ বা তার বেশি অর্ডারে ডেলিভারি ফ্রি।'], ['পেমেন্ট কীভাবে করব?', 'ক্যাশ অন ডেলিভারি, বিকাশ বা নগদে পেমেন্ট করা যায়। বিকাশ/নগদে পেমেন্ট করলে অর্ডারের পর দোকান থেকে নম্বর জানিয়ে দেওয়া হবে।'], ['ডেলিভারি পেতে কতদিন লাগবে?', 'ঢাকায় ১–২ দিন, ঢাকার বাইরে ২–৪ দিন।'], ['পণ্য বদলানো যাবে কি?', 'হ্যাঁ — হাতে পাওয়ার ৪৮ ঘণ্টার মধ্যে ত্রুটিপূর্ণ বা ভুল পণ্য বদলানো যাবে।'], ['অর্ডার কীভাবে ট্র্যাক করব?', 'অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে "অর্ডার ট্র্যাক করুন" থেকে স্ট্যাটাস দেখা যাবে।'], ['সাইজ কীভাবে বুঝব?', 'প্রতিটি পণ্যের বিস্তারিত পেজে সাইজ ও মাপের তথ্য দেওয়া আছে। প্রয়োজনে WhatsApp-এ জিজ্ঞাসা করুন।']];
    const ins = db.prepare('INSERT INTO faqs (question, answer, created_at) VALUES (?, ?, ?)');
    faqs.forEach(f => ins.run(f[0], f[1], nowIso())); filled++;
  }
  if (db.prepare('SELECT COUNT(*) c FROM staff').get().c === 0) { db.prepare("INSERT INTO staff (name, role, pin_hash, created_at) VALUES ('Viewer Demo', 'viewer', ?, ?)").run(sha256('7777'), nowIso()); filled++; }
  // Testimonials are deliberately NOT seeded — real customer words only, added by the admin.
  if (db.prepare('SELECT COUNT(*) c FROM cms_pages').get().c === 0) { db.prepare("INSERT INTO cms_pages (slug, title, body, created_at) VALUES ('about', 'আমাদের সম্পর্কে', 'রঙধনু ফ্যাশন — ঢাকার একটি ছোট বুটিক।', ?), ('delivery', 'ডেলিভারি নীতি', 'ঢাকায় ৳৬০, বাইরে ৳১২০।', ?), ('return', 'রিটার্ন নীতি', '৪৮ ঘণ্টার মধ্যে বদলানো যাবে।', ?)").run(nowIso(), nowIso(), nowIso()); filled++; }
  db.prepare('SELECT * FROM products').all().forEach((p, i) => {
    if (!p.sku) { db.prepare('UPDATE products SET sku = ? WHERE id = ?').run('SKU-00' + (i + 1), p.id); filled++; }
    if (!p.seo_title) { db.prepare('UPDATE products SET seo_title = ?, seo_description = ? WHERE id = ?').run(p.name + ' — রঙধনু ফ্যাশন', (p.description || p.name) + ' সারা দেশে ক্যাশ অন ডেলিভারি।', p.id); filled++; }
  });
  return filled;
}
seed();

function getProductsWithExtras() {
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  return products.map(p => ({
    ...p,
    variants: db.prepare('SELECT * FROM variants WHERE product_id = ?').all(p.id),
    images: db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY id').all(p.id),
    avgRating: db.prepare('SELECT COALESCE(ROUND(AVG(rating),1),0) r FROM reviews WHERE product_id = ? AND approved = 1').get(p.id).r,
    reviewCount: db.prepare('SELECT COUNT(*) c FROM reviews WHERE product_id = ? AND approved = 1').get(p.id).c,
    soldCount: db.prepare('SELECT COALESCE(SUM(qty),0) s FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = ? AND o.status != ?').get(p.id, 'cancelled').s,
  }));
}
function flashActive() {
  const s = getSettings();
  if (!s || !s.flash_name || !s.flash_percent) return null;
  if (s.flash_ends_at && new Date(s.flash_ends_at) < new Date()) return null;
  return s;
}

// ---------- public API ----------
app.get('/api/storefront', (req, res) => {
  res.json({ settings: publicSettings(), categories: db.prepare('SELECT * FROM categories ORDER BY name').all(),
    subcategories: db.prepare('SELECT * FROM subcategories ORDER BY name').all(),
    collections: db.prepare('SELECT * FROM collections WHERE active = 1 ORDER BY id').all(),
    banners: db.prepare('SELECT * FROM banners WHERE active = 1 ORDER BY id').all(),
    campaigns: db.prepare('SELECT * FROM campaigns WHERE active = 1 ORDER BY id').all(),
    cms_pages: db.prepare('SELECT * FROM cms_pages ORDER BY id').all(),
    faqs: db.prepare('SELECT * FROM faqs ORDER BY id').all(),
    testimonials: db.prepare('SELECT * FROM testimonials WHERE approved = 1 ORDER BY id').all(),
    shipping_zones: db.prepare('SELECT * FROM shipping_zones ORDER BY id').all(),
    vendors: db.prepare('SELECT * FROM vendors ORDER BY id').all(),
    products: getProductsWithExtras() });
});
app.get('/api/products', (req, res) => {
  const { search = '', category = '', sort = '', min = '', max = '', vendor = '' } = req.query;
  let list = getProductsWithExtras().filter(p => p.active);
  if (category) list = list.filter(p => p.category === category);
  if (vendor) list = list.filter(p => String(p.vendor_id) === String(vendor));
  if (min !== '') list = list.filter(p => p.price >= Number(min));
  if (max !== '') list = list.filter(p => p.price <= Number(max));
  if (search) { const q = search.toLowerCase(); list = list.filter(p => (p.name + ' ' + p.sku + ' ' + p.category + ' ' + (p.tags || '')).toLowerCase().includes(q)); }
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a, b) => b.avgRating - a.avgRating);
  else if (sort === 'discount') list.sort((a, b) => b.soldCount - a.soldCount);
  res.json(list);
});
app.get('/api/products/:id', (req, res) => {
  const p = getProductsWithExtras().find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Product not found' });
  p.reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY id DESC').all(p.id);
  p.questions = db.prepare('SELECT * FROM product_questions WHERE product_id = ? ORDER BY id DESC').all(p.id);
  res.json(p);
});
app.post('/api/reviews', (req, res) => {
  const { product_id, customer_name, rating, comment } = req.body || {};
  if (!product_id || !customer_name || !comment) return res.status(400).json({ error: 'নাম ও মন্তব্য দিন' });
  const r = Number(rating);
  if (!(r >= 1 && r <= 5)) return res.status(400).json({ error: 'রেটিং ১–৫ হতে হবে' });
  db.prepare('INSERT INTO reviews (product_id, customer_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(Number(product_id), String(customer_name).slice(0, 60), r, String(comment).slice(0, 500), nowIso());
  res.json({ ok: true });
});
app.post('/api/questions', (req, res) => {
  const { product_id, customer_name, question } = req.body || {};
  if (!product_id || !customer_name || !question) return res.status(400).json({ error: 'নাম ও প্রশ্ন দিন' });
  db.prepare('INSERT INTO product_questions (product_id, customer_name, question, created_at) VALUES (?, ?, ?, ?)').run(Number(product_id), String(customer_name).slice(0, 60), String(question).slice(0, 500), nowIso());
  res.json({ ok: true });
});
app.post('/api/subscribe', (req, res) => {
  const contact = String((req.body || {}).contact || '').trim();
  if (!contact || contact.length < 5) return res.status(400).json({ error: 'সঠিক মোবাইল বা ইমেইল দিন' });
  try { db.prepare('INSERT INTO subscribers (contact, created_at) VALUES (?, ?)').run(contact, nowIso()); } catch (_) { return res.json({ ok: true, note: 'already' }); }
  res.json({ ok: true });
});
app.post('/api/coupons/preview', (req, res) => {
  const { code, subtotal } = req.body || {};
  const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(code || '').trim().toUpperCase());
  if (!c) return res.json({ ok: false, error: 'কুপন পাওয়া যায়নি' });
  if (money(subtotal) < c.min_order) return res.json({ ok: false, error: 'এই কুপনে কমপক্ষে ৳' + c.min_order + ' লাগবে' });
  res.json({ ok: true, percent: c.percent, discount: Math.round(money(subtotal) * c.percent / 100) });
});
app.get('/sitemap.xml', (req, res) => {
  const base = req.protocol + '://' + req.get('host');
  const urls = db.prepare('SELECT * FROM products WHERE active = 1').all().map(p => '  <url><loc>' + base + '/?product=' + p.id + '</loc></url>').join('\n');
  res.setHeader('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>' + base + '/</loc></url>\n' + urls + '\n</urlset>');
});
app.get('/robots.txt', (req, res) => { const base = req.protocol + '://' + req.get('host'); res.type('text/plain').send('User-agent: *\nAllow: /\nSitemap: ' + base + '/sitemap.xml\n'); });

const PHONE_RE = /^(\+880|880|0)1[3-9]\d{8}$/;
function normPhone(p) { return String(p || '').replace(/[\s-]/g, ''); }
app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!b.name || String(b.name).trim().length < 3) return res.status(400).json({ error: 'সঠিক নাম দিন' });
  if (!PHONE_RE.test(normPhone(b.phone))) return res.status(400).json({ error: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' });
  if (!b.address || String(b.address).trim().length < 5) return res.status(400).json({ error: 'সঠিক ঠিকানা দিন' });
  if (!items.length) return res.status(400).json({ error: 'কার্ট খালি' });
  const settings = getSettings();
  let subtotal = 0; const lines = []; let hasPreorder = 0;
  for (const it of items) {
    const p = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(it.product_id));
    if (!p) return res.status(400).json({ error: 'পণ্য পাওয়া যায়নি' });
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    let price = p.price; let label = ''; let variant = null;
    const preorderOk = Boolean(p.allow_preorder && settings.preorder_enabled);
    if (it.variant_id) {
      variant = db.prepare('SELECT * FROM variants WHERE id = ? AND product_id = ?').get(Number(it.variant_id), p.id);
      if (!variant) return res.status(400).json({ error: 'ভ্যারিয়েন্ট পাওয়া যায়নি' });
      price = p.price + variant.price_delta; label = [variant.size, variant.color].filter(Boolean).join(' / ');
    }
    // Stock actually available: variant stock if a variant was chosen, else product stock.
    // Only that much is taken; the rest (if any) is a pre-order. Stock never goes below 0.
    const avail = variant ? variant.stock : p.stock;
    if (avail < qty && !preorderOk) return res.status(400).json({ error: p.name + ' — স্টক শেষ' });
    const stockTaken = Math.min(qty, Math.max(0, avail));
    if (stockTaken < qty) hasPreorder = 1;
    subtotal += price * qty; lines.push({ p, qty, price, label, variant, variant_id: it.variant_id || null, stockTaken });
  }
  // Combo: buy N get M free — cheapest units free
  let bundleDiscount = 0;
  if (settings.combo_enabled) {
    const buy = settings.combo_buy || 2, free = settings.combo_free || 1, group = buy + free;
    const unitPrices = [];
    lines.forEach(l => { for (let i = 0; i < l.qty; i++) unitPrices.push(l.price); });
    unitPrices.sort((a, b) => a - b);
    const groups = Math.floor(unitPrices.length / group);
    bundleDiscount = unitPrices.slice(0, groups * free).reduce((a, x) => a + x, 0);
  }
  let discount = 0; let couponCode = '';
  if (b.coupon_code) {
    const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(b.coupon_code).trim().toUpperCase());
    if (c && subtotal >= c.min_order) { discount = Math.round(subtotal * c.percent / 100); couponCode = c.code; }
  }
  let flashDiscount = 0;
  const flash = flashActive();
  if (flash) flashDiscount = Math.round((subtotal - discount - bundleDiscount) * flash.flash_percent / 100);
  // Loyalty redeem: 1 point = ৳1, max 50% of order
  let loyaltyRedeemed = 0;
  if (b.redeem_points) {
    const cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(String(b.phone).trim());
    if (cust && settings.loyalty_enabled) loyaltyRedeemed = Math.min(cust.loyalty_points, Math.floor((subtotal - discount - bundleDiscount - flashDiscount) / 2), Number(b.redeem_points) || 0);
  }
  const isDhaka = String(b.district || '').toLowerCase().includes('dhaka') || String(b.district || '').includes('ঢাকা');
  let delivery = isDhaka ? settings.delivery_inside : settings.delivery_outside;
  const afterDisc = subtotal - discount - bundleDiscount - flashDiscount - loyaltyRedeemed;
  if (afterDisc >= settings.free_delivery_threshold) delivery = 0;
  const giftFee = b.gift_wrap ? settings.gift_wrap_fee : 0;
  const total = afterDisc + delivery + giftFee;
  const orderNumber = 'RF-' + String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
  const loyaltyEarned = settings.loyalty_enabled ? Math.floor(total / 100) : 0;
  // Referral bonus is for the referred customer's FIRST order only — check before inserting.
  const isFirstOrder = db.prepare("SELECT COUNT(*) c FROM orders WHERE phone = ? AND status != 'cancelled'").get(String(b.phone).trim()).c === 0;
  // Whole order is one transaction: a failure half-way leaves no partial order/stock behind.
  try {
  db.exec('BEGIN');
  const ins = db.prepare('INSERT INTO orders (order_number, customer_name, phone, address, district, thana, subtotal, discount, coupon_code, flash_discount, bundle_discount, delivery_charge, total, payment_method, status, courier, gift_wrap, gift_message, delivery_slot, has_preorder, loyalty_earned, loyalty_redeemed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, \'pending\', \'Steadfast\', ?, ?, ?, ?, ?, ?, ?)');
  const r = ins.run(orderNumber, String(b.name).trim(), String(b.phone).trim(), String(b.address).trim(), String(b.district || ''), String(b.thana || ''), subtotal, discount, couponCode, flashDiscount, bundleDiscount, delivery, total, b.payment_method || 'COD', b.gift_wrap ? 1 : 0, String(b.gift_message || ''), String(b.delivery_slot || ''), hasPreorder, loyaltyEarned, loyaltyRedeemed, nowIso());
  const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, variant_label, qty, price, variant_id, stock_taken, variant_taken) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const l of lines) {
    // Take only what was available (stockTaken); never below 0. Variant lines also
    // draw down the product-level stock by the same amount (capped at what it has).
    const pTake = Math.min(l.stockTaken, Math.max(0, l.p.stock));
    const vTake = l.variant ? l.stockTaken : 0;
    insItem.run(r.lastInsertRowid, l.p.id, l.p.name, l.label, l.qty, l.price, l.variant_id ? Number(l.variant_id) : 0, pTake, vTake);
    if (vTake > 0) db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?').run(vTake, l.variant_id);
    if (pTake > 0) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(pTake, l.p.id);
      db.prepare('INSERT INTO stock_movements (product_id, qty, reason, created_at) VALUES (?, ?, ?, ?)').run(l.p.id, -pTake, 'order ' + orderNumber, nowIso());
    }
  }
  let cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(String(b.phone).trim());
  if (!cust) {
    const cr = db.prepare('INSERT INTO customers (name, phone, address, loyalty_points, referral_code, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(String(b.name).trim(), String(b.phone).trim(), String(b.address).trim(), loyaltyEarned, 'RF' + String(b.phone).trim().slice(-4), nowIso());
    cust = { id: cr.lastInsertRowid };
  } else {
    db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ? - ? WHERE id = ?').run(loyaltyEarned, loyaltyRedeemed, cust.id);
  }
  if (b.referral_code && cust && isFirstOrder) {
    const ref = db.prepare('SELECT * FROM customers WHERE referral_code = ?').get(String(b.referral_code).trim().toUpperCase());
    const already = ref ? db.prepare('SELECT COUNT(*) c FROM referrals WHERE referrer_phone = ? AND referred_phone = ?').get(ref.phone, String(b.phone).trim()).c : 1;
    if (ref && ref.phone !== String(b.phone).trim() && !already) {
      db.prepare('INSERT INTO referrals (referrer_phone, referred_phone, points, created_at) VALUES (?, ?, ?, ?)').run(ref.phone, String(b.phone).trim(), 100, nowIso());
      db.prepare('UPDATE customers SET loyalty_points = loyalty_points + 100 WHERE id = ?').run(ref.id);
    }
  }
  notify('নতুন অর্ডার', orderNumber + ' — ৳' + total);
  queueSms(String(b.phone).trim(), 'রঙধনু ফ্যাশন: আপনার অর্ডার ' + orderNumber + ' পেয়েছি। মোট ৳' + total + '। ধন্যবাদ!');
  db.exec('COMMIT');
  } catch (e) { try { db.exec('ROLLBACK'); } catch (_) {} console.error('order failed', e); return res.status(500).json({ error: 'অর্ডার সেভ হয়নি — আবার চেষ্টা করুন' }); }
  const waText = encodeURIComponent('অর্ডার ' + orderNumber + '\nনাম: ' + b.name + '\nমোট: ৳' + total + '\nপেমেন্ট: ' + (b.payment_method || 'COD'));
  res.json({ ok: true, order_number: orderNumber, total, delivery_charge: delivery, discount, flash_discount: flashDiscount, bundle_discount: bundleDiscount, loyalty_earned: loyaltyEarned, loyalty_redeemed: loyaltyRedeemed, whatsapp_url: 'https://wa.me/' + settings.whatsapp_number + '?text=' + waText });
});
app.get('/api/track', (req, res) => {
  const { order_number, phone } = req.query;
  if (!order_number || !phone) return res.status(400).json({ error: 'অর্ডার নম্বর ও ফোন দিন' });
  const o = db.prepare('SELECT * FROM orders WHERE order_number = ? AND phone = ?').get(String(order_number).trim(), String(phone).trim());
  if (!o) return res.json({ ok: false, error: 'অর্ডার পাওয়া যায়নি — নম্বর/ফোন মিলিয়ে দেখুন' });
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  res.json({ ok: true, order: o });
});
app.get('/api/my-orders', (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'ফোন দিন' });
  const orders = db.prepare('SELECT * FROM orders WHERE phone = ? ORDER BY id DESC').all(String(phone).trim());
  orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id); });
  const cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(String(phone).trim());
  res.json({ ok: true, orders, loyalty_points: cust ? cust.loyalty_points : 0, referral_code: cust ? cust.referral_code : '' });
});
app.post('/api/returns/request', (req, res) => {
  const b = req.body || {};
  const o = db.prepare('SELECT * FROM orders WHERE order_number = ? AND phone = ?').get(String(b.order_number || '').trim(), String(b.phone || '').trim());
  if (!o) return res.status(400).json({ error: 'অর্ডার নম্বর ও ফোন মেলেনি' });
  const ex = db.prepare('SELECT * FROM returns WHERE order_id = ? AND status = ?').get(o.id, 'requested');
  if (ex) return res.json({ ok: true, id: ex.id, note: 'already' });
  const r = db.prepare('INSERT INTO returns (order_id, order_number, phone, reason, type, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(o.id, o.order_number, o.phone, String(b.reason || '').slice(0, 300), String(b.type || 'return'), nowIso());
  notify('রিটার্ন অনুরোধ', o.order_number + ' — ' + String(b.type || 'return'));
  res.json({ ok: true, id: r.lastInsertRowid });
});
// Customer account (phone + PIN, no OTP — PIN stored as hash)
const custSessions = new Map();
app.post('/api/customers/register', (req, res) => {
  const b = req.body || {};
  if (!b.name || String(b.name).trim().length < 3) return res.status(400).json({ error: 'সঠিক নাম দিন' });
  if (!PHONE_RE.test(normPhone(b.phone))) return res.status(400).json({ error: 'সঠিক মোবাইল নম্বর দিন' });
  if (!/^\d{4,8}$/.test(String(b.pin || ''))) return res.status(400).json({ error: 'PIN ৪–৮ সংখ্যার হতে হবে' });
  const phone = String(b.phone).trim();
  let cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  if (cust && cust.pin_hash) return res.status(400).json({ error: 'এই নম্বরে অ্যাকাউন্ট আগেই আছে — লগইন করুন' });
  if (!cust) {
    const r = db.prepare('INSERT INTO customers (name, phone, address, loyalty_points, pin_hash, referral_code, referred_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(String(b.name).trim(), phone, String(b.address || ''), 50, sha256(String(b.pin)), 'RF' + phone.slice(-4), String(b.referral_code || ''), nowIso());
    cust = { id: r.lastInsertRowid };
    if (b.referral_code) { const ref = db.prepare('SELECT * FROM customers WHERE referral_code = ?').get(String(b.referral_code).trim().toUpperCase()); if (ref && ref.phone !== phone) { db.prepare('INSERT INTO referrals (referrer_phone, referred_phone, points, created_at) VALUES (?, ?, ?, ?)').run(ref.phone, phone, 50, nowIso()); db.prepare('UPDATE customers SET loyalty_points = loyalty_points + 50 WHERE id = ?').run(ref.id); } }
  } else {
    db.prepare('UPDATE customers SET pin_hash = ?, name = ? WHERE id = ?').run(sha256(String(b.pin)), String(b.name).trim(), cust.id);
    db.prepare('UPDATE customers SET loyalty_points = loyalty_points + 50 WHERE id = ?').run(cust.id);
  }
  const token = crypto.randomBytes(24).toString('hex');
  custSessions.set(token, { customer_id: cust.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const fresh = db.prepare('SELECT loyalty_points FROM customers WHERE id = ?').get(cust.id);
  res.json({ ok: true, token, loyalty_points: fresh ? fresh.loyalty_points : 50 });
});
app.post('/api/customers/login', (req, res) => {
  const b = req.body || {};
  const cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(String(b.phone || '').trim());
  if (!cust || !cust.pin_hash || sha256(String(b.pin || '')) !== cust.pin_hash) return res.status(401).json({ error: 'ভুল ফোন বা PIN' });
  const token = crypto.randomBytes(24).toString('hex');
  custSessions.set(token, { customer_id: cust.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  res.json({ ok: true, token, name: cust.name, loyalty_points: cust.loyalty_points, referral_code: cust.referral_code });
});
function custAuth(req, res, next) {
  const s = custSessions.get(req.headers['x-customer-token']);
  if (!s || s.expires < Date.now()) return res.status(401).json({ error: 'লগইন করুন' });
  req.customer_id = s.customer_id; next();
}
app.get('/api/customers/me', custAuth, (req, res) => {
  const c = db.prepare('SELECT id, name, phone, address, loyalty_points, referral_code FROM customers WHERE id = ?').get(req.customer_id);
  const addrs = db.prepare('SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id').all(req.customer_id);
  res.json({ ok: true, customer: c, addresses: addrs });
});
app.post('/api/customers/addresses', custAuth, (req, res) => {
  const b = req.body || {};
  if (!b.address || String(b.address).trim().length < 5) return res.status(400).json({ error: 'সঠিক ঠিকানা দিন' });
  db.prepare('INSERT INTO customer_addresses (customer_id, label, address, district, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(req.customer_id, String(b.label || 'বাড়ি'), String(b.address), String(b.district || ''), b.is_default ? 1 : 0, nowIso());
  res.json({ ok: true });
});

// ---------- admin auth (PIN, Owner 1234 default; staff PINs) ----------
const sessions = new Map();
function adminAuth(req, res, next) {
  // Header token (fetch) or ?token= query param (plain <a href> downloads in the admin UI)
  const tok = req.headers['x-admin-token'] || req.query.token;
  const s = sessions.get(tok);
  if (!s || s.expires < Date.now()) return res.status(401).json({ error: 'লগইন করুন' });
  req.admin = s; next();
}
function requireWrite(req, res, next) {
  if (req.admin.role === 'viewer') return res.status(403).json({ error: 'আপনার রোলে এই কাজের অনুমতি নেই (Viewer শুধু দেখতে পারবে)' });
  next();
}
function requireOwner(req, res, next) {
  if (req.admin.role !== 'owner') return res.status(403).json({ error: 'শুধু Owner এই কাজ করতে পারবে' });
  next();
}
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body || {};
  const settings = getSettings();
  if (sha256(String(pin || '')) === settings.pin_hash) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { role: 'owner', name: 'Owner', expires: Date.now() + 12 * 60 * 60 * 1000 });
    audit('Owner', 'login', 'Admin login');
    return res.json({ ok: true, token, role: 'owner', name: 'Owner' });
  }
  const st = db.prepare('SELECT * FROM staff WHERE pin_hash = ? AND active = 1').get(sha256(String(pin || '')));
  if (st) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, { role: st.role, name: st.name, expires: Date.now() + 12 * 60 * 60 * 1000 });
    audit(st.name, 'login', 'Staff login (' + st.role + ')');
    return res.json({ ok: true, token, role: st.role, name: st.name });
  }
  return res.status(401).json({ error: 'ভুল PIN' });
});
function adminData() {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const products = getProductsWithExtras();
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'").get().s;
  const today = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'").get().s;
  const month = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status != 'cancelled'").get().s;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) s FROM expenses').get().s;
  const cogs = db.prepare('SELECT COALESCE(SUM(oi.qty * p.cost_price),0) s FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN orders o ON o.id = oi.order_id WHERE o.status != ?').get('cancelled').s;
  const daily = db.prepare("SELECT date(created_at) d, COALESCE(SUM(total),0) total, COUNT(*) orders FROM orders WHERE status != 'cancelled' AND date(created_at) >= date('now','-6 days') GROUP BY d ORDER BY d").all();
  const byCategory = db.prepare("SELECT p.category AS category, COALESCE(SUM(oi.qty * oi.price),0) AS total FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN orders o ON o.id = oi.order_id WHERE o.status != 'cancelled' GROUP BY p.category").all();
  return {
    totals: { revenue, today, month, orders: orders.length, products: products.length, pending: orders.filter(o => o.status === 'pending').length, customers: db.prepare('SELECT COUNT(*) c FROM customers').get().c, expenses, grossProfit: revenue - cogs, netProfit: revenue - cogs - expenses, cogs },
    analytics: { daily, byCategory, byPayment: db.prepare("SELECT payment_method method, COALESCE(SUM(total),0) total, COUNT(*) orders FROM orders WHERE status != 'cancelled' GROUP BY payment_method").all(), byDistrict: db.prepare("SELECT district, COUNT(*) orders, COALESCE(SUM(total),0) total FROM orders WHERE status != 'cancelled' GROUP BY district ORDER BY orders DESC LIMIT 5").all(), topProducts: products.slice().sort((a, b) => b.soldCount - a.soldCount).slice(0, 5) },
    orders: orders.map(o => ({ ...o, items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) })),
    products, categories: db.prepare('SELECT * FROM categories ORDER BY name').all(),
    subcategories: db.prepare('SELECT * FROM subcategories ORDER BY name').all(),
    collections: db.prepare('SELECT * FROM collections ORDER BY id').all(),
    variants: db.prepare('SELECT v.*, p.name product_name FROM variants v JOIN products p ON p.id = v.product_id ORDER BY v.id').all(),
    inventory: db.prepare('SELECT p.id, p.name, p.sku, p.stock, COALESCE(SUM(v.stock),0) variant_stock, p.cost_price FROM products p LEFT JOIN variants v ON v.product_id = p.id GROUP BY p.id ORDER BY p.id').all(),
    stock_movements: db.prepare('SELECT sm.*, p.name product_name FROM stock_movements sm JOIN products p ON p.id = sm.product_id ORDER BY sm.id DESC LIMIT 100').all(),
    customers: db.prepare('SELECT * FROM customers ORDER BY id DESC').all(),
    coupons: db.prepare('SELECT * FROM coupons ORDER BY id').all(),
    payments: db.prepare('SELECT * FROM payments ORDER BY id DESC').all(),
    banners: db.prepare('SELECT * FROM banners ORDER BY id').all(),
    campaigns: db.prepare('SELECT * FROM campaigns ORDER BY id').all(),
    cms_pages: db.prepare('SELECT * FROM cms_pages ORDER BY id').all(),
    faqs: db.prepare('SELECT * FROM faqs ORDER BY id').all(),
    testimonials: db.prepare('SELECT * FROM testimonials ORDER BY id').all(),
    reviews: db.prepare('SELECT r.*, p.name product_name FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.id DESC').all(),
    product_questions: db.prepare('SELECT pq.*, p.name product_name FROM product_questions pq JOIN products p ON p.id = pq.product_id ORDER BY pq.id DESC').all(),
    shipping_zones: db.prepare('SELECT * FROM shipping_zones ORDER BY id').all(),
    staff: db.prepare('SELECT id, name, role, active, created_at FROM staff ORDER BY id').all(),
    expenses: db.prepare('SELECT * FROM expenses ORDER BY id DESC').all(),
    returns: db.prepare('SELECT * FROM returns ORDER BY id DESC').all(),
    notifications: db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 50').all(),
    sms_queue: db.prepare('SELECT * FROM sms_queue ORDER BY id DESC LIMIT 50').all(),
    vendors: db.prepare('SELECT * FROM vendors ORDER BY id').all(),
    subscribers: db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all(),
    referrals: db.prepare('SELECT * FROM referrals ORDER BY id DESC LIMIT 50').all(),
    settings: publicSettings(),
    audit: db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all(),
  };
}
app.get('/api/admin/data', adminAuth, (req, res) => res.json(adminData()));
app.post('/api/admin/fill-gaps', adminAuth, requireWrite, (req, res) => { const n = fillGaps(); audit(req.admin.name, 'fill_gaps', n + ' gaps filled'); res.json({ ok: true, filled: n }); });
app.get('/api/admin/launch-checklist', adminAuth, (req, res) => {
  const s = getSettings();
  const items = [
    { id: 'domain', label: 'নিজের ডোমেইন', done: false, hint: 'Namecheap/GoDaddy থেকে কিনুন (~$10–12/বছর)' },
    { id: 'hosting', label: 'হোস্টিং + SSL', done: Boolean(process.env.RENDER), hint: 'Render/Vercel ফ্রি টিয়ার — SSL অটো (এখনো Render-এ deploy হয়নি)' },
    { id: 'email', label: 'ব্যবসায়িক ইমেইল', done: Boolean(s.business_email && !s.business_email.includes('example')), hint: 'Settings → ব্যবসায়িক ইমেইল বসান' },
    { id: 'ga4', label: 'Google Analytics (GA4)', done: Boolean(s.ga4_id), hint: 'Settings → GA4 ID বসান' },
    { id: 'gsc', label: 'Google Search Console', done: Boolean(s.gsc_code), hint: 'Settings → GSC verification কোড বসান' },
    { id: 'pixel', label: 'Facebook Pixel', done: Boolean(s.pixel_id), hint: 'Settings → Pixel ID বসান' },
    { id: 'about', label: 'About / ডেলিভারি / রিটার্ন লেখা', done: Boolean(s.about_text && s.delivery_info && s.return_policy), hint: 'Settings থেকে লেখা যাবে' },
    { id: 'products', label: 'আসল পণ্য আপলোড (কমপক্ষে ১০টি)', done: db.prepare('SELECT COUNT(*) c FROM products').get().c >= 10, hint: 'Products → CSV import বা একে একে যোগ করুন' },
    { id: 'whatsapp', label: 'আসল WhatsApp নম্বর', done: s.whatsapp_number !== '8801700000000', hint: 'Settings → WhatsApp নম্বর বদলান' },
    { id: 'pin', label: 'অ্যাডমিন PIN বদলানো', done: s.pin_hash !== sha256('1234'), hint: 'Settings → নতুন PIN (ডেমো PIN 1234 বদলে নিন)' },
    { id: 'gateway', label: 'বিকাশ/নগদ গেটওয়ে প্রস্তুতি', done: Boolean(s.bkash_username || s.nagad_username), hint: 'মার্চেন্ট অ্যাকাউন্ট + key লাগবে' },
    { id: 'courier', label: 'Steadfast API key', done: Boolean(s.steadfast_api_key), hint: 'Settings → Steadfast key বসান, না হলে CSV হ্যান্ডওভার' },
    { id: 'sms', label: 'SMS গেটওয়ে', done: Boolean(s.sms_api_key), hint: 'SMS provider-এর key লাগবে' },
    { id: 'support', label: 'সাপোর্ট প্যাকেজ ও মেয়াদ', done: Boolean(s.support_package), hint: 'Settings → সাপোর্ট প্যাকেজ বসান' },
  ];
  res.json({ items, done: items.filter(i => i.done).length, total: items.length });
});

// Generic admin CRUD helpers
function crud(table, fields, opts = {}) {
  const base = '/api/admin/' + table;
  app.post(base, adminAuth, requireWrite, (req, res) => {
    const b = req.body || {};
    if (opts.validate) { const e = opts.validate(b); if (e) return res.status(400).json({ error: e }); }
    const cols = fields.filter(f => b[f] !== undefined);
    const vals = cols.map(f => b[f]);
    try {
      const r = db.prepare('INSERT INTO ' + table + ' (' + cols.join(',') + ', created_at) VALUES (' + cols.map(() => '?').join(',') + ', ?)').run(...vals, nowIso());
      audit(req.admin.name, table + '_create', String(b.name || b.title || b.code || r.lastInsertRowid));
      res.json({ ok: true, id: r.lastInsertRowid });
    } catch (e) { res.status(400).json({ error: 'সেভ হয়নি — হয়তো একই নাম/কোড আগেই আছে' }); }
  });
  app.put(base + '/:id', adminAuth, requireWrite, (req, res) => {
    const b = req.body || {};
    const cols = fields.filter(f => b[f] !== undefined);
    if (!cols.length) return res.json({ ok: true });
    try {
      db.prepare('UPDATE ' + table + ' SET ' + cols.map(f => f + ' = ?').join(', ') + ' WHERE id = ?').run(...cols.map(f => b[f]), Number(req.params.id));
    } catch (e) { return res.status(400).json({ error: 'সেভ হয়নি — হয়তো একই নাম/কোড আগেই আছে' }); }
    audit(req.admin.name, table + '_update', 'id ' + req.params.id);
    res.json({ ok: true });
  });
  app.delete(base + '/:id', adminAuth, requireWrite, (req, res) => {
    try { db.prepare('DELETE FROM ' + table + ' WHERE id = ?').run(Number(req.params.id)); }
    catch (e) { return res.status(400).json({ error: 'মোছা যায়নি' }); }
    audit(req.admin.name, table + '_delete', 'id ' + req.params.id);
    res.json({ ok: true });
  });
}
crud('collections', ['name', 'description', 'product_ids', 'active']);
crud('banners', ['title', 'subtitle', 'position', 'active']);
crud('campaigns', ['name', 'description', 'discount_percent', 'start_date', 'end_date', 'active']);
crud('cms_pages', ['slug', 'title', 'body']);
crud('faqs', ['question', 'answer']);
crud('testimonials', ['customer_name', 'comment', 'rating', 'approved']);
crud('shipping_zones', ['name', 'districts', 'charge']);
crud('vendors', ['name', 'phone', 'commission_percent']);
crud('expenses', ['category', 'amount', 'note']);
crud('subcategories', ['category_id', 'name']);

// Products / categories / coupons / variants / inventory
app.post('/api/admin/products', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.category || !(Number(b.price) > 0)) return res.status(400).json({ error: 'নাম, ক্যাটাগরি ও সঠিক দাম দিন' });
  if (Number(b.stock) < 0) return res.status(400).json({ error: 'স্টক ০ বা বেশি হতে হবে' });
  const imageUrl = validImageUrl(b.image_url);
  if (imageUrl === null) return res.status(400).json({ error: 'ছবির লিংক সঠিক নয় — http(s) লিংক বা আপলোড করা ছবি দিন' });
  try {
  const r = db.prepare('INSERT INTO products (name, category, price, cost_price, stock, sku, description, image_emoji, image_url, featured, seo_title, seo_description, vendor_id, allow_preorder, preorder_eta, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(String(b.name).slice(0, 120), String(b.category), money(b.price), money(b.cost_price), money(b.stock), String(b.sku || ''), String(b.description || ''), '', imageUrl, b.featured ? 1 : 0, String(b.seo_title || ''), String(b.seo_description || ''), Number(b.vendor_id || 0), b.allow_preorder ? 1 : 0, String(b.preorder_eta || ''), String(b.tags || ''), nowIso());
  audit(req.admin.name, 'product_create', String(b.name));
  res.json({ ok: true, id: r.lastInsertRowid });
  } catch (e) { return res.status(400).json({ error: 'পণ্য সেভ হয়নি — আবার চেষ্টা করুন' }); }
});
app.put('/api/admin/products/:id', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  if (!b.name || !(Number(b.price) > 0)) return res.status(400).json({ error: 'নাম ও সঠিক দাম দিন' });
  if (Number(b.stock) < 0) return res.status(400).json({ error: 'স্টক ০ বা বেশি হতে হবে' });
  const cur = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id));
  if (!cur) return res.status(404).json({ error: 'পণ্য পাওয়া যায়নি' });
  // Preserve the existing picture when no new picture is given — never wipe
  // image_url just because the edit form did not send it. An explicit empty
  // string means "remove the picture".
  let imageUrl = cur.image_url || '';
  if (b.image_url !== undefined) {
    const v = validImageUrl(b.image_url);
    if (v === null) return res.status(400).json({ error: 'ছবির লিংক সঠিক নয় — http(s) লিংক বা আপলোড করা ছবি দিন' });
    imageUrl = v;
  }
  try {
  db.prepare('UPDATE products SET name=?, category=?, price=?, cost_price=?, stock=?, sku=?, description=?, image_url=?, featured=?, active=?, seo_title=?, seo_description=?, vendor_id=?, allow_preorder=?, preorder_eta=?, tags=? WHERE id=?')
    .run(String(b.name).slice(0, 120), String(b.category), money(b.price), money(b.cost_price), money(b.stock), String(b.sku || ''), String(b.description || ''), imageUrl, b.featured ? 1 : 0, b.active === false ? 0 : 1, String(b.seo_title || ''), String(b.seo_description || ''), Number(b.vendor_id || 0), b.allow_preorder ? 1 : 0, String(b.preorder_eta || ''), String(b.tags || ''), Number(req.params.id));
  } catch (e) { return res.status(400).json({ error: 'পণ্য আপডেট হয়নি — আবার চেষ্টা করুন' }); }
  audit(req.admin.name, 'product_update', String(b.name));
  res.json({ ok: true, image_url: imageUrl });
});
// Product picture upload: jpg/png/webp, max 5MB, stored under public/uploads/.
// Requires admin write auth (viewer blocked). Accepts multipart form field "image".
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.jpg';
      cb(null, 'product-' + Number(req.params.id) + '-' + Date.now() + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    cb(new Error('শুধু JPG, PNG বা WebP ছবি আপলোড করা যাবে'));
  },
});
app.post('/api/admin/products/:id/image', adminAuth, requireWrite, (req, res) => {
  const pid = Number(req.params.id);
  const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(pid);
  if (!prod) return res.status(404).json({ error: 'পণ্য পাওয়া যায়নি' });
  imageUpload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'ছবি ৫MB-এর বেশি হতে পারবে না' : (err.message || 'আপলোড হয়নি') });
    if (!req.file) return res.status(400).json({ error: 'ছবির ফাইল দিন' });
    const imageUrl = '/uploads/' + req.file.filename;
    // Remove the previous locally-uploaded picture (best effort — never block).
    if (prod.image_url && prod.image_url.startsWith('/uploads/')) {
      try { fs.unlinkSync(path.join(__dirname, 'public', prod.image_url.replace(/^\/+/, ''))); } catch (_) {}
    }
    db.prepare('UPDATE products SET image_url = ? WHERE id = ?').run(imageUrl, pid);
    audit(req.admin.name, 'product_image_upload', prod.name + ' -> ' + imageUrl);
    res.json({ ok: true, image_url: imageUrl });
  });
});
app.delete('/api/admin/products/:id', adminAuth, requireWrite, (req, res) => {
  const id = Number(req.params.id);
  const inOrders = db.prepare("SELECT COUNT(*) c FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = ? AND o.status != 'cancelled'").get(id).c;
  if (inOrders > 0) return res.status(400).json({ error: 'এই পণ্য সক্রিয় অর্ডারে আছে — আগে অর্ডার বাতিল করুন, অথবা পণ্যটি নিষ্ক্রিয় (active=0) করুন' });
  db.prepare('DELETE FROM products WHERE id = ?').run(id); audit(req.admin.name, 'product_delete', 'id ' + req.params.id); res.json({ ok: true });
});
app.post('/api/admin/categories', adminAuth, requireWrite, (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'ক্যাটাগরির নাম দিন' });
  try { db.prepare('INSERT INTO categories (name, parent_id, created_at) VALUES (?, ?, ?)').run(name, Number((req.body || {}).parent_id || 0), nowIso()); } catch (_) { return res.status(400).json({ error: 'এই ক্যাটাগরি আগেই আছে' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/categories/:id', adminAuth, requireWrite, (req, res) => { db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/coupons', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {}; const code = String(b.code || '').trim().toUpperCase();
  if (!code || !(Number(b.percent) > 0 && Number(b.percent) <= 90)) return res.status(400).json({ error: 'সঠিক কোড ও ছাড়ের % (১–৯০) দিন' });
  try { db.prepare('INSERT INTO coupons (code, percent, min_order) VALUES (?, ?, ?)').run(code, Number(b.percent), money(b.min_order)); } catch (_) { return res.status(400).json({ error: 'এই কোড আগেই আছে' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/coupons/:id', adminAuth, requireWrite, (req, res) => { db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/variants', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  if (!b.product_id) return res.status(400).json({ error: 'পণ্য বেছে নিন' });
  db.prepare('INSERT INTO variants (product_id, size, color, sku, price_delta, stock) VALUES (?, ?, ?, ?, ?, ?)').run(Number(b.product_id), String(b.size || ''), String(b.color || ''), String(b.sku || ''), money(b.price_delta), money(b.stock));
  res.json({ ok: true });
});
app.delete('/api/admin/variants/:id', adminAuth, requireWrite, (req, res) => { db.prepare('DELETE FROM variants WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/stock/adjust', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  const qty = Number(b.qty);
  if (!b.product_id || !qty || qty === 0) return res.status(400).json({ error: 'পণ্য ও সঠিক পরিমাণ দিন (ধনাত্মক = যোগ, ঋণাত্মক = কম)' });
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(b.product_id));
  if (!p) return res.status(404).json({ error: 'পণ্য পাওয়া যায়নি' });
  if (p.stock + qty < 0) return res.status(400).json({ error: 'স্টক ০-এর নিচে যাবে — পরিমাণ কমান' });
  db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(qty, p.id);
  db.prepare('INSERT INTO stock_movements (product_id, qty, reason, created_at) VALUES (?, ?, ?, ?)').run(p.id, qty, String(b.reason || 'manual adjustment').slice(0, 200), nowIso());
  audit(req.admin.name, 'stock_adjust', p.name + ' ' + (qty > 0 ? '+' : '') + qty);
  res.json({ ok: true, stock: p.stock + qty });
});
app.post('/api/admin/stock-alerts/:id/notify', adminAuth, requireWrite, (req, res) => { res.json({ ok: true, note: 'WhatsApp-এ জানানোর লিংক তৈরি হয়েছে' }); });

// Restore exactly what an order took from stock (product + variant), once.
function restoreStockForOrder(o, reason) {
  db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id).forEach(it => {
    const pTake = it.stock_taken || 0, vTake = it.variant_taken || 0;
    if (pTake > 0) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(pTake, it.product_id);
      db.prepare('INSERT INTO stock_movements (product_id, qty, reason, created_at) VALUES (?, ?, ?, ?)').run(it.product_id, pTake, reason + ' ' + o.order_number, nowIso());
    }
    if (vTake > 0 && it.variant_id) db.prepare('UPDATE variants SET stock = stock + ? WHERE id = ?').run(vTake, it.variant_id);
  });
}
// Status moves that are never allowed: out of cancelled (terminal), or back from delivered.
function statusMoveAllowed(from, to) {
  if (from === to) return true;
  if (from === 'cancelled') return false;
  if (from === 'delivered' && (to === 'pending' || to === 'confirmed' || to === 'shipped')) return false;
  return true;
}

// Orders
app.post('/api/admin/orders/:id/status', adminAuth, requireWrite, (req, res) => {
  const { status } = req.body || {};
  const ok = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!ok.includes(status)) return res.status(400).json({ error: 'ভুল স্ট্যাটাস' });
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
  if (!statusMoveAllowed(o.status, status)) return res.status(400).json({ error: 'এই স্ট্যাটাস পরিবর্তন করা যাবে না (' + o.status + ' → ' + status + ')' });
  if (status === 'cancelled' && o.status !== 'cancelled') restoreStockForOrder(o, 'cancel');
  if (status === 'shipped' && o.status !== 'shipped') queueSms(o.phone, 'রঙধনু ফ্যাশন: আপনার অর্ডার ' + o.order_number + ' পাঠানো হয়েছে।');
  if (status === 'delivered' && o.status !== 'delivered') queueSms(o.phone, 'রঙধনু ফ্যাশন: আপনার অর্ডার ' + o.order_number + ' ডেলিভারি হয়েছে। ধন্যবাদ!');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, o.id);
  audit(req.admin.name, 'order_status', o.order_number + ' -> ' + status);
  res.json({ ok: true });
});
app.post('/api/admin/orders/bulk-status', adminAuth, requireWrite, (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'অর্ডার সিলেক্ট করুন' });
  let updated = 0, skipped = 0;
  for (const id of ids) {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));
    if (!o || !statusMoveAllowed(o.status, status)) { skipped++; continue; }
    if (status === 'cancelled' && o.status !== 'cancelled') restoreStockForOrder(o, 'cancel');
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, o.id); updated++;
  }
  audit(req.admin.name, 'order_bulk_status', updated + ' orders -> ' + status + (skipped ? ' (' + skipped + ' বাদ)' : ''));
  res.json({ ok: true, updated, skipped });
});
app.post('/api/admin/orders/:id/note', adminAuth, requireWrite, (req, res) => { db.prepare('UPDATE orders SET internal_note = ? WHERE id = ?').run(String((req.body || {}).note || '').slice(0, 500), Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/orders/:id/courier', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  db.prepare('UPDATE orders SET consignment_id = ?, courier_status = ?, courier_fee = ?, courier = ? WHERE id = ?').run(String(b.consignment_id || ''), String(b.courier_status || ''), money(b.courier_fee), String(b.courier || 'Steadfast'), Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/orders/:id/label', adminAuth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  res.json({ ok: true, label: o });
});
// Returns
app.post('/api/admin/returns/:id/status', adminAuth, requireWrite, (req, res) => {
  const { status } = req.body || {};
  const ok = ['requested', 'approved', 'received', 'exchanged', 'refunded', 'rejected'];
  if (!ok.includes(status)) return res.status(400).json({ error: 'ভুল স্ট্যাটাস' });
  const r = db.prepare('SELECT * FROM returns WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'রিটার্ন পাওয়া যায়নি' });
  if (status === 'received' && r.status !== 'received') {
    const ord = db.prepare('SELECT * FROM orders WHERE id = ?').get(r.order_id);
    // Restock only what the order actually took, and never if the order was cancelled
    // (cancel already restored it — restocking again would invent stock).
    if (ord && ord.status !== 'cancelled') restoreStockForOrder(ord, 'return received');
  }
  db.prepare('UPDATE returns SET status = ? WHERE id = ?').run(status, r.id);
  audit(req.admin.name, 'return_status', r.order_number + ' -> ' + status);
  res.json({ ok: true });
});
// Reviews moderation + Q&A answers
app.post('/api/admin/reviews/:id/approve', adminAuth, requireWrite, (req, res) => { db.prepare('UPDATE reviews SET approved = ? WHERE id = ?').run(req.body && req.body.approved === false ? 0 : 1, Number(req.params.id)); res.json({ ok: true }); });
app.delete('/api/admin/reviews/:id', adminAuth, requireWrite, (req, res) => { db.prepare('DELETE FROM reviews WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/questions/:id/answer', adminAuth, requireWrite, (req, res) => { db.prepare('UPDATE product_questions SET answer = ? WHERE id = ?').run(String((req.body || {}).answer || '').slice(0, 500), Number(req.params.id)); res.json({ ok: true }); });
// Payments ledger
app.post('/api/admin/payments', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  if (!(money(b.amount) > 0) || !b.method) return res.status(400).json({ error: 'পেমেন্ট মাধ্যম ও সঠিক টাকা দিন' });
  db.prepare('INSERT INTO payments (method, amount, reference, note, created_at) VALUES (?, ?, ?, ?, ?)').run(String(b.method), money(b.amount), String(b.reference || ''), String(b.note || ''), nowIso());
  res.json({ ok: true });
});
app.delete('/api/admin/payments/:id', adminAuth, requireWrite, (req, res) => { db.prepare('DELETE FROM payments WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
// Staff (owner only)
app.post('/api/admin/staff', adminAuth, requireOwner, (req, res) => {
  const b = req.body || {};
  if (!b.name || !/^\d{4,8}$/.test(String(b.pin || ''))) return res.status(400).json({ error: 'নাম ও ৪–৮ সংখ্যার PIN দিন' });
  if (!['owner', 'manager', 'viewer'].includes(b.role)) return res.status(400).json({ error: 'ভুল রোল' });
  db.prepare('INSERT INTO staff (name, role, pin_hash, created_at) VALUES (?, ?, ?, ?)').run(String(b.name).slice(0, 80), b.role, sha256(String(b.pin)), nowIso());
  audit(req.admin.name, 'staff_create', String(b.name) + ' (' + b.role + ')');
  res.json({ ok: true });
});
app.delete('/api/admin/staff/:id', adminAuth, requireOwner, (req, res) => { db.prepare('DELETE FROM staff WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
// Notifications / SMS
app.post('/api/admin/notifications/:id/read', adminAuth, (req, res) => { db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(Number(req.params.id)); res.json({ ok: true }); });
app.post('/api/admin/sms/:id/sent', adminAuth, requireWrite, (req, res) => { db.prepare("UPDATE sms_queue SET status = 'sent' WHERE id = ?").run(Number(req.params.id)); res.json({ ok: true }); });
// Settings (owner only for PIN change; other fields manager+)
app.post('/api/admin/settings', adminAuth, requireWrite, (req, res) => {
  const b = req.body || {};
  const cur = getSettings();
  let pinHash = cur.pin_hash;
  if (b.new_pin) {
    if (req.admin.role !== 'owner') return res.status(403).json({ error: 'PIN বদলাতে শুধু Owner পারবে' });
    if (!/^\d{4,8}$/.test(String(b.new_pin))) return res.status(400).json({ error: 'PIN ৪–৮ সংখ্যার হতে হবে' });
    pinHash = sha256(String(b.new_pin));
  }
  const fields = ['shop_name', 'whatsapp_number', 'bkash_number', 'nagad_number', 'announcement', 'about_text', 'delivery_info', 'return_policy', 'business_email', 'maps_url', 'ga4_id', 'pixel_id', 'gsc_code', 'support_package', 'support_until', 'promo_code', 'flash_name', 'flash_ends_at', 'steadfast_api_key', 'steadfast_secret', 'sms_api_key', 'bkash_username', 'nagad_username', 'seo_title', 'seo_description', 'pickup_address', 'hotline', 'hero_image_url'];
  const vals = {};
  // API keys: the admin form sends empty fields when the key is unchanged — an empty
  // string must NEVER wipe a saved key. Only a non-empty value overwrites it.
  const keyFields = ['steadfast_api_key', 'steadfast_secret', 'sms_api_key'];
  fields.forEach(f => {
    if (keyFields.includes(f)) vals[f] = (b[f] !== undefined && String(b[f]).trim() !== '') ? String(b[f]) : cur[f];
    else vals[f] = b[f] !== undefined ? String(b[f]) : cur[f];
  });
  // Numeric fields: an empty/cleared input means "keep current", never 0.
  const numOrCur = (v, curV) => (v === undefined || v === '' || v === null) ? curV : money(v);
  if (vals.ga4_id && !/^G-[A-Z0-9]{4,}$/.test(vals.ga4_id)) return res.status(400).json({ error: 'GA4 ID ভুল ফরম্যাট (যেমন G-ABC1234)' });
  if (vals.pixel_id && !/^\d{6,}$/.test(vals.pixel_id)) return res.status(400).json({ error: 'Facebook Pixel ID শুধু সংখ্যা হতে হবে' });
  db.prepare('UPDATE settings SET shop_name=?, whatsapp_number=?, bkash_number=?, nagad_number=?, delivery_inside=?, delivery_outside=?, free_delivery_threshold=?, announcement=?, about_text=?, delivery_info=?, return_policy=?, pin_hash=?, business_email=?, maps_url=?, ga4_id=?, pixel_id=?, gsc_code=?, support_package=?, support_until=?, promo_code=?, flash_name=?, flash_percent=?, flash_ends_at=?, gift_wrap_fee=?, loyalty_enabled=?, combo_enabled=?, combo_buy=?, combo_free=?, preorder_enabled=?, steadfast_api_key=?, steadfast_secret=?, sms_api_key=?, bkash_username=?, nagad_username=?, seo_title=?, seo_description=?, pickup_address=?, hotline=?, hero_image_url=? WHERE id=1')
    .run(vals.shop_name.slice(0, 120), vals.whatsapp_number, vals.bkash_number, vals.nagad_number, numOrCur(b.delivery_inside, cur.delivery_inside), numOrCur(b.delivery_outside, cur.delivery_outside), numOrCur(b.free_delivery_threshold, cur.free_delivery_threshold), vals.announcement, vals.about_text, vals.delivery_info, vals.return_policy, pinHash, vals.business_email, vals.maps_url, vals.ga4_id, vals.pixel_id, vals.gsc_code, vals.support_package, vals.support_until, vals.promo_code, vals.flash_name, numOrCur(b.flash_percent, cur.flash_percent), vals.flash_ends_at, numOrCur(b.gift_wrap_fee, cur.gift_wrap_fee), b.loyalty_enabled === undefined ? cur.loyalty_enabled : (b.loyalty_enabled ? 1 : 0), b.combo_enabled === undefined ? cur.combo_enabled : (b.combo_enabled ? 1 : 0), numOrCur(b.combo_buy, cur.combo_buy), numOrCur(b.combo_free, cur.combo_free), b.preorder_enabled === undefined ? cur.preorder_enabled : (b.preorder_enabled ? 1 : 0), vals.steadfast_api_key, vals.steadfast_secret, vals.sms_api_key, vals.bkash_username, vals.nagad_username, vals.seo_title, vals.seo_description, vals.pickup_address, vals.hotline, (validImageUrl(vals.hero_image_url) === null ? cur.hero_image_url : (vals.hero_image_url || '')));
  audit(req.admin.name, 'settings_update', 'Store settings saved');
  res.json({ ok: true });
});
// Product CSV import (up to 200 rows)
app.post('/api/admin/products/import', adminAuth, requireWrite, (req, res) => {
  const rows = Array.isArray((req.body || {}).rows) ? req.body.rows : [];
  if (!rows.length || rows.length > 200) return res.status(400).json({ error: '১–২০০টি পণ্যের তালিকা দিন' });
  let added = 0;
  for (const r of rows) {
    if (!r.name || !(Number(r.price) > 0)) continue;
    const imageUrl = validImageUrl(r.image_url);
    db.prepare('INSERT INTO products (name, category, price, cost_price, stock, sku, description, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(String(r.name).slice(0, 120), String(r.category || 'শাড়ি'), money(r.price), money(r.cost_price), money(r.stock), String(r.sku || ''), String(r.description || ''), imageUrl === null ? '' : imageUrl, nowIso());
    added++;
  }
  audit(req.admin.name, 'product_import', added + ' products imported');
  res.json({ ok: true, added });
});

// ---------- exports ----------
app.get('/api/admin/export/orders.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
  const lines = [['Order', 'Customer', 'Phone', 'District', 'Total', 'Payment', 'Status', 'Date'].join(',')];
  rows.forEach(o => lines.push([o.order_number, o.customer_name, o.phone, o.district, o.total, o.payment_method, o.status, o.created_at].map(escCsv).join(',')));
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="orders.csv"').send(lines.join('\n'));
});
app.get('/api/admin/export/steadfast.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
  const lines = [['Invoice', 'Recipient Name', 'Recipient Phone', 'Recipient Address', 'COD Amount', 'Item Description', 'Total Lot'].join(',')];
  rows.forEach(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    const desc = items.map(i => i.product_name + ' x' + i.qty).join('; ');
    const cod = o.payment_method === 'COD' ? o.total : 0;
    lines.push([o.order_number, o.customer_name, o.phone, o.address + ', ' + o.thana + ', ' + o.district, cod, desc, items.reduce((a, i) => a + i.qty, 0)].map(escCsv).join(','));
  });
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="steadfast-bulk.csv"').send(lines.join('\n'));
});
app.get('/api/admin/export/courier.csv', adminAuth, (req, res) => {
  const courier = String(req.query.courier || 'Pathao');
  const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
  const lines = [['Invoice', 'Recipient Name', 'Recipient Phone', 'Recipient Address', 'COD Amount', 'Weight (kg)', 'Item Description'].join(',')];
  rows.forEach(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    const desc = items.map(i => i.product_name + ' x' + i.qty).join('; ');
    const cod = o.payment_method === 'COD' ? o.total : 0;
    lines.push([o.order_number, o.customer_name, o.phone, o.address + ', ' + o.thana + ', ' + o.district, cod, (items.length * 0.5).toFixed(1), desc].map(escCsv).join(','));
  });
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="' + courier.toLowerCase() + '-bulk.csv"').send(lines.join('\n'));
});
app.get('/api/admin/export/products.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
  const lines = [['SKU', 'Name', 'Category', 'Price', 'Stock'].join(',')];
  rows.forEach(p => lines.push([p.sku, p.name, p.category, p.price, p.stock].map(escCsv).join(',')));
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="products.csv"').send(lines.join('\n'));
});
app.get('/api/admin/backup', adminAuth, (req, res) => {
  res.json({ shop: publicSettings(), exported_at: nowIso(), categories: db.prepare('SELECT * FROM categories').all(), products: db.prepare('SELECT * FROM products').all(), variants: db.prepare('SELECT * FROM variants').all(), orders: db.prepare('SELECT * FROM orders').all(), order_items: db.prepare('SELECT * FROM order_items').all(), customers: db.prepare('SELECT id, name, phone, address, loyalty_points FROM customers').all(), coupons: db.prepare('SELECT * FROM coupons').all(), payments: db.prepare('SELECT * FROM payments').all() });
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
// JSON errors, never an HTML stack trace for API callers.
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'ভুল ডেটা পাঠানো হয়েছে' });
  console.error(err);
  res.status(500).json({ error: 'সার্ভারে ভুল হয়েছে — আবার চেষ্টা করুন' });
});
app.listen(PORT, () => console.log('Rongdhonu Fashion running at http://localhost:' + PORT + ' (admin PIN 1234)'));

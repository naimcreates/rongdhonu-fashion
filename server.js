// Rongdhonu Fashion — standalone demo boutique (Express + SQLite, Node 22+)
// Run: npm install && npm start  ->  http://localhost:3000  (admin PIN 1234)
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rongdhonu.db');
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function nowIso() { return new Date().toISOString(); }
function money(n) { return Math.round(Number(n) || 0); }

// ---------- schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  shop_name TEXT NOT NULL DEFAULT 'রঙধনু ফ্যাশন',
  whatsapp_number TEXT NOT NULL DEFAULT '8801700000000',
  bkash_number TEXT NOT NULL DEFAULT '',
  nagad_number TEXT NOT NULL DEFAULT '',
  delivery_inside INTEGER NOT NULL DEFAULT 60,
  delivery_outside INTEGER NOT NULL DEFAULT 120,
  free_delivery_threshold INTEGER NOT NULL DEFAULT 1000,
  announcement TEXT NOT NULL DEFAULT '',
  about_text TEXT NOT NULL DEFAULT '',
  delivery_info TEXT NOT NULL DEFAULT '',
  return_policy TEXT NOT NULL DEFAULT '',
  pin_hash TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
  price INTEGER NOT NULL, cost_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0, sku TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', image_emoji TEXT NOT NULL DEFAULT '👗',
  featured INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL DEFAULT '',
  price_delta INTEGER NOT NULL DEFAULT 0, stock INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL DEFAULT '', loyalty_points INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT UNIQUE NOT NULL, percent INTEGER NOT NULL,
  min_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '', thana TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, coupon_code TEXT NOT NULL DEFAULT '',
  delivery_charge INTEGER NOT NULL, total INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'COD', payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending', consignment_id TEXT NOT NULL DEFAULT '',
  courier_status TEXT NOT NULL DEFAULT '', courier_fee INTEGER NOT NULL DEFAULT 0,
  courier TEXT NOT NULL DEFAULT 'Steadfast', gift_wrap INTEGER NOT NULL DEFAULT 0,
  gift_message TEXT NOT NULL DEFAULT '', internal_note TEXT NOT NULL DEFAULT '',
  loyalty_earned INTEGER NOT NULL DEFAULT 0, loyalty_redeemed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL, product_name TEXT NOT NULL, variant_label TEXT NOT NULL DEFAULT '',
  qty INTEGER NOT NULL, price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT, method TEXT NOT NULL, amount INTEGER NOT NULL,
  reference TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL, rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
`);

function audit(actor, action, detail) {
  try { db.prepare('INSERT INTO audit_logs (actor, action, detail, created_at) VALUES (?, ?, ?, ?)').run(actor, action, detail || '', nowIso()); } catch (_) {}
}

// ---------- seed (demo data only, idempotent) ----------
function seed() {
  const s = db.prepare('SELECT COUNT(*) c FROM settings').get();
  if (s.c === 0) {
    db.prepare(`INSERT INTO settings (id, shop_name, whatsapp_number, delivery_inside, delivery_outside,
      free_delivery_threshold, announcement, about_text, delivery_info, return_policy, pin_hash)
      VALUES (1, 'রঙধনু ফ্যাশন', '8801700000000', 60, 120, 1000,
      'ঈদ অফার — সব শাড়িতে ১০% ছাড়!',
      'রঙধনু ফ্যাশন — ঢাকার একটি ছোট বুটিক। আমরা হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি সারা দেশে ডেলিভারি দিই।',
      'ঢাকার ভিতরে ডেলিভারি চার্জ ৳৬০, ঢাকার বাইরে ৳১২০। ৳১,০০০+ অর্ডারে ডেলিভারি ফ্রি।',
      'পণ্য হাতে পাওয়ার ৪৮ ঘণ্টার মধ্যে ত্রুটিপূর্ণ পণ্য বদলানো যাবে।',
      ?)`)
      .run(sha256('1234'));
  }
  const pc = db.prepare('SELECT COUNT(*) c FROM products').get();
  if (pc.c === 0) {
    const cats = ['শাড়ি', 'থ্রি-পিস', 'কুর্তি'];
    const insC = db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)');
    cats.forEach(c => insC.run(c, nowIso()));
    const insP = db.prepare(`INSERT INTO products (name, category, price, cost_price, stock, sku, description, image_emoji, featured, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insV = db.prepare('INSERT INTO variants (product_id, size, color, sku, price_delta, stock) VALUES (?, ?, ?, ?, ?, ?)');
    const items = [
      ['লাল জামদানি শাড়ি', 'শাড়ি', 4850, 3200, 8, 'SKU-001', 'হাতে বোনা জামদানি, উৎসবের জন্য সেরা।', '🥻', 1],
      ['নীল লিনেন শাড়ি', 'শাড়ি', 3650, 2400, 5, 'SKU-002', 'হালকা লিনেন, গরমে আরামদায়ক।', '🥻', 0],
      ['হলুদ কুর্তি প্যান্ট সেট', 'কুর্তি', 1680, 1100, 12, 'SKU-003', 'দৈনন্দিন পরার জন্য আরামদায়ক কুর্তি সেট।', '👗', 1],
      ['সবুজ থ্রি-পিস', 'থ্রি-পিস', 2150, 1450, 10, 'SKU-004', 'সুতি থ্রি-পিস, তিনটি রঙে পাওয়া যায়।', '👚', 0],
      ['গোলাপি কুর্তি সেট', 'কুর্তি', 1450, 950, 15, 'SKU-005', 'নরম কাপড়ের কুর্তি সেট।', '👗', 0],
      ['কালো জর্জেট শাড়ি', 'শাড়ি', 2950, 1900, 6, 'SKU-006', 'পার্টি ও অনুষ্ঠানের জন্য জর্জেট শাড়ি।', '🥻', 0],
      ['সাদা চিকন থ্রি-পিস', 'থ্রি-পিস', 2450, 1600, 7, 'SKU-007', 'চিকন কাজের প্রিমিয়াম থ্রি-পিস।', '👚', 0],
    ];
    items.forEach(it => {
      const r = insP.run(...it, nowIso());
      if (it[1] === 'কুর্তি' || it[1] === 'থ্রি-পিস') {
        insV.run(r.lastInsertRowid, 'M', '', it[5] + '-M', 0, Math.max(2, Math.floor(it[4] / 2)));
        insV.run(r.lastInsertRowid, 'L', '', it[5] + '-L', 100, Math.max(2, Math.floor(it[4] / 2)));
      }
    });
    db.prepare("INSERT INTO coupons (code, percent, min_order) VALUES ('WELCOME10', 10, 1000), ('FLASH20', 20, 2000)").run();
    db.prepare("INSERT INTO reviews (product_id, customer_name, rating, comment, created_at) VALUES (1, 'আয়েশা', 5, 'শাড়িটা খুব সুন্দর, কাপড় ভালো।', ?), (3, 'রিমা', 4, 'সাইজ ঠিকঠাক, ডেলিভারি দ্রুত।', ?)").run(nowIso(), nowIso());
  }
}
seed();

function getSettings() { return db.prepare('SELECT * FROM settings WHERE id = 1').get(); }
function publicSettings() {
  const s = getSettings();
  const { pin_hash, ...rest } = s;
  return rest;
}
function getProductsWithExtras() {
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  return products.map(p => ({
    ...p,
    variants: db.prepare('SELECT * FROM variants WHERE product_id = ?').all(p.id),
    avgRating: db.prepare('SELECT COALESCE(ROUND(AVG(rating),1),0) r FROM reviews WHERE product_id = ? AND approved = 1').get(p.id).r,
    reviewCount: db.prepare('SELECT COUNT(*) c FROM reviews WHERE product_id = ? AND approved = 1').get(p.id).c,
    soldCount: db.prepare('SELECT COALESCE(SUM(qty),0) s FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE oi.product_id = ? AND o.status != ?').get(p.id, 'cancelled').s,
  }));
}

// ---------- public API ----------
app.get('/api/storefront', (req, res) => {
  res.json({ settings: publicSettings(), categories: db.prepare('SELECT * FROM categories ORDER BY name').all(), products: getProductsWithExtras() });
});
app.get('/api/products', (req, res) => {
  const { search = '', category = '', sort = '' } = req.query;
  let list = getProductsWithExtras().filter(p => p.active);
  if (category) list = list.filter(p => p.category === category);
  if (search) { const q = search.toLowerCase(); list = list.filter(p => (p.name + ' ' + p.sku + ' ' + p.category).toLowerCase().includes(q)); }
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') list.sort((a, b) => b.avgRating - a.avgRating);
  res.json(list);
});
app.get('/api/products/:id', (req, res) => {
  const p = getProductsWithExtras().find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Product not found' });
  p.reviews = db.prepare('SELECT * FROM reviews WHERE product_id = ? AND approved = 1 ORDER BY id DESC').all(p.id);
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
app.post('/api/coupons/preview', (req, res) => {
  const { code, subtotal } = req.body || {};
  const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(code || '').trim().toUpperCase());
  if (!c) return res.json({ ok: false, error: 'কুপন পাওয়া যায়নি' });
  if (money(subtotal) < c.min_order) return res.json({ ok: false, error: `এই কুপনে কমপক্ষে ৳${c.min_order} লাগবে` });
  res.json({ ok: true, percent: c.percent, discount: Math.round(money(subtotal) * c.percent / 100) });
});

const PHONE_RE = /^(\+880|880|0)1[3-9]\d{8}$/;
app.post('/api/orders', (req, res) => {
  const b = req.body || {};
  const items = Array.isArray(b.items) ? b.items : [];
  if (!b.name || String(b.name).trim().length < 3) return res.status(400).json({ error: 'সঠিক নাম দিন' });
  if (!PHONE_RE.test(String(b.phone || '').replace(/[\s-]/g, ''))) return res.status(400).json({ error: 'সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)' });
  if (!b.address || String(b.address).trim().length < 5) return res.status(400).json({ error: 'সঠিক ঠিকানা দিন' });
  if (!items.length) return res.status(400).json({ error: 'কার্ট খালি' });
  const settings = getSettings();
  let subtotal = 0; const lines = [];
  for (const it of items) {
    const p = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(Number(it.product_id));
    if (!p) return res.status(400).json({ error: 'পণ্য পাওয়া যায়নি' });
    const qty = Math.max(1, Math.min(99, Number(it.qty) || 1));
    let price = p.price; let label = '';
    if (it.variant_id) {
      const v = db.prepare('SELECT * FROM variants WHERE id = ? AND product_id = ?').get(Number(it.variant_id), p.id);
      if (!v) return res.status(400).json({ error: 'ভ্যারিয়েন্ট পাওয়া যায়নি' });
      if (v.stock < qty) return res.status(400).json({ error: `${p.name} — এই সাইজ/রঙে স্টক শেষ` });
      price = p.price + v.price_delta; label = [v.size, v.color].filter(Boolean).join(' / ');
    } else if (p.stock < qty) {
      return res.status(400).json({ error: `${p.name} — স্টক শেষ` });
    }
    subtotal += price * qty; lines.push({ p, qty, price, label, variant_id: it.variant_id || null });
  }
  let discount = 0; let couponCode = '';
  if (b.coupon_code) {
    const c = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(b.coupon_code).trim().toUpperCase());
    if (c && subtotal >= c.min_order) { discount = Math.round(subtotal * c.percent / 100); couponCode = c.code; }
  }
  const isDhaka = String(b.district || '').toLowerCase().includes('dhaka') || String(b.district || '').includes('ঢাকা');
  let delivery = isDhaka ? settings.delivery_inside : settings.delivery_outside;
  if (subtotal - discount >= settings.free_delivery_threshold) delivery = 0;
  const total = subtotal - discount + delivery + (b.gift_wrap ? 50 : 0);
  const orderNumber = 'RF-' + String(Date.now()).slice(-6) + Math.floor(Math.random() * 90 + 10);
  const loyaltyEarned = Math.floor(total / 100);
  const ins = db.prepare(`INSERT INTO orders (order_number, customer_name, phone, address, district, thana,
    subtotal, discount, coupon_code, delivery_charge, total, payment_method, status, courier, gift_wrap, gift_message, loyalty_earned, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'Steadfast', ?, ?, ?, ?)`);
  const r = ins.run(orderNumber, String(b.name).trim(), String(b.phone).trim(), String(b.address).trim(),
    String(b.district || ''), String(b.thana || ''), subtotal, discount, couponCode, delivery, total,
    b.payment_method || 'COD', b.gift_wrap ? 1 : 0, String(b.gift_message || ''), loyaltyEarned, nowIso());
  const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, variant_label, qty, price) VALUES (?, ?, ?, ?, ?, ?)');
  for (const l of lines) {
    insItem.run(r.lastInsertRowid, l.p.id, l.p.name, l.label, l.qty, l.price);
    db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(l.qty, l.p.id);
    if (l.variant_id) db.prepare('UPDATE variants SET stock = stock - ? WHERE id = ?').run(l.qty, l.variant_id);
  }
  let cust = db.prepare('SELECT * FROM customers WHERE phone = ?').get(String(b.phone).trim());
  if (!cust) {
    const cr = db.prepare('INSERT INTO customers (name, phone, address, loyalty_points, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(String(b.name).trim(), String(b.phone).trim(), String(b.address).trim(), loyaltyEarned, nowIso());
    cust = { id: cr.lastInsertRowid };
  } else {
    db.prepare('UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?').run(loyaltyEarned, cust.id);
  }
  const waText = encodeURIComponent(`অর্ডার ${orderNumber}\nনাম: ${b.name}\nমোট: ৳${total}\nপেমেন্ট: ${b.payment_method || 'COD'}`);
  res.json({ ok: true, order_number: orderNumber, total, delivery_charge: delivery, discount, loyalty_earned: loyaltyEarned,
    whatsapp_url: `https://wa.me/${settings.whatsapp_number}?text=${waText}` });
});
app.get('/api/track', (req, res) => {
  const { order_number, phone } = req.query;
  if (!order_number || !phone) return res.status(400).json({ error: 'অর্ডার নম্বর ও ফোন দিন' });
  const o = db.prepare('SELECT * FROM orders WHERE order_number = ? AND phone = ?').get(String(order_number).trim(), String(phone).trim());
  if (!o) return res.json({ ok: false, error: 'অর্ডার পাওয়া যায়নি — নম্বর/ফোন মিলিয়ে দেখুন' });
  o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  res.json({ ok: true, order: o });
});

// ---------- admin auth (PIN, demo default 1234 — change in Settings) ----------
const sessions = new Map();
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) return res.status(401).json({ error: 'লগইন করুন' });
  req.admin = s; next();
}
app.post('/api/admin/login', (req, res) => {
  const { pin } = req.body || {};
  const settings = getSettings();
  if (sha256(String(pin || '')) !== settings.pin_hash) return res.status(401).json({ error: 'ভুল PIN' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { role: 'owner', name: 'Owner', expires: Date.now() + 12 * 60 * 60 * 1000 });
  audit('Owner', 'login', 'Admin login');
  res.json({ ok: true, token, role: 'owner', name: 'Owner' });
});
app.get('/api/admin/data', adminAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  const products = getProductsWithExtras();
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status != 'cancelled'").get().s;
  const today = db.prepare("SELECT COALESCE(SUM(total),0) s FROM orders WHERE date(created_at) = date('now') AND status != 'cancelled'").get().s;
  res.json({
    totals: { revenue, today, orders: orders.length, products: products.length,
      pending: orders.filter(o => o.status === 'pending').length,
      customers: db.prepare('SELECT COUNT(*) c FROM customers').get().c },
    orders: orders.map(o => ({ ...o, items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id) })),
    products, categories: db.prepare('SELECT * FROM categories ORDER BY name').all(),
    customers: db.prepare('SELECT * FROM customers ORDER BY id DESC').all(),
    coupons: db.prepare('SELECT * FROM coupons ORDER BY id').all(),
    payments: db.prepare('SELECT * FROM payments ORDER BY id DESC').all(),
    settings: publicSettings(),
    audit: db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 50').all(),
  });
});
function requireOwner(req, res, next) {
  if (req.admin.role !== 'owner') return res.status(403).json({ error: 'শুধু Owner এই কাজ করতে পারবে' });
  next();
}

// ---------- admin CRUD ----------
app.post('/api/admin/products', adminAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.category || !(Number(b.price) > 0)) return res.status(400).json({ error: 'নাম, ক্যাটাগরি ও সঠিক দাম দিন' });
  if (Number(b.stock) < 0) return res.status(400).json({ error: 'স্টক ০ বা বেশি হতে হবে' });
  const r = db.prepare(`INSERT INTO products (name, category, price, cost_price, stock, sku, description, image_emoji, featured, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(String(b.name).slice(0, 120), String(b.category), money(b.price), money(b.cost_price), money(b.stock),
      String(b.sku || ''), String(b.description || ''), String(b.image_emoji || '👗'), b.featured ? 1 : 0, nowIso());
  audit(req.admin.name, 'product_create', String(b.name));
  res.json({ ok: true, id: r.lastInsertRowid });
});
app.put('/api/admin/products/:id', adminAuth, (req, res) => {
  const b = req.body || {};
  if (!b.name || !(Number(b.price) > 0)) return res.status(400).json({ error: 'নাম ও সঠিক দাম দিন' });
  if (Number(b.stock) < 0) return res.status(400).json({ error: 'স্টক ০ বা বেশি হতে হবে' });
  db.prepare('UPDATE products SET name=?, category=?, price=?, cost_price=?, stock=?, sku=?, description=?, image_emoji=?, featured=?, active=? WHERE id=?')
    .run(String(b.name).slice(0, 120), String(b.category), money(b.price), money(b.cost_price), money(b.stock),
      String(b.sku || ''), String(b.description || ''), String(b.image_emoji || '👗'), b.featured ? 1 : 0, b.active === false ? 0 : 1, Number(req.params.id));
  audit(req.admin.name, 'product_update', String(b.name));
  res.json({ ok: true });
});
app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  audit(req.admin.name, 'product_delete', 'id ' + req.params.id);
  res.json({ ok: true });
});
app.post('/api/admin/categories', adminAuth, (req, res) => {
  const name = String((req.body || {}).name || '').trim();
  if (!name) return res.status(400).json({ error: 'ক্যাটাগরির নাম দিন' });
  try { db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)').run(name, nowIso()); }
  catch (_) { return res.status(400).json({ error: 'এই ক্যাটাগরি আগেই আছে' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/categories/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/coupons', adminAuth, (req, res) => {
  const b = req.body || {};
  const code = String(b.code || '').trim().toUpperCase();
  if (!code || !(Number(b.percent) > 0 && Number(b.percent) <= 90)) return res.status(400).json({ error: 'সঠিক কোড ও ছাড়ের % (১–৯০) দিন' });
  try { db.prepare('INSERT INTO coupons (code, percent, min_order) VALUES (?, ?, ?)').run(code, Number(b.percent), money(b.min_order)); }
  catch (_) { return res.status(400).json({ error: 'এই কোড আগেই আছে' }); }
  res.json({ ok: true });
});
app.delete('/api/admin/coupons/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/orders/:id/status', adminAuth, (req, res) => {
  const { status } = req.body || {};
  const ok = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!ok.includes(status)) return res.status(400).json({ error: 'ভুল স্ট্যাটাস' });
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id));
  if (!o) return res.status(404).json({ error: 'অর্ডার পাওয়া যায়নি' });
  if (status === 'cancelled' && o.status !== 'cancelled') {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    for (const it of items) db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.qty, it.product_id);
  }
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, o.id);
  audit(req.admin.name, 'order_status', `${o.order_number} -> ${status}`);
  res.json({ ok: true });
});
app.post('/api/admin/orders/bulk-status', adminAuth, (req, res) => {
  const { ids, status } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'অর্ডার সিলেক্ট করুন' });
  let updated = 0;
  for (const id of ids) {
    const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(id));
    if (!o) continue;
    if (status === 'cancelled' && o.status !== 'cancelled') {
      db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id)
        .forEach(it => db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(it.qty, it.product_id));
    }
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, o.id); updated++;
  }
  audit(req.admin.name, 'order_bulk_status', `${updated} orders -> ${status}`);
  res.json({ ok: true, updated });
});
app.post('/api/admin/orders/:id/note', adminAuth, (req, res) => {
  db.prepare('UPDATE orders SET internal_note = ? WHERE id = ?').run(String((req.body || {}).note || '').slice(0, 500), Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/orders/:id/courier', adminAuth, (req, res) => {
  const b = req.body || {};
  db.prepare('UPDATE orders SET consignment_id = ?, courier_status = ?, courier_fee = ?, courier = ? WHERE id = ?')
    .run(String(b.consignment_id || ''), String(b.courier_status || ''), money(b.courier_fee), String(b.courier || 'Steadfast'), Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/payments', adminAuth, (req, res) => {
  const b = req.body || {};
  if (!(money(b.amount) > 0) || !b.method) return res.status(400).json({ error: 'পেমেন্ট মাধ্যম ও সঠিক টাকা দিন' });
  db.prepare('INSERT INTO payments (method, amount, reference, note, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(String(b.method), money(b.amount), String(b.reference || ''), String(b.note || ''), nowIso());
  res.json({ ok: true });
});
app.delete('/api/admin/payments/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});
app.post('/api/admin/settings', adminAuth, requireOwner, (req, res) => {
  const b = req.body || {};
  const cur = getSettings();
  let pinHash = cur.pin_hash;
  if (b.new_pin) {
    if (!/^\d{4,8}$/.test(String(b.new_pin))) return res.status(400).json({ error: 'PIN ৪–৮ সংখ্যার হতে হবে' });
    pinHash = sha256(String(b.new_pin));
  }
  db.prepare(`UPDATE settings SET shop_name=?, whatsapp_number=?, bkash_number=?, nagad_number=?,
    delivery_inside=?, delivery_outside=?, free_delivery_threshold=?, announcement=?, about_text=?, delivery_info=?, return_policy=?, pin_hash=? WHERE id=1`)
    .run(String(b.shop_name || cur.shop_name).slice(0, 120), String(b.whatsapp_number || cur.whatsapp_number),
      String(b.bkash_number || ''), String(b.nagad_number || ''),
      money(b.delivery_inside ?? cur.delivery_inside), money(b.delivery_outside ?? cur.delivery_outside),
      money(b.free_delivery_threshold ?? cur.free_delivery_threshold),
      String(b.announcement || ''), String(b.about_text || ''), String(b.delivery_info || ''), String(b.return_policy || ''), pinHash);
  audit(req.admin.name, 'settings_update', 'Store settings saved');
  res.json({ ok: true });
});

// ---------- exports (CSV / backup — no secrets in output) ----------
function csvCell(v) { return '"' + String(v ?? '').replace(/"/g, '""') + '"'; }
app.get('/api/admin/export/orders.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
  const lines = [['Order', 'Customer', 'Phone', 'District', 'Total', 'Payment', 'Status', 'Date'].join(',')];
  rows.forEach(o => lines.push([o.order_number, o.customer_name, o.phone, o.district, o.total, o.payment_method, o.status, o.created_at].map(csvCell).join(',')));
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="orders.csv"').send(lines.join('\n'));
});
app.get('/api/admin/export/steadfast.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM orders ORDER BY id').all();
  const lines = [['Invoice', 'Recipient Name', 'Recipient Phone', 'Recipient Address', 'COD Amount', 'Item Description', 'Total Lot'].join(',')];
  rows.forEach(o => {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
    const desc = items.map(i => `${i.product_name} x${i.qty}`).join('; ');
    const cod = o.payment_method === 'COD' ? o.total : 0;
    lines.push([o.order_number, o.customer_name, o.phone, `${o.address}, ${o.thana}, ${o.district}`, cod, desc, items.reduce((a, i) => a + i.qty, 0)].map(csvCell).join(','));
  });
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="steadfast-bulk.csv"').send(lines.join('\n'));
});
app.get('/api/admin/export/products.csv', adminAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id').all();
  const lines = [['SKU', 'Name', 'Category', 'Price', 'Stock'].join(',')];
  rows.forEach(p => lines.push([p.sku, p.name, p.category, p.price, p.stock].map(csvCell).join(',')));
  res.setHeader('Content-Type', 'text/csv').setHeader('Content-Disposition', 'attachment; filename="products.csv"').send(lines.join('\n'));
});
app.get('/api/admin/backup', adminAuth, (req, res) => {
  res.json({
    shop: publicSettings(), exported_at: nowIso(),
    categories: db.prepare('SELECT * FROM categories').all(),
    products: db.prepare('SELECT * FROM products').all(),
    variants: db.prepare('SELECT * FROM variants').all(),
    orders: db.prepare('SELECT * FROM orders').all(),
    order_items: db.prepare('SELECT * FROM order_items').all(),
    customers: db.prepare('SELECT id, name, phone, address, loyalty_points FROM customers').all(),
    coupons: db.prepare('SELECT * FROM coupons').all(),
    payments: db.prepare('SELECT * FROM payments').all(),
  });
});

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.listen(PORT, () => console.log(`Rongdhonu Fashion running at http://localhost:${PORT} (admin PIN 1234)`));

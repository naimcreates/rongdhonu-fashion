// Rongdhonu Fashion admin — grouped sidebar, all modules, no clutter.
let TOKEN = sessionStorage.getItem('rf_admin_token') || '';
let ROLE = sessionStorage.getItem('rf_admin_role') || '';
let ANAME = sessionStorage.getItem('rf_admin_name') || '';
let DATA = null, TAB = 'dashboard';
const $ = s => document.querySelector(s);
const GROUPS = [
  { name: 'ওভারভিউ', items: [['dashboard', 'ড্যাশবোর্ড'], ['reports', 'রিপোর্ট'], ['launch', 'ওয়েবসাইট লঞ্চ']] },
  { name: 'বিক্রি', items: [['orders', 'অর্ডার'], ['customers', 'ক্রেতা'], ['payments', 'পেমেন্ট খাতা'], ['returns', 'রিটার্ন ও এক্সচেঞ্জ'], ['coupons', 'কুপন']] },
  { name: 'ক্যাটালগ', items: [['products', 'পণ্য'], ['categories', 'ক্যাটাগরি'], ['collections', 'কালেকশন'], ['variants', 'ভ্যারিয়েন্ট'], ['vendors', 'ভেন্ডর']] },
  { name: 'ইনভেন্টরি ও ডেলিভারি', items: [['inventory', 'ইনভেন্টরি'], ['courier', 'কুরিয়ার'], ['shipping', 'শিপিং জোন']] },
  { name: 'মার্কেটিং ও কনটেন্ট', items: [['campaigns', 'ক্যাম্পেইন'], ['banners', 'ব্যানার'], ['cms', 'সিএমএস পেজ'], ['faqs', 'জিজ্ঞাসা (FAQ)'], ['testimonials', 'ক্রেতার মতামত'], ['reviews', 'রিভিউ মডারেশন'], ['questions', 'পণ্যের প্রশ্ন'], ['subscribers', 'সাবস্ক্রাইবার']] },
  { name: 'ব্যবস্থাপনা', items: [['expenses', 'লাভ ও খরচ'], ['staff', 'স্টাফ ও রোল'], ['settings', 'সেটিংস'], ['notifications', 'নোটিফিকেশন'], ['sms', 'এসএমএস'], ['audit', 'অডিট লগ']] },
];
const LABELS = {}; GROUPS.forEach(g => g.items.forEach(i => LABELS[i[0]] = i[1]));
async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN, ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'ভুল হয়েছে'); e.status = r.status; throw e; }
  return d;
}
function dl(path) { return path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(TOKEN); }
async function login() {
  try {
    const d = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin: $('#pin').value }) });
    TOKEN = d.token; ROLE = d.role; ANAME = d.name;
    sessionStorage.setItem('rf_admin_token', TOKEN); sessionStorage.setItem('rf_admin_role', ROLE); sessionStorage.setItem('rf_admin_name', ANAME);
    showShell(); await loadData();
  } catch (e) { $('#err').innerHTML = '<div class="err">' + e.message + '</div>'; }
}
document.getElementById('pin').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeAdminModal(); });
function logout() { TOKEN = ''; ROLE = ''; ANAME = ''; sessionStorage.removeItem('rf_admin_token'); sessionStorage.removeItem('rf_admin_role'); sessionStorage.removeItem('rf_admin_name'); location.reload(); }
function showShell() { $('#loginWrap').style.display = 'none'; $('#shell').style.display = ''; $('#logoutBtn').style.display = ''; $('#adminWho').textContent = ANAME + ' (' + ROLE + ')'; }
async function loadData() {
  try { DATA = await api('/api/admin/data'); render(); }
  catch (e) {
    if (e.status === 401) { logout(); return; }
    // Transient failure (e.g. free-tier cold start) — do NOT log the admin out.
    const el = $('#app');
    if (el) el.innerHTML = '<div class="err">ডেটা লোড হয়নি (' + e.message + ')</div><p><button class="btn" onclick="loadData()">আবার চেষ্টা করুন</button></p>';
  }
}
function toastAdmin(msg) { const el = $('#app'); if (el) { const d = document.createElement('div'); d.className = 'ok'; d.textContent = msg; el.prepend(d); setTimeout(() => d.remove(), 3000); } }
async function safe(promise, okMsg) { try { const d = await promise; if (okMsg) toastAdmin(okMsg); return d; } catch (e) { alert(e.message); return null; } }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function money(n) { return '৳' + Number(n || 0).toLocaleString(); }
function help(text) { return '<div class="help">' + text + '</div>'; }
function searchBox(id, fn) { return '<input placeholder="খুঁজুন…" oninput="' + fn + '" id="' + id + '">'; }
function render() {
  const pending = DATA.orders.filter(o => o.status === 'pending').length;
  const unread = DATA.notifications.filter(n => !n.read).length;
  $('#sidebar').innerHTML = GROUPS.map(g => '<h5>' + g.name + '</h5>' + g.items.map(it => {
    let cnt = '';
    if (it[0] === 'orders' && pending) cnt = '<span class="cnt alert">' + pending + '</span>';
    if (it[0] === 'notifications' && unread) cnt = '<span class="cnt alert">' + unread + '</span>';
    return '<button class="' + (TAB === it[0] ? 'on' : '') + '" onclick="TAB=\'' + it[0] + '\';render()">' + it[1] + cnt + '</button>';
  }).join('')).join('');
  const el = $('#app');
  el.innerHTML = '<h2>' + LABELS[TAB] + '</h2><div id="tab"></div>';
  const t = $('#tab');
  const ro = ROLE === 'viewer' ? '<div class="note">Viewer রোল — আপনি শুধু দেখতে পারবেন, কিছু বদলাতে পারবেন না।</div>' : '';
  // ---- Dashboard ----
  if (TAB === 'dashboard') {
    const tt = DATA.totals;
    t.innerHTML = ro + '<div class="kpis">' +
      '<div class="kpi"><b>মোট বিক্রি</b><span>' + money(tt.revenue) + '</span></div>' +
      '<div class="kpi"><b>আজকের বিক্রি</b><span>' + money(tt.today) + '</span></div>' +
      '<div class="kpi"><b>এই মাসে</b><span>' + money(tt.month) + '</span></div>' +
      '<div class="kpi"><b>অর্ডার</b><span>' + tt.orders + '</span></div>' +
      '<div class="kpi"><b>পেন্ডিং</b><span>' + tt.pending + '</span></div>' +
      '<div class="kpi"><b>নিট লাভ</b><span>' + money(tt.netProfit) + '</span></div></div>' +
      help('আজকের কাজ: পেন্ডিং অর্ডার কনফার্ম করুন, কুরিয়ারে পার্সেল দিন, নতুন রিটার্ন থাকলে দেখুন।') +
      '<h3>সাম্প্রতিক অর্ডার</h3><table><tr><th>অর্ডার</th><th>ক্রেতা</th><th>মোট</th><th>স্ট্যাটাস</th></tr>' +
      DATA.orders.slice(0, 5).map(o => '<tr><td>' + o.order_number + '</td><td>' + esc(o.customer_name) + '</td><td>' + money(o.total) + '</td><td><span class="pill ' + o.status + '">' + o.status + '</span></td></tr>').join('') + '</table>' +
      '<p style="margin-top:12px"><a class="btn ghost small" href="' + dl('/api/admin/backup') + '" target="_blank">ব্যাকআপ JSON ডাউনলোড</a> <a class="btn ghost small" href="' + dl('/api/admin/export/orders.csv') + '">Orders CSV</a></p>' +
      '<h3>অডিট লগ (সাম্প্রতিক)</h3><table><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিবরণ</th></tr>' +
      DATA.audit.slice(0, 10).map(a => '<tr><td>' + a.created_at.slice(0, 19).replace('T', ' ') + '</td><td>' + esc(a.actor) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>').join('') + '</table>';
  }
  // ---- Reports ----
  if (TAB === 'reports') {
    const a = DATA.analytics;
    t.innerHTML = help('সব হিসাব আসল অর্ডার থেকে — বাতিল অর্ডার বাদ।') +
      '<div class="kpis"><div class="kpi"><b>মোট আয়</b><span>' + money(DATA.totals.revenue) + '</span></div><div class="kpi"><b>গ্রস লাভ</b><span>' + money(DATA.totals.grossProfit) + '</span></div><div class="kpi"><b>খরচ</b><span>' + money(DATA.totals.expenses) + '</span></div><div class="kpi"><b>নিট লাভ</b><span>' + money(DATA.totals.netProfit) + '</span></div></div>' +
      '<h3>গত ৭ দিনের বিক্রি</h3><table><tr><th>তারিখ</th><th>অর্ডার</th><th>মোট</th></tr>' + a.daily.map(d => '<tr><td>' + d.d + '</td><td>' + d.orders + '</td><td>' + money(d.total) + '</td></tr>').join('') + '</table>' +
      '<h3>ক্যাটাগরি অনুযায়ী</h3><table><tr><th>ক্যাটাগরি</th><th>মোট</th></tr>' + a.byCategory.map(c => '<tr><td>' + esc(c.category) + '</td><td>' + money(c.total) + '</td></tr>').join('') + '</table>' +
      '<h3>পেমেন্ট অনুযায়ী</h3><table><tr><th>মাধ্যম</th><th>অর্ডার</th><th>মোট</th></tr>' + a.byPayment.map(c => '<tr><td>' + c.method + '</td><td>' + c.orders + '</td><td>' + money(c.total) + '</td></tr>').join('') + '</table>' +
      '<h3>সেরা পণ্য</h3><table><tr><th>পণ্য</th><th>বিক্রি</th></tr>' + a.topProducts.map(p => '<tr><td>' + esc(p.name) + '</td><td>' + p.soldCount + '</td></tr>').join('') + '</table>' +
      '<h3>সেরা জেলা</h3><table><tr><th>জেলা</th><th>অর্ডার</th><th>মোট</th></tr>' + (a.byDistrict || []).map(x => '<tr><td>' + esc(x.district || '—') + '</td><td>' + x.orders + '</td><td>' + money(x.total) + '</td></tr>').join('') + '</table>';
  }
  // ---- Launch checklist ----
  if (TAB === 'launch') {
    t.innerHTML = help('$২০০ প্যাকের লঞ্চ চেকলিস্ট — প্রতিটি আসল সেটিংস/ডেটা থেকে হিসাব করা।') +
      '<p><button class="btn" onclick="fillGaps()">খালি ঘাটতি এক ক্লিকে পূরণ করুন</button> <a class="btn ghost" href="' + dl('/api/admin/backup') + '" target="_blank">ব্যাকআপ JSON ডাউনলোড</a> <a class="btn ghost" href="' + dl('/api/admin/export/products.csv') + '">Products CSV</a></p><div id="lc"></div>';
    api('/api/admin/launch-checklist').then(d => {
      $('#lc').innerHTML = '<p><b>' + d.done + '/' + d.total + ' সম্পন্ন</b></p><table><tr><th>কাজ</th><th>অবস্থা</th><th>কী করতে হবে</th></tr>' +
        d.items.map(i => '<tr><td>' + i.label + '</td><td>' + (i.done ? 'সম্পন্ন' : 'বাকি') + '</td><td class="small">' + i.hint + '</td></tr>').join('') + '</table>';
    }).catch(e => { $('#lc').innerHTML = '<div class="err">' + e.message + '</div>'; });
  }
  // ---- Orders ----
  if (TAB === 'orders') {
    t.innerHTML = ro + '<p><button class="btn ghost small" onclick="bulkStatus(\'confirmed\')">সিলেক্ট করা গুলো কনফার্ম করুন</button> <button class="btn ghost small" onclick="bulkStatus(\'shipped\')">পাঠানো হয়েছে করুন</button> <a class="btn ghost small" href="' + dl('/api/admin/export/orders.csv') + '">Orders CSV</a> <a class="btn ghost small" href="' + dl('/api/admin/export/steadfast.csv') + '">Steadfast CSV</a> <a class="btn ghost small" href="' + dl('/api/admin/export/courier.csv?courier=Pathao') + '">Pathao CSV</a></p>' +
      '<input placeholder="অর্ডার / ক্রেতা / ফোন খুঁজুন…" oninput="renderOrders(this.value)"><div id="oList"></div><div id="oDetail"></div>';
    renderOrders('');
  }
  // ---- Customers ----
  if (TAB === 'customers') {
    t.innerHTML = '<table><tr><th>নাম</th><th>ফোন</th><th>লয়্যালটি</th><th>রেফারেল কোড</th></tr>' +
      DATA.customers.map(c => '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.phone) + '</td><td>' + c.loyalty_points + '</td><td>' + esc(c.referral_code || '') + '</td></tr>').join('') + '</table>' +
      '<h3>রেফারেল</h3><table><tr><th>রেফারার</th><th>নতুন ক্রেতা</th><th>পয়েন্ট</th></tr>' + DATA.referrals.map(r => '<tr><td>' + esc(r.referrer_phone) + '</td><td>' + esc(r.referred_phone) + '</td><td>' + r.points + '</td></tr>').join('') + '</table>';
  }
  // ---- Payments ----
  if (TAB === 'payments') {
    const tot = DATA.payments.reduce((a, p) => a + p.amount, 0);
    t.innerHTML = ro + help('পেমেন্ট খাতা — অর্ডারের হিসাব থেকে আলাদা, হাতে লেখা পেমেন্ট এখানে যোগ করুন।') +
      '<h3>মোট ৳' + tot.toLocaleString() + '</h3>' +
      '<div class="row"><select id="pmMethod"><option>bKash</option><option>Nagad</option><option>COD</option><option>Bank</option></select><input id="pmAmt" type="number" placeholder="টাকা *"><input id="pmRef" placeholder="রেফারেন্স / TrxID"></div>' +
      '<input id="pmNote" placeholder="নোট"><p><button class="btn" onclick="addPayment()">পেমেন্ট যোগ করুন</button></p>' +
      '<table><tr><th>তারিখ</th><th>মাধ্যম</th><th>টাকা</th><th>রেফারেন্স</th><th></th></tr>' +
      DATA.payments.map(p => '<tr><td>' + p.created_at.slice(0, 10) + '</td><td>' + p.method + '</td><td>৳' + p.amount + '</td><td>' + esc(p.reference) + '</td><td><button class="btn ghost small" onclick="delPayment(' + p.id + ')">মুছুন</button></td></tr>').join('') + '</table>' +
      '<h3>অর্ডার থেকে পেমেন্ট সারাংশ</h3><table><tr><th>মাধ্যম</th><th>অর্ডার</th><th>মোট</th></tr>' + DATA.analytics.byPayment.map(c => '<tr><td>' + c.method + '</td><td>' + c.orders + '</td><td>' + money(c.total) + '</td></tr>').join('') + '</table>';
  }
  // ---- Returns ----
  if (TAB === 'returns') {
    t.innerHTML = ro + '<table><tr><th>অর্ডার</th><th>ফোন</th><th>ধরন</th><th>কারণ</th><th>স্ট্যাটাস</th><th></th></tr>' +
      DATA.returns.map(r => '<tr><td>' + r.order_number + '</td><td>' + esc(r.phone) + '</td><td>' + r.type + '</td><td>' + esc(r.reason) + '</td><td><span class="pill ' + r.status + '">' + r.status + '</span></td><td><select onchange="setReturn(' + r.id + ', this.value)">' + ['requested', 'approved', 'received', 'exchanged', 'refunded', 'rejected'].map(s => '<option ' + (r.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select></td></tr>').join('') + '</table>' +
      '<p class="small">স্ট্যাটাস "received" করলে অর্ডারের পণ্যের স্টক একবার ফিরে আসবে। ক্রেতা ট্র্যাকিং পেজ থেকেও অনুরোধ পাঠাতে পারে।</p>';
  }
  // ---- Coupons ----
  if (TAB === 'coupons') {
    t.innerHTML = ro + '<div class="row"><input id="ncCode" placeholder="কোড (যেমন EID20)"><input id="ncPct" type="number" placeholder="%"><input id="ncMin" type="number" placeholder="কমপক্ষে ৳"></div><p><button class="btn" onclick="addCoupon()">কুপন যোগ করুন</button></p>' +
      DATA.coupons.map(c => '<p><b>' + c.code + '</b> — ' + c.percent + '% ছাড়, কমপক্ষে ৳' + c.min_order + ' <button class="btn ghost small" onclick="delCoupon(' + c.id + ')">মুছুন</button></p>').join('');
  }
  // ---- Products ----
  if (TAB === 'products') {
    t.innerHTML = ro + help('পণ্য যোগ করুন — নাম, ক্যাটাগরি ও দাম আবশ্যক। কেনা দাম ক্রেতা কখনো দেখবে না, লাভের হিসাবে ব্যবহার হয়।') +
      '<h3>পণ্য যোগ করুন</h3><div class="row"><input id="npName" placeholder="পণ্যের নাম *"><input id="npCat" placeholder="ক্যাটাগরি *"></div>' +
      '<div class="row"><input id="npPrice" type="number" placeholder="দাম ৳ *"><input id="npCost" type="number" placeholder="কেনা দাম ৳"><input id="npStock" type="number" placeholder="স্টক"></div>' +
      '<div class="row"><input id="npSku" placeholder="SKU"><input id="npVendor" type="number" placeholder="ভেন্ডর ID (ঐচ্ছিক)"></div>' +
      '<div class="row"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="npPre" style="width:auto"> প্রি-অর্ডার চালু</label><input id="npEta" placeholder="প্রি-অর্ডার ETA (যেমন ৭ দিন)"></div>' +
      '<input id="npDesc" placeholder="বিবরণ"><p><button class="btn" id="pSaveBtn" onclick="saveProduct()">পণ্য যোগ করুন</button> <button class="btn ghost" id="pCancelEdit" style="display:none" onclick="cancelEditProduct()">নতুন পণ্য</button> <button class="btn ghost" onclick="importProducts()">CSV থেকে ইমপোর্ট করুন</button></p><p class="small">CSV ফরম্যাট: নাম, ক্যাটাগরি, দাম, কেনা দাম, স্টক, SKU, বিবরণ (প্রথম লাইনে হেডার থাকতে পারে)।</p><div id="pErr"></div>' +
      '<input placeholder="পণ্য খুঁজুন…" oninput="renderProducts(this.value)"><div id="pList"></div>';
    renderProducts('');
  }
  // ---- Categories ----
  if (TAB === 'categories') {
    t.innerHTML = ro + '<div class="row"><input id="ncName" placeholder="নতুন ক্যাটাগরি"><input id="ncParent" type="number" placeholder="প্যারেন্ট ID (সাবক্যাটাগরির জন্য, খালি রাখলে মূল)"><button class="btn" onclick="addCategory()">যোগ করুন</button></div>' +
      DATA.categories.map(c => '<p>' + esc(c.name) + (c.parent_id ? ' — সাবক্যাটাগরি' : '') + ' <button class="btn ghost small" onclick="delCategory(' + c.id + ')">মুছুন</button></p>').join('') +
      '<h3>সাবক্যাটাগরি</h3><div class="row"><input id="scCat" type="number" placeholder="ক্যাটাগরি ID"><input id="scName" placeholder="সাবক্যাটাগরির নাম"><button class="btn" onclick="addSubcat()">যোগ করুন</button></div>' +
      DATA.subcategories.map(s => '<p>' + esc(s.name) + ' (ক্যাটাগরি ' + s.category_id + ') <button class="btn ghost small" onclick="editGeneric(\'subcategories\',' + s.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'subcategories\',' + s.id + ')">মুছুন</button></p>').join('');
  }
  // ---- Collections ----
  if (TAB === 'collections') {
    t.innerHTML = ro + '<div class="row"><input id="colName" placeholder="কালেকশনের নাম"><input id="colDesc" placeholder="বিবরণ"></div><p><button class="btn" onclick="addGeneric(\'collections\', {name: document.getElementById(\'colName\').value, description: document.getElementById(\'colDesc\').value})">কালেকশন যোগ করুন</button></p>' +
      DATA.collections.map(c => '<p><b>' + esc(c.name) + '</b> — ' + esc(c.description) + ' <button class="btn ghost small" onclick="editGeneric(\'collections\',' + c.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'collections\',' + c.id + ')">মুছুন</button></p>').join('');
  }
  // ---- Variants ----
  if (TAB === 'variants') {
    t.innerHTML = ro + '<div class="row"><input id="vPid" type="number" placeholder="পণ্যের ID"><input id="vSize" placeholder="সাইজ"><input id="vColor" placeholder="রঙ"><input id="vSku" placeholder="SKU"><input id="vDelta" type="number" placeholder="দামের পার্থক্য"><input id="vStock" type="number" placeholder="স্টক"></div><p><button class="btn" onclick="addVariant()">ভ্যারিয়েন্ট যোগ করুন</button></p>' +
      '<table><tr><th>পণ্য</th><th>সাইজ/রঙ</th><th>SKU</th><th>দামের পার্থক্য</th><th>স্টক</th><th></th></tr>' +
      DATA.variants.map(v => '<tr><td>' + esc(v.product_name) + '</td><td>' + esc(v.size) + ' / ' + esc(v.color) + '</td><td>' + esc(v.sku) + '</td><td>৳' + v.price_delta + '</td><td>' + v.stock + '</td><td><button class="btn ghost small" onclick="delVariant(' + v.id + ')">মুছুন</button></td></tr>').join('') + '</table>';
  }
  // ---- Vendors ----
  if (TAB === 'vendors') {
    t.innerHTML = ro + '<div class="row"><input id="vnName" placeholder="ভেন্ডরের নাম"><input id="vnPhone" placeholder="ফোন"><input id="vnComm" type="number" placeholder="কমিশন %"></div><p><button class="btn" onclick="addGeneric(\'vendors\', {name: document.getElementById(\'vnName\').value, phone: document.getElementById(\'vnPhone\').value, commission_percent: document.getElementById(\'vnComm\').value})">ভেন্ডর যোগ করুন</button></p>' +
      DATA.vendors.map(v => '<p><b>' + esc(v.name) + '</b> — ' + esc(v.phone) + ' · কমিশন ' + v.commission_percent + '% <button class="btn ghost small" onclick="editGeneric(\'vendors\',' + v.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'vendors\',' + v.id + ')">মুছুন</button></p>').join('');
  }
  // ---- Inventory ----
  if (TAB === 'inventory') {
    t.innerHTML = ro + help('কেন্দ্রীয় ইনভেন্টরি — প্রতিটি স্টক পরিবর্তন লেজারে লেখা থাকে।') +
      '<div class="row"><input id="saPid" type="number" placeholder="পণ্যের ID"><input id="saQty" type="number" placeholder="পরিমাণ (+ যোগ / - কম)"><input id="saReason" placeholder="কারণ"></div><p><button class="btn" onclick="adjustStock()">স্টক সমন্বয় করুন</button></p>' +
      '<table><tr><th>পণ্য</th><th>SKU</th><th>স্টক</th><th>ভ্যারিয়েন্ট স্টক</th><th>কেনা দাম</th></tr>' +
      DATA.inventory.map(i => '<tr><td>' + esc(i.name) + '</td><td>' + esc(i.sku) + '</td><td>' + i.stock + '</td><td>' + i.variant_stock + '</td><td>৳' + i.cost_price + '</td></tr>').join('') + '</table>' +
      '<h3>স্টক মুভমেন্ট লেজার</h3><table><tr><th>সময়</th><th>পণ্য</th><th>পরিমাণ</th><th>কারণ</th></tr>' +
      DATA.stock_movements.map(m => '<tr><td>' + m.created_at.slice(0, 19).replace('T', ' ') + '</td><td>' + esc(m.product_name) + '</td><td>' + m.qty + '</td><td>' + esc(m.reason) + '</td></tr>').join('') + '</table>';
  }
  // ---- Courier ----
  if (TAB === 'courier') {
    t.innerHTML = ro + '<div class="note">লাইভ Steadfast API-র জন্য Settings-এ API key লাগবে। আপাতত CSV ডাউনলোড করে কুরিয়ার প্যানেলে আপলোড করুন।</div>' +
      '<p><a class="btn" href="' + dl('/api/admin/export/steadfast.csv') + '">Steadfast Bulk CSV</a> <a class="btn ghost" href="' + dl('/api/admin/export/courier.csv?courier=Pathao') + '">Pathao CSV</a> <a class="btn ghost" href="' + dl('/api/admin/export/courier.csv?courier=RedX') + '">RedX CSV</a></p>' +
      '<table><tr><th>অর্ডার</th><th>কুরিয়ার</th><th>কনসাইনমেন্ট ID</th><th>স্ট্যাটাস</th><th>ফি</th><th></th></tr>' +
      DATA.orders.map(o => '<tr><td>' + o.order_number + '</td><td><select id="cr-' + o.id + '">' + ['Steadfast', 'Pathao', 'RedX'].map(c => '<option ' + (o.courier === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></td>' +
        '<td><input id="cs-' + o.id + '" value="' + esc(o.consignment_id) + '" placeholder="SF-..."></td>' +
        '<td><input id="cst-' + o.id + '" value="' + esc(o.courier_status) + '" placeholder="in_transit"></td>' +
        '<td><input id="cf-' + o.id + '" type="number" value="' + o.courier_fee + '"></td>' +
        '<td><button class="btn small" onclick="saveCourier(' + o.id + ')">সেভ</button> <button class="btn ghost small" onclick="printLabel(' + o.id + ')">লেবেল প্রিন্ট</button></td></tr>').join('') + '</table>';
  }
  // ---- Shipping zones ----
  if (TAB === 'shipping') {
    t.innerHTML = ro + '<p class="small">শিপিং জোন কুরিয়ার পরিকল্পনার রেফারেন্স — চেকআউটের চার্জ এখনো Settings-এর ঢাকার ভিতরে/বাইরে হার থেকে আসে।</p>' +
      '<div class="row"><input id="szName" placeholder="জোনের নাম"><input id="szDist" placeholder="জেলা (কমা দিয়ে)"><input id="szCharge" type="number" placeholder="চার্জ ৳"></div><p><button class="btn" onclick="addGeneric(\'shipping_zones\', {name: document.getElementById(\'szName\').value, districts: document.getElementById(\'szDist\').value, charge: document.getElementById(\'szCharge\').value})">জোন যোগ করুন</button></p>' +
      DATA.shipping_zones.map(z => '<p><b>' + esc(z.name) + '</b> — ' + esc(z.districts) + ' · ৳' + z.charge + ' <button class="btn ghost small" onclick="editGeneric(\'shipping_zones\',' + z.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'shipping_zones\',' + z.id + ')">মুছুন</button></p>').join('');
  }
  // ---- Campaigns / Banners / CMS / FAQs / Testimonials / Reviews / Questions / Subscribers ----
  if (TAB === 'campaigns') {
    t.innerHTML = ro + '<div class="row"><input id="cmName" placeholder="ক্যাম্পেইনের নাম"><input id="cmPct" type="number" placeholder="ছাড় %"></div><input id="cmDesc" placeholder="বিবরণ"><p><button class="btn" onclick="addGeneric(\'campaigns\', {name: document.getElementById(\'cmName\').value, description: document.getElementById(\'cmDesc\').value, discount_percent: document.getElementById(\'cmPct\').value})">ক্যাম্পেইন যোগ করুন</button></p>' +
      DATA.campaigns.map(c => '<p><b>' + esc(c.name) + '</b> — ' + c.discount_percent + '% ছাড় <button class="btn ghost small" onclick="editGeneric(\'campaigns\',' + c.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'campaigns\',' + c.id + ')">মুছুন</button></p>').join('');
  }
  if (TAB === 'banners') {
    t.innerHTML = ro + '<div class="row"><input id="bnTitle" placeholder="ব্যানারের শিরোনাম"><input id="bnSub" placeholder="সাবটাইটেল"><select id="bnPos"><option>hero</option><option>top</option><option>footer</option></select></div><p><button class="btn" onclick="addGeneric(\'banners\', {title: document.getElementById(\'bnTitle\').value, subtitle: document.getElementById(\'bnSub\').value, position: document.getElementById(\'bnPos\').value})">ব্যানার যোগ করুন</button></p>' +
      DATA.banners.map(b => '<p><b>' + esc(b.title) + '</b> — ' + esc(b.position) + ' <button class="btn ghost small" onclick="editGeneric(\'banners\',' + b.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'banners\',' + b.id + ')">মুছুন</button></p>').join('');
  }
  if (TAB === 'cms') {
    t.innerHTML = ro + '<div class="row"><input id="cmsSlug" placeholder="slug (যেমন about)"><input id="cmsTitle" placeholder="শিরোনাম"></div><textarea id="cmsBody" placeholder="লেখা"></textarea><p><button class="btn" onclick="addGeneric(\'cms_pages\', {slug: document.getElementById(\'cmsSlug\').value, title: document.getElementById(\'cmsTitle\').value, body: document.getElementById(\'cmsBody\').value})">পেজ যোগ করুন</button></p>' +
      DATA.cms_pages.map(p => '<p><b>' + esc(p.title) + '</b> — /' + esc(p.slug) + ' <button class="btn ghost small" onclick="editGeneric(\'cms_pages\',' + p.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'cms_pages\',' + p.id + ')">মুছুন</button></p>').join('');
  }
  if (TAB === 'faqs') {
    t.innerHTML = ro + '<input id="fqQ" placeholder="প্রশ্ন"><textarea id="fqA" placeholder="উত্তর"></textarea><p><button class="btn" onclick="addGeneric(\'faqs\', {question: document.getElementById(\'fqQ\').value, answer: document.getElementById(\'fqA\').value})">FAQ যোগ করুন</button></p>' +
      DATA.faqs.map(f => '<p><b>' + esc(f.question) + '</b><br>' + esc(f.answer) + ' <button class="btn ghost small" onclick="editGeneric(\'faqs\',' + f.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'faqs\',' + f.id + ')">মুছুন</button></p>').join('');
  }
  if (TAB === 'testimonials') {
    t.innerHTML = ro + '<p class="small">আসল ক্রেতার মতামত এখানে যোগ করুন — ভুয়া মতামত লিখবেন না।</p>' +
      '<div class="row"><input id="tmName" placeholder="ক্রেতার নাম"><input id="tmRate" type="number" min="1" max="5" value="5" placeholder="রেটিং"></div><textarea id="tmComment" placeholder="মতামত"></textarea><p><button class="btn" onclick="addGeneric(\'testimonials\', {customer_name: document.getElementById(\'tmName\').value, comment: document.getElementById(\'tmComment\').value, rating: document.getElementById(\'tmRate\').value})">মতামত যোগ করুন</button></p>' +
      DATA.testimonials.map(x => '<p><b>' + esc(x.customer_name) + '</b> — ' + x.rating + '/৫<br>' + esc(x.comment) + ' <button class="btn ghost small" onclick="editGeneric(\'testimonials\',' + x.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'testimonials\',' + x.id + ')">মুছুন</button></p>').join('') || '<p>এখনো কোনো মতামত নেই।</p>';
  }
  if (TAB === 'reviews') {
    t.innerHTML = ro + '<table><tr><th>পণ্য</th><th>ক্রেতা</th><th>রেটিং</th><th>মন্তব্য</th><th>অবস্থা</th><th></th></tr>' +
      DATA.reviews.map(r => '<tr><td>' + esc(r.product_name) + '</td><td>' + esc(r.customer_name) + '</td><td>' + r.rating + '</td><td>' + esc(r.comment) + '</td><td>' + (r.approved ? 'দেখানো হচ্ছে' : 'লুকানো') + '</td><td><button class="btn ghost small" onclick="toggleReview(' + r.id + ',' + (r.approved ? 0 : 1) + ')">' + (r.approved ? 'লুকান' : 'দেখান') + '</button> <button class="btn ghost small" onclick="delReview(' + r.id + ')">মুছুন</button></td></tr>').join('') + '</table>';
  }
  if (TAB === 'questions') {
    t.innerHTML = ro + '<table><tr><th>পণ্য</th><th>ক্রেতা</th><th>প্রশ্ন</th><th>উত্তর</th><th></th></tr>' +
      DATA.product_questions.map(q => '<tr><td>' + esc(q.product_name) + '</td><td>' + esc(q.customer_name) + '</td><td>' + esc(q.question) + '</td><td>' + esc(q.answer || '—') + '</td><td><button class="btn ghost small" onclick="answerQ(' + q.id + ')">উত্তর দিন</button></td></tr>').join('') + '</table>';
  }
  if (TAB === 'subscribers') {
    t.innerHTML = '<table><tr><th>যোগাযোগ</th><th>তারিখ</th></tr>' + DATA.subscribers.map(s => '<tr><td>' + esc(s.contact) + '</td><td>' + s.created_at.slice(0, 10) + '</td></tr>').join('') + '</table>';
  }
  // ---- Expenses ----
  if (TAB === 'expenses') {
    const tot = DATA.expenses.reduce((a, e) => a + e.amount, 0);
    t.innerHTML = ro + '<h3>লাভ ও খরচ — মোট খরচ ৳' + tot.toLocaleString() + ' · নিট লাভ ৳' + DATA.totals.netProfit.toLocaleString() + '</h3>' +
      '<div class="row"><select id="exCat"><option>প্যাকেজিং</option><option>বিজ্ঞাপন</option><option>ভাড়া</option><option>কুরিয়ার</option><option>অন্যান্য</option></select><input id="exAmt" type="number" placeholder="টাকা *"><input id="exNote" placeholder="নোট"></div>' +
      '<p><button class="btn" onclick="addGeneric(\'expenses\', {category: document.getElementById(\'exCat\').value, amount: document.getElementById(\'exAmt\').value, note: document.getElementById(\'exNote\').value})">খরচ যোগ করুন</button></p>' +
      '<table><tr><th>তারিখ</th><th>খাত</th><th>টাকা</th><th>নোট</th><th></th></tr>' + DATA.expenses.map(e => '<tr><td>' + e.created_at.slice(0, 10) + '</td><td>' + esc(e.category) + '</td><td>৳' + e.amount + '</td><td>' + esc(e.note) + '</td><td><button class="btn ghost small" onclick="editGeneric(\'expenses\',' + e.id + ')">এডিট</button> <button class="btn ghost small" onclick="delGeneric(\'expenses\',' + e.id + ')">মুছুন</button></td></tr>').join('') + '</table>';
  }
  // ---- Staff ----
  if (TAB === 'staff') {
    t.innerHTML = ro + (ROLE === 'owner' ? '<div class="row"><input id="stName" placeholder="নাম"><select id="stRole"><option value="manager">Manager</option><option value="viewer">Viewer</option></select><input id="stPin" type="password" placeholder="PIN (৪–৮ সংখ্যা)"></div><p><button class="btn" onclick="addStaff()">স্টাফ যোগ করুন</button></p>' : '<p class="note">স্টাফ যোগ করতে শুধু Owner পারবে।</p>') +
      '<table><tr><th>নাম</th><th>রোল</th><th>সক্রিয়</th><th></th></tr>' + DATA.staff.map(s => '<tr><td>' + esc(s.name) + '</td><td>' + s.role + '</td><td>' + (s.active ? 'হ্যাঁ' : 'না') + '</td><td>' + (ROLE === 'owner' ? '<button class="btn ghost small" onclick="delStaff(' + s.id + ')">মুছুন</button>' : '') + '</td></tr>').join('') + '</table>';
  }
  // ---- Settings ----
  if (TAB === 'settings') {
    const s = DATA.settings;
    t.innerHTML = ro + '<h3>দোকানের সেটিংস</h3>' +
      '<label>দোকানের নাম</label><input id="sName" value="' + esc(s.shop_name) + '">' +
      '<div class="row"><div><label>WhatsApp নম্বর</label><input id="sWa" value="' + esc(s.whatsapp_number) + '"></div><div><label>বিকাশ নম্বর</label><input id="sBk" value="' + esc(s.bkash_number) + '"></div><div><label>নগদ নম্বর</label><input id="sNg" value="' + esc(s.nagad_number) + '"></div></div>' +
      '<div class="row"><div><label>ব্যবসায়িক ইমেইল</label><input id="sEmail" value="' + esc(s.business_email || '') + '"></div><div><label>হটলাইন</label><input id="sHot" value="' + esc(s.hotline || '') + '"></div><div><label>Google Maps লিংক</label><input id="sMaps" value="' + esc(s.maps_url || '') + '"></div></div>' +
      '<div class="row"><div><label>ঢাকার ভিতরে ডেলিভারি ৳</label><input id="sDi" type="number" value="' + s.delivery_inside + '"></div><div><label>ঢাকার বাইরে ৳</label><input id="sDo" type="number" value="' + s.delivery_outside + '"></div><div><label>ফ্রি ডেলিভারি সীমা ৳</label><input id="sFd" type="number" value="' + s.free_delivery_threshold + '"></div></div>' +
      '<div class="row"><div><label>গিফট র‍্যাপ ফি ৳</label><input id="sGift" type="number" value="' + (s.gift_wrap_fee ?? 50) + '"></div><div><label>প্রোমো কুপন কোড</label><input id="sPromo" value="' + esc(s.promo_code || 'WELCOME10') + '"></div><div><label>সাপোর্ট প্যাকেজ</label><input id="sSup" value="' + esc(s.support_package || '') + '"></div></div>' +
      '<label>ঘোষণা বার</label><input id="sAnn" value="' + esc(s.announcement) + '">' +
      '<label>About</label><textarea id="sAbout">' + esc(s.about_text) + '</textarea>' +
      '<label>ডেলিভারি তথ্য</label><textarea id="sDel">' + esc(s.delivery_info) + '</textarea>' +
      '<label>রিটার্ন নীতি</label><textarea id="sRet">' + esc(s.return_policy) + '</textarea>' +
      '<h3>ফ্ল্যাশ সেল</h3><div class="row"><input id="sFlashName" placeholder="ফ্ল্যাশ সেলের নাম" value="' + esc(s.flash_name || '') + '"><input id="sFlashPct" type="number" placeholder="ছাড় %" value="' + (s.flash_percent || '') + '"><input id="sFlashEnd" placeholder="শেষের সময় (যেমন 2026-12-31T23:59)" value="' + esc(s.flash_ends_at || '') + '"></div>' +
      '<h3>অ্যানালিটিক্স ও গেটওয়ে (key লাগবে)</h3>' +
      '<div class="row"><div><label>GA4 ID</label><input id="sGa" value="' + esc(s.ga4_id || '') + '"></div><div><label>Facebook Pixel ID</label><input id="sPx" value="' + esc(s.pixel_id || '') + '"></div><div><label>Search Console কোড</label><input id="sGsc" value="' + esc(s.gsc_code || '') + '"></div></div>' +
      '<div class="row"><div><label>Steadfast API Key</label><input id="sSfK" value="" placeholder="সেভ করা key দেখানো হয় না"></div><div><label>Steadfast Secret</label><input id="sSfS" value="" placeholder="সেভ করা secret দেখানো হয় না"></div><div><label>SMS API Key</label><input id="sSmsK" value="" placeholder="সেভ করা key দেখানো হয় না"></div></div>' +
      '<p class="small">Steadfast প্রস্তুত: ' + (s.steadfast_ready ? 'হ্যাঁ' : 'না') + ' · বিকাশ গেটওয়ে প্রস্তুত: ' + (s.bkash_ready ? 'হ্যাঁ' : 'না') + ' · SMS প্রস্তুত: ' + (s.sms_ready ? 'হ্যাঁ' : 'না') + ' — লাইভ চার্জ/বুকিং/SMS-এর জন্য আসল মার্চেন্ট key লাগবে।</p>' +
      '<label>নতুন PIN (খালি রাখলে বদলাবে না, ৪–৮ সংখ্যা — শুধু Owner)</label><input id="sPin" type="password" placeholder="নতুন PIN">' +
      '<p><button class="btn" onclick="saveSettings()">সেভ করুন</button></p><div id="sMsg"></div>';
  }
  // ---- Notifications / SMS / Audit ----
  if (TAB === 'notifications') {
    t.innerHTML = '<table><tr><th>সময়</th><th>শিরোনাম</th><th>বিবরণ</th><th></th></tr>' +
      DATA.notifications.map(n => '<tr><td>' + n.created_at.slice(0, 19).replace('T', ' ') + '</td><td>' + esc(n.title) + '</td><td>' + esc(n.body) + '</td><td>' + (n.read ? 'পড়া' : '<button class="btn ghost small" onclick="markRead(' + n.id + ')">পড়া হয়েছে</button>') + '</td></tr>').join('') + '</table>';
  }
  if (TAB === 'sms') {
    t.innerHTML = help('SMS অটো-পাঠানো হয় না — গেটওয়ে key লাগবে। নিচের queue থেকে নিজের ফোনে পাঠিয়ে "পাঠানো হয়েছে" চিহ্ন দিন।') +
      '<table><tr><th>সময়</th><th>ফোন</th><th>মেসেজ</th><th>অবস্থা</th><th></th></tr>' +
      DATA.sms_queue.map(m => '<tr><td>' + m.created_at.slice(0, 19).replace('T', ' ') + '</td><td>' + esc(m.phone) + '</td><td>' + esc(m.message) + '</td><td>' + m.status + '</td><td>' + (m.status !== 'sent' ? '<button class="btn ghost small" onclick="markSms(' + m.id + ')">পাঠানো হয়েছে</button>' : '') + '</td></tr>').join('') + '</table>';
  }
  if (TAB === 'audit') {
    t.innerHTML = '<table><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিবরণ</th></tr>' +
      DATA.audit.map(a => '<tr><td>' + a.created_at.slice(0, 19).replace('T', ' ') + '</td><td>' + esc(a.actor) + '</td><td>' + esc(a.action) + '</td><td>' + esc(a.detail) + '</td></tr>').join('') + '</table>';
  }
}
function renderOrders(q) {
  const list = DATA.orders.filter(o => !q || (o.order_number + o.customer_name + o.phone).toLowerCase().includes(q.toLowerCase()));
  $('#oList').innerHTML = '<table><tr><th></th><th>অর্ডার</th><th>ক্রেতা</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th><th>কুরিয়ার</th><th></th></tr>' +
    list.map(o => '<tr><td><input type="checkbox" class="oSel" value="' + o.id + '"></td><td>' + o.order_number + '<br><small>' + o.created_at.slice(0, 10) + '</small></td><td>' + esc(o.customer_name) + '<br><small>' + esc(o.phone) + '</small></td><td>৳' + o.total.toLocaleString() + '</td><td>' + o.payment_method + '</td><td><select onchange="setStatus(' + o.id + ', this.value)">' + ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => '<option ' + (o.status === s ? 'selected' : '') + '>' + s + '</option>').join('') + '</select></td><td>' + esc(o.consignment_id || '-') + '<br><small>' + esc(o.courier_status || '') + '</small></td><td><button class="btn ghost small" onclick="orderDetail(' + o.id + ')">বিস্তারিত</button></td></tr>').join('') + '</table>';
}
function renderProducts(q) {
  const list = DATA.products.filter(p => !q || (p.name + p.sku + p.category).toLowerCase().includes(q.toLowerCase()));
  $('#pList').innerHTML = '<table><tr><th>পণ্য</th><th>দাম</th><th>কেনা দাম</th><th>স্টক</th><th>বিক্রি</th><th></th></tr>' +
    list.map(p => '<tr><td>' + esc(p.name) + '<br><small>' + p.sku + ' · ' + p.category + '</small></td><td>৳' + p.price + '</td><td>৳' + (p.cost_price || 0) + '</td><td>' + p.stock + '</td><td>' + p.soldCount + '</td><td><button class="btn ghost small" onclick="editProduct(' + p.id + ')">এডিট</button> <button class="btn ghost small" onclick="delProduct(' + p.id + ')">মুছুন</button></td></tr>').join('') + '</table>';
}
async function saveProduct() {
  const id = window._editPid || 0;
  const body = { name: $('#npName').value, category: $('#npCat').value, price: $('#npPrice').value, cost_price: $('#npCost').value, stock: $('#npStock').value, sku: $('#npSku').value, vendor_id: $('#npVendor').value, allow_preorder: $('#npPre').checked, preorder_eta: $('#npEta').value, description: $('#npDesc').value };
  try {
    if (id) await api('/api/admin/products/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
    window._editPid = 0; await loadData();
  } catch (e) { $('#pErr').innerHTML = '<div class="err">' + e.message + '</div>'; }
}
function editProduct(id) {
  const p = DATA.products.find(x => x.id === id); if (!p) return;
  window._editPid = id;
  $('#npName').value = p.name; $('#npCat').value = p.category; $('#npPrice').value = p.price; $('#npCost').value = p.cost_price || ''; $('#npStock').value = p.stock; $('#npSku').value = p.sku || ''; $('#npVendor').value = p.vendor_id || ''; $('#npPre').checked = !!p.allow_preorder; $('#npEta').value = p.preorder_eta || ''; $('#npDesc').value = p.description || '';
  $('#pSaveBtn').textContent = 'আপডেট করুন'; $('#pCancelEdit').style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelEditProduct() {
  window._editPid = 0;
  ['npName', 'npCat', 'npPrice', 'npCost', 'npStock', 'npSku', 'npVendor', 'npEta', 'npDesc'].forEach(i => { document.getElementById(i).value = ''; });
  $('#npPre').checked = false; $('#pSaveBtn').textContent = 'পণ্য যোগ করুন'; $('#pCancelEdit').style.display = 'none';
}
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const hasHeader = /name|নাম|price|দাম/i.test(lines[0]);
  return (hasHeader ? lines.slice(1) : lines).map(l => {
    // split on commas not inside double quotes
    const c = l.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
    const clean = c.map(s => s.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
    return { name: clean[0] || '', category: clean[1] || 'শাড়ি', price: Number(clean[2]) || 0, cost_price: Number(clean[3]) || 0, stock: Number(clean[4]) || 0, sku: clean[5] || '', description: clean[6] || '' };
  }).filter(r => r.name);
}
function importProducts() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.csv,text/csv';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const rows = parseCsv(await f.text());
    if (!rows.length) { alert('CSV-তে কোনো পণ্য পাওয়া যায়নি'); return; }
    const d = await safe(api('/api/admin/products/import', { method: 'POST', body: JSON.stringify({ rows }) }));
    if (d) { alert(d.added + 'টি পণ্য ইমপোর্ট হয়েছে (' + rows.length + 'টি লাইনের মধ্যে)'); loadData(); }
  };
  inp.click();
}
async function delProduct(id) { if (!confirm('পণ্যটি মুছে ফেলবেন?')) return; await api('/api/admin/products/' + id, { method: 'DELETE' }); loadData(); }
async function addCategory() { await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: $('#ncName').value, parent_id: $('#ncParent').value }) }); loadData(); }
async function delCategory(id) { await api('/api/admin/categories/' + id, { method: 'DELETE' }); loadData(); }
async function addSubcat() { await api('/api/admin/subcategories', { method: 'POST', body: JSON.stringify({ category_id: $('#scCat').value, name: $('#scName').value }) }); loadData(); }
async function addGeneric(table, body) { const d = await safe(api('/api/admin/' + table, { method: 'POST', body: JSON.stringify(body) })); if (d) loadData(); }
async function delGeneric(table, id) { if (!confirm('মুছে ফেলবেন?')) return; const d = await safe(api('/api/admin/' + table + '/' + id, { method: 'DELETE' })); if (d) loadData(); }
const EDIT_FIELDS = {
  collections: [['name', 'নাম'], ['description', 'বিবরণ'], ['product_ids', 'পণ্যের ID (JSON)']],
  banners: [['title', 'শিরোনাম'], ['subtitle', 'সাবটাইটেল'], ['position', 'অবস্থান']],
  campaigns: [['name', 'নাম'], ['description', 'বিবরণ'], ['discount_percent', 'ছাড় %']],
  cms_pages: [['slug', 'Slug'], ['title', 'শিরোনাম'], ['body', 'লেখা']],
  faqs: [['question', 'প্রশ্ন'], ['answer', 'উত্তর']],
  shipping_zones: [['name', 'জোনের নাম'], ['districts', 'জেলা'], ['charge', 'চার্জ ৳']],
  vendors: [['name', 'নাম'], ['phone', 'ফোন'], ['commission_percent', 'কমিশন %']],
  expenses: [['category', 'খাত'], ['amount', 'টাকা'], ['note', 'নোট']],
  subcategories: [['category_id', 'ক্যাটাগরি ID'], ['name', 'নাম']],
  testimonials: [['customer_name', 'ক্রেতার নাম'], ['comment', 'মতামত'], ['rating', 'রেটিং']],
};
function editGeneric(table, id) {
  const fields = EDIT_FIELDS[table]; if (!fields) return;
  const row = (DATA[table] || []).find(x => x.id === id); if (!row) return;
  openAdminModal('<h3>এডিট — ' + (LABELS[table] || table) + '</h3>' +
    fields.map(f => '<label>' + f[1] + '</label><input id="eg_' + f[0] + '" value="' + esc(row[f[0]] ?? '') + '">').join('') +
    '<p><button class="btn" onclick="saveGeneric(\'' + table + '\',' + id + ')">সেভ করুন</button> <button class="btn ghost" onclick="closeAdminModal()">বাতিল</button></p><div id="egErr"></div>');
}
async function saveGeneric(table, id) {
  const body = {};
  EDIT_FIELDS[table].forEach(f => { body[f[0]] = document.getElementById('eg_' + f[0]).value; });
  const d = await safe(api('/api/admin/' + table + '/' + id, { method: 'PUT', body: JSON.stringify(body) }));
  if (d) { closeAdminModal(); loadData(); }
}
async function addCoupon() { await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify({ code: $('#ncCode').value, percent: $('#ncPct').value, min_order: $('#ncMin').value }) }); loadData(); }
async function delCoupon(id) { await api('/api/admin/coupons/' + id, { method: 'DELETE' }); loadData(); }
async function addVariant() { await api('/api/admin/variants', { method: 'POST', body: JSON.stringify({ product_id: $('#vPid').value, size: $('#vSize').value, color: $('#vColor').value, sku: $('#vSku').value, price_delta: $('#vDelta').value, stock: $('#vStock').value }) }); loadData(); }
async function delVariant(id) { await api('/api/admin/variants/' + id, { method: 'DELETE' }); loadData(); }
async function adjustStock() {
  try { const d = await api('/api/admin/stock/adjust', { method: 'POST', body: JSON.stringify({ product_id: $('#saPid').value, qty: $('#saQty').value, reason: $('#saReason').value }) }); alert('নতুন স্টক: ' + d.stock); loadData(); }
  catch (e) { alert(e.message); }
}
async function setStatus(id, status) { await api('/api/admin/orders/' + id + '/status', { method: 'POST', body: JSON.stringify({ status }) }); loadData(); }
async function setReturn(id, status) { await api('/api/admin/returns/' + id + '/status', { method: 'POST', body: JSON.stringify({ status }) }); loadData(); }
async function bulkStatus(status) {
  const ids = [...document.querySelectorAll('.oSel:checked')].map(e => +e.value);
  if (!ids.length) return alert('অর্ডার সিলেক্ট করুন');
  await api('/api/admin/orders/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) }); loadData();
}
function orderDetail(id) {
  const o = DATA.orders.find(x => x.id === id);
  $('#oDetail').innerHTML = '<div class="card"><h4>' + o.order_number + '</h4><p>' + esc(o.customer_name) + ' · ' + esc(o.phone) + ' · ' + esc(o.address) + ', ' + esc(o.thana) + ', ' + esc(o.district) + '</p>' +
    '<p>' + o.items.map(i => esc(i.product_name) + ' × ' + i.qty + ' — ৳' + (i.price * i.qty)).join('<br>') + '</p>' +
    '<p>মোট ৳' + o.total + ' · ছাড় ৳' + o.discount + ' · ডেলিভারি ৳' + o.delivery_charge + ' · গিফট: ' + (o.gift_wrap ? 'হ্যাঁ' : 'না') + ' · স্লট: ' + esc(o.delivery_slot || '-') + '</p>' +
    '<label>ইন্টারনাল নোট (শুধু অ্যাডমিন দেখবে)</label><textarea id="oNote">' + esc(o.internal_note || '') + '</textarea>' +
    '<button class="btn small" onclick="saveNote(' + o.id + ')">নোট সেভ</button> <button class="btn ghost small" onclick="printLabel(' + o.id + ')">পার্সেল লেবেল প্রিন্ট</button></div>';
}
async function saveNote(id) { await api('/api/admin/orders/' + id + '/note', { method: 'POST', body: JSON.stringify({ note: document.getElementById('oNote').value }) }); alert('নোট সেভ হয়েছে'); }
async function saveCourier(id) {
  await api('/api/admin/orders/' + id + '/courier', { method: 'POST', body: JSON.stringify({ consignment_id: document.getElementById('cs-' + id).value, courier_status: document.getElementById('cst-' + id).value, courier_fee: document.getElementById('cf-' + id).value, courier: document.getElementById('cr-' + id).value }) });
  alert('সেভ হয়েছে'); loadData();
}
async function printLabel(id) {
  const d = await api('/api/admin/orders/' + id + '/label', { method: 'POST', body: JSON.stringify({}) });
  const o = d.label;
  const w = window.open('', '_blank', 'width=520,height=640');
  if (!w) { alert('পপ-আপ বন্ধ আছে — ব্রাউজারে পপ-আপ চালু করুন'); return; }
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>লেবেল ' + esc(o.order_number) + '</title><style>body{font-family:system-ui,sans-serif;padding:24px;line-height:1.7}h2{margin:0 0 12px}</style></head><body><h2>পার্সেল লেবেল — ' + esc(o.order_number) + '</h2><p>প্রাপক: <b>' + esc(o.customer_name) + '</b><br>ফোন: ' + esc(o.phone) + '<br>ঠিকানা: ' + esc(o.address) + ', ' + esc(o.thana) + ', ' + esc(o.district) + '<br>কনসাইনমেন্ট: ' + esc(o.consignment_id || '-') + '<br>কুরিয়ার: ' + esc(o.courier || '') + '<br>COD: ৳' + o.total + '<br>পণ্য: ' + o.items.map(i => esc(i.product_name) + ' × ' + i.qty).join(', ') + '</p><script>window.onload=function(){window.print()}</script></body></html>');
  w.document.close();
}
function openAdminModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); }
function closeAdminModal() { $('#modal').classList.remove('open'); }
async function addPayment() { await api('/api/admin/payments', { method: 'POST', body: JSON.stringify({ method: $('#pmMethod').value, amount: $('#pmAmt').value, reference: $('#pmRef').value, note: $('#pmNote').value }) }); loadData(); }
async function delPayment(id) { await api('/api/admin/payments/' + id, { method: 'DELETE' }); loadData(); }
async function toggleReview(id, approved) { await api('/api/admin/reviews/' + id + '/approve', { method: 'POST', body: JSON.stringify({ approved: approved === 1 }) }); loadData(); }
async function delReview(id) { await api('/api/admin/reviews/' + id, { method: 'DELETE' }); loadData(); }
async function answerQ(id) { const a = prompt('উত্তর লিখুন:'); if (a === null) return; await api('/api/admin/questions/' + id + '/answer', { method: 'POST', body: JSON.stringify({ answer: a }) }); loadData(); }
async function addStaff() { await api('/api/admin/staff', { method: 'POST', body: JSON.stringify({ name: $('#stName').value, role: $('#stRole').value, pin: $('#stPin').value }) }); loadData(); }
async function delStaff(id) { await api('/api/admin/staff/' + id, { method: 'DELETE' }); loadData(); }
async function markRead(id) { await api('/api/admin/notifications/' + id + '/read', { method: 'POST', body: JSON.stringify({}) }); loadData(); }
async function markSms(id) { await api('/api/admin/sms/' + id + '/sent', { method: 'POST', body: JSON.stringify({}) }); loadData(); }
async function fillGaps() { const d = await api('/api/admin/fill-gaps', { method: 'POST', body: JSON.stringify({}) }); alert(d.filled + 'টি ঘাটতি পূরণ হয়েছে'); loadData(); }
async function saveSettings() {
  try {
    await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({
      shop_name: $('#sName').value, whatsapp_number: $('#sWa').value, bkash_number: $('#sBk').value, nagad_number: $('#sNg').value,
      business_email: $('#sEmail').value, hotline: $('#sHot').value, maps_url: $('#sMaps').value,
      delivery_inside: $('#sDi').value, delivery_outside: $('#sDo').value, free_delivery_threshold: $('#sFd').value,
      gift_wrap_fee: $('#sGift').value, promo_code: $('#sPromo').value, support_package: $('#sSup').value,
      announcement: $('#sAnn').value, about_text: $('#sAbout').value, delivery_info: $('#sDel').value, return_policy: $('#sRet').value,
      flash_name: $('#sFlashName').value, flash_percent: $('#sFlashPct').value, flash_ends_at: $('#sFlashEnd').value,
      ga4_id: $('#sGa').value, pixel_id: $('#sPx').value, gsc_code: $('#sGsc').value,
      steadfast_api_key: $('#sSfK').value, steadfast_secret: $('#sSfS').value, sms_api_key: $('#sSmsK').value,
      new_pin: $('#sPin').value }) });
    $('#sMsg').innerHTML = '<div class="ok">সেভ হয়েছে।</div>'; loadData();
  } catch (e) { $('#sMsg').innerHTML = '<div class="err">' + e.message + '</div>'; }
}
if (TOKEN) { showShell(); loadData(); }

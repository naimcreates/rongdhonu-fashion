let TOKEN = sessionStorage.getItem('rf_admin_token') || '';
let DATA = null, TAB = 'dashboard';
const $ = s => document.querySelector(s);
async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-token': TOKEN, ...(opts.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'ভুল হয়েছে');
  return d;
}
async function login() {
  try {
    const d = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin: $('#pin').value }) });
    TOKEN = d.token; sessionStorage.setItem('rf_admin_token', TOKEN);
    $('#logoutBtn').style.display = '';
    await loadData();
  } catch (e) { $('#err').innerHTML = `<div class="err">${e.message}</div>`; }
}
function logout() { TOKEN = ''; sessionStorage.removeItem('rf_admin_token'); location.reload(); }
async function loadData() {
  try { DATA = await api('/api/admin/data'); render(); }
  catch (e) { TOKEN = ''; sessionStorage.removeItem('rf_admin_token'); location.reload(); }
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function render() {
  const t = DATA.totals;
  const tabs = ['dashboard', 'products', 'categories', 'orders', 'customers', 'coupons', 'courier', 'payments', 'settings'];
  const labels = { dashboard: 'ড্যাশবোর্ড', products: 'পণ্য', categories: 'ক্যাটাগরি', orders: 'অর্ডার', customers: 'ক্রেতা', coupons: 'কুপন', courier: 'কুরিয়ার', payments: 'পেমেন্ট খাতা', settings: 'সেটিংস' };
  $('#app').innerHTML = `
    <div class="tabs">${tabs.map(x => `<button class="${TAB === x ? 'on' : ''}" onclick="TAB='${x}';render()">${labels[x]}</button>`).join('')}</div>
    <div id="tab"></div>`;
  const el = $('#tab');
  if (TAB === 'dashboard') {
    el.innerHTML = `<div class="hero"><div class="grid">
      <div class="cell"><b>মোট বিক্রি</b>৳${t.revenue.toLocaleString()}</div>
      <div class="cell"><b>আজকের বিক্রি</b>৳${t.today.toLocaleString()}</div>
      <div class="cell"><b>অর্ডার</b>${t.orders}টি</div>
      <div class="cell"><b>পেন্ডিং অর্ডার</b>${t.pending}টি</div>
      <div class="cell"><b>পণ্য</b>${t.products}টি</div>
      <div class="cell"><b>ক্রেতা</b>${t.customers}জন</div></div>
      <p style="margin-top:12px">সাম্প্রতিক অর্ডার: ${DATA.orders.slice(0, 3).map(o => `${o.order_number} (৳${o.total})`).join(', ') || 'নেই'}</p>
      <p><a href="/api/admin/backup" target="_blank">⬇ ব্যাকআপ JSON ডাউনলোড</a></p></div>
    <h3>অডিট লগ (সাম্প্রতিক)</h3>
    <table><tr><th>সময়</th><th>কে</th><th>কাজ</th><th>বিবরণ</th></tr>
    ${DATA.audit.map(a => `<tr><td>${a.created_at.slice(0, 19).replace('T', ' ')}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td><td>${esc(a.detail)}</td></tr>`).join('') || '<tr><td colspan="4">কোনো লগ নেই</td></tr>'}</table>`;
  }
  if (TAB === 'products') {
    el.innerHTML = `<h3>পণ্য যোগ করুন</h3>
      <div class="row"><input id="npName" placeholder="পণ্যের নাম *"><input id="npCat" placeholder="ক্যাটাগরি *"></div>
      <div class="row"><input id="npPrice" type="number" placeholder="দাম ৳ *"><input id="npCost" type="number" placeholder="কেনা দাম ৳"><input id="npStock" type="number" placeholder="স্টক"></div>
      <div class="row"><input id="npSku" placeholder="SKU"><input id="npEmoji" placeholder="ইমোজি (যেমন 🥻)"></div>
      <input id="npDesc" placeholder="বিবরণ"><p><button class="btn" onclick="addProduct()">পণ্য যোগ করুন</button></p><div id="pErr"></div>
      <input id="pSearch" placeholder="পণ্য খুঁজুন…" oninput="renderProducts()">
      <div id="pList"></div>`;
    renderProducts();
  }
  if (TAB === 'categories') {
    el.innerHTML = `<h3>ক্যাটাগরি</h3><div class="row"><input id="ncName" placeholder="নতুন ক্যাটাগরি"><button class="btn" onclick="addCategory()">যোগ করুন</button></div>
      ${DATA.categories.map(c => `<p>${esc(c.name)} <button class="btn ghost small" onclick="delCategory(${c.id})">মুছুন</button></p>`).join('')}`;
  }
  if (TAB === 'orders') {
    el.innerHTML = `<h3>অর্ডার (${DATA.orders.length})</h3>
      <p><button class="btn ghost small" onclick="bulkStatus('confirmed')">সিলেক্ট করা গুলো কনফার্ম করুন</button>
      <button class="btn ghost small" onclick="bulkStatus('shipped')">পাঠানো হয়েছে করুন</button>
      <a class="btn ghost small" href="/api/admin/export/orders.csv">⬇ Orders CSV</a>
      <a class="btn ghost small" href="/api/admin/export/steadfast.csv">⬇ Steadfast CSV</a></p>
      <table><tr><th></th><th>অর্ডার</th><th>ক্রেতা</th><th>মোট</th><th>পেমেন্ট</th><th>স্ট্যাটাস</th><th>কুরিয়ার</th><th></th></tr>
      ${DATA.orders.map(o => `<tr><td><input type="checkbox" class="oSel" value="${o.id}"></td>
        <td>${o.order_number}<br><small>${o.created_at.slice(0, 10)}</small></td>
        <td>${esc(o.customer_name)}<br><small>${esc(o.phone)}</small></td>
        <td>৳${o.total.toLocaleString()}</td><td>${o.payment_method}</td>
        <td><select onchange="setStatus(${o.id}, this.value)">${['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
        <td>${esc(o.consignment_id || '-')}<br><small>${esc(o.courier_status || '')}</small></td>
        <td><button class="btn ghost small" onclick="orderDetail(${o.id})">বিস্তারিত</button></td></tr>`).join('')}</table>
      <div id="oDetail"></div>`;
  }
  if (TAB === 'customers') {
    el.innerHTML = `<h3>ক্রেতা</h3><table><tr><th>নাম</th><th>ফোন</th><th>লয়্যালটি পয়েন্ট</th></tr>
      ${DATA.customers.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${c.loyalty_points}</td></tr>`).join('') || '<tr><td colspan="3">কোনো ক্রেতা নেই</td></tr>'}</table>`;
  }
  if (TAB === 'coupons') {
    el.innerHTML = `<h3>কুপন</h3><div class="row"><input id="ncCode" placeholder="কোড (যেমন EID20)"><input id="ncPct" type="number" placeholder="%"><input id="ncMin" type="number" placeholder="কমপক্ষে ৳"></div>
      <p><button class="btn" onclick="addCoupon()">কুপন যোগ করুন</button></p>
      ${DATA.coupons.map(c => `<p><b>${c.code}</b> — ${c.percent}% ছাড়, কমপক্ষে ৳${c.min_order} <button class="btn ghost small" onclick="delCoupon(${c.id})">মুছুন</button></p>`).join('')}`;
  }
  if (TAB === 'courier') {
    el.innerHTML = `<h3>কুরিয়ার (Steadfast)</h3>
      <p class="note">লাইভ Steadfast API-র জন্য Settings-এ API key লাগবে। আপাতত CSV ডাউনলোড করে Steadfast প্যানেলে আপলোড করুন।</p>
      <p><a class="btn" href="/api/admin/export/steadfast.csv">⬇ Steadfast Bulk CSV ডাউনলোড</a></p>
      <table><tr><th>অর্ডার</th><th>কনসাইনমেন্ট ID</th><th>স্ট্যাটাস</th><th>ফি</th><th></th></tr>
      ${DATA.orders.map(o => `<tr><td>${o.order_number}</td>
        <td><input id="cs-${o.id}" value="${esc(o.consignment_id)}" placeholder="SF-..."></td>
        <td><input id="cst-${o.id}" value="${esc(o.courier_status)}" placeholder="in_transit"></td>
        <td><input id="cf-${o.id}" type="number" value="${o.courier_fee}"></td>
        <td><button class="btn small" onclick="saveCourier(${o.id})">সেভ</button></td></tr>`).join('')}</table>`;
  }
  if (TAB === 'payments') {
    const tot = DATA.payments.reduce((a, p) => a + p.amount, 0);
    el.innerHTML = `<h3>পেমেন্ট খাতা — মোট ৳${tot.toLocaleString()}</h3>
      <div class="row"><select id="pmMethod"><option>bKash</option><option>Nagad</option><option>COD</option><option>Bank</option></select>
      <input id="pmAmt" type="number" placeholder="টাকা *"><input id="pmRef" placeholder="রেফারেন্স / TrxID"></div>
      <input id="pmNote" placeholder="নোট"><p><button class="btn" onclick="addPayment()">পেমেন্ট যোগ করুন</button></p>
      <table><tr><th>তারিখ</th><th>মাধ্যম</th><th>টাকা</th><th>রেফারেন্স</th><th></th></tr>
      ${DATA.payments.map(p => `<tr><td>${p.created_at.slice(0, 10)}</td><td>${p.method}</td><td>৳${p.amount}</td><td>${esc(p.reference)}</td><td><button class="btn ghost small" onclick="delPayment(${p.id})">মুছুন</button></td></tr>`).join('') || '<tr><td colspan="5">কোনো পেমেন্ট নেই</td></tr>'}</table>`;
  }
  if (TAB === 'settings') {
    const s = DATA.settings;
    el.innerHTML = `<h3>দোকানের সেটিংস</h3>
      <label>দোকানের নাম</label><input id="sName" value="${esc(s.shop_name)}">
      <div class="row"><div><label>WhatsApp নম্বর</label><input id="sWa" value="${esc(s.whatsapp_number)}"></div>
      <div><label>বিকাশ নম্বর</label><input id="sBk" value="${esc(s.bkash_number)}"></div>
      <div><label>নগদ নম্বর</label><input id="sNg" value="${esc(s.nagad_number)}"></div></div>
      <div class="row"><div><label>ঢাকার ভিতরে ডেলিভারি ৳</label><input id="sDi" type="number" value="${s.delivery_inside}"></div>
      <div><label>ঢাকার বাইরে ৳</label><input id="sDo" type="number" value="${s.delivery_outside}"></div>
      <div><label>ফ্রি ডেলিভারি সীমা ৳</label><input id="sFd" type="number" value="${s.free_delivery_threshold}"></div></div>
      <label>ঘোষণা বার</label><input id="sAnn" value="${esc(s.announcement)}">
      <label>About</label><textarea id="sAbout">${esc(s.about_text)}</textarea>
      <label>ডেলিভারি তথ্য</label><textarea id="sDel">${esc(s.delivery_info)}</textarea>
      <label>রিটার্ন নীতি</label><textarea id="sRet">${esc(s.return_policy)}</textarea>
      <label>নতুন PIN (খালি রাখলে বদলাবে না, ৪–৮ সংখ্যা)</label><input id="sPin" type="password" placeholder="নতুন PIN">
      <p class="note">লাইভ বিকাশ/নগদ গেটওয়ে, Steadfast লাইভ API ও SMS গেটওয়ের জন্য আসল মার্চেন্ট key লাগবে — এই ডেমোতে ম্যানুয়াল পেমেন্ট ও CSV হ্যান্ডওভার চলে।</p>
      <p><button class="btn" onclick="saveSettings()">সেভ করুন</button></p><div id="sMsg"></div>`;
  }
}
function renderProducts() {
  const q = ($('#pSearch')?.value || '').toLowerCase();
  const list = DATA.products.filter(p => !q || (p.name + p.sku + p.category).toLowerCase().includes(q));
  $('#pList').innerHTML = `<table><tr><th>পণ্য</th><th>দাম</th><th>স্টক</th><th>বিক্রি</th><th></th></tr>
    ${list.map(p => `<tr><td>${esc(p.name)}<br><small>${p.sku} · ${p.category}</small></td><td>৳${p.price}</td><td>${p.stock}</td><td>${p.soldCount}</td>
    <td><button class="btn ghost small" onclick="delProduct(${p.id})">মুছুন</button></td></tr>`).join('')}</table>`;
}
async function addProduct() {
  try {
    await api('/api/admin/products', { method: 'POST', body: JSON.stringify({
      name: $('#npName').value, category: $('#npCat').value, price: $('#npPrice').value, cost_price: $('#npCost').value,
      stock: $('#npStock').value, sku: $('#npSku').value, description: $('#npDesc').value, image_emoji: $('#npEmoji').value || '👗' }) });
    await loadData();
  } catch (e) { $('#pErr').innerHTML = `<div class="err">${e.message}</div>`; }
}
async function delProduct(id) { if (!confirm('পণ্যটি মুছে ফেলবেন?')) return; await api(`/api/admin/products/${id}`, { method: 'DELETE' }); loadData(); }
async function addCategory() { await api('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name: $('#ncName').value }) }); loadData(); }
async function delCategory(id) { await api(`/api/admin/categories/${id}`, { method: 'DELETE' }); loadData(); }
async function addCoupon() { await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify({ code: $('#ncCode').value, percent: $('#ncPct').value, min_order: $('#ncMin').value }) }); loadData(); }
async function delCoupon(id) { await api(`/api/admin/coupons/${id}`, { method: 'DELETE' }); loadData(); }
async function setStatus(id, status) { await api(`/api/admin/orders/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }); loadData(); }
async function bulkStatus(status) {
  const ids = [...document.querySelectorAll('.oSel:checked')].map(e => +e.value);
  if (!ids.length) return alert('অর্ডার সিলেক্ট করুন');
  await api('/api/admin/orders/bulk-status', { method: 'POST', body: JSON.stringify({ ids, status }) }); loadData();
}
function orderDetail(id) {
  const o = DATA.orders.find(x => x.id === id);
  $('#oDetail').innerHTML = `<div class="card"><h4>${o.order_number}</h4>
    <p>${esc(o.customer_name)} · ${esc(o.phone)} · ${esc(o.address)}, ${esc(o.thana)}, ${esc(o.district)}</p>
    <p>${o.items.map(i => `${esc(i.product_name)} × ${i.qty} — ৳${i.price * i.qty}`).join('<br>')}</p>
    <p>মোট ৳${o.total} · ছাড় ৳${o.discount} · ডেলিভারি ৳${o.delivery_charge}</p>
    <label>ইন্টারনাল নোট (শুধু অ্যাডমিন দেখবে)</label>
    <textarea id="oNote">${esc(o.internal_note || '')}</textarea>
    <button class="btn small" onclick="saveNote(${o.id})">নোট সেভ</button></div>`;
}
async function saveNote(id) { await api(`/api/admin/orders/${id}/note`, { method: 'POST', body: JSON.stringify({ note: document.getElementById('oNote').value }) }); alert('নোট সেভ হয়েছে'); }
async function saveCourier(id) {
  await api(`/api/admin/orders/${id}/courier`, { method: 'POST', body: JSON.stringify({
    consignment_id: document.getElementById(`cs-${id}`).value, courier_status: document.getElementById(`cst-${id}`).value,
    courier_fee: document.getElementById(`cf-${id}`).value, courier: 'Steadfast' }) });
  alert('সেভ হয়েছে'); loadData();
}
async function addPayment() {
  await api('/api/admin/payments', { method: 'POST', body: JSON.stringify({ method: $('#pmMethod').value, amount: $('#pmAmt').value, reference: $('#pmRef').value, note: $('#pmNote').value }) });
  loadData();
}
async function delPayment(id) { await api(`/api/admin/payments/${id}`, { method: 'DELETE' }); loadData(); }
async function saveSettings() {
  try {
    await api('/api/admin/settings', { method: 'POST', body: JSON.stringify({
      shop_name: $('#sName').value, whatsapp_number: $('#sWa').value, bkash_number: $('#sBk').value, nagad_number: $('#sNg').value,
      delivery_inside: $('#sDi').value, delivery_outside: $('#sDo').value, free_delivery_threshold: $('#sFd').value,
      announcement: $('#sAnn').value, about_text: $('#sAbout').value, delivery_info: $('#sDel').value,
      return_policy: $('#sRet').value, new_pin: $('#sPin').value }) });
    $('#sMsg').innerHTML = '<div class="ok">সেভ হয়েছে।</div>'; loadData();
  } catch (e) { $('#sMsg').innerHTML = `<div class="err">${e.message}</div>`; }
}
if (TOKEN) { $('#logoutBtn').style.display = ''; loadData(); }

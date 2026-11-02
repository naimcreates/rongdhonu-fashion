let SETTINGS = {}, PRODUCTS = [], CART = JSON.parse(localStorage.getItem('rf_cart') || '[]');
let WISH = JSON.parse(localStorage.getItem('rf_wish') || '[]');
const DISTRICTS = ["ঢাকা","চট্টগ্রাম","খুলনা","রাজশাহী","বরিশাল","সিলেট","রংপুর","ময়মনসিংহ","কুমিল্লা","নারায়ণগঞ্জ","গাজীপুর","বগুড়া","ময়মনসিংহ","ফরিদপুর","টাঙ্গাইল","যশোর","দিনাজপুর","পাবনা","নোয়াখালী","কক্সবাজার","সুনামগঞ্জ","ব্রাহ্মণবাড়িয়া","নরসিংদী","মানিকগঞ্জ","মুন্সীগঞ্জ","কিশোরগঞ্জ","নেত্রকোনা","জামালপুর","শেরপুর","সিরাজগঞ্জ","নাটোর","চাঁপাইনবাবগঞ্জ","জয়পুরহাট","নওগাঁ","কুড়িগ্রাম","লালমনিরহাট","নীলফামারী","পঞ্চগড়","ঠাকুরগাঁও","গাইবান্ধা","রংপুর","চুয়াডাঙ্গা","ঝিনাইদহ","কুষ্টিয়া","মাগুরা","মেহেরপুর","নড়াইল","সাতক্ষীরা","বাগেরহাট","ঝালকাঠি","পিরোজপুর","বরগুনা","পটুয়াখালী","ভোলা","লক্ষ্মীপুর","চাঁদপুর","ফেনী","খাগড়াছড়ি","রাঙামাটি","বান্দরবান","হবিগঞ্জ","মৌলভীবাজার","গোপালগঞ্জ","মাদারীপুর","শরীয়তপুর","রাজবাড়ী"];
const $ = s => document.querySelector(s);
function saveCart() { localStorage.setItem('rf_cart', JSON.stringify(CART)); updateCounts(); }
function saveWish() { localStorage.setItem('rf_wish', JSON.stringify(WISH)); updateCounts(); }
function updateCounts() {
  $('#cartCount').textContent = CART.reduce((a, i) => a + i.qty, 0);
  $('#wishCount').textContent = WISH.length ? `(${WISH.length})` : '';
}
function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

async function init() {
  const r = await fetch('/api/storefront'); const d = await r.json();
  SETTINGS = d.settings;
  $('#ann').textContent = SETTINGS.announcement || '';
  $('#heroGrid').innerHTML = `
    <div class="cell"><b>ঢাকার ভিতরে ডেলিভারি</b>৳${SETTINGS.delivery_inside}</div>
    <div class="cell"><b>ঢাকার বাইরে</b>৳${SETTINGS.delivery_outside}</div>
    <div class="cell"><b>ফ্রি ডেলিভারি</b>৳${SETTINGS.free_delivery_threshold}+ অর্ডারে</div>
    <div class="cell"><b>পেমেন্ট</b>COD / বিকাশ / নগদ</div>`;
  $('#cat').innerHTML = '<option value="">সব ক্যাটাগরি</option>' + d.categories.map(c => `<option>${c.name}</option>`).join('');
  $('#about').innerHTML = `<div class="card"><h3>আমাদের সম্পর্কে</h3><p>${SETTINGS.about_text || ''}</p>
    <p><b>ডেলিভারি:</b> ${SETTINGS.delivery_info || ''}</p><p><b>রিটার্ন:</b> ${SETTINGS.return_policy || ''}</p></div>`;
  $('#footer').innerHTML = `<b>${SETTINGS.shop_name}</b> · WhatsApp: ${SETTINGS.whatsapp_number} · ক্যাশ অন ডেলিভারি সারা দেশে`;
  updateCounts(); loadProducts();
}
async function loadProducts() {
  const q = $('#q').value, cat = $('#cat').value, sort = $('#sort').value;
  const r = await fetch(`/api/products?search=${encodeURIComponent(q)}&category=${encodeURIComponent(cat)}&sort=${sort}`);
  PRODUCTS = await r.json();
  $('#msg').innerHTML = `<p>${PRODUCTS.length}টি পণ্য পাওয়া গেছে</p>`;
  $('#products').innerHTML = PRODUCTS.map(p => `
    <div class="card">
      <div class="emoji">${p.image_emoji}</div>
      <h3>${p.name}</h3>
      <div>${p.featured ? '<span class="badge">⭐ বিশেষ</span>' : ''}<span class="badge">${p.category}</span>
      <span class="badge">⭐ ${p.avgRating} (${p.reviewCount})</span></div>
      <p class="price">৳${p.price.toLocaleString()}</p>
      <p style="font-size:13px;color:#666">স্টক: ${p.stock} · বিক্রি: ${p.soldCount} · ${p.sku}</p>
      <div class="row">
        <button class="btn small" onclick="addToCart(${p.id})">কার্টে যোগ করুন</button>
        <button class="btn ghost small" onclick="toggleWish(${p.id})">${WISH.includes(p.id) ? '♥' : '♡'}</button>
        <button class="btn ghost small" onclick="showDetail(${p.id})">বিস্তারিত</button>
      </div>
    </div>`).join('') || '<p>কোনো পণ্য পাওয়া যায়নি।</p>';
}
function addToCart(id, variantId) {
  const p = PRODUCTS.find(x => x.id === id); if (!p) return;
  const ex = CART.find(i => i.product_id === id && (i.variant_id || null) === (variantId || null));
  if (ex) ex.qty++; else CART.push({ product_id: id, variant_id: variantId || null, qty: 1 });
  saveCart(); alert('কার্টে যোগ হয়েছে');
}
function toggleWish(id) { WISH = WISH.includes(id) ? WISH.filter(x => x !== id) : [...WISH, id]; saveWish(); loadProducts(); }
function showWishlist() {
  const items = PRODUCTS.filter(p => WISH.includes(p.id));
  openModal(`<h3>পছন্দের তালিকা</h3>${items.length ? items.map(p => `<p>${p.name} — ৳${p.price} <button class="btn small" onclick="addToCart(${p.id})">কার্টে নিন</button></p>`).join('') : '<p>এখনো কিছু যোগ করেননি।</p>'}<p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>`);
}
async function showDetail(id) {
  const r = await fetch(`/api/products/${id}`); const p = await r.json();
  openModal(`<h3>${p.name}</h3><div style="font-size:44px">${p.image_emoji}</div>
    <p>${p.description}</p><p class="price">৳${p.price.toLocaleString()}</p>
    <p>ক্যাটাগরি: ${p.category} · SKU: ${p.sku} · স্টক: ${p.stock}</p>
    ${p.variants.length ? `<label>সাইজ / রঙ বেছে নিন</label><select id="varSel">${p.variants.map(v => `<option value="${v.id}">${[v.size, v.color].filter(Boolean).join(' / ')} — ৳${p.price + v.price_delta} (স্টক ${v.stock})</option>`).join('')}</select>` : ''}
    <p><button class="btn" onclick="addToCart(${p.id}, document.getElementById('varSel') ? +document.getElementById('varSel').value : null); closeModal()">কার্টে যোগ করুন</button>
    <button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>
    <h4>রিভিউ (${p.reviewCount})</h4>
    ${p.reviews.map(x => `<p>⭐ ${x.rating} — <b>${x.customer_name}</b>: ${x.comment}</p>`).join('') || '<p>এখনো রিভিউ নেই।</p>'}
    <h4>রিভিউ লিখুন</h4>
    <input id="rvName" placeholder="আপনার নাম"><input id="rvRate" type="number" min="1" max="5" value="5" placeholder="রেটিং ১–৫">
    <textarea id="rvText" placeholder="আপনার মতামত"></textarea>
    <button class="btn small" onclick="submitReview(${p.id})">রিভিউ জমা দিন</button>`);
}
async function submitReview(id) {
  const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: id, customer_name: document.getElementById('rvName').value, rating: document.getElementById('rvRate').value, comment: document.getElementById('rvText').value }) });
  const d = await r.json();
  if (!r.ok) return alert(d.error || 'ভুল হয়েছে');
  alert('ধন্যবাদ! রিভিউ জমা হয়েছে।'); closeModal(); loadProducts();
}
function cartLines() {
  return CART.map(i => { const p = PRODUCTS.find(x => x.id === i.product_id); if (!p) return null;
    const v = i.variant_id ? (p.variants || []).find(x => x.id === i.variant_id) : null;
    return { ...i, p, price: p.price + (v ? v.price_delta : 0), label: v ? [v.size, v.color].filter(Boolean).join(' / ') : '' }; }).filter(Boolean);
}
function showCart() {
  const lines = cartLines(); const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
  openModal(`<h3>কার্ট</h3>
    ${lines.length ? lines.map((l, i) => `<p>${l.p.name}${l.label ? ' (' + l.label + ')' : ''} × ${l.qty} — ৳${(l.price * l.qty).toLocaleString()} <button onclick="CART.splice(${i},1); saveCart(); showCart()">✕</button></p>`).join('') : '<p>কার্ট খালি।</p>'}
    <p><b>মোট: ৳${sub.toLocaleString()}</b></p>
    <p><input id="cpn" placeholder="কুপন কোড (যেমন WELCOME10)"> <button class="btn ghost small" onclick="applyCoupon()">কুপন দেখুন</button> <span id="cpnMsg"></span></p>
    ${lines.length ? `<button class="btn" onclick="showCheckout()">চেকআউট করুন</button> ` : ''}
    <button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button>`);
}
async function applyCoupon() {
  const code = document.getElementById('cpn').value;
  const sub = cartLines().reduce((a, l) => a + l.price * l.qty, 0);
  const r = await fetch('/api/coupons/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal: sub }) });
  const d = await r.json();
  document.getElementById('cpnMsg').textContent = d.ok ? `ছাড় ৳${d.discount} (${d.percent}%)` : (d.error || 'ভুল কোড');
  window._coupon = d.ok ? code.toUpperCase() : '';
}
function showCheckout() {
  openModal(`<h3>চেকআউট</h3>
    <label>নাম *</label><input id="coName">
    <label>মোবাইল *</label><input id="coPhone" placeholder="01XXXXXXXXX">
    <label>ঠিকানা *</label><textarea id="coAddr"></textarea>
    <div class="row"><div><label>জেলা *</label><select id="coDistrict">${DISTRICTS.map(d => `<option ${d === 'ঢাকা' ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
    <div><label>থানা</label><input id="coThana"></div></div>
    <label>পেমেন্ট</label><select id="coPay"><option>COD</option><option>bKash</option><option>Nagad</option></select>
    <p style="font-size:13px;color:#666">বিকাশ/নগদ: অর্ডারের পর দোকান থেকে নম্বর জানিয়ে দেওয়া হবে (ম্যানুয়াল পেমেন্ট)।</p>
    <label><input type="checkbox" id="coGift" style="width:auto"> গিফট র‍্যাপ (+৳৫০)</label>
    <input id="coGiftMsg" placeholder="গিফট মেসেজ (ঐচ্ছিক)">
    <p><button class="btn" onclick="placeOrder()">অর্ডার করুন</button> <button class="btn ghost" onclick="closeModal()">বাতিল</button></p>
    <div id="coErr"></div>`);
}
async function placeOrder() {
  const body = { name: document.getElementById('coName').value, phone: document.getElementById('coPhone').value,
    address: document.getElementById('coAddr').value, district: document.getElementById('coDistrict').value,
    thana: document.getElementById('coThana').value, payment_method: document.getElementById('coPay').value,
    gift_wrap: document.getElementById('coGift').checked, gift_message: document.getElementById('coGiftMsg').value,
    coupon_code: window._coupon || '', items: CART.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })) };
  const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) { document.getElementById('coErr').innerHTML = `<div class="err">${d.error || 'ভুল হয়েছে'}</div>`; return; }
  CART = []; saveCart(); window._coupon = '';
  openModal(`<h3>অর্ডার হয়েছে! 🎉</h3><p>অর্ডার নম্বর: <b>${d.order_number}</b></p>
    <p>মোট: ৳${d.total.toLocaleString()} · ডেলিভারি: ৳${d.delivery_charge} · ছাড়: ৳${d.discount} · লয়্যালটি পয়েন্ট: ${d.loyalty_earned}</p>
    <p><a class="btn" href="${d.whatsapp_url}" target="_blank">WhatsApp-এ অর্ডার পাঠান</a></p>
    <p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>`);
}
function showTrack() {
  openModal(`<h3>অর্ডার ট্র্যাক করুন</h3>
    <label>অর্ডার নম্বর</label><input id="trNo" placeholder="RF-XXXXXX">
    <label>মোবাইল নম্বর</label><input id="trPh" placeholder="01XXXXXXXXX">
    <p><button class="btn" onclick="doTrack()">খুঁজুন</button></p><div id="trOut"></div>`);
}
async function doTrack() {
  const r = await fetch(`/api/track?order_number=${encodeURIComponent(document.getElementById('trNo').value)}&phone=${encodeURIComponent(document.getElementById('trPh').value)}`);
  const d = await r.json();
  document.getElementById('trOut').innerHTML = !d.ok ? `<div class="err">${d.error}</div>` :
    `<div class="ok"><b>${d.order.order_number}</b> — স্ট্যাটাস: <b>${d.order.status}</b> · মোট ৳${d.order.total.toLocaleString()}<br>
    কুরিয়ার: ${d.order.courier} · কনসাইনমেন্ট: ${d.order.consignment_id || 'এখনো দেওয়া হয়নি'} · ${d.order.courier_status || ''}<br>
    ${d.order.items.map(i => `${i.product_name} × ${i.qty}`).join(', ')}</div>`;
}
init();

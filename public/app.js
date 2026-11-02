// Rongdhonu Fashion storefront — professional, no emoji icons.
let SETTINGS = {}, PRODUCTS = [], ALL = [], CATS = [], VENDORS = [];
let CART = JSON.parse(localStorage.getItem('rf_cart') || '[]');
let WISH = JSON.parse(localStorage.getItem('rf_wish') || '[]');
let CMP = JSON.parse(localStorage.getItem('rf_cmp') || '[]');
let RECENT = JSON.parse(localStorage.getItem('rf_recent') || '[]');
let LANG = localStorage.getItem('rf_lang') || 'bn';
let CUST = null; try { CUST = JSON.parse(sessionStorage.getItem('rf_customer') || 'null'); } catch (_) {}
const DISTRICTS = ["ঢাকা","চট্টগ্রাম","খুলনা","রাজশাহী","বরিশাল","সিলেট","রংপুর","ময়মনসিংহ","কুমিল্লা","নারায়ণগঞ্জ","গাজীপুর","বগুড়া","ফরিদপুর","টাঙ্গাইল","যশোর","দিনাজপুর","পাবনা","নোয়াখালী","কক্সবাজার","সুনামগঞ্জ","ব্রাহ্মণবাড়িয়া","নরসিংদী","মানিকগঞ্জ","মুন্সীগঞ্জ","কিশোরগঞ্জ","নেত্রকোনা","জামালপুর","শেরপুর","সিরাজগঞ্জ","নাটোর","চাঁপাইনবাবগঞ্জ","জয়পুরহাট","নওগাঁ","কুড়িগ্রাম","লালমনিরহাট","নীলফামারী","পঞ্চগড়","ঠাকুরগাঁও","গাইবান্ধা","চুয়াডাঙ্গা","ঝিনাইদহ","কুষ্টিয়া","মাগুরা","মেহেরপুর","নড়াইল","সাতক্ষীরা","বাগেরহাট","ঝালকাঠি","পিরোজপুর","বরগুনা","পটুয়াখালী","ভোলা","লক্ষ্মীপুর","চাঁদপুর","ফেনী","খাগড়াছড়ি","রাঙামাটি","বান্দরবান","হবিগঞ্জ","মৌলভীবাজার","গোপালগঞ্জ","মাদারীপুর","শরীয়তপুর","রাজবাড়ী"];
const STR = {
  bn: { heroTitle: 'হাতে বাছাই করা শাড়ি, থ্রি-পিস ও কুর্তি', heroSub: 'সারা দেশে ক্যাশ অন ডেলিভারি। বিকাশ / নগদ / COD — সব পেমেন্টেই অর্ডার করা যায়।', addToCart: 'কার্টে যোগ করুন', details: 'বিস্তারিত', track: 'অর্ডার ট্র্যাক', account: 'আমার অ্যাকাউন্ট', wishlist: 'পছন্দ', compare: 'তুলনা', cart: 'কার্ট' },
  en: { heroTitle: 'Handpicked Sarees, Three-Pieces & Kurtis', heroSub: 'Cash on delivery across Bangladesh. Pay by COD, bKash or Nagad.', addToCart: 'Add to Cart', details: 'Details', track: 'Track Order', account: 'My Account', wishlist: 'Wishlist', compare: 'Compare', cart: 'Cart' }
};
const $ = s => document.querySelector(s);
function t(k) { return (STR[LANG] && STR[LANG][k]) || STR.bn[k] || k; }
function toast(msg) { const el = $('#toast'); el.innerHTML = '<div class="toast">' + msg + '</div>'; setTimeout(() => { el.innerHTML = ''; }, 3000); }
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function saveCart() { localStorage.setItem('rf_cart', JSON.stringify(CART)); updateCounts(); }
function saveWish() { localStorage.setItem('rf_wish', JSON.stringify(WISH)); updateCounts(); }
function saveCmp() { localStorage.setItem('rf_cmp', JSON.stringify(CMP)); updateCounts(); }
function updateCounts() {
  $('#cartCount').textContent = CART.reduce((a, i) => a + i.qty, 0);
  $('#wishCount').textContent = WISH.length ? '(' + WISH.length + ')' : '';
  $('#cmpCount').textContent = CMP.length ? '(' + CMP.length + ')' : '';
}
function openModal(html) { $('#modalBox').innerHTML = html; $('#modal').classList.add('open'); }
function closeModal() { $('#modal').classList.remove('open'); }
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function toggleLang() {
  LANG = LANG === 'bn' ? 'en' : 'bn'; localStorage.setItem('rf_lang', LANG);
  $('#langBtn').textContent = LANG === 'bn' ? 'English' : 'বাংলায় দেখুন';
  document.querySelector('[data-i18n="heroTitle"]').textContent = t('heroTitle');
  document.querySelector('[data-i18n="heroSub"]').textContent = t('heroSub');
  loadProducts();
}
function colourFor(p) { const m = { 'শাড়ি': '#7a1f2b', 'থ্রি-পিস': '#4a5d43', 'কুর্তি': '#5b4a68' }; return (p.images && p.images[0] && p.images[0].colour) || m[p.category] || '#7a1f2b'; }
function badges(p) {
  const out = [];
  if (p.featured) out.push('<span class="badge best">বেস্ট সেলার</span>');
  const isNew = p.id >= Math.max(...ALL.map(x => x.id)) - 1;
  if (isNew) out.push('<span class="badge new">নতুন</span>');
  if (SETTINGS.flash_percent && SETTINGS.flash_name) out.push('<span class="badge sale">-' + SETTINGS.flash_percent + '%</span>');
  return out.slice(0, 2).join('');
}
function cardHtml(p) {
  const price = SETTINGS.flash_percent ? Math.round(p.price * (100 - SETTINGS.flash_percent) / 100) : p.price;
  return '<div class="pcard"><div class="pvisual" style="background:' + colourFor(p) + '">' + esc(p.category) + '</div>' +
    '<div class="pbody"><h3>' + esc(p.name) + '</h3><div>' + badges(p) + '<span class="badge">' + esc(p.category) + '</span></div>' +
    '<div class="pmeta">রেটিং ' + p.avgRating + ' (' + p.reviewCount + ') · বিক্রি ' + p.soldCount + '</div>' +
    '<div><span class="price">৳' + price.toLocaleString() + '</span>' + (price !== p.price ? '<span class="old">৳' + p.price.toLocaleString() + '</span>' : '') + '</div>' +
    '<div class="pmeta">স্টক: ' + (p.stock > 0 ? p.stock : (p.allow_preorder ? 'প্রি-অর্ডার' : 'স্টক শেষ')) + ' · ' + esc(p.sku) + '</div>' +
    '<div class="pactions"><button class="btn small" onclick="addToCart(' + p.id + ')">' + t('addToCart') + '</button>' +
    '<button class="btn ghost small" onclick="toggleWish(' + p.id + ')">' + (WISH.includes(p.id) ? 'পছন্দ করা' : 'পছন্দ করুন') + '</button>' +
    '<button class="btn plain small" onclick="toggleCmp(' + p.id + ')">তুলনা</button>' +
    '<button class="btn plain small" onclick="showDetail(' + p.id + ')">' + t('details') + '</button></div></div></div>';
}
async function init() {
  const r = await fetch('/api/storefront'); const d = await r.json();
  SETTINGS = d.settings; ALL = d.products; CATS = d.categories; VENDORS = d.vendors || [];
  $('#ann').textContent = SETTINGS.announcement || '';
  $('#langBtn').textContent = LANG === 'bn' ? 'English' : 'বাংলায় দেখুন';
  document.querySelector('[data-i18n="heroTitle"]').textContent = t('heroTitle');
  document.querySelector('[data-i18n="heroSub"]').textContent = t('heroSub');
  $('#heroGrid').innerHTML =
    '<div class="cell"><b>ঢাকার ভিতরে ডেলিভারি</b><span>৳' + SETTINGS.delivery_inside + '</span></div>' +
    '<div class="cell"><b>ঢাকার বাইরে</b><span>৳' + SETTINGS.delivery_outside + '</span></div>' +
    '<div class="cell"><b>ফ্রি ডেলিভারি</b><span>৳' + SETTINGS.free_delivery_threshold + '+ অর্ডারে</span></div>' +
    '<div class="cell"><b>পেমেন্ট</b><span>COD / বিকাশ / নগদ</span></div>';
  $('#heroNote').textContent = 'গিফট র‍্যাপ ৳' + (SETTINGS.gift_wrap_fee || 50) + ' · লয়্যালটি পয়েন্ট: প্রতি ৳১০০ খরচে ১ পয়েন্ট';
  $('#cat').innerHTML = '<option value="">সব ক্যাটাগরি</option>' + CATS.map(c => '<option>' + esc(c.name) + '</option>').join('');
  $('#vendor').innerHTML = '<option value="">সব বিক্রেতা</option>' + VENDORS.map(v => '<option value="' + v.id + '">' + esc(v.name) + '</option>').join('');
  $('#catShowcase').innerHTML = CATS.map(c => '<button class="btn plain" onclick="filterCat(\'' + esc(c.name) + '\')">' + esc(c.name) + ' (' + ALL.filter(p => p.category === c.name).length + ')</button>').join('') +
    (d.collections || []).map(c => '<button class="btn plain" onclick="toast(\'কালেকশন: ' + esc(c.name) + '\')">' + esc(c.name) + '</button>').join('');
  // flash sale
  if (SETTINGS.flash_name && SETTINGS.flash_percent) {
    $('#flashSection').style.display = '';
    $('#flashTitle').textContent = 'ফ্ল্যাশ সেল — ' + SETTINGS.flash_name + ' (-' + SETTINGS.flash_percent + '%)';
    $('#flashProducts').innerHTML = ALL.slice(0, 4).map(cardHtml).join('');
    if (SETTINGS.flash_ends_at) {
      const end = new Date(SETTINGS.flash_ends_at).getTime();
      setInterval(() => { const ms = end - Date.now(); if (ms <= 0) { $('#flashTimer').textContent = 'শেষ'; return; } const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000); $('#flashTimer').textContent = h + 'ঘ ' + m + 'মি ' + s + 'সে'; }, 1000);
    }
  }
  $('#featuredProducts').innerHTML = ALL.filter(p => p.featured).map(cardHtml).join('') || ALL.slice(0, 3).map(cardHtml).join('');
  $('#newProducts').innerHTML = ALL.slice(-4).map(cardHtml).join('');
  $('#discountProducts').innerHTML = ALL.filter(p => p.price >= 2000).slice(0, 4).map(cardHtml).join('');
  if (RECENT.length) { $('#recentSection').style.display = ''; $('#recentProducts').innerHTML = ALL.filter(p => RECENT.includes(p.id)).map(cardHtml).join(''); }
  $('#aboutCard').innerHTML = '<h3>আমাদের সম্পর্কে</h3><p>' + esc(SETTINGS.about_text || '') + '</p><p><b>ডেলিভারি:</b> ' + esc(SETTINGS.delivery_info || '') + '</p><p><b>রিটার্ন:</b> ' + esc(SETTINGS.return_policy || '') + '</p>';
  $('#testimonials').innerHTML = (d.testimonials || []).map(x => '<p><b>' + esc(x.customer_name) + '</b> — ' + x.rating + '/৫<br>' + esc(x.comment) + '</p>').join('') || '<p>এখনো কোনো মতামত নেই।</p>';
  $('#faqList').innerHTML = (d.faqs || []).map(f => '<div class="card" style="margin-bottom:8px"><b>' + esc(f.question) + '</b><p>' + esc(f.answer) + '</p></div>').join('');
  $('#footerGrid').innerHTML = '<div><h4>' + esc(SETTINGS.shop_name) + '</h4><p>' + esc(SETTINGS.about_text || '') + '</p></div>' +
    '<div><h4>যোগাযোগ</h4><p>WhatsApp: ' + esc(SETTINGS.whatsapp_number) + '<br>ইমেইল: ' + esc(SETTINGS.business_email || '') + '<br>হটলাইন: ' + esc(SETTINGS.hotline || '') + '</p></div>' +
    '<div><h4>তথ্য</h4><p><a href="#about">আমাদের সম্পর্কে</a><br><a href="#faq">সচরাচর জিজ্ঞাসা</a><br>' + (SETTINGS.maps_url ? '<a href="' + esc(SETTINGS.maps_url) + '" target="_blank">Google Maps-এ দেখুন</a>' : '') + '</p></div>' +
    '<div><h4>পেমেন্ট</h4><p>COD · বিকাশ · নগদ<br>ডেলিভারি: ঢাকায় ৳' + SETTINGS.delivery_inside + ', বাইরে ৳' + SETTINGS.delivery_outside + '</p></div>';
  updateCounts(); loadProducts(); maybePromo();
}
function filterCat(c) { $('#cat').value = c; loadProducts(); document.getElementById('products').scrollIntoView(); }
function onSearchInput() {
  const q = $('#q').value.trim().toLowerCase();
  if (!q) { $('#suggest').style.display = 'none'; loadProducts(); return; }
  const hits = ALL.filter(p => (p.name + ' ' + p.sku + ' ' + p.category).toLowerCase().includes(q)).slice(0, 5);
  $('#suggest').style.display = hits.length ? '' : 'none';
  $('#suggest').innerHTML = hits.map(p => '<p><a href="javascript:showDetail(' + p.id + ')">' + esc(p.name) + ' — ৳' + p.price + '</a></p>').join('') || '<p>কিছু পাওয়া যায়নি।</p>';
  loadProducts();
}
async function loadProducts() {
  const q = $('#q').value, cat = $('#cat').value, sort = $('#sort').value, vendor = $('#vendor').value, pr = $('#priceRange').value;
  let url = '/api/products?search=' + encodeURIComponent(q) + '&category=' + encodeURIComponent(cat) + '&sort=' + sort + '&vendor=' + vendor;
  if (pr) { const a = pr.split('-'); url += '&min=' + a[0] + '&max=' + a[1]; }
  const r = await fetch(url); PRODUCTS = await r.json();
  $('#resultCount').textContent = PRODUCTS.length + 'টি পণ্য';
  $('#productsGrid').innerHTML = PRODUCTS.map(cardHtml).join('') || '<p>কোনো পণ্য পাওয়া যায়নি।</p>';
}
function addToCart(id, variantId) {
  const p = ALL.find(x => x.id === id); if (!p) return;
  const ex = CART.find(i => i.product_id === id && (i.variant_id || null) === (variantId || null));
  if (ex) ex.qty++; else CART.push({ product_id: id, variant_id: variantId || null, qty: 1 });
  saveCart(); toast('কার্টে যোগ হয়েছে');
}
function toggleWish(id) { WISH = WISH.includes(id) ? WISH.filter(x => x !== id) : [...WISH, id]; saveWish(); loadProducts(); }
function toggleCmp(id) {
  if (CMP.includes(id)) CMP = CMP.filter(x => x !== id);
  else { if (CMP.length >= 3) { toast('সর্বোচ্চ ৩টি পণ্য তুলনা করা যায়'); return; } CMP.push(id); }
  saveCmp(); toast('তুলনার তালিকা আপডেট হয়েছে');
}
function showWishlist() {
  const items = ALL.filter(p => WISH.includes(p.id));
  openModal('<h3>পছন্দের তালিকা</h3>' + (items.length ? items.map(p => '<p>' + esc(p.name) + ' — ৳' + p.price + ' <button class="btn small" onclick="addToCart(' + p.id + ')">কার্টে নিন</button></p>').join('') : '<p>এখনো কিছু যোগ করেননি।</p>') + '<p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>');
}
function showCompare() {
  const items = ALL.filter(p => CMP.includes(p.id));
  if (!items.length) { openModal('<h3>তুলনা</h3><p>তুলনা করতে পণ্যের কার্ড থেকে "তুলনা" চাপুন (সর্বোচ্চ ৩টি)।</p><p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>'); return; }
  const rows = [['দাম', x => '৳' + x.price], ['ক্যাটাগরি', x => x.category], ['স্টক', x => x.stock], ['রেটিং', x => x.avgRating + ' (' + x.reviewCount + ')'], ['বিক্রি', x => x.soldCount], ['SKU', x => x.sku]];
  const minPrice = Math.min(...items.map(x => x.price));
  openModal('<h3>পণ্যের তুলনা</h3><table><tr><th></th>' + items.map(p => '<th>' + esc(p.name) + '</th>').join('') + '</tr>' +
    rows.map(r => '<tr><td><b>' + r[0] + '</b></td>' + items.map(p => '<td>' + r[1](p) + (r[0] === 'দাম' && p.price === minPrice ? ' — সবচেয়ে কম' : '') + '</td>').join('') + '</tr>').join('') +
    '</table><p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>');
}
async function showDetail(id) {
  const r = await fetch('/api/products/' + id); const p = await r.json();
  RECENT = [id, ...RECENT.filter(x => x !== id)].slice(0, 4); localStorage.setItem('rf_recent', JSON.stringify(RECENT));
  const price = SETTINGS.flash_percent ? Math.round(p.price * (100 - SETTINGS.flash_percent) / 100) : p.price;
  const related = ALL.filter(x => x.category === p.category && x.id !== p.id).slice(0, 3);
  openModal('<h3>' + esc(p.name) + '</h3>' +
    '<div class="pvisual" style="background:' + colourFor(p) + ';height:120px;border-radius:6px">' + esc(p.category) + '</div>' +
    '<p>' + esc(p.description) + '</p><p><span class="price">৳' + price.toLocaleString() + '</span>' + (price !== p.price ? '<span class="old">৳' + p.price.toLocaleString() + '</span>' : '') + '</p>' +
    '<p class="pmeta">ক্যাটাগরি: ' + esc(p.category) + ' · SKU: ' + esc(p.sku) + ' · স্টক: ' + p.stock + (p.allow_preorder ? ' · প্রি-অর্ডার সম্ভব' + (p.preorder_eta ? ' (' + esc(p.preorder_eta) + ')' : '') : '') + '</p>' +
    (p.images && p.images.length ? '<p class="pmeta">ছবি: ' + p.images.map(i => esc(i.label)).join(', ') + '</p>' : '') +
    (p.variants.length ? '<label>সাইজ / রঙ বেছে নিন</label><select id="varSel">' + p.variants.map(v => '<option value="' + v.id + '">' + [v.size, v.color].filter(Boolean).join(' / ') + ' — ৳' + (p.price + v.price_delta) + ' (স্টক ' + v.stock + ')</option>').join('') + '</select>' : '') +
    '<p><button class="btn" onclick="addToCart(' + p.id + ', document.getElementById(\'varSel\') ? +document.getElementById(\'varSel\').value : null); closeModal()">কার্টে যোগ করুন</button> <button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>' +
    (related.length ? '<h4>সম্পর্কিত পণ্য</h4><p>' + related.map(x => esc(x.name) + ' — ৳' + x.price).join('<br>') + '</p>' : '') +
    '<h4>রিভিউ (' + p.reviewCount + ')</h4>' + (p.reviews.map(x => '<p>' + x.rating + '/৫ — <b>' + esc(x.customer_name) + '</b>: ' + esc(x.comment) + '</p>').join('') || '<p>এখনো রিভিউ নেই।</p>') +
    '<h4>রিভিউ লিখুন</h4><input id="rvName" placeholder="আপনার নাম"><input id="rvRate" type="number" min="1" max="5" value="5"><textarea id="rvText" placeholder="আপনার মতামত"></textarea><button class="btn small" onclick="submitReview(' + p.id + ')">রিভিউ জমা দিন</button>' +
    '<h4>প্রশ্ন করুন</h4><input id="qName" placeholder="আপনার নাম"><textarea id="qText" placeholder="পণ্য সম্পর্কে প্রশ্ন"></textarea><button class="btn small" onclick="submitQuestion(' + p.id + ')">প্রশ্ন পাঠান</button>' +
    (p.questions && p.questions.length ? p.questions.map(x => '<p><b>প্রশ্ন:</b> ' + esc(x.question) + '<br>' + (x.answer ? '<b>উত্তর:</b> ' + esc(x.answer) : 'উত্তরের অপেক্ষায়') + '</p>').join('') : ''));
}
async function submitReview(id) {
  const r = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: id, customer_name: document.getElementById('rvName').value, rating: document.getElementById('rvRate').value, comment: document.getElementById('rvText').value }) });
  const d = await r.json();
  if (!r.ok) return alert(d.error || 'ভুল হয়েছে');
  toast('ধন্যবাদ! রিভিউ জমা হয়েছে।'); closeModal(); loadProducts();
}
async function submitQuestion(id) {
  const r = await fetch('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: id, customer_name: document.getElementById('qName').value, question: document.getElementById('qText').value }) });
  const d = await r.json();
  if (!r.ok) return alert(d.error || 'ভুল হয়েছে');
  toast('প্রশ্ন পাঠানো হয়েছে।'); closeModal();
}
async function subscribe() {
  const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contact: document.getElementById('subContact').value }) });
  const d = await r.json();
  document.getElementById('subMsg').innerHTML = r.ok ? '<div class="ok">ধন্যবাদ! সাবস্ক্রাইব হয়েছে।</div>' : '<div class="err">' + (d.error || 'ভুল হয়েছে') + '</div>';
}
function cartLines() {
  return CART.map(i => { const p = ALL.find(x => x.id === i.product_id); if (!p) return null;
    const v = i.variant_id ? (p.variants || []).find(x => x.id === i.variant_id) : null;
    return { ...i, p, price: p.price + (v ? v.price_delta : 0), label: v ? [v.size, v.color].filter(Boolean).join(' / ') : '' }; }).filter(Boolean);
}
function comboDiscount(lines) {
  if (!SETTINGS.combo_enabled) return 0;
  const buy = SETTINGS.combo_buy || 2, free = SETTINGS.combo_free || 1, group = buy + free;
  const units = []; lines.forEach(l => { for (let i = 0; i < l.qty; i++) units.push(l.price); });
  units.sort((a, b) => a - b);
  const groups = Math.floor(units.length / group);
  return units.slice(0, groups * free).reduce((a, x) => a + x, 0);
}
function showCart() {
  const lines = cartLines(); const sub = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const bundle = comboDiscount(lines);
  const flash = SETTINGS.flash_percent ? Math.round((sub - bundle) * SETTINGS.flash_percent / 100) : 0;
  openModal('<h3>কার্ট</h3>' +
    (lines.length ? lines.map((l, i) => '<p>' + esc(l.p.name) + (l.label ? ' (' + esc(l.label) + ')' : '') + ' × ' + l.qty + ' — ৳' + (l.price * l.qty).toLocaleString() + ' <button onclick="CART.splice(' + i + ',1); saveCart(); showCart()">মুছুন</button></p>').join('') : '<p>কার্ট খালি।</p>') +
    '<p>মোট: ৳' + sub.toLocaleString() + (bundle ? '<br>কম্বো ছাড়: -৳' + bundle.toLocaleString() + ' (' + SETTINGS.combo_buy + ' কিনলে ' + SETTINGS.combo_free + ' ফ্রি)' : '') + (flash ? '<br>ফ্ল্যাশ সেল ছাড়: -৳' + flash.toLocaleString() : '') + '</p>' +
    '<p><input id="cpn" placeholder="কুপন কোড (যেমন WELCOME10)"> <button class="btn ghost small" onclick="applyCoupon()">কুপন দেখুন</button> <span id="cpnMsg"></span></p>' +
    (lines.length ? '<button class="btn" onclick="showCheckout()">চেকআউট করুন</button> ' : '') +
    '<button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button>');
}
async function applyCoupon() {
  const code = document.getElementById('cpn').value;
  const sub = cartLines().reduce((a, l) => a + l.price * l.qty, 0);
  const r = await fetch('/api/coupons/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, subtotal: sub }) });
  const d = await r.json();
  document.getElementById('cpnMsg').textContent = d.ok ? 'ছাড় ৳' + d.discount + ' (' + d.percent + '%)' : (d.error || 'ভুল কোড');
  window._coupon = d.ok ? code.toUpperCase() : '';
}
function showCheckout() {
  const cust = CUST;
  openModal('<h3>চেকআউট</h3>' +
    '<label>নাম *</label><input id="coName" value="' + (cust ? esc(cust.name) : '') + '">' +
    '<label>মোবাইল *</label><input id="coPhone" placeholder="01XXXXXXXXX" value="' + (cust ? esc(cust.phone) : '') + '">' +
    '<label>ঠিকানা *</label><textarea id="coAddr"></textarea>' +
    '<div class="row"><div><label>জেলা *</label><select id="coDistrict">' + DISTRICTS.map(d => '<option ' + (d === 'ঢাকা' ? 'selected' : '') + '>' + d + '</option>').join('') + '</select></div>' +
    '<div><label>থানা</label><input id="coThana"></div></div>' +
    '<label>পেমেন্ট</label><select id="coPay"><option>COD</option><option>bKash</option><option>Nagad</option></select>' +
    '<p class="small">বিকাশ/নগদ: অর্ডারের পর দোকান থেকে নম্বর জানিয়ে দেওয়া হবে (ম্যানুয়াল পেমেন্ট)।</p>' +
    '<label>ডেলিভারি সময়</label><select id="coSlot"><option value="">যেকোনো সময়</option><option>সকাল ৯টা–১২টা</option><option>দুপুর ১২টা–৩টা</option><option>বিকেল ৩টা–৬টা</option></select>' +
    '<label><input type="checkbox" id="coGift" style="width:auto"> গিফট র‍্যাপ (+৳' + (SETTINGS.gift_wrap_fee || 50) + ')</label>' +
    '<input id="coGiftMsg" placeholder="গিফট মেসেজ (ঐচ্ছিক)">' +
    '<label>লয়্যালটি পয়েন্ট ব্যবহার</label><input id="coRedeem" type="number" min="0" value="0" placeholder="0">' +
    '<label>রেফারেল কোড (ঐচ্ছিক)</label><input id="coRef" placeholder="যেমন RF1234">' +
    '<p><button class="btn" onclick="placeOrder()">অর্ডার করুন</button> <button class="btn ghost" onclick="closeModal()">বাতিল</button></p><div id="coErr"></div>');
}
async function placeOrder() {
  const body = { name: document.getElementById('coName').value, phone: document.getElementById('coPhone').value, address: document.getElementById('coAddr').value, district: document.getElementById('coDistrict').value, thana: document.getElementById('coThana').value, payment_method: document.getElementById('coPay').value, gift_wrap: document.getElementById('coGift').checked, gift_message: document.getElementById('coGiftMsg').value, delivery_slot: document.getElementById('coSlot').value, redeem_points: Number(document.getElementById('coRedeem').value || 0), referral_code: document.getElementById('coRef').value, coupon_code: window._coupon || '', items: CART.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, qty: i.qty })) };
  const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) { document.getElementById('coErr').innerHTML = '<div class="err">' + (d.error || 'ভুল হয়েছে') + '</div>'; return; }
  CART = []; saveCart(); window._coupon = '';
  openModal('<h3>অর্ডার হয়েছে!</h3><p>অর্ডার নম্বর: <b>' + d.order_number + '</b></p>' +
    '<p>মোট: ৳' + d.total.toLocaleString() + ' · ডেলিভারি: ৳' + d.delivery_charge + ' · ছাড়: ৳' + d.discount + ' · লয়্যালটি পয়েন্ট: ' + d.loyalty_earned + '</p>' +
    '<p><a class="btn" href="' + d.whatsapp_url + '" target="_blank">WhatsApp-এ অর্ডার পাঠান</a></p>' +
    '<p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>');
}
function showTrack() {
  openModal('<h3>অর্ডার ট্র্যাক করুন</h3><label>অর্ডার নম্বর</label><input id="trNo" placeholder="RF-XXXXXX"><label>মোবাইল নম্বর</label><input id="trPh" placeholder="01XXXXXXXXX"><p><button class="btn" onclick="doTrack()">খুঁজুন</button></p><div id="trOut"></div>' +
    '<h4>রিটার্ন / এক্সচেঞ্জ অনুরোধ</h4><label>অর্ডার নম্বর</label><input id="rtNo"><label>মোবাইল</label><input id="rtPh"><label>ধরন</label><select id="rtType"><option value="return">রিটার্ন</option><option value="exchange">এক্সচেঞ্জ</option></select><label>কারণ</label><textarea id="rtReason"></textarea><p><button class="btn ghost" onclick="requestReturn()">অনুরোধ পাঠান</button></p><div id="rtOut"></div>');
}
async function doTrack() {
  const r = await fetch('/api/track?order_number=' + encodeURIComponent(document.getElementById('trNo').value) + '&phone=' + encodeURIComponent(document.getElementById('trPh').value));
  const d = await r.json();
  document.getElementById('trOut').innerHTML = !d.ok ? '<div class="err">' + d.error + '</div>' :
    '<div class="ok"><b>' + d.order.order_number + '</b> — স্ট্যাটাস: <b>' + d.order.status + '</b> · মোট ৳' + d.order.total.toLocaleString() + '<br>কুরিয়ার: ' + d.order.courier + ' · কনসাইনমেন্ট: ' + (d.order.consignment_id || 'এখনো দেওয়া হয়নি') + ' · ' + (d.order.courier_status || '') + '<br>' + d.order.items.map(i => esc(i.product_name) + ' × ' + i.qty).join(', ') + '</div>';
}
async function requestReturn() {
  const r = await fetch('/api/returns/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_number: document.getElementById('rtNo').value, phone: document.getElementById('rtPh').value, type: document.getElementById('rtType').value, reason: document.getElementById('rtReason').value }) });
  const d = await r.json();
  document.getElementById('rtOut').innerHTML = r.ok ? '<div class="ok">অনুরোধ পাঠানো হয়েছে।</div>' : '<div class="err">' + (d.error || 'ভুল হয়েছে') + '</div>';
}
function showAccount() {
  if (CUST) {
    openModal('<h3>আমার অ্যাকাউন্ট</h3><p>নাম: <b>' + esc(CUST.name) + '</b><br>ফোন: ' + esc(CUST.phone) + '<br>লয়্যালটি পয়েন্ট: ' + CUST.loyalty_points + '<br>রেফারেল কোড: ' + esc(CUST.referral_code || '') + '</p>' +
      '<p><button class="btn" onclick="showMyOrders()">আমার অর্ডার দেখুন</button> <button class="btn ghost" onclick="CUST=null;sessionStorage.removeItem(\'rf_customer\');closeModal();toast(\'লগআউট হয়েছে\')">লগআউট</button></p>');
    return;
  }
  openModal('<h3>কাস্টমার অ্যাকাউন্ট</h3><p class="small">ফোন নম্বর + নিজের PIN দিয়ে লগইন করুন। OTP লাগে না — PIN শুধু হ্যাশ হিসেবে থাকে।</p>' +
    '<label>নাম (রেজিস্টারের সময়)</label><input id="acName"><label>মোবাইল *</label><input id="acPhone" placeholder="01XXXXXXXXX"><label>PIN (৪–৮ সংখ্যা) *</label><input id="acPin" type="password"><label>রেফারেল কোড (ঐচ্ছিক)</label><input id="acRef">' +
    '<p><button class="btn" onclick="custLogin()">লগইন</button> <button class="btn ghost" onclick="custRegister()">রেজিস্টার করুন</button></p><div id="acErr"></div>');
}
async function custLogin() {
  const r = await fetch('/api/customers/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: document.getElementById('acPhone').value, pin: document.getElementById('acPin').value }) });
  const d = await r.json();
  if (!r.ok) { document.getElementById('acErr').innerHTML = '<div class="err">' + d.error + '</div>'; return; }
  CUST = { name: d.name, phone: document.getElementById('acPhone').value, loyalty_points: d.loyalty_points, referral_code: d.referral_code, token: d.token };
  sessionStorage.setItem('rf_customer', JSON.stringify(CUST)); toast('লগইন হয়েছে'); closeModal();
}
async function custRegister() {
  const r = await fetch('/api/customers/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('acName').value, phone: document.getElementById('acPhone').value, pin: document.getElementById('acPin').value, referral_code: document.getElementById('acRef').value }) });
  const d = await r.json();
  if (!r.ok) { document.getElementById('acErr').innerHTML = '<div class="err">' + d.error + '</div>'; return; }
  CUST = { name: document.getElementById('acName').value, phone: document.getElementById('acPhone').value, loyalty_points: d.loyalty_points, referral_code: '', token: d.token };
  sessionStorage.setItem('rf_customer', JSON.stringify(CUST)); toast('অ্যাকাউন্ট তৈরি হয়েছে — ৫০ পয়েন্ট পেয়েছেন'); closeModal();
}
async function showMyOrders() {
  if (!CUST) return showAccount();
  const r = await fetch('/api/my-orders?phone=' + encodeURIComponent(CUST.phone)); const d = await r.json();
  openModal('<h3>আমার অর্ডার</h3><p>লয়্যালটি পয়েন্ট: ' + d.loyalty_points + ' · রেফারেল কোড: ' + esc(d.referral_code || '') + '</p>' +
    (d.orders.map(o => '<div class="card" style="margin-bottom:8px"><b>' + o.order_number + '</b> — ' + o.status + ' · ৳' + o.total.toLocaleString() + '<br>' + o.items.map(i => esc(i.product_name) + ' × ' + i.qty).join(', ') + '<br><button class="btn small" onclick="reorder(' + o.id + ')">আবার অর্ডার করুন</button></div>').join('') || '<p>এখনো কোনো অর্ডার নেই।</p>') +
    '<p><button class="btn ghost" onclick="closeModal()">বন্ধ করুন</button></p>');
  window._myOrders = d.orders;
}
function reorder(id) {
  const o = (window._myOrders || []).find(x => x.id === id); if (!o) return;
  o.items.forEach(i => { const ex = CART.find(c => c.product_id === i.product_id); if (ex) ex.qty += i.qty; else CART.push({ product_id: i.product_id, variant_id: null, qty: i.qty }); });
  saveCart(); closeModal(); toast('আগের অর্ডারের পণ্য কার্টে যোগ হয়েছে'); showCart();
}
function maybePromo() {
  if (sessionStorage.getItem('rf_promo_seen')) return;
  sessionStorage.setItem('rf_promo_seen', '1');
  const code = SETTINGS.promo_code || 'WELCOME10';
  setTimeout(() => openModal('<h3>স্বাগতম অফার</h3><p>প্রথম অর্ডারে কুপন কোড <b>' + esc(code) + '</b> ব্যবহার করুন — ১০% ছাড় (কমপক্ষে ৳১,০০০)।</p><p><button class="btn" onclick="window._coupon=\'' + esc(code) + '\';closeModal();showCart()">কুপন নিয়ে কার্টে যান</button> <button class="btn ghost" onclick="closeModal()">পরে</button></p>'), 1200);
}
init();

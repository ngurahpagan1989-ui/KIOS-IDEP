/**
 * ==============================================================================
 * KATALOG PUBLIK & PEMESANAN WHATSAPP
 * Terisolasi Penuh dari Modul Admin (Zero-Leak)
 * ==============================================================================
 */

// 1. KREDENSIAL SUPABASE (HANYA ANON KEY PUBLIK)
const SUPABASE_URL = 'https://xozysfvlhcyjytukisul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvenlzZnZsaGN5anl0dWtpc3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDg3MzYsImV4cCI6MjEwNTUyNDczNn0.SNlrOxV3jx3H3pYxu9BAMi1zxsW-cmvty_FZL0-RsdQ';

let supabaseClient = null;

// 2. STATE APLIKASI KATALOG
let allProducts = [];
let filteredProducts = [];
let categories = ['Semua'];
let activeCategory = 'Semua';
let searchQuery = '';
let cart = [];

let storeConfig = {
  name: 'Katalog Resmi',
  phone: '081945468237',
  address: '',
  tagline: 'Katalog Produk & Benih Pilihan'
};

// 3. INISIALISASI SAAT DOM SIAP
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  loadCartFromStorage();
  loadSavedCustomerInfo();
  setupEventListeners();
  fetchCatalogData();
});

function initSupabase() {
  try {
    const createFn = window.supabase?.createClient;
    if (typeof createFn === 'function') {
      supabaseClient = createFn(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
      console.error('Library Supabase CDN tidak tersedia.');
    }
  } catch (err) {
    console.error('Gagal inisialisasi Supabase:', err);
  }
}

// 4. PENGAMBILAN DATA PUBLIK DARI SUPABASE
async function fetchCatalogData() {
  const grid = document.getElementById('products-grid');
  if (grid) {
    grid.innerHTML = Array(6).fill('<div class="skeleton-card"></div>').join('');
  }

  try {
    if (!supabaseClient) throw new Error('Koneksi Supabase belum siap.');

    // A. Ambil Informasi Toko
    const { data: settingsData } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['store_name', 'store_phone', 'store_address', 'store_tagline']);

    if (Array.isArray(settingsData)) {
      settingsData.forEach(s => {
        if (s.key === 'store_name' && s.value) storeConfig.name = s.value;
        if (s.key === 'store_phone' && s.value) storeConfig.phone = s.value;
        if (s.key === 'store_address' && s.value) storeConfig.address = s.value;
        if (s.key === 'store_tagline' && s.value) storeConfig.tagline = s.value;
      });
      updateStoreHeaderUI();
    }

    // B. Ambil Produk Aktif Beserta Price Tier Reguler (HANYA KOLOM PUBLIK)
    const { data: prodsData, error: prodsErr } = await supabaseClient
      .from('products')
      .select(`
        id,
        name,
        category,
        variant,
        unit,
        photo_url,
        stock,
        price_tiers (
          tier_name,
          price
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (prodsErr) throw prodsErr;

    // Normalisasi Produk
    allProducts = (prodsData || []).map(p => {
      // Cari harga reguler
      let price = 0;
      if (Array.isArray(p.price_tiers) && p.price_tiers.length > 0) {
        const regTier = p.price_tiers.find(t => String(t.tier_name).toLowerCase() === 'reguler');
        if (regTier && Number(regTier.price) > 0) {
          price = Number(regTier.price);
        } else {
          // Ambil harga tier pertama yang valid
          const firstTier = p.price_tiers.find(t => Number(t.price) > 0);
          if (firstTier) price = Number(firstTier.price);
        }
      }

      return {
        id: p.id,
        name: p.name || 'Produk Tanpa Nama',
        category: p.category ? p.category.trim() : 'Umum',
        variant: p.variant || '',
        unit: p.unit || 'pcs',
        photo_url: p.photo_url || '',
        stock: Number(p.stock || 0),
        price: price
      };
    });

    // Ekstrak Kategori Unik
    const catSet = new Set(['Semua']);
    allProducts.forEach(p => {
      if (p.category) catSet.add(p.category);
    });
    categories = Array.from(catSet);

    renderCategoryChips();
    applyFilterAndRender();

  } catch (err) {
    console.error('Gagal memuat katalog:', err);
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-exclamation-triangle" style="color:var(--danger);"></i>
          <h3>Gagal Memuat Katalog</h3>
          <p>Terjadi kendala jaringan saat mengambil data produk. Silakan coba muat ulang.</p>
          <button class="btn-add-cart" onclick="fetchCatalogData()" style="margin:16px auto;max-width:200px;">
            <i class="fas fa-redo"></i> Coba Lagi
          </button>
        </div>
      `;
    }
  }
}

// 5. RENDER UI & KOMPONEN
function updateStoreHeaderUI() {
  const titleEl = document.getElementById('store-title');
  const taglineEl = document.getElementById('store-tagline');
  const addressEl = document.getElementById('store-address');
  const phoneBtn = document.getElementById('store-phone-btn');
  const footerStoreEl = document.getElementById('footer-store-name');

  if (titleEl) titleEl.textContent = storeConfig.name;
  if (taglineEl) taglineEl.textContent = storeConfig.tagline || 'Katalog Resmi Produk & Benih Berkualitas';
  if (addressEl) {
    if (storeConfig.address) {
      addressEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${escapeHtml(storeConfig.address)}`;
      addressEl.style.display = 'inline-flex';
    } else {
      addressEl.style.display = 'none';
    }
  }
  if (phoneBtn) {
    if (storeConfig.phone) {
      const waNumber = formatWaNumber(storeConfig.phone);
      phoneBtn.href = `https://wa.me/${waNumber}?text=${encodeURIComponent('Halo ' + storeConfig.name + ', saya ingin bertanya mengenai produk.')}`;
      phoneBtn.style.display = 'inline-flex';
    } else {
      phoneBtn.style.display = 'none';
    }
  }
  if (footerStoreEl) footerStoreEl.textContent = storeConfig.name;
  document.title = `${storeConfig.name} - Katalog Online`;
}

function renderCategoryChips() {
  const container = document.getElementById('category-chips');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <button type="button" class="category-chip ${cat === activeCategory ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat)}')">
      ${escapeHtml(cat)}
    </button>
  `).join('');
}

function selectCategory(cat) {
  activeCategory = cat;
  renderCategoryChips();
  applyFilterAndRender();
}

function applyFilterAndRender() {
  const q = searchQuery.toLowerCase().trim();

  filteredProducts = allProducts.filter(p => {
    const matchCat = (activeCategory === 'Semua') || (p.category === activeCategory);
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.variant && p.variant.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  renderProductsGrid();
}

function renderProductsGrid() {
  const grid = document.getElementById('products-grid');
  const statusEl = document.getElementById('result-status');
  if (!grid) return;

  if (statusEl) {
    statusEl.textContent = `Menampilkan ${filteredProducts.length} produk`;
  }

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search"></i>
        <h3>Produk Tidak Ditemukan</h3>
        <p>Coba gunakan kata kunci pencarian lain atau pilih kategori yang berbeda.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(p => {
    const cartItem = cart.find(ci => ci.id === p.id);
    const inCartQty = cartItem ? cartItem.qty : 0;
    const isAvailable = p.stock > 0;

    const thumbHtml = p.photo_url ?
      `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.name)}" class="product-thumb" loading="lazy" onerror="this.outerHTML='<div class=\\'product-thumb-placeholder\\'><i class=\\'fas fa-seedling\\'></i><span>${escapeHtml(p.category)}</span></div>'">` :
      `<div class="product-thumb-placeholder"><i class="fas fa-seedling"></i><span>${escapeHtml(p.category)}</span></div>`;

    const actionHtml = inCartQty > 0 ? `
      <div class="card-qty-control">
        <button type="button" class="qty-btn" onclick="updateCartQty('${p.id}', -1)" title="Kurangi">&minus;</button>
        <span class="qty-val">${inCartQty}</span>
        <button type="button" class="qty-btn" onclick="updateCartQty('${p.id}', 1)" title="Tambah">&plus;</button>
      </div>
    ` : `
      <button type="button" class="btn-add-cart" onclick="addToCart('${p.id}')">
        <i class="fas fa-cart-plus"></i> + Keranjang
      </button>
    `;

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-thumb-wrap">
          ${thumbHtml}
          <span class="badge-stock ${isAvailable ? 'available' : 'out'}">
            ${isAvailable ? 'Tersedia' : 'Hubungi Toko'}
          </span>
        </div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(p.category)}</div>
          <h3 class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
          <div class="product-variant-info">
            ${p.variant ? `<span>📦 ${escapeHtml(p.variant)}</span>` : ''}
            <span>&bull; ${escapeHtml(p.unit)}</span>
          </div>
          <div class="product-price-row">
            <div class="product-price">${formatRupiah(p.price)}</div>
            <div class="product-actions" id="action-wrap-${p.id}">
              ${actionHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 6. OPERASI KERANJANG BELANJA
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      variant: product.variant,
      unit: product.unit,
      price: product.price,
      qty: 1
    });
  }

  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);
  showToast(`"${product.name}" ditambahkan ke keranjang.`);
}

function updateCartQty(productId, delta) {
  const itemIndex = cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) return;

  cart[itemIndex].qty += delta;

  if (cart[itemIndex].qty <= 0) {
    cart.splice(itemIndex, 1);
  }

  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);

  // Jika modal keranjang terbuka, render ulang daftar item di modal
  renderCartModalItems();
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  updateSingleCardAction(productId);
  renderCartModalItems();
  showToast('Item dihapus dari keranjang.');
}

function clearCart() {
  if (cart.length === 0) return;
  if (confirm('Kosongkan semua pesanan di keranjang?')) {
    const affectedIds = cart.map(i => i.id);
    cart = [];
    saveCartToStorage();
    updateCartBadge();
    updateFloatingCartBar();
    affectedIds.forEach(id => updateSingleCardAction(id));
    closeCartModal();
    showToast('Keranjang telah dikosongkan.');
  }
}

function updateSingleCardAction(productId) {
  const wrap = document.getElementById(`action-wrap-${productId}`);
  if (!wrap) return;

  const item = cart.find(ci => ci.id === productId);
  if (item && item.qty > 0) {
    wrap.innerHTML = `
      <div class="card-qty-control">
        <button type="button" class="qty-btn" onclick="updateCartQty('${productId}', -1)" title="Kurangi">&minus;</button>
        <span class="qty-val">${item.qty}</span>
        <button type="button" class="qty-btn" onclick="updateCartQty('${productId}', 1)" title="Tambah">&plus;</button>
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <button type="button" class="btn-add-cart" onclick="addToCart('${productId}')">
        <i class="fas fa-cart-plus"></i> + Keranjang
      </button>
    `;
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = totalItems;
  if (totalItems > 0) {
    badge.classList.add('has-items');
  } else {
    badge.classList.remove('has-items');
  }
}

function updateFloatingCartBar() {
  const bar = document.getElementById('floating-cart-bar');
  if (!bar) return;

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (totalItems > 0) {
    const qtyEl = document.getElementById('float-qty-text');
    const totalEl = document.getElementById('float-total-text');
    if (qtyEl) qtyEl.textContent = `${totalItems} Barang Dipilih`;
    if (totalEl) totalEl.textContent = formatRupiah(totalPrice);
    bar.classList.add('visible');
  } else {
    bar.classList.remove('visible');
  }
}

function saveCartToStorage() {
  try {
    localStorage.setItem('public_catalog_cart', JSON.stringify(cart));
  } catch (e) {}
}

function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem('public_catalog_cart');
    if (raw) cart = JSON.parse(raw);
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
  updateFloatingCartBar();
}

// 7. MODAL KERANJANG & CHECKOUT
function openCartModal() {
  if (cart.length === 0) {
    showToast('Keranjang belanja Anda masih kosong.');
    return;
  }
  renderCartModalItems();
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartModal() {
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartModalItems() {
  const container = document.getElementById('cart-items-list');
  const totalModalEl = document.getElementById('modal-total-price');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px 0;color:var(--text-muted);">
        <i class="fas fa-shopping-basket" style="font-size:32px;color:#CBD5E1;margin-bottom:8px;"></i>
        <p>Keranjang belanja kosong.</p>
      </div>
    `;
    if (totalModalEl) totalModalEl.textContent = 'Rp 0';
    return;
  }

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  if (totalModalEl) totalModalEl.textContent = formatRupiah(totalPrice);

  container.innerHTML = cart.map(item => `
    <div class="cart-item-row">
      <div class="cart-item-details">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-sub">
          ${item.variant ? `<span>${escapeHtml(item.variant)} &bull; </span>` : ''}
          <strong>${formatRupiah(item.price)}</strong> / ${escapeHtml(item.unit)}
        </div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-mini-qty">
          <button type="button" class="btn-mini-qty" onclick="updateCartQty('${item.id}', -1)">&minus;</button>
          <span class="mini-qty-val">${item.qty}</span>
          <button type="button" class="btn-mini-qty" onclick="updateCartQty('${item.id}', 1)">&plus;</button>
        </div>
        <button type="button" class="btn-del-item" onclick="removeFromCart('${item.id}')" title="Hapus">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// 8. PROSES CHECKOUT WHATSAPP
function sendOrderToWhatsApp() {
  if (cart.length === 0) {
    alert('Keranjang belanja kosong!');
    return;
  }

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const methodSelect = document.getElementById('cust-method');
  const notesInput = document.getElementById('cust-notes');

  const customerName = nameInput ? nameInput.value.trim() : '';
  const customerPhone = phoneInput ? phoneInput.value.trim() : '';
  const deliveryMethod = methodSelect ? methodSelect.value : 'Ambil di Toko';
  const notes = notesInput ? notesInput.value.trim() : '';

  if (!customerName) {
    alert('Mohon masukkan Nama Pemesan.');
    if (nameInput) nameInput.focus();
    return;
  }

  if (!customerPhone) {
    alert('Mohon masukkan Nomor WhatsApp Pemesan.');
    if (phoneInput) phoneInput.focus();
    return;
  }

  // Simpan data customer untuk auto-fill kunjungan berikutnya
  try {
    localStorage.setItem('catalog_last_cust_name', customerName);
    localStorage.setItem('catalog_last_cust_phone', customerPhone);
    localStorage.setItem('catalog_last_cust_notes', notes);
  } catch (e) {}

  // Format Teks Pesan WhatsApp
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  let msg = `*HALO ${storeConfig.name.toUpperCase()}*\n`;
  msg += `Saya ingin memesan produk melalui Katalog Online:\n\n`;
  msg += `📦 *DAFTAR PESANAN:*\n`;

  cart.forEach((item, idx) => {
    const subtotal = item.price * item.qty;
    const variantStr = item.variant ? ` (${item.variant})` : '';
    msg += `${idx + 1}. *${item.name}*${variantStr}\n`;
    msg += `   └ ${item.qty} ${item.unit} x ${formatRupiah(item.price)} = ${formatRupiah(subtotal)}\n`;
  });

  msg += `\n--------------------------------\n`;
  msg += `💰 *TOTAL ESTIMASI: ${formatRupiah(totalPrice)}*\n\n`;

  msg += `👤 *DATA PEMESAN:*\n`;
  msg += `• Nama: *${customerName}*\n`;
  msg += `• No. WA: *${customerPhone}*\n`;
  msg += `• Metode: *${deliveryMethod}*\n`;
  if (notes) {
    msg += `• Alamat / Catatan: ${notes}\n`;
  }

  msg += `\nMohon informasi ketersediaan stok dan rekening pembayaran resmi toko. Terima kasih! 🙏`;

  const waTarget = formatWaNumber(storeConfig.phone);
  const waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`;

  // Buka WhatsApp di tab / app baru
  window.open(waUrl, '_blank');
}

function loadSavedCustomerInfo() {
  try {
    const savedName = localStorage.getItem('catalog_last_cust_name');
    const savedPhone = localStorage.getItem('catalog_last_cust_phone');
    const savedNotes = localStorage.getItem('catalog_last_cust_notes');

    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const notesInput = document.getElementById('cust-notes');

    if (savedName && nameInput) nameInput.value = savedName;
    if (savedPhone && phoneInput) phoneInput.value = savedPhone;
    if (savedNotes && notesInput) notesInput.value = savedNotes;
  } catch (e) {}
}

// 9. EVENT LISTENERS
function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
      applyFilterAndRender();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilterAndRender();
      }
    });
  }

  // Klik backdrop untuk menutup modal
  const backdrop = document.getElementById('cart-modal-backdrop');
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeCartModal();
    });
  }
}

// 10. HELPER FUNCTIONS
function formatRupiah(num) {
  const n = Number(num || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatWaNumber(phoneStr) {
  if (!phoneStr) return '6281945468237';
  let clean = phoneStr.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (!clean.startsWith('62')) {
    clean = '62' + clean;
  }
  return clean;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('catalog-toast');
  const msgEl = document.getElementById('toast-text');
  if (!toast || !msgEl) return;

  msgEl.textContent = msg;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

// Ekspor ke window untuk event inline onclick
window.selectCategory = selectCategory;
window.addToCart = addToCart;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.openCartModal = openCartModal;
window.closeCartModal = closeCartModal;
window.sendOrderToWhatsApp = sendOrderToWhatsApp;
window.fetchCatalogData = fetchCatalogData;


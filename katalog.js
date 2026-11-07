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
let filterOnlyReady = false;
let activeCategory = 'Semua';
let searchQuery = '';
let cart = [];

let storeConfig = {
  name: 'Kebun Benih IDEP',
  phone: '081945468237',
  address: '',
  tagline: 'Pusat Benih Alami, Lokal & Berkelanjutan — IDEP Foundation'
};

const DEFAULT_PROMO_CONFIG = {
  announcement_enabled: true,
  announcement_text: '🌱 Panen Benih Lokal Baru Tiba! • Pesan Online Mudah & Cepat • Gratis Konsultasi Menanam via WhatsApp IDEP Foundation',
  banner_enabled: true,
  banners: [
    {
      image_url: 'https://images.unsplash.com/photo-1592417817098-8f3d69109853?auto=format&fit=crop&w=1200&q=80',
      badge: 'KOLEKSI SPESIAL',
      title: 'Benih Sayuran & Buah Lokal Pusaka',
      desc: '100% Organik, Alami, dan Non-GMO dari Kebun Pelestarian IDEP Foundation',
      btn_text: 'Jelajahi Benih',
      category: 'Sayuran'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80',
      badge: 'PAKET BERKEBUN',
      title: 'Mulai Kebun Pangan di Halaman Rumah',
      desc: 'Varietas unggul mudah tumbuh & tahan hama dengan daya kecambah teruji',
      btn_text: 'Pilih Benih',
      category: 'Semua'
    },
    {
      image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=1200&q=80',
      badge: 'WARISAN NUSANTARA',
      title: 'Konservasi Benih Tanaman Tradisional',
      desc: 'Rawat keberagaman pangan nusantara dengan menanam benih lokal lestari',
      btn_text: 'Lihat Koleksi',
      category: 'Semua'
    }
  ],
  featured_enabled: true,
  featured_title: 'Pilihan Pekan Ini & Paling Laris'
};

let activePromoConfig = JSON.parse(JSON.stringify(DEFAULT_PROMO_CONFIG));
let currentSlideIndex = 0;
let totalSlides = 0;
let sliderAutoTimer = null;

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

    // A. Ambil Informasi Toko & Media Promosi
    const { data: settingsData } = await supabaseClient
      .from('settings')
      .select('key, value')
      .in('key', ['store_name', 'store_phone', 'store_address', 'store_tagline', 'catalog_title', 'catalog_notes', 'catalog_promo_config']);

    if (Array.isArray(settingsData)) {
      settingsData.forEach(s => {
        if (s.key === 'store_name' && s.value) storeConfig.name = s.value;
        if (s.key === 'catalog_title' && s.value) storeConfig.name = s.value;
        if (s.key === 'catalog_notes' && s.value) storeConfig.notes = s.value;
        if (s.key === 'store_phone' && s.value) storeConfig.phone = s.value;
        if (s.key === 'store_address' && s.value) storeConfig.address = s.value;
        if (s.key === 'store_tagline' && s.value) storeConfig.tagline = s.value;

        if (s.key === 'catalog_promo_config' && s.value) {
          try {
            const parsed = JSON.parse(s.value);
            activePromoConfig = Object.assign({}, DEFAULT_PROMO_CONFIG, parsed);
          } catch (e) {
            console.warn('Gagal mem-parse catalog_promo_config:', e);
          }
        }
      });
      updateStoreHeaderUI();
      applyPromoMediaUI();
    } else {
      applyPromoMediaUI();
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

    // B.2 Ambil Stok Fisik Riil dari Lot Batch Aktif (FIFO)
    let batchStockMap = {};
    try {
      const { data: batchesData } = await supabaseClient
        .from('stock_batches')
        .select('product_id, qty_remaining')
        .gt('qty_remaining', 0);

      if (Array.isArray(batchesData)) {
        batchesData.forEach(b => {
          batchStockMap[b.product_id] = (batchStockMap[b.product_id] || 0) + Number(b.qty_remaining || 0);
        });
      }
    } catch (e) {
      console.warn('Gagal ambil stock_batches, menggunakan kolom stock:', e);
    }

    // Normalisasi Produk
    allProducts = (prodsData || []).map(p => {
      const finalStock = (batchStockMap[p.id] !== undefined) ? batchStockMap[p.id] : Number(p.stock || 0);
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
        stock: finalStock,
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
    renderFeaturedProducts();
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
  if (taglineEl) {
    let text = storeConfig.tagline || 'Katalog Resmi Produk & Benih Berkualitas';
    if (storeConfig.notes) {
      text += ' • ' + storeConfig.notes;
    }
    taglineEl.textContent = text;
  }
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

// 5.B MEDIA PROMOSI & BANNER SLIDER
function applyPromoMediaUI() {
  // 1. Announcement Bar
  const annBar = document.getElementById('catalog-announcement-bar');
  const annText = document.getElementById('announcement-text');
  if (annBar && annText) {
    if (activePromoConfig.announcement_enabled && activePromoConfig.announcement_text) {
      annText.textContent = activePromoConfig.announcement_text;
      annBar.style.display = 'block';
    } else {
      annBar.style.display = 'none';
    }
  }

  // 2. Hero Slider
  const sliderSec = document.getElementById('hero-slider-section');
  if (sliderSec) {
    if (activePromoConfig.banner_enabled && Array.isArray(activePromoConfig.banners) && activePromoConfig.banners.length > 0) {
      renderHeroSlider(activePromoConfig.banners);
      sliderSec.style.display = 'block';
      startSliderAutoPlay();
    } else {
      sliderSec.style.display = 'none';
      if (sliderAutoTimer) clearInterval(sliderAutoTimer);
    }
  }
}

function renderHeroSlider(banners) {
  const track = document.getElementById('slider-track');
  const dots = document.getElementById('slider-dots');
  if (!track || !dots) return;

  totalSlides = banners.length;
  currentSlideIndex = 0;

  track.innerHTML = banners.map((b, idx) => `
    <div class="slider-slide" data-slide-index="${idx}">
      <img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.title || 'Promo Kebun IDEP')}" class="slide-bg" loading="${idx === 0 ? 'eager' : 'lazy'}">
      <div class="slide-overlay">
        ${b.badge ? `<span class="slide-badge">${escapeHtml(b.badge)}</span>` : ''}
        <h2 class="slide-title">${escapeHtml(b.title || '')}</h2>
        <p class="slide-desc">${escapeHtml(b.desc || '')}</p>
        <button type="button" class="slide-cta-btn" onclick="handleSlideCTA('${escapeHtml(b.category || 'Semua')}')">
          ${escapeHtml(b.btn_text || 'Lihat Produk')} <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `).join('');

  dots.innerHTML = banners.map((_, idx) => `
    <span class="slider-dot ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})"></span>
  `).join('');

  updateSliderPosition();
  setupSliderTouch(track);
}

function moveSlider(dir) {
  if (totalSlides <= 1) return;
  currentSlideIndex += dir;
  if (currentSlideIndex >= totalSlides) currentSlideIndex = 0;
  if (currentSlideIndex < 0) currentSlideIndex = totalSlides - 1;
  updateSliderPosition();
  resetSliderTimer();
}

function prevSlide() {
  moveSlider(-1);
}

function nextSlide() {
  moveSlider(1);
}

function goToSlide(idx) {
  if (idx < 0 || idx >= totalSlides) return;
  currentSlideIndex = idx;
  updateSliderPosition();
  resetSliderTimer();
}

function updateSliderPosition() {
  const track = document.getElementById('slider-track');
  if (track) {
    track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
  }
  const allDots = document.querySelectorAll('.slider-dot');
  allDots.forEach((d, idx) => {
    d.classList.toggle('active', idx === currentSlideIndex);
  });
}

function startSliderAutoPlay() {
  if (sliderAutoTimer) clearInterval(sliderAutoTimer);
  if (totalSlides <= 1) return;
  sliderAutoTimer = setInterval(() => {
    if (totalSlides > 1) {
      currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
      updateSliderPosition();
    }
  }, 5000);
}

function resetSliderTimer() {
  if (sliderAutoTimer) {
    clearInterval(sliderAutoTimer);
    startSliderAutoPlay();
  }
}

let touchStartX = 0;
let touchEndX = 0;
function setupSliderTouch(trackEl) {
  if (!trackEl || trackEl._hasTouchBound) return;
  trackEl._hasTouchBound = true;

  trackEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  trackEl.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  }, { passive: true });
}

function handleSlideCTA(category) {
  if (category && category !== 'Semua') {
    selectCategory(category);
  } else {
    selectCategory('Semua');
  }
  const filterSec = document.getElementById('filter-section');
  if (filterSec) {
    filterSec.scrollIntoView({ behavior: 'smooth' });
  }
}

function renderFeaturedProducts() {
  const sec = document.getElementById('featured-section');
  const titleEl = document.getElementById('featured-section-title');
  const track = document.getElementById('featured-track');
  if (!sec || !track) return;

  if (!activePromoConfig.featured_enabled) {
    sec.style.display = 'none';
    return;
  }

  if (titleEl && activePromoConfig.featured_title) {
    titleEl.textContent = activePromoConfig.featured_title;
  }

  // Pilih hingga 8 produk unggulan / terlaris yang ready stock
  const featured = allProducts
    .filter(p => p.stock > 0)
    .slice(0, 8);

  if (featured.length === 0) {
    sec.style.display = 'none';
    return;
  }

  sec.style.display = 'block';
  track.innerHTML = featured.map(p => {
    const thumbHtml = p.photo_url ?
      `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.name)}" class="featured-card-img" loading="lazy" onerror="this.outerHTML='<div class=\\'featured-card-placeholder\\'><i class=\\'fas fa-seedling\\'></i></div>'">` :
      `<div class="featured-card-placeholder"><i class="fas fa-seedling"></i></div>`;

    return `
      <div class="featured-card" onclick="quickSelectProduct('${p.id}')">
        <div class="featured-card-media">
          ${thumbHtml}
          <span class="featured-badge-overlay">🔥 Pilihan Terbaik</span>
        </div>
        <div class="featured-card-content">
          <div class="featured-card-cat">${escapeHtml(p.category)}</div>
          <div class="featured-card-title">${escapeHtml(p.name)}</div>
          <div class="featured-card-price">${formatRupiah(p.price)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function quickSelectProduct(productId) {
  addToCart(productId);
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
    const matchReady = !filterOnlyReady || (p.stock > 0);
    return matchCat && matchSearch && matchReady;
  });

  // SMART SORT: Produk ready stock selalu di urutan teratas
  filteredProducts.sort((a, b) => {
    const aReady = a.stock > 0 ? 1 : 0;
    const bReady = b.stock > 0 ? 1 : 0;
    if (aReady !== bReady) return bReady - aReady;
    return a.name.localeCompare(b.name, 'id');
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

    let promoBadgeHtml = '';
    const nameLower = (p.name || '').toLowerCase();
    const catLower = (p.category || '').toLowerCase();
    if (isAvailable) {
      if (nameLower.includes('lokal') || catLower.includes('lokal')) {
        promoBadgeHtml = `<span class="badge-promo-tag local">🌱 Benih Lokal</span>`;
      } else if (p.stock >= 20) {
        promoBadgeHtml = `<span class="badge-promo-tag bestseller">🔥 Terlaris</span>`;
      } else {
        promoBadgeHtml = `<span class="badge-promo-tag recommended">⭐ Rekomendasi</span>`;
      }
    }

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-thumb-wrap">
          ${thumbHtml}
          ${promoBadgeHtml}
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

  if (product.stock <= 0) {
    showToast(`Maaf, stok "${product.name}" sedang habis.`);
    return;
  }

  const existing = cart.find(i => i.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Maksimal pesanan "${product.name}" sesuai stok ready adalah ${product.stock} ${product.unit}.`);
      return;
    }
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
async function sendOrderToWhatsApp() {
  if (cart.length === 0) {
    alert('Keranjang belanja kosong!');
    return;
  }

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const methodSelect = document.getElementById('cust-method');
  const notesInput = document.getElementById('cust-notes');
  const submitBtn = document.querySelector('.btn-checkout');

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

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan Pesanan ke Antrean POS...';
  }

  // Generate Nomor Pesanan Resmi (#KT-YYMMDD-XXX)
  const now = new Date();
  const dateStr = String(now.getFullYear()).slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
  const rndDigits = Math.floor(100 + Math.random() * 900);
  const orderNo = `KT-${dateStr}-${rndDigits}`;
  const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('ord-' + Date.now());

  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const orderPayload = {
    id: orderId,
    order_no: orderNo,
    customer_name: customerName,
    customer_phone: customerPhone,
    delivery_method: deliveryMethod,
    customer_address: notes,
    notes: notes,
    items: cart.map(item => ({
      id: item.id,
      product_id: item.id,
      name: item.name,
      variant: item.variant || '',
      unit: item.unit || 'pcs',
      price: Number(item.price || 0),
      qty: Number(item.qty || 1),
      subtotal: Number(item.price || 0) * Number(item.qty || 1)
    })),
    subtotal: totalPrice,
    total: totalPrice,
    status: 'pending',
    source: 'KATALOG_ONLINE',
    created_at: now.toISOString()
  };

  // Simpan ke antrean Supabase (Prioritas: online_orders -> Fallback: settings)
  let savedToCloud = false;
  if (supabaseClient) {
    try {
      const { error: ordErr } = await supabaseClient.from('online_orders').insert(orderPayload);
      if (!ordErr) savedToCloud = true;
    } catch (err) {}

    if (!savedToCloud) {
      try {
        const { error: setErr } = await supabaseClient.from('settings').insert({
          key: `online_order_${orderId}`,
          value: JSON.stringify(orderPayload)
        });
        if (!setErr) savedToCloud = true;
      } catch (err) {
        console.warn('Fallback save to settings:', err);
      }
    }
  }

  // Format Teks Pesan WhatsApp Resmi
  let msg = `*PESANAN RESMI KATALOG ONLINE*\n`;
  msg += `*${storeConfig.name.toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *No. Pesanan:* *#${orderNo}*\n`;
  msg += `📅 *Tanggal:* ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}\n`;
  msg += `👤 *Pemesan:* *${customerName}* (${customerPhone})\n`;
  msg += `🚚 *Metode:* ${deliveryMethod}\n`;
  if (notes) {
    msg += `📝 *Catatan / Alamat:* ${notes}\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 *RINCIAN BARANG:*\n`;

  cart.forEach((item, idx) => {
    const subtotal = item.price * item.qty;
    const variantStr = item.variant ? ` (${item.variant})` : '';
    msg += `${idx + 1}. *${item.name}*${variantStr}\n`;
    msg += `   └ ${item.qty} ${item.unit} x ${formatRupiah(item.price)} = ${formatRupiah(subtotal)}\n`;
  });

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *TOTAL PESANAN: ${formatRupiah(totalPrice)}*\n\n`;
  msg += `Halo Admin, pesanan saya di atas sudah terdaftar di sistem dengan nomor *#${orderNo}*. Mohon konfirmasi ketersediaan barang dan nomor rekening pembayaran toko. Terima kasih! 🙏`;

  const waTarget = formatWaNumber(storeConfig.phone);
  const waUrl = `https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`;

  // Bersihkan keranjang belanja
  cart = [];
  saveCartToStorage();
  updateCartBadge();
  updateFloatingCartBar();
  renderProductsGrid();
  closeCartModal();

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Kirim Pesanan &amp; Hubungi WhatsApp';
  }

  // Tampilkan Modal Konfirmasi Sukses ke Pelanggan
  showOrderSuccessModal(orderNo, customerName, totalPrice, waUrl);

  // Buka WhatsApp di tab baru
  window.open(waUrl, '_blank');
}

function showOrderSuccessModal(orderNo, customerName, total, waUrl) {
  let modal = document.getElementById('order-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'order-success-modal';
    modal.className = 'cart-modal-backdrop';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="cart-modal" style="max-width:440px;text-align:center;padding:26px 22px;">
      <div style="width:68px;height:68px;background:#DCFCE7;color:#16A34A;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 14px auto;">
        <i class="fas fa-check"></i>
      </div>
      <h3 style="font-size:18px;font-weight:800;color:#0F172A;margin-bottom:6px;">Pesanan Berhasil Dikirim!</h3>
      <p style="font-size:13px;color:#64748B;line-height:1.5;margin-bottom:16px;">
        Terima kasih, <strong>${escapeHtml(customerName)}</strong>. Pesanan Anda telah tersambung langsung ke antrean kasir POS toko dengan nomor:
      </p>
      <div style="background:#F8FAFC;border:1.5px dashed #2563EB;border-radius:8px;padding:12px;margin-bottom:18px;">
        <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;">Nomor Pesanan Resmi</div>
        <div style="font-size:22px;font-weight:900;color:#2563EB;letter-spacing:1px;font-family:monospace;margin-top:2px;">#${orderNo}</div>
        <div style="font-size:12.5px;font-weight:700;color:#0F172A;margin-top:4px;">Total Tagihan: ${formatRupiah(total)}</div>
      </div>
      <p style="font-size:12px;color:#64748B;margin-bottom:18px;">
        Jika WhatsApp belum terbuka otomatis, klik tombol di bawah untuk melanjutkan chat konfirmasi ke kasir:
      </p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <a href="${waUrl}" target="_blank" class="btn-checkout" style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;">
          <i class="fab fa-whatsapp" style="font-size:18px;"></i> Buka Chat WhatsApp Kasir
        </a>
        <button type="button" class="btn-clear-cart" onclick="closeOrderSuccessModal()" style="background:#F1F5F9;color:#475569;border-color:#CBD5E1;width:100%;height:38px;">
          Selesai &amp; Lanjut Lihat Produk
        </button>
      </div>
    </div>
  `;

  modal.classList.add('open');
}

function closeOrderSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  if (modal) modal.classList.remove('open');
}

function askStockViaWhatsApp(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const waTarget = formatWaNumber(storeConfig.phone);
  const msg = `Halo ${storeConfig.name}, saya tertarik dengan produk *${product.name}* di katalog online, namun stoknya tertulis habis. Apakah produk ini akan segera tersedia kembali? Terima kasih!`;
  window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`, '_blank');
}

function toggleOnlyReadyFilter(isChecked) {
  filterOnlyReady = !!isChecked;
  applyFilterAndRender();
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
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.goToSlide = goToSlide;
window.handleSlideCTA = handleSlideCTA;
window.quickSelectProduct = quickSelectProduct;



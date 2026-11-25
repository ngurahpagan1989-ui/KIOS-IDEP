// Komponen UI Katalog: Header Toko, Hero Slider, Produk Unggulan, Filter & Grid Produk

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
      <img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.title || 'Promo Kebun Benih')}" class="slide-bg" loading="${idx === 0 ? 'eager' : 'lazy'}">
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

  const chipsHtml = categories.map(cat => `
    <button type="button" class="category-chip ${cat === activeCategory ? 'active' : ''}" onclick="selectCategory('${escapeHtml(cat)}')">
      ${escapeHtml(cat)}
    </button>
  `).join('');

  const readyPillHtml = `
    <button type="button" class="category-chip ${filterOnlyReady ? 'active' : ''}" onclick="toggleOnlyReadyChip()" style="${filterOnlyReady ? 'background:#059669;border-color:#059669;color:#ffffff;' : 'border-color:rgba(16,185,129,0.4);color:#10B981;'}">
      <i class="fas fa-check-circle" style="font-size:11px;margin-right:4px;"></i> Ready Stock Saja
    </button>
  `;

  container.innerHTML = chipsHtml + readyPillHtml;
}

function toggleOnlyReadyChip() {
  filterOnlyReady = !filterOnlyReady;
  const chk = document.getElementById('chk-only-ready');
  if (chk) chk.checked = filterOnlyReady;
  renderCategoryChips();
  applyFilterAndRender();
}

function selectCategory(cat) {
  activeCategory = cat;
  renderCategoryChips();
  applyFilterAndRender();
}

function applyFilterAndRender() {
  const q = searchQuery.toLowerCase().trim();

  filteredProducts = allProducts.filter(p => {
    const matchCat = (activeCategory === 'Semua') ||
      (p.category && p.category.toLowerCase() === activeCategory.toLowerCase()) ||
      (p.rawCategory && p.rawCategory.toLowerCase() === activeCategory.toLowerCase());
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
      `<img src="${escapeHtml(p.photo_url)}" alt="${escapeHtml(p.name)}" class="product-thumb" loading="lazy" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';">
       <div class="product-thumb-placeholder" style="display:none;">
         <div class="placeholder-icon-ring"><i class="fas fa-seedling"></i></div>
         <span class="placeholder-tag">${escapeHtml(p.category)}</span>
       </div>` :
      `<div class="product-thumb-placeholder">
         <div class="placeholder-icon-ring"><i class="fas fa-seedling"></i></div>
         <span class="placeholder-tag">${escapeHtml(p.category)}</span>
       </div>`;

    let actionHtml = '';
    if (!isAvailable) {
      actionHtml = `
        <button type="button" class="btn-add-cart btn-out-of-stock" disabled title="Stok saat ini kosong">
          <i class="fas fa-ban"></i> Stok Habis
        </button>
      `;
    } else if (inCartQty > 0) {
      actionHtml = `
        <div class="card-qty-control">
          <button type="button" class="qty-btn" onclick="updateCartQty('${p.id}', -1)" title="Kurangi">&minus;</button>
          <span class="qty-val">${inCartQty}</span>
          <button type="button" class="qty-btn" onclick="updateCartQty('${p.id}', 1)" title="Tambah">&plus;</button>
        </div>
      `;
    } else {
      actionHtml = `
        <button type="button" class="btn-add-cart" onclick="addToCart('${p.id}')">
          <i class="fas fa-cart-plus"></i> + Keranjang
        </button>
      `;
    }

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
      <div class="product-card ${isAvailable ? '' : 'out-of-stock'}" data-id="${p.id}">
        <div class="product-thumb-wrap">
          ${thumbHtml}
          ${promoBadgeHtml}
          <span class="badge-stock ${isAvailable ? 'available' : 'out'}">
            ${isAvailable ? 'Tersedia' : 'Stok Habis'}
          </span>
        </div>
        <div class="product-body">
          <div class="product-category">${escapeHtml(p.category)}</div>
          <h3 class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</h3>
          <div class="product-variant-info">
            ${p.variant ? `<span>📦 ${escapeHtml(p.variant)}</span> <span>&bull; ${escapeHtml(p.unit)}</span>` : `<span>📦 Kemasan ${escapeHtml(p.unit)}</span>`}
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

function askStockViaWhatsApp(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const waTarget = formatWaNumber(storeConfig.phone);
  const msg = `Halo ${storeConfig.name}, saya tertarik dengan produk *${product.name}* di katalog online, namun stoknya tertulis habis. Apakah produk ini akan segera tersedia kembali? Terima kasih!`;
  window.open(`https://wa.me/${waTarget}?text=${encodeURIComponent(msg)}`, '_blank');
}

function toggleOnlyReadyFilter(isChecked) {
  filterOnlyReady = !!isChecked;
  renderCategoryChips();
  applyFilterAndRender();
}


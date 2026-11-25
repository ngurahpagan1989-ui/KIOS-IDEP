// Layanan Pengambilan Data Publik Katalog dari Supabase

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
      .in('key', ['store_name', 'store_phone', 'store_address', 'store_tagline', 'catalog_title', 'catalog_notes', 'catalog_promo_config', 'catalog_hidden_product_ids']);

    let catalogHiddenProductIds = [];
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

        if (s.key === 'catalog_hidden_product_ids' && s.value) {
          try {
            const parsed = JSON.parse(s.value);
            if (Array.isArray(parsed)) catalogHiddenProductIds = parsed;
          } catch (e) {
            console.warn('Gagal mem-parse catalog_hidden_product_ids:', e);
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
        is_seed,
        product_type,
        inventory_type,
        price_tiers (
          tier_name,
          price
        )
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (prodsErr) throw prodsErr;

    // B.1 Filter Produk untuk Katalog Online:
    // - Hanya tampilkan produk BENIH DALAM KEMASAN (pcs) dan produk NON-BENIH
    // - Sembunyikan benih curah mentah / toples (gr / gram / product_type CURAH)
    // - Sembunyikan produk yang dinonaktifkan manual via pengaturan (catalog_hidden_product_ids)
    const catalogEligibleProds = (prodsData || []).filter(p => {
      if (catalogHiddenProductIds.includes(p.id)) return false;

      const pType = String(p.product_type || '').toUpperCase().trim();
      const invType = String(p.inventory_type || '').toUpperCase().trim();
      const unit = String(p.unit || '').toLowerCase().trim();
      const cat = String(p.category || '').toUpperCase().trim();

      const isSeed = Boolean(p.is_seed) || pType === 'BENIH' || pType === 'CURAH' || cat === 'BENIH';

      if (isSeed) {
        const isCurah = (pType === 'CURAH' || invType === 'CURAH' || ['gr', 'gram', 'g'].includes(unit));
        if (isCurah) return false;
        return true;
      }

      return true;
    });

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
    allProducts = catalogEligibleProds.map(p => {
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

      const rawCat = p.category ? p.category.trim() : 'Umum';
      let displayCat = rawCat;
      if (rawCat === rawCat.toUpperCase() && rawCat.length > 1) {
        displayCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();
      }

      return {
        id: p.id,
        name: p.name || 'Produk Tanpa Nama',
        category: displayCat,
        rawCategory: rawCat,
        variant: p.variant || '',
        unit: p.unit || 'pcs',
        photo_url: p.photo_url || '',
        stock: finalStock,
        price: price
      };
    });

    // Ekstrak Kategori Unik dari produk yang aktif tampil di katalog
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

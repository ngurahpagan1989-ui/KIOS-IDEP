// ========================= KATALOG PRODUK & MULTI-TIER =========================
function renderProduk(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cached = getCachedData('products');
  if (!forceRefresh && cached && Array.isArray(cached) && cached.length > 0) {
    drawProdukUI(cached);
    if (isCacheValid('products')) return;
  } else {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat katalog produk...</div></div>';
  }

  api('getProducts', TOKEN).then(function (products) {
    const list = Array.isArray(products) ? products : [];
    setCachedData('products', list);
    drawProdukUI(list);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat produk: ' + (err.message || err), true);
    }
  });
}

function drawProdukUI(products) {
  const content = document.getElementById('content');
  if (!content) return;

  PRODUCTS_CACHE = products.filter(function (p) { return p && p.active; });
  PRODUCT_SEARCH_QUERY = '';

  const countAll = PRODUCTS_CACHE.length;
  const countJadi = PRODUCTS_CACHE.filter(function (p) { return !isRawProduct(p.unit) && !(p.category || '').toLowerCase().includes('media'); }).length;
  const countMentah = PRODUCTS_CACHE.filter(function (p) { return isRawProduct(p.unit); }).length;
  const countMedia = PRODUCTS_CACHE.filter(function (p) { return (p.category || '').toLowerCase().includes('media'); }).length;

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Katalog Produk</h1>' +
    '<p class="page-subtitle">Kelola master data barang siap jual, bahan baku curah, media dan varian bahasa.</p>' +
    '</div>' +
    '<div class="product-header-actions">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'produk\')" title="Buka Panduan Master Produk &amp; Impor">📖 Panduan Produk</button>' +
    '<button type="button" class="btn btn-primary" onclick="openProductModal()">+ Tambah Produk</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openBulkProductUploadModal()">📤 Impor Excel / CSV</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="exportProductsToExcel()">📊 Ekspor ke Excel</button>' +
    '</div>' +
    '</div>' +
    '<div class="product-toolbar-wrap">' +
    '<div class="product-tabs-wrapper">' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'all' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-all" onclick="setProductTab(\'all\')">Semua (' + countAll + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'jadi' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-jadi" onclick="setProductTab(\'jadi\')">📦 Siap Jual (' + countJadi + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'mentah' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-mentah" onclick="setProductTab(\'mentah\')">🌾 Curah/Gram (' + countMentah + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'media' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-media" onclick="setProductTab(\'media\')">📚 Media/Buku (' + countMedia + ')</button>' +
    '</div>' +
    '<input type="text" id="produk-search-input" placeholder="🔍 Cari nama produk atau kategori..." oninput="PRODUCT_SEARCH_QUERY=(this.value||\'\').toLowerCase().trim();renderFilteredProducts();" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">' +
    '</div>' +
    '<div class="card">' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Nama Produk</th>' +
    '<th>Kategori</th>' +
    '<th>Tipe</th>' +
    '<th>Sisa Stok</th>' +
    '<th>Harga Jual (Tier)</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="produk-tbody"></tbody>' +
    '</table>' +
    '</div>' +
    '</div>';

  renderFilteredProducts();
}

function setProductTab(tab) {
  CURRENT_PRODUCT_TAB = tab;
  ['all', 'jadi', 'mentah', 'media'].forEach(function (t) {
    const el = document.getElementById('tab-' + t);
    if (el) el.className = 'btn btn-sm ' + (t === tab ? 'btn-primary' : 'btn-secondary');
  });
  renderFilteredProducts();
}

function renderFilteredProducts() {
  const filtered = PRODUCTS_CACHE.filter(function (p) {
    const isRaw = isRawProduct(p.unit);
    const isMedia = (p.category || '').toLowerCase().includes('media');
    let matchTab = true;
    if (CURRENT_PRODUCT_TAB === 'jadi') matchTab = !isRaw && !isMedia;
    if (CURRENT_PRODUCT_TAB === 'mentah') matchTab = isRaw;
    if (CURRENT_PRODUCT_TAB === 'media') matchTab = isMedia;

    const matchQuery = !PRODUCT_SEARCH_QUERY ||
      (p.name || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY) ||
      (p.category || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY) ||
      (p.variant || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY);

    return matchTab && matchQuery;
  });
  renderProductRows(filtered);
}

function renderProductRows(products) {
  const tbody = document.getElementById('produk-tbody');
  if (!tbody) return;
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:24px;color:var(--text-secondary);">Tidak ada produk pada filter ini.</div></td></tr>';
    return;
  }
  tbody.innerHTML = products.map(function (p) {
    const isRaw = isRawProduct(p.unit);
    const isMedia = (p.category || '').toLowerCase().includes('media');
    let typeBadge = '<span class="badge badge-success">📦 Kemasan</span>';
    if (isRaw) typeBadge = '<span class="badge badge-warning">🌾 Curah</span>';
    if (isMedia) typeBadge = '<span class="badge badge-neutral">📚 Media</span>';

    const variantBadge = p.variant ? ' <span class="badge badge-neutral" style="font-size:10px;">' + escapeHtml(p.variant) + '</span>' : '';
    const mainPrice = p.priceTiers && p.priceTiers[0] ? formatRupiah(p.priceTiers[0].price) : '-';
    const extraTiers = p.priceTiers && p.priceTiers.length > 1 ? ' <span class="badge badge-neutral">+' + (p.priceTiers.length - 1) + ' tier</span>' : '';
    const stockBadge = Number(p.stock || 0) <= 5 ? 'badge-danger' : 'badge-neutral';

    const skuHint = p.sku ? '<div style="font-size:11px;color:var(--text-muted);font-family:monospace;margin-top:2px;">SKU: ' + escapeHtml(p.sku) + '</div>' : '';
    return '<tr>' +
      '<td><strong>' + escapeHtml(p.name) + '</strong>' + skuHint + variantBadge + '</td>' +
      '<td>' + escapeHtml(p.category || '-') + '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td><span class="badge ' + stockBadge + '">' + (p.stock || 0) + ' ' + escapeHtml(p.unit || '') + '</span></td>' +
      '<td>' + mainPrice + extraTiers + '</td>' +
      '<td style="text-align:right;">' +
      '<div class="action-btn-group" style="justify-content:flex-end;">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openProductModal(\'' + p.id + '\')">Edit</button>' +
      '<button type="button" class="btn btn-danger btn-sm" onclick="deleteProductUI(\'' + p.id + '\', \'' + escapeHtml(p.name) + '\')">Hapus</button>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function deleteProductUI(id, name) {
  showConfirmDialog('Hapus Produk', 'Nonaktifkan produk "' + name + '" dari katalog toko?', function () {
    api('deleteProduct', TOKEN, id).then(function () {
      invalidateCache('products');
      showToast('Produk dinonaktifkan.');
      renderProduk(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

// ==============================================================================
// ==============================================================================
// FITUR BULK UPLOAD & EKSPOR KATALOG PRODUK (EXCEL .XLSX & CSV)
// ==============================================================================

let CURRENT_PARSED_PRODUCTS = [];
let BULK_IMPORT_FILE_NAME = '';

/**
 * Pemuatan dinamis pustaka SheetJS (XLSX) dengan proteksi fallback
 */
function ensureXlsxLoaded() {
  if (typeof XLSX !== 'undefined') return Promise.resolve(window.XLSX);
  return new Promise(function (resolve, reject) {
    const existing = document.querySelector('script[src*="xlsx"]');
    if (existing) {
      if (typeof window.XLSX !== 'undefined') return resolve(window.XLSX);
      existing.addEventListener('load', function () { resolve(window.XLSX); });
      existing.addEventListener('error', function () { reject(new Error('Gagal memuat library Excel (SheetJS).')); });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = function () { resolve(window.XLSX); };
    script.onerror = function () { reject(new Error('Gagal memuat pustaka Excel (SheetJS).')); };
    document.head.appendChild(script);
  });
}

/**
 * Unduh Templat Excel (.xlsx) dengan Sheet Katalog & Sheet Panduan Pengisian
 */
function downloadProductExcelTemplate() {
  showToast('Menyiapkan templat Excel (.xlsx)...');
  ensureXlsxLoaded().then(function (XLSX) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Katalog_Produk
    const headers = [
      'SKU',
      'Nama_Produk',
      'Kategori',
      'Tipe_Produk',
      'Satuan',
      'Berat_Kemasan_Gram',
      'Umur_Panen',
      'Harga_Reguler',
      'Harga_Outlet',
      'Harga_Bali_Buda'
    ];

    const sampleRows = [
      headers,
      ['BNH-BYMM-JADI', 'Benih Bayam Merah', 'Benih', 'Benih', 'pcs', 20, 25, 25000, 20000, 22000],
      ['BNH-ERCS-JADI', 'Benih Ercis', 'Benih', 'Benih', 'pcs', 30, 60, 30000, 24000, 27000],
      ['BNH-CBKC-JADI', 'Benih Cabai Kecil', 'Benih', 'Benih', 'pcs', 10, 90, 30000, 24000, 27000],
      ['BNH-BYMH-CURAH', 'Benih Bayam Hijau Curah', 'Benih', 'Curah', 'gr', 0, 25, 250, 200, 220],
      ['BK-ORG-01', 'Buku Panduan Pertanian Organik', 'Buku', 'Buku', 'pcs', 0, 0, 75000, 60000, 65000]
    ];

    const wsProduk = XLSX.utils.aoa_to_sheet(sampleRows);
    wsProduk['!cols'] = [
      { wch: 18 }, // SKU
      { wch: 36 }, // Nama_Produk
      { wch: 14 }, // Kategori
      { wch: 14 }, // Tipe_Produk
      { wch: 10 }, // Satuan
      { wch: 20 }, // Berat_Kemasan_Gram
      { wch: 13 }, // Umur_Panen
      { wch: 16 }, // Harga_Reguler
      { wch: 16 }, // Harga_Outlet
      { wch: 18 }  // Harga_Bali_Buda
    ];

    // Sheet 2: Petunjuk_Pengisian
    const guideHeaders = ['Nama Kolom', 'Status', 'Contoh Nilai', 'Penjelasan & Aturan Format'];
    const guideRows = [
      guideHeaders,
      ['SKU', 'WAJIB', 'BNH-BYMM-JADI', 'Kode identifikasi unik produk. Jika SKU sudah ada di database, sistem otomatis memperbarui nama, kategori, dan harga (Upsert).'],
      ['Nama_Produk', 'WAJIB', 'Benih Bayam Merah', 'Nama varietas benih atau barang lengkap.'],
      ['Kategori', 'OPSIONAL', 'Benih / Buku / Pupuk', 'Kategori produk untuk pengelompokan di katalog. Default: Benih.'],
      ['Tipe_Produk', 'OPSIONAL', 'Benih / Curah / Buku', 'Tipe persediaan master. Default: Benih.'],
      ['Satuan', 'OPSIONAL', 'pcs / gr / kg / buku', 'Satuan persediaan. Gunakan pcs untuk sachet kemasan jadi, gr/kg untuk bahan curah toples. Default: pcs.'],
      ['Berat_Kemasan_Gram', 'OPSIONAL', '20 / 30 / 10', 'Netto / berat isi benih per kemasan sachet dalam satuan gram. Digunakan otomatis saat produksi Kemas Mandiri. Isi 0 untuk produk curah toples atau buku.'],
      ['Umur_Panen', 'OPSIONAL', '25 / 60 / 90', 'Estimasi umur panen benih dalam angka hari. Isi 0 jika buku atau non-benih.'],
      ['Harga_Reguler', 'WAJIB', '25000', 'Harga jual standar kasir POS untuk pembeli umum/ritel. Wajib diisi angka murni tanpa simbol Rp atau titik.'],
      ['Harga_Outlet', 'OPSIONAL', '20000', 'Harga khusus untuk mitra toko cabang titip konsinyasi. Jika dikosongkan, bernilai 0.'],
      ['Harga_Bali_Buda', 'OPSIONAL', '22000', 'Harga khusus untuk mitra outlet jaringan Bali Buda. Jika dikosongkan, bernilai 0.']
    ];

    const wsPanduan = XLSX.utils.aoa_to_sheet(guideRows);
    wsPanduan['!cols'] = [
      { wch: 18 },
      { wch: 12 },
      { wch: 22 },
      { wch: 80 }
    ];

    XLSX.utils.book_append_sheet(wb, wsProduk, 'Katalog_Produk');
    XLSX.utils.book_append_sheet(wb, wsPanduan, 'Petunjuk_Pengisian');

    XLSX.writeFile(wb, 'templat_impor_produk.xlsx');
    showToast('Templat Excel (.xlsx) berhasil diunduh.');
  }).catch(function (err) {
    showToast('Gagal membuat templat Excel: ' + (err.message || err), true);
  });
}

/**
 * Unduh Templat CSV (.csv) Standar
 */
function downloadProductCsvTemplate() {
  const headers = [
    'SKU',
    'Nama_Produk',
    'Kategori',
    'Tipe_Produk',
    'Satuan',
    'Berat_Kemasan_Gram',
    'Umur_Panen',
    'Harga_Reguler',
    'Harga_Outlet',
    'Harga_Bali_Buda'
  ];

  const sampleRows = [
    ['BNH-BYMM-JADI', 'Benih Bayam Merah', 'Benih', 'Benih', 'pcs', '20', '25', '25000', '20000', '22000'],
    ['BNH-ERCS-JADI', 'Benih Ercis', 'Benih', 'Benih', 'pcs', '30', '60', '30000', '24000', '27000'],
    ['BNH-CBKC-JADI', 'Benih Cabai Kecil', 'Benih', 'Benih', 'pcs', '10', '90', '30000', '24000', '27000'],
    ['BNH-BYMH-CURAH', 'Benih Bayam Hijau Curah', 'Benih', 'Curah', 'gr', '0', '25', '250', '200', '220'],
    ['BK-ORG-01', 'Buku Panduan Pertanian Organik', 'Buku', 'Buku', 'pcs', '0', '0', '75000', '60000', '65000']
  ];

  const csvRows = [headers.join(','), ...sampleRows.map(function (row) { return row.join(','); })];
  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'templat_impor_produk.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('Templat CSV berhasil diunduh.', false);
}

// Alias fungsi templat
function downloadProductTemplate() {
  downloadProductExcelTemplate();
}

/**
 * Ekspor Seluruh Master Produk Aktif ke File Excel (.xlsx)
 */
function exportProductsToExcel() {
  const list = PRODUCTS_CACHE || [];
  if (list.length === 0) {
    showToast('Belum ada data produk di katalog untuk diekspor.', true);
    return;
  }

  showToast('Menyiapkan file ekspor katalog Excel...');
  ensureXlsxLoaded().then(function (XLSX) {
    const wb = XLSX.utils.book_new();

    const headers = [
      'SKU',
      'Nama_Produk',
      'Kategori',
      'Tipe_Produk',
      'Satuan',
      'Berat_Kemasan_Gram',
      'Umur_Panen',
      'Harga_Reguler',
      'Harga_Outlet',
      'Harga_Bali_Buda',
      'Sisa_Stok'
    ];

    function getTierPrice(p, tierName) {
      if (!p || !p.priceTiers || !Array.isArray(p.priceTiers)) return 0;
      const t = p.priceTiers.find(function (x) {
        return (x.tier_name || '').toLowerCase() === tierName.toLowerCase();
      });
      return t ? Number(t.price || 0) : 0;
    }

    const rows = [headers];
    list.forEach(function (p) {
      let weightGrams = Number(p.weight_grams || 0);
      if (!weightGrams && p.variant) {
        const m = String(p.variant).match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram)/i);
        if (m) weightGrams = Number(m[1]);
      }

      rows.push([
        p.sku || '',
        p.name || '',
        p.category || 'Benih',
        p.product_type || 'Benih',
        p.unit || 'pcs',
        weightGrams,
        Number(p.harvest_days || 0),
        getTierPrice(p, 'Reguler'),
        getTierPrice(p, 'Outlet'),
        getTierPrice(p, 'Bali Buda'),
        Number(p.stock || 0)
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 18 }, // SKU
      { wch: 34 }, // Nama_Produk
      { wch: 14 }, // Kategori
      { wch: 14 }, // Tipe_Produk
      { wch: 10 }, // Satuan
      { wch: 20 }, // Berat_Kemasan_Gram
      { wch: 13 }, // Umur_Panen
      { wch: 15 }, // Harga_Reguler
      { wch: 15 }, // Harga_Outlet
      { wch: 16 }, // Harga_Bali_Buda
      { wch: 12 }  // Sisa_Stok
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Katalog_Produk');

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = 'katalog_produk_' + dateStr + '.xlsx';
    XLSX.writeFile(wb, fileName);
    showToast('Katalog berhasil diekspor (' + list.length + ' produk ke ' + fileName + ').');
  }).catch(function (err) {
    showToast('Gagal mengekspor katalog: ' + (err.message || err), true);
  });
}

/**
 * Modal Impor Massal Produk Mendukung Excel (.xlsx, .xls) dan CSV (.csv)
 */
function openBulkProductUploadModal() {
  CURRENT_PARSED_PRODUCTS = [];
  BULK_IMPORT_FILE_NAME = '';

  const bodyHtml =
    '<div id="bulk-import-container" style="display:flex;flex-direction:column;gap:16px;">' +
    '  <div id="bulk-dropzone" style="border:2px dashed var(--border-focus, #2E7D32);border-radius:var(--radius-md, 8px);background:#F9FBF9;padding:26px 20px;text-align:center;cursor:pointer;transition:all 0.2s;" ' +
    '       onclick="document.getElementById(\'bulk-product-file-input\').click()" ' +
    '       ondragover="event.preventDefault();this.style.background=\'#E8F5E9\';" ' +
    '       ondragleave="this.style.background=\'#F9FBF9\';" ' +
    '       ondrop="handleProductFileDrop(event)">' +
    '    <input type="file" id="bulk-product-file-input" accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" style="display:none;" onchange="handleProductFileSelect(event)">' +
    '    <div style="font-size:38px;margin-bottom:6px;">📊</div>' +
    '    <div style="font-weight:700;font-size:15px;color:var(--text-primary);margin-bottom:4px;">Pilih File Excel (.xlsx) / CSV (.csv) atau seret ke sini</div>' +
    '    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Mendukung file Microsoft Excel (.xlsx, .xls) dan CSV (koma maupun titik koma).</div>' +
    '    <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;">' +
    '      <button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation();downloadProductExcelTemplate();" style="display:inline-flex;align-items:center;gap:6px;">' +
    '        📥 Download Templat Excel (.xlsx)' +
    '      </button>' +
    '      <button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();downloadProductCsvTemplate();" style="display:inline-flex;align-items:center;gap:6px;">' +
    '        📥 Download Templat CSV' +
    '      </button>' +
    '    </div>' +
    '  </div>' +
    '  <div id="bulk-preview-area" style="display:none;"></div>' +
    '</div>';

  const footerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:8px;">' +
    '  <div id="bulk-footer-info" style="font-size:12px;color:var(--text-secondary);width:100%;">Pilih file Excel atau CSV untuk melihat pratinjau.</div>' +
    '  <div style="display:flex;gap:8px;width:100%;">' +
    '    <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex:1;">Batal</button>' +
    '    <button type="button" class="btn btn-primary" id="btn-submit-bulk-import" disabled onclick="submitBulkProductImport()" style="flex:1;">' +
    '      💾 Simpan ke Database' +
    '    </button>' +
    '  </div>' +
    '</div>';

  openModal('Impor Massal Katalog Produk (Excel & CSV)', bodyHtml, footerHtml, true);

  const dialog = document.getElementById('modal-dialog');
  if (dialog) {
    dialog.style.maxWidth = '980px';
    dialog.style.width = '96%';
  }
}

function handleProductFileDrop(event) {
  event.preventDefault();
  const dropzone = document.getElementById('bulk-dropzone');
  if (dropzone) dropzone.style.background = '#F9FBF9';
  if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
    loadProductFile(event.dataTransfer.files[0]);
  }
}

function handleProductFileSelect(event) {
  if (event.target && event.target.files && event.target.files[0]) {
    loadProductFile(event.target.files[0]);
  }
}

// Backward compatibility handlers
function handleProductCsvDrop(e) { handleProductFileDrop(e); }
function handleProductCsvFileSelect(e) { handleProductFileSelect(e); }

function loadProductFile(file) {
  if (!file) return;
  const fileName = (file.name || '').toLowerCase();
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
  const isCsv = fileName.endsWith('.csv');

  if (!isExcel && !isCsv) {
    showToast('Harap pilih file dengan format Excel (.xlsx, .xls) atau CSV (.csv).', true);
    return;
  }

  BULK_IMPORT_FILE_NAME = file.name;

  if (isExcel) {
    showToast('Membaca file Excel ' + file.name + '...');
    ensureXlsxLoaded().then(function (XLSX) {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Prioritaskan sheet pertama atau sheet bernama Katalog/Produk
          let targetSheetName = workbook.SheetNames[0];
          const foundSheet = workbook.SheetNames.find(function (s) {
            return /katalog|produk|product/i.test(s);
          });
          if (foundSheet) targetSheetName = foundSheet;

          const worksheet = workbook.Sheets[targetSheetName];
          if (!worksheet) {
            showToast('Sheet data produk tidak ditemukan di file Excel.', true);
            return;
          }

          const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          if (!rawRows || rawRows.length === 0) {
            showToast('Sheet "' + targetSheetName + '" tidak memiliki baris data produk.', true);
            return;
          }

          processParsedProductRows(rawRows, 'Excel (' + targetSheetName + ')');
        } catch (parseErr) {
          showToast('Gagal memproses file Excel: ' + (parseErr.message || parseErr), true);
        }
      };
      reader.onerror = function () {
        showToast('Gagal membaca berkas Excel.', true);
      };
      reader.readAsArrayBuffer(file);
    }).catch(function (err) {
      showToast('Pustaka Excel belum siap: ' + (err.message || err), true);
    });
  } else {
    // Membaca file CSV
    const reader = new FileReader();
    reader.onload = function (e) {
      const parsed = parseCsvText(e.target.result);
      if (!parsed.rows || parsed.rows.length === 0) {
        showToast('File CSV tidak memiliki baris data produk.', true);
        return;
      }
      processParsedProductRows(parsed.rows, 'CSV (' + (parsed.delimiter === ';' ? 'Titik Koma ;' : 'Koma ,') + ')');
    };
    reader.onerror = function () {
      showToast('Gagal membaca file CSV.', true);
    };
    reader.readAsText(file);
  }
}

function parseCsvText(text) {
  if (!text || !text.trim()) return { headers: [], rows: [], delimiter: ',' };
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }
  const lines = text.split(/\r?\n/).filter(function (l) { return l.trim().length > 0; });
  if (lines.length === 0) return { headers: [], rows: [], delimiter: ',' };

  const firstLine = lines[0];
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  function parseRow(line) {
    const cells = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    cells.push(cell.trim());
    return cells;
  }

  const rawHeader = parseRow(lines[0]);
  const headers = rawHeader.map(function (h) { return h.replace(/^["']|["']$/g, '').trim(); });
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCells = parseRow(lines[i]);
    if (rawCells.length === 0 || (rawCells.length === 1 && !rawCells[0])) continue;
    const rowObj = {};
    headers.forEach(function (hdr, idx) {
      rowObj[hdr] = (rawCells[idx] !== undefined ? rawCells[idx].replace(/^["']|["']$/g, '').trim() : '');
    });
    rows.push(rowObj);
  }
  return { headers: headers, rows: rows, delimiter: delimiter };
}

function parsePrice(val) {
  if (val === undefined || val === null) return null;
  let str = String(val).trim().replace(/^Rp\.?\s*/i, '');
  if (!str) return null;
  if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
    str = str.replace(/\./g, '');
  } else if (/^\d{1,3}(,\d{3})+$/.test(str)) {
    str = str.replace(/,/g, '');
  } else {
    str = str.replace(/[^0-9.-]/g, '');
  }
  if (!str) return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

function getRowValue(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (let i = 0; i < possibleKeys.length; i++) {
    const targetNorm = possibleKeys[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    for (let j = 0; j < rowKeys.length; j++) {
      const rkNorm = rowKeys[j].toLowerCase().replace(/[^a-z0-9]/g, '');
      if (rkNorm === targetNorm) {
        return row[rowKeys[j]];
      }
    }
  }
  return '';
}

function processParsedProductRows(rawRows, fileTypeLabel) {
  const seenSkus = new Set();
  CURRENT_PARSED_PRODUCTS = rawRows.map(function (row, idx) {
    const lineNo = idx + 2;
    const sku = getRowValue(row, ['sku', 'kode_sku', 'kode', 'item_code']).trim();
    const name = getRowValue(row, ['nama_produk', 'nama', 'name', 'product_name']).trim();
    const category = getRowValue(row, ['kategori', 'category']).trim() || 'Benih';
    const productType = getRowValue(row, ['tipe_produk', 'tipe', 'type', 'product_type']).trim() || 'Benih';
    const unit = getRowValue(row, ['satuan', 'unit']).trim() || 'pcs';
    const rawWeight = getRowValue(row, ['berat_kemasan_gram', 'berat_kemasan', 'berat_gram', 'netto', 'gramatur', 'weight_grams', 'weight', 'berat']);
    const weightGrams = Number(rawWeight) || 0;
    const harvestDays = Number(getRowValue(row, ['umur_panen', 'umurpanen', 'harvest_days'])) || 0;

    const rawReg = getRowValue(row, ['harga_reguler', 'reguler', 'price_reguler', 'harga']);
    const rawOut = getRowValue(row, ['harga_outlet', 'outlet', 'price_outlet']);
    const rawBB = getRowValue(row, ['harga_bali_buda', 'balibuda', 'bali_buda', 'price_bali_buda']);

    const priceReg = parsePrice(rawReg);
    const priceOut = parsePrice(rawOut);
    const priceBB = parsePrice(rawBB);

    const issues = [];
    if (!sku) {
      issues.push('SKU wajib diisi');
    } else if (seenSkus.has(sku.toLowerCase())) {
      issues.push('Duplikat SKU di file (' + sku + ')');
    } else {
      seenSkus.add(sku.toLowerCase());
    }

    if (!name) {
      issues.push('Nama Produk wajib diisi');
    }

    if (priceReg === null || priceReg < 0) {
      issues.push('Harga Reguler wajib angka valid');
    }

    if (rawOut && (priceOut === null || priceOut < 0)) {
      issues.push('Harga Outlet tidak valid');
    }

    if (rawBB && (priceBB === null || priceBB < 0)) {
      issues.push('Harga Bali Buda tidak valid');
    }

    const isValid = issues.length === 0;

    return {
      lineNo: lineNo,
      isValid: isValid,
      issues: issues,
      data: {
        sku: sku,
        name: name,
        category: category,
        product_type: productType,
        unit: unit,
        weight_grams: weightGrams,
        variant: weightGrams > 0 ? (weightGrams + 'g') : '',
        harvest_days: harvestDays,
        harga_reguler: priceReg !== null ? priceReg : 0,
        harga_outlet: priceOut !== null ? priceOut : 0,
        harga_bali_buda: priceBB !== null ? priceBB : 0
      }
    };
  });

  renderBulkProductPreview(fileTypeLabel);
}

function renderBulkProductPreview(fileTypeLabel) {
  const previewArea = document.getElementById('bulk-preview-area');
  const footerInfo = document.getElementById('bulk-footer-info');
  const submitBtn = document.getElementById('btn-submit-bulk-import');
  if (!previewArea) return;

  previewArea.style.display = 'block';

  const total = CURRENT_PARSED_PRODUCTS.length;
  const validCount = CURRENT_PARSED_PRODUCTS.filter(function (p) { return p.isValid; }).length;
  const errorCount = total - validCount;

  if (submitBtn) {
    submitBtn.disabled = (validCount === 0);
    submitBtn.innerHTML = '💾 Simpan (' + validCount + ' Produk)';
  }

  if (footerInfo) {
    footerInfo.innerHTML = 'File: <strong>' + escapeHtml(BULK_IMPORT_FILE_NAME) + '</strong> (' + escapeHtml(fileTypeLabel || '') + ') &bull; ' +
      '<span style="color:#2E7D32;font-weight:700;">' + validCount + ' Siap</span> / ' +
      (errorCount > 0 ? '<span style="color:#C62828;font-weight:700;">' + errorCount + ' Bermasalah</span>' : '0 Error');
  }

  let summaryBanner =
    '<div style="display:flex;justify-content:space-between;align-items:center;background:#F4F6F8;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:12px;flex-wrap:wrap;gap:8px;">' +
    '  <div style="font-size:12.5px;color:var(--text-secondary);">' +
    '    Total: <strong>' + total + ' baris</strong> &bull; ' +
    '    Format: <strong>' + escapeHtml(fileTypeLabel || '-') + '</strong>' +
    '  </div>' +
    '  <div style="display:flex;gap:6px;">' +
    '    <span class="badge badge-success">✓ ' + validCount + ' Siap Diimpor</span>' +
    (errorCount > 0 ? '    <span class="badge badge-danger">✕ ' + errorCount + ' Bermasalah</span>' : '') +
    '  </div>' +
    '</div>';

  if (errorCount > 0) {
    summaryBanner +=
      '<div style="background:#FEE2E2;border:1px solid #FCA5A5;color:#991B1B;padding:8px 12px;border-radius:var(--radius-sm);font-size:12px;margin-bottom:12px;">' +
      '  ⚠️ Terdapat <strong>' + errorCount + ' baris bermasalah</strong> (ditandai merah). Baris yang bermasalah akan otomatis dilewati saat proses simpan.' +
      '</div>';
  }

  const tableRows = CURRENT_PARSED_PRODUCTS.map(function (item) {
    const d = item.data;
    const rowBg = item.isValid ? '' : 'background:#FEF2F2;';
    const statusBadge = item.isValid
      ? '<span class="badge badge-success" style="font-size:10px;">✓ Siap</span>'
      : '<span class="badge badge-danger" style="font-size:10px;">✕ Error</span>';

    const issuesText = item.isValid
      ? '<span style="color:#2E7D32;font-size:11px;">✓ Siap Diimpor (Upsert)</span>'
      : '<span style="color:#DC2626;font-size:11px;font-weight:600;">' + escapeHtml(item.issues.join(', ')) + '</span>';

    return '<tr style="' + rowBg + '">' +
      '<td style="font-size:11px;color:var(--text-muted);">' + item.lineNo + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="font-family:monospace;font-weight:600;">' + escapeHtml(d.sku || '-') + '</td>' +
      '<td><strong>' + escapeHtml(d.name || '-') + '</strong></td>' +
      '<td style="font-size:11.5px;">' + escapeHtml(d.category) + '</td>' +
      '<td style="font-size:11.5px;">' + escapeHtml(d.unit) + '</td>' +
      '<td style="font-size:11.5px;text-align:center;">' + (d.weight_grams ? ('<strong>' + d.weight_grams + '</strong> gr') : '-') + '</td>' +
      '<td style="font-size:11.5px;">' + (d.harga_reguler ? formatRupiah(d.harga_reguler) : '-') + '</td>' +
      '<td style="font-size:11.5px;">' + (d.harga_outlet ? formatRupiah(d.harga_outlet) : '-') + '</td>' +
      '<td style="font-size:11.5px;">' + (d.harga_bali_buda ? formatRupiah(d.harga_bali_buda) : '-') + '</td>' +
      '<td>' + issuesText + '</td>' +
      '</tr>';
  }).join('');

  const tableHtml =
    '<div class="table-container" style="max-height:340px;overflow-x:auto;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius-sm);-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y !important;">' +
    '  <table style="width:100%;min-width:720px;border-collapse:collapse;font-size:12px;">' +
    '    <thead style="position:sticky;top:0;background:#fff;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,0.05);">' +
    '      <tr>' +
    '        <th style="white-space:nowrap;">#</th>' +
    '        <th style="white-space:nowrap;">Status</th>' +
    '        <th style="white-space:nowrap;">SKU</th>' +
    '        <th style="white-space:nowrap;min-width:140px;">Nama Produk</th>' +
    '        <th style="white-space:nowrap;">Kategori</th>' +
    '        <th style="white-space:nowrap;">Satuan</th>' +
    '        <th style="white-space:nowrap;">Netto (gr)</th>' +
    '        <th style="white-space:nowrap;">Reguler</th>' +
    '        <th style="white-space:nowrap;">Outlet</th>' +
    '        <th style="white-space:nowrap;">Bali Buda</th>' +
    '        <th style="white-space:nowrap;min-width:160px;">Keterangan</th>' +
    '      </tr>' +
    '    </thead>' +
    '    <tbody>' + tableRows + '</tbody>' +
    '  </table>' +
    '</div>';

  previewArea.innerHTML = summaryBanner + tableHtml;
}

function submitBulkProductImport() {
  const validItems = CURRENT_PARSED_PRODUCTS
    .filter(function (p) { return p.isValid; })
    .map(function (p) { return p.data; });

  if (validItems.length === 0) {
    showToast('Tidak ada data produk yang valid untuk disimpan.', true);
    return;
  }

  const submitBtn = document.getElementById('btn-submit-bulk-import');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="sync-spinner" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></span> Menyimpan...';
  }

  showToast('Sedang memproses impor ' + validItems.length + ' produk...', false);

  api('importBulkProducts', TOKEN, validItems)
    .then(function (res) {
      const count = res && res.count !== undefined ? res.count : validItems.length;
      showToast('Berhasil mengimpor/memperbarui ' + count + ' produk!', false);
      invalidateCache('products');
      closeModal();
      renderProduk(true);
    })
    .catch(function (err) {
      showToast('Gagal mengimpor produk: ' + (err.message || err), true);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '💾 Simpan (' + validItems.length + ' Produk)';
      }
    });
}

function isSeedProductClient(productOrId) {
  if (!productOrId) return false;
  let p = (typeof productOrId === 'object' && productOrId !== null)
    ? productOrId
    : (PRODUCTS_CACHE || []).filter(function (x) { return String(x.id) === String(productOrId); })[0];
  if (!p) return false;

  if (p.is_seed !== undefined && p.is_seed !== null) return Boolean(p.is_seed);
  if (p.product_type) return String(p.product_type).toLowerCase().trim() === 'benih';

  const cat = String(p.category || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase().trim();

  const nonSeedKeywords = ['buku', 'media', 'merchandise', 'kaos', 'baju', 'bibit', 'pupuk', 'nutrisi', 'polybag', 'pot', 'beras', 'pangan', 'lainnya'];
  for (let i = 0; i < nonSeedKeywords.length; i++) {
    if (cat.indexOf(nonSeedKeywords[i]) !== -1 || name.indexOf(nonSeedKeywords[i]) !== -1) {
      return false;
    }
  }

  const seedKeywords = ['benih', 'sayuran', 'herbal', 'bunga', 'tanaman', 'hortikultura'];
  for (let j = 0; j < seedKeywords.length; j++) {
    if (cat.indexOf(seedKeywords[j]) !== -1 || name.indexOf(seedKeywords[j]) !== -1) {
      return true;
    }
  }

  if (isRawProduct(p.unit)) return true;
  return cat === '' || cat === 'benih';
}

function onProductTypeSelectChange(val) {
  const badgeContainer = document.getElementById('pf-qc-badge-container');
  if (!badgeContainer) return;
  const isSeed = (val || '').toLowerCase() === 'benih';
  if (isSeed) {
    badgeContainer.innerHTML = '<span class="qc-type-badge-required">⚠️ Memerlukan alur QC &amp; Uji Semai</span>';
  } else {
    badgeContainer.innerHTML = '<span class="qc-type-badge-free">✅ Bebas QC (Langsung Aktif)</span>';
  }
}

function updateProductCatalogVisibility(productId, isVisible) {
  if (!productId) return;
  try {
    let hiddenIds = [];
    const raw = (window.APP_SETTINGS && window.APP_SETTINGS['catalog_hidden_product_ids']) || '[]';
    hiddenIds = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    if (!Array.isArray(hiddenIds)) hiddenIds = [];

    const idx = hiddenIds.indexOf(productId);
    if (!isVisible && idx === -1) {
      hiddenIds.push(productId);
    } else if (isVisible && idx !== -1) {
      hiddenIds.splice(idx, 1);
    }

    if (!window.APP_SETTINGS) window.APP_SETTINGS = {};
    window.APP_SETTINGS['catalog_hidden_product_ids'] = JSON.stringify(hiddenIds);

    api('saveSettings', TOKEN, {
      catalog_hidden_product_ids: JSON.stringify(hiddenIds)
    }).catch(function (err) {
      console.warn('Gagal sinkron visibilitas katalog produk:', err);
    });
  } catch (e) {
    console.warn('Error updateProductCatalogVisibility:', e);
  }
}

function openProductModal(productId) {
  const product = productId ? PRODUCTS_CACHE.filter(function (p) { return p.id === productId; })[0] : null;
  const presets = getDefaultPriceTierPresets();
  const tiers = (product && product.priceTiers && product.priceTiers.length)
    ? product.priceTiers
    : presets.map(function (p) { return { tier_name: p.name, price: p.price }; });

  const isCreateNew = !productId;
  const isDefaultRaw = product ? isRawProduct(product.unit) : (CURRENT_PRODUCT_TAB === 'mentah');
  const currentUnit = product && product.unit ? product.unit : (isDefaultRaw ? 'gr' : 'pcs');
  const defaultCat = product ? product.category : (CURRENT_PRODUCT_TAB === 'media' ? 'Media' : '');
  const isMedia = (defaultCat || '').toLowerCase().includes('media');
  const defaultBundledCheck = (isCreateNew && isDefaultRaw && !isMedia);
  const currentVariant = product && product.variant ? product.variant : '';

  const defaultProductType = product && product.product_type
    ? product.product_type
    : (isMedia ? 'Buku' : (CURRENT_PRODUCT_TAB === 'media' ? 'Media Tanam' : 'Benih'));
  const isSeedType = defaultProductType.toLowerCase() === 'benih';
  const currentPhoto = (product && product.photo_url) ? product.photo_url : '';

  let hiddenProductIds = [];
  try {
    const rawHidden = (window.APP_SETTINGS && window.APP_SETTINGS['catalog_hidden_product_ids']) || '[]';
    hiddenProductIds = typeof rawHidden === 'string' ? JSON.parse(rawHidden) : (Array.isArray(rawHidden) ? rawHidden : []);
  } catch (e) {
    hiddenProductIds = [];
  }
  const isCurrentlyHiddenInCatalog = product ? hiddenProductIds.includes(product.id) : false;
  const showInCatalogChecked = !isCurrentlyHiddenInCatalog;

  const catalogToggleHtml =
    '<div class="field-group" style="background:#F0FDF4;border:1px solid #BBF7D0;padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">' +
    '  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:700;color:#166534;font-size:12.5px;">' +
    '    <input type="checkbox" id="pf-show-catalog"' + (showInCatalogChecked ? ' checked' : '') + ' style="width:17px;height:17px;accent-color:#16A34A;cursor:pointer;">' +
    '    <span>🌐 Tampilkan di Katalog Online (Publik)</span>' +
    '  </label>' +
    '  <div style="font-size:11px;color:#15803D;margin-top:3px;margin-left:27px;">' +
    '    Centang agar produk dapat dilihat oleh pelanggan di katalog publik. (Benih curah mentah/toples otomatis disaring oleh sistem).' +
    '  </div>' +
    '</div>';

  const bundledSectionHtml = isCreateNew ?
    '<div id="pf-bundled-toggle-wrap" style="display:' + (isDefaultRaw && !isMedia ? 'block' : 'none') + ';margin-bottom:14px;background:#F8FAFC;border:1px dashed #2563EB;padding:10px 14px;border-radius:var(--radius-sm);">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:700;color:#2563EB;font-size:13px;">' +
    '<input type="checkbox" id="pf-bundled-check"' + (defaultBundledCheck ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#2563EB;cursor:pointer;" onchange="toggleBundledPacks(this.checked)">' +
    '<span>✨ Sekaligus buatkan versi kemasan sachet siap jual (2-in-1)</span>' +
    '</label>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:3px;margin-left:28px;">' +
    'Otomatis membuat variasi sachet siap jual dan mendaftarkan harga bertingkatnya dalam 1 kali simpan.' +
    '</div>' +
    '</div>' +
    '<div id="bundled-packs-container" style="display:' + (defaultBundledCheck ? 'block' : 'none') + ';background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #E2E8F0;padding-bottom:8px;">' +
    '<div>' +
    '<div style="font-size:13px;font-weight:700;color:#2563EB;">📦 Versi Kemasan Siap Jual (Sachet / Pack)</div>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:1px;">Nama kemasan otomatis tersinkronisasi mengikuti nama bahan curah + gramatur.</div>' +
    '</div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addBundledPackRow()" style="font-size:11.5px;border-color:#2563EB;color:#2563EB;font-weight:600;">+ Ukuran Sachet Lain</button>' +
    '</div>' +
    '<div id="bundled-pack-list"></div>' +
    '</div>' : '';

  const photoSectionHtml =
    '<div class="field-group" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
    '  <label class="field-label" style="font-size:12.5px;font-weight:700;color:var(--text-main);margin-bottom:8px;display:block;"><i class="fas fa-camera" style="color:var(--primary);margin-right:5px;"></i> Foto Produk (Katalog Online &amp; Kasir)</label>' +
    '  <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;">' +
    '    <div id="pf-photo-preview" style="width:72px;height:72px;border:1.5px dashed #CBD5E1;border-radius:var(--radius-sm);overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
    (currentPhoto ? '<img src="' + escapeHtml(currentPhoto) + '" alt="Foto Produk" style="width:100%;height:100%;object-fit:cover;">' : '<span style="font-size:10px;color:var(--text-muted);text-align:center;"><i class="fas fa-image" style="font-size:22px;display:block;margin-bottom:2px;color:#CBD5E1;"></i>Belum Ada</span>') +
    '    </div>' +
    '    <div style="flex:1;min-width:180px;">' +
    '      <div style="display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap;">' +
    '        <label class="btn btn-primary btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:11.5px;"><i class="fas fa-upload"></i> Upload Foto<input type="file" id="pf-photo-file" accept="image/*" style="display:none;" onchange="handleProductPhotoUpload(this, \'pf-photo-url\', \'pf-photo-preview\')"></label>' +
    '        <button type="button" class="btn btn-secondary btn-sm" onclick="clearProductPhoto(\'pf-photo-url\', \'pf-photo-file\', \'pf-photo-preview\')" style="font-size:11.5px;">Hapus</button>' +
    '      </div>' +
    '      <input type="hidden" id="pf-photo-url" value="' + escapeHtml(currentPhoto) + '">' +
    '      <div style="font-size:11px;color:var(--text-secondary);">Pilih file foto dari perangkat Anda (PNG, JPG, WebP) untuk ditampilkan di katalog pelanggan dan kasir POS.</div>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  const bodyHtml =
    photoSectionHtml +
    catalogToggleHtml +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Nama Produk ' + (isCreateNew ? '<span id="pf-name-type-hint" style="font-weight:normal;color:var(--text-muted);font-size:11px;">(Bahan Baku Curah)</span>' : '') + '</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="pf-name" placeholder="Contoh: Kangkung Lombok / Bayam Hijau" value="' + (product ? escapeHtml(product.name) : '') + '" oninput="updateAllBundledPackNames()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label class="field-label" style="margin-bottom:0;">Jenis / Klasifikasi Produk</label>' +
    '<div id="pf-qc-badge-container">' +
    (isSeedType
      ? '<span class="qc-type-badge-required">⚠️ Memerlukan alur QC &amp; Uji Semai</span>'
      : '<span class="qc-type-badge-free">✅ Bebas QC (Langsung Aktif)</span>') +
    '</div>' +
    '</div>' +
    '<div class="input-wrapper">' +
    '<select id="pf-product-type" onchange="onProductTypeSelectChange(this.value); updateBundledToggleVisibility();" style="padding-left:14px;font-weight:600;">' +
    '<option value="Benih"' + (defaultProductType === 'Benih' ? ' selected' : '') + '>🌱 Benih (Memerlukan QC &amp; Uji Semai)</option>' +
    '<option value="Buku"' + (defaultProductType === 'Buku' ? ' selected' : '') + '>📚 Buku &amp; Publikasi (Bebas QC)</option>' +
    '<option value="Media Tanam"' + (defaultProductType === 'Media Tanam' ? ' selected' : '') + '>🪴 Media Tanam &amp; Kompos (Bebas QC)</option>' +
    '<option value="Beras Merah"' + (defaultProductType === 'Beras Merah' ? ' selected' : '') + '>🌾 Pangan &amp; Beras Merah (Bebas QC)</option>' +
    '<option value="Bibit Tanaman"' + (defaultProductType === 'Bibit Tanaman' ? ' selected' : '') + '>🌿 Bibit Tanaman Hidup (Bebas QC)</option>' +
    '<option value="Merchandise"' + (defaultProductType === 'Merchandise' ? ' selected' : '') + '>👕 Merchandise &amp; Kaos (Bebas QC)</option>' +
    '<option value="Lainnya"' + (defaultProductType === 'Lainnya' ? ' selected' : '') + '>📦 Lainnya / Non-Benih (Bebas QC)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Kategori</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="pf-category" list="pf-cat-list" placeholder="Media, Sayuran Daun..." value="' + escapeHtml(defaultCat) + '" oninput="checkCategoryMedia(this.value); updateBundledToggleVisibility();" style="padding-left:14px;">' +
    '<datalist id="pf-cat-list">' +
    '<option value="Media"><option value="Sayuran Daun"><option value="Sayuran Buah"><option value="Herbal & Bunga"><option value="Pupuk & Nutrisi">' +
    '</datalist>' +
    '</div>' +
    '</div>' +
    '<div id="pf-media-variant-box" style="display:' + (isMedia ? 'block' : 'none') + ';background:var(--primary-light);border:1px solid rgba(30,77,63,0.15);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px;">' +
    '<div style="font-weight:600;font-size:12px;color:var(--primary);margin-bottom:6px;">📚 Varian Bahasa:</div>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">' +
    '<label><input type="radio" name="pf-v-opt" value="Bahasa Indonesia"' + (currentVariant === 'Bahasa Indonesia' || (!currentVariant && isMedia) ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🇮🇩 Indonesia</label>' +
    '<label><input type="radio" name="pf-v-opt" value="English"' + (currentVariant === 'English' ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🇬🇧 English</label>' +
    '<label><input type="radio" name="pf-v-opt" value="Bilingual"' + (currentVariant === 'Bilingual' ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🌐 Bilingual</label>' +
    '</div>' +
    '<input type="text" id="pf-variant" placeholder="Varian bahasa" value="' + escapeHtml(currentVariant || 'Bahasa Indonesia') + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Tipe Barang</label>' +
    '<div class="input-wrapper">' +
    '<select id="pf-type" onchange="toggleUnitOptions(this.value); updateBundledToggleVisibility();" style="padding-left:14px;">' +
    '<option value="jadi"' + (!isDefaultRaw ? ' selected' : '') + '>📦 Kemasan Siap Jual</option>' +
    '<option value="mentah"' + (isDefaultRaw ? ' selected' : '') + '>🌾 Bahan Baku Curah</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Satuan (Unit)</label>' +
    '<div class="input-wrapper">' +
    '<select id="pf-unit" style="padding-left:14px;"></select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Berat Isi / Netto (gr)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="pf-weight-grams" min="0" placeholder="Contoh: 20" value="' + (product && product.weight_grams ? product.weight_grams : '') + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Umur Panen (Hari)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="pf-harvest-days" min="0" placeholder="Misal: 25, 75" value="' + (product && product.harvest_days ? product.harvest_days : '') + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +
    bundledSectionHtml +
    '<div class="field-group">' +
    '<label class="field-label" id="pf-raw-tier-label">' + (isDefaultRaw ? 'Harga Jual Bahan Curah (Opsional bila hanya untuk stok produksi)' : 'Multi-Tier Harga Jual') + '</label>' +
    '<div id="pf-tiers"></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addPriceTierRow()" style="margin-top:6px;">+ Tambah Tier</button>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-save-product" onclick="submitProduct(\'' + (product ? product.id : '') + '\')">Simpan Produk</button>';

  openModal(product ? 'Edit Produk' : 'Tambah Produk Baru', bodyHtml, footerHtml);
  toggleUnitOptions(isDefaultRaw ? 'mentah' : 'jadi', currentUnit);
  tiers.forEach(function (t) { addPriceTierRow(t.tier_name, t.price); });

  if (isCreateNew) {
    updateBundledToggleVisibility();
    if (defaultBundledCheck) {
      addBundledPackRow(20);
    }
  }
}

function updateBundledToggleVisibility() {
  const toggleWrap = document.getElementById('pf-bundled-toggle-wrap');
  const bundledContainer = document.getElementById('bundled-packs-container');
  const typeSelect = document.getElementById('pf-type');
  const catInput = document.getElementById('pf-category');
  const check = document.getElementById('pf-bundled-check');
  const hintEl = document.getElementById('pf-name-type-hint');
  const tierLabel = document.getElementById('pf-raw-tier-label');
  if (!toggleWrap || !typeSelect) return;

  const isMentah = typeSelect.value === 'mentah';
  const catVal = (catInput ? catInput.value : '').toLowerCase();
  const isMedia = catVal.includes('media');

  if (hintEl) {
    hintEl.textContent = isMentah ? '(Bahan Baku Curah)' : '(Kemasan Jadi)';
  }
  if (tierLabel) {
    tierLabel.textContent = isMentah ? 'Harga Jual Bahan Curah (Opsional bila hanya untuk stok produksi)' : 'Multi-Tier Harga Jual';
  }

  if (isMentah && !isMedia) {
    toggleWrap.style.display = 'block';
    if (check && check.checked && bundledContainer) {
      bundledContainer.style.display = 'block';
      const list = document.getElementById('bundled-pack-list');
      if (list && list.children.length === 0) {
        addBundledPackRow(20);
      } else {
        updateAllBundledPackNames();
      }
    }
  } else {
    toggleWrap.style.display = 'none';
    if (bundledContainer) bundledContainer.style.display = 'none';
  }
}

function toggleBundledPacks(isChecked) {
  const container = document.getElementById('bundled-packs-container');
  if (!container) return;
  container.style.display = isChecked ? 'block' : 'none';
  if (isChecked) {
    const list = document.getElementById('bundled-pack-list');
    if (list && list.children.length === 0) {
      addBundledPackRow(20);
    } else {
      updateAllBundledPackNames();
    }
  }
}

function generateSachetName(rawName, gram) {
  rawName = (rawName || '').trim();
  if (!rawName) return '';
  gram = Number(gram || 0);
  if (gram > 0) {
    return rawName + ' Sachet ' + gram + 'g';
  }
  return rawName + ' Sachet';
}

function updateAllBundledPackNames() {
  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const cards = document.querySelectorAll('#bundled-pack-list .bundled-pack-card');
  cards.forEach(function (card) {
    const nameInput = card.querySelector('.bundled-pack-name');
    const gramInput = card.querySelector('.bundled-pack-gram');
    if (nameInput && (!nameInput.dataset.manualEdited || !nameInput.value.trim())) {
      const gram = gramInput ? Number(gramInput.value || 0) : 0;
      nameInput.value = generateSachetName(rawName, gram);
    }
  });
}

function updateBundledPackRowName(gramInputEl) {
  const card = gramInputEl.closest('.bundled-pack-card');
  if (!card) return;
  const nameInput = card.querySelector('.bundled-pack-name');
  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const gram = Number(gramInputEl.value || 0);
  if (nameInput && (!nameInput.dataset.manualEdited || !nameInput.value.trim())) {
    nameInput.value = generateSachetName(rawName, gram);
  }
}

function addBundledPackRow(defaultGram) {
  const list = document.getElementById('bundled-pack-list');
  if (!list) return;

  if (defaultGram === undefined) {
    const count = list.children.length;
    defaultGram = count === 0 ? 20 : (count === 1 ? 50 : 100);
  }

  const presets = getDefaultPriceTierPresets();
  const regPreset = presets.filter(function (p) { return /reguler/i.test(p.name); })[0] || { name: 'Reguler', price: 25000 };
  const outPreset = presets.filter(function (p) { return /outlet/i.test(p.name); })[0] || { name: 'Outlet', price: 20000 };
  const bbPreset = presets.filter(function (p) { return /bali\s*buda/i.test(p.name); })[0] || { name: 'Bali Buda', price: 20300 };

  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const initialName = generateSachetName(rawName, defaultGram);
  const rowIndex = list.children.length;

  const card = document.createElement('div');
  card.className = 'bundled-pack-card';
  card.style.cssText = 'background:#ffffff;border:1px solid #E2E8F0;border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);';

  card.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<span style="font-size:11.5px;font-weight:700;color:#2563EB;display:flex;align-items:center;gap:6px;">' +
    '<span>🌱 Kemasan Variasi #' + (rowIndex + 1) + '</span>' +
    '</span>' +
    (rowIndex > 0 ?
      '<button type="button" class="btn btn-secondary btn-sm" onclick="this.closest(\'.bundled-pack-card\').remove()" style="padding:1px 6px;font-size:11px;color:var(--danger);border-color:#fecaca;" title="Hapus variasi ini">&times; Hapus</button>' : '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:100px 1fr 110px;gap:8px;margin-bottom:8px;">' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Gramatur (gr)</label>' +
    '<input type="number" class="bundled-pack-gram" value="' + defaultGram + '" min="1" placeholder="Gram" oninput="updateBundledPackRowName(this)" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:center;font-weight:600;">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Nama Produk Kemasan Sachet</label>' +
    '<input type="text" class="bundled-pack-name" value="' + escapeHtml(initialName) + '" placeholder="Contoh: Kangkung Sachet 20g" oninput="this.dataset.manualEdited=\'true\'" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Satuan</label>' +
    '<select class="bundled-pack-unit" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
    '<option value="sachet" selected>sachet</option>' +
    '<option value="pcs">pcs</option>' +
    '<option value="pack">pack</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);margin:0;">Harga Jual Kemasan Sachet (Multi-Tier)</label>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addCustomTierToPack(this)" style="padding:1px 6px;font-size:10px;line-height:1.2;">+ Tier Kustom</button>' +
    '</div>' +
    '<div class="bundled-tiers-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:var(--primary);margin-bottom:1px;">Reguler (Rp) <span style="color:var(--danger)">*</span></div>' +
    '<input type="number" class="bundled-price-reguler" data-tier-name="Reguler" value="' + regPreset.price + '" placeholder="25000" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:#0f766e;margin-bottom:1px;">Outlet (Rp)</div>' +
    '<input type="number" class="bundled-price-outlet" data-tier-name="Outlet" value="' + outPreset.price + '" placeholder="20000" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:#2563eb;margin-bottom:1px;">Bali Buda (Rp)</div>' +
    '<input type="number" class="bundled-price-balibuda" data-tier-name="Bali Buda" value="' + bbPreset.price + '" placeholder="20300" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '</div>' +
    '<div class="bundled-extra-tiers" style="margin-top:6px;"></div>' +
    '</div>';

  list.appendChild(card);
}

function addCustomTierToPack(btn) {
  const card = btn.closest('.bundled-pack-card');
  if (!card) return;
  const extraWrap = card.querySelector('.bundled-extra-tiers');
  if (!extraWrap) return;

  const row = document.createElement('div');
  row.className = 'bundled-custom-tier-row';
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;align-items:center;';
  row.innerHTML =
    '<input type="text" placeholder="Nama Tier Kustom" class="custom-tier-name" style="flex:1;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<input type="number" placeholder="Nominal Rp" class="custom-tier-price" min="0" style="flex:1;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()" style="padding:2px 6px;font-size:11px;">&times;</button>';
  extraWrap.appendChild(row);
}

function checkCategoryMedia(catVal) {
  const isMedia = (catVal || '').toLowerCase().includes('media');
  const box = document.getElementById('pf-media-variant-box');
  if (box) box.style.display = isMedia ? 'block' : 'none';
}

function selectVariantOption(val) {
  const input = document.getElementById('pf-variant');
  if (input) input.value = val;
}

function toggleUnitOptions(type, selectedUnit) {
  const unitSelect = document.getElementById('pf-unit');
  if (!unitSelect) return;
  if (type === 'mentah') {
    unitSelect.innerHTML =
      '<option value="gr"' + (selectedUnit === 'gr' ? ' selected' : '') + '>gr (Gram)</option>' +
      '<option value="kg"' + (selectedUnit === 'kg' ? ' selected' : '') + '>kg (Kilogram)</option>';
  } else {
    unitSelect.innerHTML =
      '<option value="pcs"' + (selectedUnit === 'pcs' || !selectedUnit ? ' selected' : '') + '>pcs (Pieces)</option>' +
      '<option value="sachet"' + (selectedUnit === 'sachet' ? ' selected' : '') + '>sachet</option>' +
      '<option value="pack"' + (selectedUnit === 'pack' ? ' selected' : '') + '>pack</option>';
  }
}

function addPriceTierRow(name, price) {
  const container = document.querySelector('#pf-tiers');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'price-tier-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML =
    '<input type="text" placeholder="Nama tier (Reguler/Outlet/Bali Buda)" class="tier-name" value="' + (name ? escapeHtml(name) : '') + '" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<input type="number" placeholder="Nominal Rp" class="tier-price" value="' + (price !== undefined ? price : '') + '" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()">&times;</button>';
  container.appendChild(row);
}

function submitProduct(productId) {
  const name = document.getElementById('pf-name').value.trim();
  const productType = document.getElementById('pf-product-type') ? document.getElementById('pf-product-type').value : 'Benih';
  const category = document.getElementById('pf-category').value.trim();
  const unit = document.getElementById('pf-unit').value.trim();
  const isMedia = (category || '').toLowerCase().includes('media');
  const variant = isMedia ? (document.getElementById('pf-variant').value.trim() || 'Bahasa Indonesia') : '';

  if (!name) { showToast('Nama produk wajib diisi.', true); return; }

  const photoUrl = document.getElementById('pf-photo-url') ? document.getElementById('pf-photo-url').value.trim() : '';
  const isBundled = !productId && document.getElementById('pf-bundled-check') && document.getElementById('pf-bundled-check').checked;

  if (isBundled) {
    const packCards = Array.from(document.querySelectorAll('#bundled-pack-list .bundled-pack-card'));
    if (packCards.length === 0) {
      showToast('Minimal cantumkan 1 variasi kemasan sachet atau hilangkan centang 2-in-1.', true);
      return;
    }

    const packProducts = [];
    for (let i = 0; i < packCards.length; i++) {
      const card = packCards[i];
      const packName = (card.querySelector('.bundled-pack-name').value || '').trim();
      const packGram = Number(card.querySelector('.bundled-pack-gram').value || 0);
      const packUnit = card.querySelector('.bundled-pack-unit').value;

      const regInp = card.querySelector('.bundled-price-reguler');
      const outInp = card.querySelector('.bundled-price-outlet');
      const bbInp = card.querySelector('.bundled-price-balibuda');

      const pReg = Number(regInp ? regInp.value : 0);
      const pOut = Number(outInp ? outInp.value : 0);
      const pBB = Number(bbInp ? bbInp.value : 0);

      if (!packName) {
        showToast('Nama kemasan sachet pada variasi #' + (i + 1) + ' wajib diisi.', true);
        return;
      }

      const packTiers = [];
      if (pReg > 0) packTiers.push({ tier_name: 'Reguler', price: pReg });
      if (pOut > 0) packTiers.push({ tier_name: 'Outlet', price: pOut });
      if (pBB > 0) packTiers.push({ tier_name: 'Bali Buda', price: pBB });

      // Baca tier kustom tambahan jika ada
      const customRows = card.querySelectorAll('.bundled-custom-tier-row');
      customRows.forEach(function (r) {
        const cName = (r.querySelector('.custom-tier-name').value || '').trim();
        const cPrice = Number(r.querySelector('.custom-tier-price').value || 0);
        if (cName && cPrice > 0) {
          packTiers.push({ tier_name: cName, price: cPrice });
        }
      });

      if (packTiers.length === 0) {
        showToast('Minimal cantumkan 1 harga jual nominal positif (Reguler/Outlet/Bali Buda) untuk kemasan "' + packName + '".', true);
        return;
      }

      packProducts.push({
        name: packName,
        product_type: productType,
        variant: packGram > 0 ? (packGram + 'g') : '',
        weight_grams: packGram,
        unit: packUnit,
        photo_url: photoUrl,
        priceTiers: packTiers
      });
    }

    const rawTiers = Array.from(document.querySelectorAll('#pf-tiers .price-tier-row')).map(function (row) {
      return {
        tier_name: row.querySelector('.tier-name').value.trim(),
        price: Number(row.querySelector('.tier-price').value || 0)
      };
    }).filter(function (t) { return t.tier_name && t.price > 0; });

    const btn = document.getElementById('btn-save-product');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Menyimpan 2-in-1 Produk...';
    }

    const payload = {
      rawProduct: {
        name: name,
        product_type: productType,
        category: category,
        variant: variant,
        unit: unit,
        photo_url: photoUrl,
        priceTiers: rawTiers
      },
      packProducts: packProducts
    };

    api('saveBundledProducts', TOKEN, payload).then(function (res) {
      invalidateCache('products');
      const firstPackName = packProducts.length > 0 ? packProducts[0].name : 'kemasan sachet';
      showToast('Berhasil membuat ' + res.count + ' produk: "' + escapeHtml(res.raw_name) + '" dan "' + escapeHtml(firstPackName) + '".');
      closeModal();
      renderProduk(true);
    }).catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Simpan Produk';
      }
      showToast('Gagal menyimpan produk: ' + (err.message || err), true);
    });
    return;
  }

  // Alur simpan produk tunggal biasa
  const tiers = Array.from(document.querySelectorAll('#pf-tiers .price-tier-row')).map(function (row) {
    return {
      tier_name: row.querySelector('.tier-name').value.trim(),
      price: Number(row.querySelector('.tier-price').value || 0)
    };
  }).filter(function (t) { return t.tier_name && t.price > 0; });

  if (tiers.length === 0) { showToast('Minimal cantumkan 1 harga jual.', true); return; }

  const saveBtn = document.getElementById('btn-save-product');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Menyimpan...';
  }

  const harvestDays = Number((document.getElementById('pf-harvest-days') && document.getElementById('pf-harvest-days').value) || 0);
  const weightGrams = Number((document.getElementById('pf-weight-grams') && document.getElementById('pf-weight-grams').value) || 0);
  const finalVariant = variant || (weightGrams > 0 ? (weightGrams + 'g') : '');
  const showInCatalog = document.getElementById('pf-show-catalog') ? document.getElementById('pf-show-catalog').checked : true;

  api('saveProduct', TOKEN, {
    id: productId || null,
    name: name,
    product_type: productType,
    category: category,
    variant: finalVariant,
    weight_grams: weightGrams,
    unit: unit,
    photo_url: photoUrl,
    harvest_days: harvestDays,
    priceTiers: tiers
  }).then(function (res) {
    const savedId = productId || (res && res.id);
    if (savedId) {
      updateProductCatalogVisibility(savedId, showInCatalog);
    }
    invalidateCache('products');
    showToast('Produk berhasil disimpan.');
    closeModal();
    renderProduk(true);
  }).catch(function (err) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Simpan Produk';
    }
    showToast('Gagal menyimpan: ' + (err.message || err), true);
  });
}

// Helper untuk merender badge warna tipe mutasi stok
function renderMutationTypeBadge(type) {
  const t = String(type || '').toUpperCase();
  if (t === 'MASUK_PEMBELIAN' || t === 'PURCHASE_IN') {
    return '<span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-weight:600;"><i class="fas fa-cart-arrow-down" style="font-size:10px;margin-right:4px;"></i> Masuk Pembelian</span>';
  }
  if (t === 'MASUK_PRODUKSI' || t === 'PRODUCTION_IN') {
    return '<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:600;"><i class="fas fa-boxes-packing" style="font-size:10px;margin-right:4px;"></i> Masuk Produksi</span>';
  }
  if (t === 'KELUAR_PRODUKSI' || t === 'PRODUCTION_OUT') {
    return '<span class="badge" style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-weight:600;"><i class="fas fa-seedling" style="font-size:10px;margin-right:4px;"></i> Keluar Produksi</span>';
  }
  if (t === 'KELUAR_PENJUALAN' || t === 'SALE_OUT') {
    return '<span class="badge" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;font-weight:600;"><i class="fas fa-receipt" style="font-size:10px;margin-right:4px;"></i> Keluar Penjualan</span>';
  }
  if (t === 'ADJUSTMENT_OUT' || t === 'KOREKSI_KELUAR' || t === 'KOREKSI_RUSAK') {
    return '<span class="badge" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;font-weight:600;"><i class="fas fa-scale-balanced" style="font-size:10px;margin-right:4px;"></i> Koreksi Kurang</span>';
  }
  if (t === 'ADJUSTMENT_IN' || t === 'KOREKSI_MASUK') {
    return '<span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-weight:600;"><i class="fas fa-plus-circle" style="font-size:10px;margin-right:4px;"></i> Koreksi Tambah</span>';
  }
  if (t === 'CONSIGNMENT_OUT' || t === 'KELUAR_KONSINYASI') {
    return '<span class="badge" style="background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;font-weight:600;"><i class="fas fa-truck-ramp-box" style="font-size:10px;margin-right:4px;"></i> Kirim Konsinyasi</span>';
  }
  if (t === 'CONSIGNMENT_RETURN' || t === 'RETUR_KONSINYASI') {
    return '<span class="badge" style="background:#fdf4ff;color:#a21caf;border:1px solid #f0abfc;font-weight:600;"><i class="fas fa-undo" style="font-size:10px;margin-right:4px;"></i> Retur Konsinyasi</span>';
  }
  if (t === 'MASUK_STOK_AWAL' || t === 'INIT_STOCK') {
    return '<span class="badge" style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;font-weight:600;"><i class="fas fa-sparkles" style="font-size:10px;margin-right:4px;"></i> Saldo Awal</span>';
  }
  if (t === 'MASUK_KOREKSI_NOTA' || t === 'ROLLBACK_SALE') {
    return '<span class="badge" style="background:#fefce8;color:#a16207;border:1px solid #fef08a;font-weight:600;"><i class="fas fa-rotate-left" style="font-size:10px;margin-right:4px;"></i> Batal Nota</span>';
  }
  return '<span class="badge badge-neutral" style="font-weight:600;">' + escapeHtml(type || 'Mutasi') + '</span>';
}
window.renderMutationTypeBadge = renderMutationTypeBadge;


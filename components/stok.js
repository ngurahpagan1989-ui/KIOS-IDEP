// ========================= STOK & BATCH FIFO =========================
let _STOK_PRODUCTS = [];
let _STOK_BATCHES = [];
let _STOK_MUTATIONS = [];
let _STOK_MUTATIONS_FILTERED = [];
let _STOK_MUTATION_PAGE = 1;
const _STOK_MUTATION_PAGE_SIZE = 15;

function renderStok(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cachedProds = getCachedData('products');
  const cachedBatches = getCachedData('batches');
  const cachedMutations = getCachedData('mutations') || [];

  if (!forceRefresh && cachedProds && cachedBatches) {
    drawStokUI(cachedProds, cachedBatches, cachedMutations);
    if (isCacheValid('products') && isCacheValid('batches') && isCacheValid('mutations')) {
      return;
    }
  } else if (!cachedProds || !cachedBatches) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat antrean stok, batch &amp; riwayat mutasi...</div></div>';
  }

  const fetchProds = (isCacheValid('products') && cachedProds)
    ? Promise.resolve(cachedProds)
    : api('getProducts', TOKEN);

  Promise.all([
    fetchProds,
    api('getStockBatches', TOKEN),
    api('getStockMutations', TOKEN).catch(function (e) {
      console.warn('Fallback ambil getStockMovements:', e);
      return api('getStockMovements', TOKEN).catch(function () { return []; });
    })
  ]).then(function (results) {
    const products = Array.isArray(results[0]) ? results[0] : [];
    const batches = Array.isArray(results[1]) ? results[1] : [];
    const mutations = Array.isArray(results[2]) ? results[2] : [];

    setCachedData('products', products);
    setCachedData('batches', batches);
    setCachedData('mutations', mutations);

    drawStokUI(products, batches, mutations);
  }).catch(function (err) {
    if (!cachedProds) {
      showToast('Gagal memuat data stok: ' + (err.message || err), true);
    }
  });
}

function drawStokUI(products, batches, mutations) {
  const content = document.getElementById('content');
  if (!content) return;

  _STOK_PRODUCTS = (Array.isArray(products) ? products : []).filter(function (p) { return p && p.active !== false; });
  _STOK_BATCHES = Array.isArray(batches) ? batches : [];
  _STOK_MUTATIONS = Array.isArray(mutations) ? mutations : [];
  _STOK_MUTATIONS_FILTERED = _STOK_MUTATIONS;
  _STOK_MUTATION_PAGE = 1;
  PRODUCTS_CACHE = _STOK_PRODUCTS;

  // Pemetaan batch ke produk
  const productBatchesMap = {};
  _STOK_BATCHES.forEach(function (b) {
    if (b && b.product_id) {
      if (!productBatchesMap[b.product_id]) productBatchesMap[b.product_id] = [];
      productBatchesMap[b.product_id].push(b);
    }
  });

  // Perhitungan Ringkasan / KPI Cards
  const totalVarieties = _STOK_PRODUCTS.length;
  let totalPackedCount = 0;
  let totalBulkCount = 0;
  _STOK_PRODUCTS.forEach(function (p) {
    if (isRawProduct(p.unit)) totalBulkCount++;
    else totalPackedCount++;
  });

  const activeBatches = _STOK_BATCHES.filter(function (b) { return Number(b.qty_remaining || 0) > 0; });
  const totalActiveBatches = activeBatches.length;

  const today = new Date();
  const expiringBatches = activeBatches.filter(function (b) {
    if (!b.expiry_date) return false;
    try {
      const d = Math.ceil((new Date(b.expiry_date) - today) / (1000 * 60 * 60 * 24));
      return d <= 60;
    } catch (e) { return false; }
  });

  let criticalCount = 0;
  _STOK_PRODUCTS.forEach(function (p) {
    const pBatches = productBatchesMap[p.id] || [];
    const totalRemaining = pBatches.reduce(function (s, b) { return s + Number(b.qty_remaining || 0); }, 0);
    const stockVal = pBatches.length > 0 ? totalRemaining : Number(p.stock || 0);
    if (stockVal <= 10) criticalCount++;
  });

  const totalValuation = activeBatches.reduce(function (s, b) {
    const cost = Number(b.cost_per_unit || b.buy_price || 0);
    return s + (Number(b.qty_remaining || 0) * cost);
  }, 0);

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h1 class="page-title">Stok &amp; Antrean Batch (FIFO)</h1>' +
    '<p class="page-subtitle">Pantau alokasi lot kedaluwarsa, tanggal produksi, mutu penangkar, dan mutasi keluar masuk gudang.</p>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'stok\')" title="Buka Panduan Manajemen Stok &amp; Opname">📖 Panduan Stok</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="printStockOpnameSheetA4()" title="Cetak Lembar Kerja Formulir Stock Opname Fisik A4 untuk Auditor Gudang">📋 Cetak Form Opname (A4)</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openGlobalAuditModal()" title="Buka Jurnal Audit Mutasi Keseluruhan Gudang"><i class="fas fa-history" style="margin-right:4px;"></i> Jurnal Mutasi Global</button>' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="openStockAdjustmentModal()"><i class="fas fa-scale-balanced" style="margin-right:6px;"></i> + Penyesuaian Stok / Saldo Awal</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="renderStok(true)"><i class="fas fa-sync-alt" style="margin-right:6px;"></i> Segarkan Data</button>' +
    '</div>' +
    '</div>' +

    '<!-- 5 KARTU RINGKASAN METRIK (KPI) -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:18px;">' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Varietas Terdaftar</span><span class="stat-icon">🌱</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + totalVarieties + '</div>' +
    '<div class="stat-meta">' + totalPackedCount + ' Kemasan &bull; ' + totalBulkCount + ' Curah</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Lot Batch Aktif</span><span class="stat-icon">📦</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">' + totalActiveBatches + ' Lot</div>' +
    '<div class="stat-meta">Persediaan Fisik Siap Salur</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Segera Expired (&le;60 Hari)</span><span class="stat-icon">' + (expiringBatches.length > 0 ? '⚠️' : '✅') + '</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:' + (expiringBatches.length > 0 ? 'var(--danger)' : 'var(--success)') + ';font-family:\'JetBrains Mono\',monospace;">' + expiringBatches.length + ' Lot</div>' +
    '<div class="stat-meta">' + (expiringBatches.length > 0 ? 'Perlu Prioritas Salur / Uji Ulang' : 'Semua Batch Tanggal Aman') + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Perlu Restock (&le;10)</span><span class="stat-icon">' + (criticalCount > 0 ? '🚨' : '🟢') + '</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:' + (criticalCount > 0 ? '#b45309' : 'var(--success)') + ';font-family:\'JetBrains Mono\',monospace;">' + criticalCount + ' Item</div>' +
    '<div class="stat-meta">' + (criticalCount > 0 ? 'Stok Menipis atau Kosong' : 'Persediaan Dalam Batas Aman') + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Valuasi FIFO</span><span class="stat-icon">💰</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(totalValuation) + '</div>' +
    '<div class="stat-meta">Akumulasi Nilai Modal HPP Lot</div>' +
    '</div>' +
    '</div>' +

    renderTraceabilityPanelHTML('stok') +

    '<!-- TABEL KATALOG PERSEDIAAN PRODUK & ANTREAN FIFO -->' +
    '<div class="card" style="margin-bottom:24px;">' +
    '<div class="stok-filter-toolbar">' +
    '<div class="stok-filter-group">' +
    '<input type="text" id="stok-search-input" placeholder="🔍 Cari nama benih atau kode..." oninput="filterStokTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:260px;background:rgba(15,23,42,0.95);color:#F8FAFC;">' +
    '<select id="stok-type-filter" onchange="filterStokTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">' +
    '<option value="all">Semua Tipe Benih</option>' +
    '<option value="packed">Kemasan Siap Jual (Pcs)</option>' +
    '<option value="bulk">Curah Mentah (Gr)</option>' +
    '</select>' +
    '<select id="stok-status-filter" onchange="filterStokTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">' +
    '<option value="all">Semua Kondisi Stok</option>' +
    '<option value="safe">🟢 Stok Aman (> 15)</option>' +
    '<option value="warn">🟡 Stok Menipis (6 - 15)</option>' +
    '<option value="danger">🔴 Kritis / Habis (&le; 5)</option>' +
    '</select>' +
    '</div>' +
    '<div><span id="stok-filter-count" style="font-size:12px;color:var(--text-secondary);font-weight:600;"></span></div>' +
    '</div>' +

    '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;">' +
    '<table id="stok-product-table">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:50px;text-align:center;">No</th>' +
    '<th>Nama Varietas Benih</th>' +
    '<th style="width:130px;">Tipe Persediaan</th>' +
    '<th style="width:110px;text-align:center;">Lot Batch</th>' +
    '<th style="min-width:220px;">Antrean FIFO #1 (Prioritas Keluar)</th>' +
    '<th style="width:140px;text-align:right;">Saldo Stok Fisik</th>' +
    '<th style="width:170px;text-align:center;">Aksi Cepat</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="stok-product-tbody"></tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +

    '<div id="batch-detail" style="display:none;"></div>';

  filterStokTable();
  if (document.getElementById('stok-mutation-tbody')) {
    filterMutationTable();
  }
}

function filterStokTable() {
  const searchEl = document.getElementById('stok-search-input');
  const typeEl = document.getElementById('stok-type-filter');
  const statusEl = document.getElementById('stok-status-filter');
  const countEl = document.getElementById('stok-filter-count');
  const tbody = document.getElementById('stok-product-tbody');
  if (!tbody) return;

  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const typeFilter = typeEl ? typeEl.value : 'all';
  const statusFilter = statusEl ? statusEl.value : 'all';

  // Build product batches map
  const batchesByProd = {};
  _STOK_BATCHES.forEach(function (b) {
    if (b && b.product_id) {
      if (!batchesByProd[b.product_id]) batchesByProd[b.product_id] = [];
      batchesByProd[b.product_id].push(b);
    }
  });

  const filtered = _STOK_PRODUCTS.filter(function (p) {
    const isRaw = isRawProduct(p.unit);

    // Type filter
    if (typeFilter === 'packed' && isRaw) return false;
    if (typeFilter === 'bulk' && !isRaw) return false;

    // Search query filter
    if (q) {
      const matchName = String(p.name || '').toLowerCase().includes(q);
      const matchCategory = String(p.category || '').toLowerCase().includes(q);
      const matchId = String(p.id || '').toLowerCase().includes(q);
      if (!matchName && !matchCategory && !matchId) return false;
    }

    // Status filter
    const pBatches = batchesByProd[p.id] || [];
    const sumRemaining = pBatches.reduce(function (s, b) { return s + Number(b.qty_remaining || 0); }, 0);
    const stockNum = pBatches.length > 0 ? sumRemaining : Number(p.stock || 0);

    if (statusFilter === 'safe' && stockNum <= 15) return false;
    if (statusFilter === 'warn' && (stockNum <= 5 || stockNum > 15)) return false;
    if (statusFilter === 'danger' && stockNum > 5) return false;

    return true;
  });

  if (countEl) {
    countEl.textContent = 'Menampilkan ' + filtered.length + ' dari ' + _STOK_PRODUCTS.length + ' varietas';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div style="text-align:center;padding:28px;color:var(--text-secondary);"><i class="fas fa-search" style="font-size:24px;margin-bottom:8px;opacity:0.5;display:block;"></i>Tidak ada varietas benih yang sesuai dengan pencarian atau filter.</div></td></tr>';
    return;
  }

  const today = new Date();
  tbody.innerHTML = filtered.map(function (p, idx) {
    const isRaw = isRawProduct(p.unit);
    const typeBadge = isRaw
      ? '<span class="badge badge-warning" style="font-size:11px;">🌾 Curah Mentah</span>'
      : '<span class="badge badge-success" style="font-size:11px;">📦 Kemasan Siap Jual</span>';

    const pBatches = batchesByProd[p.id] || [];
    const activePBatches = pBatches
      .filter(function (b) { return Number(b.qty_remaining || 0) > 0; })
      .sort(function (a, b) { return new Date(a.expiry_date || '9999-12-31') - new Date(b.expiry_date || '9999-12-31'); });

    const totalBatchStock = activePBatches.reduce(function (sum, b) { return sum + Number(b.qty_remaining || 0); }, 0);
    const totalStock = pBatches.length > 0 ? totalBatchStock : Number(p.stock || 0);
    const unitText = isRaw ? 'gr' : (p.unit && p.unit.toLowerCase() !== 'gram' && p.unit.toLowerCase() !== 'gr' ? p.unit : 'pcs');

    // Status Warna Stok Fisik
    let stockBadgeClass = 'badge-success';
    if (totalStock <= 0) stockBadgeClass = 'badge-danger';
    else if (totalStock <= 5) stockBadgeClass = 'badge-danger';
    else if (totalStock <= 15) stockBadgeClass = 'badge-warning';

    // Lot Batch Count
    const lotBadge = activePBatches.length > 0
      ? '<span class="badge badge-info" style="font-size:11.5px;font-weight:600;">' + activePBatches.length + ' Lot</span>'
      : '<span class="badge badge-neutral" style="font-size:11px;opacity:0.6;">0 Lot</span>';

    // Antrean FIFO #1 (Lot Terdekat)
    let fifoPriorityHTML = '<span style="color:var(--text-muted);font-size:11.5px;font-style:italic;">Tidak ada lot aktif</span>';
    if (activePBatches.length > 0) {
      const topBatch = activePBatches[0];
      let expInfo = '';
      if (topBatch.expiry_date) {
        try {
          const daysLeft = Math.ceil((new Date(topBatch.expiry_date) - today) / (1000 * 60 * 60 * 24));
          const expCls = daysLeft < 30 ? 'badge-danger' : daysLeft < 90 ? 'badge-warning' : 'badge-success';
          expInfo = ' <span class="badge ' + expCls + '" style="font-size:10px;padding:1px 5px;" title="' + daysLeft + ' hari lagi">' + formatDateIndo(topBatch.expiry_date) + '</span>';
        } catch (e) { }
      }
      fifoPriorityHTML =
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span class="fifo-badge-priority-1"><i class="fas fa-medal" style="color:#f59e0b;font-size:10px;"></i> #1</span>' +
        '<strong style="font-family:\'JetBrains Mono\',monospace;font-size:12px;color:var(--text-primary);">' + escapeHtml(topBatch.batch_code || topBatch.id) + '</strong>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
        'Sisa: <strong style="color:var(--primary);">' + Number(topBatch.qty_remaining || 0).toLocaleString('id-ID') + ' ' + unitText + '</strong> &bull; Exp:' + expInfo +
        '</div>';
    }

    return '<tr>' +
      '<td style="text-align:center;color:var(--text-secondary);font-size:12px;">' + (idx + 1) + '</td>' +
      '<td>' +
      '<strong style="color:var(--text-primary);font-size:13.5px;">' + escapeHtml(p.name) + '</strong>' +
      (p.category ? '<div style="font-size:11px;color:var(--text-secondary);">' + escapeHtml(p.category) + '</div>' : '') +
      '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td style="text-align:center;">' + lotBadge + '</td>' +
      '<td>' + fifoPriorityHTML + '</td>' +
      '<td style="text-align:right;">' +
      '<span class="badge ' + stockBadgeClass + '" style="font-weight:700;font-size:12.5px;font-family:\'JetBrains Mono\',monospace;">' + totalStock.toLocaleString('id-ID') + ' ' + unitText + '</span>' +
      '</td>' +
      '<td style="text-align:center;">' +
      '<div style="display:inline-flex;gap:4px;">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openBatchDetailModal(\'' + p.id + '\', \'' + escapeHtml(p.name) + '\')" title="Audit antrean lot batch"><i class="fas fa-boxes-stacked" style="font-size:11px;margin-right:4px;"></i> Batch</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openStockAdjustmentModal(\'' + p.id + '\', \'\')" title="Penyesuaian stok manual"><i class="fas fa-scale-balanced" style="font-size:11px;"></i></button>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}
window.filterStokTable = filterStokTable;

function filterMutationTable() {
  const searchEl = document.getElementById('mutation-search-input');
  const typeEl = document.getElementById('mutation-type-filter');
  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const typeFilter = typeEl ? typeEl.value : 'all';

  const prodMap = {};
  _STOK_PRODUCTS.forEach(function (p) { if (p && p.id) prodMap[p.id] = p; });

  _STOK_MUTATIONS_FILTERED = _STOK_MUTATIONS.filter(function (m) {
    if (typeFilter !== 'all') {
      const mt = String(m.mutation_type || m.type || '').toUpperCase();
      if (typeFilter === 'ADJUSTMENT') {
        if (!mt.includes('ADJUSTMENT') && !mt.includes('KOREKSI')) return false;
      } else {
        if (!mt.includes(typeFilter)) return false;
      }
    }

    if (q) {
      const p = prodMap[m.product_id] || (m.product ? m.product : null);
      const prodName = String((p && p.name) || m.product_name || m.product_id || '').toLowerCase();
      const refNo = String(m.reference_no || m.batch_code || m.ref_id || '').toLowerCase();
      const notes = String(m.notes || '').toLowerCase();
      if (!prodName.includes(q) && !refNo.includes(q) && !notes.includes(q)) return false;
    }

    return true;
  });

  _STOK_MUTATION_PAGE = 1;
  renderMutationTable();
}
window.filterMutationTable = filterMutationTable;

function changeMutationPage(delta) {
  const totalPages = Math.max(1, Math.ceil(_STOK_MUTATIONS_FILTERED.length / _STOK_MUTATION_PAGE_SIZE));
  const newPage = _STOK_MUTATION_PAGE + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    _STOK_MUTATION_PAGE = newPage;
    renderMutationTable();
  }
}
window.changeMutationPage = changeMutationPage;

function renderMutationTable() {
  const tbody = document.getElementById('stok-mutation-tbody');
  const countEl = document.getElementById('mutation-filter-count');
  const pageInfoEl = document.getElementById('mutation-page-info');
  const pageIndicator = document.getElementById('mutation-page-indicator');
  const prevBtn = document.getElementById('btn-prev-mutation');
  const nextBtn = document.getElementById('btn-next-mutation');
  if (!tbody) return;

  const totalItems = _STOK_MUTATIONS_FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / _STOK_MUTATION_PAGE_SIZE));
  if (_STOK_MUTATION_PAGE > totalPages) _STOK_MUTATION_PAGE = totalPages;

  if (countEl) {
    countEl.textContent = 'Menampilkan ' + totalItems + ' dari ' + _STOK_MUTATIONS.length + ' mutasi';
  }

  const startIdx = (_STOK_MUTATION_PAGE - 1) * _STOK_MUTATION_PAGE_SIZE;
  const endIdx = Math.min(startIdx + _STOK_MUTATION_PAGE_SIZE, totalItems);

  if (pageInfoEl) {
    pageInfoEl.textContent = totalItems === 0
      ? '0 mutasi'
      : 'Menampilkan data ke ' + (startIdx + 1) + ' – ' + endIdx + ' dari total ' + totalItems + ' mutasi';
  }

  if (pageIndicator) {
    pageIndicator.textContent = _STOK_MUTATION_PAGE + ' / ' + totalPages;
  }

  if (prevBtn) prevBtn.disabled = (_STOK_MUTATION_PAGE <= 1);
  if (nextBtn) nextBtn.disabled = (_STOK_MUTATION_PAGE >= totalPages);

  if (totalItems === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:28px;color:var(--text-secondary);"><i class="fas fa-box-open" style="font-size:24px;margin-bottom:8px;opacity:0.5;display:block;"></i>Tidak ada log mutasi stok yang sesuai dengan filter.</div></td></tr>';
    return;
  }

  const pagedItems = _STOK_MUTATIONS_FILTERED.slice(startIdx, endIdx);
  const prodMap = {};
  _STOK_PRODUCTS.forEach(function (p) { if (p && p.id) prodMap[p.id] = p; });

  tbody.innerHTML = pagedItems.map(function (m) {
    const p = prodMap[m.product_id] || (m.product ? m.product : null);
    const prodName = (p && p.name) || m.product_name || (m.product_id ? ('ID: ' + m.product_id) : '-');
    const isRaw = p ? isRawProduct(p.unit) : (m.unit === 'gr');
    const unitText = m.unit || (isRaw ? 'gr' : 'pcs');

    const tglText = formatDateIndo(m.created_at);
    let timeText = '';
    if (m.created_at) {
      try {
        const dt = new Date(m.created_at);
        if (!isNaN(dt.getTime())) {
          timeText = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) { }
    }
    const dateTimeHTML = '<div><strong style="color:var(--text-primary);">' + tglText + '</strong>' +
      (timeText ? '<br><span style="font-size:11px;color:var(--text-muted);">' + timeText + ' WITA</span>' : '') +
      '</div>';

    const prodBadge = isRaw
      ? '<span class="badge badge-warning" style="font-size:10px;padding:1px 5px;margin-left:4px;">Curah</span>'
      : '<span class="badge badge-success" style="font-size:10px;padding:1px 5px;margin-left:4px;">Kemasan</span>';
    const prodHTML = '<div><strong style="color:var(--text-primary);">' + escapeHtml(prodName) + '</strong> ' + prodBadge + '</div>';

    const mutType = m.mutation_type || m.type || '';
    const badgeHTML = renderMutationTypeBadge(mutType);

    const qtyNum = Number(m.qty || 0);
    const qtySign = qtyNum > 0 ? '+' : '';
    const qtyCol = qtyNum > 0 ? '#10b981' : (qtyNum < 0 ? '#ef4444' : 'var(--text-secondary)');
    const qtyHTML = '<strong style="color:' + qtyCol + ';font-size:13px;font-family:\'JetBrains Mono\',monospace;">' + qtySign + qtyNum.toLocaleString('id-ID') + ' ' + unitText + '</strong>';

    const refNo = m.reference_no || m.batch_code || m.batch_no || m.ref_id || '-';
    const refHTML = '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;background:var(--surface-muted);padding:3px 7px;border-radius:4px;border:1px solid var(--border);color:var(--text-primary);">' + escapeHtml(refNo) + '</span>';

    const notesText = escapeHtml(m.notes || '-');

    return '<tr>' +
      '<td>' + dateTimeHTML + '</td>' +
      '<td>' + prodHTML + '</td>' +
      '<td>' + badgeHTML + '</td>' +
      '<td style="text-align:right;">' + qtyHTML + '</td>' +
      '<td>' + refHTML + '</td>' +
      '<td><span style="font-size:12px;color:var(--text-secondary);">' + notesText + '</span></td>' +
      '</tr>';
  }).join('');
}
window.renderMutationTable = renderMutationTable;


// ==============================================================================
// MODAL JURNAL AUDIT MUTASI GLOBAL (SEMUA BENIH)
// ==============================================================================
let _MODAL_AUDIT_MUTATIONS = [];
let _MODAL_AUDIT_FILTERED = [];
let _MODAL_AUDIT_PAGE = 1;
const _MODAL_AUDIT_PAGE_SIZE = 15;

function openGlobalAuditModal() {
  openModal(
    '📜 Buku Jurnal Audit Mutasi Gudang (Semua Benih)',
    '<div class="empty-state" style="padding:28px;"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat catatan jurnal mutasi seluruh gudang...</div>',
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>',
    true
  );

  api('getStockMutations', TOKEN).then(function (mutations) {
    _MODAL_AUDIT_MUTATIONS = Array.isArray(mutations) ? mutations : [];
    _MODAL_AUDIT_FILTERED = _MODAL_AUDIT_MUTATIONS;
    _MODAL_AUDIT_PAGE = 1;

    const modalBody =
      '<div style="margin-bottom:14px;">' +
      '<div class="stok-filter-toolbar" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div class="stok-filter-group" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
      '<input type="text" id="modal-audit-search" placeholder="🔍 Cari benih, no. nota/batch, atau keterangan..." oninput="filterModalAuditTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:280px;background:rgba(15,23,42,0.95);color:#F8FAFC;">' +
      '<select id="modal-audit-type" onchange="filterModalAuditTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;">' +
      '<option value="all">Semua Tipe Mutasi</option>' +
      '<option value="KELUAR_PENJUALAN">🧾 Keluar Penjualan (POS)</option>' +
      '<option value="MASUK_PEMBELIAN">🛒 Masuk Pembelian</option>' +
      '<option value="MASUK_PRODUKSI">📦 Masuk Produksi (Kemas)</option>' +
      '<option value="KELUAR_PRODUKSI">🌱 Keluar Produksi (Curah)</option>' +
      '<option value="MASUK_STOK_AWAL">✨ Saldo Awal</option>' +
      '<option value="ADJUSTMENT">⚖️ Koreksi / Opname</option>' +
      '<option value="CONSIGNMENT_OUT">🚚 Kirim Konsinyasi</option>' +
      '</select>' +
      '</div>' +
      '<div><span id="modal-audit-count" style="font-size:12px;color:var(--text-secondary);font-weight:600;"></span></div>' +
      '</div>' +
      '<div class="table-container" style="max-height:420px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
      '<table style="width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:140px;">Waktu</th>' +
      '<th>Nama Varietas Benih</th>' +
      '<th style="width:140px;">Tipe Mutasi</th>' +
      '<th style="width:130px;text-align:right;">Perubahan Qty</th>' +
      '<th style="width:150px;">No. Batch / Ref</th>' +
      '<th>Keterangan &amp; Petugas</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody id="modal-audit-tbody"></tbody>' +
      '</table>' +
      '</div>' +
      '<div class="stok-pagination-container" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<span id="modal-audit-page-info" style="font-size:12px;color:var(--text-secondary);"></span>' +
      '<div style="display:flex;align-items:center;gap:6px;">' +
      '<button type="button" class="btn btn-secondary btn-sm" id="modal-audit-prev" onclick="changeModalAuditPage(-1)">&laquo; Sebelumnya</button>' +
      '<span id="modal-audit-indicator" style="font-weight:600;padding:0 8px;font-size:12px;">1 / 1</span>' +
      '<button type="button" class="btn btn-secondary btn-sm" id="modal-audit-next" onclick="changeModalAuditPage(1)">Selanjutnya &raquo;</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    const modalBodyEl = document.getElementById('modal-body');
    if (modalBodyEl) {
      modalBodyEl.innerHTML = modalBody;
      filterModalAuditTable();
    }
  }).catch(function (err) {
    const modalBodyEl = document.getElementById('modal-body');
    if (modalBodyEl) {
      modalBodyEl.innerHTML = '<div class="alert alert-danger">Gagal memuat mutasi global: ' + escapeHtml(err.message || err) + '</div>';
    }
  });
}
window.openGlobalAuditModal = openGlobalAuditModal;

function filterModalAuditTable() {
  const searchEl = document.getElementById('modal-audit-search');
  const typeEl = document.getElementById('modal-audit-type');
  const q = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const typeFilter = typeEl ? typeEl.value : 'all';

  const prodMap = {};
  (_STOK_PRODUCTS || []).forEach(function (p) { if (p && p.id) prodMap[p.id] = p; });

  _MODAL_AUDIT_FILTERED = _MODAL_AUDIT_MUTATIONS.filter(function (m) {
    if (typeFilter !== 'all') {
      const mt = String(m.mutation_type || m.type || '').toUpperCase();
      if (typeFilter === 'ADJUSTMENT') {
        if (!mt.includes('ADJUSTMENT') && !mt.includes('KOREKSI')) return false;
      } else {
        if (!mt.includes(typeFilter)) return false;
      }
    }
    if (q) {
      const p = prodMap[m.product_id] || (m.product ? m.product : null);
      const prodName = String((p && p.name) || m.product_name || m.product_id || '').toLowerCase();
      const refNo = String(m.reference_no || m.batch_code || m.ref_id || '').toLowerCase();
      const notes = String(m.notes || '').toLowerCase();
      if (!prodName.includes(q) && !refNo.includes(q) && !notes.includes(q)) return false;
    }
    return true;
  });

  _MODAL_AUDIT_PAGE = 1;
  renderModalAuditTable();
}
window.filterModalAuditTable = filterModalAuditTable;

function changeModalAuditPage(delta) {
  const totalPages = Math.max(1, Math.ceil(_MODAL_AUDIT_FILTERED.length / _MODAL_AUDIT_PAGE_SIZE));
  const newPage = _MODAL_AUDIT_PAGE + delta;
  if (newPage >= 1 && newPage <= totalPages) {
    _MODAL_AUDIT_PAGE = newPage;
    renderModalAuditTable();
  }
}
window.changeModalAuditPage = changeModalAuditPage;

function renderModalAuditTable() {
  const tbody = document.getElementById('modal-audit-tbody');
  const countEl = document.getElementById('modal-audit-count');
  const pageInfoEl = document.getElementById('modal-audit-page-info');
  const indicatorEl = document.getElementById('modal-audit-indicator');
  const prevBtn = document.getElementById('modal-audit-prev');
  const nextBtn = document.getElementById('modal-audit-next');
  if (!tbody) return;

  const total = _MODAL_AUDIT_FILTERED.length;
  const totalPages = Math.max(1, Math.ceil(total / _MODAL_AUDIT_PAGE_SIZE));
  if (_MODAL_AUDIT_PAGE > totalPages) _MODAL_AUDIT_PAGE = totalPages;

  if (countEl) countEl.textContent = 'Menampilkan ' + total + ' dari ' + _MODAL_AUDIT_MUTATIONS.length + ' mutasi';
  const start = (_MODAL_AUDIT_PAGE - 1) * _MODAL_AUDIT_PAGE_SIZE;
  const end = Math.min(start + _MODAL_AUDIT_PAGE_SIZE, total);

  if (pageInfoEl) {
    pageInfoEl.textContent = total === 0 ? '0 mutasi' : 'Data ' + (start + 1) + ' – ' + end + ' dari total ' + total + ' mutasi';
  }
  if (indicatorEl) indicatorEl.textContent = _MODAL_AUDIT_PAGE + ' / ' + totalPages;
  if (prevBtn) prevBtn.disabled = (_MODAL_AUDIT_PAGE <= 1);
  if (nextBtn) nextBtn.disabled = (_MODAL_AUDIT_PAGE >= totalPages);

  if (total === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:24px;color:var(--text-secondary);"><i class="fas fa-box-open" style="font-size:20px;margin-bottom:6px;opacity:0.5;display:block;"></i>Tidak ada log mutasi yang sesuai filter.</div></td></tr>';
    return;
  }

  const paged = _MODAL_AUDIT_FILTERED.slice(start, end);
  const prodMap = {};
  (_STOK_PRODUCTS || []).forEach(function (p) { if (p && p.id) prodMap[p.id] = p; });

  tbody.innerHTML = paged.map(function (m) {
    const p = prodMap[m.product_id] || (m.product ? m.product : null);
    const prodName = (p && p.name) || m.product_name || (m.product_id ? ('ID: ' + m.product_id) : '-');
    const isRaw = p ? isRawProduct(p.unit) : (m.unit === 'gr');
    const unitText = m.unit || (isRaw ? 'gr' : 'pcs');
    const tglText = m.created_at ? formatDateIndo(m.created_at) : 'Hari Ini';
    let timeText = '';
    if (m.created_at) {
      try {
        const dt = new Date(m.created_at);
        if (!isNaN(dt.getTime())) {
          timeText = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) { }
    }
    const dateTimeHTML = '<div><strong style="color:var(--text-primary);">' + tglText + '</strong>' +
      (timeText ? '<br><span style="font-size:10.5px;color:var(--text-muted);">' + timeText + ' WITA</span>' : '') + '</div>';

    const prodBadge = isRaw
      ? '<span class="badge badge-warning" style="font-size:10px;padding:1px 5px;margin-left:4px;">Curah</span>'
      : '<span class="badge badge-success" style="font-size:10px;padding:1px 5px;margin-left:4px;">Kemasan</span>';
    const prodHTML = '<div><strong style="color:var(--text-primary);">' + escapeHtml(prodName) + '</strong> ' + prodBadge + '</div>';

    const mutType = m.mutation_type || m.type || '';
    const badgeHTML = renderMutationTypeBadge(mutType);

    const qtyNum = Number(m.qty !== undefined && m.qty !== null ? m.qty : (m.qty_change || 0));
    const qtySign = qtyNum > 0 ? '+' : '';
    const qtyCol = qtyNum > 0 ? '#10b981' : (qtyNum < 0 ? '#ef4444' : 'var(--text-secondary)');
    const qtyHTML = '<strong style="color:' + qtyCol + ';font-size:12.5px;font-family:\'JetBrains Mono\',monospace;">' + qtySign + qtyNum.toLocaleString('id-ID') + ' ' + unitText + '</strong>';

    const refNo = m.reference_no || m.batch_code || m.batch_no || m.ref_id || '-';
    const refHTML = '<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;background:var(--surface-muted);padding:3px 7px;border-radius:4px;border:1px solid var(--border);color:var(--text-primary);">' + escapeHtml(refNo) + '</span>';

    return '<tr>' +
      '<td>' + dateTimeHTML + '</td>' +
      '<td>' + prodHTML + '</td>' +
      '<td>' + badgeHTML + '</td>' +
      '<td style="text-align:right;">' + qtyHTML + '</td>' +
      '<td>' + refHTML + '</td>' +
      '<td><span style="font-size:11.5px;color:var(--text-secondary);">' + escapeHtml(m.notes || '-') + '</span></td>' +
      '</tr>';
  }).join('');
}
window.renderModalAuditTable = renderModalAuditTable;

function openBatchDetailModal(productId, productName) {
  openModal('📋 Rincian Antrean Batch FIFO: ' + escapeHtml(productName), '<div class="empty-state" style="padding:28px;"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Mengaudit antrean lot batch FIFO...</div>', '', true);
  const loadingDialog = document.getElementById('modal-dialog');
  if (loadingDialog) {
    loadingDialog.classList.add('modal-dialog-xl');
    loadingDialog.style.width = '94vw';
    loadingDialog.style.maxWidth = '1180px';
  }

  Promise.all([
    api('getStockBatches', TOKEN, productId),
    api('getStockMutations', TOKEN, productId).then(function (muts) {
      if (Array.isArray(muts) && muts.length > 0) return muts;
      return api('getStockMovements', TOKEN, productId).catch(function () { return []; });
    }).catch(function () {
      return api('getStockMovements', TOKEN, productId).catch(function () { return []; });
    })
  ]).then(function (results) {
    const batches = Array.isArray(results[0]) ? results[0] : [];
    const mutations = Array.isArray(results[1]) ? results[1] : [];
    const today = new Date();

    const activeBatches = batches
      .filter(function (b) { return Number(b.qty_remaining || 0) > 0; })
      .sort(function (a, b) { return new Date(a.expiry_date || '9999-12-31') - new Date(b.expiry_date || '9999-12-31'); });
    const depletedBatches = batches.filter(function (b) { return Number(b.qty_remaining || 0) <= 0; });
    const allSorted = activeBatches.concat(depletedBatches);

    const prod = (_STOK_PRODUCTS || []).find(function (p) { return p.id === productId; });
    const isRaw = prod ? isRawProduct(prod.unit) : false;
    const unitText = isRaw ? 'gr' : (prod && prod.unit ? prod.unit : 'pcs');

    const totalRemaining = activeBatches.reduce(function (s, b) { return s + Number(b.qty_remaining || 0); }, 0);
    const totalValuation = activeBatches.reduce(function (s, b) {
      return s + (Number(b.qty_remaining || 0) * Number(b.cost_per_unit || b.buy_price || 0));
    }, 0);

    const summaryHTML =
      '<div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
      '<div>' +
      '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Saldo Fisik Aktif</div>' +
      '<div style="font-size:22px;font-weight:800;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">' + totalRemaining.toLocaleString('id-ID') + ' ' + unitText + '</div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Status Lot Batch</div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--text-primary);"><span style="color:#059669;">' + activeBatches.length + ' Lot Aktif</span> &bull; <span style="color:var(--text-muted);">' + depletedBatches.length + ' Habis</span></div>' +
      '</div>' +
      '<div>' +
      '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;letter-spacing:0.5px;">Valuasi FIFO Lot</div>' +
      '<div style="font-size:18px;font-weight:700;color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(totalValuation) + '</div>' +
      '</div>' +
      '<div>' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="openStockAdjustmentModal(\'' + productId + '\', \'\')"><i class="fas fa-scale-balanced" style="margin-right:4px;"></i> Koreksi Stok</button>' +
      '</div>' +
      '</div>';

    let activeRank = 0;
    const batchRows = allSorted.map(function (b) {
      const isDepleted = Number(b.qty_remaining || 0) <= 0;
      let priorityBadge = '';
      if (isDepleted) {
        priorityBadge = '<span class="fifo-badge-depleted">Habis (0)</span>';
      } else {
        activeRank++;
        if (activeRank === 1) {
          priorityBadge = '<span class="fifo-badge-priority-1"><i class="fas fa-medal" style="color:#f59e0b;"></i> Prioritas #1</span>';
        } else {
          priorityBadge = '<span class="fifo-badge-priority-sub">Antrean #' + activeRank + '</span>';
        }
      }

      let expiryBadge = '<span class="badge badge-neutral">-</span>';
      if (b.expiry_date) {
        try {
          const days = Math.ceil((new Date(b.expiry_date) - today) / (1000 * 60 * 60 * 24));
          const cls = days < 7 ? 'badge-danger' : days < 30 ? 'badge-warning' : 'badge-success';
          expiryBadge = '<span class="badge ' + cls + '" title="' + days + ' hari lagi">' + formatDateIndo(b.expiry_date) + (days >= 0 ? ' (' + days + 'h)' : ' (Exp)') + '</span>';
        } catch (e) { }
      }

      const prodDateStr = b.production_date ? formatDateIndo(b.production_date) : (b.received_at ? formatDateIndo(b.received_at) : '-');

      const qtyIn = Number(b.qty_in || b.qty_remaining || 1);
      const qtyRem = Number(b.qty_remaining || 0);
      const pct = Math.min(100, Math.max(0, Math.round((qtyRem / qtyIn) * 100)));

      const qcBadge = formatBatchQCStatusBadge(b.qc_status, b.quality_status);

      const farmerText = escapeHtml(b.farmer_name || 'Mitra Penangkaran');

      return '<tr style="' + (isDepleted ? 'opacity:0.65;' : '') + '">' +
        '<td style="white-space:nowrap;">' + priorityBadge + '</td>' +
        '<td style="white-space:nowrap;"><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--text-primary);font-size:12.5px;white-space:nowrap;">' + escapeHtml(b.batch_code || b.id) + '</strong></td>' +
        '<td style="white-space:nowrap;"><div style="font-size:11.5px;color:var(--text-secondary);">' + farmerText + '</div>' + qcBadge + '</td>' +
        '<td style="font-size:12px;white-space:nowrap;">' + prodDateStr + '</td>' +
        '<td style="white-space:nowrap;">' +
        '<div style="font-size:12px;font-family:\'JetBrains Mono\',monospace;"><strong>' + qtyRem.toLocaleString('id-ID') + '</strong> / ' + qtyIn.toLocaleString('id-ID') + ' ' + unitText + '</div>' +
        '<div class="fifo-progress-track"><div class="fifo-progress-fill" style="width:' + pct + '%;' + (pct <= 20 ? 'background:#ef4444;' : '') + '"></div></div>' +
        '</td>' +
        '<td style="white-space:nowrap;"><strong style="color:var(--text-primary);font-family:\'JetBrains Mono\',monospace;font-size:12px;">' + formatRupiah(b.cost_per_unit || b.buy_price) + '</strong></td>' +
        '<td style="white-space:nowrap;">' + expiryBadge + '</td>' +
        '<td style="text-align:center;white-space:nowrap;">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="openStockAdjustmentModal(\'' + productId + '\', \'' + b.id + '\')" title="Koreksi stok batch ini" style="font-size:11px;padding:3px 8px;margin-right:4px;"><i class="fas fa-scale-balanced"></i> Koreksi</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="promptEditBatchCode(\'' + b.id + '\', \'' + escapeHtml(b.batch_code || b.id) + '\', \'' + productId + '\', \'' + escapeHtml(productName) + '\')" title="Ubah kode batch" style="font-size:11px;padding:3px 8px;"><i class="fas fa-edit"></i> Ubah Kode</button>' +
        '</td>' +
        '</tr>';
    }).join('');

    const batchCodeMap = {};
    batches.forEach(function (b) {
      if (b && b.id) {
        batchCodeMap[b.id] = b.batch_code || b.id;
      }
    });

    const mutRows = mutations.slice(0, 30).map(function (m) {
      const qVal = Number(m.qty !== undefined && m.qty !== null ? m.qty : (m.qty_change || 0));
      const sign = qVal > 0 ? '+' : '';
      const color = qVal > 0 ? '#10b981' : (qVal < 0 ? '#ef4444' : 'var(--text-secondary)');
      const mType = m.mutation_type || m.type || '';
      const badge = renderMutationTypeBadge(mType);
      const tglStr = m.created_at ? formatDateIndo(m.created_at) : 'Hari Ini';
      let timeStr = '';
      if (m.created_at) {
        try {
          const dt = new Date(m.created_at);
          if (!isNaN(dt.getTime())) {
            timeStr = dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          }
        } catch (e) { }
      }
      const dateDisplay = '<div><strong>' + tglStr + '</strong>' + (timeStr ? '<br><span style="font-size:10.5px;color:var(--text-muted);">' + timeStr + ' WITA</span>' : '') + '</div>';
      const refCode = m.reference_no || m.batch_code || m.ref_id || '-';
      const uText = m.unit || unitText;

      let noteDisplay = m.notes || '-';
      // Sinkronisasi dinamis nomor batch di keterangan transaksi mutasi
      if (m.batch_id && batchCodeMap[m.batch_id]) {
        const liveBatch = batchCodeMap[m.batch_id];
        noteDisplay = noteDisplay.replace(/\(Batch:[^)]+\)/gi, '(Batch: ' + liveBatch + ')');
      }

      return '<tr>' +
        '<td style="font-size:12px;white-space:nowrap;">' + dateDisplay + '</td>' +
        '<td style="white-space:nowrap;">' + badge + '</td>' +
        '<td style="text-align:right;white-space:nowrap;"><strong style="color:' + color + ';font-family:\'JetBrains Mono\',monospace;font-size:12.5px;">' + sign + qVal.toLocaleString('id-ID') + ' ' + uText + '</strong></td>' +
        '<td style="white-space:nowrap;"><span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;background:var(--surface-muted);padding:3px 7px;border-radius:4px;border:1px solid var(--border);color:var(--text-primary);">' + escapeHtml(refCode) + '</span></td>' +
        '<td><span style="font-size:11.5px;color:var(--text-secondary);">' + escapeHtml(noteDisplay) + '</span></td>' +
        '</tr>';
    }).join('');

    const bodyHtml =
      summaryHTML +
      '<div style="margin-bottom:20px;">' +
      '<h4 style="margin:0 0 10px;font-size:14px;font-weight:700;"><i class="fas fa-layer-group" style="color:var(--primary);margin-right:6px;"></i> Antrean Lot Batch FIFO Aktif &amp; Riwayat Lot</h4>' +
      '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:14px;">' +
      '<table style="width:100%;min-width:980px;border-collapse:collapse;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:130px;white-space:nowrap;">Prioritas FIFO</th>' +
      '<th style="width:180px;white-space:nowrap;">Kode Batch / Lot</th>' +
      '<th style="width:140px;white-space:nowrap;">Penangkar / Mutu</th>' +
      '<th style="width:110px;white-space:nowrap;">Tgl Produksi</th>' +
      '<th style="width:130px;white-space:nowrap;">Sisa / Awal</th>' +
      '<th style="width:110px;white-space:nowrap;">HPP Satuan</th>' +
      '<th style="width:130px;white-space:nowrap;">Kedaluwarsa</th>' +
      '<th style="width:160px;text-align:center;white-space:nowrap;">Aksi</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      (batchRows || '<tr><td colspan="8"><div style="text-align:center;padding:16px;color:var(--text-secondary);">Tidak ada catatan batch untuk varietas ini.</div></td></tr>') +
      '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>' +

      '<div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">' +
      '<h4 style="margin:0;font-size:14px;font-weight:700;"><i class="fas fa-history" style="color:var(--primary);margin-right:6px;"></i> Kartu Mutasi Fisik Varietas Ini (' + Math.min(mutations.length, 30) + ' Log Terakhir)</h4>' +
      '<span style="font-size:11.5px;color:var(--text-secondary);">Mencakup Penjualan Kasir, Produksi Kemas, Pembelian &amp; Opname</span>' +
      '</div>' +
      '<div class="table-container" style="max-height:360px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
      '<table style="width:100%;min-width:850px;border-collapse:collapse;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:140px;">Tanggal &amp; Waktu</th>' +
      '<th style="width:140px;">Tipe Mutasi</th>' +
      '<th style="width:130px;text-align:right;">Perubahan Qty</th>' +
      '<th style="width:150px;">No. Batch / Ref</th>' +
      '<th>Keterangan Transaksi</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      (mutRows || '<tr><td colspan="5"><div style="text-align:center;padding:24px 16px;color:var(--text-secondary);"><i class="fas fa-boxes-stacked" style="font-size:24px;color:var(--text-muted);margin-bottom:8px;display:block;"></i><strong style="color:var(--text-primary);display:block;margin-bottom:4px;font-size:13px;">Belum Ada Transaksi Mutasi untuk Varietas Ini</strong><p style="font-size:12px;margin:0 0 12px;color:var(--text-secondary);max-width:440px;margin-left:auto;margin-right:auto;">Riwayat akan otomatis tercatat di sini saat terjadi <strong>Penjualan Kasir</strong>, <strong>Kemas Mandiri</strong>, <strong>Faktur Pembelian</strong>, atau <strong>Koreksi Stok</strong>.</p><button type="button" class="btn btn-secondary btn-sm" onclick="openStockAdjustmentModal(\'' + productId + '\', \'\')" style="font-size:11px;"><i class="fas fa-scale-balanced" style="margin-right:4px;"></i> Coba Koreksi Stok Sekarang</button></div></td></tr>') +
      '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>';

    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>';

    openModal('📋 Rincian Antrean Batch FIFO: ' + escapeHtml(productName), bodyHtml, footerHtml, true);
    const dialog = document.getElementById('modal-dialog');
    if (dialog) {
      dialog.classList.add('modal-dialog-xl');
      dialog.style.width = '94vw';
      dialog.style.maxWidth = '1180px';
    }
  }).catch(function (err) {
    showToast('Gagal memuat batch: ' + (err.message || err), true);
  });
}
window.openBatchDetailModal = openBatchDetailModal;

function promptEditBatchCode(batchId, currentCode, productId, productName) {
  const newCode = prompt('Ubah Kode Batch / Lot untuk ' + (productName || 'varietas ini') + ':', currentCode);
  if (!newCode || newCode.trim() === '' || newCode.trim() === currentCode) {
    return;
  }
  const cleanNewCode = newCode.trim().toUpperCase();
  api('updateStockBatchCode', TOKEN, batchId, cleanNewCode).then(function () {
    invalidateCache('batches');
    invalidateCache('products');
    invalidateCache('mutations');
    invalidateCache('stock_mutations');
    showToast('Kode batch berhasil diubah menjadi: ' + cleanNewCode);
    openBatchDetailModal(productId, productName);
  }).catch(function (err) {
    showToast('Gagal mengubah kode batch: ' + (err.message || err), true);
  });
}
window.promptEditBatchCode = promptEditBatchCode;

function openStockAdjustmentModal(defaultProductId, defaultBatchId) {
  const prodOptions = _STOK_PRODUCTS.map(function (p) {
    const isRaw = isRawProduct(p.unit);
    const sel = (p.id === defaultProductId) ? ' selected' : '';
    const cleanName = typeof formatCleanProductName === 'function' ? formatCleanProductName(p.name) : p.name;
    return '<option value="' + p.id + '" data-unit="' + (isRaw ? 'gr' : (p.unit || 'pcs')) + '"' + sel + '>' + (isRaw ? '🌾 ' : '📦 ') + escapeHtml(cleanName) + ' (' + (isRaw ? 'Curah' : 'Kemasan') + ')</option>';
  }).join('');

  const bodyHtml =
    '<form id="form-stock-adjustment" onsubmit="event.preventDefault(); submitStockAdjustment();">' +
    '<div class="field-group" style="margin-bottom:14px;">' +
    '<label class="field-label" style="font-weight:700;">1. Pilih Varietas Benih</label>' +
    '<select id="adj-product-id" class="input" onchange="onAdjustmentProductChange()" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius-sm);" required>' +
    '<option value="">-- Pilih Varietas Benih --</option>' +
    prodOptions +
    '</select>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:14px;">' +
    '<label class="field-label" style="font-weight:700;">2. Pilih Lot Batch yang Disesuaikan</label>' +
    '<select id="adj-batch-id" class="input" onchange="onAdjustmentBatchChange()" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius-sm);" required>' +
    '<option value="">-- Pilih Batch / Lot --</option>' +
    '</select>' +
    '<small style="color:var(--text-secondary);margin-top:4px;display:block;">Pilih lot yang ada, atau pilih opsi <strong>+ Buat Lot / Batch Baru</strong> untuk memasukkan saldo awal.</small>' +
    '</div>' +

    '<!-- FIELD TAMBAHAN JIKA MEMBUAT LOT BATCH BARU (SALDO AWAL) -->' +
    '<div id="adj-new-batch-fields" style="display:none;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
    '<div style="font-weight:700;color:#166534;margin-bottom:8px;font-size:13px;display:flex;align-items:center;gap:6px;">' +
    '<span>📦</span> Spesifikasi Lot Batch Baru (Saldo Awal)' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:10px;">' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Nomor / Kode Batch Baru</label>' +
    '<div style="display:flex;gap:6px;">' +
    '<input type="text" id="adj-new-batch-code" placeholder="Misal: BATCH-BYM-2611-001" style="flex:1;padding:6px 10px;font-size:12.5px;font-family:\'JetBrains Mono\',monospace;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="generateAdjustmentBatchCode()" style="padding:4px 8px;font-size:11px;">⚡ Auto</button>' +
    '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
    '<div>' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Tanggal Kedaluwarsa</label>' +
    '<input type="date" id="adj-new-exp-date" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '<div>' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Tanggal Produksi / Masuk</label>' +
    '<input type="date" id="adj-new-prod-date" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:0;">' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Biaya Modal / HPP Satuan (Rp)</label>' +
    '<input type="number" id="adj-new-cost" min="0" placeholder="0" style="width:100%;padding:6px 10px;font-size:12.5px;font-family:\'JetBrains Mono\',monospace;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<small style="color:#166534;font-size:10.5px;margin-top:2px;display:block;">Nilai modal HPP untuk perhitungan valuasi aset persediaan FIFO.</small>' +
    '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '<div class="field-group">' +
    '<label class="field-label" style="font-weight:700;">3. Arah Koreksi</label>' +
    '<select id="adj-type" class="input" onchange="updateAdjustmentPreview()" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<option value="MINUS">🔻 Pengurangan Stok (Rusak / Hilang / Opname Kurang)</option>' +
    '<option value="PLUS">🔺 Penambahan Stok (Temuan / Opname Lebih)</option>' +
    '</select>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label" style="font-weight:700;">4. Kategori Alasan</label>' +
    '<select id="adj-reason" class="input" style="width:100%;padding:8px 10px;font-size:13px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<option value="SALDO_AWAL">🔰 Saldo Awal / Inisiasi Stok Gudang</option>' +
    '<option value="BENIH_RUSAK">📦 Kemasan Rusak / Bocor / Cacat Fisik</option>' +
    '<option value="KEDALUWARSA">⏳ Melewati Batas Kadaluarsa (Expired)</option>' +
    '<option value="HAMA_JAMUR">🐛 Serangan Hama Kutu / Jamur Gudang</option>' +
    '<option value="SUSUT_TIMBANGAN">⚖️ Susut Kadar Air / Timbangan (Curah)</option>' +
    '<option value="SELISIH_OPNAME">📋 Selisih Hasil Stock Opname Fisik</option>' +
    '<option value="TEMUAN_FISIK">🔍 Temuan Fisik Barang Berlebih</option>' +
    '<option value="LAINNYA">📝 Penyesuaian Administratif Lainnya</option>' +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:14px;">' +
    '<label class="field-label" style="font-weight:700;">5. Jumlah Kuantitas Penyesuaian (<span id="adj-unit-label">pcs/gr</span>)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="adj-qty" min="1" step="any" placeholder="Masukkan jumlah unit penyesuaian..." oninput="updateAdjustmentPreview()" style="width:100%;padding:8px 12px;font-size:13.5px;font-family:\'JetBrains Mono\',monospace;border:1px solid var(--border);border-radius:var(--radius-sm);" required>' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:16px;">' +
    '<label class="field-label" style="font-weight:700;">6. Catatan Rinci &amp; Keterangan Petugas</label>' +
    '<textarea id="adj-notes" rows="2" placeholder="Contoh: Ditemukan 2 sachet kemasan robek saat penataan display rak depan..." style="width:100%;padding:8px 10px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);" required></textarea>' +
    '</div>' +

    '<!-- KARTU PREVIEW SALDO REALTIME -->' +
    '<div id="adj-preview-box" style="background:#f8fafc;border:1.5px dashed var(--border);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:8px;font-size:12.5px;">' +
    'Pilih varietas &amp; lot batch untuk melihat kalkulasi saldo akhir.' +
    '</div>' +
    '</form>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-adj" onclick="submitStockAdjustment()">' +
    '<span class="btn-text"><i class="fas fa-check" style="margin-right:6px;"></i> Simpan Penyesuaian Stok</span>' +
    '<span class="spinner" id="adj-spinner" style="display:none;" aria-hidden="true"></span>' +
    '</button>';

  openModal('⚖️ Formulir Penyesuaian Stok / Koreksi Batch', bodyHtml, footerHtml);

  if (defaultProductId) {
    setTimeout(function () {
      const pSelect = document.getElementById('adj-product-id');
      if (pSelect) {
        pSelect.value = defaultProductId;
        onAdjustmentProductChange(defaultBatchId);
      }
    }, 50);
  }
}
window.openStockAdjustmentModal = openStockAdjustmentModal;

function onAdjustmentProductChange(preselectedBatchId) {
  const pSelect = document.getElementById('adj-product-id');
  const bSelect = document.getElementById('adj-batch-id');
  const unitLabel = document.getElementById('adj-unit-label');
  if (!pSelect || !bSelect) return;

  const prodId = pSelect.value;
  const opt = pSelect.options[pSelect.selectedIndex];
  const unit = opt ? opt.getAttribute('data-unit') : 'pcs';
  if (unitLabel) unitLabel.textContent = unit;

  if (!prodId) {
    bSelect.innerHTML = '<option value="">-- Pilih Batch / Lot --</option>';
    updateAdjustmentPreview();
    return;
  }

  const pBatches = _STOK_BATCHES.filter(function (b) { return b.product_id === prodId; });
  let optionsHtml = '<option value="">-- Pilih Lot Batch (' + pBatches.length + ' Lot Tersedia) --</option>';
  optionsHtml += '<option value="__NEW_BATCH__" data-qty="0" style="color:#15803d;font-weight:700;">✨ + Buat Lot / Batch Baru (Saldo Awal / Inisiasi)</option>';

  if (pBatches.length > 0) {
    optionsHtml += pBatches.map(function (b) {
      const sel = (b.id === preselectedBatchId) ? ' selected' : '';
      const expStr = b.expiry_date ? formatDateIndo(b.expiry_date) : '-';
      const rem = Number(b.qty_remaining || 0);
      return '<option value="' + b.id + '" data-qty="' + rem + '"' + sel + '>' + escapeHtml(b.batch_code || b.id) + ' (Sisa: ' + rem.toLocaleString('id-ID') + ' ' + unit + ' | Exp: ' + expStr + ')</option>';
    }).join('');
  }

  bSelect.innerHTML = optionsHtml;
  if (pBatches.length === 0) {
    bSelect.value = '__NEW_BATCH__';
  } else if (preselectedBatchId) {
    bSelect.value = preselectedBatchId;
  }

  onAdjustmentBatchChange();
}
window.onAdjustmentProductChange = onAdjustmentProductChange;

function updateAdjustmentPreview() {
  const pSelect = document.getElementById('adj-product-id');
  const bSelect = document.getElementById('adj-batch-id');
  const typeSelect = document.getElementById('adj-type');
  const qtyInput = document.getElementById('adj-qty');
  const previewBox = document.getElementById('adj-preview-box');
  if (!previewBox) return;

  const bOpt = (bSelect && bSelect.selectedIndex >= 0) ? bSelect.options[bSelect.selectedIndex] : null;
  const curQty = bOpt ? Number(bOpt.getAttribute('data-qty') || 0) : 0;
  const adjType = typeSelect ? typeSelect.value : 'MINUS';
  const inputQty = Number(qtyInput ? qtyInput.value : 0);
  const pOpt = (pSelect && pSelect.selectedIndex >= 0) ? pSelect.options[pSelect.selectedIndex] : null;
  const unit = pOpt ? pOpt.getAttribute('data-unit') : 'pcs';

  if (!bSelect || !bSelect.value) {
    previewBox.innerHTML = '<span style="color:var(--text-secondary);">Silakan pilih lot batch di atas untuk melihat simulasi saldo.</span>';
    return;
  }

  let finalQty = (adjType === 'MINUS') ? (curQty - inputQty) : (curQty + inputQty);
  let warnText = '';
  if (adjType === 'MINUS' && inputQty > curQty) {
    warnText = '<div style="color:#ef4444;font-weight:700;margin-top:4px;"><i class="fas fa-exclamation-triangle"></i> Perhatian: Kuantitas pengurangan (' + inputQty + ') melebihi sisa batch (' + curQty + '). Sisa batch akan diset ke 0.</div>';
    finalQty = 0;
  }

  const sign = adjType === 'MINUS' ? '-' : '+';
  const color = adjType === 'MINUS' ? '#ef4444' : '#10b981';

  previewBox.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
    '<div>Sisa Batch Saat Ini: <strong>' + curQty.toLocaleString('id-ID') + ' ' + unit + '</strong></div>' +
    '<div>Penyesuaian: <strong style="color:' + color + ';">' + sign + inputQty.toLocaleString('id-ID') + ' ' + unit + '</strong></div>' +
    '<div>Estimasi Sisa Akhir: <strong style="color:var(--primary);font-size:13.5px;">' + Math.max(0, finalQty).toLocaleString('id-ID') + ' ' + unit + '</strong></div>' +
    '</div>' + warnText;
}
window.updateAdjustmentPreview = updateAdjustmentPreview;


function onAdjustmentBatchChange() {
  const bSelect = document.getElementById('adj-batch-id');
  const typeSelect = document.getElementById('adj-type');
  const reasonSelect = document.getElementById('adj-reason');
  const newFields = document.getElementById('adj-new-batch-fields');
  const isNew = bSelect && bSelect.value === '__NEW_BATCH__';

  if (newFields) {
    newFields.style.display = isNew ? 'block' : 'none';
  }

  if (isNew) {
    if (typeSelect) {
      typeSelect.value = 'PLUS';
      typeSelect.disabled = true;
    }
    if (reasonSelect) {
      reasonSelect.value = 'SALDO_AWAL';
    }
    generateAdjustmentBatchCode();
    const prodDateInput = document.getElementById('adj-new-prod-date');
    if (prodDateInput && !prodDateInput.value) {
      prodDateInput.value = new Date().toISOString().split('T')[0];
    }
    const expDateInput = document.getElementById('adj-new-exp-date');
    if (expDateInput && !expDateInput.value) {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 2);
      expDateInput.value = d.toISOString().split('T')[0];
    }
  } else {
    if (typeSelect) {
      typeSelect.disabled = false;
    }
  }

  updateAdjustmentPreview();
}
window.onAdjustmentBatchChange = onAdjustmentBatchChange;

function generateAdjustmentBatchCode() {
  const pSelect = document.getElementById('adj-product-id');
  const codeInput = document.getElementById('adj-new-batch-code');
  if (!codeInput) return;

  let prodTerm = 'BENIH';
  let prodId = '';
  if (pSelect && pSelect.selectedIndex >= 0) {
    prodId = pSelect.value;
    prodTerm = pSelect.options[pSelect.selectedIndex].text || '';
  }

  const prodDateInput = document.getElementById('adj-new-prod-date');
  const prodDateVal = prodDateInput ? prodDateInput.value : '';
  const expInput = document.getElementById('adj-new-exp-date');
  const expVal = expInput ? expInput.value : '';
  const seqNum = typeof getNextBatchSequenceForProduct === 'function' ? getNextBatchSequenceForProduct(prodId, prodTerm, null) : 1;

  codeInput.value = generateClientBatchCode(prodTerm, prodDateVal, seqNum, prodId, { expiryDate: expVal });
}
window.generateAdjustmentBatchCode = generateAdjustmentBatchCode;

function submitStockAdjustment() {
  const pSelect = document.getElementById('adj-product-id');
  const bSelect = document.getElementById('adj-batch-id');
  const typeSelect = document.getElementById('adj-type');
  const reasonSelect = document.getElementById('adj-reason');
  const qtyInput = document.getElementById('adj-qty');
  const notesText = document.getElementById('adj-notes');
  const submitBtn = document.getElementById('btn-submit-adj');
  const spinner = document.getElementById('adj-spinner');

  const productId = pSelect ? pSelect.value : '';
  const batchId = bSelect ? bSelect.value : '';
  const adjType = typeSelect ? typeSelect.value : 'MINUS';
  const reason = reasonSelect ? reasonSelect.value : 'KOREKSI';
  const qty = Number(qtyInput ? qtyInput.value : 0);
  const notes = notesText ? notesText.value.trim() : '';

  if (!productId || !batchId) {
    showToast('Pilih varietas benih dan lot batch yang akan disesuaikan.', true);
    return;
  }
  if (!qty || qty <= 0) {
    showToast('Masukkan kuantitas penyesuaian yang valid (lebih besar dari 0).', true);
    return;
  }
  if (!notes) {
    showToast('Wajib mengisi catatan alasan penyesuaian untuk transparansi audit.', true);
    return;
  }

  const pOpt = pSelect ? pSelect.options[pSelect.selectedIndex] : null;
  const unit = pOpt ? pOpt.getAttribute('data-unit') : 'pcs';

  // Validasi jika pengurangan (MINUS) melebihi sisa fisik batch
  const bOpt = bSelect ? bSelect.options[bSelect.selectedIndex] : null;
  const curBatchStock = bOpt ? Number(bOpt.getAttribute('data-qty') || 0) : 0;
  if (adjType === 'MINUS' && qty > curBatchStock) {
    showToast('Kuantitas pengurangan (' + qty + ' ' + unit + ') melebihi sisa fisik batch (' + curBatchStock + ' ' + unit + ' tersedia)!', true);
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';

  const isNewBatch = (batchId === '__NEW_BATCH__');
  let newBatchCode = '';
  let newExpDate = '';
  let newProdDate = '';
  let newCost = 0;

  if (isNewBatch) {
    const codeEl = document.getElementById('adj-new-batch-code');
    const expEl = document.getElementById('adj-new-exp-date');
    const prodEl = document.getElementById('adj-new-prod-date');
    const costEl = document.getElementById('adj-new-cost');
    newExpDate = expEl ? expEl.value : '';
    newProdDate = prodEl ? prodEl.value : '';
    newCost = Number(costEl ? costEl.value : 0);
    const prodTerm = (pSelect && pSelect.selectedIndex >= 0) ? pSelect.options[pSelect.selectedIndex].text : '';
    const prodCode = typeof cleanProductCodeForBatch === 'function' ? cleanProductCodeForBatch(prodTerm) : 'BENIH';
    const yymm = typeof extractYYMMClient === 'function' ? extractYYMMClient(newExpDate) : '2611';
    newBatchCode = (codeEl ? codeEl.value.trim() : '') || ('BATCH-' + prodCode + '-' + yymm + '-001');
  }

  const payload = {
    product_id: productId,
    batch_id: batchId,
    is_new_batch: isNewBatch,
    batch_code: newBatchCode,
    expiry_date: newExpDate || null,
    production_date: newProdDate || null,
    cost_per_unit: newCost,
    buy_price: newCost,
    adjustment_type: isNewBatch ? 'PLUS' : adjType,
    qty: qty,
    reason: isNewBatch ? 'SALDO_AWAL' : reason,
    unit: unit,
    notes: notes,
    user_name: (CURRENT_USER && CURRENT_USER.name) || USER_NAME || 'Admin'
  };

  api('adjustStockBatch', TOKEN, payload).then(function () {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';

    showToast('Koreksi stok berhasil disimpan! Saldo lot & mutasi telah diperbarui.');
    closeModal();
    // Invalidate local cache and reload view
    invalidateCache('products');
    invalidateCache('batches');
    invalidateCache('mutations');
    renderStok(true);
  }).catch(function (err) {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    showToast('Gagal menyimpan koreksi stok: ' + (err.message || err), true);
  });
}
window.submitStockAdjustment = submitStockAdjustment;

function showBatchDetail(productId, productName) {
  openBatchDetailModal(productId, productName);
}
window.showBatchDetail = showBatchDetail;


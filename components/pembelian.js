// ========================= PEMBELIAN (PENGADAAN) =========================
let CURRENT_PURCHASES = [];
let PURCHASE_FILTERS = { search: '', supplier: 'all', period: 'all', dateFrom: '', dateTo: '' };

function formatBatchQCStatusBadge(qcStatus, qualityStatus) {
  const qcUp = String(qcStatus || '').toUpperCase().trim();
  const qUp = String(qualityStatus || '').toUpperCase().trim();
  if (qcUp === 'APPROVED' || qcUp === 'OK' || qcUp === 'PASSED') {
    return '<span class="badge badge-success" style="font-size:10px;padding:1px 6px;">QC Lulus</span>';
  }
  if (qcUp === 'REJECTED' || qUp === 'QUARANTINE') {
    return '<span class="badge badge-danger" style="font-size:10px;padding:1px 6px;">QC Ditolak / Karantina</span>';
  }
  if (qcUp === 'IN_PROGRESS') {
    return '<span class="badge badge-warning" style="font-size:10px;padding:1px 6px;">Proses QC / DHT</span>';
  }
  if (qcUp === 'PENDING_QC') {
    return '<span class="badge badge-warning" style="font-size:10px;padding:1px 6px;">Menunggu QC</span>';
  }
  return '<span class="badge badge-neutral" style="font-size:10px;padding:1px 6px;">Normal</span>';
}

function getPurchaseLocalDateYMD(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function getFilteredPurchases() {
  const kw = String(PURCHASE_FILTERS.search || '').toLowerCase().trim();
  const supFilter = PURCHASE_FILTERS.supplier || 'all';
  const period = PURCHASE_FILTERS.period || 'all';
  const todayStr = getPurchaseLocalDateYMD(new Date().toISOString());
  const currentMonthPrefix = todayStr.slice(0, 7);
  const thirtyDaysAgoMs = Date.now() - (30 * 24 * 60 * 60 * 1000);

  return (CURRENT_PURCHASES || []).filter(function (p) {
    if (!p) return false;
    if (supFilter !== 'all' && String(p.supplier_name || '') !== supFilter) {
      return false;
    }

    const rowDateStr = getPurchaseLocalDateYMD(p.created_at);
    if (period === 'today' && rowDateStr !== todayStr) return false;
    if (period === 'this_month' && rowDateStr.slice(0, 7) !== currentMonthPrefix) return false;
    if (period === '30d') {
      const rowMs = p.created_at ? new Date(p.created_at).getTime() : NaN;
      if (isNaN(rowMs) || rowMs < thirtyDaysAgoMs) return false;
    }
    if (period === 'custom') {
      if (PURCHASE_FILTERS.dateFrom && rowDateStr && rowDateStr < PURCHASE_FILTERS.dateFrom) return false;
      if (PURCHASE_FILTERS.dateTo && rowDateStr && rowDateStr > PURCHASE_FILTERS.dateTo) return false;
    }

    if (kw) {
      const items = Array.isArray(p.items) ? p.items : [];
      const inHeader =
        String(p.invoice_no || '').toLowerCase().indexOf(kw) !== -1 ||
        String(p.supplier_name || '').toLowerCase().indexOf(kw) !== -1 ||
        String(p.farmer_name || '').toLowerCase().indexOf(kw) !== -1 ||
        String(p.notes || '').toLowerCase().indexOf(kw) !== -1;
      const inItems = items.some(function (it) {
        return String(it.product_name || '').toLowerCase().indexOf(kw) !== -1 ||
          String(it.batch_code || '').toLowerCase().indexOf(kw) !== -1;
      });
      if (!inHeader && !inItems) return false;
    }

    return true;
  });
}

function buildPurchaseKPICardsHTML(filteredList, allList) {
  const totalFilteredVal = filteredList.reduce(function (s, p) { return s + Number(p.total || 0); }, 0);
  const currentMonthPrefix = getPurchaseLocalDateYMD(new Date().toISOString()).slice(0, 7);
  const monthPurchases = (allList || []).filter(function (p) {
    return getPurchaseLocalDateYMD(p.created_at).slice(0, 7) === currentMonthPrefix;
  });
  const monthTotalVal = monthPurchases.reduce(function (s, p) { return s + Number(p.total || 0); }, 0);

  let totalBatches = 0;
  let pendingQcItems = 0;
  filteredList.forEach(function (p) {
    const items = Array.isArray(p.items) ? p.items : [];
    totalBatches += items.length;
    items.forEach(function (it) {
      const qcUp = String(it.qc_status || '').toUpperCase();
      if (qcUp === 'PENDING_QC' || qcUp === 'IN_PROGRESS') pendingQcItems++;
    });
  });

  return '<div class="stat-card cyber-stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Pengadaan (Terfilter)</span><span class="stat-icon" style="color:#22D3EE;">🧾</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:#22D3EE;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(totalFilteredVal) + '</div>' +
    '<div class="stat-meta">' + filteredList.length + ' faktur pengadaan tampil</div>' +
    '</div>' +
    '<div class="stat-card cyber-stat-card">' +
    '<div class="stat-header"><span class="stat-label">Pengadaan Bulan Ini</span><span class="stat-icon" style="color:#34D399;">📅</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:#34D399;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(monthTotalVal) + '</div>' +
    '<div class="stat-meta">' + monthPurchases.length + ' faktur tercatat bulan ini</div>' +
    '</div>' +
    '<div class="stat-card cyber-stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Batch Masuk</span><span class="stat-icon" style="color:#FBBF24;">🌾</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:#FBBF24;font-family:\'JetBrains Mono\',monospace;">' + totalBatches + ' Batch</div>' +
    '<div class="stat-meta">' + (pendingQcItems > 0 ? (pendingQcItems + ' batch masih antre/proses QC') : 'Semua batch terfilter sudah lulus / siap') + '</div>' +
    '</div>';
}

function buildPurchaseRowSummary(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<span style="font-size:11px;color:var(--text-secondary);">Rincian batch tidak tersedia</span>';
  }
  const preview = items.slice(0, 2).map(function (it) {
    const qtyText = Number(it.qty_in || 0).toLocaleString('id-ID') + ' ' + escapeHtml(it.unit || 'pcs');
    return escapeHtml(it.product_name || '-') + ' (' + qtyText + ')';
  }).join(', ');
  const extra = items.length > 2 ? (' +' + (items.length - 2) + ' item lainnya') : '';
  return '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:3px;line-height:1.35;">' + preview + escapeHtml(extra) + '</div>';
}

function buildPurchaseQCSummaryBadge(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  let pendingCount = 0;
  let rejectedCount = 0;
  items.forEach(function (it) {
    const qcUp = String(it.qc_status || '').toUpperCase();
    const qUp = String(it.quality_status || '').toUpperCase();
    if (qcUp === 'REJECTED' || qUp === 'QUARANTINE') rejectedCount++;
    else if (qcUp === 'PENDING_QC' || qcUp === 'IN_PROGRESS') pendingCount++;
  });
  if (rejectedCount > 0) {
    return '<span class="badge badge-danger" style="font-size:10px;padding:1px 6px;">' + rejectedCount + ' Karantina QC</span>';
  }
  if (pendingCount > 0) {
    return '<span class="badge badge-warning" style="font-size:10px;padding:1px 6px;">' + pendingCount + ' Menunggu/Proses QC</span>';
  }
  return '<span class="badge badge-success" style="font-size:10px;padding:1px 6px;">Semua QC Lulus</span>';
}

function renderPembelianTableRows(filteredList) {
  if (!filteredList || filteredList.length === 0) {
    return '<tr><td colspan="5"><div class="empty-state" style="padding:28px 16px;">Tidak ada faktur pembelian yang sesuai dengan filter.</div></td></tr>';
  }

  return filteredList.map(function (p) {
    const items = Array.isArray(p.items) ? p.items : [];
    const stokAwalBadge = p.is_stok_awal
      ? '<span class="badge badge-info" style="font-size:10px;padding:1px 6px;margin-left:6px;">🏷️ Stok Awal</span>'
      : '';
    const qcSummaryBadge = buildPurchaseQCSummaryBadge(items);
    const notesHtml = p.notes
      ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">📝 ' + escapeHtml(p.notes) + '</div>'
      : '';
    const farmerLine = (p.farmer_name && p.farmer_name !== '-')
      ? '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">🌾 ' + escapeHtml(p.farmer_name) + '</div>'
      : '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">-</div>';

    const actionHtml = '<button type="button" class="btn btn-secondary btn-sm" onclick="openPurchaseDetailModal(\'' + escapeHtml(p.id) + '\')" style="margin-right:6px;">Detail</button>' +
      (p.can_delete !== false
        ? '<button type="button" class="btn btn-danger btn-sm" onclick="deletePurchaseUI(\'' + escapeHtml(p.id) + '\')">Hapus</button>'
        : '<span class="badge badge-neutral" title="' + escapeHtml(p.locked_reason || 'Batch sudah terpakai di stok/produksi') + '" style="font-size:11px;padding:5px 8px;cursor:help;">🔒 Terpakai</span>');

    return '<tr>' +
      '<td style="white-space:nowrap;"><strong>' + formatDate(p.created_at) + '</strong></td>' +
      '<td>' +
      '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">' +
      '<strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:12.5px;">' + escapeHtml(p.invoice_no || '-') + '</strong>' +
      stokAwalBadge +
      qcSummaryBadge +
      '</div>' +
      buildPurchaseRowSummary(items) +
      notesHtml +
      '</td>' +
      '<td><strong>' + escapeHtml(p.supplier_name || '(tidak diketahui)') + '</strong>' + farmerLine + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' +
      '<strong style="font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(p.total) + '</strong>' +
      '<div style="font-size:11px;color:var(--text-secondary);">' + items.length + ' item batch</div>' +
      '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' + actionHtml + '</td>' +
      '</tr>';
  }).join('');
}

function updatePembelianFilteredView() {
  const filtered = getFilteredPurchases();
  const kpiGrid = document.getElementById('pembelian-kpi-grid');
  const tbody = document.getElementById('pembelian-table-body');
  const countBadge = document.getElementById('pembelian-count-badge');
  const dateRangeWrap = document.getElementById('purchase-date-range-wrap');
  const resetBtn = document.getElementById('purchase-reset-btn');

  if (kpiGrid) kpiGrid.innerHTML = buildPurchaseKPICardsHTML(filtered, CURRENT_PURCHASES);
  if (tbody) tbody.innerHTML = renderPembelianTableRows(filtered);
  if (countBadge) countBadge.textContent = 'Menampilkan ' + filtered.length + ' dari ' + CURRENT_PURCHASES.length + ' faktur';
  if (dateRangeWrap) dateRangeWrap.style.display = PURCHASE_FILTERS.period === 'custom' ? 'flex' : 'none';
  if (resetBtn) {
    const hasFilter = Boolean(PURCHASE_FILTERS.search || PURCHASE_FILTERS.supplier !== 'all' || PURCHASE_FILTERS.period !== 'all');
    resetBtn.style.display = hasFilter ? 'inline-flex' : 'none';
  }
}

function onPurchaseFilterChange() {
  const searchEl = document.getElementById('purchase-search-input');
  const supEl = document.getElementById('purchase-filter-supplier');
  const periodEl = document.getElementById('purchase-filter-period');
  const fromEl = document.getElementById('purchase-date-from');
  const toEl = document.getElementById('purchase-date-to');

  if (searchEl) PURCHASE_FILTERS.search = searchEl.value || '';
  if (supEl) PURCHASE_FILTERS.supplier = supEl.value || 'all';
  if (periodEl) PURCHASE_FILTERS.period = periodEl.value || 'all';
  if (fromEl) PURCHASE_FILTERS.dateFrom = fromEl.value || '';
  if (toEl) PURCHASE_FILTERS.dateTo = toEl.value || '';

  updatePembelianFilteredView();
}

function resetPurchaseFilters() {
  PURCHASE_FILTERS = { search: '', supplier: 'all', period: 'all', dateFrom: '', dateTo: '' };
  const searchEl = document.getElementById('purchase-search-input');
  const supEl = document.getElementById('purchase-filter-supplier');
  const periodEl = document.getElementById('purchase-filter-period');
  const fromEl = document.getElementById('purchase-date-from');
  const toEl = document.getElementById('purchase-date-to');

  if (searchEl) searchEl.value = '';
  if (supEl) supEl.value = 'all';
  if (periodEl) periodEl.value = 'all';
  if (fromEl) fromEl.value = '';
  if (toEl) toEl.value = '';

  updatePembelianFilteredView();
}

function openPurchaseDetailModal(purchaseId) {
  const p = (CURRENT_PURCHASES || []).find(function (x) { return String(x.id) === String(purchaseId); });
  if (!p) {
    showToast('Data faktur pembelian tidak ditemukan.', true);
    return;
  }

  const items = Array.isArray(p.items) ? p.items : [];
  const rowsHtml = items.length > 0
    ? items.map(function (it, idx) {
      const qtyIn = Number(it.qty_in || 0).toLocaleString('id-ID');
      const qtyRem = Number(it.qty_remaining || 0).toLocaleString('id-ID');
      const unitStr = escapeHtml(it.unit || 'pcs');
      const prodDate = it.production_date ? formatDateIndo(it.production_date) : '-';
      const expDate = it.expiry_date ? formatDateIndo(it.expiry_date) : '-';
      return '<tr>' +
        '<td style="text-align:center;">' + (idx + 1) + '</td>' +
        '<td><strong>' + escapeHtml(it.product_name || '-') + '</strong></td>' +
        '<td><code style="font-family:\'JetBrains Mono\',monospace;font-size:11.5px;">' + escapeHtml(it.batch_code || '-') + '</code></td>' +
        '<td style="text-align:right;white-space:nowrap;"><strong>' + qtyIn + '</strong> / ' + qtyRem + ' ' + unitStr + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' + formatRupiah(it.buy_price) + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' + formatRupiah(it.additional_cost) + '</td>' +
        '<td style="text-align:right;white-space:nowrap;"><strong>' + formatRupiah(it.cost_per_unit) + '</strong></td>' +
        '<td style="font-size:11px;white-space:nowrap;">Panen: ' + prodDate + '<br>Exp: ' + expDate + '</td>' +
        '<td style="text-align:center;">' + formatBatchQCStatusBadge(it.qc_status, it.quality_status) + '</td>' +
        '</tr>';
    }).join('')
    : '<tr><td colspan="9"><div class="empty-state" style="padding:18px;">Tidak ada rincian item batch pada faktur ini.</div></td></tr>';

  const bodyHtml =
    '<div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px 16px;margin-bottom:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;">' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">No. Faktur</div><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">' + escapeHtml(p.invoice_no || '-') + '</strong>' + (p.is_stok_awal ? ' <span class="badge badge-info" style="font-size:10px;">Stok Awal</span>' : '') + '</div>' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">Tanggal Pengadaan</div><strong>' + formatDate(p.created_at) + '</strong></div>' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">Supplier</div><strong>' + escapeHtml(p.supplier_name || '-') + '</strong></div>' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">Petani / Penangkar</div><strong>' + escapeHtml(p.farmer_name || '-') + '</strong></div>' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">Total Pengadaan</div><strong style="color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(p.total) + '</strong></div>' +
    '<div><div style="font-size:11px;color:var(--text-secondary);">Catatan</div><span style="font-size:12px;">' + escapeHtml(p.notes || '-') + '</span></div>' +
    '</div>' +
    '<div class="table-container">' +
    '<table class="table">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:36px;text-align:center;">No</th>' +
    '<th>Varietas / Produk</th>' +
    '<th>Kode Batch FIFO</th>' +
    '<th style="text-align:right;">Masuk / Sisa</th>' +
    '<th style="text-align:right;">Harga Beli</th>' +
    '<th style="text-align:right;">Biaya Ekstra</th>' +
    '<th style="text-align:right;">HPP Final</th>' +
    '<th>Panen &amp; Exp</th>' +
    '<th style="text-align:center;">Status QC</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '</table>' +
    '</div>' +
    (p.can_delete === false
      ? '<div style="margin-top:12px;padding:10px 14px;border-radius:var(--radius-xs);background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);font-size:12px;color:var(--text-main);">🔒 <strong>Faktur Terkunci:</strong> ' + escapeHtml(p.locked_reason || 'Sebagian batch sudah terpakai sehingga faktur tidak dapat dihapus.') + '</div>'
      : '');

  const footerHtml = '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>';
  openModal('Detail Faktur Pengadaan: ' + (p.invoice_no || '-'), bodyHtml, footerHtml, true);
}

function exportPurchasesExcel() {
  const list = getFilteredPurchases();
  if (list.length === 0) {
    showToast('Tidak ada data riwayat pembelian sesuai filter untuk diekspor.', true);
    return;
  }

  showToast('Menyiapkan file Excel riwayat pengadaan...');
  ensureXlsxLoaded().then(function (XLSX) {
    const wb = XLSX.utils.book_new();

    const summaryRows = [[
      'Tanggal', 'No_Faktur', 'Tipe_Pengadaan', 'Supplier', 'Petani_Penangkar',
      'Jumlah_Batch', 'Total_Pengadaan', 'Status_Kunci', 'Catatan'
    ]];
    const itemRows = [[
      'Tanggal', 'No_Faktur', 'Supplier', 'Petani_Penangkar', 'Kode_Batch',
      'Nama_Produk', 'Satuan', 'Qty_Masuk', 'Sisa_Stok', 'Harga_Beli',
      'Biaya_Ekstra', 'HPP_Final', 'Subtotal', 'Tgl_Panen', 'Tgl_Kedaluwarsa', 'Status_QC'
    ]];

    list.forEach(function (p) {
      const items = Array.isArray(p.items) ? p.items : [];
      const ymd = getPurchaseLocalDateYMD(p.created_at);
      summaryRows.push([
        ymd,
        p.invoice_no || '',
        p.is_stok_awal ? 'Stok Awal' : 'Pengadaan Reguler',
        p.supplier_name || '',
        p.farmer_name || '-',
        items.length,
        Number(p.total || 0),
        p.can_delete !== false ? 'Dapat Dihapus' : 'Terkunci (Terpakai)',
        p.notes || ''
      ]);

      items.forEach(function (it) {
        itemRows.push([
          ymd,
          p.invoice_no || '',
          p.supplier_name || '',
          p.farmer_name || '-',
          it.batch_code || '',
          it.product_name || '',
          it.unit || 'pcs',
          Number(it.qty_in || 0),
          Number(it.qty_remaining || 0),
          Number(it.buy_price || 0),
          Number(it.additional_cost || 0),
          Number(it.cost_per_unit || 0),
          Number(it.subtotal || 0),
          it.production_date || '',
          it.expiry_date || '',
          it.qc_status || 'APPROVED'
        ]);
      });
    });

    const wsSum = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSum['!cols'] = [
      { wch: 13 }, { wch: 18 }, { wch: 18 }, { wch: 24 },
      { wch: 24 }, { wch: 13 }, { wch: 18 }, { wch: 20 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSum, 'Ringkasan_Faktur');

    const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
    wsItems['!cols'] = [
      { wch: 13 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
      { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 15 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Rincian_Item_Batch');

    const dateStr = getPurchaseLocalDateYMD(new Date().toISOString());
    const fileName = 'riwayat_pembelian_' + dateStr + '.xlsx';
    XLSX.writeFile(wb, fileName);
    showToast('Riwayat pembelian berhasil diekspor ke ' + fileName + '.');
  }).catch(function (err) {
    showToast('Gagal mengekspor Excel: ' + (err.message || err), true);
  });
}

function renderPembelian(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cachedPurchases = getCachedData('purchases');
  const cachedSuppliers = getCachedData('suppliers');
  const cachedFarmers = getCachedData('farmers');

  if (!forceRefresh && cachedPurchases) {
    if (cachedSuppliers) SUPPLIERS_CACHE = cachedSuppliers;
    if (cachedFarmers) FARMERS_CACHE = cachedFarmers;
    drawPembelianUI(cachedPurchases);
    if (isCacheValid('purchases') && isCacheValid('suppliers') && isCacheValid('farmers')) {
      return;
    }
  } else if (!cachedPurchases) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat riwayat pengadaan...</div></div>';
  }

  const cachedProds = getCachedData('products');

  Promise.all([
    api('getPurchases', TOKEN),
    (isCacheValid('suppliers') && cachedSuppliers) ? Promise.resolve(cachedSuppliers) : api('getSuppliers', TOKEN),
    (isCacheValid('products') && cachedProds) ? Promise.resolve(cachedProds) : api('getProducts', TOKEN),
    (isCacheValid('farmers') && cachedFarmers) ? Promise.resolve(cachedFarmers) : api('getFarmers', TOKEN)
  ]).then(function (results) {
    const purchases = Array.isArray(results[0]) ? results[0] : [];
    SUPPLIERS_CACHE = Array.isArray(results[1]) ? results[1] : [];
    const rawProducts = Array.isArray(results[2]) ? results[2] : [];
    PRODUCTS_CACHE = rawProducts.filter(function (p) { return p && p.active; });
    FARMERS_CACHE = Array.isArray(results[3]) ? results[3] : [];

    setCachedData('purchases', purchases);
    setCachedData('suppliers', SUPPLIERS_CACHE);
    setCachedData('products', rawProducts);
    setCachedData('farmers', FARMERS_CACHE);

    drawPembelianUI(purchases);
  }).catch(function (err) {
    if (!cachedPurchases) {
      showToast('Gagal memuat pembelian: ' + (err.message || err), true);
    }
  });
}

function drawPembelianUI(purchases) {
  const content = document.getElementById('content');
  if (!content) return;

  CURRENT_PURCHASES = Array.isArray(purchases) ? purchases : [];
  const filtered = getFilteredPurchases();

  const supplierOptions = Array.from(new Set(CURRENT_PURCHASES.map(function (p) {
    return String(p.supplier_name || '(tidak diketahui)');
  }))).sort().map(function (supName) {
    const sel = PURCHASE_FILTERS.supplier === supName ? ' selected' : '';
    return '<option value="' + escapeHtml(supName) + '"' + sel + '>' + escapeHtml(supName) + '</option>';
  }).join('');

  const hasFilter = Boolean(PURCHASE_FILTERS.search || PURCHASE_FILTERS.supplier !== 'all' || PURCHASE_FILTERS.period !== 'all');

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Pembelian &amp; Pengadaan</h1>' +
    '<p class="page-subtitle">Pencatatan faktur masuk dari supplier dan mitra penangkar benih.</p>' +
    '</div>' +
    '<div class="page-actions" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'pembelian\')" title="Buka Panduan Pengadaan Benih">📖 Panduan Pengadaan</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="exportPurchasesExcel()" title="Ekspor data riwayat pembelian ke Excel">📥 Export Excel</button>' +
    '<button type="button" class="btn btn-primary" onclick="openPurchaseModal()">+ Pembelian Baru</button>' +
    '</div>' +
    '</div>' +

    '<div class="stat-grid" id="pembelian-kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px;">' +
    buildPurchaseKPICardsHTML(filtered, CURRENT_PURCHASES) +
    '</div>' +

    '<div class="card" style="padding:14px 16px;margin-bottom:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:260px;">' +
    '<input type="text" id="purchase-search-input" value="' + escapeHtml(PURCHASE_FILTERS.search) + '" placeholder="🔍 Cari no. faktur, supplier, petani, produk, atau kode batch..." oninput="onPurchaseFilterChange()" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);flex:1;min-width:220px;max-width:340px;">' +
    '<select id="purchase-filter-supplier" onchange="onPurchaseFilterChange()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<option value="all">Semua Supplier</option>' +
    supplierOptions +
    '</select>' +
    '<select id="purchase-filter-period" onchange="onPurchaseFilterChange()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<option value="all"' + (PURCHASE_FILTERS.period === 'all' ? ' selected' : '') + '>Semua Periode</option>' +
    '<option value="this_month"' + (PURCHASE_FILTERS.period === 'this_month' ? ' selected' : '') + '>Bulan Ini</option>' +
    '<option value="30d"' + (PURCHASE_FILTERS.period === '30d' ? ' selected' : '') + '>30 Hari Terakhir</option>' +
    '<option value="today"' + (PURCHASE_FILTERS.period === 'today' ? ' selected' : '') + '>Hari Ini</option>' +
    '<option value="custom"' + (PURCHASE_FILTERS.period === 'custom' ? ' selected' : '') + '>Pilih Tanggal</option>' +
    '</select>' +
    '<div id="purchase-date-range-wrap" style="display:' + (PURCHASE_FILTERS.period === 'custom' ? 'flex' : 'none') + ';align-items:center;gap:6px;">' +
    '<input type="date" id="purchase-date-from" value="' + escapeHtml(PURCHASE_FILTERS.dateFrom) + '" onchange="onPurchaseFilterChange()" style="padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<span style="font-size:12px;color:var(--text-secondary);">s/d</span>' +
    '<input type="date" id="purchase-date-to" value="' + escapeHtml(PURCHASE_FILTERS.dateTo) + '" onchange="onPurchaseFilterChange()" style="padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '</div>' +
    '<button type="button" id="purchase-reset-btn" class="btn btn-secondary btn-sm" onclick="resetPurchaseFilters()" style="display:' + (hasFilter ? 'inline-flex' : 'none') + ';">Reset</button>' +
    '</div>' +
    '<span id="pembelian-count-badge" class="badge badge-neutral" style="font-size:11.5px;padding:6px 10px;">Menampilkan ' + filtered.length + ' dari ' + CURRENT_PURCHASES.length + ' faktur</span>' +
    '</div>' +
    '</div>' +

    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Tanggal</th>' +
    '<th>No. Faktur &amp; Rincian Item</th>' +
    '<th>Supplier &amp; Petani / Penangkar</th>' +
    '<th style="text-align:right;">Total Pengadaan</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="pembelian-table-body">' +
    renderPembelianTableRows(filtered) +
    '</tbody>' +
    '</table>' +
    '</div>';
}

function deletePurchaseUI(purchaseId) {
  showConfirmDialog('Hapus Pembelian', 'Hapus faktur pengadaan ini? Seluruh batch stok dan mutasi yang masuk (yang belum terpakai) akan dibersihkan.', function () {
    api('deletePurchase', TOKEN, purchaseId).then(function () {
      invalidateCache('purchases');
      invalidateCache('products');
      invalidateCache('batches');
      invalidateCache('qc_records');
      invalidateCache('mutations');
      invalidateCache('stock_mutations');
      invalidateCache('dashboard');
      showToast('Pembelian berhasil dihapus.');
      renderPembelian(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

function openPurchaseModal() {
  const bodyHtml =
    // Baris 1: Supplier dan Petani Mitra (grid 2 kolom responsif)
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Supplier</label>' +
    '<div class="flex gap-2" style="display:flex;gap:8px;">' +
    '<select id="purchase-supplier" class="flex-1 min-w-0" style="flex:1;min-width:0;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);"></select>' +
    '<button type="button" class="btn btn-secondary btn-sm shrink-0 whitespace-nowrap" onclick="openSupplierModal()" style="flex-shrink:0;white-space:nowrap;">+ Baru</button>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Nama Petani / Penangkar Mitra</label>' +
    '<div class="flex gap-2" style="display:flex;gap:8px;">' +
    '<select id="purchase-farmer" class="flex-1 min-w-0" onchange="onFarmerSelectedChange(this.value)" style="flex:1;min-width:0;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);"></select>' +
    '<button type="button" class="btn btn-secondary btn-sm shrink-0 whitespace-nowrap" onclick="openFarmerModal()" style="flex-shrink:0;white-space:nowrap;">+ Baru</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    // Baris 2: No. Faktur dan Filter Jenis Produk (grid 2 kolom responsif)
    '<div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px;">' +
    '<div>' +
    '<label class="field-label">No. Faktur / Surat Jalan</label>' +
    '<div class="input-wrapper w-full">' +
    '<input type="text" id="purchase-invoice-no" class="w-full" placeholder="Contoh: INV-SUP-01" style="padding-left:14px;width:100%;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Filter Jenis Produk</label>' +
    '<div class="input-wrapper w-full">' +
    '<select id="purchase-filter-type" class="w-full" onchange="filterPurchaseProductOptions(this.value)" style="padding-left:14px;width:100%;">' +
    '<option value="all">Semua Produk</option>' +
    '<option value="mentah">🌾 Bahan Baku Curah (Gram)</option>' +
    '<option value="jadi">📦 Barang Jadi Kemasan (Pcs)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
    '<label class="field-label" style="margin-bottom:0;">Daftar Item Pembelian &amp; Perhitungan HPP (Landed Cost)</label>' +
    '<span style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-calculator" style="margin-right:4px;"></i>Rumus: <strong>HPP Final = Harga Beli + Biaya Tambahan/Pcs</strong></span>' +
    '</div>' +
    '<div class="w-full overflow-x-auto border border-stone-200 rounded-xl purchase-items-wrapper" style="border:1px solid #e7e5e4;border-radius:12px;overflow-x:auto;background:var(--surface,#fff);margin-bottom:10px;">' +
    '<table class="w-full min-w-[1050px] purchase-items-table border-collapse" style="width:100%;min-width:1050px;border-collapse:collapse;">' +
    '<thead>' +
    '<tr class="purchase-grid-header" style="background-color:#F8FAFC;">' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left pl-4" style="background-color:#F8FAFC;color:#44403c;padding:10px 12px 10px 16px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Nama Produk</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left min-w-[210px]" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;min-width:210px;white-space:nowrap;">No. Batch / Lot</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-center" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:center;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Qty</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Harga Beli (Rp)</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Biaya Ekstra/Pcs (Rp)</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">HPP Final/Pcs (Rp)</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Tgl Produksi</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-left pr-4" style="background-color:#F8FAFC;color:#44403c;padding:10px 8px;text-align:left;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Tgl Kadaluarsa</th>' +
    '<th class="bg-slate-50 text-stone-700 font-bold text-xs uppercase px-3 py-2.5 text-center" style="background-color:#F8FAFC;color:#44403c;padding:10px 16px 10px 8px;text-align:center;border-bottom:1px solid #e7e5e4;white-space:nowrap;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="pur-items"></tbody>' +
    '</table>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:10px;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addPurchaseItemRow()">+ Tambah Baris Barang</button>' +
    '<div style="display:flex;gap:18px;align-items:center;">' +
    '<div style="font-size:12px;color:var(--text-secondary);">Total Item Qty: <strong id="pur-total-qty" style="color:var(--text-main);font-size:13px;">0</strong></div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--primary,#1b5e20);">Total Pengadaan: <span id="pur-grand-total" style="font-size:15px;color:var(--primary,#1b5e20);">Rp 0</span></div>' +
    '</div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" onclick="submitPurchase()">Simpan Faktur Pembelian</button>';

  openModal('Pembelian / Pengadaan Baru', bodyHtml, footerHtml, true);
  const dialog = document.getElementById('modal-dialog');
  if (dialog) {
    dialog.classList.add('modal-dialog-xl');
  }
  renderSupplierOptions();
  renderFarmerOptions();
  addPurchaseItemRow();

  // Pre-load batches agar urutan batch otomatis per produk selalu akurat sesuai database
  api('getStockBatches', TOKEN).then(function (batches) {
    if (Array.isArray(batches)) {
      setCachedData('batches', batches);
      _STOK_BATCHES = batches;
      renumberPurchaseBatchSequences();
    }
  }).catch(function (e) {
    console.warn('Preload batches untuk sequence pembelian:', e);
  });

  const farmerEl = document.getElementById('purchase-farmer') || document.getElementById('pur-farmer');
  if (farmerEl) {
    farmerEl.addEventListener('change', function () {
      onFarmerSelectedChange(this.value);
    });
  }
}

function isCurahInventoryProduct(p) {
  if (!p) return false;
  const invType = String(p.inventory_type || '').trim().toLowerCase();
  const unit = String(p.unit || '').trim().toLowerCase();
  if (p.inventory_type === 'curah' || p.inventory_type === 'Curah Mentah') return true;
  if (invType === 'curah' || invType === 'curah mentah' || invType === 'curah_mentah') return true;
  if (unit === 'gr' || unit === 'gram' || unit === 'g' || isRawProduct(p.unit)) return true;
  return false;
}

function formatCleanProductName(name) {
  if (!name) return '';
  return String(name)
    .replace(/\s*\((kemasan|curah)\)\s*/gi, ' ')
    .replace(/\s*\[(kemasan|curah)\]\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatProductClaimLabel(p) {
  if (!p) return '';
  const cleanName = formatCleanProductName(p.name);
  let varText = '';
  if (p.variant) {
    const vTrim = String(p.variant).trim();
    if (!/^(kemasan|curah)$/i.test(vTrim) && !cleanName.toLowerCase().includes(vTrim.toLowerCase())) {
      varText = ' - ' + vTrim;
    }
  }
  return cleanName + varText;
}

function buildProductOptionsHTML(category, selectedId) {
  let list = (PRODUCTS_CACHE && PRODUCTS_CACHE.length > 0)
    ? PRODUCTS_CACHE
    : (DATA_CACHE && DATA_CACHE.products && Array.isArray(DATA_CACHE.products.data) ? DATA_CACHE.products.data : []);
  const filtered = list.filter(function (p) {
    if (!p || !p.active) return false;
    const isRaw = isCurahInventoryProduct(p);
    if (category === 'mentah') return isRaw;
    if (category === 'jadi') return !isRaw;
    return true;
  });

  if (filtered.length === 0) return '<option value="">-- Tidak ada produk --</option>';

  return filtered.map(function (p) {
    const isRaw = isCurahInventoryProduct(p);
    const icon = isRaw ? '🌾 ' : '📦 ';
    const cleanName = formatCleanProductName(p.name);
    let varTag = '';
    if (p.variant) {
      const vTrim = String(p.variant).trim();
      if (!/^(kemasan|curah)$/i.test(vTrim) && !cleanName.toLowerCase().includes(vTrim.toLowerCase())) {
        varTag = ' [' + escapeHtml(vTrim) + ']';
      }
    }
    const isSel = (p.id === selectedId) ? ' selected' : '';
    const stockTxt = p.stock !== undefined ? (' — Sisa: ' + p.stock + ' ' + escapeHtml(p.unit || '')) : (' (' + escapeHtml(p.unit || '') + ')');
    return '<option value="' + p.id + '"' + isSel + ' data-stock="' + (p.stock || 0) + '">' + icon + escapeHtml(cleanName) + varTag + stockTxt + '</option>';
  }).join('');
}

function onPurchaseRowProductChange(row) {
  if (!row) return;
  const prodSelect = row.querySelector('.pi-product, .pur-item-product');
  const priceInput = row.querySelector('.pi-price, .pur-item-buy-price');
  const extraInput = row.querySelector('.pur-item-cost-extra, .pi-cost-extra');
  if (!prodSelect || !extraInput) return;

  const prodId = prodSelect.value;
  const allProds = (DATA_CACHE.products && DATA_CACHE.products.data) || PRODUCTS_CACHE || [];
  const prodObj = allProds.find(function (p) { return p && String(p.id) === String(prodId); });
  const isCurah = isCurahInventoryProduct(prodObj);

  if (isCurah) {
    extraInput.value = 0;
    extraInput.disabled = true;
    extraInput.placeholder = 'Khusus Kemas Mandiri';
    extraInput.title = 'Produk curah: Biaya kemasan/ekstra dibebankan nanti saat Kemas Mandiri.';
    extraInput.style.backgroundColor = 'var(--surface-muted, #f1f5f9)';
    extraInput.style.color = 'var(--text-secondary, #64748b)';
    extraInput.style.cursor = 'not-allowed';
  } else {
    extraInput.disabled = false;
    extraInput.placeholder = '0';
    extraInput.title = 'Biaya tambahan/kemasan/ekstra landed cost per pcs';
    extraInput.style.backgroundColor = '';
    extraInput.style.color = '';
    extraInput.style.cursor = '';
  }

  // Otomatis ambil harga beli per gram dari master produk curah atau batch sebelumnya
  if (isCurah && priceInput && (!priceInput.value || Number(priceInput.value) === 0 || priceInput.dataset.manual !== 'true')) {
    let curahPrice = 0;
    if (prodObj) {
      // 1. Cek dari batch aktif / riwayat batch produk curah ini
      const batches = prodObj.batches || (DATA_CACHE.batches && DATA_CACHE.batches.data ? DATA_CACHE.batches.data.filter(function (b) { return b && String(b.product_id) === String(prodObj.id); }) : []);
      if (Array.isArray(batches) && batches.length > 0) {
        for (let i = batches.length - 1; i >= 0; i--) {
          const b = batches[i];
          const bPrice = Number(b.buy_price || b.cost_per_unit || 0);
          if (bPrice > 0) {
            curahPrice = bPrice;
            break;
          }
        }
      }
      // 2. Cek dari tingkat harga (price tiers)
      if (curahPrice === 0 && Array.isArray(prodObj.priceTiers) && prodObj.priceTiers.length > 0) {
        const tier = prodObj.priceTiers.find(function (t) { return t && Number(t.price) > 0; });
        if (tier) curahPrice = Number(tier.price);
      }
      // 3. Fallback dari properti buy_price / cost / price produk
      if (curahPrice === 0 && Number(prodObj.buy_price || prodObj.cost || prodObj.price || 0) > 0) {
        curahPrice = Number(prodObj.buy_price || prodObj.cost || prodObj.price);
      }
    }

    if (curahPrice > 0) {
      priceInput.value = curahPrice;
      flashInputHighlight(priceInput);
    }
  }

  autoFillPurchaseRowBatch(row, false);
  calculatePurchaseRowHPP(row);
}

function calculatePurchaseRowHPP(targetEl) {
  if (!targetEl) return;
  const row = targetEl.closest ? targetEl.closest('.price-tier-row') : targetEl;
  if (!row) return;

  const prodSelect = row.querySelector('.pi-product, .pur-item-product');
  const priceInput = row.querySelector('.pi-price, .pur-item-buy-price');
  const extraInput = row.querySelector('.pur-item-cost-extra, .pi-cost-extra');
  const hppDisplay = row.querySelector('.pur-item-hpp-display');

  const prodId = prodSelect ? prodSelect.value : '';
  const allProds = (DATA_CACHE.products && DATA_CACHE.products.data) || PRODUCTS_CACHE || [];
  const prodObj = allProds.find(function (p) { return p && String(p.id) === String(prodId); });
  const isCurah = isCurahInventoryProduct(prodObj);

  const buyPrice = parseFloat(priceInput ? priceInput.value : 0) || 0;
  let extraCost = parseFloat(extraInput ? extraInput.value : 0) || 0;

  if (isCurah) {
    extraCost = 0;
    if (extraInput) {
      extraInput.value = 0;
      extraInput.disabled = true;
      extraInput.placeholder = 'Khusus Kemas Mandiri';
    }
  }

  // Nilai HPP baris curah otomatis 100% sama dengan Harga Beli
  const hppFinal = isCurah ? buyPrice : Math.max(0, buyPrice + extraCost);

  if (hppDisplay) {
    const formatted = formatRupiah(hppFinal);
    if (hppDisplay.tagName === 'INPUT') {
      hppDisplay.value = formatted;
    } else {
      hppDisplay.textContent = formatted;
    }
    hppDisplay.dataset.value = hppFinal;
  }

  updatePurchaseModalTotal();
}

function updatePurchaseModalTotal() {
  const grandTotalEl = document.getElementById('pur-grand-total');
  const totalQtyEl = document.getElementById('pur-total-qty');
  if (!grandTotalEl && !totalQtyEl) return;

  let grandTotal = 0;
  let totalQty = 0;
  const rows = document.querySelectorAll('#pur-items .price-tier-row');
  rows.forEach(function (r) {
    const qty = parseFloat(r.querySelector('.pi-qty') ? r.querySelector('.pi-qty').value : 0) || 0;
    const price = parseFloat(r.querySelector('.pi-price, .pur-item-buy-price') ? r.querySelector('.pi-price, .pur-item-buy-price').value : 0) || 0;
    const extraInput = r.querySelector('.pur-item-cost-extra, .pi-cost-extra');
    const extra = (extraInput && !extraInput.disabled) ? (parseFloat(extraInput.value) || 0) : 0;
    const hpp = price + extra;
    grandTotal += (qty * hpp);
    totalQty += qty;
  });

  if (grandTotalEl) grandTotalEl.textContent = formatRupiah(grandTotal);
  if (totalQtyEl) totalQtyEl.textContent = totalQty.toLocaleString('id-ID');
}

function addPurchaseItemRow() {
  const catFilterEl = document.getElementById('purchase-filter-type') || document.getElementById('pur-cat-filter');
  const catFilter = catFilterEl ? catFilterEl.value : 'all';
  const container = document.getElementById('pur-items');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const row = document.createElement('tr');
  row.className = 'price-tier-row pur-item-row';

  row.innerHTML =
    '<td class="pl-4">' +
    '<select class="pi-product pur-item-product" onchange="onPurchaseRowProductChange(this.closest(\'.price-tier-row\'))" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;font-size:12px;font-weight:600;">' +
    buildProductOptionsHTML(catFilter) +
    '</select>' +
    '</td>' +
    '<td class="min-w-[210px]" style="min-width:210px;">' +
    '<div class="flex items-center gap-1 min-w-[210px]" style="display:flex;align-items:center;gap:4px;min-width:210px;flex-wrap:nowrap;">' +
    '<input type="text" class="pi-lot pur-item-lot font-mono text-xs w-44 min-w-[175px]" oninput="this.dataset.manual=\'true\'" placeholder="Auto / Manual" style="flex:1;min-width:175px;width:100%;padding:6px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-family:\'JetBrains Mono\',monospace;">' +
    '<button type="button" class="btn-regen-batch shrink-0" title="Generate ulang kode acak" onclick="regenerateBatchRow(this)" style="padding:4px 6px;border:1px solid var(--border);background:#fff;border-radius:var(--radius-xs);cursor:pointer;font-size:12px;flex-shrink:0;">🔄</button>' +
    '</div>' +
    '</td>' +
    '<td style="text-align:center;">' +
    '<input type="number" class="pi-qty pur-item-qty" placeholder="Qty" min="1" value="1" oninput="calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 4px;font-size:12px;text-align:center;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</td>' +
    '<td>' +
    '<input type="number" class="pi-price pur-item-buy-price" placeholder="0" min="0" oninput="this.dataset.manual=\'true\';calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:right;">' +
    '</td>' +
    '<td>' +
    '<input type="number" class="pur-item-cost-extra pi-cost-extra" placeholder="0" min="0" value="0" oninput="calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:right;">' +
    '</td>' +
    '<td>' +
    '<input type="text" class="pur-item-hpp-display" readonly value="Rp 0" data-value="0" title="HPP Final / Pcs = Harga Beli + Biaya Ekstra" style="width:100%;padding:6px 6px;font-size:12px;font-weight:700;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-xs);cursor:default;text-align:right;">' +
    '</td>' +
    '<td>' +
    '<input type="date" class="pi-prod-date pur-item-prod-date" value="' + todayStr + '" onchange="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" oninput="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" style="width:100%;padding:6px 4px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</td>' +
    '<td class="pr-4">' +
    '<input type="date" class="pi-expiry pur-item-expiry" onchange="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" oninput="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" style="width:100%;padding:6px 4px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</td>' +
    '<td style="text-align:center;">' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.closest(\'.price-tier-row\').remove();renumberPurchaseBatchSequences();updatePurchaseModalTotal();" title="Hapus baris" style="padding:4px 8px;font-size:12px;line-height:1;">&times;</button>' +
    '</td>';

  container.appendChild(row);
  onPurchaseRowProductChange(row);
}

function cleanFarmerInitialClient(farmerName) {
  if (!farmerName) return 'ID01';
  const str = String(farmerName).trim().toUpperCase();
  if (/^[A-Z]{2,4}\d{2}$/.test(str)) {
    return str;
  }
  let clean = String(farmerName).trim().replace(/^(?:(?:pak|bpk|ibu|bu|bapak|bli|mas|mbak|i|ni)\.?\s+)+/gi, '').trim();
  if (!clean) clean = String(farmerName).trim();

  const letters = clean.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!letters) return 'ID01';

  const consonants = letters.replace(/[AEIOU]/g, '');
  let code = '';
  if (consonants.length >= 2) {
    code = consonants.slice(0, 2);
  } else if (consonants.length === 1 && letters.length >= 2) {
    code = consonants[0] + letters.replace(consonants[0], '').slice(0, 1);
  } else {
    code = letters.slice(0, 2).padEnd(2, 'X');
  }
  return code + '01';
}

function getNextBatchSequenceForProduct(productId, productTerm, currentRow) {
  let maxSeq = 0;
  let countExisting = 0;

  // 1. Periksa riwayat batch yang tersimpan di cache (_STOK_BATCHES atau DATA_CACHE.batches)
  const allBatches = (Array.isArray(_STOK_BATCHES) && _STOK_BATCHES.length > 0)
    ? _STOK_BATCHES
    : ((DATA_CACHE && DATA_CACHE.batches && Array.isArray(DATA_CACHE.batches.data)) ? DATA_CACHE.batches.data : []);

  const pCodeClean = cleanProductCodeForBatch(productTerm || '');

  allBatches.forEach(function (b) {
    if (!b) return;
    const isSameProduct = (productId && String(b.product_id) === String(productId));
    const bCode = String(b.batch_code || b.batch_no || '');
    const isMatchingCode = pCodeClean && bCode.toUpperCase().includes('BATCH-' + pCodeClean);

    if (isSameProduct || isMatchingCode) {
      countExisting++;
      // Ekstrak angka urut di paling akhir string (misal: BATCH-ARG-2805-001 -> 1)
      const match = bCode.match(/-(\d{1,4})$/);
      if (match) {
        const seqNum = parseInt(match[1], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
          maxSeq = seqNum;
        }
      }
    }
  });

  let nextSeq = Math.max(maxSeq, countExisting);

  // 2. Tambahkan hitungan jika ada baris barang sebelumnya di tabel pembelian saat ini dengan produk yang sama
  if (currentRow && currentRow.parentNode) {
    const allRows = Array.from(currentRow.parentNode.querySelectorAll('.price-tier-row'));
    const curIdx = allRows.indexOf(currentRow);
    for (let i = 0; i < curIdx; i++) {
      const prevRow = allRows[i];
      const prevProdSelect = prevRow.querySelector('.pi-product, .pur-item-product');
      if (prevProdSelect) {
        const pVal = String(prevProdSelect.value || '');
        const pTxt = prevProdSelect.selectedIndex >= 0 ? prevProdSelect.options[prevProdSelect.selectedIndex].text : '';
        if ((productId && pVal === String(productId)) || (productTerm && pTxt.toLowerCase().includes(String(productTerm).toLowerCase()))) {
          nextSeq++;
        }
      }
    }
  }

  return nextSeq + 1;
}
window.getNextBatchSequenceForProduct = getNextBatchSequenceForProduct;

function flashInputHighlight(inputEl) {
  if (!inputEl) return;
  inputEl.style.transition = 'none';
  inputEl.style.borderColor = 'var(--success, #2e7d32)';
  inputEl.style.backgroundColor = 'var(--success-bg, #edf7ed)';
  setTimeout(function () {
    inputEl.style.transition = 'all 0.5s ease';
    inputEl.style.borderColor = 'var(--border, #E2E8F0)';
    inputEl.style.backgroundColor = '';
  }, 350);
}

function getPurchaseRowIndex(row) {
  if (!row || !row.parentNode) return 1;
  const rows = Array.from(row.parentNode.querySelectorAll('.price-tier-row'));
  const idx = rows.indexOf(row);
  return idx >= 0 ? idx + 1 : 1;
}

function renumberPurchaseBatchSequences() {
  document.querySelectorAll('#pur-items .price-tier-row').forEach(function (row) {
    autoFillPurchaseRowBatch(row, false);
  });
}

function generateClientBatchCode(productOrFarmer, prodDateOrExpiry, itemIndex, extraProduct, options) {
  let template = (APP_SETTINGS && (APP_SETTINGS['batch_format_template'] || APP_SETTINGS['batch_format'])) || 'BATCH-{CODE}-{YYMM}-{SEQ}';

  // Jika masih memakai template lama dengan {FARMER}, otomatis alihkan ke format standar {CODE}
  if (template === 'BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}' || (template.includes('{FARMER}') && !template.includes('{CODE}'))) {
    template = 'BATCH-{CODE}-{YYMM}-{SEQ}';
  }

  // 1. Ekstrak Kode Produk {CODE}
  let productCode = '';
  const allProds = (DATA_CACHE && DATA_CACHE.products && DATA_CACHE.products.data) || PRODUCTS_CACHE || [];
  const candidate = extraProduct || productOrFarmer;

  let foundProd = allProds.find(function (p) {
    return p && (String(p.id) === String(candidate) || String(p.name).toLowerCase() === String(candidate).toLowerCase());
  });
  if (!foundProd && productOrFarmer) {
    foundProd = allProds.find(function (p) {
      return p && (String(p.id) === String(productOrFarmer) || String(p.name).toLowerCase() === String(productOrFarmer).toLowerCase());
    });
  }

  if (foundProd) {
    productCode = cleanProductCodeForBatch(foundProd.code || foundProd.name);
  } else if (candidate && typeof candidate === 'string') {
    productCode = cleanProductCodeForBatch(candidate);
  } else if (productOrFarmer && typeof productOrFarmer === 'string') {
    productCode = cleanProductCodeForBatch(productOrFarmer);
  }
  if (!productCode || productCode === 'BENIH') {
    productCode = 'BENIH';
  }

  // 2. Token {YYMM} dari Tanggal Produksi benih (Tahun-Bulan produksi riil, e.g. 2605, 2608, 2611)
  const yymm = typeof extractYYMMClient === 'function' ? extractYYMMClient(prodDateOrExpiry) : '2611';

  // Opsi token kedaluwarsa {EXP_YYMM} jika ada template yang membutuhkan
  const expDateVal = (options && options.expiryDate) ? options.expiryDate : null;
  const expYymm = expDateVal && typeof extractYYMMClient === 'function' ? extractYYMMClient(expDateVal) : yymm;

  // 3. Token {SEQ} (3-digit urut dinamis: 001, 002, 003, dst)
  const seqNum = Number(itemIndex) || 1;
  const seq3 = String(seqNum).padStart(3, '0');
  const seq2 = String(seqNum).padStart(2, '0');

  // 4. Token pelengkap backward-compatibility
  const rand4 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2, 4);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const ymd = yy + mm + dd;

  let code = template
    .replace(/\{CODE\}/g, productCode)
    .replace(/\{PROD\}/g, productCode)
    .replace(/\{FARMER\}/g, productCode)
    .replace(/\{YYMM\}/g, yymm)
    .replace(/\{PROD_YYMM\}/g, yymm)
    .replace(/\{EXP_YYMM\}/g, expYymm)
    .replace(/\{SEQ\}/g, seq3)
    .replace(/\{SEQ2\}/g, seq2)
    .replace(/\{RAND4\}/g, rand4)
    .replace(/\{PREFIX\}/g, 'BATCH')
    .replace(/\{YMD\}/g, ymd)
    .replace(/\{LOT\}/g, productCode + '-' + seq3);

  code = code.replace(/[-_]{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '');
  return code;
}

function generateBatchCodeClient(farmerName, expiryDate, productId, customPrefix) {
  return generateClientBatchCode(productId || farmerName, expiryDate, 1);
}

function autoFillPurchaseRowBatch(row, forceNewRandom) {
  if (!row) return;
  const lotInput = row.querySelector('.pi-lot');
  if (!lotInput) return;
  if (!forceNewRandom && lotInput.dataset.manual === 'true' && lotInput.value.trim() !== '') {
    return;
  }

  const prodSelect = row.querySelector('.pi-product, .pur-item-product');
  let productTerm = '';
  let productId = '';
  if (prodSelect) {
    productId = prodSelect.value;
    const allProds = (DATA_CACHE && DATA_CACHE.products && DATA_CACHE.products.data) || PRODUCTS_CACHE || [];
    const prodObj = allProds.find(function (p) { return p && String(p.id) === String(productId); });
    if (prodObj) {
      productTerm = prodObj.code || prodObj.name;
    } else if (prodSelect.selectedIndex >= 0) {
      productTerm = prodSelect.options[prodSelect.selectedIndex].text;
    }
  }

  // Gunakan Tanggal Produksi sebagai sumber YYMM kode batch
  const prodDateInput = row.querySelector('.pi-prod-date, .pur-item-prod-date');
  const prodDate = prodDateInput ? prodDateInput.value.trim() : '';
  const expiry = (row.querySelector('.pi-expiry') ? row.querySelector('.pi-expiry').value : '').trim();

  // Hitung nomor urut berikutnya secara dinamis berdasarkan database & riwayat batch produk ini
  const seqNum = getNextBatchSequenceForProduct(productId, productTerm, row);

  const batchCode = generateClientBatchCode(productTerm, prodDate, seqNum, productId, { expiryDate: expiry });
  lotInput.value = batchCode;
  flashInputHighlight(lotInput);

  if (forceNewRandom) {
    delete lotInput.dataset.manual;
  }
}

function regenerateBatchRow(btn) {
  const row = btn.closest('.price-tier-row');
  if (row) {
    autoFillPurchaseRowBatch(row, true);
    showToast('Kode batch berhasil di-generate ulang.');
  }
}

function renderTraceabilityPanelHTML(prefix) {
  const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
    return '<option value="' + p.id + '">' + escapeHtml(p.name) + ' (' + escapeHtml(p.unit || '') + ')</option>';
  }).join('');

  return (
    '<div class="traceability-panel">' +
    '<div class="traceability-header">' +
    '<div class="traceability-title">🔍 Pelacakan Cepat Toples Induk Berdasarkan Exp (Traceability)</div>' +
    '<small style="color:var(--text-secondary);">Identifikasi toples asal bahan curah &amp; petani penangkar dari kode bulan/tahun exp (MM/YY).</small>' +
    '</div>' +
    '<div class="traceability-controls">' +
    '<div>' +
    '<label class="field-label" style="font-size:11px;">Filter Produk (Opsional)</label>' +
    '<select id="trace-prod-' + prefix + '" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;width:100%;font-size:13px;">' +
    '<option value="">-- Semua Produk --</option>' +
    prodOptions +
    '</select>' +
    '</div>' +
    '<div>' +
    '<label class="field-label" style="font-size:11px;">Bulan/Tahun Exp (MM/YY atau YYYY-MM)</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="trace-exp-' + prefix + '" placeholder="Contoh: 12/27 atau 2712" onkeydown="if(event.key===\'Enter\') runTraceabilitySearch(\'' + prefix + '\')" style="padding-left:14px;font-size:13px;font-family:\'JetBrains Mono\',monospace;">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;">' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="runTraceabilitySearch(\'' + prefix + '\')">🔎 Lacak Batch</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetTraceabilitySearch(\'' + prefix + '\')">Reset</button>' +
    '</div>' +
    '</div>' +
    '<div id="trace-results-' + prefix + '"></div>' +
    '</div>'
  );
}

function runTraceabilitySearch(prefix) {
  const prodSelect = document.getElementById('trace-prod-' + prefix);
  const expInput = document.getElementById('trace-exp-' + prefix);
  const resultsContainer = document.getElementById('trace-results-' + prefix);
  if (!resultsContainer) return;

  const prodId = prodSelect ? prodSelect.value.trim() : '';
  const expQuery = expInput ? expInput.value.trim() : '';

  if (!prodId && !expQuery) {
    showToast('Masukkan minimal pilihan produk atau bulan/tahun kadaluarsa (MM/YY).', true);
    return;
  }

  resultsContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary);">⏳ Melacak toples induk &amp; persediaan batch...</div>';

  api('searchBatchTraceability', TOKEN, prodId, expQuery).then(function (batches) {
    const list = Array.isArray(batches) ? batches : [];
    if (list.length === 0) {
      resultsContainer.innerHTML =
        '<div style="padding:16px;text-align:center;background:var(--surface-muted);border-radius:var(--radius-xs);color:var(--text-muted);">' +
        'Tidak ditemukan toples atau batch yang sesuai dengan filter ("' + escapeHtml(expQuery || 'Semua Exp') + '").' +
        '</div>';
      return;
    }

    let cardsHtml = '<div class="traceability-grid">';
    list.forEach(function (b) {
      const typeBadge = b.is_raw
        ? '<span class="badge badge-warning" style="font-size:10px;">Toples Curah (Bahan Baku)</span>'
        : '<span class="badge badge-success" style="font-size:10px;">Kemasan Sachet (Siap Jual)</span>';

      const expFormatted = b.expiry_date ? formatDate(b.expiry_date) : '-';
      const inDateFormatted = b.received_at ? formatDate(b.received_at) : (b.production_date ? formatDate(b.production_date) : '-');

      const actionBtn = (prefix === 'pj')
        ? '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="createComplaintWithBatch(\'' + escapeHtml(b.batch_id) + '\', \'' + escapeHtml(b.product_id) + '\', \'' + escapeHtml(b.product_name) + '\')">➕ Tiket Komplain</button>'
        : '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="showBatchDetail(\'' + escapeHtml(b.product_id) + '\', \'' + escapeHtml(b.product_name) + '\')">Audit Batch</button>';

      cardsHtml +=
        '<div class="batch-card">' +
        '<div class="batch-card-header">' +
        '<span class="batch-card-id">' + escapeHtml(b.batch_id) + '</span>' +
        typeBadge +
        '</div>' +
        '<div class="batch-card-body">' +
        '<div><strong>🌾 ' + escapeHtml(b.product_name) + '</strong></div>' +
        '<div>👨‍🌾 Penangkar / Petani: <strong style="color:var(--primary);">' + escapeHtml(b.farmer_name) + '</strong></div>' +
        '<div>📅 Tgl Masuk: ' + inDateFormatted + '</div>' +
        '<div>⏳ Tgl Kedaluwarsa: <strong style="color:var(--danger);">' + expFormatted + '</strong></div>' +
        '<div>📦 Sisa Stok Fisik: <strong style="color:var(--primary);font-size:13px;">' + b.qty_remaining + ' ' + escapeHtml(b.unit) + '</strong> (dari ' + b.qty_in + ' ' + escapeHtml(b.unit) + ')</div>' +
        '</div>' +
        '<div class="batch-card-footer">' +
        '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="navigator.clipboard.writeText(\'' + escapeHtml(b.batch_id) + '\');showToast(\'Kode batch disalin: ' + escapeHtml(b.batch_id) + '\');">📋 Salin</button>' +
        actionBtn +
        '</div>' +
        '</div>';
    });
    cardsHtml += '</div>';

    resultsContainer.innerHTML = cardsHtml;
  }).catch(function (err) {
    resultsContainer.innerHTML = '<div style="color:var(--danger);padding:12px;">Gagal melacak batch: ' + (err.message || err) + '</div>';
  });
}

function resetTraceabilitySearch(prefix) {
  const prodSelect = document.getElementById('trace-prod-' + prefix);
  const expInput = document.getElementById('trace-exp-' + prefix);
  const resultsContainer = document.getElementById('trace-results-' + prefix);
  if (prodSelect) prodSelect.value = '';
  if (expInput) expInput.value = '';
  if (resultsContainer) resultsContainer.innerHTML = '';
}

function createComplaintWithBatch(batchId, prodId, prodName) {
  openClaimModal({
    batch_id: batchId,
    product_id: prodId,
    notes: 'Komplain terkait batch lot: ' + batchId + (prodName ? ' (' + prodName + ')' : '')
  });
}

function filterPurchaseProductOptions(category) {
  document.querySelectorAll('#pur-items .pi-product').forEach(function (select) {
    const val = select.value;
    select.innerHTML = buildProductOptionsHTML(category, val);
    const row = select.closest('.price-tier-row');
    if (row) {
      onPurchaseRowProductChange(row);
    }
  });
}

function renderSupplierOptions(selectedId) {
  const select = document.getElementById('purchase-supplier') || document.getElementById('pur-supplier');
  if (!select) return;
  if (!SUPPLIERS_CACHE || SUPPLIERS_CACHE.length === 0) {
    select.innerHTML = '<option value="">-- Belum ada supplier, klik "+ Baru" --</option>';
    return;
  }
  select.innerHTML = SUPPLIERS_CACHE.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === selectedId ? ' selected' : '') + '>' + escapeHtml(s.name) + '</option>';
  }).join('');
}

function openSupplierModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Supplier Baru</h3>' +
    '<button type="button" class="modal-close-btn" id="sup-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<div class="field-group"><label class="field-label">Nama Supplier</label><div class="input-wrapper"><input type="text" id="sup-name" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Kontak WhatsApp</label><div class="input-wrapper"><input type="text" id="sup-contact" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Alamat</label><div class="input-wrapper"><input type="text" id="sup-address" style="padding-left:14px;"></div></div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="sup-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="sup-save">Simpan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = function () { overlay.remove(); };
  overlay.querySelector('#sup-close').onclick = close;
  overlay.querySelector('#sup-cancel').onclick = close;
  overlay.querySelector('#sup-save').onclick = function () {
    const name = document.getElementById('sup-name').value.trim();
    if (!name) { showToast('Nama supplier wajib diisi.', true); return; }
    api('saveSupplier', TOKEN, {
      name: name,
      contact: document.getElementById('sup-contact').value.trim(),
      address: document.getElementById('sup-address').value.trim()
    }).then(function (res) {
      invalidateCache('suppliers');
      SUPPLIERS_CACHE.push({ id: res.id, name: name });
      renderSupplierOptions(res.id);
      showToast('Supplier ditambahkan.');
      close();
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  };
}

function renderFarmerOptions(selectedId) {
  const select = document.getElementById('purchase-farmer') || document.getElementById('pur-farmer');
  if (!select) return;
  const list = FARMERS_CACHE || [];
  let html = '<option value="">-- Pilih Petani Penangkar --</option>';
  list.forEach(function (f) {
    const isSelected = (selectedId && (String(f.id) === String(selectedId) || String(f.name) === String(selectedId))) ? ' selected' : '';
    const codePart = f.code ? escapeHtml(f.code) : '';
    const addrPart = f.address ? (' - ' + escapeHtml(f.address)) : '';
    const label = escapeHtml(f.name) + (codePart || addrPart ? (' (' + codePart + addrPart + ')') : '');
    html += '<option value="' + escapeHtml(f.id) + '" data-name="' + escapeHtml(f.name) + '" data-code="' + escapeHtml(f.code || '') + '"' + isSelected + '>' + label + '</option>';
  });
  select.innerHTML = html;
}

function openFarmerModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Petani Penangkar Baru</h3>' +
    '<button type="button" class="modal-close-btn" id="far-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<div class="field-group"><label class="field-label">Nama Lengkap Petani *</label><div class="input-wrapper"><input type="text" id="far-name" placeholder="Contoh: Pak Ketut" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Kode Inisial Petani (Opsional)</label><div class="input-wrapper"><input type="text" id="far-code" placeholder="Contoh: KT01 (Otomatis jika kosong)" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;"></div></div>' +
    '<div class="field-group"><label class="field-label">Nomor Kontak WhatsApp</label><div class="input-wrapper"><input type="text" id="far-phone" placeholder="Contoh: 08123456789" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Wilayah / Alamat Asal</label><div class="input-wrapper"><input type="text" id="far-address" placeholder="Contoh: Baturiti, Tabanan" style="padding-left:14px;"></div></div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="far-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="far-save">Simpan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = function () { overlay.remove(); };
  overlay.querySelector('#far-close').onclick = close;
  overlay.querySelector('#far-cancel').onclick = close;
  overlay.querySelector('#far-save').onclick = function () {
    const name = document.getElementById('far-name').value.trim();
    if (!name) { showToast('Nama lengkap petani wajib diisi.', true); return; }
    const code = document.getElementById('far-code').value.trim().toUpperCase();
    const phone = document.getElementById('far-phone').value.trim();
    const address = document.getElementById('far-address').value.trim();

    api('saveFarmer', TOKEN, {
      name: name,
      code: code,
      phone: phone,
      address: address
    }).then(function (res) {
      invalidateCache('farmers');
      const newFarmer = {
        id: res.id,
        name: res.name || name,
        code: res.code || code || cleanFarmerInitialClient(name),
        phone: phone,
        address: address
      };
      if (!Array.isArray(FARMERS_CACHE)) FARMERS_CACHE = [];
      const existingIdx = FARMERS_CACHE.findIndex(function (x) { return x.id === res.id; });
      if (existingIdx >= 0) {
        FARMERS_CACHE[existingIdx] = newFarmer;
      } else {
        FARMERS_CACHE.push(newFarmer);
      }
      renderFarmerOptions(res.id);
      onFarmerSelectedChange(res.id);
      showToast('Petani penangkar berhasil disimpan.');
      close();
    }).catch(function (err) {
      showToast('Gagal: ' + (err.message || err), true);
    });
  };
}

function onFarmerSelectedChange(farmerId) {
  document.querySelectorAll('#pur-items .price-tier-row').forEach(function (row) {
    autoFillPurchaseRowBatch(row, false);
  });
}

function submitPurchase() {
  const supplierEl = document.getElementById('purchase-supplier') || document.getElementById('pur-supplier');
  const supplierId = supplierEl ? supplierEl.value : '';
  const farmerEl = document.getElementById('purchase-farmer') || document.getElementById('pur-farmer');
  let farmerName = '';
  let farmerId = '';
  if (farmerEl) {
    if (farmerEl.tagName === 'SELECT') {
      farmerId = farmerEl.value;
      const opt = farmerEl.options[farmerEl.selectedIndex];
      if (opt && opt.value) {
        farmerName = opt.dataset.name || opt.text;
      }
    } else {
      farmerName = (farmerEl.value || '').trim();
    }
  }
  const invoiceEl = document.getElementById('purchase-invoice-no') || document.getElementById('pur-invoice');
  const invoiceNo = invoiceEl ? invoiceEl.value.trim() : '';
  const todayStr = new Date().toISOString().split('T')[0];

  const rows = Array.from(document.querySelectorAll('#pur-items .price-tier-row'));

  // Validasi pengaman: jika ada baris item dengan kolom .pi-lot masih kosong, jalankan autoFillPurchaseRowBatch
  rows.forEach(function (row) {
    const lotInput = row.querySelector('.pi-lot');
    if (lotInput && !lotInput.value.trim()) {
      autoFillPurchaseRowBatch(row, true);
    }
  });

  const items = rows.map(function (row) {
    const prodDateVal = row.querySelector('.pi-prod-date') ? row.querySelector('.pi-prod-date').value : '';
    const lotInput = row.querySelector('.pi-lot');
    const prodId = row.querySelector('.pi-product').value;
    let batchNo = lotInput ? lotInput.value.trim() : '';
    if (!batchNo) {
      const prodSelect = row.querySelector('.pi-product, .pur-item-product');
      const prodText = prodSelect ? (prodSelect.options[prodSelect.selectedIndex] ? prodSelect.options[prodSelect.selectedIndex].text : '') : '';
      const expVal = row.querySelector('.pi-expiry') ? row.querySelector('.pi-expiry').value : '';
      const seq = typeof getNextBatchSequenceForProduct === 'function' ? getNextBatchSequenceForProduct(prodId, prodText, row) : 1;
      batchNo = generateClientBatchCode(prodId, prodDateVal, seq, prodId, { expiryDate: expVal });
    }
    const allProds = (DATA_CACHE.products && DATA_CACHE.products.data) || PRODUCTS_CACHE || [];
    const prodObj = allProds.find(function (p) { return p && String(p.id) === String(prodId); });
    const isCurah = isCurahInventoryProduct(prodObj);
    const itemUnit = (prodObj && prodObj.unit) ? prodObj.unit : (isCurah ? 'gr' : 'pcs');

    const buyPrice = Number(row.querySelector('.pi-price, .pur-item-buy-price') ? row.querySelector('.pi-price, .pur-item-buy-price').value : 0) || 0;
    const rawAdditionalCost = Number(row.querySelector('.pur-item-cost-extra') ? row.querySelector('.pur-item-cost-extra').value : 0) || 0;
    const additionalCost = isCurah ? 0 : rawAdditionalCost;
    const costPerUnit = isCurah ? buyPrice : (buyPrice + additionalCost);
    const isSeed = prodObj ? (typeof isSeedProductClient === 'function' ? isSeedProductClient(prodObj) : ((prodObj.category || '') + ' ' + (prodObj.product_type || '')).toLowerCase().includes('benih')) : true;
    const prodCat = prodObj ? (prodObj.category || 'Benih') : 'Benih';
    const prodType = prodObj ? (prodObj.product_type || '') : '';

    return {
      product_id: prodId,
      batch_no: batchNo,
      qty: Number(row.querySelector('.pi-qty').value || 0),
      unit: itemUnit,
      buy_price: buyPrice,
      additional_cost: isCurah ? 0 : additionalCost,
      cost_per_unit: costPerUnit,
      is_curah: isCurah,
      is_seed: isSeed,
      category: prodCat,
      product_type: prodType,
      inventory_type: (prodObj && prodObj.inventory_type) ? prodObj.inventory_type : (isCurah ? 'curah' : 'kemasan'),
      production_date: prodDateVal || todayStr,
      expiry_date: row.querySelector('.pi-expiry').value || ''
    };
  }).filter(function (i) { return i.product_id && i.qty > 0 && i.buy_price > 0; });

  if (items.length === 0) {
    showToast('Minimal 1 item pembelian valid harus terisi (Qty & Harga Beli harus lebih dari 0).', true);
    return;
  }

  const grandTotal = items.reduce(function (sum, item) {
    return sum + (item.qty * item.cost_per_unit);
  }, 0);

  api('createPurchase', TOKEN, {
    supplier_id: supplierId,
    farmer_id: farmerId,
    farmer_name: farmerName,
    invoice_no: invoiceNo,
    total: grandTotal,
    items: items
  }).then(function () {
    invalidateCache('purchases');
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('qc_records');
    invalidateCache('batches');
    invalidateCache('mutations');
    invalidateCache('stock_mutations');
    showToast('Pembelian berhasil disimpan.');
    closeModal();
    renderPembelian(true);
  }).catch(function (err) {
    showToast('Gagal menyimpan: ' + (err.message || err), true);
  });
}


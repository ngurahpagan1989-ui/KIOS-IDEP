// ========================= LAPORAN PENJUALAN & MARGIN FIFO =========================
function renderLaporan(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (CURRENT_LAPORAN_VIEW === 'stock_valuation') {
    loadStockValuationReport(forceRefresh);
    return;
  }
  if (CURRENT_LAPORAN_VIEW === 'period_closing') {
    loadPeriodClosingReport(forceRefresh);
    return;
  }

  // Set default filter awal bulan s/d hari ini jika belum terisi
  if (!CURRENT_REPORT_FILTER.startDate || !CURRENT_REPORT_FILTER.endDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    CURRENT_REPORT_FILTER.period = 'month';
    CURRENT_REPORT_FILTER.startDate = y + '-' + m + '-01';
    CURRENT_REPORT_FILTER.endDate = y + '-' + m + '-' + d;
  }

  if (!forceRefresh && CURRENT_REPORT_DATA) {
    drawLaporanUI(CURRENT_REPORT_DATA, CURRENT_REPORT_FILTER);
    return;
  }

  content.innerHTML =
    '<div class="card">' +
    '<div class="empty-state">' +
    '<span class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:10px;"></span><br>' +
    'Mengkalkulasi pembukuan omzet, HPP FIFO riil, dan penyerapan petani...' +
    '</div>' +
    '</div>';

  loadReport(CURRENT_REPORT_FILTER);
}

function loadReport(filterPayload) {
  if (typeof filterPayload === 'string') {
    CURRENT_REPORT_FILTER.period = filterPayload;
  } else if (filterPayload && typeof filterPayload === 'object') {
    Object.assign(CURRENT_REPORT_FILTER, filterPayload);
  }

  setProgressLoading(true);
  api('getReport', TOKEN, CURRENT_REPORT_FILTER.period, CURRENT_REPORT_FILTER.startDate, CURRENT_REPORT_FILTER.endDate).then(function (data) {
    setProgressLoading(false);
    CURRENT_REPORT_DATA = data;
    if (data.startDate) CURRENT_REPORT_FILTER.startDate = data.startDate;
    if (data.endDate) CURRENT_REPORT_FILTER.endDate = data.endDate;
    if (data.period) CURRENT_REPORT_FILTER.period = data.period;
    drawLaporanUI(data, CURRENT_REPORT_FILTER);
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal memuat laporan: ' + (err.message || err), true);
  });
}

function applyCustomReportFilter() {
  const startEl = document.getElementById('report-start-date');
  const endEl = document.getElementById('report-end-date');
  const sVal = startEl ? startEl.value : '';
  const eVal = endEl ? endEl.value : '';

  if (!sVal || !eVal) {
    showToast('Harap pilih Tanggal Mulai dan Tanggal Selesai.', true);
    return;
  }
  if (sVal > eVal) {
    showToast('Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.', true);
    return;
  }

  loadReport({
    period: 'custom',
    startDate: sVal,
    endDate: eVal
  });
}

function switchReportSubtab(tabName) {
  CURRENT_REPORT_SUBTAB = tabName;
  const buttons = document.querySelectorAll('.report-tab-btn');
  buttons.forEach(function (btn) {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const panes = document.querySelectorAll('.report-subtab-pane');
  panes.forEach(function (pane) {
    if (pane.id === 'report-subtab-' + tabName) {
      pane.style.display = 'block';
    } else {
      pane.style.display = 'none';
    }
  });
}

function formatReportDateTime(val) {
  if (!val) return '-';
  const d = new Date(String(val).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(val).slice(0, 16);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return day + '/' + mon + '/' + yr + ' ' + hr + ':' + min;
}

function filterReportTransactions(query) {
  query = (query || '').trim().toLowerCase();
  const txs = (CURRENT_REPORT_DATA && CURRENT_REPORT_DATA.transactions) ? CURRENT_REPORT_DATA.transactions : [];
  let filtered = txs;
  if (query) {
    filtered = txs.filter(function (t) {
      const idMatch = String(t.id || '').toLowerCase().includes(query);
      const custMatch = String(t.customer_name || '').toLowerCase().includes(query);
      const payMatch = String(t.payment_method || '').toLowerCase().includes(query);
      const srcMatch = String(t.source || '').toLowerCase().includes(query);
      const itemsMatch = String(t.items_summary || '').toLowerCase().includes(query);
      return idMatch || custMatch || payMatch || srcMatch || itemsMatch;
    });
  }
  renderReportTransactionRows(filtered);
  updateReportTableFooter(filtered);
}

function renderReportTransactionRows(list) {
  const tbody = document.getElementById('report-tx-tbody');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada transaksi yang sesuai dengan filter atau kata kunci.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function (tx, idx) {
    const isPaid = String(tx.status || '').toLowerCase() === 'paid';
    const statusBadge = isPaid
      ? '<span class="badge badge-success" style="font-size:10px;padding:2px 6px;font-weight:700;">LUNAS</span>'
      : '<span class="badge badge-warning" style="font-size:10px;padding:2px 6px;font-weight:700;">TEMPO</span>';

    let srcIcon = '🏪';
    const sLower = String(tx.source || '').toLowerCase();
    if (sLower.includes('wa') || sLower.includes('whatsapp')) srcIcon = '💬';
    else if (sLower.includes('shopee')) srcIcon = '🟠';
    else if (sLower.includes('tokopedia')) srcIcon = '🟢';
    else if (sLower.includes('tiktok')) srcIcon = '🎵';
    else if (sLower.includes('konsinyasi')) srcIcon = '📦';

    const marginPct = Number(tx.margin_pct || 0);
    const marginClass = marginPct >= 0 ? 'badge-success' : 'badge-danger';

    return '<tr>' +
      '<td style="text-align:center;font-size:12px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td style="font-size:12px;white-space:nowrap;color:var(--text-secondary);">' + formatReportDateTime(tx.created_at) + '</td>' +
      '<td><span style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:var(--primary);">' + escapeHtml(tx.id) + '</span></td>' +
      '<td>' +
      '<div style="font-weight:600;color:var(--text-main);font-size:12.5px;">' + escapeHtml(tx.customer_name || 'Umum') + '</div>' +
      '</td>' +
      '<td><span class="badge badge-neutral" style="font-size:11px;display:inline-flex;align-items:center;gap:3px;">' + srcIcon + ' ' + escapeHtml(tx.source || 'Offline') + '</span></td>' +
      '<td>' +
      '<div style="max-width:260px;font-size:12px;line-height:1.4;color:var(--text-main);" title="' + escapeHtml(tx.items_summary) + '">' +
      '<span>' + escapeHtml(tx.items_summary) + '</span>' +
      '<span class="badge badge-neutral" style="font-size:10px;margin-left:4px;white-space:nowrap;font-weight:700;">' + (tx.item_count || 0) + ' pcs</span>' +
      '</div>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;color:var(--text-main);font-size:12.5px;">' + formatRupiah(tx.subtotal) + '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-size:12.5px;">' + formatRupiah(tx.cogs) + '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);font-size:13px;background:rgba(46,125,50,0.06);padding:4px 8px;border-radius:var(--radius-xs);">' + formatRupiah(tx.gross_profit) + '</td>' +
      '<td style="text-align:center;"><span class="badge ' + marginClass + '" style="font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;">' + marginPct + '%</span></td>' +
      '<td style="text-align:center;">' +
      '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">' +
      '<span style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">' + escapeHtml(tx.payment_method || 'Tunai') + '</span>' +
      statusBadge +
      '</div>' +
      '</td>' +
      '<td style="text-align:center;">' +
      '<button type="button" class="btn btn-secondary btn-xs" onclick="openTransactionDetailModal(\'' + escapeHtml(tx.id) + '\')" title="Lihat rincian nota & struk #' + escapeHtml(tx.id) + '" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 8px;font-weight:600;">🔍 Rincian</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function updateReportTableFooter(list) {
  const tfoot = document.getElementById('report-tx-tfoot');
  const countEl = document.getElementById('report-tx-count');
  list = list || [];

  const totalTxs = (CURRENT_REPORT_DATA && CURRENT_REPORT_DATA.transactions) ? CURRENT_REPORT_DATA.transactions.length : list.length;
  if (countEl) {
    countEl.textContent = 'Menampilkan ' + list.length + ' dari ' + totalTxs + ' transaksi';
  }

  if (!tfoot) return;
  const subtotalAcc = list.reduce(function (s, t) { return s + Number(t.subtotal || 0); }, 0);
  const cogsAcc = list.reduce(function (s, t) { return s + Number(t.cogs || 0); }, 0);
  const grossAcc = subtotalAcc - cogsAcc;
  const marginAccPct = subtotalAcc > 0 ? Math.round((grossAcc / subtotalAcc) * 100) : 0;

  tfoot.innerHTML =
    '<tr>' +
    '<th colspan="6" style="text-align:right;padding:12px;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:12.5px;">' +
    'TOTAL AKUMULASI (' + list.length + ' Nota):' +
    '</th>' +
    '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:13px;">' + formatRupiah(subtotalAcc) + '</th>' +
    '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-secondary);background:var(--surface-muted);font-size:13px;">' + formatRupiah(cogsAcc) + '</th>' +
    '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);background:rgba(46,125,50,0.12);font-size:13.5px;">' + formatRupiah(grossAcc) + '</th>' +
    '<th style="text-align:center;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);background:var(--surface-muted);font-size:12.5px;">' + marginAccPct + '%</th>' +
    '<th colspan="2" style="background:var(--surface-muted);"></th>' +
    '</tr>';
}

function drawLaporanUI(data, filter) {
  const content = document.getElementById('content');
  if (!content) return;

  data = data || {
    summary: { totalRevenue: 0, totalSubtotal: 0, totalCost: 0, grossMargin: 0, grossMarginPct: 0, totalTransactions: 0 },
    transactions: [],
    channelsBreakdown: [],
    outletsBreakdown: [],
    farmersAbsorption: [],
    criticalBatches: [],
    topProducts: [],
    slowProducts: []
  };

  const summary = data.summary || {
    totalRevenue: data.totalRevenue || 0,
    totalSubtotal: data.totalSubtotalRevenue || data.netRevenue || 0,
    totalCost: data.totalCost || 0,
    grossMargin: data.grossMargin || 0,
    grossMarginPct: data.grossMarginPct || 0,
    totalTransactions: data.totalTransactions || 0
  };

  const period = filter.period || 'month';
  const startDateVal = data.startDate || filter.startDate || '';
  const endDateVal = data.endDate || filter.endDate || '';
  const transactionsList = data.transactions || [];

  // 1. Render Tab Kanal Penjualan
  let channelsHtml = '';
  if (data.channelsBreakdown && data.channelsBreakdown.length > 0) {
    channelsHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
      '<table style="width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:30%;">Kanal Penjualan</th>' +
      '<th style="width:15%;text-align:right;">Jumlah Nota</th>' +
      '<th style="width:25%;text-align:right;">Total Omzet (Rp)</th>' +
      '<th style="width:30%;">Kontribusi Omzet</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      data.channelsBreakdown.map(function (ch) {
        let icon = '🏪';
        const sLower = ch.source.toLowerCase();
        if (sLower.includes('whatsapp') || sLower.includes('wa')) icon = '💬';
        else if (sLower.includes('shopee')) icon = '🟠';
        else if (sLower.includes('tokopedia')) icon = '🟢';
        else if (sLower.includes('tiktok')) icon = '🎵';
        else if (sLower.includes('konsinyasi')) icon = '📦';

        return '<tr>' +
          '<td><strong>' + icon + ' ' + escapeHtml(ch.source) + '</strong></td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;">' + ch.transactions_count + '</td>' +
          '<td style="text-align:right;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:var(--text-main);">' + formatRupiah(ch.total_revenue) + '</td>' +
          '<td>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
          '<div class="channel-progress-bar" style="flex:1;">' +
          '<div class="channel-progress-fill" style="width:' + ch.percentage + '%;"></div>' +
          '</div>' +
          '<span style="font-size:11.5px;font-weight:700;color:var(--primary);min-width:34px;text-align:right;">' + ch.percentage + '%</span>' +
          '</div>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  } else {
    channelsHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada data penjualan pada rentang periode ini.</div>';
  }

  // 2. Render Tab Konsinyasi & Cabang
  let outletsHtml = '';
  if (data.outletsBreakdown && data.outletsBreakdown.length > 0) {
    outletsHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
      '<table style="width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:25%;">Outlet Mitra / Cabang</th>' +
      '<th style="width:12%;">Tier Harga</th>' +
      '<th style="width:12%;text-align:right;">Pcs Terjual</th>' +
      '<th style="width:12%;text-align:right;">Pcs Retur</th>' +
      '<th style="width:18%;text-align:center;">Pcs Selisih / Hilang</th>' +
      '<th style="width:21%;text-align:right;">Total Tagihan (Rp)</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      data.outletsBreakdown.map(function (o) {
        const missingBadge = (o.total_missing_chargeable > 0 || o.total_missing_writeoff > 0)
          ? '<div style="font-size:11px;display:flex;flex-direction:column;gap:2px;align-items:center;">' +
          (o.total_missing_chargeable > 0 ? '<span class="badge badge-warning" style="font-size:10px;">Ditagih: ' + o.total_missing_chargeable + ' pcs</span>' : '') +
          (o.total_missing_writeoff > 0 ? '<span class="badge badge-neutral" style="font-size:10px;">Write-off: ' + o.total_missing_writeoff + ' pcs</span>' : '') +
          '</div>'
          : '<span style="color:var(--text-muted);font-size:11px;">0 pcs</span>';

        return '<tr>' +
          '<td>' +
          '<strong>' + escapeHtml(o.outlet_name) + '</strong>' +
          '<div style="font-size:10.5px;color:var(--text-muted);">' + o.audits_count + ' kali audit opname</div>' +
          '</td>' +
          '<td><span class="badge badge-neutral">' + escapeHtml(o.price_tier) + '</span></td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;color:var(--success);">' + o.total_sold + ' pcs</td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--warning);">' + o.total_returned + ' pcs</td>' +
          '<td style="text-align:center;">' + missingBadge + '</td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--accent);font-size:13.5px;">' + formatRupiah(o.total_invoice) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  } else {
    outletsHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada audit konsinyasi atau penjualan outlet mitra dalam periode ini.</div>';
  }

  // 3. Render Tab Penyerapan Petani Penangkar
  let farmersHtml = '';
  if (data.farmersAbsorption && data.farmersAbsorption.length > 0) {
    farmersHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
      '<table style="width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:25%;">Nama Petani / Kelompok Tani</th>' +
      '<th style="width:30%;">Varietas Benih Diserap</th>' +
      '<th style="width:15%;text-align:right;">Benih Curah</th>' +
      '<th style="width:15%;text-align:right;">Kemasan Sachet</th>' +
      '<th style="width:15%;text-align:right;">Dana Pengadaan (Rp)</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      data.farmersAbsorption.map(function (f) {
        const rawStr = f.total_raw_gram >= 1000
          ? (f.total_raw_gram / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg'
          : (f.total_raw_gram > 0 ? f.total_raw_gram.toLocaleString('id-ID') + ' gr' : '-');
        const sachetStr = f.total_sachet_pcs > 0 ? f.total_sachet_pcs.toLocaleString('id-ID') + ' pcs' : '-';

        return '<tr>' +
          '<td><strong>🌾 ' + escapeHtml(f.farmer_name) + '</strong></td>' +
          '<td style="font-size:12px;color:var(--text-secondary);">' + escapeHtml(f.varieties) + '</td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + rawStr + '</td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + sachetStr + '</td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);font-size:13.5px;">' + formatRupiah(f.total_payout) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  } else {
    farmersHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada data pengadaan benih dari petani penangkar pada periode ini.</div>';
  }

  // 4. Render Tab Kesehatan Stok & Peringatan Kedaluwarsa
  let stocksHtml = '';
  if (data.criticalBatches && data.criticalBatches.length > 0) {
    stocksHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
      '<table style="width:100%;">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:28%;">Varietas Produk Benih</th>' +
      '<th style="width:22%;">No. Batch / Lot</th>' +
      '<th style="width:12%;text-align:right;">Sisa Stok</th>' +
      '<th style="width:12%;">Tgl Expired</th>' +
      '<th style="width:12%;text-align:center;">Status Hari</th>' +
      '<th style="width:14%;text-align:right;">Valuasi Risiko (Rp)</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      data.criticalBatches.map(function (b) {
        const isDanger = b.days_left <= 30;
        const badgeClass = isDanger ? 'report-badge-risk-danger' : 'report-badge-risk-warning';
        const daysStr = b.days_left <= 0 ? 'Kedaluwarsa' : b.days_left + ' hari lagi';

        return '<tr>' +
          '<td>' +
          '<strong>' + escapeHtml(b.product_name) + '</strong>' +
          (b.variant ? ' <span class="badge badge-neutral" style="font-size:10px;">' + escapeHtml(b.variant) + '</span>' : '') +
          '</td>' +
          '<td><code style="font-size:11px;">' + escapeHtml(b.batch_id) + '</code></td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + b.qty_remaining + ' ' + escapeHtml(b.unit) + '</td>' +
          '<td style="font-size:12px;">' + escapeHtml(b.expiry_date) + '</td>' +
          '<td style="text-align:center;"><span class="' + badgeClass + '">' + daysStr + '</span></td>' +
          '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--danger);">' + formatRupiah(b.risk_valuation) + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  } else {
    stocksHtml = '<div style="text-align:center;padding:32px;color:var(--success);">✅ Semua persediaan benih berada dalam kondisi aman (> 60 hari dari kedaluwarsa).</div>';
  }

  // 5. Render Tab Rotasi Produk (Top 5 Laris vs 5 Slow-Moving)
  let productsHtml =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
    '<div>' +
    '<h4 style="margin-bottom:10px;color:var(--primary);display:flex;align-items:center;gap:6px;">' +
    '<span>🚀 5 Produk Paling Laris</span>' +
    '<span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">(Rotasi Cepat)</span>' +
    '</h4>' +
    '<div class="table-container">' +
    '<table style="width:100%;">' +
    '<thead><tr><th>Nama Produk</th><th style="text-align:right;">Terjual</th></tr></thead>' +
    '<tbody>' +
    ((data.topProducts && data.topProducts.length > 0) ? data.topProducts.map(function (p) {
      return '<tr>' +
        '<td><strong>' + escapeHtml(p.product_name) + '</strong></td>' +
        '<td style="text-align:right;"><span class="badge badge-success" style="font-family:\'JetBrains Mono\',monospace;">' + p.qty + ' ' + escapeHtml(p.unit) + '</span></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="2"><div style="text-align:center;padding:16px;color:var(--text-secondary);">Belum ada data transaksi.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<h4 style="margin-bottom:10px;color:var(--warning);display:flex;align-items:center;gap:6px;">' +
    '<span>🐢 5 Produk Slow-Moving</span>' +
    '<span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">(Perputaran Lambat)</span>' +
    '</h4>' +
    '<div class="table-container">' +
    '<table style="width:100%;">' +
    '<thead><tr><th>Nama Produk</th><th style="text-align:right;">Terjual</th></tr></thead>' +
    '<tbody>' +
    ((data.slowProducts && data.slowProducts.length > 0) ? data.slowProducts.map(function (p) {
      return '<tr>' +
        '<td><strong>' + escapeHtml(p.product_name) + '</strong></td>' +
        '<td style="text-align:right;"><span class="badge badge-neutral" style="font-family:\'JetBrains Mono\',monospace;">' + p.qty + ' ' + escapeHtml(p.unit) + '</span></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="2"><div style="text-align:center;padding:16px;color:var(--text-secondary);">Belum ada data produk.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '</div>';

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h1 class="page-title">Laporan Penjualan &amp; Margin FIFO</h1>' +
    '<p class="page-subtitle">Analisis menyeluruh kinerja keuangan, margin FIFO asli per transaksi belanja, penyerapan petani, dan rotasi stok.</p>' +
    '</div>' +
    '<div class="page-actions">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'laporan\')" title="Buka Panduan Laporan &amp; Tutup Buku"><i class="fas fa-book-open" style="margin-right:5px;"></i>📖 Panduan Laporan</button>' +
    '</div>' +
    '</div>' +

    '<!-- SWITCHER TAB UTAMA MODUL LAPORAN -->' +
    '<div class="laporan-nav-switcher">' +
    '<button type="button" class="laporan-nav-tab-btn' + (CURRENT_LAPORAN_VIEW === 'sales' ? ' active' : '') + '" onclick="switchLaporanMainView(\'sales\')">📈 Laporan Penjualan &amp; Margin FIFO</button>' +
    '<button type="button" class="laporan-nav-tab-btn' + (CURRENT_LAPORAN_VIEW === 'stock_valuation' ? ' active' : '') + '" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi Aset</button>' +
    '<button type="button" class="laporan-nav-tab-btn' + (CURRENT_LAPORAN_VIEW === 'period_closing' ? ' active' : '') + '" onclick="switchLaporanMainView(\'period_closing\')">🔒 Tutup Buku &amp; Cut-Off Periode</button>' +
    '</div>' +

    '<!-- BAR FILTER PERIODE FLEKSIBEL & TOMBOL AKSI -->' +
    '<div class="report-filter-bar">' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '<span style="font-size:11.5px;font-weight:700;color:var(--text-secondary);margin-right:4px;">PILIHAN CEPAT:</span>' +
    '<button type="button" class="btn ' + (period === 'today' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'today\')">Hari Ini</button>' +
    '<button type="button" class="btn ' + (period === 'week' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'week\')">7 Hari</button>' +
    '<button type="button" class="btn ' + (period === 'month' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'month\')">Bulan Ini</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
    '<div style="display:flex;align-items:center;gap:4px;">' +
    '<label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">Dari Tgl:</label>' +
    '<input type="date" id="report-start-date" value="' + escapeHtml(startDateVal) + '" style="padding:5px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.16);border-radius:var(--radius-xs);background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:4px;">' +
    '<label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">Sampai Tgl:</label>' +
    '<input type="date" id="report-end-date" value="' + escapeHtml(endDateVal) + '" style="padding:5px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.16);border-radius:var(--radius-xs);background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">' +
    '</div>' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="applyCustomReportFilter()">🔎 Terapkan</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="openPeriodClosingWizard()" style="background:#2563EB;border-color:#2563EB;font-weight:700;" title="Tutup buku dan bekukan saldo akhir periode ini">⚡ Tutup Buku Periode</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="exportReportToCSV()" title="Unduh data laporan lengkap ke format CSV / Excel">📥 Ekspor CSV/Excel</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="printReportSummary()" title="Cetak rekapitulasi laporan resmi (format A4/PDF)">🖨️ Cetak Rekap Laporan (A4/PDF)</button>' +
    '</div>' +
    '</div>' +

    '<!-- 4 KARTU RINGKASAN METRIK -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:18px;">' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Omzet</span><span class="stat-icon">&#128176;</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(summary.totalSubtotal) + '</div>' +
    '<div class="stat-meta">Kotor: ' + formatRupiah(summary.totalRevenue) + ' • ' + summary.totalTransactions + ' Nota</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Laba Kotor FIFO</span><span class="stat-icon">&#128200;</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(summary.grossMargin) + '</div>' +
    '<div class="stat-meta">Modal HPP: ' + formatRupiah(summary.totalCost) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Rata-rata Margin (%)</span><span class="stat-icon">&#128202;</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">' + summary.grossMarginPct + '%</div>' +
    '<div class="stat-meta">Margin Laba Terhadap Omzet</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Volume Nota</span><span class="stat-icon">&#129534;</span></div>' +
    '<div class="stat-value" style="font-size:22px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + summary.totalTransactions + '</div>' +
    '<div class="stat-meta">Nota Belanja Selesai Diproses</div>' +
    '</div>' +
    '</div>' +

    '<!-- TABEL RINCIAN PENJUALAN KOMPREHENSIF PER TRANSAKSI BELANJA -->' +
    '<div class="card" style="margin-bottom:20px;padding:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<h3 style="font-size:16px;font-weight:700;color:var(--primary);display:flex;align-items:center;gap:6px;margin:0 0 2px 0;">' +
    '<span>🧾</span> Tabel Rincian Penjualan &amp; Margin FIFO' +
    '</h3>' +
    '<div style="font-size:11.5px;color:var(--text-secondary);">Daftar transaksi belanja per nota lengkap dengan HPP modal riil dan margin keuntungan.</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<input type="text" id="report-tx-search" placeholder="🔍 Cari nomor nota, pelanggan, atau metode bayar..." oninput="filterReportTransactions(this.value)" style="padding:7px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:340px;background:rgba(15,23,42,0.95);color:#F8FAFC;">' +
    '<span id="report-tx-count" class="badge badge-neutral" style="font-size:11.5px;font-weight:600;padding:6px 10px;">Menampilkan ' + transactionsList.length + ' transaksi</span>' +
    '</div>' +
    '</div>' +

    '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-sm);border:1px solid var(--border);">' +
    '<table id="report-transactions-table" style="width:100%;min-width:1150px;border-collapse:collapse;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:40px;text-align:center;">No</th>' +
    '<th style="width:130px;">Waktu Transaksi</th>' +
    '<th style="width:125px;">No. Nota</th>' +
    '<th style="width:140px;">Pelanggan</th>' +
    '<th style="width:100px;">Kanal</th>' +
    '<th style="width:230px;">Item Terjual</th>' +
    '<th style="width:125px;text-align:right;">Omzet (Subtotal)</th>' +
    '<th style="width:115px;text-align:right;">HPP FIFO</th>' +
    '<th style="width:125px;text-align:right;">Laba Kotor</th>' +
    '<th style="width:75px;text-align:center;">Margin</th>' +
    '<th style="width:110px;text-align:center;">Metode Bayar</th>' +
    '<th style="width:85px;text-align:center;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="report-tx-tbody"></tbody>' +
    '<tfoot id="report-tx-tfoot"></tfoot>' +
    '</table>' +
    '</div>' +
    '</div>' +

    '<!-- TABULASI ANALITIK PENDUKUNG (KANAL, KONSINYASI, SERAPAN PETANI, STOK EXPIRED) -->' +
    '<div class="card" style="padding:0;overflow:hidden;">' +
    '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface-muted);padding:0 12px;overflow-x:auto;gap:4px;">' +
    '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'channels' ? 'active' : '') + '" data-tab="channels" onclick="switchReportSubtab(\'channels\')">🏢 Kontribusi Kanal</button>' +
    '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'outlets' ? 'active' : '') + '" data-tab="outlets" onclick="switchReportSubtab(\'outlets\')">🏪 Konsinyasi &amp; Cabang</button>' +
    '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'farmers' ? 'active' : '') + '" data-tab="farmers" onclick="switchReportSubtab(\'farmers\')">🌾 Penyerapan Petani Penangkar</button>' +
    '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'stocks' ? 'active' : '') + '" data-tab="stocks" onclick="switchReportSubtab(\'stocks\')">⚠️ Kesehatan Stok &amp; Expired</button>' +
    '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'products' ? 'active' : '') + '" data-tab="products" onclick="switchReportSubtab(\'products\')">📊 Rotasi Produk (Top &amp; Slow)</button>' +
    '<button type="button" class="report-tab-btn" data-tab="stock_valuation" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi</button>' +
    '<button type="button" class="report-tab-btn" data-tab="period_closing" onclick="switchLaporanMainView(\'period_closing\')">🔒 Tutup Buku &amp; Cut-Off</button>' +
    '</div>' +
    '<div style="padding:16px;">' +
    '<div class="report-subtab-pane" id="report-subtab-channels" style="display:' + (CURRENT_REPORT_SUBTAB === 'channels' ? 'block' : 'none') + ';">' + channelsHtml + '</div>' +
    '<div class="report-subtab-pane" id="report-subtab-outlets" style="display:' + (CURRENT_REPORT_SUBTAB === 'outlets' ? 'block' : 'none') + ';">' + outletsHtml + '</div>' +
    '<div class="report-subtab-pane" id="report-subtab-farmers" style="display:' + (CURRENT_REPORT_SUBTAB === 'farmers' ? 'block' : 'none') + ';">' + farmersHtml + '</div>' +
    '<div class="report-subtab-pane" id="report-subtab-stocks" style="display:' + (CURRENT_REPORT_SUBTAB === 'stocks' ? 'block' : 'none') + ';">' + stocksHtml + '</div>' +
    '<div class="report-subtab-pane" id="report-subtab-products" style="display:' + (CURRENT_REPORT_SUBTAB === 'products' ? 'block' : 'none') + ';">' + productsHtml + '</div>' +
    '</div>' +
    '</div>';

  // Render baris transaksi belanja & footer tabel
  renderReportTransactionRows(transactionsList);
  updateReportTableFooter(transactionsList);
}

function exportReportToCSV() {
  if (!CURRENT_REPORT_DATA) {
    showToast('Silakan tunggu hingga data laporan selesai dimuat.', true);
    return;
  }

  const d = CURRENT_REPORT_DATA;
  const summary = d.summary || {
    totalRevenue: d.totalRevenue || 0,
    totalSubtotal: d.totalSubtotalRevenue || d.netRevenue || 0,
    totalCost: d.totalCost || 0,
    grossMargin: d.grossMargin || 0,
    grossMarginPct: d.grossMarginPct || 0,
    totalTransactions: d.totalTransactions || 0
  };
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Toko Kasir & Inventaris';
  const lines = [];

  function escapeCsv(val) {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return '"' + s + '"';
  }

  // Header Dokumen
  lines.push([escapeCsv(storeName), escapeCsv('LAPORAN PENJUALAN & MARGIN FIFO')].join(','));
  lines.push([escapeCsv('Periode'), escapeCsv((d.startDate || '') + ' s/d ' + (d.endDate || ''))].join(','));
  lines.push([escapeCsv('Dicetak Pada'), escapeCsv(new Date().toLocaleString('id-ID'))].join(','));
  lines.push('');

  // 1. Ringkasan Keuangan
  lines.push(escapeCsv('=== 1. RINGKASAN KINERJA KEUANGAN FIFO ==='));
  lines.push([escapeCsv('Total Omzet Kotor (Rp)'), escapeCsv(summary.totalRevenue)].join(','));
  lines.push([escapeCsv('Total Omzet Subtotal (Rp)'), escapeCsv(summary.totalSubtotal)].join(','));
  lines.push([escapeCsv('Total HPP FIFO Riil (Rp)'), escapeCsv(summary.totalCost)].join(','));
  lines.push([escapeCsv('Laba Kotor (Rp)'), escapeCsv(summary.grossMargin)].join(','));
  lines.push([escapeCsv('Persentase Margin (%)'), escapeCsv(summary.grossMarginPct + '%')].join(','));
  lines.push([escapeCsv('Volume Nota Transaksi'), escapeCsv(summary.totalTransactions)].join(','));
  lines.push('');

  // 2. Rincian Transaksi Komprehensif per Nota
  lines.push(escapeCsv('=== 2. RINCIAN TRANSAKSI PENJUALAN PER NOTA BELANJA ==='));
  lines.push([
    escapeCsv('No'),
    escapeCsv('Waktu Transaksi'),
    escapeCsv('No. Nota'),
    escapeCsv('Nama Pelanggan'),
    escapeCsv('Kanal Penjualan'),
    escapeCsv('Ringkasan Item Belanja'),
    escapeCsv('Total Kuantiti (Pcs)'),
    escapeCsv('Omzet Subtotal (Rp)'),
    escapeCsv('Pajak (Rp)'),
    escapeCsv('Total Akhir (Rp)'),
    escapeCsv('HPP FIFO Riil (Rp)'),
    escapeCsv('Laba Kotor (Rp)'),
    escapeCsv('Margin (%)'),
    escapeCsv('Metode Pembayaran'),
    escapeCsv('Status Pembayaran')
  ].join(','));

  const txs = d.transactions || [];
  txs.forEach(function (t, idx) {
    lines.push([
      escapeCsv(idx + 1),
      escapeCsv(formatReportDateTime(t.created_at)),
      escapeCsv(t.id),
      escapeCsv(t.customer_name || 'Umum'),
      escapeCsv(t.source || 'Offline'),
      escapeCsv(t.items_summary || '-'),
      escapeCsv(t.item_count || 0),
      escapeCsv(t.subtotal || 0),
      escapeCsv(t.tax || 0),
      escapeCsv(t.total || 0),
      escapeCsv(t.cogs || 0),
      escapeCsv(t.gross_profit || 0),
      escapeCsv((t.margin_pct || 0) + '%'),
      escapeCsv(t.payment_method || 'Tunai'),
      escapeCsv(t.status === 'paid' ? 'LUNAS' : 'TEMPO')
    ].join(','));
  });
  lines.push('');

  // 3. Kanal Penjualan
  lines.push(escapeCsv('=== 3. KONTRIBUSI KANAL PENJUALAN ==='));
  lines.push([escapeCsv('Kanal Penjualan'), escapeCsv('Jumlah Nota'), escapeCsv('Total Omzet (Rp)'), escapeCsv('Kontribusi (%)')].join(','));
  (d.channelsBreakdown || []).forEach(function (ch) {
    lines.push([escapeCsv(ch.source), escapeCsv(ch.transactions_count), escapeCsv(ch.total_revenue), escapeCsv(ch.percentage + '%')].join(','));
  });
  lines.push('');

  // 4. Konsinyasi & Cabang
  lines.push(escapeCsv('=== 4. REKAPITULASI MITRA KONSINYASI & OUTLET CABANG ==='));
  lines.push([escapeCsv('Nama Outlet Mitra'), escapeCsv('Tier Harga'), escapeCsv('Pcs Terjual'), escapeCsv('Pcs Retur'), escapeCsv('Pcs Selisih Ditagih'), escapeCsv('Pcs Selisih Write-off'), escapeCsv('Total Tagihan Terbit (Rp)')].join(','));
  (d.outletsBreakdown || []).forEach(function (o) {
    lines.push([escapeCsv(o.outlet_name), escapeCsv(o.price_tier), escapeCsv(o.total_sold), escapeCsv(o.total_returned), escapeCsv(o.total_missing_chargeable), escapeCsv(o.total_missing_writeoff), escapeCsv(o.total_invoice)].join(','));
  });
  lines.push('');

  // 5. Serapan Petani Penangkar
  lines.push(escapeCsv('=== 5. PENYERAPAN HASIL PANEN PETANI PENANGKAR ==='));
  lines.push([escapeCsv('Nama Petani'), escapeCsv('Varietas Benih Diserap'), escapeCsv('Benih Curah (Gram)'), escapeCsv('Kemasan Sachet (Pcs)'), escapeCsv('Dana Pengadaan Terserap (Rp)')].join(','));
  (d.farmersAbsorption || []).forEach(function (f) {
    lines.push([escapeCsv(f.farmer_name), escapeCsv(f.varieties), escapeCsv(f.total_raw_gram), escapeCsv(f.total_sachet_pcs), escapeCsv(f.total_payout)].join(','));
  });
  lines.push('');

  // 6. Stok Kritis & Risiko Kedaluwarsa
  lines.push(escapeCsv('=== 6. PERINGATAN KESEHATAN STOK & RISIKO KEDALUWARSA ==='));
  lines.push([escapeCsv('Varietas Produk'), escapeCsv('No. Batch / Lot'), escapeCsv('Sisa Stok'), escapeCsv('Tanggal Kedaluwarsa'), escapeCsv('Sisa Hari'), escapeCsv('Valuasi Modal Berisiko (Rp)')].join(','));
  (d.criticalBatches || []).forEach(function (b) {
    lines.push([escapeCsv(b.product_name + (b.variant ? ' (' + b.variant + ')' : '')), escapeCsv(b.batch_id), escapeCsv(b.qty_remaining + ' ' + b.unit), escapeCsv(b.expiry_date), escapeCsv(b.days_left), escapeCsv(b.risk_valuation)].join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = 'Laporan_Penjualan_' + (d.startDate || 'start') + '_' + (d.endDate || 'end') + '.csv';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Laporan CSV berhasil diunduh: ' + filename);
}

function printReportSummary() {
  if (!CURRENT_REPORT_DATA) {
    showToast('Silakan tunggu hingga data laporan selesai dimuat.', true);
    return;
  }

  const d = CURRENT_REPORT_DATA;
  const summary = d.summary || {
    totalRevenue: d.totalRevenue || 0,
    totalSubtotal: d.totalSubtotalRevenue || d.netRevenue || 0,
    totalCost: d.totalCost || 0,
    grossMargin: d.grossMargin || 0,
    grossMarginPct: d.grossMarginPct || 0,
    totalTransactions: d.totalTransactions || 0
  };
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Toko Kasir & Inventaris';
  const storeAddress = (APP_SETTINGS && APP_SETTINGS['store_address']) ? APP_SETTINGS['store_address'] : 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = (APP_SETTINGS && APP_SETTINGS['store_phone']) ? APP_SETTINGS['store_phone'] : '';
  const storeLogo = (APP_SETTINGS && APP_SETTINGS['store_logo']) ? APP_SETTINGS['store_logo'] : '';

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const txs = d.transactions || [];
  const txRowsHtml = txs.map(function (t, idx) {
    return '<tr>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;white-space:nowrap;">' + formatReportDateTime(t.created_at) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-family:monospace;font-weight:bold;">' + escapeHtml(t.id) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;">' + escapeHtml(t.customer_name || 'Umum') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;">' + escapeHtml(t.source || 'Offline') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-size:10px;">' + escapeHtml(t.items_summary || '-') + ' (' + (t.item_count || 0) + ' pcs)</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(t.subtotal) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(t.cogs) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;color:#1e7e34;">' + formatRupiah(t.gross_profit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;font-family:monospace;">' + (t.margin_pct || 0) + '%</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + escapeHtml(t.payment_method || 'Tunai') + ' (' + (t.status === 'paid' ? 'LUNAS' : 'TEMPO') + ')</td>' +
      '</tr>';
  }).join('');

  const reportLogoHeaderHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:200px;margin:0 auto 6px auto;display:block;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:16px;">' +
    reportLogoHeaderHtml +
    '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
    '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;color:#111827;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;font-weight:700;">' +
    'REKAPITULASI LAPORAN PENJUALAN &amp; MARGIN FIFO' +
    '</div>' +
    '<div style="font-size:11px;color:#666;margin-top:4px;">' +
    'Periode Transaksi: <strong>' + escapeHtml(d.startDate) + '</strong> s/d <strong>' + escapeHtml(d.endDate) + '</strong> &bull; Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
    '</div>' +
    '</div>' +

    '<!-- 1. RINGKASAN FINANSIAL -->' +
    '<h4 style="font-size:12px;margin-bottom:6px;text-transform:uppercase;color:#111827;border-bottom:1px solid #ccc;padding-bottom:3px;">1. Ringkasan Kinerja Penjualan &amp; Laba FIFO</h4>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px;">' +
    '<tr>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Total Omzet Bersih:</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;font-weight:700;font-family:monospace;">' + formatRupiah(summary.totalSubtotal) + '</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Total Modal HPP FIFO:</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;font-weight:700;font-family:monospace;">' + formatRupiah(summary.totalCost) + '</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;background:#f9f9f9;">Laba Kotor (FIFO Riil):</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;color:#1e7e34;font-family:monospace;">' + formatRupiah(summary.grossMargin) + ' (' + summary.grossMarginPct + '%)</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;background:#f9f9f9;">Volume Nota Transaksi:</td>' +
    '<td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;font-family:monospace;">' + summary.totalTransactions + ' Nota</td>' +
    '</tr>' +
    '</table>' +

    '<!-- 2. TABEL RINCIAN TRANSAKSI PER NOTA -->' +
    '<h4 style="font-size:12px;margin-bottom:6px;text-transform:uppercase;color:#111827;border-bottom:1px solid #ccc;padding-bottom:3px;">2. Rincian Transaksi Belanja &amp; Laba Kotor FIFO</h4>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
    '<thead>' +
    '<tr style="background:#f0f0f0;">' +
    '<th style="border:1px solid #ddd;padding:4px;">No</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">Waktu</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">No. Nota</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">Pelanggan</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">Kanal</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">Item Terjual</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;">Subtotal</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;">HPP FIFO</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;">Laba Kotor</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:center;">Margin</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:center;">Pembayaran</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (txRowsHtml || '<tr><td colspan="11" style="border:1px solid #ddd;text-align:center;padding:10px;">Tidak ada transaksi belanja dalam periode ini.</td></tr>') +
    '</tbody>' +
    '<tfoot>' +
    '<tr style="background:#f0f0f0;font-weight:bold;">' +
    '<td colspan="6" style="border:1px solid #ddd;padding:6px;text-align:right;">TOTAL AKUMULASI:</td>' +
    '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;">' + formatRupiah(summary.totalSubtotal) + '</td>' +
    '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;">' + formatRupiah(summary.totalCost) + '</td>' +
    '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;color:#1e7e34;">' + formatRupiah(summary.grossMargin) + '</td>' +
    '<td style="border:1px solid #ddd;padding:6px;text-align:center;font-family:monospace;">' + summary.grossMarginPct + '%</td>' +
    '<td style="border:1px solid #ddd;padding:6px;"></td>' +
    '</tr>' +
    '</tfoot>' +
    '</table>' +

    '<!-- 3. TANDA TANGAN PENGESAHAN -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:28px;padding:0 24px;font-size:11px;color:#111827;page-break-inside:avoid;">' +
    '<div style="text-align:center;width:200px;">' +
    '<div>Disusun Oleh,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Petugas / Kasir Toko</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:160px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
    '</div>' +
    '<div style="text-align:center;width:200px;">' +
    '<div>Diverifikasi &amp; Disetujui,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Manajer / Keuangan</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:160px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  window.print();
  setTimeout(function () {
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
  }, 1000);
}

// ========================= LAPORAN POSISI STOK, VALUASI ASET & STOCK OPNAME =========================

function loadSalesReportView(forceRefresh) {
  if (forceRefresh) {
    invalidateCache('report');
  }
  loadReport(CURRENT_REPORT_FILTER);
}

function filterLaporanPeriod(p) {
  CURRENT_REPORT_FILTER.period = p;
  loadSalesReportView(true);
}

function loadStockValuationView() {
  loadStockValuationReport(true);
}

function switchLaporanMainView(viewName) {
  CURRENT_LAPORAN_VIEW = viewName || 'sales';
  if (CURRENT_LAPORAN_VIEW === 'stock_valuation') {
    loadStockValuationReport();
  } else if (CURRENT_LAPORAN_VIEW === 'period_closing') {
    loadPeriodClosingReport();
  } else {
    loadReport(CURRENT_REPORT_FILTER);
  }
}

function loadStockValuationReport(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && STOCK_VALUATION_DATA) {
    drawStockValuationUI(STOCK_VALUATION_DATA);
    return;
  }

  content.innerHTML =
    '<div class="card">' +
    '<div class="empty-state">' +
    '<span class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:10px;"></span><br>' +
    'Mengambil posisi stok riil, menghitung valuasi aset FIFO, dan memetakan status benih...' +
    '</div>' +
    '</div>';

  setProgressLoading(true);
  api('getStockValuationReport', TOKEN).then(function (res) {
    setProgressLoading(false);
    if (!res || !res.success) {
      showToast('Gagal memuat laporan stok: ' + (res ? res.message : 'Respon kosong'), true);
      return;
    }
    STOCK_VALUATION_DATA = res;
    drawStockValuationUI(res);
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal mengambil laporan posisi stok: ' + (err.message || err), true);
  });
}

function drawStockValuationUI(data) {
  const content = document.getElementById('content');
  if (!content) return;

  data = data || { summary: {}, items: [] };
  const summary = data.summary || {
    totalVarieties: 0,
    totalPackedPcs: 0,
    totalBulkGrams: 0,
    totalAssetValue: 0
  };

  // Format Bulk Grams / Kg
  let bulkStr = '0 gr';
  if (Number(summary.totalBulkGrams) >= 1000) {
    bulkStr = ((Number(summary.totalBulkGrams) || 0) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg';
  } else if (Number(summary.totalBulkGrams) > 0) {
    bulkStr = (Number(summary.totalBulkGrams) || 0).toLocaleString('id-ID') + ' gr';
  }

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Laporan Posisi Stok &amp; Valuasi Aset</h1>' +
    '<p class="page-subtitle">Monitoring posisi inventaris benih aktif, valuasi modal metode FIFO, kesegaran lot batch, dan lembar kerja opname fisik.</p>' +
    '</div>' +
    '</div>' +

    '<!-- SWITCHER TAB UTAMA MODUL LAPORAN -->' +
    '<div class="laporan-nav-switcher">' +
    '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'sales\')">📈 Laporan Penjualan &amp; Margin FIFO</button>' +
    '<button type="button" class="laporan-nav-tab-btn active" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi Aset</button>' +
    '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'period_closing\')">🔒 Tutup Buku &amp; Cut-Off Periode</button>' +
    '</div>' +

    '<!-- 4 KARTU RINGKASAN METRIK (KPI) CYBER -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-bottom:20px;">' +
    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header"><span class="stat-label">Varietas Aktif</span><span class="stat-icon" style="color:#22D3EE;">🌱</span></div>' +
    '    <div class="stat-value" style="font-size:24px;color:#22D3EE;font-family:\'JetBrains Mono\',monospace;text-shadow:0 0 15px rgba(34,211,238,0.3);">' + summary.totalVarieties + '</div>' +
    '    <div class="stat-meta">Ragam Varietas Benih Siap Salur</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,25 Q25,8 50,18 T100,6 L100,30 L0,30 Z" fill="rgba(6,182,212,0.15)"></path><path d="M0,25 Q25,8 50,18 T100,6" fill="none" stroke="#06B6D4" stroke-width="2"></path></svg>' +
    '  </div>' +
    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header"><span class="stat-label">Total Sachet Siap Jual</span><span class="stat-icon" style="color:#60A5FA;">📦</span></div>' +
    '    <div class="stat-value" style="font-size:24px;color:#60A5FA;font-family:\'JetBrains Mono\',monospace;text-shadow:0 0 15px rgba(96,165,250,0.3);">' + (Number(summary.totalPackedPcs) || 0).toLocaleString('id-ID') + ' pcs</div>' +
    '    <div class="stat-meta">Kemasan Retail Eceran Toko</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,28 Q30,12 60,20 T100,8 L100,30 L0,30 Z" fill="rgba(59,130,246,0.15)"></path><path d="M0,28 Q30,12 60,20 T100,8" fill="none" stroke="#3B82F6" stroke-width="2"></path></svg>' +
    '  </div>' +
    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header"><span class="stat-label">Total Stok Curah</span><span class="stat-icon" style="color:#FBBF24;">🌾</span></div>' +
    '    <div class="stat-value" style="font-size:24px;color:#FBBF24;font-family:\'JetBrains Mono\',monospace;text-shadow:0 0 15px rgba(251,191,36,0.3);">' + bulkStr + '</div>' +
    '    <div class="stat-meta">Bahan Baku Gudang Penangkaran</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,22 Q25,28 55,10 T100,16 L100,30 L0,30 Z" fill="rgba(245,158,11,0.15)"></path><path d="M0,22 Q25,28 55,10 T100,16" fill="none" stroke="#F59E0B" stroke-width="2"></path></svg>' +
    '  </div>' +
    '  <div class="stat-card cyber-stat-card">' +
    '    <div class="stat-header"><span class="stat-label">Total Valuasi Aset</span><span class="stat-icon" style="color:#34D399;">💰</span></div>' +
    '    <div class="stat-value" style="font-size:24px;color:#34D399;font-family:\'JetBrains Mono\',monospace;text-shadow:0 0 15px rgba(52,211,153,0.3);">' + formatRupiah(summary.totalAssetValue) + '</div>' +
    '    <div class="stat-meta">Akumulasi Nilai Modal FIFO Riil</div>' +
    '    <svg class="cyber-stat-sparkline" viewBox="0 0 100 30" preserveAspectRatio="none"><path d="M0,18 Q35,28 70,8 T100,22 L100,30 L0,30 Z" fill="rgba(16,185,129,0.15)"></path><path d="M0,18 Q35,28 70,8 T100,22" fill="none" stroke="#10B981" stroke-width="2"></path></svg>' +
    '  </div>' +
    '</div>' +
    '<!-- BILAH FILTER & AKSI INTERAKTIF -->' +
    '<div class="card" style="margin-bottom:20px;padding:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:280px;">' +
    '<input type="text" id="stock-val-search" placeholder="🔍 Cari varietas benih atau ID batch..." oninput="filterStockValuationTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:260px;background:var(--surface);">' +
    '<select id="stock-val-type-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);">' +
    '<option value="all">Semua Tipe Stok</option>' +
    '<option value="packed">Kemasan Sachet (Pcs)</option>' +
    '<option value="bulk">Baku / Curah (Gr)</option>' +
    '</select>' +
    '<select id="stock-val-status-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);background:rgba(15,23,42,0.95);color:#F8FAFC;">' +
    '<option value="all">Semua Peringatan / Status</option>' +
    '<option value="AMAN">🟢 Aman &amp; Segar</option>' +
    '<option value="MENIPIS">⚠️ Stok Menipis</option>' +
    '<option value="UJI_ULANG">🔬 Butuh Uji Semai Ulang</option>' +
    '<option value="KEDALUWARSA">⛔ Kedaluwarsa</option>' +
    '</select>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="loadStockValuationReport(true)" title="Segarkan Data">&#8635; Segarkan</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="openPeriodClosingWizard()" style="background:#2563EB;border-color:#2563EB;font-weight:700;" title="Tutup buku dan bekukan saldo akhir periode ini">⚡ Tutup Buku Periode</button>' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="printStockValuationA4()" title="Cetak Laporan Valuasi Aset Modal format A4 Resmi">🖨️ Cetak Valuasi Aset (A4)</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="printStockOpnameSheetA4()" title="Cetak Lembar Kerja Stock Opname Fisik format A4 (Harga disembunyikan)">📋 Cetak Lembar Opname Fisik (A4)</button>' +
    '</div>' +
    '</div>' +

    '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-sm);border:1px solid var(--border);">' +
    '<table id="stock-valuation-table" style="width:100%;min-width:1050px;border-collapse:collapse;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:40px;text-align:center;">No</th>' +
    '<th style="width:240px;">Varietas Benih</th>' +
    '<th style="width:130px;">Tipe</th>' +
    '<th style="width:180px;">Kode Batch FIFO</th>' +
    '<th style="width:110px;text-align:right;">Sisa Stok</th>' +
    '<th style="width:120px;text-align:right;">HPP Satuan</th>' +
    '<th style="width:130px;text-align:right;">Nilai Valuasi (Rp)</th>' +
    '<th style="width:160px;text-align:center;">Status &amp; Usia</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="stock-val-tbody"></tbody>' +
    '<tfoot id="stock-val-tfoot"></tfoot>' +
    '</table>' +
    '</div>' +
    '</div>';

  filterStockValuationTable();
}

function filterStockValuationTable() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items)) return;

  const searchEl = document.getElementById('stock-val-search');
  const typeEl = document.getElementById('stock-val-type-filter');
  const statusEl = document.getElementById('stock-val-status-filter');

  const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const type = typeEl ? typeEl.value : 'all';
  const status = statusEl ? statusEl.value : 'all';

  let filtered = STOCK_VALUATION_DATA.items;

  if (query) {
    filtered = filtered.filter(function (item) {
      const nameMatch = String(item.product_name || '').toLowerCase().includes(query);
      const batchMatch = String(item.batch_id || '').toLowerCase().includes(query);
      const prodIdMatch = String(item.product_id || '').toLowerCase().includes(query);
      return nameMatch || batchMatch || prodIdMatch;
    });
  }

  if (type !== 'all') {
    filtered = filtered.filter(function (item) {
      return item.type === type;
    });
  }

  if (status !== 'all') {
    filtered = filtered.filter(function (item) {
      return item.status === status;
    });
  }

  renderStockValuationRows(filtered);
  updateStockValuationFooter(filtered);
}

function renderStockValuationRows(items) {
  const tbody = document.getElementById('stock-val-tbody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada batch stok yang sesuai dengan filter atau kata kunci.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(function (item, idx) {
    let badgeHtml = '';
    if (item.status === 'KEDALUWARSA') {
      badgeHtml = '<span class="badge-stock-expired">⛔ Kedaluwarsa</span>';
    } else if (item.status === 'MENIPIS') {
      badgeHtml = '<span class="badge-stock-low">⚠️ Stok Menipis</span>';
    } else if (item.status === 'UJI_ULANG') {
      badgeHtml = '<span class="badge-stock-retest">🔬 Butuh Uji Ulang</span>';
    } else {
      badgeHtml = '<span class="badge-stock-safe">🟢 Aman &amp; Segar</span>';
    }

    const typeBadge = item.type === 'bulk'
      ? '<span class="badge badge-neutral" style="font-size:11px;background:#eef2f6;color:#334155;">🌾 Curah (' + escapeHtml(item.unit) + ')</span>'
      : '<span class="badge badge-neutral" style="font-size:11px;background:#e8f4fd;color:#0369a1;">📦 Sachet (' + escapeHtml(item.unit) + ')</span>';

    return '<tr>' +
      '<td style="text-align:center;font-size:12px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td>' +
      '<div style="font-weight:600;color:var(--text-main);font-size:12.5px;">' + escapeHtml(item.product_name) + '</div>' +
      '<div style="font-size:10.5px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;">ID: ' + escapeHtml(item.product_id) + '</div>' +
      '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td>' +
      '<code style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:var(--primary);">' + escapeHtml(item.batch_id) + '</code>' +
      '<div style="font-size:10.5px;color:var(--text-muted);">Exp: ' + escapeHtml(item.expiry_date || '-') + '</div>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-main);font-size:13px;">' +
      (Number(item.current_stock) || 0).toLocaleString('id-ID') + ' <span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">' + escapeHtml(item.unit) + '</span>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-size:12.5px;">' +
      formatRupiah(item.hpp_unit) +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);font-size:13px;background:rgba(46,125,50,0.04);">' +
      formatRupiah(item.total_value) +
      '</td>' +
      '<td style="text-align:center;">' +
      badgeHtml +
      '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Usia simpan: ' + item.age_days + ' hari</div>' +
      (item.status === 'UJI_ULANG'
        ? '<button type="button" class="btn btn-xs" style="margin-top:4px;background:#f59e0b;color:#ffffff;border:none;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;" onclick="openQCEntryModal(\'' + escapeHtml(item.batch_id) + '\', \'UJI_BERKALA\')">🔬 Uji Berkala</button>'
        : '') +
      '</td>' +
      '</tr>';
  }).join('');
}

function updateStockValuationFooter(items) {
  const tfoot = document.getElementById('stock-val-tfoot');
  if (!tfoot) return;

  items = items || [];
  const totalVal = items.reduce(function (sum, it) { return sum + Number(it.total_value || 0); }, 0);
  const totalBatches = items.length;

  tfoot.innerHTML =
    '<tr>' +
    '<th colspan="6" style="text-align:right;padding:12px;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:12.5px;">' +
    'TOTAL AKUMULASI NILAI ASET (' + totalBatches + ' Batch):' +
    '</th>' +
    '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);background:rgba(46,125,50,0.12);font-size:14px;">' +
    formatRupiah(totalVal) +
    '</th>' +
    '<th style="background:var(--surface-muted);"></th>' +
    '</tr>';
}

function printStockValuationA4() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items)) {
    showToast('Data laporan stok belum siap untuk dicetak.', true);
    return;
  }

  const s = APP_SETTINGS || {};
  const storeName = s.store_name || 'Toko Kasir & Inventaris';
  const storeAddress = s.store_address || 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = s.store_phone || '';
  const storeLogo = s.store_logo || s.store_logo_light || '';

  const summary = STOCK_VALUATION_DATA.summary || {};
  const items = STOCK_VALUATION_DATA.items || [];

  let bulkStr = '0 gr';
  if (Number(summary.totalBulkGrams) >= 1000) {
    bulkStr = ((Number(summary.totalBulkGrams) || 0) / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg';
  } else if (Number(summary.totalBulkGrams) > 0) {
    bulkStr = (Number(summary.totalBulkGrams) || 0).toLocaleString('id-ID') + ' gr';
  }

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const logoHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:180px;display:block;margin:0 auto 6px auto;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  const rowsHtml = items.map(function (it, idx) {
    return '<tr>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;"><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (it.type === 'bulk' ? 'Curah' : 'Sachet') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-family:monospace;font-size:10px;">' + escapeHtml(it.batch_id) + '<br><span style="color:#666;">Exp: ' + escapeHtml(it.expiry_date || '-') + '</span></td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;">' + (Number(it.current_stock) || 0).toLocaleString('id-ID') + ' ' + escapeHtml(it.unit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(it.hpp_unit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;color:#1e7e34;">' + formatRupiah(it.total_value) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;font-size:10px;">' + escapeHtml(it.status) + ' (' + it.age_days + ' hr)</td>' +
      '</tr>';
  }).join('');

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:14px;">' +
    logoHtml +
    '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
    '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;color:#111827;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:0.5px;">' +
    'LAPORAN VALUASI ASET &amp; POSISI STOK BENIH' +
    '</div>' +
    '<div style="font-size:10.5px;color:#666;margin-top:4px;">' +
    'Dicetak Pada: ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' &bull; Oleh: ' + escapeHtml(CURRENT_USER ? CURRENT_USER.name : 'Kasir / Admin Toko') +
    '</div>' +
    '</div>' +

    '<!-- 4 KOTAK KPI RINGKASAN HORIZONTAL -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px;">' +
    '<tr>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Varietas Aktif:</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;font-weight:bold;font-family:monospace;">' + (summary.totalVarieties || 0) + ' Jenis Tanaman</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Sachet Siap Jual:</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;font-weight:bold;font-family:monospace;">' + (summary.totalPackedPcs || 0).toLocaleString('id-ID') + ' pcs</td>' +
    '</tr>' +
    '<tr>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;background:#f9f9f9;">Total Benih Curah:</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;font-family:monospace;">' + bulkStr + '</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;background:#f9f9f9;">Total Valuasi Aset Modal:</td>' +
    '<td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;color:#1e7e34;font-family:monospace;">' + formatRupiah(summary.totalAssetValue || 0) + '</td>' +
    '</tr>' +
    '</table>' +

    '<!-- TABEL RINCIAN VALUASI ASET PER BATCH -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
    '<thead>' +
    '<tr style="background:#f0f0f0;">' +
    '<th style="border:1px solid #ddd;padding:4px;width:28px;">No</th>' +
    '<th style="border:1px solid #ddd;padding:4px;">Varietas Benih</th>' +
    '<th style="border:1px solid #ddd;padding:4px;width:60px;">Tipe</th>' +
    '<th style="border:1px solid #ddd;padding:4px;width:140px;">Kode Batch FIFO</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:80px;">Sisa Stok</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:75px;">HPP Satuan</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:95px;">Nilai Valuasi (Rp)</th>' +
    '<th style="border:1px solid #ddd;padding:4px;text-align:center;width:85px;">Status</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (rowsHtml || '<tr><td colspan="8" style="border:1px solid #ddd;text-align:center;padding:10px;">Tidak ada batch persediaan aktif.</td></tr>') +
    '</tbody>' +
    '<tfoot>' +
    '<tr style="background:#f0f0f0;font-weight:bold;">' +
    '<td colspan="6" style="border:1px solid #ddd;padding:6px;text-align:right;">TOTAL AKUMULASI NILAI ASET MODAL:</td>' +
    '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;color:#1e7e34;font-size:11.5px;">' + formatRupiah(summary.totalAssetValue || 0) + '</td>' +
    '<td style="border:1px solid #ddd;padding:6px;"></td>' +
    '</tr>' +
    '</tfoot>' +
    '</table>' +

    '<!-- 2 KOLOM TANDA TANGAN PENGESAHAN -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:28px;padding:0 24px;font-size:11px;color:#111827;page-break-inside:avoid;">' +
    '<div style="text-align:center;width:220px;">' +
    '<div>Dibuat Oleh,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Kasir / Pengelola Persediaan</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
    '</div>' +
    '<div style="text-align:center;width:220px;">' +
    '<div>Diketahui Oleh,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Manajer Toko</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  document.body.classList.add('printing-stock-report');

  const cleanup = function () {
    document.body.classList.remove('printing-stock-report');
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 2000);
}

function printStockOpnameSheetA4() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items) || STOCK_VALUATION_DATA.items.length === 0) {
    showToast('Menyiapkan lembar kerja stock opname fisik persediaan...');
    api('getStockValuationReport', TOKEN).then(function (res) {
      if (res && res.success && Array.isArray(res.items)) {
        STOCK_VALUATION_DATA = res;
        printStockOpnameSheetA4();
      } else {
        showToast('Gagal memuat persediaan untuk lembar opname.', true);
      }
    }).catch(function (err) {
      showToast('Gagal memuat persediaan: ' + (err.message || err), true);
    });
    return;
  }

  const s = APP_SETTINGS || {};
  const storeName = s.store_name || 'Toko Kasir & Inventaris';
  const storeAddress = s.store_address || 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = s.store_phone || '';
  const storeLogo = s.store_logo || s.store_logo_light || '';

  const items = STOCK_VALUATION_DATA.items || [];

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const logoHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:180px;display:block;margin:0 auto 6px auto;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  // Baris tabel opname (SEMUA HARGA / HPP / VALUASI UANG DISEMBUNYIKAN)
  const rowsHtml = items.map(function (it, idx) {
    return '<tr>' +
      '<td style="border:1px solid #333;padding:5px 3px;text-align:center;font-size:10px;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;font-size:10.5px;"><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
      '<td style="border:1px solid #333;padding:5px 4px;text-align:center;font-size:10px;">' + escapeHtml(it.unit) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;font-family:monospace;font-size:10px;">' + escapeHtml(it.batch_id) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;text-align:right;font-family:monospace;font-size:11px;font-weight:bold;">' + (Number(it.current_stock) || 0).toLocaleString('id-ID') + '</td>' +
      '<td style="border:1px solid #333;padding:4px;width:75px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
      '<td style="border:1px solid #333;padding:4px;width:65px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
      '<td style="border:1px solid #333;padding:4px;width:120px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
      '</tr>';
  }).join('');

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:12px;">' +
    logoHtml +
    '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
    '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;color:#111827;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:0.5px;">' +
    'LEMBAR STOCK OPNAME FISIK PERSEDIAAN BENIH' +
    '</div>' +
    '<div style="font-size:10.5px;color:#666;margin-top:4px;">' +
    'Tanggal Audit: ___________________ &bull; Lokasi Gudang: Gudang Utama &bull; Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
    '</div>' +
    '</div>' +

    '<div style="font-size:10px;color:#555;margin-bottom:8px;padding:4px 8px;background:#fdf6e2;border-left:3px solid #b78103;">' +
    '<strong>Petunjuk Checker:</strong> Hitung kuantitas fisik riil di rak/wadah penyimpanan, tuliskan angka hasil hitung pada kolom <em>Hitungan Fisik Nyata</em>, hitung selisihnya (+/-), dan catat kondisi kemasan jika ada kerusakan.' +
    '</div>' +

    '<!-- TABEL PENGHITUNGAN FISIK LAPANGAN -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
    '<thead>' +
    '<tr style="background:#f0f0f0;">' +
    '<th style="border:1px solid #333;padding:5px 3px;width:26px;text-align:center;">No</th>' +
    '<th style="border:1px solid #333;padding:5px 6px;text-align:left;">Varietas Benih</th>' +
    '<th style="border:1px solid #333;padding:5px 4px;width:55px;text-align:center;">Kemasan</th>' +
    '<th style="border:1px solid #333;padding:5px 6px;width:150px;text-align:left;">Kode Batch FIFO</th>' +
    '<th style="border:1px solid #333;padding:5px 6px;width:75px;text-align:right;">Stok Sistem</th>' +
    '<th style="border:1px solid #333;padding:5px 4px;width:75px;text-align:center;background:#e9f5e9;">Hitungan Fisik Nyata</th>' +
    '<th style="border:1px solid #333;padding:5px 4px;width:65px;text-align:center;background:#fff8e1;">Selisih (+/-)</th>' +
    '<th style="border:1px solid #333;padding:5px 4px;width:120px;text-align:center;">Catatan Kondisi Fisik</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (rowsHtml || '<tr><td colspan="8" style="border:1px solid #333;text-align:center;padding:10px;">Tidak ada batch persediaan aktif untuk diopname.</td></tr>') +
    '</tbody>' +
    '</table>' +

    '<!-- 2 KOLOM TANDA TANGAN AUDIT OPNAME -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:24px;padding:0 30px;font-size:11px;color:#111827;page-break-inside:avoid;">' +
    '<div style="text-align:center;width:220px;">' +
    '<div>Petugas Hitung Lapangan,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Checker Fisik Opname</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Nama: ________________</div>' +
    '</div>' +
    '<div style="text-align:center;width:220px;">' +
    '<div>Disaksikan &amp; Diperiksa Oleh,</div>' +
    '<div style="font-weight:700;margin-top:2px;">Saksi / Pemeriksa Opname</div>' +
    '<div style="height:55px;"></div>' +
    '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
    '<div style="font-size:10px;color:#666;margin-top:3px;">Nama: ________________</div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  document.body.classList.add('printing-stock-report');

  const cleanup = function () {
    document.body.classList.remove('printing-stock-report');
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(function () {
    window.print();
  }, 350);
}

// ==============================================================================
// MODUL CUT-OFF & TUTUP BUKU PERIODE AKUNTANSI (PERIOD CLOSING & SNAPSHOT)
// ==============================================================================

function loadPeriodClosingReport(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  CURRENT_LAPORAN_VIEW = 'period_closing';

  content.innerHTML =
    '<div class="card">' +
    '<div class="empty-state">' +
    '<span class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:10px;"></span><br>' +
    'Memuat riwayat tutup buku dan arsip snapshot periode akuntansi...' +
    '</div>' +
    '</div>';

  setProgressLoading(true);
  api('getAccountingPeriods', TOKEN).then(function (periods) {
    setProgressLoading(false);
    ACCOUNTING_PERIODS_CACHE = Array.isArray(periods) ? periods : [];
    drawPeriodClosingUI();
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal memuat periode tutup buku: ' + (err.message || err), true);
    drawPeriodClosingUI();
  });
}

function drawPeriodClosingUI() {
  const content = document.getElementById('content');
  if (!content) return;

  const periods = ACCOUNTING_PERIODS_CACHE || [];
  const closedPeriods = periods.filter(function (p) { return p.status === 'CLOSED'; });
  const latestClosed = closedPeriods.length > 0 ? closedPeriods[0] : null;

  // Nama bulan saat ini
  const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  const currentMonthName = monthNamesIndo[now.getMonth()] + ' ' + now.getFullYear();

  let latestCutoffStr = 'Belum Ada Periode Ditutup';
  if (latestClosed && latestClosed.cut_off_date) {
    latestCutoffStr = formatDateIndo(latestClosed.cut_off_date) + ' (' + escapeHtml(latestClosed.period_name) + ')';
  }

  const tableRowsHtml = periods.length > 0 ? periods.map(function (p, idx) {
    const isClosed = (p.status || 'CLOSED') === 'CLOSED';
    const statusBadge = isClosed
      ? '<span class="badge badge-success" style="font-weight:700;"><i class="fas fa-lock" style="font-size:10px;margin-right:4px;"></i> CLOSED</span>'
      : '<span class="badge badge-warning" style="font-weight:700;"><i class="fas fa-unlock" style="font-size:10px;margin-right:4px;"></i> REOPENED</span>';

    const omzetDisplay = formatRupiah(p.total_revenue || 0);
    const hppDisplay = formatRupiah(p.total_cogs || 0);
    const marginDisplay = (p.gross_margin_pct !== undefined && p.gross_margin_pct !== null)
      ? (Number(p.gross_margin_pct || 0) + '%')
      : '-';
    const valuasiDisplay = formatRupiah(p.total_inventory_valuation || 0);
    const dateRangeStr = formatDate(p.start_date) + ' s/d ' + formatDate(p.cut_off_date);

    return '<tr>' +
      '<td style="text-align:center;font-size:11px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td>' +
      '  <div style="font-weight:700;color:var(--primary);font-size:13px;">' + escapeHtml(p.period_name) + '</div>' +
      '  <div style="font-size:11px;color:var(--text-secondary);">' + dateRangeStr + '</div>' +
      '</td>' +
      '<td style="font-size:12px;font-family:monospace;">' + formatDateIndo(p.cut_off_date) + '</td>' +
      '<td style="text-align:right;font-weight:700;font-family:monospace;color:var(--text-main);">' + omzetDisplay + '</td>' +
      '<td style="text-align:right;font-family:monospace;color:var(--text-secondary);">' + hppDisplay + '</td>' +
      '<td style="text-align:center;font-weight:600;color:var(--success);">' + marginDisplay + '</td>' +
      '<td style="text-align:right;font-weight:700;font-family:monospace;color:var(--primary);">' + valuasiDisplay + '</td>' +
      '<td style="font-size:12px;">' + escapeHtml(p.closed_by || 'Admin Toko') + '</td>' +
      '<td style="text-align:center;">' + statusBadge + '</td>' +
      '<td style="text-align:right;">' +
      '  <div style="display:flex;justify-content:flex-end;gap:5px;flex-wrap:wrap;">' +
      '    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadPeriodJSON(\'' + p.id + '\')" title="Unduh snapshot arsip murni .JSON" style="padding:3px 8px;font-size:11px;"><i class="fas fa-file-code" style="color:#2563eb;margin-right:3px;"></i> .JSON</button>' +
      '    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadPeriodExcel(\'' + p.id + '\')" title="Unduh lembar kerja Excel multi-sheet" style="padding:3px 8px;font-size:11px;"><i class="fas fa-file-excel" style="color:#16a34a;margin-right:3px;"></i> Excel</button>' +
      '    <button type="button" class="btn btn-secondary btn-sm" onclick="printPeriodMinutes(\'' + p.id + '\')" title="Cetak Berita Acara Tutup Buku resmi format A4" style="padding:3px 8px;font-size:11px;"><i class="fas fa-print" style="margin-right:3px;"></i> Berita Acara</button>' +
      '    <button type="button" class="btn btn-secondary btn-sm" onclick="viewPeriodSnapshotDetail(\'' + p.id + '\')" title="Lihat rincian saldo awal stok yang dibekukan" style="padding:3px 8px;font-size:11px;">👁️ Rincian</button>' +
      '    <button type="button" class="btn btn-danger btn-sm" onclick="reopenPeriodModal(\'' + p.id + '\')" title="Buka kembali periode (khusus audit darurat)" style="padding:3px 6px;font-size:11px;">🔓</button>' +
      '  </div>' +
      '</td>' +
      '</tr>';
  }).join('') :
    '<tr><td colspan="10"><div style="text-align:center;padding:36px;color:var(--text-secondary);">' +
    '  <div style="font-size:32px;margin-bottom:8px;">🔒</div>' +
    '  <div style="font-weight:700;font-size:14px;color:var(--text-main);margin-bottom:4px;">Belum Ada Periode yang Ditutup Buku</div>' +
    '  <div style="font-size:12px;max-width:480px;margin:0 auto 14px auto;">Lakukan penutupan buku akhir bulan untuk membekukan saldo awal persediaan, mencegah pengeditan data mundur, dan mengunduh berkas arsip .JSON serta Excel resmi.</div>' +
    '  <button type="button" class="btn btn-primary" onclick="openPeriodClosingWizard()" style="background:#2563EB;border-color:#2563EB;font-weight:700;">⚡ Tutup Buku Periode Pertama Sekarang</button>' +
    '</div></td></tr>';

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">🔒 Tutup Buku &amp; Cut-Off Periode</h1>' +
    '<p class="page-subtitle">Manajemen penutupan siklus akuntansi berkala, pembekuan data transaksi lama, dan arsip snapshot saldo awal inventaris.</p>' +
    '</div>' +
    '</div>' +

    '<!-- SWITCHER TAB UTAMA MODUL LAPORAN -->' +
    '<div class="laporan-nav-switcher">' +
    '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'sales\')">📈 Laporan Penjualan &amp; Margin FIFO</button>' +
    '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi Aset</button>' +
    '<button type="button" class="laporan-nav-tab-btn active" onclick="switchLaporanMainView(\'period_closing\')">🔒 Tutup Buku &amp; Cut-Off Periode</button>' +
    '</div>' +

    '<!-- 4 KARTU RINGKASAN STATUS CLOSING -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:18px;">' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Periode Terkunci Terakhir</span><span class="stat-icon">🔒</span></div>' +
    '<div class="stat-value" style="font-size:16px;color:var(--text-main);font-weight:700;line-height:1.4;">' + escapeHtml(latestCutoffStr) + '</div>' +
    '<div class="stat-meta">Transaksi pada/sebelum cut-off telah dibekukan</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Status Pembukuan Saat Ini</span><span class="stat-icon">🟢</span></div>' +
    '<div class="stat-value" style="font-size:20px;color:var(--success);font-weight:800;">Periode Terbuka</div>' +
    '<div class="stat-meta">Aktif Berjalan: ' + escapeHtml(currentMonthName) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Total Periode Terarsip</span><span class="stat-icon">📚</span></div>' +
    '<div class="stat-value" style="font-size:24px;color:var(--primary);font-family:monospace;">' + periods.length + ' Periode</div>' +
    '<div class="stat-meta">' + closedPeriods.length + ' berstatus terkunci permanen</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header"><span class="stat-label">Format Cadangan Digital</span><span class="stat-icon">💾</span></div>' +
    '<div class="stat-value" style="font-size:18px;color:#2563EB;font-weight:700;">.JSON &amp; Excel</div>' +
    '<div class="stat-meta">Tersedia unduh offline kapan saja</div>' +
    '</div>' +
    '</div>' +

    '<!-- KARTU TABEL RIWAYAT TUTUP BUKU -->' +
    '<div class="card" style="padding:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
    '  <div>' +
    '    <h3 style="font-size:16px;font-weight:700;color:var(--primary);display:flex;align-items:center;gap:6px;margin:0 0 2px 0;">' +
    '      <span>📋</span> Riwayat Tutup Buku &amp; Arsip Snapshot Saldo' +
    '    </h3>' +
    '    <div style="font-size:11.5px;color:var(--text-secondary);">Daftar periode akuntansi resmi yang telah dibekukan lengkap dengan tombol unduh berkas .JSON dan Excel.</div>' +
    '  </div>' +
    '  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="loadPeriodClosingReport(true)">&#8635; Segarkan</button>' +
    '    <button type="button" class="btn btn-primary btn-sm" onclick="openPeriodClosingWizard()" style="background:#2563EB;border-color:#2563EB;font-weight:700;">⚡ Tutup Buku Periode Ini</button>' +
    '  </div>' +
    '</div>' +

    '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-sm);border:1px solid var(--border);">' +
    '<table style="width:100%;min-width:1150px;border-collapse:collapse;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:40px;text-align:center;">#</th>' +
    '<th style="width:220px;">Nama Periode</th>' +
    '<th style="width:140px;">Tgl Cut-Off</th>' +
    '<th style="width:130px;text-align:right;">Omzet Penjualan</th>' +
    '<th style="width:120px;text-align:right;">HPP Modal FIFO</th>' +
    '<th style="width:80px;text-align:center;">Margin</th>' +
    '<th style="width:140px;text-align:right;">Valuasi Stok Terkunci</th>' +
    '<th style="width:110px;">Ditutup Oleh</th>' +
    '<th style="width:100px;text-align:center;">Status</th>' +
    '<th style="width:260px;text-align:right;">Arsip &amp; Dokumen</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + tableRowsHtml + '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>';
}

function openPeriodClosingWizard() {
  const monthNamesIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();

  // Rekomendasi periode default: jika tanggal 1-5, rekomendasikan bulan lalu; jika > 5, bulan berjalan
  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();
  if (now.getDate() <= 5) {
    targetMonth = now.getMonth() - 1;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    }
  }

  const defaultPeriodName = 'Tutup Buku Periode ' + monthNamesIndo[targetMonth] + ' ' + targetYear;

  // Tanggal awal & akhir bulan target
  const startDay = new Date(targetYear, targetMonth, 1);
  const endDay = new Date(targetYear, targetMonth + 1, 0);

  const startStr = targetYear + '-' + String(targetMonth + 1).padStart(2, '0') + '-01';
  const endStr = targetYear + '-' + String(targetMonth + 1).padStart(2, '0') + '-' + String(endDay.getDate()).padStart(2, '0');
  const cutoffDateTimeDefault = endStr + 'T23:59';

  const bodyHtml =
    '<div style="margin-bottom:14px;background:#F8FAFC;border:1px solid #E2E8F0;padding:12px 16px;border-radius:var(--radius-sm);">' +
    '  <div style="font-weight:700;color:#2563EB;font-size:13px;margin-bottom:4px;display:flex;align-items:center;gap:6px;">' +
    '    <span>🔒</span> Panduan Penutupan Buku Periode' +
    '  </div>' +
    '  <div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">' +
    '    Sistem akan merekapitulasi total omzet, HPP FIFO, dan mengambil <strong>snapshot permanen seluruh saldo aset benih</strong> per tanggal cut-off. ' +
    '    Data ini akan dibekukan sebagai <strong>Saldo Awal resmi</strong> periode berikutnya dan dapat diunduh dalam format <strong>.JSON</strong> maupun <strong>Excel</strong>.' +
    '  </div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '  <div>' +
    '    <label class="field-label">Nama Periode Tutup Buku <span style="color:#ef4444;">*</span></label>' +
    '    <div class="input-wrapper">' +
    '      <input type="text" id="closing-period-name" value="' + escapeHtml(defaultPeriodName) + '" placeholder="Contoh: Tutup Buku Periode Oktober 2026" style="padding-left:14px;font-weight:600;">' +
    '    </div>' +
    '  </div>' +
    '  <div>' +
    '    <label class="field-label">Nama Petugas / Penanggung Jawab <span style="color:#ef4444;">*</span></label>' +
    '    <div class="input-wrapper">' +
    '      <input type="text" id="closing-admin-name" value="Admin Toko" placeholder="Nama Admin" style="padding-left:14px;">' +
    '    </div>' +
    '  </div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '  <div>' +
    '    <label class="field-label">Tanggal Awal Periode <span style="color:#ef4444;">*</span></label>' +
    '    <div class="input-wrapper">' +
    '      <input type="date" id="closing-start-date" value="' + startStr + '" style="padding-left:14px;" onchange="calculateWizardClosingPreview()">' +
    '    </div>' +
    '  </div>' +
    '  <div>' +
    '    <label class="field-label">Tanggal &amp; Jam Batas Cut-Off <span style="color:#ef4444;">*</span></label>' +
    '    <div class="input-wrapper">' +
    '      <input type="datetime-local" id="closing-cutoff-date" value="' + cutoffDateTimeDefault + '" style="padding-left:14px;" onchange="calculateWizardClosingPreview()">' +
    '    </div>' +
    '    <small style="font-size:11px;color:var(--text-secondary);">Semua transaksi pada/sebelum waktu ini akan dikunci dari pengeditan.</small>' +
    '  </div>' +
    '</div>' +

    '<!-- KOTAK PRATINJAU OTOMATIS LIVE (KALKULASI SISTEM) -->' +
    '<div id="closing-wizard-preview" style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:var(--radius-sm);padding:14px;margin-bottom:14px;">' +
    '  <div style="font-size:11.5px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;">' +
    '    <span>📊 Pratinjau Rekapitulasi Pembukuan &amp; Snapshot</span>' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="calculateWizardClosingPreview()" style="font-size:10.5px;padding:2px 8px;">🔄 Hitung Ulang</button>' +
    '  </div>' +
    '  <div id="closing-preview-body">' +
    '    <div style="text-align:center;padding:12px;color:var(--text-secondary);font-size:12px;">Menghitung posisi angka keuangan dan sisa inventaris...</div>' +
    '  </div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:14px;">' +
    '  <label class="field-label">Catatan Resmi / Memo Penutupan Buku</label>' +
    '  <div class="input-wrapper">' +
    '    <textarea id="closing-notes" rows="2" placeholder="Contoh: Seluruh rekonsiliasi kasir POS dan stok fisik toples telah diverifikasi tanpa selisih." style="padding:8px 12px;width:100%;border:1px solid var(--border);border-radius:var(--radius-xs);font-size:12px;resize:vertical;"></textarea>' +
    '  </div>' +
    '</div>' +

    '<div style="background:#FFFBEB;border:1px solid #FDE68A;padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:16px;">' +
    '  <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;margin:0;font-size:12px;font-weight:600;color:#92400E;">' +
    '    <input type="checkbox" id="closing-confirm-check" style="width:18px;height:18px;margin-top:2px;accent-color:#92400E;cursor:pointer;">' +
    '    <span>Saya mengonfirmasi bahwa data keuangan dan stok fisik periode ini telah direkonsiliasi. Saya memahami bahwa data transaksi pada atau sebelum tanggal cut-off akan dibekukan.</span>' +
    '  </label>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-closing" onclick="submitPeriodClosing()" style="background:#2563EB;border-color:#2563EB;font-weight:700;">🔒 Kunci &amp; Terbitkan Saldo Awal</button>';

  openModal('Wizard Tutup Buku &amp; Cut-Off Periode', bodyHtml, footerHtml);
  calculateWizardClosingPreview();
}

function calculateWizardClosingPreview() {
  const previewBody = document.getElementById('closing-preview-body');
  if (!previewBody) return;

  const startEl = document.getElementById('closing-start-date');
  const cutoffEl = document.getElementById('closing-cutoff-date');
  const sDate = startEl ? startEl.value : '';
  const cDateTime = cutoffEl ? cutoffEl.value : '';
  const cDateOnly = cDateTime ? cDateTime.slice(0, 10) : '';

  previewBody.innerHTML = '<div style="text-align:center;padding:10px;"><span class="sync-spinner" style="display:inline-block;width:16px;height:16px;margin-right:6px;"></span> Mengkalkulasi angka riil periode...</div>';

  Promise.all([
    api('getReport', TOKEN, 'custom', sDate, cDateOnly),
    api('getStockValuationReport', TOKEN)
  ]).then(function (results) {
    const repData = results[0] || {};
    const stockData = results[1] || {};

    const repSummary = repData.summary || {
      totalSubtotal: repData.totalSubtotalRevenue || repData.netRevenue || repData.totalRevenue || 0,
      totalCost: repData.totalCost || 0,
      grossMargin: repData.grossMargin || 0,
      grossMarginPct: repData.grossMarginPct || 0,
      totalTransactions: repData.totalTransactions || 0
    };

    const stockSummary = stockData.summary || {
      totalVarieties: 0,
      totalPackedPcs: 0,
      totalBulkGrams: 0,
      totalAssetValue: 0
    };

    CURRENT_CLOSING_WIZARD_DATA = {
      revenue: Number(repSummary.totalSubtotal || 0),
      cogs: Number(repSummary.totalCost || 0),
      grossProfit: Number(repSummary.grossMargin || 0),
      grossMarginPct: Number(repSummary.grossMarginPct || 0),
      totalTransactions: Number(repSummary.totalTransactions || 0),
      stockValuation: Number(stockSummary.totalAssetValue || 0),
      totalVarieties: Number(stockSummary.totalVarieties || 0),
      stockItems: stockData.items || [],
      repData: repData
    };

    previewBody.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;text-align:center;">' +
      '  <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-xs);border:1px solid #CBD5E1;">' +
      '    <div style="font-size:10.5px;color:var(--text-secondary);font-weight:700;">TOTAL OMZET</div>' +
      '    <div style="font-size:14px;font-weight:800;color:var(--text-main);font-family:monospace;margin-top:2px;">' + formatRupiah(CURRENT_CLOSING_WIZARD_DATA.revenue) + '</div>' +
      '    <div style="font-size:10px;color:var(--text-muted);">' + CURRENT_CLOSING_WIZARD_DATA.totalTransactions + ' Nota</div>' +
      '  </div>' +
      '  <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-xs);border:1px solid #CBD5E1;">' +
      '    <div style="font-size:10.5px;color:var(--text-secondary);font-weight:700;">HPP FIFO TERJUAL</div>' +
      '    <div style="font-size:14px;font-weight:800;color:var(--text-secondary);font-family:monospace;margin-top:2px;">' + formatRupiah(CURRENT_CLOSING_WIZARD_DATA.cogs) + '</div>' +
      '    <div style="font-size:10px;color:var(--text-muted);">Biaya Pokok Modal</div>' +
      '  </div>' +
      '  <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-xs);border:1px solid #CBD5E1;">' +
      '    <div style="font-size:10.5px;color:var(--text-secondary);font-weight:700;">LABA KOTOR (EST.)</div>' +
      '    <div style="font-size:14px;font-weight:800;color:var(--success);font-family:monospace;margin-top:2px;">' + formatRupiah(CURRENT_CLOSING_WIZARD_DATA.grossProfit) + '</div>' +
      '    <div style="font-size:10px;color:var(--success);font-weight:700;">Margin ' + CURRENT_CLOSING_WIZARD_DATA.grossMarginPct + '%</div>' +
      '  </div>' +
      '  <div style="background:#fff;padding:8px 10px;border-radius:var(--radius-xs);border:1px solid #CBD5E1;">' +
      '    <div style="font-size:10.5px;color:var(--text-secondary);font-weight:700;">VALUASI ASET SISA</div>' +
      '    <div style="font-size:14px;font-weight:800;color:var(--primary);font-family:monospace;margin-top:2px;">' + formatRupiah(CURRENT_CLOSING_WIZARD_DATA.stockValuation) + '</div>' +
      '    <div style="font-size:10px;color:var(--text-muted);">' + CURRENT_CLOSING_WIZARD_DATA.stockItems.length + ' Lot / Batch</div>' +
      '  </div>' +
      '</div>';
  }).catch(function (err) {
    previewBody.innerHTML = '<div style="color:var(--danger);font-size:12px;padding:6px;">⚠️ Gagal mengkalkulasi pratinjau: ' + escapeHtml(err.message || err) + '</div>';
  });
}

function submitPeriodClosing() {
  const periodName = (document.getElementById('closing-period-name') ? document.getElementById('closing-period-name').value : '').trim();
  const adminName = (document.getElementById('closing-admin-name') ? document.getElementById('closing-admin-name').value : '').trim();
  const startDate = document.getElementById('closing-start-date') ? document.getElementById('closing-start-date').value : '';
  const cutoffDateTime = document.getElementById('closing-cutoff-date') ? document.getElementById('closing-cutoff-date').value : '';
  const notes = (document.getElementById('closing-notes') ? document.getElementById('closing-notes').value : '').trim();
  const confirmCheck = document.getElementById('closing-confirm-check');

  if (!periodName) {
    showToast('Nama Periode wajib diisi.', true);
    return;
  }
  if (!startDate || !cutoffDateTime) {
    showToast('Tanggal awal dan tanggal batas cut-off wajib diisi.', true);
    return;
  }
  if (!confirmCheck || !confirmCheck.checked) {
    showToast('Harap centang kotak konfirmasi sebelum menutup buku.', true);
    return;
  }

  const submitBtn = document.getElementById('btn-submit-closing');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="sync-spinner" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></span> Membekukan Saldo...';
  }

  showToast('Sedang memproses tutup buku & snapshot inventaris...', false);

  // Ambil data snapshot inventaris & produk lengkap
  const wiz = CURRENT_CLOSING_WIZARD_DATA || {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    stockValuation: 0,
    stockItems: []
  };

  const inventorySnapshot = (wiz.stockItems || []).map(function (item) {
    return {
      batch_id: item.id || '',
      batch_code: item.batch_code || '',
      product_name: item.product_name || '',
      category: item.category || 'Benih',
      product_type: item.product_type || 'raw_seed',
      unit: item.unit || 'pcs',
      qty_remaining: Number(item.qty_remaining || 0),
      buy_price: Number(item.buy_price || 0),
      asset_value: Number(item.asset_value || 0),
      expiry_date: item.expiry_date || '',
      quality_status: item.quality_status || 'NORMAL',
      qc_status: item.qc_status || 'APPROVED'
    };
  });

  const payload = {
    period_name: periodName,
    start_date: startDate,
    cut_off_date: new Date(cutoffDateTime).toISOString(),
    closed_by: adminName || 'Admin Toko',
    total_revenue: wiz.revenue,
    total_cogs: wiz.cogs,
    gross_profit: wiz.grossProfit,
    gross_margin_pct: wiz.grossMarginPct,
    total_inventory_valuation: wiz.stockValuation,
    total_items_count: inventorySnapshot.length,
    inventory_snapshot: inventorySnapshot,
    summary: {
      totalTransactions: wiz.totalTransactions,
      totalVarieties: wiz.totalVarieties,
      notes: notes
    },
    notes: notes
  };

  api('closeAccountingPeriod', TOKEN, payload).then(function (res) {
    const closedPeriod = (res && res.period) ? res.period : payload;
    showToast('Tutup buku "' + escapeHtml(periodName) + '" berhasil diselesaikan!', false);
    closeModal();
    loadPeriodClosingReport(true);
    showPeriodClosingSuccessModal(closedPeriod);
  }).catch(function (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '🔒 Kunci &amp; Terbitkan Saldo Awal';
    }
    showToast('Gagal menutup buku: ' + (err.message || err), true);
  });
}

function showPeriodClosingSuccessModal(period) {
  const pId = period.id || '';
  const bodyHtml =
    '<div style="text-align:center;padding:10px 0 16px 0;">' +
    '  <div style="width:56px;height:56px;background:#ecfdf5;color:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px auto;font-size:26px;">✓</div>' +
    '  <h3 style="font-size:18px;font-weight:800;color:var(--text-main);margin-bottom:6px;">Tutup Buku Periode Berhasil!</h3>' +
    '  <p style="font-size:13px;color:var(--text-secondary);max-width:440px;margin:0 auto 16px auto;">' +
    '    Periode <strong>' + escapeHtml(period.period_name) + '</strong> telah resmi dibekukan. ' +
    '    Snapshot saldo persediaan kini siap diunduh untuk kebutuhan arsip kantor maupun tim IT.' +
    '  </p>' +
    '  <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">' +
    '    <button type="button" class="btn btn-primary" onclick="downloadPeriodJSON(\'' + pId + '\')" style="background:#2563eb;border-color:#2563eb;font-weight:700;">' +
    '      <i class="fas fa-file-code" style="margin-right:6px;"></i> Unduh Berkas .JSON' +
    '    </button>' +
    '    <button type="button" class="btn btn-primary" onclick="downloadPeriodExcel(\'' + pId + '\')" style="background:#16a34a;border-color:#16a34a;font-weight:700;">' +
    '      <i class="fas fa-file-excel" style="margin-right:6px;"></i> Unduh Excel (.xlsx)' +
    '    </button>' +
    '    <button type="button" class="btn btn-secondary" onclick="printPeriodMinutes(\'' + pId + '\')">' +
    '      <i class="fas fa-print" style="margin-right:6px;"></i> Cetak Berita Acara' +
    '    </button>' +
    '  </div>' +
    '</div>';

  openModal('Tutup Buku Sukses', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>');
}

function downloadPeriodJSON(periodId) {
  const p = (ACCOUNTING_PERIODS_CACHE || []).find(function (x) { return String(x.id) === String(periodId); });
  if (!p) {
    showToast('Data periode tidak ditemukan.', true);
    return;
  }

  const exportObj = {
    metadata: {
      aplikasi: 'Sistem POS Terpadu',
      jenis_arsip: 'PERIOD_CUT_OFF_SNAPSHOT',
      periode_id: p.id,
      nama_periode: p.period_name,
      rentang_mulai: p.start_date,
      tanggal_cutoff: p.cut_off_date,
      waktu_tutup_buku: p.closed_at,
      eksekutor: p.closed_by || 'Admin Toko',
      status: p.status || 'CLOSED',
      diekspor_pada: new Date().toISOString()
    },
    ringkasan_keuangan: {
      total_omzet_penjualan: Number(p.total_revenue || 0),
      total_hpp_fifo: Number(p.total_cogs || 0),
      laba_kotor: Number(p.gross_profit || 0),
      margin_laba_pct: Number(p.gross_margin_pct || 0),
      total_valuasi_aset_stok: Number(p.total_inventory_valuation || 0),
      total_item_batch_terkunci: (p.inventory_snapshot || []).length
    },
    ringkasan_analitik: p.summary || {},
    catatan_resmi: p.notes || '',
    saldo_awal_persediaan_terkunci: p.inventory_snapshot || []
  };

  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const safeName = (p.period_name || 'periode').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const dateStr = String(p.cut_off_date || '').slice(0, 10);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'cut_off_' + safeName + '_' + dateStr + '.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Berkas snapshot JSON "' + p.period_name + '" berhasil diunduh.');
}

function downloadPeriodExcel(periodId) {
  const p = (ACCOUNTING_PERIODS_CACHE || []).find(function (x) { return String(x.id) === String(periodId); });
  if (!p) {
    showToast('Data periode tidak ditemukan.', true);
    return;
  }

  showToast('Menyiapkan berkas Excel (.xlsx)...');
  ensureXlsxLoaded().then(function (XLSX) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan_Periode
    const summaryRows = [
      ['PARAMETER AKUNTANSI', 'NILAI / DATA RESMI'],
      ['Nama Periode', p.period_name || ''],
      ['Tanggal Awal Periode', formatDate(p.start_date)],
      ['Tanggal & Waktu Cut-Off', formatDateIndo(p.cut_off_date)],
      ['Waktu Penutupan Buku', formatDateIndo(p.closed_at)],
      ['Penanggung Jawab / Admin', p.closed_by || 'Admin Toko'],
      ['Status Dokumen', p.status || 'CLOSED'],
      ['Total Omzet Penjualan (Rp)', Number(p.total_revenue || 0)],
      ['Total HPP Modal FIFO (Rp)', Number(p.total_cogs || 0)],
      ['Laba Kotor (Rp)', Number(p.gross_profit || 0)],
      ['Persentase Margin Laba', (p.gross_margin_pct || 0) + '%'],
      ['Total Valuasi Persediaan (Rp)', Number(p.total_inventory_valuation || 0)],
      ['Jumlah Batch Stok Terkunci', (p.inventory_snapshot || []).length],
      ['Catatan Memo', p.notes || '-']
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 50 }];

    // Sheet 2: Saldo_Awal_Persediaan
    const snapshotHeaders = [
      'No',
      'Kode_Batch',
      'Nama_Produk_Benih',
      'Kategori',
      'Tipe_Barang',
      'Satuan',
      'Sisa_Stok_Fisik',
      'HPP_Satuan_FIFO',
      'Total_Nilai_Modal',
      'Tgl_Kedaluwarsa',
      'Status_QC'
    ];

    const snapshotRows = [snapshotHeaders];
    const items = p.inventory_snapshot || [];
    items.forEach(function (it, idx) {
      snapshotRows.push([
        idx + 1,
        it.batch_code || it.batch_id || '',
        it.product_name || '',
        it.category || 'Benih',
        it.product_type || 'raw_seed',
        it.unit || 'pcs',
        Number(it.qty_remaining || 0),
        Number(it.buy_price || 0),
        Number(it.asset_value || 0),
        it.expiry_date || '',
        it.qc_status || 'APPROVED'
      ]);
    });

    const wsSnapshot = XLSX.utils.aoa_to_sheet(snapshotRows);
    wsSnapshot['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 34 },
      { wch: 14 },
      { wch: 14 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Periode');
    XLSX.utils.book_append_sheet(wb, wsSnapshot, 'Saldo_Awal_Persediaan');

    const safeName = (p.period_name || 'periode').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const dateStr = String(p.cut_off_date || '').slice(0, 10);
    XLSX.writeFile(wb, 'cut_off_' + safeName + '_' + dateStr + '.xlsx');

    showToast('Berkas Excel penutupan buku berhasil diunduh.');
  }).catch(function (err) {
    showToast('Gagal membuat berkas Excel: ' + (err.message || err), true);
  });
}

function printPeriodMinutes(periodId) {
  const p = (ACCOUNTING_PERIODS_CACHE || []).find(function (x) { return String(x.id) === String(periodId); });
  if (!p) {
    showToast('Data periode tidak ditemukan.', true);
    return;
  }

  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Toko Kasir & Inventaris';
  const items = p.inventory_snapshot || [];

  const printContainer = document.createElement('div');
  printContainer.id = 'print-period-minutes-container';
  printContainer.className = 'print-report-area';
  printContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#fff;z-index:999999;padding:25mm 20mm;font-family:Inter,sans-serif;color:#111;overflow-y:auto;box-sizing:border-box;';

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:12px;margin-bottom:16px;">' +
    '  <div style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#2563EB;">' + escapeHtml(storeName) + '</div>' +
    '  <div style="font-size:15px;font-weight:800;margin-top:4px;">BERITA ACARA TUTUP BUKU &amp; CUT-OFF PERIODE</div>' +
    '  <div style="font-size:12px;color:#555;margin-top:2px;">Ref. ID: ' + escapeHtml(p.id) + ' &bull; Tanggal Cetak: ' + formatDateIndo(new Date()) + '</div>' +
    '</div>' +

    '<div style="font-size:12px;line-height:1.6;margin-bottom:16px;">' +
    '  Pada hari ini telah dilaksanakan penutupan siklus buku dan pembekuan saldo inventaris fisik untuk periode:' +
    '  <div style="font-weight:800;font-size:14px;color:#2563EB;margin-top:4px;">' + escapeHtml(p.period_name) + '</div>' +
    '  <div style="color:#555;">Rentang Periode: ' + formatDate(p.start_date) + ' s/d ' + formatDateIndo(p.cut_off_date) + '</div>' +
    '</div>' +

    '<div style="font-weight:700;font-size:12.5px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;color:#2563EB;">A. Rekapitulasi Finansial &amp; Operasional</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:16px;border:1px solid #999;">' +
    '  <tbody>' +
    '    <tr style="background:#f4f6f8;"><td style="padding:6px 10px;font-weight:700;width:40%;border:1px solid #ccc;">Total Omzet Penjualan (POS &amp; Konsinyasi)</td><td style="padding:6px 10px;font-weight:800;border:1px solid #ccc;font-family:monospace;">' + formatRupiah(p.total_revenue) + '</td></tr>' +
    '    <tr><td style="padding:6px 10px;font-weight:700;border:1px solid #ccc;">Total HPP Modal FIFO Barang Terjual</td><td style="padding:6px 10px;border:1px solid #ccc;font-family:monospace;">' + formatRupiah(p.total_cogs) + '</td></tr>' +
    '    <tr style="background:#f4f6f8;"><td style="padding:6px 10px;font-weight:700;border:1px solid #ccc;">Laba Kotor Periode (Margin ' + (p.gross_margin_pct || 0) + '%)</td><td style="padding:6px 10px;font-weight:800;color:#16a34a;border:1px solid #ccc;font-family:monospace;">' + formatRupiah(p.gross_profit) + '</td></tr>' +
    '    <tr><td style="padding:6px 10px;font-weight:700;border:1px solid #ccc;">Total Valuasi Aset Stok Akhir (Saldo Awal Baru)</td><td style="padding:6px 10px;font-weight:800;color:#2563EB;border:1px solid #ccc;font-family:monospace;">' + formatRupiah(p.total_inventory_valuation) + '</td></tr>' +
    '    <tr style="background:#f4f6f8;"><td style="padding:6px 10px;font-weight:700;border:1px solid #ccc;">Jumlah Batch/Lot Inventaris Fisik Terkunci</td><td style="padding:6px 10px;border:1px solid #ccc;">' + items.length + ' Lot / Batch Benih</td></tr>' +
    '  </tbody>' +
    '</table>' +

    (p.notes ? ('<div style="font-size:11.5px;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;margin-bottom:16px;"><strong>Catatan Penutupan:</strong> ' + escapeHtml(p.notes) + '</div>') : '') +

    '<div style="font-size:11.5px;color:#555;margin-bottom:24px;line-height:1.5;">' +
    '  Dengan ditandatanganinya Berita Acara ini, seluruh mutasi transaksi belanja, konsinyasi, dan produksi sebelum batas cut-off dinyatakan sah dan dikunci. Data persediaan di atas resmi menjadi Saldo Awal (Opening Balance) untuk periode berikutnya.' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;text-align:center;font-size:11.5px;margin-top:20px;">' +
    '  <div>' +
    '    <div>Petugas Penutup Buku,</div>' +
    '    <div style="height:60px;"></div>' +
    '    <div style="font-weight:800;text-decoration:underline;">' + escapeHtml(p.closed_by || 'Admin Toko') + '</div>' +
    '    <div style="font-size:10px;color:#666;">Staff Administrasi / Toko</div>' +
    '  </div>' +
    '  <div>' +
    '    <div>Mengetahui &amp; Menyetujui,</div>' +
    '    <div style="height:60px;"></div>' +
    '    <div style="font-weight:800;text-decoration:underline;">(_____________________________)</div>' +
    '    <div style="font-size:10px;color:#666;">Direktur / Manajer Unit Kios</div>' +
    '  </div>' +
    '</div>';

  document.body.appendChild(printContainer);
  document.body.classList.add('printing-stock-report');

  const cleanup = function () {
    document.body.classList.remove('printing-stock-report');
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(function () {
    window.print();
  }, 350);
}

function viewPeriodSnapshotDetail(periodId) {
  const p = (ACCOUNTING_PERIODS_CACHE || []).find(function (x) { return String(x.id) === String(periodId); });
  if (!p) {
    showToast('Data periode tidak ditemukan.', true);
    return;
  }

  const items = p.inventory_snapshot || [];
  const rowsHtml = items.length > 0 ? items.map(function (it, idx) {
    return '<tr>' +
      '<td style="text-align:center;font-size:11px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td><code style="font-size:11px;">' + escapeHtml(it.batch_code || it.batch_id || '-') + '</code></td>' +
      '<td><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
      '<td style="font-size:11px;">' + escapeHtml(it.category || 'Benih') + '</td>' +
      '<td style="text-align:right;font-family:monospace;font-weight:700;">' + (it.qty_remaining || 0) + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
      '<td style="text-align:right;font-family:monospace;">' + formatRupiah(it.buy_price) + '</td>' +
      '<td style="text-align:right;font-family:monospace;font-weight:700;color:var(--primary);">' + formatRupiah(it.asset_value) + '</td>' +
      '<td style="font-size:11.5px;">' + escapeHtml(it.expiry_date || '-') + '</td>' +
      '<td style="text-align:center;"><span class="badge badge-success" style="font-size:10px;">' + escapeHtml(it.qc_status || 'APPROVED') + '</span></td>' +
      '</tr>';
  }).join('') : '<tr><td colspan="9" style="text-align:center;padding:16px;">Tidak ada rincian snapshot inventaris pada periode ini.</td></tr>';

  const bodyHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;background:#F8FAFC;padding:10px 14px;border-radius:var(--radius-sm);border:1px solid #E2E8F0;">' +
    '  <div>' +
    '    <div style="font-size:13px;font-weight:700;color:#2563EB;">' + escapeHtml(p.period_name) + '</div>' +
    '    <div style="font-size:11px;color:var(--text-secondary);">Cut-Off: ' + formatDateIndo(p.cut_off_date) + ' &bull; Total Valuasi: <strong>' + formatRupiah(p.total_inventory_valuation) + '</strong></div>' +
    '  </div>' +
    '  <div style="display:flex;gap:6px;">' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadPeriodJSON(\'' + p.id + '\')"><i class="fas fa-file-code" style="color:#2563eb;"></i> .JSON</button>' +
    '    <button type="button" class="btn btn-secondary btn-sm" onclick="downloadPeriodExcel(\'' + p.id + '\')"><i class="fas fa-file-excel" style="color:#16a34a;"></i> Excel</button>' +
    '  </div>' +
    '</div>' +
    '<div class="table-container" style="max-height:360px;overflow-y:auto;overflow-x:auto;border:1px solid var(--border);border-radius:var(--radius-sm);">' +
    '<table style="width:100%;min-width:760px;font-size:12px;border-collapse:collapse;">' +
    '<thead style="position:sticky;top:0;background:#fff;z-index:2;">' +
    '<tr><th>#</th><th>Kode Batch</th><th>Nama Varietas Benih</th><th>Kategori</th><th style="text-align:right;">Sisa Stok</th><th style="text-align:right;">HPP Modal</th><th style="text-align:right;">Total Valuasi</th><th>Kedaluwarsa</th><th style="text-align:center;">QC</th></tr>' +
    '</thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '</table>' +
    '</div>';

  openModal('Detail Snapshot Saldo Awal Terkunci', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>');
}

function reopenPeriodModal(periodId) {
  const p = (ACCOUNTING_PERIODS_CACHE || []).find(function (x) { return String(x.id) === String(periodId); });
  if (!p) return;

  const bodyHtml =
    '<div style="padding:10px 0;">' +
    '  <div style="font-size:13px;color:var(--text-main);margin-bottom:10px;">' +
    '    Apakah Anda yakin ingin <strong>membuka kembali (reopen)</strong> periode <strong>' + escapeHtml(p.period_name) + '</strong>?' +
    '  </div>' +
    '  <div style="background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;padding:10px 12px;border-radius:var(--radius-sm);font-size:11.5px;line-height:1.5;">' +
    '    ⚠️ <strong>Peringatan Keamanan Akuntansi:</strong> Membuka kunci periode akan menghapus arsip snapshot saldo awal dan mengizinkan kembali transaksi mundur. Tindakan ini hanya boleh dilakukan atas persetujuan manajer toko.' +
    '  </div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-danger" onclick="confirmReopenPeriod(\'' + p.id + '\')">Buka Kunci Periode</button>';

  openModal('Konfirmasi Buka Kunci Periode', bodyHtml, footerHtml);
}

function confirmReopenPeriod(periodId) {
  showToast('Membuka kunci periode...', false);
  api('reopenAccountingPeriod', TOKEN, periodId).then(function () {
    showToast('Periode berhasil dibuka kembali.');
    closeModal();
    loadPeriodClosingReport(true);
  }).catch(function (err) {
    showToast('Gagal membuka kunci: ' + (err.message || err), true);
  });
}

// Helper untuk memeriksa apakah suatu tanggal transaksi berada pada periode terkunci (Anti-Backdating)
function isDateLockedByClosing(dateStr) {
  if (!dateStr) return { locked: false };
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return { locked: false };

  const closed = (ACCOUNTING_PERIODS_CACHE || []).filter(function (p) { return p.status === 'CLOSED'; });
  for (let i = 0; i < closed.length; i++) {
    const cutoff = new Date(closed[i].cut_off_date);
    if (!isNaN(cutoff.getTime()) && targetDate <= cutoff) {
      return {
        locked: true,
        periodName: closed[i].period_name,
        cutOffDate: closed[i].cut_off_date
      };
    }
  }
  return { locked: false };
}


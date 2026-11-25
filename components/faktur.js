// ========================= RIWAYAT TRANSAKSI & FAKTUR =========================
function renderFaktur(forceRefresh, startDate, endDate) {
  const content = document.getElementById('content');
  if (!content) return;

  // Tentukan default rentang tanggal (30 hari terakhir)
  const now = new Date();
  const endDefault = now.toISOString().split('T')[0];
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const startDefault = past30.toISOString().split('T')[0];

  const actualStart = startDate || window._fakturStartDate || startDefault;
  const actualEnd = endDate || window._fakturEndDate || endDefault;

  window._fakturStartDate = actualStart;
  window._fakturEndDate = actualEnd;

  const cacheKey = 'recentInvoices_' + actualStart + '_' + actualEnd;
  const cached = getCachedData(cacheKey);

  if (!forceRefresh && cached) {
    drawFakturUI(cached);
    if (isCacheValid(cacheKey)) return;
  } else if (!cached) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat riwayat faktur transaksi periode ' + formatDate(actualStart) + ' s.d. ' + formatDate(actualEnd) + '...</div></div>';
  }

  api('getRecentTransactionsForInvoice', TOKEN, actualStart, actualEnd).then(function (list) {
    list = Array.isArray(list) ? list : [];
    setCachedData(cacheKey, list);
    DATA_CACHE.recentInvoices = { data: list, timestamp: Date.now() }; // fallback compat
    drawFakturUI(list);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat faktur: ' + (err.message || err), true);
    }
  });
}

function applyFakturDateFilter() {
  const startEl = document.getElementById('faktur-start-date');
  const endEl = document.getElementById('faktur-end-date');
  const start = startEl ? startEl.value : '';
  const end = endEl ? endEl.value : '';
  if (start && end && start > end) {
    showToast('Tanggal awal tidak boleh melebihi tanggal akhir.', true);
    return;
  }
  renderFaktur(true, start, end);
}

function resetFakturDateFilter() {
  const now = new Date();
  const endDefault = now.toISOString().split('T')[0];
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const startDefault = past30.toISOString().split('T')[0];
  renderFaktur(true, startDefault, endDefault);
}

function drawFakturUI(list) {
  const content = document.getElementById('content');
  if (!content) return;
  window._fakturTxList = list || [];

  // Hitung ringkasan statistik
  const validList = (list || []).filter(function (t) { return String(t.status).toUpperCase() !== 'VOID'; });
  const voidList = (list || []).filter(function (t) { return String(t.status).toUpperCase() === 'VOID'; });
  const totalOmzet = validList.reduce(function (sum, t) { return sum + (Number(t.total) || 0); }, 0);
  const adminUser = isAdmin();

  let totalGrossProfit = 0;
  if (adminUser) {
    totalGrossProfit = validList.reduce(function (sum, t) { return sum + (Number(t.gross_profit) || 0); }, 0);
  }
  const avgMargin = totalOmzet > 0 ? Math.round((totalGrossProfit / totalOmzet) * 100) : 0;

  const currentStart = window._fakturStartDate || '';
  const currentEnd = window._fakturEndDate || '';

  content.innerHTML =
    '<div class="page-header no-print" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
    '<div>' +
    '<h1 class="page-title" style="margin:0;font-size:18px;">Riwayat Transaksi &amp; Faktur</h1>' +
    '<p class="page-subtitle" style="margin:2px 0 0 0;font-size:12px;">Cetak faktur formal A4, simpan PDF, struk thermal kasir, dan kirim nota via WhatsApp.</p>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-secondary);">' +
    'Total: <strong style="color:var(--text-main);">' + list.length + ' Nota</strong>' +
    '</div>' +
    '</div>' +

    '<div class="faktur-master-grid" style="display:grid;grid-template-columns:360px 1fr;gap:16px;align-items:start;">' +
    '<div class="card faktur-list-card" style="max-height:86vh;overflow-y:auto;padding:14px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
    '<h3 style="font-size:14px;margin:0;">Daftar Transaksi</h3>' +
    '<span style="font-size:11px;color:var(--text-secondary);">' + list.length + ' Nota</span>' +
    '</div>' +

    // Bar Filter Rentang Tanggal
    '<div class="faktur-filter-bar" style="background:var(--surface-muted);padding:10px;border-radius:var(--radius-xs);border:1px solid var(--border);margin-bottom:10px;">' +
    '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px;">Periode Tanggal</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">' +
    '<div>' +
    '<label style="font-size:9px;color:var(--text-secondary);display:block;">Mulai:</label>' +
    '<input type="date" id="faktur-start-date" value="' + currentStart + '" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.16);border-radius:4px;background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:9px;color:var(--text-secondary);display:block;">Sampai:</label>' +
    '<input type="date" id="faktur-end-date" value="' + currentEnd + '" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid rgba(255,255,255,0.16);border-radius:4px;background:rgba(15,23,42,0.95);color:#F8FAFC;color-scheme:dark;">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;">' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="applyFakturDateFilter()" style="flex:1;padding:4px 8px;font-size:11px;">🔍 Filter</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetFakturDateFilter()" style="padding:4px 8px;font-size:11px;" title="Kembalikan ke 30 Hari Terakhir">🔄 30 Hari</button>' +
    '</div>' +
    '</div>' +

    // Bar Filter Pencarian & Status
    '<div style="margin-bottom:10px;display:flex;flex-direction:column;gap:6px;">' +
    '<input type="text" id="faktur-search-input" class="topbar-search" placeholder="Cari nota, pelanggan, cara bayar..." oninput="filterFakturList()" style="width:100%;">' +
    '<select id="faktur-status-filter" onchange="filterFakturList()" style="padding:6px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<option value="all">Semua Status Pembayaran</option>' +
    '<option value="paid">Lunas (Paid)</option>' +
    '<option value="partial">Cicilan / Tempo</option>' +
    '<option value="void">Dibatalkan (VOID)</option>' +
    '</select>' +
    '</div>' +
    '<div id="faktur-list-container" style="display:flex;flex-direction:column;gap:8px;"></div>' +
    '</div>' +
    '<div id="invoice-panel">' +
    '<div class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary);">' +
    '<div style="font-size:40px;margin-bottom:10px;">🧾</div>' +
    '<h3 style="font-size:16px;color:var(--text-main);margin-bottom:6px;">Pilih Transaksi</h3>' +
    '<p style="font-size:13px;">Klik salah satu nota di panel kiri untuk membuka faktur dan menu aksinya.</p>' +
    '</div>' +
    '</div>' +
    '</div>';

  filterFakturList();

  if (list && list.length > 0 && !SELECTED_FAKTUR_ID) {
    loadInvoicePreview(list[0].id);
  }
}


function renderFakturRows(list) {
  const container = document.getElementById('faktur-list-container');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">Tidak ada nota yang cocok.</div>';
    return;
  }

  const adminUser = isAdmin();
  container.innerHTML = list.map(function (t) {
    const isSelected = (SELECTED_FAKTUR_ID === t.id);
    const isVoid = String(t.status).toUpperCase() === 'VOID';

    let badge = '';
    if (isVoid) {
      badge = '<span class="badge badge-void" style="background:#DC2626;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">VOID</span>';
    } else if (t.status === 'paid') {
      badge = '<span class="badge badge-success">Lunas</span>';
    } else {
      badge = '<span class="badge badge-warning">Tempo</span>';
    }

    const clientName = t.customer_name || 'Umum';

    const cardStyle = isSelected
      ? 'padding:10px 12px;border:1.5px solid var(--primary);cursor:pointer;border-radius:var(--radius-sm);background:rgba(6,182,212,0.15);border-color:#06B6D4;box-shadow:0 0 14px rgba(6,182,212,0.22);transition:all 0.15s;'
      : 'padding:10px 12px;border:1px solid var(--border);cursor:pointer;border-radius:var(--radius-sm);background:var(--surface);transition:all 0.15s;';

    const priceHTML = isVoid
      ? '<span style="text-decoration:line-through;color:var(--text-secondary);font-size:11px;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(t.total) + '</span>'
      : '<strong style="color:var(--accent);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(t.total) + '</strong>';

    const profitHTML = (adminUser && !isVoid && t.gross_profit !== undefined)
      ? '<span style="font-size:10px;color:#16A34A;font-weight:600;margin-left:6px;" title="Estimasi Laba Kotor">+' + formatRupiah(t.gross_profit) + '</span>'
      : '';

    const voidNoteHTML = isVoid
      ? '<div style="font-size:10px;color:#DC2626;margin-top:2px;font-style:italic;">Dibatalkan: ' + escapeHtml(t.void_reason || 'Nota Void') + '</div>'
      : '';

    return '<div style="' + cardStyle + '" onclick="loadInvoicePreview(\'' + t.id + '\', true)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:12px;">#' + escapeHtml(t.id) + '</strong>' +
      badge +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-main);margin-top:4px;font-weight:600;">' +
      escapeHtml(clientName) + profitHTML +
      '</div>' +
      voidNoteHTML +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-secondary);margin-top:3px;">' +
      '<span>' + formatDate(t.created_at) + ' &bull; ' + escapeHtml(t.payment_method || 'Tunai') + '</span>' +
      priceHTML +
      '</div>' +
      '</div>';
  }).join('');
}

function filterFakturTable(query) {
  const container = document.getElementById('faktur-list-container');
  if (!container) return;
  const list = window._fakturTxList || [];
  const searchEl = document.getElementById('faktur-search-input');
  const filterEl = document.getElementById('faktur-status-filter');

  const q = (typeof query === 'string' ? query : (searchEl ? searchEl.value : '')).toLowerCase().trim();
  const statusFilter = filterEl ? filterEl.value : 'all';

  const filtered = list.filter(function (t) {
    const isVoid = String(t.status).toUpperCase() === 'VOID';
    const matchQuery = !q ||
      String(t.id || '').toLowerCase().includes(q) ||
      String(t.customer_name || '').toLowerCase().includes(q) ||
      String(t.payment_method || '').toLowerCase().includes(q);

    let matchStatus = true;
    if (statusFilter === 'paid') matchStatus = (t.status === 'paid' && !isVoid);
    if (statusFilter === 'partial') matchStatus = (t.status !== 'paid' && !isVoid);
    if (statusFilter === 'void') matchStatus = isVoid;

    return matchQuery && matchStatus;
  });

  renderFakturRows(filtered);
}

function filterFakturList() {
  filterFakturTable();
}

function loadInvoicePreview(transactionId, fromUserTap) {
  SELECTED_FAKTUR_ID = transactionId;
  filterFakturList();

  const panel = document.getElementById('invoice-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="display:inline-block;width:24px;height:24px;border:3px solid rgba(30,77,63,0.2);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px;"></span><br>Memuat faktur #' + escapeHtml(transactionId) + '...</div></div>';
  if (fromUserTap && window.innerWidth <= 768) {
    setTimeout(function () { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }

  api('getInvoiceData', TOKEN, transactionId).then(function (data) {
    window._curInv = data;
    renderInvoiceLayout(data, CURRENT_INVOICE_VIEW_MODE || 'formal');
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

function renderInvoiceLayout(data, template) {
  if (template === 'minimalis') template = 'minimalist';
  if (!template) template = 'formal';
  CURRENT_INVOICE_VIEW_MODE = template;

  const panel = document.getElementById('invoice-panel');
  if (!panel || !data || !data.transaction) return;

  const tx = data.transaction;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const custName = (data.customer ? data.customer.name : tx.customer_name) || 'Umum';
  const adminUser = isAdmin();

  let statusBadge = '';
  if (isVoid) {
    statusBadge = '<span class="badge badge-void" style="background:#DC2626;color:#FFFFFF;font-weight:800;font-size:12px;padding:3px 8px;border-radius:4px;">VOID / DIBATALKAN</span>';
  } else if (tx.status === 'paid') {
    statusBadge = '<span class="badge badge-success">LUNAS</span>';
  } else {
    statusBadge = '<span class="badge badge-warning">CICILAN / TEMPO</span>';
  }

  const voidBannerHTML = isVoid ? (
    '<div class="tx-void-banner" style="background:#FEE2E2;border:1px solid #F87171;color:#991B1B;padding:12px 16px;border-radius:6px;margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">' +
    '<span style="font-size:24px;line-height:1;">⚠️</span>' +
    '<div style="flex:1;">' +
    '<div style="font-size:13px;font-weight:800;letter-spacing:0.5px;">TRANSAKSI TELAH DIBATALKAN (VOID)</div>' +
    '<div style="font-size:12px;margin-top:3px;line-height:1.4;">' +
    'Dibatalkan pada: <strong>' + formatDate(tx.void_at || tx.updated_at) + '</strong> oleh <strong>' + escapeHtml(tx.void_by || 'Admin') + '</strong>.<br>' +
    'Alasan: <em>"' + escapeHtml(tx.void_reason || '-') + '"</em>.<br>' +
    '<span style="color:#065F46;font-weight:600;">✓ Kuantitas sachet/benih telah dikembalikan ke stok batch fisik.</span>' +
    '</div>' +
    '</div>' +
    '</div>'
  ) : '';

  const totalCardHTML = isVoid ? (
    '<div style="text-align:right;">' +
    '<div style="font-size:10px;color:#DC2626;text-transform:uppercase;font-weight:800;">NOTA BATAL (VOID)</div>' +
    '<div style="font-size:20px;font-weight:800;color:var(--text-secondary);text-decoration:line-through;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.total) + '</div>' +
    '</div>'
  ) : (
    '<div style="text-align:right;">' +
    '<div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;">TOTAL TAGIHAN</div>' +
    '<div style="font-size:20px;font-weight:800;color:var(--accent);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.total) + '</div>' +
    (adminUser && tx.gross_profit !== undefined ? (
      '<div style="font-size:11px;color:#16A34A;font-weight:700;margin-top:2px;">Est. Laba: ' + formatRupiah(tx.gross_profit) + ' (' + (tx.margin_percent || 0) + '%)</div>'
    ) : '') +
    '</div>'
  );

  panel.innerHTML =
    '<div class="card" style="margin-bottom:14px;padding:16px 20px;">' +
    voidBannerHTML +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);">' +
    '<div>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span style="font-family:\'JetBrains Mono\',monospace;font-size:16px;font-weight:800;color:var(--primary);">#' + escapeHtml(tx.id) + '</span>' +
    statusBadge +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">' +
    'Klien: <strong style="color:var(--text-main);">' + escapeHtml(custName) + '</strong> &bull; ' + formatDate(tx.created_at) + ' (' + escapeHtml(tx.payment_method || 'Tunai') + ')' +
    '</div>' +
    '</div>' +
    totalCardHTML +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;" class="no-print">' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '<div class="invoice-format-tabs">' +
    '<button type="button" class="invoice-format-tab-btn ' + (template === 'thermal' ? 'active' : '') + '" data-mode="thermal" onclick="switchInvoiceView(\'thermal\')">🧾 Struk Termal (58mm)</button>' +
    '<button type="button" class="invoice-format-tab-btn ' + (template === 'minimalist' ? 'active' : '') + '" data-mode="minimalist" onclick="switchInvoiceView(\'minimalist\')">📄 Faktur Minimalis</button>' +
    '<button type="button" class="invoice-format-tab-btn ' + (template === 'formal' ? 'active' : '') + '" data-mode="formal" onclick="switchInvoiceView(\'formal\')">🏛️ Faktur Formal (A4)</button>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    renderInvoiceSignButtonHTML(tx) +
    '<button type="button" class="btn btn-primary btn-sm" onclick="printActiveInvoice()" style="font-weight:700;"><span style="font-size:13px;">🖨️</span> Cetak / Simpan PDF</button>' +
    '<button type="button" class="btn btn-secondary btn-sm btn-tx-wa" onclick="sendReceiptToWhatsApp(window._curInv)" style="background:#25D366;color:#FFFFFF;border-color:#25D366;font-weight:600;">📲 Kirim WA</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransactionDetailModal(\'' + tx.id + '\')">🔍 Rincian Lengkap</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransactionDetailModal(\'' + tx.id + '\')" title="Ajukan klaim garansi benih dari nota ini" style="font-weight:600;color:#FBBF24;border-color:rgba(245,158,11,0.4);background:rgba(245,158,11,0.12);">🌱 Klaim Benih</button>' +
    (!isVoid ? '<button type="button" class="btn btn-secondary btn-sm" onclick="startEditTransaction(\'' + tx.id + '\')">✏️ Koreksi Nota</button>' : '') +
    (!isVoid && adminUser ? '<button type="button" class="btn btn-danger btn-sm btn-tx-void" onclick="promptVoidTransaction(\'' + tx.id + '\', \'' + escapeHtml(custName).replace(/'/g, "\\'") + '\')" style="font-weight:700;background:rgba(239,68,68,0.18);color:#F87171;border:1px solid rgba(239,68,68,0.4);">⚠️ Batalkan (Void)</button>' : '') +
    (adminUser ? '<button type="button" class="btn btn-secondary btn-sm" onclick="deleteTransactionUI(\'' + tx.id + '\')" style="color:#F87171;border:1px solid rgba(239,68,68,0.35);background:rgba(239,68,68,0.12);padding:4px 8px;font-size:11px;" title="Hapus permanen darurat (khusus admin)">🗑️</button>' : '') +
    '<button type="button" class="btn btn-secondary btn-sm faktur-mobile-back-btn" onclick="scrollToFakturListMobile()">&uarr; Daftar Nota</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="closeInvoicePanel()" title="Tutup pratinjau faktur">✕ Tutup</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="invoice-doc-body">' + buildInvoiceRenderAreaHTML(data, template) + '</div>';

  switchInvoiceView(template);
}

function buildInvoiceHTML(data, template) {
  const mode = (template === 'minimalis') ? 'minimalist' : (template || 'formal');
  return buildInvoiceRenderAreaHTML(data, mode);
}

function printInvoice() {
  printActiveInvoice();
}

function deleteTransactionUI(id) {
  if (!isAdmin()) {
    showToast('Akses ditolak: Hanya Admin yang berhak menghapus transaksi.', true);
    return;
  }
  showConfirmDialog('Hapus Transaksi', 'Hapus permanen nota #' + id + '? Catatan: Jika ingin jejak audit pembatalan tersimpan, disarankan menggunakan fitur [Batalkan Transaksi (Void)].', function () {
    api('deleteTransaction', TOKEN, id).then(function () {
      invalidateCache('recentInvoices');
      invalidateCache('products');
      invalidateCache('dashboard');
      invalidateCache('receivables');
      showToast('Transaksi dihapus & stok dikembalikan.');
      SELECTED_FAKTUR_ID = null;
      renderFaktur(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}


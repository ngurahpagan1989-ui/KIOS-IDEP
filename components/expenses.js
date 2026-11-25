// ==============================================================================
// MODUL MANAJEMEN BIAYA & PENGELUARAN (OPERATIONAL EXPENSES & QRIS MDR)
// ==============================================================================

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'cat-1', name: 'Operasional & ATK Kios', description: 'Kertas nota kasir, printer thermal, pulpen, lakban, perlengkapan kasir' },
  { id: 'cat-2', name: 'Listrik, Air & Internet', description: 'Tagihan bulanan utilitas toko dan internet operasional' },
  { id: 'cat-3', name: 'Transportasi & Logistik', description: 'Ongkos kirim benih, bensin armada antar barang, ekspedisi' },
  { id: 'cat-4', name: 'Konsumsi & Jamuan', description: 'Snack, air mineral, konsumsi piket, jamuan kunjungan mitra' },
  { id: 'cat-5', name: 'Pemeliharaan & Kebersihan', description: 'Sapu, cairan pembersih, perbaikan etalase atau inventaris toko' },
  { id: 'cat-6', name: 'Bahan Kemas & Perlengkapan', description: 'Plastik kemasan benih, amplop kraft, sticker label cetak' },
  { id: 'cat-7', name: 'Lain-lain / Tak Terduga', description: 'Biaya operasional insidental toko lainnya' }
];

function generateExpenseId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return 'EXP-' + yy + mm + dd + '-' + rand;
}

function getQrisConfig() {
  try {
    const raw = localStorage.getItem('pos_qris_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.mdr_rate !== 'undefined') return parsed;
    }
    if (window.APP_SETTINGS && window.APP_SETTINGS['qris_config']) {
      const sRaw = window.APP_SETTINGS['qris_config'];
      const sParsed = typeof sRaw === 'string' ? JSON.parse(sRaw) : sRaw;
      if (sParsed && typeof sParsed.mdr_rate !== 'undefined') return sParsed;
    }
  } catch (e) {
    console.warn('Gagal membaca qris_config:', e);
  }
  return { mdr_rate: 0.3, mdr_payer: 'merchant', is_active: true };
}

function saveQrisConfig(config) {
  try {
    localStorage.setItem('pos_qris_config', JSON.stringify(config));
    if (!window.APP_SETTINGS) window.APP_SETTINGS = {};
    window.APP_SETTINGS['qris_config'] = JSON.stringify(config);
    if (typeof api === 'function') {
      api('saveSettings', TOKEN, { qris_config: JSON.stringify(config) }).catch(function (e) {
        console.warn('Gagal sinkronisasi qris_config ke database settings:', e);
      });
    }
  } catch (e) {
    console.error('Gagal menyimpan qris_config:', e);
  }
}

function handleCheckoutQrisFeeChange(method, baseTotal) {
  const methodEl = document.getElementById('chk-method');
  if (methodEl && method && methodEl.value !== method) {
    methodEl.value = method;
  }
  updateCheckoutModalTotalsUI(baseTotal);
}

// State Internal Modul Expenses
let CURRENT_EXPENSES_TAB = 'entry'; // 'entry' | 'qris' | 'categories'
let EXPENSES_CACHE_DATA = null;
let EXPENSE_CATEGORIES_CACHE_DATA = null;
let EXPENSES_FILTER_STATE = {
  search: '',
  category: '',
  month: new Date().toISOString().slice(0, 7) // 'YYYY-MM'
};

async function fetchExpensesData(forceRefresh) {
  if (!forceRefresh && EXPENSES_CACHE_DATA) {
    return EXPENSES_CACHE_DATA;
  }
  try {
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('operational_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (!error && Array.isArray(data)) {
        EXPENSES_CACHE_DATA = data;
        localStorage.setItem('pos_operational_expenses_backup', JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('[Expenses] Gagal query Supabase operational_expenses:', e);
  }

  try {
    const local = localStorage.getItem('pos_operational_expenses_backup');
    if (local) {
      EXPENSES_CACHE_DATA = JSON.parse(local);
      return EXPENSES_CACHE_DATA;
    }
  } catch (e) { }

  EXPENSES_CACHE_DATA = [];
  return EXPENSES_CACHE_DATA;
}

async function fetchExpenseCategoriesData(forceRefresh) {
  if (!forceRefresh && EXPENSE_CATEGORIES_CACHE_DATA) {
    return EXPENSE_CATEGORIES_CACHE_DATA;
  }
  try {
    if (window.supabase) {
      const { data, error } = await window.supabase
        .from('expense_categories')
        .select('*')
        .order('name', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        EXPENSE_CATEGORIES_CACHE_DATA = data;
        localStorage.setItem('pos_expense_categories_backup', JSON.stringify(data));
        return data;
      }
    }
  } catch (e) {
    console.warn('[Expenses] Gagal query expense_categories Supabase:', e);
  }

  try {
    const local = localStorage.getItem('pos_expense_categories_backup');
    if (local) {
      EXPENSE_CATEGORIES_CACHE_DATA = JSON.parse(local);
      return EXPENSE_CATEGORIES_CACHE_DATA;
    }
  } catch (e) { }

  EXPENSE_CATEGORIES_CACHE_DATA = [...DEFAULT_EXPENSE_CATEGORIES];
  return EXPENSE_CATEGORIES_CACHE_DATA;
}

async function renderExpenses(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const hasCache = EXPENSES_CACHE_DATA && EXPENSE_CATEGORIES_CACHE_DATA;
  if (!forceRefresh && hasCache) {
    drawExpensesUI(EXPENSES_CACHE_DATA, EXPENSE_CATEGORIES_CACHE_DATA);
  } else if (!hasCache) {
    content.innerHTML =
      '<div class="card" style="padding:40px;text-align:center;">' +
      '<div class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:12px;"></div>' +
      '<div style="color:var(--text-muted);font-weight:600;">Memuat modul Pengeluaran &amp; Biaya Operasional...</div>' +
      '</div>';
  }

  try {
    const [expenses, categories] = await Promise.all([
      fetchExpensesData(forceRefresh),
      fetchExpenseCategoriesData(forceRefresh)
    ]);
    drawExpensesUI(expenses, categories);
  } catch (err) {
    console.error('Gagal renderExpenses:', err);
    if (!hasCache) {
      content.innerHTML =
        '<div class="card" style="padding:24px;text-align:center;border-left:4px solid #ef4444;">' +
        '<h3 style="color:#ef4444;margin-bottom:8px;">Gagal Memuat Modul Biaya</h3>' +
        '<p style="color:var(--text-muted);">' + escapeHtml(err.message || String(err)) + '</p>' +
        '<button type="button" class="btn btn-primary" style="margin-top:14px;" onclick="renderExpenses(true)">Coba Lagi</button>' +
        '</div>';
    }
  }
}

function switchExpensesTab(tabName) {
  CURRENT_EXPENSES_TAB = tabName;
  drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA || []);
}

function drawExpensesUI(expenses, categories) {
  const content = document.getElementById('content');
  if (!content) return;

  const currentMonth = EXPENSES_FILTER_STATE.month || new Date().toISOString().slice(0, 7);

  const filteredList = (expenses || []).filter(function (item) {
    const dateMatch = !EXPENSES_FILTER_STATE.month || String(item.expense_date || '').startsWith(EXPENSES_FILTER_STATE.month);
    const catMatch = !EXPENSES_FILTER_STATE.category || item.category === EXPENSES_FILTER_STATE.category;
    const searchMatch = !EXPENSES_FILTER_STATE.search || (
      String(item.id || '').toLowerCase().includes(EXPENSES_FILTER_STATE.search.toLowerCase()) ||
      String(item.description || '').toLowerCase().includes(EXPENSES_FILTER_STATE.search.toLowerCase()) ||
      String(item.category || '').toLowerCase().includes(EXPENSES_FILTER_STATE.search.toLowerCase()) ||
      String(item.fund_source || '').toLowerCase().includes(EXPENSES_FILTER_STATE.search.toLowerCase())
    );
    return dateMatch && catMatch && searchMatch;
  });

  const monthItems = (expenses || []).filter(function (e) {
    return String(e.expense_date || '').startsWith(currentMonth);
  });
  const totalMonth = monthItems.reduce(function (acc, e) { return acc + Number(e.amount || 0); }, 0);
  const totalCash = monthItems
    .filter(function (e) {
      const src = String(e.fund_source || '').toLowerCase();
      return src.includes('kas kecil') || src.includes('tunai');
    })
    .reduce(function (acc, e) { return acc + Number(e.amount || 0); }, 0);
  const totalTransfer = monthItems
    .filter(function (e) {
      const src = String(e.fund_source || '').toLowerCase();
      return src.includes('transfer');
    })
    .reduce(function (acc, e) { return acc + Number(e.amount || 0); }, 0);

  let html =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
    '<div>' +
    '<h2 style="font-size:22px;font-weight:700;margin:0 0 4px;color:var(--text-main);"><i class="fas fa-wallet" style="color:var(--primary);margin-right:8px;"></i>Manajemen Biaya & Pengeluaran</h2>' +
    '<p style="font-size:13px;color:var(--text-muted);margin:0;">Pencatatan kas operasional toko (petty cash), histori belanja, dan pengaturan biaya MDR QRIS.</p>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="renderExpenses(true)" title="Segarkan Data">' +
    '<i class="fas fa-sync-alt"></i> Segarkan Data' +
    '</button>' +
    '</div>' +
    '</div>' +

    '<div class="expenses-tabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:10px;overflow-x:auto;">' +
    '<button type="button" class="tab-button ' + (CURRENT_EXPENSES_TAB === 'entry' ? 'active' : '') + '" onclick="switchExpensesTab(\'entry\')">' +
    '<i class="fas fa-receipt"></i> Catat Pengeluaran Operasional' +
    '</button>' +
    '<button type="button" class="tab-button ' + (CURRENT_EXPENSES_TAB === 'qris' ? 'active' : '') + '" onclick="switchExpensesTab(\'qris\')">' +
    '<i class="fas fa-qrcode"></i> Pengaturan Biaya Transaksi & QRIS' +
    '</button>' +
    '<button type="button" class="tab-button ' + (CURRENT_EXPENSES_TAB === 'categories' ? 'active' : '') + '" onclick="switchExpensesTab(\'categories\')">' +
    '<i class="fas fa-tags"></i> Kategori Biaya' +
    '</button>' +
    '</div>';

  if (CURRENT_EXPENSES_TAB === 'entry') {
    html += renderExpensesEntryTabHtml(filteredList, categories, totalMonth, totalCash, totalTransfer, currentMonth);
  } else if (CURRENT_EXPENSES_TAB === 'qris') {
    html += renderExpensesQrisTabHtml();
  } else if (CURRENT_EXPENSES_TAB === 'categories') {
    html += renderExpensesCategoriesTabHtml(categories, expenses);
  }

  content.innerHTML = html;
}

function renderExpensesEntryTabHtml(filteredList, categories, totalMonth, totalCash, totalTransfer, currentMonth) {
  const todayStr = new Date().toISOString().split('T')[0];

  const catOptions = (categories || []).map(function (c) {
    return '<option value="' + escapeHtml(c.name) + '">' + escapeHtml(c.name) + '</option>';
  }).join('');

  const filterCatOptions = '<option value="">Semua Kategori</option>' + (categories || []).map(function (c) {
    const isSel = EXPENSES_FILTER_STATE.category === c.name ? ' selected' : '';
    return '<option value="' + escapeHtml(c.name) + '"' + isSel + '>' + escapeHtml(c.name) + '</option>';
  }).join('');

  return (
    // 1. Ringkasan Kartu Metrik
    '<div class="dashboard-stats-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:16px;margin-bottom:24px;">' +
    '<div class="card" style="padding:18px;border-left:4px solid var(--primary);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
    '<div>' +
    '<div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Pengeluaran Bulan Ini</div>' +
    '<div style="font-size:24px;font-weight:800;color:var(--text-main);margin-top:4px;">' + formatRupiah(totalMonth) + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Periode: ' + currentMonth + '</div>' +
    '</div>' +
    '<div style="width:44px;height:44px;border-radius:50%;background:rgba(122,80,49,0.1);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:18px;">' +
    '<i class="fas fa-calendar-alt"></i>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div class="card" style="padding:18px;border-left:4px solid #10b981;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
    '<div>' +
    '<div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Kas Kecil / Tunai Kios</div>' +
    '<div style="font-size:24px;font-weight:800;color:#047857;margin-top:4px;">' + formatRupiah(totalCash) + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Pengeluaran Petty Cash Fisik</div>' +
    '</div>' +
    '<div style="width:44px;height:44px;border-radius:50%;background:#ecfdf5;display:flex;align-items:center;justify-content:center;color:#059669;font-size:18px;">' +
    '<i class="fas fa-money-bill-wave"></i>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div class="card" style="padding:18px;border-left:4px solid #2563eb;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
    '<div>' +
    '<div style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Transfer Bank Toko</div>' +
    '<div style="font-size:24px;font-weight:800;color:#1d4ed8;margin-top:4px;">' + formatRupiah(totalTransfer) + '</div>' +
    '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Pengeluaran Melalui Rekening</div>' +
    '</div>' +
    '<div style="width:44px;height:44px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:18px;">' +
    '<i class="fas fa-university"></i>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    // 2. Form Input Pengeluaran & Riwayat Grid
    '<div class="expenses-split-grid" style="display:grid;grid-template-columns:minmax(320px, 380px) 1fr;gap:20px;align-items:start;">' +
    // FORMULIR PENCATATAN PENGELUARAN
    '<div class="card" style="padding:20px;">' +
    '<h3 style="font-size:16px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">' +
    '<i class="fas fa-plus-circle" style="color:var(--primary);"></i> Form Catat Pengeluaran' +
    '</h3>' +
    '<form id="form-new-expense" onsubmit="return submitNewExpense(event)">' +
    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" for="exp-date">Tanggal Pengeluaran <span style="color:#ef4444;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<input type="date" id="exp-date" value="' + todayStr + '" required style="padding-left:14px;">' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" for="exp-category">Pilihan Kategori <span style="color:#ef4444;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<select id="exp-category" required style="padding-left:14px;">' +
    catOptions +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" for="exp-amount">Nominal Pengeluaran (Rp) <span style="color:#ef4444;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="exp-amount" min="1" step="500" placeholder="Contoh: 50000" required oninput="onExpenseAmountInput(this.value)" style="padding-left:14px;font-size:16px;font-weight:700;">' +
    '</div>' +
    '<div id="exp-amount-preview" style="font-size:13px;font-weight:700;color:var(--primary);margin-top:4px;">Rp 0</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" for="exp-fund-source">Sumber Dana <span style="color:#ef4444;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<select id="exp-fund-source" required style="padding-left:14px;">' +
    '<option value="Kas Kecil / Tunai Kios">Kas Kecil / Tunai Kios</option>' +
    '<option value="Transfer Bank Toko">Transfer Bank Toko</option>' +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:16px;">' +
    '<label class="field-label" for="exp-description">Keterangan / Keperluan <span style="color:#ef4444;">*</span></label>' +
    '<textarea id="exp-description" rows="3" required placeholder="Catat detail pengeluaran, nomor nota bon, atau keperluan..." style="width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 12px;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>' +
    '</div>' +

    '<button type="submit" class="btn btn-primary btn-block btn-lg" id="btn-save-expense">' +
    '<i class="fas fa-save" style="margin-right:6px;"></i> Simpan Pengeluaran' +
    '</button>' +
    '</form>' +
    '</div>' +

    // TABEL RIWAYAT PENGELUARAN
    '<div class="card" style="padding:20px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
    '<h3 style="font-size:16px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px;">' +
    '<i class="fas fa-history" style="color:var(--primary);"></i> Riwayat Pengeluaran' +
    '<span class="badge" style="background:var(--surface-muted);color:var(--text-main);">' + (filteredList ? filteredList.length : 0) + ' Data</span>' +
    '</h3>' +
    '</div>' +

    // Baris Filter Cepat
    '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;background:var(--surface-muted);padding:10px;border-radius:var(--radius-sm);">' +
    '<div style="flex:1;min-width:180px;">' +
    '<input type="text" placeholder="Cari ID, keperluan, kategori..." value="' + escapeHtml(EXPENSES_FILTER_STATE.search) + '" oninput="onExpenseSearch(this.value)" style="width:100%;padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;box-sizing:border-box;">' +
    '</div>' +
    '<div style="width:170px;">' +
    '<select onchange="onExpenseCategoryFilter(this.value)" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;">' +
    filterCatOptions +
    '</select>' +
    '</div>' +
    '<div style="width:140px;">' +
    '<input type="month" value="' + (EXPENSES_FILTER_STATE.month || '') + '" onchange="onExpenseMonthFilter(this.value)" title="Pilih Bulan" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12px;box-sizing:border-box;">' +
    '</div>' +
    '<div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetExpenseFilters()" title="Tampilkan Semua">' +
    'Reset' +
    '</button>' +
    '</div>' +
    '</div>' +

    // Tabel Data
    '<div class="table-container" style="max-height:600px;overflow-y:auto;">' +
    '<table class="table" style="width:100%;border-collapse:collapse;font-size:13px;">' +
    '<thead>' +
    '<tr style="background:var(--surface-muted);text-align:left;">' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">No / ID</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Tanggal</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Kategori</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Keperluan</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Sumber Dana</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:right;">Nominal</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:center;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (filteredList.length === 0 ?
      '<tr><td colspan="7" style="padding:32px;text-align:center;color:var(--text-muted);"><i class="fas fa-folder-open" style="font-size:28px;margin-bottom:8px;display:block;"></i>Belum ada catatan pengeluaran yang sesuai filter.</td></tr>' :
      filteredList.map(function (item, idx) {
        const isCash = String(item.fund_source || '').toLowerCase().includes('kas kecil') || String(item.fund_source || '').toLowerCase().includes('tunai');
        const fundBadge = isCash
          ? '<span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;"><i class="fas fa-money-bill-wave" style="margin-right:4px;"></i>' + escapeHtml(item.fund_source) + '</span>'
          : '<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;"><i class="fas fa-university" style="margin-right:4px;"></i>' + escapeHtml(item.fund_source) + '</span>';

        const safeDesc = escapeHtml(item.description || '-').replace(/'/g, "\\'");

        return (
          '<tr style="border-bottom:1px solid var(--border);">' +
          '<td style="padding:10px 12px;"><code style="font-weight:700;font-size:11px;">' + escapeHtml(item.id || ('EXP-' + (idx + 1))) + '</code></td>' +
          '<td style="padding:10px 12px;white-space:nowrap;">' + formatDate(item.expense_date) + '</td>' +
          '<td style="padding:10px 12px;"><span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;">' + escapeHtml(item.category || '-') + '</span></td>' +
          '<td style="padding:10px 12px;max-width:260px;word-break:break-word;">' +
          '<div>' + escapeHtml(item.description || '-') + '</div>' +
          (item.created_by ? '<small style="color:var(--text-muted);font-size:10px;"><i class="fas fa-user-edit"></i> ' + escapeHtml(item.created_by) + '</small>' : '') +
          '</td>' +
          '<td style="padding:10px 12px;white-space:nowrap;">' + fundBadge + '</td>' +
          '<td style="padding:10px 12px;text-align:right;font-weight:700;color:var(--text-main);white-space:nowrap;">' + formatRupiah(item.amount) + '</td>' +
          '<td style="padding:10px 12px;text-align:center;white-space:nowrap;">' +
          '<button type="button" class="btn btn-danger btn-sm" onclick="deleteExpenseRecord(\'' + item.id + '\', \'' + safeDesc + '\', ' + Number(item.amount || 0) + ')" title="Hapus Pengeluaran">' +
          '<i class="fas fa-trash-alt"></i>' +
          '</button>' +
          '</td>' +
          '</tr>'
        );
      }).join('')
    ) +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function renderExpensesQrisTabHtml() {
  const cfg = getQrisConfig();
  const sampleAmount = 100000;
  const sampleMdr = Math.round(sampleAmount * (Number(cfg.mdr_rate || 0) / 100));
  const sampleGrandTotal = cfg.mdr_payer === 'customer' ? (sampleAmount + sampleMdr) : sampleAmount;
  const sampleNetReceived = cfg.mdr_payer === 'merchant' ? (sampleAmount - sampleMdr) : sampleAmount;

  return (
    '<div style="max-width:800px;margin:0 auto;">' +
    '<div class="card" style="padding:24px;margin-bottom:20px;">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">' +
    '<div style="width:48px;height:48px;border-radius:10px;background:rgba(122,80,49,0.1);display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:24px;">' +
    '<i class="fas fa-qrcode"></i>' +
    '</div>' +
    '<div>' +
    '<h3 style="font-size:18px;font-weight:700;margin:0 0 4px;color:var(--text-main);">Konfigurasi Biaya Transaksi & QRIS POS</h3>' +
    '<p style="font-size:13px;color:var(--text-muted);margin:0;">Atur persentase MDR (Merchant Discount Rate) QRIS dan tentukan skema pembebanan biaya.</p>' +
    '</div>' +
    '</div>' +

    '<form id="form-qris-config" onsubmit="return saveExpensesQrisConfig(event)">' +
    '<div style="margin-bottom:20px;">' +
    '<label class="field-label" for="qris-mdr-input" style="font-size:14px;font-weight:600;margin-bottom:6px;display:block;">' +
    'Persentase MDR QRIS (%) <span style="color:#ef4444;">*</span>' +
    '</label>' +
    '<div style="display:flex;align-items:center;gap:12px;max-width:280px;">' +
    '<input type="number" id="qris-mdr-input" min="0" max="10" step="0.05" value="' + (cfg.mdr_rate || 0.3) + '" required oninput="onQrisSimulateChange()" style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:16px;font-weight:700;">' +
    '<span style="font-size:16px;font-weight:700;color:var(--text-muted);">%</span>' +
    '</div>' +
    '<small style="color:var(--text-muted);font-size:11px;display:block;margin-top:6px;">' +
    '<i class="fas fa-info-circle"></i> Sesuai standar Bank Indonesia, tarif MDR QRIS untuk Usaha Mikro (UMI) adalah <strong>0.3%</strong> (atau 0% untuk donasi/nirlaba).' +
    '</small>' +
    '</div>' +

    '<div style="margin-bottom:24px;">' +
    '<label class="field-label" style="font-size:14px;font-weight:600;margin-bottom:10px;display:block;">' +
    'Skema Pembebanan Biaya Transaksi MDR' +
    '</label>' +
    '<div style="display:flex;flex-direction:column;gap:10px;">' +
    '<label style="display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:' + (cfg.mdr_payer === 'merchant' ? 'var(--surface-muted)' : 'var(--surface)') + ';">' +
    '<input type="radio" name="qris-mdr-payer" value="merchant" ' + (cfg.mdr_payer === 'merchant' ? 'checked' : '') + ' onchange="onQrisSimulateChange()" style="margin-top:3px;">' +
    '<div>' +
    '<strong style="color:var(--text-main);font-size:14px;">Dipotong dari Penerimaan Kios (Toko Menanggung)</strong>' +
    '<p style="font-size:12px;color:var(--text-muted);margin:3px 0 0;">Total tagihan pelanggan tetap sama dengan harga belanja. Kios menerima dana bersih setelah dipotong biaya MDR QRIS.</p>' +
    '</div>' +
    '</label>' +

    '<label style="display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;background:' + (cfg.mdr_payer === 'customer' ? 'var(--surface-muted)' : 'var(--surface)') + ';">' +
    '<input type="radio" name="qris-mdr-payer" value="customer" ' + (cfg.mdr_payer === 'customer' ? 'checked' : '') + ' onchange="onQrisSimulateChange()" style="margin-top:3px;">' +
    '<div>' +
    '<strong style="color:var(--text-main);font-size:14px;">Dibebankan ke Pelanggan (Biaya Tambahan Transaksi)</strong>' +
    '<p style="font-size:12px;color:var(--text-muted);margin:3px 0 0;">Biaya MDR QRIS dihitung otomatis dan ditambahkan ke total belanja saat kasir memilih metode QRIS di checkout POS.</p>' +
    '</div>' +
    '</label>' +
    '</div>' +
    '</div>' +

    // SIMULASI KALKULATOR
    '<div id="qris-simulation-card" style="background:var(--surface-muted);border:1px dashed var(--border);border-radius:var(--radius-sm);padding:16px;margin-bottom:24px;">' +
    '<div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px;display:flex;align-items:center;gap:6px;">' +
    '<i class="fas fa-calculator"></i> Simulasi Transaksi QRIS (Contoh: Belanja Rp 100.000)' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">' +
    '<div>' +
    '<span style="color:var(--text-muted);">Biaya MDR QRIS:</span>' +
    '<div id="sim-mdr-fee" style="font-size:16px;font-weight:700;color:#d97706;margin-top:2px;">' + formatRupiah(sampleMdr) + ' (' + (cfg.mdr_rate || 0.3) + '%)</div>' +
    '</div>' +
    '<div>' +
    '<span style="color:var(--text-muted);">Pelanggan Membayar:</span>' +
    '<div id="sim-cust-pay" style="font-size:16px;font-weight:700;color:var(--primary);margin-top:2px;">' + formatRupiah(sampleGrandTotal) + '</div>' +
    '</div>' +
    '<div style="grid-column:1 / -1;border-top:1px solid var(--border);padding-top:8px;">' +
    '<span style="color:var(--text-muted);">Penerimaan Bersih Kasir Kios:</span>' +
    '<div id="sim-net-receive" style="font-size:18px;font-weight:800;color:#047857;margin-top:2px;">' + formatRupiah(sampleNetReceived) + '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<button type="submit" class="btn btn-primary btn-lg" id="btn-save-qris-cfg">' +
    '<i class="fas fa-save" style="margin-right:6px;"></i> Simpan Pengaturan Biaya Transaksi' +
    '</button>' +
    '</form>' +
    '</div>' +
    '</div>'
  );
}

function renderExpensesCategoriesTabHtml(categories, expenses) {
  // Hitung jumlah pengeluaran per kategori
  const countMap = {};
  (expenses || []).forEach(function (e) {
    const c = e.category || 'Lain-lain';
    countMap[c] = (countMap[c] || 0) + 1;
  });

  return (
    '<div class="expenses-split-grid" style="display:grid;grid-template-columns:minmax(300px, 360px) 1fr;gap:20px;align-items:start;">' +
    // FORM TAMBAH KATEGORI
    '<div class="card" style="padding:20px;">' +
    '<h3 style="font-size:16px;font-weight:700;margin:0 0 16px;display:flex;align-items:center;gap:8px;">' +
    '<i class="fas fa-plus-circle" style="color:var(--primary);"></i> Tambah Kategori Biaya' +
    '</h3>' +
    '<form id="form-new-cat" onsubmit="return submitNewExpenseCategory(event)">' +
    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" for="cat-name-input">Nama Kategori <span style="color:#ef4444;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="cat-name-input" required placeholder="Misal: Perbaikan Mesin & Oven" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +

    '<div class="field-group" style="margin-bottom:16px;">' +
    '<label class="field-label" for="cat-desc-input">Keterangan / Peruntukan</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="cat-desc-input" placeholder="Deskripsi pemakaian kategori ini" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +

    '<button type="submit" class="btn btn-primary btn-block" id="btn-save-cat">' +
    '<i class="fas fa-plus" style="margin-right:6px;"></i> Tambahkan Kategori' +
    '</button>' +
    '</form>' +

    '<hr style="margin:20px 0;border:none;border-top:1px solid var(--border);">' +

    '<div style="text-align:center;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetDefaultExpenseCategories()">' +
    '<i class="fas fa-undo"></i> Pulihkan Kategori Standar Toko' +
    '</button>' +
    '<small style="display:block;color:var(--text-muted);font-size:11px;margin-top:6px;">' +
    'Memuat ulang 7 kategori bawaan standar.' +
    '</small>' +
    '</div>' +
    '</div>' +

    // DAFTAR KATEGORI
    '<div class="card" style="padding:20px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
    '<h3 style="font-size:16px;font-weight:700;margin:0;display:flex;align-items:center;gap:8px;">' +
    '<i class="fas fa-tags" style="color:var(--primary);"></i> Daftar Kategori Pengeluaran' +
    '<span class="badge" style="background:var(--surface-muted);color:var(--text-main);">' + (categories ? categories.length : 0) + ' Kategori</span>' +
    '</h3>' +
    '</div>' +

    '<div class="table-container">' +
    '<table class="table" style="width:100%;border-collapse:collapse;font-size:13px;">' +
    '<thead>' +
    '<tr style="background:var(--surface-muted);text-align:left;">' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">No</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Nama Kategori</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);">Keterangan</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:center;">Digunakan</th>' +
    '<th style="padding:10px 12px;border-bottom:1px solid var(--border);text-align:center;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (categories.map(function (cat, i) {
      const count = countMap[cat.name] || 0;
      const safeName = escapeHtml(cat.name).replace(/'/g, "\\'");
      return (
        '<tr style="border-bottom:1px solid var(--border);">' +
        '<td style="padding:10px 12px;color:var(--text-muted);">' + (i + 1) + '</td>' +
        '<td style="padding:10px 12px;font-weight:600;color:var(--text-main);">' + escapeHtml(cat.name) + '</td>' +
        '<td style="padding:10px 12px;color:var(--text-muted);font-size:12px;">' + escapeHtml(cat.description || '-') + '</td>' +
        '<td style="padding:10px 12px;text-align:center;"><span class="badge" style="background:#f1f5f9;color:#334155;">' + count + ' x</span></td>' +
        '<td style="padding:10px 12px;text-align:center;">' +
        '<button type="button" class="btn btn-danger btn-sm" onclick="deleteExpenseCategory(\'' + (cat.id || '') + '\', \'' + safeName + '\')" title="Hapus Kategori">' +
        '<i class="fas fa-trash-alt"></i>' +
        '</button>' +
        '</td>' +
        '</tr>'
      );
    }).join('')) +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '</div>'
  );
}

function onExpenseAmountInput(val) {
  const el = document.getElementById('exp-amount-preview');
  if (el) {
    el.textContent = formatRupiah(Number(val || 0));
  }
}

async function submitNewExpense(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!userCanEdit('expenses')) {
    showToast('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.', true);
    return false;
  }

  const dateInput = document.getElementById('exp-date');
  const catInput = document.getElementById('exp-category');
  const amountInput = document.getElementById('exp-amount');
  const sourceInput = document.getElementById('exp-fund-source');
  const descInput = document.getElementById('exp-description');
  const saveBtn = document.getElementById('btn-save-expense');

  if (!dateInput || !amountInput || !catInput || !descInput) return false;

  const dateVal = dateInput.value;
  const catVal = catInput.value;
  const amountVal = Number(amountInput.value || 0);
  const sourceVal = sourceInput.value;
  const descVal = descInput.value.trim();

  if (!dateVal) {
    showToast('Tanggal pengeluaran wajib diisi!', true);
    return false;
  }
  if (!amountVal || amountVal <= 0) {
    showToast('Nominal pengeluaran harus lebih besar dari Rp 0!', true);
    amountInput.focus();
    return false;
  }
  if (!descVal) {
    showToast('Keterangan / keperluan pengeluaran wajib diisi!', true);
    descInput.focus();
    return false;
  }

  const payload = {
    id: generateExpenseId(),
    expense_date: dateVal,
    category: catVal,
    amount: amountVal,
    fund_source: sourceVal,
    description: descVal,
    created_by: (window.CURRENT_USER_PROFILE && window.CURRENT_USER_PROFILE.full_name) || window.USER_NAME || 'Kasir Kios',
    created_at: new Date().toISOString()
  };

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner" style="display:inline-block;width:14px;height:14px;margin-right:6px;"></span> Menyimpan...';
  }

  try {
    let savedRemotely = false;
    if (window.supabase) {
      try {
        const { error } = await window.supabase
          .from('operational_expenses')
          .insert([payload]);
        if (!error) {
          savedRemotely = true;
        } else {
          console.warn('[Expenses] Supabase insert note:', error.message);
        }
      } catch (errSup) {
        console.warn('[Expenses] Supabase request error:', errSup);
      }
    }

    // Perbarui cache lokal
    if (!EXPENSES_CACHE_DATA) EXPENSES_CACHE_DATA = [];
    EXPENSES_CACHE_DATA.unshift(payload);
    localStorage.setItem('pos_operational_expenses_backup', JSON.stringify(EXPENSES_CACHE_DATA));

    showToast('✅ Pengeluaran ' + formatRupiah(amountVal) + ' berhasil dicatat.');

    // Reset formulir
    amountInput.value = '';
    descInput.value = '';
    const preview = document.getElementById('exp-amount-preview');
    if (preview) preview.textContent = 'Rp 0';

    drawExpensesUI(EXPENSES_CACHE_DATA, EXPENSE_CATEGORIES_CACHE_DATA || []);
  } catch (err) {
    showToast('Gagal mencatat pengeluaran: ' + (err.message || err), true);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save" style="margin-right:6px;"></i> Simpan Pengeluaran';
    }
  }

  return false;
}

function deleteExpenseRecord(id, desc, amount) {
  if (!userCanDelete('expenses')) {
    showToast('Akses ditolak: Peran Anda tidak memiliki izin menghapus / membatalkan data pada modul ini.', true);
    return;
  }
  if (!userCanDelete('expenses')) {
    showToast('Akses ditolak: Peran Anda tidak memiliki izin menghapus / membatalkan data pada modul ini.', true);
    return;
  }
  showConfirmDialog(
    'Hapus Catatan Pengeluaran?',
    'Apakah Anda yakin ingin membatalkan/menghapus pengeluaran "' + desc + '" sebesar ' + formatRupiah(amount) + '? Data yang dihapus tidak dapat dipulihkan.',
    async function () {
      try {
        if (window.supabase) {
          try {
            await window.supabase
              .from('operational_expenses')
              .delete()
              .eq('id', id);
          } catch (e) {
            console.warn('[Expenses] Supabase delete note:', e);
          }
        }

        if (EXPENSES_CACHE_DATA) {
          EXPENSES_CACHE_DATA = EXPENSES_CACHE_DATA.filter(function (e) { return e.id !== id; });
          localStorage.setItem('pos_operational_expenses_backup', JSON.stringify(EXPENSES_CACHE_DATA));
        }

        showToast('Catatan pengeluaran berhasil dihapus.');
        drawExpensesUI(EXPENSES_CACHE_DATA, EXPENSE_CATEGORIES_CACHE_DATA || []);
      } catch (err) {
        showToast('Gagal menghapus pengeluaran: ' + (err.message || err), true);
      }
    },
    true
  );
}

function onExpenseSearch(val) {
  EXPENSES_FILTER_STATE.search = val || '';
  drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA || []);
}

function onExpenseCategoryFilter(val) {
  EXPENSES_FILTER_STATE.category = val || '';
  drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA || []);
}

function onExpenseMonthFilter(val) {
  EXPENSES_FILTER_STATE.month = val || '';
  drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA || []);
}

function resetExpenseFilters() {
  EXPENSES_FILTER_STATE = { search: '', category: '', month: '' };
  drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA || []);
}

function onQrisSimulateChange() {
  const mdrInput = document.getElementById('qris-mdr-input');
  const payerRadio = document.querySelector('input[name="qris-mdr-payer"]:checked');
  const rate = Number(mdrInput ? mdrInput.value : 0.3) || 0;
  const isCust = payerRadio && payerRadio.value === 'customer';

  const sampleAmount = 100000;
  const mdrFee = Math.round(sampleAmount * (rate / 100));
  const grandTotal = isCust ? (sampleAmount + mdrFee) : sampleAmount;
  const netReceived = !isCust ? Math.max(0, sampleAmount - mdrFee) : sampleAmount;

  const mdrEl = document.getElementById('sim-mdr-fee');
  const custEl = document.getElementById('sim-cust-pay');
  const netEl = document.getElementById('sim-net-receive');

  if (mdrEl) mdrEl.textContent = formatRupiah(mdrFee) + ' (' + rate + '%)';
  if (custEl) custEl.textContent = formatRupiah(grandTotal);
  if (netEl) netEl.textContent = formatRupiah(netReceived);
}

function saveExpensesQrisConfig(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!userCanEdit('expenses')) {
    showToast('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.', true);
    return false;
  }

  const mdrInput = document.getElementById('qris-mdr-input');
  const payerRadio = document.querySelector('input[name="qris-mdr-payer"]:checked');
  const rate = Number(mdrInput ? mdrInput.value : 0.3);
  const payer = (payerRadio && payerRadio.value) ? payerRadio.value : 'merchant';

  const cfg = {
    mdr_rate: rate,
    mdr_payer: payer,
    is_active: rate > 0
  };

  saveQrisConfig(cfg);
  showToast('✅ Pengaturan biaya transaksi QRIS (' + rate + '%, dibebankan ke ' + (payer === 'customer' ? 'Pelanggan' : 'Kios Toko') + ') berhasil disimpan.');
  return false;
}

async function submitNewExpenseCategory(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!userCanEdit('expenses')) {
    showToast('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.', true);
    return false;
  }

  const nameInput = document.getElementById('cat-name-input');
  const descInput = document.getElementById('cat-desc-input');
  if (!nameInput) return false;

  const name = nameInput.value.trim();
  const desc = descInput ? descInput.value.trim() : '';

  if (!name) {
    showToast('Nama kategori wajib diisi!', true);
    return false;
  }

  const newCat = {
    id: 'cat-' + Date.now(),
    name: name,
    description: desc,
    created_at: new Date().toISOString()
  };

  try {
    if (window.supabase) {
      try {
        await window.supabase
          .from('expense_categories')
          .insert([newCat]);
      } catch (e) {
        console.warn('[Expenses] Supabase insert category note:', e);
      }
    }

    if (!EXPENSE_CATEGORIES_CACHE_DATA) EXPENSE_CATEGORIES_CACHE_DATA = [];
    EXPENSE_CATEGORIES_CACHE_DATA.push(newCat);
    localStorage.setItem('pos_expense_categories_backup', JSON.stringify(EXPENSE_CATEGORIES_CACHE_DATA));

    showToast('✅ Kategori "' + name + '" berhasil ditambahkan.');
    nameInput.value = '';
    if (descInput) descInput.value = '';

    drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA);
  } catch (err) {
    showToast('Gagal menyimpan kategori: ' + (err.message || err), true);
  }

  return false;
}

function deleteExpenseCategory(catId, catName) {
  if (!userCanDelete('expenses')) {
    showToast('Akses ditolak: Peran Anda tidak memiliki izin menghapus / membatalkan data pada modul ini.', true);
    return;
  }
  showConfirmDialog(
    'Hapus Kategori Biaya?',
    'Apakah Anda yakin ingin menghapus kategori "' + catName + '"?',
    async function () {
      try {
        if (window.supabase && catId) {
          try {
            await window.supabase
              .from('expense_categories')
              .delete()
              .eq('id', catId);
          } catch (e) {
            console.warn('[Expenses] Supabase delete category note:', e);
          }
        }

        if (EXPENSE_CATEGORIES_CACHE_DATA) {
          EXPENSE_CATEGORIES_CACHE_DATA = EXPENSE_CATEGORIES_CACHE_DATA.filter(function (c) {
            return c.id !== catId && c.name !== catName;
          });
          localStorage.setItem('pos_expense_categories_backup', JSON.stringify(EXPENSE_CATEGORIES_CACHE_DATA));
        }

        showToast('Kategori "' + catName + '" dihapus.');
        drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA);
      } catch (err) {
        showToast('Gagal menghapus kategori: ' + (err.message || err), true);
      }
    },
    true
  );
}

function resetDefaultExpenseCategories() {
  if (!userCanEdit('expenses')) {
    showToast('Akses ditolak: Akun Anda berada dalam Mode Pantau (View-Only) dan tidak diizinkan mengubah data.', true);
    return;
  }
  showConfirmDialog(
    'Pulihkan Kategori Standar?',
    'Daftar kategori pengeluaran akan diatur ulang ke 7 kategori standar. Lanjutkan?',
    function () {
      EXPENSE_CATEGORIES_CACHE_DATA = [...DEFAULT_EXPENSE_CATEGORIES];
      localStorage.setItem('pos_expense_categories_backup', JSON.stringify(EXPENSE_CATEGORIES_CACHE_DATA));
      showToast('Kategori standar toko dipulihkan.');
      drawExpensesUI(EXPENSES_CACHE_DATA || [], EXPENSE_CATEGORIES_CACHE_DATA);
    }
  );
}

function deleteExpenseUI(id) {
  showConfirmDialog('Hapus Pengeluaran', 'Hapus catatan pengeluaran ini?', function () {
    api('deleteExpense', TOKEN, id).then(() => {
      showToast('Pengeluaran dihapus.');
      renderExpenses(true);
    });
  }, true);
}

// Ekspor ke window global
window.renderExpenses = renderExpenses;
window.switchExpensesTab = switchExpensesTab;
window.onExpenseAmountInput = onExpenseAmountInput;
window.submitNewExpense = submitNewExpense;
window.deleteExpenseRecord = deleteExpenseRecord;
window.deleteExpenseUI = deleteExpenseUI;
window.onExpenseSearch = onExpenseSearch;
window.onExpenseCategoryFilter = onExpenseCategoryFilter;
window.onExpenseMonthFilter = onExpenseMonthFilter;
window.resetExpenseFilters = resetExpenseFilters;
window.saveExpensesQrisConfig = saveExpensesQrisConfig;
window.onQrisSimulateChange = onQrisSimulateChange;
window.submitNewExpenseCategory = submitNewExpenseCategory;
window.deleteExpenseCategory = deleteExpenseCategory;
window.resetDefaultExpenseCategories = resetDefaultExpenseCategories;
window.handleCheckoutQrisFeeChange = handleCheckoutQrisFeeChange;
window.getQrisConfig = getQrisConfig;
window.getCheckoutPricingState = getCheckoutPricingState;
window.updateCheckoutModalTotalsUI = updateCheckoutModalTotalsUI;
window.setCheckoutShippingQuick = setCheckoutShippingQuick;
window.setCheckoutCashQuick = setCheckoutCashQuick;
window.syncPosCustomerPhone = syncPosCustomerPhone;
window.resetCart = resetCart;

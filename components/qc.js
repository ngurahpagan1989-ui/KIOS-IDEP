// ========================= QUALITY CONTROL (QC) BENIH =========================

let CURRENT_QC_RECORDS = [];
let CURRENT_QC_FILTER = 'Semua';
let currentQCPhotoBase64 = '';

function getQCBatchDisplayCode(batchOrId) {
  if (batchOrId && typeof batchOrId === 'object') {
    return batchOrId.batch_code || batchOrId.batch_id || '-';
  }
  const match = (CURRENT_QC_RECORDS || []).filter(function (r) {
    return r && String(r.batch_id) === String(batchOrId);
  })[0];
  return match ? (match.batch_code || match.batch_id) : (batchOrId || '-');
}

function renderQC(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cachedQC = getCachedData('qc_records');
  const cachedProds = getCachedData('products');

  if (!forceRefresh && cachedQC && cachedProds) {
    CURRENT_QC_RECORDS = cachedQC;
    drawQCUI(cachedQC, cachedProds);
    if (isCacheValid('qc_records') && isCacheValid('products')) return;
  } else if (!cachedQC) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>🔬 Mengambil rekam uji Quality Control benih...</div></div>';
  }

  const fetchProds = (isCacheValid('products') && cachedProds)
    ? Promise.resolve(cachedProds)
    : api('getProducts', TOKEN);

  Promise.all([
    api('getQCRecords', TOKEN),
    fetchProds
  ]).then(function (results) {
    const qcRecords = Array.isArray(results[0]) ? results[0] : [];
    const products = Array.isArray(results[1]) ? results[1] : [];
    setCachedData('qc_records', qcRecords);
    setCachedData('products', products);
    CURRENT_QC_RECORDS = qcRecords;
    drawQCUI(qcRecords, products);
  }).catch(function (err) {
    if (!cachedQC) {
      showToast('Gagal memuat data QC: ' + (err.message || err), true);
    }
  });
}

function getQCStageLabel(stageCode) {
  const map = {
    'UJI_1_PETANI': '1. Uji Lapangan Petani',
    'UJI_2_LAB': '2. Uji Semai Lab / Kantor (Pre-DHT)',
    [['UJI', '2', 'LAB'].join('_')]: '2. Uji Semai Lab / Kantor (Pre-DHT)',
    [['UJI', '2', 'OLD'].join('_')]: '2. Uji Semai Lab / Kantor (Pre-DHT)',
    'DHT_24JAM': '3. Log DHT 1 Hari',
    'UJI_3_PASCA_DHT': '4. Uji Semai Pasca-DHT',
    'UJI_BERKALA': '5. Uji Berkala (Simpan > 6 Bulan)'
  };
  return map[stageCode] || (stageCode ? escapeHtml(stageCode) : '-');
}

function drawQCUI(records, products) {
  const content = document.getElementById('content');
  if (!content) return;

  const totalBatches = records.length;
  const waitingCount = records.filter(function (r) { return r.category === 'Menunggu Uji'; }).length;
  const dhtCount = records.filter(function (r) { return r.category === 'Proses DHT'; }).length;
  const passedCount = records.filter(function (r) { return r.category === 'Lolos Mutu'; }).length;
  const failedCount = records.filter(function (r) { return r.category === 'Karantina/Gagal'; }).length;

  content.innerHTML =
    '<div id="qc-section">' +
    '<div class="qc-header-bar">' +
    '<div>' +
    '<h1 class="page-title" style="display:flex;align-items:center;gap:8px;">' +
    '<span>🔬</span> Quality Control &amp; Sertifikasi Benih' +
    '</h1>' +
    '<p class="page-subtitle" style="margin-top:2px;">' +
    'Standardisasi uji duplo 100 butir (Ambang Minimal Mutu 80%), penjemuran DHT 24 jam, &amp; dokumentasi foto baki on-site.' +
    '</p>' +
    '</div>' +
    '<div style="display:flex;gap:10px;align-items:center;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'qc\')" title="Buka Panduan Quality Control &amp; DHT">📖 Panduan QC</button>' +
    '<button type="button" class="tab-button" onclick="showSection(\'qc\')">' +
    '<i class="fas fa-microscope mr-2"></i>Quality Control' +
    '</button>' +
    '<button type="button" class="btn btn-primary" onclick="openQCEntryModal()" style="display:inline-flex;align-items:center;gap:6px;">' +
    '<span>🔬</span> Input Uji QC Baru' +
    '</button>' +
    '</div>' +
    '</div>' +

    '<!-- Filter & Pencarian -->' +
    '<div class="card" style="padding:12px 16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div class="qc-filter-pills" id="qc-filter-pills">' +
    '<button type="button" class="qc-filter-btn' + (CURRENT_QC_FILTER === 'Semua' ? ' active' : '') + '" onclick="setQCFilter(\'Semua\')">' +
    'Semua <span class="qc-filter-count">' + totalBatches + '</span>' +
    '</button>' +
    '<button type="button" class="qc-filter-btn' + (CURRENT_QC_FILTER === 'Menunggu Uji' ? ' active' : '') + '" onclick="setQCFilter(\'Menunggu Uji\')">' +
    '⚠️ Menunggu Uji <span class="qc-filter-count">' + waitingCount + '</span>' +
    '</button>' +
    '<button type="button" class="qc-filter-btn' + (CURRENT_QC_FILTER === 'Proses DHT' ? ' active' : '') + '" onclick="setQCFilter(\'Proses DHT\')">' +
    '⏳ Proses DHT <span class="qc-filter-count">' + dhtCount + '</span>' +
    '</button>' +
    '<button type="button" class="qc-filter-btn' + (CURRENT_QC_FILTER === 'Lolos Mutu' ? ' active' : '') + '" onclick="setQCFilter(\'Lolos Mutu\')">' +
    '✅ Lolos Mutu <span class="qc-filter-count">' + passedCount + '</span>' +
    '</button>' +
    '<button type="button" class="qc-filter-btn' + (CURRENT_QC_FILTER === 'Karantina/Gagal' ? ' active' : '') + '" onclick="setQCFilter(\'Karantina/Gagal\')">' +
    '⛔ Karantina/Gagal <span class="qc-filter-count">' + failedCount + '</span>' +
    '</button>' +
    '</div>' +
    '<div style="min-width:220px;">' +
    '<input type="text" id="qc-search-input" placeholder="Cari kode batch / varietas..." oninput="onQCSearchInput(this.value)" style="width:100%;border-radius:20px;padding:6px 14px;border:1px solid var(--border);font-size:12px;">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<!-- Tabel Daftar Batch QC -->' +
    '<div class="card" style="padding:0;overflow:hidden;">' +
    '<div class="table-container">' +
    '<table class="table" id="qc-batch-table">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:40px;text-align:center;">No</th>' +
    '<th style="width:130px;">Kode Batch</th>' +
    '<th>Nama Varietas Benih</th>' +
    '<th style="width:170px;">Tahap Terakhir</th>' +
    '<th style="width:140px;">Daya Tumbuh (%)</th>' +
    '<th style="width:70px;text-align:center;">Foto Baki</th>' +
    '<th style="width:140px;text-align:center;">Status Kelulusan</th>' +
    '<th style="width:140px;text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="qc-table-body">' +
    renderQCTableRows(records, CURRENT_QC_FILTER, '') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '</div>';

  if (window._qcTimerInterval) {
    clearInterval(window._qcTimerInterval);
    window._qcTimerInterval = null;
  }
  window._qcTimerInterval = setInterval(function () {
    const tbody = document.getElementById('qc-table-body');
    if (tbody && document.getElementById('qc-section')) {
      const searchVal = document.getElementById('qc-search-input') ? document.getElementById('qc-search-input').value : '';
      tbody.innerHTML = renderQCTableRows(CURRENT_QC_RECORDS, CURRENT_QC_FILTER, searchVal);
    } else {
      if (window._qcTimerInterval) {
        clearInterval(window._qcTimerInterval);
        window._qcTimerInterval = null;
      }
    }
  }, 60000);
}

function renderDHTTimer(startTimeStr, isFinished) {
  if (isFinished) {
    return '<span class="badge badge-success" style="font-size:11px;"><i class="fas fa-check-circle"></i> Selesai DHT</span>';
  }
  if (!startTimeStr) {
    return '<span class="badge badge-secondary" style="font-size:11px;">-</span>';
  }
  const start = new Date(startTimeStr).getTime();
  if (isNaN(start)) {
    return '<span class="badge badge-secondary" style="font-size:11px;">-</span>';
  }
  const durationMs = 24 * 60 * 60 * 1000;
  const end = start + durationMs;
  const now = Date.now();
  const diffMs = end - now;

  if (diffMs <= 0) {
    return '<span class="badge-qc-oven-done"><span class="flame-icon">🔔</span> Selesai 24 Jam (Siap Dikeluarkan)</span>';
  }

  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  return '<span class="badge-qc-oven-running" title="Waktu Mulai: ' + escapeHtml(formatDate(startTimeStr)) + '">' +
    '<span class="flame-icon">🔥</span> Sisa ' + hours + 'j ' + mins + 'm' +
    '</span>';
}

function actionCompleteDHT(batchId, batchCode) {
  if (!batchId) return;
  const displayCode = batchCode || getQCBatchDisplayCode(batchId);
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (modal && titleEl && msgEl && okBtn && cancelBtn) {
    titleEl.textContent = 'Keluarkan Benih dari Oven DHT?';
    msgEl.textContent = 'Apakah Anda yakin proses pengeringan oven selama 24 jam untuk batch "' + displayCode + '" telah selesai dan benih siap dipindahkan ke tahap Uji Semai Pasca-DHT?';
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    const cleanup = function () {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    cancelBtn.onclick = cleanup;
    okBtn.onclick = function () {
      cleanup();
      showToast('Memperbarui status pengeluaran oven DHT...');
      api('completeDHTSession', TOKEN, { batch_id: batchId, batch_code: displayCode, notes: 'Dikeluarkan dari oven tepat waktu.' }).then(function (res) {
        showToast(res.message || 'Proses oven DHT selesai! Batch siap untuk Uji Semai Pasca-DHT.');
        invalidateCache('qc_records');
        invalidateCache('products');
        invalidateCache('batches');
        invalidateCache('dashboard');
        renderQC(true);
      }).catch(function (err) {
        showToast('Gagal menyelesaikan DHT: ' + (err.message || err), true);
      });
    };
  } else {
    if (confirm('Keluarkan batch "' + displayCode + '" dari oven DHT dan lanjutkan ke Uji Semai Pasca-DHT?')) {
      showToast('Memperbarui status pengeluaran oven DHT...');
      api('completeDHTSession', TOKEN, { batch_id: batchId, batch_code: displayCode, notes: 'Dikeluarkan dari oven tepat waktu.' }).then(function (res) {
        showToast(res.message || 'Proses oven DHT selesai! Batch siap untuk Uji Semai Pasca-DHT.');
        invalidateCache('qc_records');
        invalidateCache('products');
        invalidateCache('batches');
        invalidateCache('dashboard');
        renderQC(true);
      }).catch(function (err) {
        showToast('Gagal menyelesaikan DHT: ' + (err.message || err), true);
      });
    }
  }
}

function renderQCTableRows(records, filterCategory, searchKeyword) {
  const kw = (searchKeyword || '').toLowerCase().trim();
  const filtered = records.filter(function (r) {
    if (filterCategory && filterCategory !== 'Semua' && r.category !== filterCategory) {
      return false;
    }
    if (kw) {
      const matchBatchCode = String(r.batch_code || '').toLowerCase().indexOf(kw) !== -1;
      const matchBatchId = String(r.batch_id || '').toLowerCase().indexOf(kw) !== -1;
      const matchProd = String(r.product_name || '').toLowerCase().indexOf(kw) !== -1;
      const matchStage = String(r.last_stage || '').toLowerCase().indexOf(kw) !== -1;
      const matchFarmer = String(r.farmer_name || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchBatchCode && !matchBatchId && !matchProd && !matchStage && !matchFarmer) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return '<tr><td colspan="8"><div class="empty-state" style="padding:40px 20px;">Tidak ada batch benih yang sesuai dengan filter "' + escapeHtml(filterCategory) + '".</div></td></tr>';
  }

  return filtered.map(function (b, index) {
    const displayCode = getQCBatchDisplayCode(b);

    // 1. Daya Tumbuh / Status Oven DHT
    let rateHtml = '-';
    if (b.category === 'Proses DHT' || (b.dht_info && !b.dht_info.is_finished)) {
      const ovenInfo = b.dht_info ? (b.dht_info.oven_no + ' (' + b.dht_info.target_temp + '°C)') : 'Oven DHT 24J';
      const timerHtml = b.dht_info ? renderDHTTimer(b.dht_info.start_time, b.dht_info.is_finished) : '<span class="badge badge-info">Proses Oven</span>';
      rateHtml =
        '<div class="qc-dht-meta-box">' +
        '<div style="font-weight:700;color:#B45309;font-size:11.5px;"><i class="fas fa-temperature-high"></i> ' + escapeHtml(ovenInfo) + '</div>' +
        timerHtml +
        '</div>';
    } else if (b.last_stage === 'DHT_24JAM') {
      const ovenInfo = b.dht_info ? (b.dht_info.oven_no + ' (' + b.dht_info.target_temp + '°C)') : 'Oven DHT 24J';
      rateHtml = '<div class="qc-dht-meta-box"><span style="font-size:11.5px;color:var(--text-secondary);"><i class="fas fa-temperature-high"></i> ' + escapeHtml(ovenInfo) + '</span><span class="badge badge-success" style="font-size:10px;">Selesai DHT</span></div>';
    } else if (b.last_germination_rate !== null && b.last_germination_rate !== undefined) {
      const rate = Number(b.last_germination_rate || 0);
      const isPass = rate >= 80;
      const trayInfo = (b.last_tray_a !== null && b.last_tray_b !== null) ? ('<div style="font-size:10px;color:var(--text-secondary);">Baki A: ' + b.last_tray_a + ' | B: ' + b.last_tray_b + '</div>') : '';
      rateHtml =
        '<div style="font-weight:700;color:' + (isPass ? '#166534' : '#991B1B') + ';">' +
        rate + '%' + (isPass ? ' <i class="fas fa-check-circle"></i>' : ' <i class="fas fa-times-circle"></i>') +
        '</div>' +
        '<div class="qc-rate-bar-wrap">' +
        '<div class="qc-rate-bar-fill ' + (isPass ? 'pass' : 'fail') + '" style="width:' + Math.min(100, Math.max(0, rate)) + '%;"></div>' +
        '</div>' +
        trayInfo;
    }

    // 2. Foto Baki Thumbnail
    let photoHtml = '<span class="qc-photo-placeholder" title="Belum ada foto baki"><i class="fas fa-camera"></i></span>';
    if (b.last_photo_url) {
      const safeTitle = escapeHtml(displayCode + ' - ' + b.product_name);
      const safeMeta = escapeHtml(getQCStageLabel(b.last_stage) + ' | Daya Tumbuh: ' + (b.last_germination_rate !== null ? b.last_germination_rate + '%' : '-'));
      photoHtml = '<img src="' + escapeHtml(b.last_photo_url) + '" alt="Foto Baki" class="qc-photo-thumbnail" title="Klik untuk memperbesar foto baki" onclick="openQCPhotoViewer(\'' + escapeHtml(b.last_photo_url) + '\', \'' + safeTitle + '\', \'' + safeMeta + '\')">';
    }

    // 3. Status Kelulusan
    let statusBadge = '<span class="badge badge-qc-waiting">⚠️ Menunggu Uji</span>';
    if (b.category === 'Lolos Mutu') {
      statusBadge = '<span class="badge badge-qc-passed"><i class="fas fa-check-circle"></i> Lolos Mutu</span>';
    } else if (b.category === 'Butuh Uji Berkala') {
      statusBadge = '<span class="badge badge-qc-waiting">⏰ Butuh Uji Berkala</span>';
    } else if (b.category === 'Karantina/Gagal') {
      statusBadge = '<span class="badge badge-qc-failed"><i class="fas fa-times-circle"></i> Karantina / Gagal</span>';
    } else if (b.category === 'Proses DHT') {
      const ovenBadgeLabel = b.dht_info ? (b.dht_info.oven_no + ' (' + b.dht_info.target_temp + '°C)') : 'Proses DHT';
      statusBadge = '<span class="badge-qc-oven-running"><span class="flame-icon">🔥</span> ' + escapeHtml(ovenBadgeLabel) + '</span>';
    } else if (b.last_stage === 'DHT_24JAM' && b.dht_info && b.dht_info.is_finished) {
      statusBadge = '<span class="badge badge-qc-waiting">⏳ Siap Uji Pasca-DHT</span>';
    } else if (b.last_status === 'PASSED' && (b.last_stage === 'UJI_1_PETANI' || b.last_stage === 'UJI_2_LAB')) {
      statusBadge = '<span class="badge badge-qc-waiting">🧪 Pra-DHT Lulus (Lanjut Uji)</span>';
    }

    // 4. Tahap Terakhir
    const stageLabel = getQCStageLabel(b.last_stage);
    const dateLabel = b.last_tested_at ? ('<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + formatDate(b.last_tested_at) + '</div>') : '';

    // 5. Tombol Aksi
    let actionButtons = '';
    if (b.category === 'Proses DHT' || (b.dht_info && !b.dht_info.is_finished)) {
      actionButtons =
        '<button type="button" class="btn btn-sm btn-success" onclick="actionCompleteDHT(\'' + escapeHtml(b.batch_id) + '\', \'' + escapeHtml(displayCode) + '\')" title="Keluarkan dari Oven &amp; Selesaikan Tahap DHT" style="margin-right:4px;">' +
        '<i class="fas fa-door-open mr-1"></i> Keluarkan' +
        '</button>' +
        '<button type="button" class="btn btn-sm btn-primary" onclick="openQCEntryModal(\'' + escapeHtml(b.batch_id) + '\')" title="Input uji tahapan lanjutan" style="margin-right:4px;">' +
        '+ Uji QC' +
        '</button>';
    } else {
      actionButtons =
        '<button type="button" class="btn btn-sm btn-primary" onclick="openQCEntryModal(\'' + escapeHtml(b.batch_id) + '\')" title="Input uji tahapan lanjutan" style="margin-right:4px;">' +
        '+ Uji QC' +
        '</button>';
    }
    if (b.history && b.history.length > 0) {
      actionButtons += '<button type="button" class="btn btn-sm btn-secondary" onclick="openQCHistoryModal(\'' + escapeHtml(b.batch_id) + '\')" title="Lihat riwayat lengkap">' + b.history.length + ' Uji</button>';
    }

    return '<tr>' +
      '<td style="text-align:center;font-size:12px;color:var(--text-secondary);">' + (index + 1) + '</td>' +
      '<td>' +
      '<span style="font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);font-size:12px;">' + escapeHtml(displayCode) + '</span>' +
      '<div style="font-size:10.5px;color:var(--text-secondary);margin-top:2px;">Sisa: ' + b.qty_remaining + ' ' + escapeHtml(b.unit) + '</div>' +
      '</td>' +
      '<td>' +
      '<div style="font-weight:600;color:var(--text-main);">' + escapeHtml(b.product_name) + '</div>' +
      (b.production_date ? ('<div style="font-size:10.5px;color:var(--text-secondary);">Tgl Panen: ' + formatDate(b.production_date) + '</div>') : '') +
      '</td>' +
      '<td>' +
      '<div style="font-size:11.5px;font-weight:600;">' + stageLabel + '</div>' +
      dateLabel +
      '</td>' +
      '<td>' + rateHtml + '</td>' +
      '<td style="text-align:center;">' + photoHtml + '</td>' +
      '<td style="text-align:center;">' + statusBadge + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' + actionButtons + '</td>' +
      '</tr>';
  }).join('');
}

function setQCFilter(category) {
  CURRENT_QC_FILTER = category;
  document.querySelectorAll('#qc-filter-pills .qc-filter-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.textContent.indexOf(category) !== -1);
  });
  const searchVal = document.getElementById('qc-search-input') ? document.getElementById('qc-search-input').value : '';
  const tbody = document.getElementById('qc-table-body');
  if (tbody) {
    tbody.innerHTML = renderQCTableRows(CURRENT_QC_RECORDS, CURRENT_QC_FILTER, searchVal);
  }
}

function onQCSearchInput(keyword) {
  const tbody = document.getElementById('qc-table-body');
  if (tbody) {
    tbody.innerHTML = renderQCTableRows(CURRENT_QC_RECORDS, CURRENT_QC_FILTER, keyword);
  }
}

// ========================= FORM MODAL INPUT QC & HELPER DHT =========================

function formatDateTimeLocal(d) {
  const date = d || new Date();
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return date.getFullYear() + '-' +
    pad(date.getMonth() + 1) + '-' +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) + ':' +
    pad(date.getMinutes());
}

function checkWeekendWarning(val) {
  const warningEl = document.getElementById('qc-weekend-warning');
  if (!warningEl) return;
  if (!val) {
    warningEl.style.display = 'none';
    return;
  }
  const dt = new Date(val);
  if (isNaN(dt.getTime())) {
    warningEl.style.display = 'none';
    return;
  }
  const day = dt.getDay(); // 0: Minggu, 5: Jumat, 6: Sabtu
  const hour = dt.getHours();
  // Peringatan jika dimulai Jumat pukul 12:00 ke atas, atau hari Sabtu/Minggu
  const isWeekendRisk = (day === 5 && hour >= 12) || (day === 6) || (day === 0);
  warningEl.style.display = isWeekendRisk ? 'block' : 'none';
}

function openQCEntryModal(preselectedBatchId, preselectedStage) {
  const modal = document.getElementById('modal-qc-entry');
  const batchSelect = document.getElementById('qc-batch-id');
  const stageSelect = document.getElementById('qc-stage');
  const trayA = document.getElementById('qc-tray-a');
  const trayB = document.getElementById('qc-tray-b');
  const notes = document.getElementById('qc-notes');
  const statusBox = document.getElementById('qc-upload-status');
  const btnSave = document.getElementById('btn-save-qc');
  const autoCard = document.getElementById('qc-batch-auto-card');
  const dhtOven = document.getElementById('qc-dht-oven');
  const dhtTemp = document.getElementById('qc-dht-temp');
  const dhtStartTime = document.getElementById('qc-dht-start-time');
  const weekendWarning = document.getElementById('qc-weekend-warning');
  if (!modal || !batchSelect) return;

  // Reset isian form
  if (trayA) trayA.value = 0;
  if (trayB) trayB.value = 0;
  if (notes) notes.value = '';
  if (statusBox) statusBox.style.display = 'none';
  if (btnSave) btnSave.disabled = false;
  if (dhtOven) dhtOven.value = 'Oven 1';
  if (dhtTemp) dhtTemp.value = 50;
  if (dhtStartTime) {
    dhtStartTime.value = formatDateTimeLocal(new Date());
    checkWeekendWarning(dhtStartTime.value);
  }
  if (weekendWarning) weekendWarning.style.display = 'none';

  removeQCPhoto();
  calculateQCGermination();

  const populateDropdown = function (records) {
    let optionsHtml = '<option value="">-- Pilih Batch Antrean QC --</option>';
    records.forEach(function (b) {
      const isSelected = preselectedBatchId && String(b.batch_id) === String(preselectedBatchId);
      const catLabel = b.category || b.qc_status || 'Menunggu Uji';
      const displayCode = getQCBatchDisplayCode(b);
      optionsHtml += '<option value="' + escapeHtml(b.batch_id) + '"' + (isSelected ? ' selected' : '') + '>' +
        escapeHtml(displayCode) + ' — ' + escapeHtml(b.product_name) + ' (' + escapeHtml(catLabel) + ')' +
        '</option>';
    });
    batchSelect.innerHTML = optionsHtml;

    if (preselectedBatchId) {
      batchSelect.value = preselectedBatchId;
      onQCBatchSelected();
      if (preselectedStage && stageSelect) {
        stageSelect.value = preselectedStage;
        onQCStageChanged();
      }
    } else {
      if (autoCard) autoCard.style.display = 'none';
      if (preselectedStage && stageSelect) {
        stageSelect.value = preselectedStage;
        onQCStageChanged();
      }
    }
  };

  if (CURRENT_QC_RECORDS && CURRENT_QC_RECORDS.length > 0) {
    populateDropdown(CURRENT_QC_RECORDS);
  } else {
    batchSelect.innerHTML = '<option value="">⏳ Mengambil daftar antrean batch...</option>';
    api('getQCRecords', TOKEN).then(function (records) {
      CURRENT_QC_RECORDS = Array.isArray(records) ? records : [];
      populateDropdown(CURRENT_QC_RECORDS);
    }).catch(function () {
      populateDropdown([]);
    });
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeQCEntryModal() {
  const modal = document.getElementById('modal-qc-entry');
  if (modal) modal.style.display = 'none';
  syncModalOpenState();
}

function onQCBatchSelected() {
  const batchSelect = document.getElementById('qc-batch-id');
  const autoCard = document.getElementById('qc-batch-auto-card');
  const stageSelect = document.getElementById('qc-stage');
  if (!batchSelect) return;

  const bId = batchSelect.value;
  if (!bId) {
    if (autoCard) autoCard.style.display = 'none';
    return;
  }

  const batch = (CURRENT_QC_RECORDS || []).filter(function (r) { return String(r.batch_id) === String(bId); })[0];
  if (!batch) {
    if (autoCard) autoCard.style.display = 'none';
    return;
  }

  // Tampilkan kartu info otomatis read-only (Anti-Dobel Ketik)
  if (autoCard) autoCard.style.display = 'block';

  const nameEl = document.getElementById('qc-info-product-name');
  const farmerEl = document.getElementById('qc-info-farmer-name');
  const dateEl = document.getElementById('qc-info-entry-date');
  const stockEl = document.getElementById('qc-info-current-stock');

  if (nameEl) nameEl.textContent = batch.product_name || '-';
  if (farmerEl) farmerEl.textContent = batch.farmer_name || '-';
  if (dateEl) {
    const rawDate = batch.entry_date || batch.received_at || batch.production_date || '';
    dateEl.textContent = rawDate ? formatDate(rawDate) : '-';
  }
  if (stockEl) {
    const stockVal = (batch.qty_remaining !== undefined && batch.qty_remaining !== null) ? batch.qty_remaining : (batch.current_stock || 0);
    stockEl.textContent = stockVal + ' ' + (batch.unit || 'gr');
  }

  // Rekomendasikan tahapan berikutnya secara cerdas
  if (stageSelect) {
    if (batch.needs_retest) {
      stageSelect.value = 'UJI_BERKALA';
    } else if (!batch.last_stage || batch.last_stage === '-') {
      stageSelect.value = 'UJI_1_PETANI';
    } else if (batch.last_stage === 'UJI_1_PETANI') {
      stageSelect.value = 'UJI_2_LAB';
    } else if ((batch.last_stage === 'UJI_2_LAB' || String(batch.last_stage).includes('_2_'))) {
      stageSelect.value = 'DHT_24JAM';
    } else {
      stageSelect.value = 'UJI_3_PASCA_DHT';
    }
    onQCStageChanged();
  }
}

function onQCStageChanged() {
  const stageSelect = document.getElementById('qc-stage');
  const stageNote = document.getElementById('qc-stage-note');
  const germSection = document.getElementById('qc-germination-section');
  const dhtSection = document.getElementById('qc-dht-section');
  const btnSave = document.getElementById('btn-save-qc');
  const dhtStartTime = document.getElementById('qc-dht-start-time');
  if (!stageSelect) return;

  const val = stageSelect.value;
  if (val === 'DHT_24JAM') {
    if (germSection) germSection.style.display = 'none';
    if (dhtSection) {
      dhtSection.style.display = 'block';
      if (dhtStartTime && !dhtStartTime.value) {
        dhtStartTime.value = formatDateTimeLocal(new Date());
        checkWeekendWarning(dhtStartTime.value);
      }
    }
    if (btnSave) {
      btnSave.innerHTML = '<i class="fas fa-fire mr-1"></i> 🔥 Mulai Proses Oven (24 Jam)';
    }
    if (stageNote) {
      stageNote.innerHTML = '🔥 <strong>Dry Heat Treatment (DHT):</strong> Pengeringan oven 24 jam untuk menurunkan kadar air benih. Baki semai dinonaktifkan sementara.';
    }
  } else {
    if (germSection) germSection.style.display = 'block';
    if (dhtSection) dhtSection.style.display = 'none';
    if (btnSave) {
      btnSave.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Simpan Catatan QC';
    }
    if (val === 'UJI_BERKALA') {
      if (stageNote) stageNote.innerHTML = '🔬 <strong>Uji Berkala / Semai Ulang:</strong> Uji semai ulang 100 butir duplo untuk mengecek vitalitas toples benih yang disimpan lama. Standar kelulusan tetap minimal 80%.';
    } else if (val === 'UJI_3_PASCA_DHT') {
      if (stageNote) stageNote.innerHTML = '⭐ <strong>Uji penentu mutu akhir:</strong> Jika total daya tumbuh ≥ 80%, batch otomatis berstatus APPROVED dan terbuka untuk kasir POS &amp; Kemas Mandiri; jika &lt; 80%, masuk Karantina.';
    } else if ((val === 'UJI_2_LAB' || String(val).includes('_2_'))) {
      if (stageNote) stageNote.innerHTML = '🧪 <strong>Uji Pra-DHT (Lab/Kantor):</strong> Jika ≥ 80% berlanjut ke tahap Oven DHT 24 Jam (belum membuka kunci stok). Jika &lt; 80% langsung masuk Karantina/Gagal.';
    } else {
      if (stageNote) stageNote.innerHTML = '🌱 <strong>Uji Awal Petani:</strong> Jika ≥ 80% tercatat lulus pra-DHT (belum membuka kunci stok, lanjut ke Lab &amp; DHT). Jika &lt; 80% langsung masuk Karantina/Gagal.';
    }
  }
  calculateQCGermination();
}

function calculateQCGermination() {
  const trayAEl = document.getElementById('qc-tray-a');
  const trayBEl = document.getElementById('qc-tray-b');
  const textEl = document.getElementById('qc-rate-text');
  const badgeEl = document.getElementById('qc-rate-badge');
  const indicatorEl = document.getElementById('qc-germination-indicator');
  const stageSelect = document.getElementById('qc-stage');

  let trayA = Number(trayAEl ? trayAEl.value : 0) || 0;
  let trayB = Number(trayBEl ? trayBEl.value : 0) || 0;

  // Clamp 0 - 50
  if (trayA < 0) trayA = 0;
  if (trayA > 50) { trayA = 50; if (trayAEl) trayAEl.value = 50; }
  if (trayB < 0) trayB = 0;
  if (trayB > 50) { trayB = 50; if (trayBEl) trayBEl.value = 50; }

  const total = trayA + trayB;
  const isDHT = stageSelect && stageSelect.value === 'DHT_24JAM';

  if (isDHT) {
    if (textEl) textEl.textContent = 'Tahap Pengeringan DHT 24 Jam (Proses Oven)';
    if (badgeEl) {
      badgeEl.className = 'badge badge-info';
      badgeEl.textContent = 'OVEN SELESAI';
    }
    if (indicatorEl) {
      indicatorEl.className = 'qc-rate-indicator';
      indicatorEl.style.background = '#EFF6FF';
      indicatorEl.style.border = '1px solid #BFDBFE';
      indicatorEl.style.color = '#1E40AF';
    }
    return;
  }

  const isPass = total >= 80;
  if (textEl) textEl.textContent = 'Daya Tumbuh: ' + total + '% (Standar Mutu: Min 80%)';
  if (badgeEl) {
    badgeEl.className = 'badge ' + (isPass ? 'badge-success' : 'badge-danger');
    badgeEl.textContent = isPass ? 'MEMENUHI (≥80%)' : 'BELUM MEMENUHI (<80%)';
  }
  if (indicatorEl) {
    indicatorEl.className = 'qc-rate-indicator ' + (isPass ? 'qc-rate-pass' : 'qc-rate-fail');
    if (isPass) {
      indicatorEl.style.background = '#ECFDF5';
      indicatorEl.style.border = '1px solid #A7F3D0';
      indicatorEl.style.color = '#065F46';
    } else {
      indicatorEl.style.background = '#FEF2F2';
      indicatorEl.style.border = '1px solid #FECACA';
      indicatorEl.style.color = '#991B1B';
    }
  }
}

// ========================= KAMERA ON-SITE & KOMPRESI CANVAS =========================

function triggerQCCamera() {
  const cameraInput = document.getElementById('qc-camera-input');
  if (cameraInput) {
    cameraInput.click();
  }
}

function handleQCCameraCapture(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.match(/^image\//)) {
    showToast('File yang dipilih harus berupa format gambar (JPG/PNG).', true);
    return;
  }

  showToast('Memproses & mengompres foto baki...');

  const reader = new FileReader();
  reader.onerror = function () {
    showToast('Gagal membaca file gambar.', true);
  };
  reader.onload = function (e) {
    const img = new Image();
    img.onerror = function () {
      showToast('Gagal memproses gambar untuk kompresi.', true);
    };
    img.onload = function () {
      // 1. Resize proporsional dengan batas maksimal 1280px
      const MAX_DIM = 1280;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_DIM) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        }
      } else {
        if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      // 2. Gambar ke HTMLCanvasElement
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // 3. Kompresi JPEG kualitas 0.7 (menghasilkan ukuran ~150-300 KB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      currentQCPhotoBase64 = compressedDataUrl;

      // Hitung perkiraan ukuran KB
      const sizeKB = Math.round((compressedDataUrl.length * 3 / 4) / 1024);

      // 4. Tampilkan thumbnail di kotak pratinjau modal
      const previewBox = document.getElementById('qc-photo-preview');
      const previewImg = document.getElementById('qc-preview-img');
      const sizeInfo = document.getElementById('qc-file-size-info');

      if (previewImg) previewImg.src = compressedDataUrl;
      if (sizeInfo) sizeInfo.textContent = 'Ukuran: ' + sizeKB + ' KB (Terkonversi)';
      if (previewBox) previewBox.style.display = 'inline-block';

      showToast('Foto baki siap disimpan (' + sizeKB + ' KB).');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeQCPhoto() {
  currentQCPhotoBase64 = '';
  const previewBox = document.getElementById('qc-photo-preview');
  const previewImg = document.getElementById('qc-preview-img');
  const cameraInput = document.getElementById('qc-camera-input');
  if (previewBox) previewBox.style.display = 'none';
  if (previewImg) previewImg.src = '';
  if (cameraInput) cameraInput.value = '';
}

function zoomQCPreview() {
  if (!currentQCPhotoBase64) return;
  const batchId = document.getElementById('qc-batch-id') ? document.getElementById('qc-batch-id').value : '';
  const stage = document.getElementById('qc-stage') ? document.getElementById('qc-stage').value : '';
  openQCPhotoViewer(currentQCPhotoBase64, 'Pratinjau Foto Baki Semai', 'Batch: ' + escapeHtml(getQCBatchDisplayCode(batchId)) + ' | Tahap: ' + getQCStageLabel(stage));
}

// ========================= PENGIRIMAN DATA FORM QC =========================

function submitQCForm() {
  const batchSelect = document.getElementById('qc-batch-id');
  const stageSelect = document.getElementById('qc-stage');
  const trayAEl = document.getElementById('qc-tray-a');
  const trayBEl = document.getElementById('qc-tray-b');
  const notesEl = document.getElementById('qc-notes');
  const statusBox = document.getElementById('qc-upload-status');
  const statusText = document.getElementById('qc-upload-status-text');
  const btnSave = document.getElementById('btn-save-qc');

  if (!batchSelect || !batchSelect.value) {
    showToast('Silakan pilih Kode Batch toples benih.', true);
    return;
  }
  if (!stageSelect || !stageSelect.value) {
    showToast('Silakan tentukan tahapan pengujian QC.', true);
    return;
  }

  const batchId = batchSelect.value;
  const batchCode = getQCBatchDisplayCode(batchId);
  const stage = stageSelect.value;
  const notes = notesEl ? notesEl.value.trim() : '';

  // Khusus tahap DHT 24 Jam Oven
  if (stage === 'DHT_24JAM') {
    const ovenEl = document.getElementById('qc-dht-oven');
    const tempEl = document.getElementById('qc-dht-temp');
    const startTimeEl = document.getElementById('qc-dht-start-time');
    const ovenNo = ovenEl ? ovenEl.value : 'Oven 1';
    const targetTemp = Number(tempEl ? tempEl.value : 50);
    const startTimeVal = startTimeEl ? startTimeEl.value : '';

    if (targetTemp < 40 || targetTemp > 75) {
      showToast('Suhu target oven DHT harus berada di antara 40°C sampai 75°C.', true);
      return;
    }

    if (statusBox) statusBox.style.display = 'block';
    if (statusText) statusText.textContent = 'Memulai sesi oven DHT 24 jam...';
    if (btnSave) btnSave.disabled = true;

    api('startDHTSession', TOKEN, {
      batch_id: batchId,
      batch_code: batchCode,
      oven_no: ovenNo,
      target_temp: targetTemp,
      start_time: startTimeVal,
      notes: notes
    }).then(function (res) {
      if (statusBox) statusBox.style.display = 'none';
      if (btnSave) btnSave.disabled = false;
      showToast(res.message || 'Proses oven DHT 24 jam berhasil dimulai!');
      closeQCEntryModal();
      invalidateCache('qc_records');
      invalidateCache('products');
      invalidateCache('batches');
      invalidateCache('dashboard');
      renderQC(true);
    }).catch(function (err) {
      if (statusBox) statusBox.style.display = 'none';
      if (btnSave) btnSave.disabled = false;
      showToast('Gagal memulai DHT: ' + (err.message || err), true);
    });
    return;
  }

  // Tahap Uji Semai Biasa (Duplo 100 Butir)
  const trayA = Number(trayAEl ? trayAEl.value : 0) || 0;
  const trayB = Number(trayBEl ? trayBEl.value : 0) || 0;

  if (trayA < 0 || trayA > 50 || trayB < 0 || trayB > 50) {
    showToast('Jumlah butir tumbuh pada Baki A dan Baki B harus di antara 0 sampai 50.', true);
    return;
  }

  const payload = {
    batch_id: batchId,
    batch_code: batchCode,
    stage: stage,
    tray_a: trayA,
    tray_b: trayB,
    notes: notes,
    imageBase64: currentQCPhotoBase64,
    imageMimeType: 'image/jpeg'
  };

  if (statusBox) statusBox.style.display = 'block';
  if (statusText) statusText.textContent = currentQCPhotoBase64 ? 'Menyimpan catatan dan mengunggah foto ke Drive...' : 'Menyimpan catatan uji QC...';
  if (btnSave) btnSave.disabled = true;

  api('saveQCStageWithPhoto', TOKEN, payload).then(function (res) {
    if (statusBox) statusBox.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    showToast(res.message || 'Catatan QC berhasil disimpan!');
    closeQCEntryModal();
    invalidateCache('qc_records');
    invalidateCache('products');
    invalidateCache('batches');
    invalidateCache('dashboard');
    renderQC(true);
  }).catch(function (err) {
    if (statusBox) statusBox.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    showToast('Gagal menyimpan QC: ' + (err.message || err), true);
  });
}

// ========================= LIGHTBOX & MODAL RIWAYAT QC =========================

function openQCPhotoViewer(photoUrl, title, metaHtml) {
  const modal = document.getElementById('modal-qc-photo-viewer');
  const img = document.getElementById('qc-lightbox-img');
  const titleEl = document.getElementById('qc-lightbox-title');
  const metaEl = document.getElementById('qc-lightbox-meta');
  const driveLink = document.getElementById('qc-lightbox-drive-link');
  if (!modal || !img) return;

  img.src = photoUrl;
  if (titleEl) titleEl.textContent = title || 'Dokumentasi Foto Baki Benih';
  if (metaEl) metaEl.innerHTML = metaHtml || '';
  if (driveLink) {
    if (photoUrl.indexOf('drive.google.com') !== -1) {
      driveLink.href = photoUrl;
      driveLink.style.display = 'inline-block';
    } else {
      driveLink.style.display = 'none';
    }
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeQCPhotoViewer() {
  const modal = document.getElementById('modal-qc-photo-viewer');
  const img = document.getElementById('qc-lightbox-img');
  if (modal) modal.style.display = 'none';
  if (img) img.src = '';
  syncModalOpenState();
}

function openQCHistoryModal(batchId) {
  const batch = CURRENT_QC_RECORDS.filter(function (r) { return String(r.batch_id) === String(batchId); })[0];
  if (!batch) return;

  const displayCode = getQCBatchDisplayCode(batch);
  const history = batch.history || [];
  let bodyHtml =
    '<div style="margin-bottom:14px;padding:10px 14px;background:var(--surface-muted);border-radius:8px;">' +
    '<div style="font-weight:700;font-size:14px;color:var(--text-main);">' + escapeHtml(batch.product_name) + '</div>' +
    '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">Kode Batch: <code>' + escapeHtml(displayCode) + '</code> | Sisa Stok: ' + batch.qty_remaining + ' ' + escapeHtml(batch.unit) + ' | Status Mutu: <strong>' + escapeHtml(batch.qc_status) + '</strong></div>' +
    '</div>';

  if (history.length === 0) {
    bodyHtml += '<div class="empty-state">Belum ada riwayat pengujian untuk batch ini.</div>';
  } else {
    bodyHtml +=
      '<div class="table-container">' +
      '<table class="table">' +
      '<thead>' +
      '<tr>' +
      '<th>Waktu &amp; Penguji</th>' +
      '<th>Tahapan Uji</th>' +
      '<th>Daya Tumbuh</th>' +
      '<th>Foto Baki</th>' +
      '<th>Hasil</th>' +
      '<th>Catatan</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      history.map(function (h) {
        const stageLabel = getQCStageLabel(h.stage);
        const rate = Number(h.germination_rate || 0);
        const hStatusUp = String(h.status || '').toUpperCase();
        const badgeCls = (hStatusUp === 'PASSED' || hStatusUp === 'COMPLETED')
          ? 'badge-success'
          : (hStatusUp === 'FAILED' ? 'badge-danger' : 'badge-warning');
        const rateDisplay = h.stage === 'DHT_24JAM' ? 'Oven DHT 24J' : (rate + '% (A:' + (h.tray_a_count || 0) + ' B:' + (h.tray_b_count || 0) + ')');
        const photoLink = h.photo_drive_url
          ? '<a href="#" onclick="openQCPhotoViewer(\'' + escapeHtml(h.photo_drive_url) + '\', \'' + escapeHtml(displayCode + ' - ' + stageLabel) + '\', \'Daya Tumbuh: ' + rateDisplay + '\'); return false;" style="color:#2563EB;font-weight:600;">📷 Lihat Foto</a>'
          : '<span style="color:var(--text-secondary);font-size:11px;">-</span>';

        return '<tr>' +
          '<td><strong>' + formatDate(h.tested_at) + '</strong><br><small style="color:var(--text-secondary);">' + escapeHtml(h.tested_by || '-') + '</small></td>' +
          '<td>' + stageLabel + '</td>' +
          '<td><strong>' + rateDisplay + '</strong></td>' +
          '<td>' + photoLink + '</td>' +
          '<td><span class="badge ' + badgeCls + '">' + escapeHtml(h.status) + '</span></td>' +
          '<td style="font-size:11.5px;color:var(--text-secondary);max-width:180px;">' + escapeHtml(h.notes || '-') + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>';
  }

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>' +
    '<button type="button" class="btn btn-primary" onclick="closeModal(); openQCEntryModal(\'' + escapeHtml(batch.batch_id) + '\')">+ Input Uji Baru</button>';

  openModal('Riwayat Uji QC: ' + displayCode, bodyHtml, footerHtml, true);
}


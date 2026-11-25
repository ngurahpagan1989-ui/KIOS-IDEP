// ========================= PURNA JUAL (AFTER-SALES) =========================
// ============================================================================
// MODUL TERPADU: PURNA JUAL & KEPUASAN PELANGGAN
// 1. Klaim Garansi Daya Tumbuh Benih & Auto-Karantina Batch
// 2. Pelacak Penarikan Batch (Batch Recall Tracker)
// 3. Pengingat Siklus Panen & Rekomendasi Rotasi Tanam
// 4. Buku Log Konsultasi Teknis Kebun
// ============================================================================

window._pjState = {
  subtab: 'claims',
  claims: [],
  batches: [],
  recallData: null,
  harvestReminders: [],
  followUps: { h7List: [], harvestList: [], historyList: [] },
  followUpCounts: { h7Count: 0, harvestCount: 0, historyCount: 0, totalActive: 0 },
  activeFollowUpTab: 'h7',
  followUpSearch: '',
  consultations: [],
  activeBatchId: '',
  searchConsult: '',
  isLoadingRecall: false
};

function updatePurnaJualNavBadge() {
  const badge = document.getElementById('badge-purnajual-count');
  if (!badge) return;
  const total = (window._pjState && window._pjState.followUpCounts && window._pjState.followUpCounts.totalActive) || 0;
  if (total > 0) {
    badge.textContent = total;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderPurnaJual(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const hasData = window._pjState && window._pjState.loaded;
  if (!forceRefresh && hasData) {
    drawPurnaJualIntegratedUI();
    return;
  }

  if (!hasData) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat modul Purna Jual &amp; Kepuasan Pelanggan...</div></div>';
  }

  Promise.all([
    api('getAfterSalesClaims', TOKEN),
    api('getAllBatchesForRecall', TOKEN),
    api('getFollowUpList', TOKEN),
    api('getConsultationLogs', TOKEN)
  ]).then(function (results) {
    window._pjState.claims = Array.isArray(results[0]) ? results[0] : [];
    window._pjState.batches = Array.isArray(results[1]) ? results[1] : [];
    const fuData = results[2] || { h7List: [], harvestList: [], historyList: [], counts: { h7Count: 0, harvestCount: 0, historyCount: 0, totalActive: 0 } };
    window._pjState.followUps = fuData;
    window._pjState.followUpCounts = fuData.counts || { h7Count: (fuData.h7List || []).length, harvestCount: (fuData.harvestList || []).length, historyCount: (fuData.historyList || []).length, totalActive: ((fuData.h7List || []).length + (fuData.harvestList || []).length) };
    window._pjState.harvestReminders = fuData.harvestList || [];
    window._pjState.consultations = Array.isArray(results[3]) ? results[3] : [];
    window._pjState.loaded = true;

    updatePurnaJualNavBadge();

    // Pilih batch pertama jika belum ada batch terpilih untuk recall
    if (!window._pjState.activeBatchId && window._pjState.batches.length > 0) {
      window._pjState.activeBatchId = window._pjState.batches[0].id;
    }

    drawPurnaJualIntegratedUI();
  }).catch(function (err) {
    if (!hasData) {
      showToast('Gagal memuat data purna jual: ' + (err.message || err), true);
      content.innerHTML = '<div class="card"><div class="empty-state">Terjadi kendala saat memuat data. Silakan coba kembali.</div></div>';
    }
  });
}

function drawPurnaJualIntegratedUI() {
  const content = document.getElementById('content');
  if (!content) return;

  const quarantinedBatches = (window._pjState.batches || []).filter(function (b) {
    return String(b.quality_status || '').toUpperCase() === 'QUARANTINE';
  });

  let quarantineBannerHtml = '';
  if (quarantinedBatches.length > 0) {
    const batchListStr = quarantinedBatches.map(function (b) {
      return '<strong>' + escapeHtml(b.id) + '</strong> (' + escapeHtml(b.product_name) + ' - Komplain: ' + b.complaint_count + ')';
    }).join(', ');

    quarantineBannerHtml =
      '<div class="pj-quarantine-banner">' +
      '<div style="font-size:24px;line-height:1;">⚠️</div>' +
      '<div>' +
      '<h4>PERINGATAN MUTU: ' + quarantinedBatches.length + ' Batch Dalam Status QUARANTINE</h4>' +
      '<p>Batch berikut otomatis dikarantina karena menerima &ge; 3 komplain daya tumbuh dan <strong>DIBLOKIR</strong> dari kasir POS maupun drop konsinyasi: ' +
      batchListStr + '</p>' +
      '</div>' +
      '</div>';
  }

  const sub = window._pjState.subtab || 'claims';
  const totalFollowUpActive = (window._pjState.followUpCounts && window._pjState.followUpCounts.totalActive) || 0;

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Purna Jual & Kepuasan Pelanggan</h1>' +
    '<p class="page-subtitle">Pusat kendali klaim garansi benih, pelacakan penarikan batch, sapaan panen via WA, dan konsultasi kebun.</p>' +
    '</div>' +
    '</div>' +
    quarantineBannerHtml +
    '<div class="pj-subnav">' +
    '<button type="button" class="pj-subnav-btn ' + (sub === 'claims' ? 'active' : '') + '" onclick="switchPJSubtab(\'claims\')">' +
    '<span>🌱 Klaim Garansi Benih</span>' +
    '<span class="pj-subnav-badge">' + (window._pjState.claims ? window._pjState.claims.length : 0) + '</span>' +
    '</button>' +
    '<button type="button" class="pj-subnav-btn ' + (sub === 'recall' ? 'active' : '') + '" onclick="switchPJSubtab(\'recall\')">' +
    '<span>🚨 Penarikan Batch (Recall)</span>' +
    (quarantinedBatches.length > 0 ? '<span class="pj-subnav-badge pj-badge-danger">' + quarantinedBatches.length + ' Karantina</span>' : '') +
    '</button>' +
    '<button type="button" class="pj-subnav-btn ' + (sub === 'harvest' ? 'active' : '') + '" onclick="switchPJSubtab(\'harvest\')">' +
    '<span>🌾 Pengingat Panen & Sapaan</span>' +
    '<span class="pj-subnav-badge ' + (totalFollowUpActive > 0 ? 'pj-badge-danger' : '') + '">' + totalFollowUpActive + '</span>' +
    '</button>' +
    '<button type="button" class="pj-subnav-btn ' + (sub === 'consultation' ? 'active' : '') + '" onclick="switchPJSubtab(\'consultation\')">' +
    '<span>📋 Buku Log Konsultasi Kebun</span>' +
    '<span class="pj-subnav-badge">' + (window._pjState.consultations ? window._pjState.consultations.length : 0) + '</span>' +
    '</button>' +
    '</div>' +
    '<div id="pj-subtab-container">' + renderPJSubtabContent() + '</div>';
}

function switchPJSubtab(subtab) {
  window._pjState.subtab = subtab;
  const container = document.getElementById('pj-subtab-container');
  if (container) {
    container.innerHTML = renderPJSubtabContent();
  }
  // Update class active pada tombol subnav
  const buttons = document.querySelectorAll('.pj-subnav-btn');
  buttons.forEach(function (btn) {
    btn.classList.remove('active');
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
  } else {
    drawPurnaJualIntegratedUI();
  }

  // Jika membuka recall dan belum pernah di-load batch detailnya
  if (subtab === 'recall' && window._pjState.activeBatchId && !window._pjState.recallData) {
    loadBatchRecallData(window._pjState.activeBatchId);
  }
}

function renderPJSubtabContent() {
  const sub = window._pjState.subtab || 'claims';
  if (sub === 'claims') return renderPJClaimsSubtab();
  if (sub === 'recall') return renderPJRecallSubtab();
  if (sub === 'harvest') return renderPJHarvestSubtab();
  if (sub === 'consultation') return renderPJConsultationSubtab();
  return '';
}

// ----------------------------------------------------------------------------
// SUB-TAB 1: KLAIM GARANSI DAYA TUMBUH BENIH
// ----------------------------------------------------------------------------

function renderPJClaimsSubtab() {
  const list = window._pjState.claims || [];

  return (
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
    '<div style="font-size:13px;color:var(--text-secondary);">' +
    'Mencatat komplain daya tumbuh benih. Batch dengan &ge; 3 komplain otomatis masuk karantina mutu.' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openClaimModal()">+ Ajukan Klaim Garansi</button>' +
    '</div>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Tgl / ID</th>' +
    '<th>Pelanggan</th>' +
    '<th>Produk & Batch</th>' +
    '<th>Kendala & Media Tanam</th>' +
    '<th>Foto Semaian</th>' +
    '<th>Resolusi</th>' +
    '<th>Status</th>' +
    '<th style="text-align:right;">Ubah Status</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (list.length ? list.map(function (c) {
      const statusCls = {
        'Diproses': 'badge-warning',
        'Selesai': 'badge-success',
        'Ditolak': 'badge-danger'
      }[c.status] || 'badge-neutral';

      let phoneLink = '';
      if (c.customer_phone) {
        let clean = String(c.customer_phone).replace(/[^0-9]/g, '');
        if (clean.startsWith('0')) clean = '62' + clean.slice(1);
        phoneLink = '<br><a href="https://wa.me/' + clean + '" target="_blank" class="text-link" style="font-size:12px;">📱 ' + escapeHtml(c.customer_phone) + '</a>';
      }

      let photoThumbnail = '<span style="color:var(--text-secondary);font-size:12px;">(Tanpa foto)</span>';
      if (c.photo_url) {
        photoThumbnail =
          '<div style="width:48px;height:48px;border-radius:4px;overflow:hidden;border:1px solid var(--border);cursor:pointer;" onclick="openClaimPhotoView(\'' + escapeHtml(c.id) + '\')">' +
          '<img src="' + c.photo_url + '" style="width:100%;height:100%;object-fit:cover;" alt="Bukti Foto">' +
          '</div>';
      }

      return '<tr>' +
        '<td>' +
        '<strong>' + escapeHtml(c.id) + '</strong><br>' +
        '<span style="font-size:11px;color:var(--text-secondary);">' + escapeHtml(c.claim_date || '') + '</span>' +
        '</td>' +
        '<td>' +
        '<strong>' + escapeHtml(c.customer_name || 'Pelanggan') + '</strong>' +
        phoneLink +
        '</td>' +
        '<td>' +
        '<strong>' + escapeHtml(c.product_name || '-') + '</strong><br>' +
        '<span class="badge badge-neutral" style="font-size:11px;">Batch: ' + escapeHtml(c.batch_id || '-') + '</span>' +
        '</td>' +
        '<td style="max-width:240px;">' +
        '<div>' + escapeHtml(c.claim_reason || '-') + '</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">' +
        (c.sowing_date ? 'Semai: ' + escapeHtml(c.sowing_date) + ' | ' : '') +
        (c.media_type ? 'Media: ' + escapeHtml(c.media_type) : '') +
        '</div>' +
        '</td>' +
        '<td>' + photoThumbnail + '</td>' +
        '<td>' +
        '<div><strong>' + escapeHtml(c.resolution_type || '-') + '</strong></div>' +
        (c.resolution_notes ? '<div style="font-size:11px;color:var(--text-secondary);">' + escapeHtml(c.resolution_notes) + '</div>' : '') +
        '</td>' +
        '<td><span class="badge ' + statusCls + '">' + escapeHtml(c.status) + '</span></td>' +
        '<td style="text-align:right;">' +
        '<select class="btn btn-secondary btn-sm" onchange="updateClaimStatusQuick(\'' + c.id + '\', this.value)">' +
        '<option value="">Ubah...</option>' +
        '<option value="Diproses"' + (c.status === 'Diproses' ? ' selected' : '') + '>Diproses</option>' +
        '<option value="Selesai"' + (c.status === 'Selesai' ? ' selected' : '') + '>Selesai</option>' +
        '<option value="Ditolak"' + (c.status === 'Ditolak' ? ' selected' : '') + '>Ditolak</option>' +
        '</select>' +
        '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="8"><div style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada catatan klaim garansi benih.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>'
  );
}

function ensurePjBatchesLoaded() {
  if (window._pjState && Array.isArray(window._pjState.batches) && window._pjState.batches.length > 0) {
    return Promise.resolve(window._pjState.batches);
  }
  return api('getAllBatchesForRecall', TOKEN).then(function (res) {
    if (!window._pjState) window._pjState = {};
    window._pjState.batches = Array.isArray(res) ? res : [];
    return window._pjState.batches;
  }).catch(function (err) {
    console.warn('Gagal memuat batch purna jual:', err);
    return [];
  });
}

function openAfterSalesModal(prefillData) {
  openClaimModal(prefillData);
}
window.openAfterSalesModal = openAfterSalesModal;

function openClaimModal(prefillData) {
  ensurePjBatchesLoaded();

  const custOptions = (CUSTOMERS_CACHE || []).map(function (c) {
    return '<option value="' + escapeHtml(c.name) + '" data-phone="' + escapeHtml(c.phone || '') + '">' + escapeHtml(c.name) + (c.phone ? ' (' + c.phone + ')' : '') + '</option>';
  }).join('');

  const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
    return '<option value="' + p.id + '">' + escapeHtml(typeof formatProductClaimLabel === 'function' ? formatProductClaimLabel(p) : (p.name + (p.variant ? ' - ' + p.variant : ''))) + '</option>';
  }).join('');

  const bodyHtml =
    '<div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px;">' +
    '<label class="field-label" style="margin-bottom:0;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px;">' +
    '<span>🔍 Cari Nota / Nama Pelanggan / No. HP / Kode Batch</span>' +
    '</label>' +
    '<label class="clm-mode-toggle" title="Centang jika pelanggan membawa fisik kemasan sachet tanpa membawa struk/nota">' +
    '<input type="checkbox" id="clm-no-invoice-toggle" onchange="toggleClaimNoInvoiceMode(this.checked)">' +
    '<span>🏷️ Klaim Tanpa Nota (Bawa Fisik Sachet)</span>' +
    '</label>' +
    '</div>' +

    '<div id="clm-search-wrap" class="clm-search-box">' +
    '<div class="clm-search-input-wrap">' +
    '<input type="text" id="clm-search-tx" class="clm-search-input" placeholder="Ketik minimal 2 karakter (contoh: TRX, Budi, 0812, atau BATCH-01)..." oninput="debounceSearchClaimTx(this.value)" autocomplete="off">' +
    '<span id="clm-search-spinner" class="clm-search-spinner" style="display:none;">⏳</span>' +
    '</div>' +
    '<div id="clm-tx-autocomplete-dropdown" class="clm-autocomplete-dropdown"></div>' +
    '<div id="clm-tx-selected-banner" class="clm-selected-tx-banner" style="display:none;">' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span style="font-size:16px;">🧾</span>' +
    '<div>' +
    '<div>Terhubung ke: <strong id="clm-selected-tx-id" style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);"></strong></div>' +
    '<div id="clm-selected-tx-cust" style="font-size:11px;color:var(--text-secondary);"></div>' +
    '</div>' +
    '</div>' +
    '<button type="button" class="btn btn-secondary btn-xs" onclick="clearSelectedClaimTx()" style="padding:3px 8px;font-size:11px;">Ganti / Lepas</button>' +
    '</div>' +
    '</div>' +
    '<div id="clm-no-invoice-notice" style="display:none;font-size:11.5px;color:var(--accent);font-weight:600;padding:4px 0;">' +
    '🏷️ Mode Fisik Sachet Aktif: Nomor nota opsional. Kasir cukup memilih varietas benih dan kode batch toples kemasan.' +
    '</div>' +
    '<input type="hidden" id="clm-tx-id" value="">' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group">' +
    '<label class="field-label">Nama Pelanggan <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="clm-cust-name" list="clm-cust-list" placeholder="Ketik / pilih pelanggan..." oninput="onClaimCustSelect(this.value)" style="padding-left:14px;">' +
    '<datalist id="clm-cust-list">' + custOptions + '</datalist>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">No. WhatsApp / HP</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="clm-cust-phone" placeholder="08xxxxxxxxxx" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group">' +
    '<label class="field-label">Tanggal Semai</label>' +
    '<div class="input-wrapper">' +
    '<input type="date" id="clm-sowing-date" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Jenis Media Tanam</label>' +
    '<div class="input-wrapper">' +
    '<select id="clm-media-type" style="padding-left:14px;">' +
    '<option value="Tanah + Kompos">Tanah Kebun + Kompos</option>' +
    '<option value="Cocopeat">Cocopeat Murni</option>' +
    '<option value="Rockwool">Rockwool / Spons Semai</option>' +
    '<option value="Sekam Bakar">Sekam Bakar Campur</option>' +
    '<option value="Tray Semai Komersial">Tray Semai Khusus</option>' +
    '<option value="Lainnya">Lainnya</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group">' +
    '<label class="field-label">Produk Benih <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<select id="clm-product-id" onchange="onClaimProductChange(this.value)" style="padding-left:14px;">' +
    '<option value="">-- Pilih Produk --</option>' + prodOptions +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label class="field-label" style="margin-bottom:0;">Kode Batch Bermasalah <span style="color:red;">*</span></label>' +
    '<button type="button" id="clm-btn-toggle-manual-batch" onclick="toggleManualBatchInput()" style="background:none;border:none;color:var(--primary);font-size:11px;cursor:pointer;text-decoration:underline;padding:0;">' +
    'Ketik Manual?' +
    '</button>' +
    '</div>' +
    '<div class="input-wrapper" id="clm-batch-select-wrap">' +
    '<select id="clm-batch-id" style="padding-left:14px;">' +
    '<option value="">-- Pilih Batch --</option>' +
    '</select>' +
    '</div>' +
    '<div class="input-wrapper" id="clm-batch-manual-wrap" style="display:none;margin-top:4px;">' +
    '<input type="text" id="clm-batch-manual-id" placeholder="Ketik kode batch dari fisik sachet..." style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Solusi / Resolusi Garansi</label>' +
    '<div class="input-wrapper">' +
    '<select id="clm-res-type" style="padding-left:14px;">' +
    '<option value="Ganti Benih Baru Batch Lain">Ganti Benih Baru Batch Lain (Retur Stok)</option>' +
    '<option value="Voucher Belanja">Voucher Belanja / Potongan Pembelian</option>' +
    '<option value="Penjelasan Teknis">Penjelasan Teknis & Tips Semai Ulang</option>' +
    '</select>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Rincian Kendala Daya Tumbuh <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<textarea id="clm-reason" rows="2" placeholder="Contoh: Dari 50 benih disemai pada media cocopeat, hanya 5 yang berkecambah setelah 10 hari..." style="padding:10px 14px;"></textarea>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Foto Bukti Semaian (Dikompres Otomatis via Kanvas)</label>' +
    '<input type="file" id="clm-photo-file" accept="image/*" onchange="handleClaimPhotoFile(this)" style="margin-bottom:6px;">' +
    '<input type="hidden" id="clm-photo-base64" value="">' +
    '<div id="clm-photo-preview-wrap" class="pj-photo-preview-box">' +
    '<span style="font-size:12px;color:var(--text-secondary);">Belum ada foto</span>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Catatan Tambahan Penanganan</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="clm-notes" placeholder="Catatan internal kasir/staf..." style="padding-left:14px;">' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-claim" onclick="submitClaimForm()">Simpan & Proses Klaim</button>';

  openModal('Ajukan Klaim Garansi Daya Tumbuh', bodyHtml, footerHtml);

  // Close autocomplete on click outside
  document.addEventListener('click', function _closeClaimDd(e) {
    const wrap = document.getElementById('clm-search-wrap');
    const dd = document.getElementById('clm-tx-autocomplete-dropdown');
    if (dd && wrap && !wrap.contains(e.target)) {
      dd.style.display = 'none';
    }
  });

  if (prefillData) {
    setTimeout(function () {
      applyClaimPrefill(prefillData);
    }, 60);
  }
}

function applyClaimPrefill(data) {
  if (!data) return;

  if (data.transaction_id) {
    const txInput = document.getElementById('clm-tx-id');
    if (txInput) txInput.value = data.transaction_id;

    const banner = document.getElementById('clm-tx-selected-banner');
    const searchInput = document.getElementById('clm-search-tx');
    const selectedTxId = document.getElementById('clm-selected-tx-id');
    const selectedTxCust = document.getElementById('clm-selected-tx-cust');

    if (banner) banner.style.display = 'flex';
    if (searchInput) searchInput.style.display = 'none';
    if (selectedTxId) selectedTxId.textContent = '#' + data.transaction_id;
    if (selectedTxCust) selectedTxCust.textContent = 'Pelanggan: ' + (data.customer_name || 'Umum') + (data.customer_phone ? ' • ' + data.customer_phone : '');
  }

  if (data.customer_name) {
    const nameInput = document.getElementById('clm-cust-name');
    if (nameInput) nameInput.value = data.customer_name;
  }

  if (data.customer_phone) {
    const phoneInput = document.getElementById('clm-cust-phone');
    if (phoneInput) phoneInput.value = data.customer_phone;
  }

  if (data.product_id) {
    const prodSelect = document.getElementById('clm-product-id');
    if (prodSelect) {
      prodSelect.value = data.product_id;
    }
    onClaimProductChange(data.product_id, data.batch_id);
  }

  if (data.notes) {
    const notesInput = document.getElementById('clm-notes');
    if (notesInput) notesInput.value = data.notes;
  }
}

let _claimSearchTimeout = null;
function debounceSearchClaimTx(query) {
  clearTimeout(_claimSearchTimeout);
  const dropdown = document.getElementById('clm-tx-autocomplete-dropdown');
  const spinner = document.getElementById('clm-search-spinner');

  query = (query || '').trim();
  if (query.length < 2) {
    if (dropdown) dropdown.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    return;
  }

  if (spinner) spinner.style.display = 'inline-block';

  _claimSearchTimeout = setTimeout(function () {
    searchClaimTransactions(query);
  }, 250);
}

function searchClaimTransactions(query) {
  const dropdown = document.getElementById('clm-tx-autocomplete-dropdown');
  const spinner = document.getElementById('clm-search-spinner');

  api('searchTransactionsForClaim', TOKEN, query).then(function (results) {
    if (spinner) spinner.style.display = 'none';
    renderClaimTxAutocomplete(results || [], query);
  }).catch(function (err) {
    if (spinner) spinner.style.display = 'none';
    const localList = (window._fakturTxList || []).filter(function (t) {
      return String(t.id || '').toLowerCase().includes(query.toLowerCase()) ||
        String(t.customer_name || '').toLowerCase().includes(query.toLowerCase());
    });
    renderClaimTxAutocomplete(localList, query);
  });
}

function renderClaimTxAutocomplete(results, query) {
  const dropdown = document.getElementById('clm-tx-autocomplete-dropdown');
  if (!dropdown) return;

  if (!results || results.length === 0) {
    dropdown.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-secondary);font-size:12px;">Tidak ada transaksi yang cocok dengan "<strong>' + escapeHtml(query) + '</strong>".</div>';
    dropdown.style.display = 'block';
    return;
  }

  window._claimSearchResults = results;

  const html = results.map(function (tx, idx) {
    const items = tx.items || [];
    const seedItems = items.filter(function (it) { return it.is_seed !== false; });
    const displayItems = (seedItems.length > 0 ? seedItems : items).slice(0, 3);
    const itemPills = displayItems.map(function (it) {
      const bText = it.batch_id ? (' [' + escapeHtml(it.batch_id) + ']') : '';
      return '<span class="clm-seed-pill">🌱 <strong>' + escapeHtml(it.product_name) + '</strong>' + bText + '</span>';
    }).join('');
    const moreCount = items.length - displayItems.length;
    const moreTag = moreCount > 0 ? '<span style="font-size:10px;color:var(--text-secondary);">+' + moreCount + ' lainnya</span>' : '';

    return '<div class="clm-tx-item" onclick="selectClaimTxFromSearch(' + idx + ')">' +
      '<div class="clm-tx-header">' +
      '<span class="clm-tx-id">#' + escapeHtml(tx.id) + '</span>' +
      '<span class="clm-tx-date">' + formatDate(tx.created_at) + '</span>' +
      '</div>' +
      '<div class="clm-tx-customer">' +
      '👤 ' + escapeHtml(tx.customer_name || 'Pelanggan Umum') +
      (tx.customer_phone ? ' &bull; <span style="color:var(--text-secondary);font-family:\'JetBrains Mono\',monospace;">' + escapeHtml(tx.customer_phone) + '</span>' : '') +
      '</div>' +
      (itemPills ? ('<div class="clm-tx-items">' + itemPills + moreTag + '</div>') : '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">(Tidak ada rincian item)</div>') +
      '</div>';
  }).join('');

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function selectClaimTxFromSearch(index) {
  const tx = (window._claimSearchResults || [])[index];
  if (!tx) return;

  const dropdown = document.getElementById('clm-tx-autocomplete-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  const txInput = document.getElementById('clm-tx-id');
  if (txInput) txInput.value = tx.id;

  const banner = document.getElementById('clm-tx-selected-banner');
  const searchInput = document.getElementById('clm-search-tx');
  const selectedTxId = document.getElementById('clm-selected-tx-id');
  const selectedTxCust = document.getElementById('clm-selected-tx-cust');

  if (banner) banner.style.display = 'flex';
  if (searchInput) searchInput.style.display = 'none';
  if (selectedTxId) selectedTxId.textContent = '#' + tx.id + ' (' + formatDate(tx.created_at) + ')';
  if (selectedTxCust) selectedTxCust.textContent = 'Pelanggan: ' + (tx.customer_name || 'Umum') + (tx.customer_phone ? ' • ' + tx.customer_phone : '');

  const nameInput = document.getElementById('clm-cust-name');
  const phoneInput = document.getElementById('clm-cust-phone');
  if (nameInput) nameInput.value = tx.customer_name || '';
  if (phoneInput && tx.customer_phone) phoneInput.value = tx.customer_phone;

  // Prioritaskan produk benih dari nota ini
  const prodSelect = document.getElementById('clm-product-id');
  if (prodSelect) {
    const items = tx.items || [];
    let opts = '';

    if (items.length > 0) {
      opts += '<optgroup label="🌱 Benih dari Nota Ini (#' + tx.id + ')">';
      items.forEach(function (it) {
        opts += '<option value="' + escapeHtml(it.product_id) + '" data-batch="' + escapeHtml(it.batch_id || '') + '">⭐ ' + escapeHtml(it.product_name) + (it.batch_id ? ' [Batch: ' + escapeHtml(it.batch_id) + ']' : '') + '</option>';
      });
      opts += '</optgroup>';
    }

    opts += '<optgroup label="📦 Seluruh Katalog Produk">';
    (PRODUCTS_CACHE || []).forEach(function (p) {
      opts += '<option value="' + p.id + '">' + escapeHtml(typeof formatProductClaimLabel === 'function' ? formatProductClaimLabel(p) : (p.name + (p.variant ? ' - ' + p.variant : ''))) + '</option>';
    });
    opts += '</optgroup>';

    prodSelect.innerHTML = '<option value="">-- Pilih Produk Benih --</option>' + opts;

    if (items.length > 0) {
      prodSelect.value = items[0].product_id;
      ensurePjBatchesLoaded().then(function () {
        onClaimProductChange(items[0].product_id, items[0].batch_id);
      });
    }
  }

  showToast('Nota #' + tx.id + ' terpilih. Data pelanggan & benih disinkronkan.');
}

function clearSelectedClaimTx() {
  const txInput = document.getElementById('clm-tx-id');
  if (txInput) txInput.value = '';

  const banner = document.getElementById('clm-tx-selected-banner');
  const searchInput = document.getElementById('clm-search-tx');
  if (banner) banner.style.display = 'none';
  if (searchInput) {
    searchInput.style.display = 'block';
    searchInput.value = '';
    searchInput.focus();
  }

  const prodSelect = document.getElementById('clm-product-id');
  if (prodSelect) {
    const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
      return '<option value="' + p.id + '">' + escapeHtml(typeof formatProductClaimLabel === 'function' ? formatProductClaimLabel(p) : (p.name + (p.variant ? ' - ' + p.variant : ''))) + '</option>';
    }).join('');
    prodSelect.innerHTML = '<option value="">-- Pilih Produk --</option>' + prodOptions;
  }
}

function toggleClaimNoInvoiceMode(isNoInvoice) {
  const searchWrap = document.getElementById('clm-search-wrap');
  const notice = document.getElementById('clm-no-invoice-notice');
  const txInput = document.getElementById('clm-tx-id');
  const custNameInput = document.getElementById('clm-cust-name');

  if (isNoInvoice) {
    if (searchWrap) searchWrap.style.display = 'none';
    if (notice) notice.style.display = 'block';
    if (txInput) txInput.value = '';
    if (custNameInput && !custNameInput.value) {
      custNameInput.placeholder = 'Nama pelanggan (Bawa Fisik Sachet / Bebas)...';
    }
    const prodSelect = document.getElementById('clm-product-id');
    if (prodSelect) {
      const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
        return '<option value="' + p.id + '">' + escapeHtml(typeof formatProductClaimLabel === 'function' ? formatProductClaimLabel(p) : (p.name + (p.variant ? ' - ' + p.variant : ''))) + '</option>';
      }).join('');
      prodSelect.innerHTML = '<option value="">-- Pilih Produk Benih --</option>' + prodOptions;
    }
  } else {
    if (searchWrap) searchWrap.style.display = 'block';
    if (notice) notice.style.display = 'none';
    if (custNameInput) custNameInput.placeholder = 'Ketik / pilih pelanggan...';
  }
}

function toggleManualBatchInput() {
  const selectWrap = document.getElementById('clm-batch-select-wrap');
  const manualWrap = document.getElementById('clm-batch-manual-wrap');
  const toggleBtn = document.getElementById('clm-btn-toggle-manual-batch');

  if (!manualWrap) return;
  const isManual = manualWrap.style.display !== 'none';

  if (isManual) {
    manualWrap.style.display = 'none';
    if (selectWrap) selectWrap.style.display = 'block';
    if (toggleBtn) toggleBtn.textContent = 'Ketik Manual?';
  } else {
    manualWrap.style.display = 'block';
    if (selectWrap) selectWrap.style.display = 'none';
    if (toggleBtn) toggleBtn.textContent = 'Pilih dari Daftar?';
    const manualInput = document.getElementById('clm-batch-manual-id');
    if (manualInput) manualInput.focus();
  }
}

function onClaimCustSelect(val) {
  const datalist = document.getElementById('clm-cust-list');
  if (!datalist) return;
  const options = datalist.querySelectorAll('option');
  for (let i = 0; i < options.length; i++) {
    if (options[i].value.toLowerCase() === (val || '').toLowerCase()) {
      const phone = options[i].getAttribute('data-phone');
      const phoneInput = document.getElementById('clm-cust-phone');
      if (phone && phoneInput && !phoneInput.value) {
        phoneInput.value = phone;
      }
      break;
    }
  }
}

function onClaimProductChange(productId, defaultBatchId) {
  const batchSelect = document.getElementById('clm-batch-id');
  if (!batchSelect) return;
  batchSelect.innerHTML = '<option value="">-- Memuat batch... --</option>';

  if (!productId) {
    batchSelect.innerHTML = '<option value="">-- Pilih Batch --</option>';
    return;
  }

  ensurePjBatchesLoaded().then(function (batches) {
    const filtered = (batches || []).filter(function (b) {
      return String(b.product_id) === String(productId);
    });

    if (filtered.length === 0) {
      if (defaultBatchId) {
        batchSelect.innerHTML = '<option value="' + escapeHtml(defaultBatchId) + '" selected>' + escapeHtml(defaultBatchId) + ' (Dari Nota / Kemasan)</option>';
      } else {
        batchSelect.innerHTML = '<option value="">(Tidak ada batch terdata untuk produk ini)</option>';
      }
      return;
    }

    let foundDefault = false;
    const optionsHtml = filtered.map(function (b) {
      const isSelected = defaultBatchId && String(b.id).trim() === String(defaultBatchId).trim();
      if (isSelected) foundDefault = true;
      const statusNote = b.quality_status === 'QUARANTINE' ? ' [QUARANTINE]' : '';
      return '<option value="' + escapeHtml(b.id) + '"' + (isSelected ? ' selected' : '') + '>' +
        escapeHtml(b.id) + statusNote + ' (Sisa: ' + b.qty_remaining + ', Komplain: ' + (b.complaint_count || 0) + ')' +
        '</option>';
    }).join('');

    let prefixOpt = '<option value="">-- Pilih Batch --</option>';
    if (defaultBatchId && !foundDefault) {
      prefixOpt += '<option value="' + escapeHtml(defaultBatchId) + '" selected>' + escapeHtml(defaultBatchId) + ' (Dari Nota Pembelian)</option>';
    }

    batchSelect.innerHTML = prefixOpt + optionsHtml;
    if (defaultBatchId) {
      batchSelect.value = defaultBatchId;
    }
  });
}

function handleClaimPhotoFile(inputEl) {
  if (!inputEl || !inputEl.files || !inputEl.files[0]) return;
  const file = inputEl.files[0];
  const previewWrap = document.getElementById('clm-photo-preview-wrap');
  const base64Input = document.getElementById('clm-photo-base64');

  if (previewWrap) {
    previewWrap.innerHTML = '<span style="font-size:12px;color:var(--text-secondary);">Mengompres foto...</span>';
  }

  compressImageFile(file, 800, 800, 0.75, function (compressedDataUrl) {
    if (base64Input) base64Input.value = compressedDataUrl;
    if (previewWrap) {
      previewWrap.innerHTML = '<img src="' + compressedDataUrl + '" alt="Pratinjau Foto Semaian">';
    }
  });
}

function submitClaimForm() {
  const custName = (document.getElementById('clm-cust-name').value || '').trim();
  const custPhone = (document.getElementById('clm-cust-phone').value || '').trim();
  const txId = (document.getElementById('clm-tx-id').value || '').trim();
  const sowingDate = document.getElementById('clm-sowing-date').value;
  const prodSelect = document.getElementById('clm-product-id');
  const productId = prodSelect.value;
  const productName = prodSelect.options[prodSelect.selectedIndex] ? prodSelect.options[prodSelect.selectedIndex].text.replace(/^[⭐\s]+/, '').split('[Batch')[0].trim() : '';

  // Check if manual batch is active
  const manualWrap = document.getElementById('clm-batch-manual-wrap');
  const isManualBatch = manualWrap && manualWrap.style.display !== 'none';
  const manualBatchVal = isManualBatch ? (document.getElementById('clm-batch-manual-id').value || '').trim() : '';
  const batchSelectVal = (document.getElementById('clm-batch-id').value || '').trim();
  const batchId = manualBatchVal || batchSelectVal;

  const mediaType = document.getElementById('clm-media-type').value;
  const resType = document.getElementById('clm-res-type').value;
  const reason = (document.getElementById('clm-reason').value || '').trim();
  const photoUrl = document.getElementById('clm-photo-base64').value;
  const notes = (document.getElementById('clm-notes').value || '').trim();

  if (!custName) { showToast('Nama pelanggan wajib diisi.', true); return; }
  if (!productId) { showToast('Pilih produk benih yang bermasalah.', true); return; }
  if (!batchId) { showToast('Pilih atau ketik kode batch yang bermasalah.', true); return; }
  if (!reason) { showToast('Jelaskan kendala daya tumbuh semaian.', true); return; }

  const btn = document.getElementById('btn-submit-claim');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  const payload = {
    customer_name: custName,
    customer_phone: custPhone,
    transaction_id: txId,
    sowing_date: sowingDate,
    product_id: productId,
    product_name: productName,
    batch_id: batchId,
    media_type: mediaType,
    resolution_type: resType,
    claim_reason: reason,
    photo_url: photoUrl,
    resolution_notes: notes,
    replacement_qty: 1
  };

  api('submitAfterSalesClaim', TOKEN, payload).then(function (res) {
    closeModal();
    if (res && res.is_quarantined) {
      alert('⚠️ PERINGATAN MUTU!\n\nBatch ' + batchId + ' telah mencapai 3 komplain dan OTOMATIS MASUK KARANTINA (QUARANTINE).\nBatch ini tidak dapat lagi dijual di kasir POS maupun didrop ke konsinyasi.');
    } else {
      showToast('Klaim garansi purna jual berhasil disimpan.');
    }
    renderPurnaJual(true);
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan & Proses Klaim'; }
    showToast('Gagal menyimpan klaim: ' + (err.message || err), true);
  });
}

function updateClaimStatusQuick(claimId, newStatus) {
  if (!newStatus) return;
  api('updateAfterSalesClaimStatus', TOKEN, claimId, newStatus).then(function () {
    showToast('Status klaim ' + claimId + ' diperbarui.');
    renderPurnaJual(true);
  }).catch(function (err) {
    showToast('Gagal mengubah status: ' + (err.message || err), true);
  });
}

function openClaimPhotoView(claimId) {
  const claim = (window._pjState.claims || []).filter(function (c) { return c.id === claimId; })[0];
  if (!claim || !claim.photo_url) return;

  const bodyHtml =
    '<div style="text-align:center;padding:10px;">' +
    '<img src="' + claim.photo_url + '" style="max-width:100%;max-height:70vh;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);" alt="Foto Semaian">' +
    '<div style="margin-top:12px;font-size:13px;color:var(--text-secondary);">' +
    'Klaim ID: <strong>' + escapeHtml(claim.id) + '</strong> | Pelanggan: <strong>' + escapeHtml(claim.customer_name) + '</strong>' +
    '</div>' +
    '</div>';

  openModal('Foto Bukti Semaian (' + escapeHtml(claim.id) + ')', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>');
}

// ----------------------------------------------------------------------------
// SUB-TAB 2: PENARIKAN BATCH (BATCH RECALL TRACKER)
// ----------------------------------------------------------------------------

function renderPJRecallSubtab() {
  const batches = window._pjState.batches || [];
  const activeBId = window._pjState.activeBatchId || (batches[0] ? batches[0].id : '');
  const recall = window._pjState.recallData;
  const isLoading = window._pjState.isLoadingRecall;

  const batchOptions = batches.map(function (b) {
    const isQuar = b.quality_status === 'QUARANTINE';
    const tag = isQuar ? ' [⚠️ QUARANTINE]' : '';
    const sel = b.id === activeBId ? ' selected' : '';
    return '<option value="' + escapeHtml(b.id) + '"' + sel + '>' + escapeHtml(b.id) + tag + ' - ' + escapeHtml(b.product_name) + ' (Sisa: ' + b.qty_remaining + ')</option>';
  }).join('');

  let detailHtml = '';
  if (isLoading) {
    detailHtml = '<div class="card"><div class="empty-state">Memeriksa rekam jejak transaksi & distribusi batch...</div></div>';
  } else if (!recall || !recall.batch_info) {
    detailHtml = '<div class="card"><div class="empty-state">Pilih kode batch di atas untuk melacak kontak pembeli dan cabang penerima.</div></div>';
  } else {
    const bInfo = recall.batch_info;
    const isQuar = bInfo.quality_status === 'QUARANTINE';

    detailHtml =
      '<div class="pj-recall-summary">' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Komoditas / Produk</span>' +
      '<span class="pj-recall-val">' + escapeHtml(bInfo.product_name) + '</span>' +
      '</div>' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Status Mutu Batch</span>' +
      '<span class="pj-recall-val"><span class="badge ' + (isQuar ? 'badge-danger' : 'badge-success') + '">' + escapeHtml(bInfo.quality_status) + '</span></span>' +
      '</div>' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Asal Petani / Pemasok</span>' +
      '<span class="pj-recall-val">' + escapeHtml(bInfo.farmer_name || '-') + '</span>' +
      '</div>' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Tgl Masuk / Expired</span>' +
      '<span class="pj-recall-val">' + escapeHtml(bInfo.production_date) + ' / ' + escapeHtml(bInfo.expiry_date) + '</span>' +
      '</div>' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Sisa Stok di Toko</span>' +
      '<span class="pj-recall-val" style="color:var(--primary);">' + bInfo.qty_remaining + ' sachet</span>' +
      '</div>' +
      '<div class="pj-recall-item">' +
      '<span class="pj-recall-label">Jumlah Komplain</span>' +
      '<span class="pj-recall-val" style="color:' + (bInfo.complaint_count >= 3 ? 'red' : 'inherit') + ';">' + bInfo.complaint_count + ' tiket</span>' +
      '</div>' +
      '</div>' +

      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<h3 style="font-size:15px;margin:0;font-weight:700;">Daftar Kontak Penerima Batch (' + (recall.contacts ? recall.contacts.length : 0) + ' Terdata)</h3>' +
      '<div style="font-size:12px;color:var(--text-secondary);">Total Benih Terditribusi: <strong>' + (recall.total_qty_distributed || 0) + ' sachet</strong></div>' +
      '</div>' +

      '<div class="table-container">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th>Kategori Sumber</th>' +
      '<th>Ref Faktur / SJ</th>' +
      '<th>Tanggal</th>' +
      '<th>Nama Penerima / Cabang</th>' +
      '<th>No. WhatsApp</th>' +
      '<th>Jumlah</th>' +
      '<th style="text-align:right;">Aksi Penarikan</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      ((recall.contacts && recall.contacts.length) ? recall.contacts.map(function (c) {
        const waButton = c.wa_link
          ? '<a href="' + c.wa_link + '" target="_blank" class="btn-wa">📲 Hubungi via WhatsApp</a>'
          : '<span style="font-size:12px;color:var(--text-secondary);">(Tanpa No. WA)</span>';

        return '<tr>' +
          '<td><span class="badge ' + (c.category === 'Pelanggan POS' ? 'badge-info' : 'badge-warning') + '">' + escapeHtml(c.category) + '</span></td>' +
          '<td><strong>' + escapeHtml(c.ref_no) + '</strong></td>' +
          '<td>' + escapeHtml(c.date) + '</td>' +
          '<td><strong>' + escapeHtml(c.name) + '</strong></td>' +
          '<td>' + escapeHtml(c.phone || '-') + '</td>' +
          '<td><strong>' + c.qty + '</strong> sachet</td>' +
          '<td style="text-align:right;">' + waButton + '</td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="7"><div style="text-align:center;padding:24px;color:var(--text-secondary);">Tidak ada catatan penjualan atau drop konsinyasi yang menggunakan batch ini.</div></td></tr>') +
      '</tbody>' +
      '</table>' +
      '</div>';
  }

  return (
    '<div class="card" style="margin-bottom:16px;">' +
    '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">' +
    '<label style="font-weight:700;font-size:13px;white-space:nowrap;">Pilih Kode Batch:</label>' +
    '<select id="recall-batch-selector" style="flex:1;min-width:260px;padding:9px 12px;" onchange="loadBatchRecallData(this.value)">' +
    batchOptions +
    '</select>' +
    '<button type="button" class="btn btn-primary" onclick="loadBatchRecallData(document.getElementById(\'recall-batch-selector\').value)">' +
    '🔍 Lacak Distribusi' +
    '</button>' +
    '</div>' +
    '</div>' +
    detailHtml
  );
}

function loadBatchRecallData(batchId) {
  if (!batchId) return;
  window._pjState.activeBatchId = batchId;
  window._pjState.isLoadingRecall = true;

  const container = document.getElementById('pj-subtab-container');
  if (container) container.innerHTML = renderPJSubtabContent();

  api('getBatchRecallContacts', TOKEN, batchId).then(function (data) {
    window._pjState.isLoadingRecall = false;
    window._pjState.recallData = data;
    if (container) container.innerHTML = renderPJSubtabContent();
  }).catch(function (err) {
    window._pjState.isLoadingRecall = false;
    showToast('Gagal melacak kontak penarikan: ' + (err.message || err), true);
    if (container) container.innerHTML = renderPJSubtabContent();
  });
}

// ----------------------------------------------------------------------------
// SUB-TAB 3: PENGINGAT SIKLUS PANEN & SAPAAN PELANGGAN DUA TAHAP
// ----------------------------------------------------------------------------

function renderPJHarvestSubtab() {
  const activeTab = window._pjState.activeFollowUpTab || 'h7';
  const fuData = window._pjState.followUps || { h7List: [], harvestList: [], historyList: [] };
  const counts = window._pjState.followUpCounts || {
    h7Count: (fuData.h7List || []).length,
    harvestCount: (fuData.harvestList || []).length,
    historyCount: (fuData.historyList || []).length,
    totalActive: ((fuData.h7List || []).length + (fuData.harvestList || []).length)
  };

  const search = (window._pjState.followUpSearch || '').toLowerCase().trim();

  let targetList = [];
  let tabTitle = '';
  let tabDesc = '';

  if (activeTab === 'h7') {
    targetList = fuData.h7List || [];
    tabTitle = '🟢 Cek Semai & Daya Tumbuh (H+7)';
    tabDesc = 'Pelanggan yang membeli benih seminggu lalu. Sapa pelanggan untuk menanyakan progres semai dan perkembangan kecambah.';
  } else if (activeTab === 'harvest') {
    targetList = fuData.harvestList || [];
    tabTitle = '🌾 Siap Panen & Rotasi Tanam';
    tabDesc = 'Tanaman yang diperkirakan memasuki masa panen minggu ini. Tanyakan hasil kebun dan sarankan varietas rotasi tanam berikutnya.';
  } else {
    targetList = fuData.historyList || [];
    tabTitle = '📁 Riwayat Sudah Disapa';
    tabDesc = 'Daftar pelanggan yang telah disapa via WhatsApp atau dilewati oleh tim kasir.';
  }

  // Filter berdasarkan pencarian nama, nomor hp, nomor transaksi, atau produk benih
  const filteredList = targetList.filter(function (fu) {
    if (!search) return true;
    return (
      String(fu.customer_name || '').toLowerCase().includes(search) ||
      String(fu.customer_phone || '').includes(search) ||
      String(fu.products_summary || '').toLowerCase().includes(search) ||
      String(fu.transaction_id || '').toLowerCase().includes(search)
    );
  });

  let listContentHtml = '';
  if (filteredList.length === 0) {
    let emptyMsg = '';
    if (search) {
      emptyMsg = 'Tidak ditemukan sapaan yang cocok dengan pencarian "<strong>' + escapeHtml(search) + '</strong>".';
    } else if (activeTab === 'h7') {
      emptyMsg = '🟢 Tidak ada antrean sapaan H+7 untuk hari ini. Semua pelanggan benih yang jatuh tempo telah disapa atau belum genap 7 hari.';
    } else if (activeTab === 'harvest') {
      emptyMsg = '🌾 Belum ada tanaman pelanggan yang memasuki estimasi masa panen minggu ini.';
    } else {
      emptyMsg = 'Belum ada riwayat pelanggan yang disapa.';
    }
    listContentHtml = '<div class="card"><div class="empty-state" style="padding:32px 16px;">' + emptyMsg + '</div></div>';
  } else {
    listContentHtml = '<div class="fu-list-container">' + filteredList.map(function (fu) {
      const isH7 = fu.touchpoint_type === 'H7_GERMINATION';
      const typeBadge = isH7
        ? '<span class="badge badge-success" style="font-size:11px;">🟢 H+7 Cek Semai</span>'
        : '<span class="badge badge-warning" style="font-size:11px;">🌾 Siap Panen &amp; Rotasi</span>';

      let statusBadge = '';
      if (fu.status === 'GREETED') {
        statusBadge = '<span class="badge badge-success" style="font-size:11px;">✅ Sudah Disapa</span>';
      } else if (fu.status === 'SKIPPED') {
        statusBadge = '<span class="badge badge-neutral" style="font-size:11px;">⏭️ Dilewati</span>';
      } else {
        statusBadge = '<span class="badge badge-info" style="font-size:11px;">⏳ Antrean Aktif</span>';
      }

      let actionButtons = '';
      if (fu.status === 'PENDING') {
        actionButtons =
          '<button type="button" class="btn-fu-wa" onclick="openWhatsAppFollowUpChat(\'' + escapeHtml(fu.id) + '\')">' +
          '💬 Buka Chat WA' +
          '</button>' +
          '<button type="button" class="btn-fu-done" onclick="markFollowUpDirect(\'' + escapeHtml(fu.id) + '\', \'GREETED\')" title="Tandai sudah disapa manual">' +
          '✓ Selesai' +
          '</button>' +
          '<button type="button" class="btn-fu-skip" onclick="markFollowUpDirect(\'' + escapeHtml(fu.id) + '\', \'SKIPPED\')" title="Lewati / jangan sapa">' +
          'Lewati' +
          '</button>';
      } else {
        actionButtons =
          '<button type="button" class="btn btn-secondary btn-xs" onclick="openWhatsAppFollowUpChat(\'' + escapeHtml(fu.id) + '\', true)" style="padding:4px 8px;font-size:11px;">' +
          '💬 Chat Ulang WA' +
          '</button>' +
          (fu.status === 'SKIPPED' ?
            '<button type="button" class="btn btn-secondary btn-xs" onclick="markFollowUpDirect(\'' + escapeHtml(fu.id) + '\', \'PENDING\')" style="padding:4px 8px;font-size:11px;">' +
            '↩ Buka Kembali' +
            '</button>' : '');
      }

      let historyMeta = '';
      if (fu.greeted_at) {
        historyMeta =
          '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:4px;">' +
          'Disapa: <strong>' + escapeHtml(fu.greeted_at) + '</strong> &bull; Oleh: <strong>' + escapeHtml(fu.greeted_by || 'Kasir') + '</strong>' +
          (fu.notes ? ' &bull; <em>' + escapeHtml(fu.notes) + '</em>' : '') +
          '</div>';
      }

      return (
        '<div class="fu-card">' +
        '<div class="fu-card-header">' +
        '<div class="fu-card-customer">' +
        '<div style="font-size:20px;">👤</div>' +
        '<div>' +
        '<div class="fu-customer-name">' + escapeHtml(fu.customer_name || 'Pelanggan') + '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;margin-top:2px;flex-wrap:wrap;">' +
        '<span class="fu-customer-phone">📱 ' + escapeHtml(fu.customer_phone || '-') + '</span>' +
        (fu.transaction_id ? '<span style="font-size:11px;color:var(--text-secondary);font-family:\'JetBrains Mono\',monospace;">Nota #' + escapeHtml(fu.transaction_id) + '</span>' : '') +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        typeBadge +
        statusBadge +
        '</div>' +
        '</div>' +

        '<div class="fu-card-body">' +
        '<div class="fu-product-box">' +
        '🌱 <strong>Komoditas / Benih Dibeli:</strong> ' + escapeHtml(fu.products_summary || 'Produk Benih') +
        '</div>' +
        historyMeta +
        '</div>' +

        '<div class="fu-card-footer">' +
        '<div class="fu-due-info">' +
        '📅 Jatuh Tempo: <strong>' + escapeHtml(fu.trigger_date || '-') + '</strong>' +
        '</div>' +
        '<div class="fu-action-group">' +
        actionButtons +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }).join('') + '</div>';
  }

  return (
    '<div class="fu-segmented-bar">' +
    '<button type="button" class="fu-tab-pill ' + (activeTab === 'h7' ? 'active' : '') + '" onclick="switchFollowUpTab(\'h7\')">' +
    '<span>🟢 Cek Semai (H+7)</span>' +
    '<span class="fu-pill-badge badge-green">' + (counts.h7Count || 0) + '</span>' +
    '</button>' +
    '<button type="button" class="fu-tab-pill ' + (activeTab === 'harvest' ? 'active' : '') + '" onclick="switchFollowUpTab(\'harvest\')">' +
    '<span>🌾 Siap Panen &amp; Rotasi</span>' +
    '<span class="fu-pill-badge badge-amber">' + (counts.harvestCount || 0) + '</span>' +
    '</button>' +
    '<button type="button" class="fu-tab-pill ' + (activeTab === 'history' ? 'active' : '') + '" onclick="switchFollowUpTab(\'history\')">' +
    '<span>📁 Riwayat Sudah Disapa</span>' +
    '<span class="fu-pill-badge">' + (counts.historyCount || 0) + '</span>' +
    '</button>' +
    '</div>' +

    '<div style="margin-bottom:14px;background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid var(--primary);border-radius:var(--radius-md);padding:10px 16px;color:var(--text-main);font-size:12.5px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
    '<div>' +
    '<strong>' + tabTitle + ':</strong> ' + tabDesc +
    '</div>' +
    '<button type="button" class="btn btn-secondary btn-xs" onclick="reloadFollowUpData()" title="Sinkronkan ulang data sapaan pelanggan">' +
    '🔄 Refresh Antrean' +
    '</button>' +
    '</div>' +

    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
    '<div style="display:flex;align-items:center;gap:8px;flex:1;max-width:420px;">' +
    '<input type="text" id="fu-search-input" value="' + escapeHtml(window._pjState.followUpSearch || '') + '" placeholder="Cari nama pelanggan, no. WA, atau nama benih..." oninput="filterFollowUpList(this.value)" style="padding:8px 12px;font-size:13px;width:100%;">' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-secondary);">' +
    'Menampilkan <strong>' + filteredList.length + '</strong> antrean' +
    '</div>' +
    '</div>' +

    listContentHtml
  );
}

function switchFollowUpTab(tabName) {
  window._pjState.activeFollowUpTab = tabName;
  const container = document.getElementById('pj-subtab-container');
  if (container) {
    container.innerHTML = renderPJSubtabContent();
  }
}

function filterFollowUpList(q) {
  window._pjState.followUpSearch = q;
  const container = document.getElementById('pj-subtab-container');
  if (container) {
    container.innerHTML = renderPJSubtabContent();
    const input = document.getElementById('fu-search-input');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

function reloadFollowUpData() {
  setProgressLoading(true);
  api('getFollowUpList', TOKEN).then(function (fuData) {
    setProgressLoading(false);
    if (!fuData) fuData = { h7List: [], harvestList: [], historyList: [], counts: { h7Count: 0, harvestCount: 0, historyCount: 0, totalActive: 0 } };
    window._pjState.followUps = fuData;
    window._pjState.followUpCounts = fuData.counts || { h7Count: (fuData.h7List || []).length, harvestCount: (fuData.harvestList || []).length, historyCount: (fuData.historyList || []).length, totalActive: ((fuData.h7List || []).length + (fuData.harvestList || []).length) };
    window._pjState.harvestReminders = fuData.harvestList || [];
    updatePurnaJualNavBadge();

    const container = document.getElementById('pj-subtab-container');
    if (container) container.innerHTML = renderPJSubtabContent();

    // Update counter badge pada tombol subnav purna jual
    const subnavBtns = document.querySelectorAll('.pj-subnav-btn');
    if (subnavBtns && subnavBtns[2]) {
      const badgeSpan = subnavBtns[2].querySelector('.pj-subnav-badge');
      if (badgeSpan) {
        const total = fuData.counts ? fuData.counts.totalActive : 0;
        badgeSpan.textContent = total;
        if (total > 0) {
          badgeSpan.classList.add('pj-badge-danger');
        } else {
          badgeSpan.classList.remove('pj-badge-danger');
        }
      }
    }
    showToast('Antrean sapaan pelanggan diperbarui.');
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal memuat ulang sapaan: ' + (err.message || err), true);
  });
}

function findFollowUpItemById(id) {
  const fuData = window._pjState.followUps || {};
  const all = (fuData.h7List || []).concat(fuData.harvestList || []).concat(fuData.historyList || []);
  for (let i = 0; i < all.length; i++) {
    if (String(all[i].id) === String(id)) return all[i];
  }
  return null;
}

function openWhatsAppFollowUpChat(followUpId, isRechat) {
  const fu = findFollowUpItemById(followUpId);
  if (!fu) {
    showToast('Data sapaan pelanggan tidak ditemukan.', true);
    return;
  }

  let cleanPhone = String(fu.customer_phone || '').replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  if (!cleanPhone || cleanPhone.length < 8) {
    showToast('Nomor WhatsApp pelanggan tidak valid: ' + (fu.customer_phone || '-'), true);
    return;
  }

  const custName = fu.customer_name || 'Kak/Bli';
  const products = fu.products_summary || 'benih';

  let message = '';
  if (fu.touchpoint_type === 'H7_GERMINATION') {
    message =
      "Halo Kak/Bli " + custName + ", terima kasih telah berbelanja di toko kami 🙏\n\n" +
      "Seminggu lalu sempat belanja benih " + products + " di toko kami. Mau tanya kabar kebunnya, apakah benihnya sudah mulai disemai dan ada tanda-tanda berkecambah?\n\n" +
      "Jika ada kendala terkait media semai atau daya tumbuh, kabari kami ya kak agar bisa kami bantu arahkan. Selamat berkebun!";
  } else {
    message =
      "Halo Kak/Bli " + custName + ", semoga tanamannya tumbuh subur selalu nggih 🙏\n\n" +
      "Menurut catatan kebun kami, tanaman " + products + " yang ditanam bulan lalu perkiraan sudah masuk masa siap panen minggu ini.\n\n" +
      "Agar tanah bedengan tetap gembur dan bebas hama tular tanah, kami sarankan merotasi tanamannya dengan tanaman pendamping atau jenis kacang-kacangan setelah panen ini. Kebetulan stok benih varietas baru kami sedang siap di toko jika ingin mulai persiapan tanam kembali. Rahayu!";
  }

  const waUrl = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(message);
  window.open(waUrl, '_blank');

  if (isRechat && fu.status === 'GREETED') {
    showToast('Membuka tautan chat WhatsApp untuk ' + custName);
    return;
  }

  // Tampilkan Pop-up Konfirmasi Mini Anti Dobel Sapa
  showFollowUpAntiSpamModal(fu);
}

function showFollowUpAntiSpamModal(fu) {
  const isH7 = fu.touchpoint_type === 'H7_GERMINATION';
  const typeLabel = isH7 ? 'Cek Daya Tumbuh Semai (H+7)' : 'Pengingat Panen & Rotasi Tanam';

  const bodyHtml =
    '<div style="text-align:left;line-height:1.5;">' +
    '<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:4px;">Tujuan Sapaan (' + typeLabel + '):</div>' +
    '<div style="font-size:15px;font-weight:700;color:var(--text-main);">' + escapeHtml(fu.customer_name) + ' (' + escapeHtml(fu.customer_phone) + ')</div>' +
    '<div style="font-size:12px;color:var(--primary);margin-top:2px;">🌱 ' + escapeHtml(fu.products_summary) + '</div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--text-main);margin-bottom:8px;">' +
    'Tautan WhatsApp telah dibuka di jendela baru. <strong>Apakah pesan WhatsApp sudah berhasil dikirim?</strong>' +
    '</p>' +
    '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:0;">' +
    '💡 <em>Catatan Anti-Spam:</em> Memilih "Ya, Berhasil" akan memindahkan pelanggan ini langsung ke tab <strong>Riwayat Sudah Disapa</strong> sehingga kasir lain tidak mengirim sapaan ganda.' +
    '</p>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Belum / Nanti Saja</button>' +
    '<button type="button" class="btn btn-secondary" onclick="markFollowUpDirect(\'' + escapeHtml(fu.id) + '\', \'SKIPPED\');closeModal();" style="color:var(--danger);border-color:var(--danger);">Lewati Sapaan</button>' +
    '<button type="button" class="btn btn-primary" onclick="markFollowUpDirect(\'' + escapeHtml(fu.id) + '\', \'GREETED\');closeModal();">' +
    '✅ Ya, Berhasil' +
    '</button>';

  openModal('Konfirmasi Sapaan WhatsApp', bodyHtml, footerHtml);
}

function markFollowUpDirect(followUpId, status, notes) {
  const fu = findFollowUpItemById(followUpId);
  if (!fu) return;

  status = String(status || 'GREETED').toUpperCase();

  // Optimistic UI update di frontend
  const fuData = window._pjState.followUps || { h7List: [], harvestList: [], historyList: [] };
  fuData.h7List = (fuData.h7List || []).filter(function (it) { return String(it.id) !== String(followUpId); });
  fuData.harvestList = (fuData.harvestList || []).filter(function (it) { return String(it.id) !== String(followUpId); });
  fuData.historyList = (fuData.historyList || []).filter(function (it) { return String(it.id) !== String(followUpId); });

  fu.status = status;
  fu.greeted_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  fu.greeted_by = (window._currentUser && (window._currentUser.name || window._currentUser.username)) || 'Kasir';
  if (notes) fu.notes = notes;

  if (status === 'PENDING') {
    if (fu.touchpoint_type === 'H7_GERMINATION') {
      fuData.h7List.unshift(fu);
    } else {
      fuData.harvestList.unshift(fu);
    }
  } else {
    fuData.historyList.unshift(fu);
  }

  window._pjState.followUpCounts = {
    h7Count: fuData.h7List.length,
    harvestCount: fuData.harvestList.length,
    historyCount: fuData.historyList.length,
    totalActive: fuData.h7List.length + fuData.harvestList.length
  };
  updatePurnaJualNavBadge();

  // Re-render UI subtab
  const container = document.getElementById('pj-subtab-container');
  if (container) {
    container.innerHTML = renderPJSubtabContent();
  }

  // Panggil API Backend
  api('markFollowUpStatus', TOKEN, followUpId, status, notes || '').then(function () {
    showToast(status === 'GREETED' ? 'Pelanggan berhasil ditandai sudah disapa.' : (status === 'SKIPPED' ? 'Pelanggan berhasil dilewati.' : 'Status sapaan diperbarui.'));
  }).catch(function (err) {
    showToast('Gagal sinkronisasi status ke server: ' + (err.message || err), true);
    reloadFollowUpData();
  });
}

// ----------------------------------------------------------------------------
// SUB-TAB 4: CATATAN KONSULTASI TEKNIS KEBUN
// ----------------------------------------------------------------------------

function renderPJConsultationSubtab() {
  const allLogs = window._pjState.consultations || [];
  const search = (window._pjState.searchConsult || '').toLowerCase().trim();

  const filteredLogs = allLogs.filter(function (l) {
    if (!search) return true;
    return (
      String(l.customer_name || '').toLowerCase().includes(search) ||
      String(l.customer_phone || '').includes(search) ||
      String(l.crop_topic || '').toLowerCase().includes(search)
    );
  });

  return (
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">' +
    '<div style="display:flex;align-items:center;gap:8px;flex:1;max-width:380px;">' +
    '<input type="text" id="consult-search-input" value="' + escapeHtml(window._pjState.searchConsult || '') + '" placeholder="Cari nomor HP / nama / topik..." oninput="filterConsultationLogs(this.value)" style="padding:8px 12px;font-size:13px;width:100%;">' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openConsultationModal()">+ Catat Konsultasi Baru</button>' +
    '</div>' +

    '<div class="pj-consultation-list">' +
    (filteredLogs.length ? filteredLogs.map(function (log) {
      let cleanPhone = String(log.customer_phone || '').replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      const waFollowupLink = cleanPhone ? 'https://wa.me/' + cleanPhone : '';

      return (
        '<div class="pj-consultation-card">' +
        '<div class="pj-consultation-header">' +
        '<div>' +
        '<strong style="font-size:15px;color:var(--text-main);">' + escapeHtml(log.customer_name || 'Pelanggan') + '</strong> ' +
        (log.customer_phone ? '<span style="font-size:12px;color:var(--text-secondary);">(' + escapeHtml(log.customer_phone) + ')</span>' : '') +
        (waFollowupLink ? ' <a href="' + waFollowupLink + '" target="_blank" style="font-size:12px;text-decoration:none;">📱 Chat WA</a>' : '') +
        '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">' +
        '📅 ' + escapeHtml(log.log_date || '') + ' &bull; Ditangani oleh: <strong>' + escapeHtml(log.handled_by || 'Staf') + '</strong>' +
        '</div>' +
        '</div>' +
        '<span class="pj-topic-tag">' + escapeHtml(log.crop_topic || 'Umum') + '</span>' +
        '</div>' +
        '<div class="pj-problem-box">' +
        '<strong>⚠️ Kendala / Masalah:</strong> ' + escapeHtml(log.problem_details || '-') +
        '</div>' +
        '<div class="pj-solution-box">' +
        '<strong>💡 Solusi & Rekomendasi:</strong> ' + escapeHtml(log.solution_given || '-') +
        '</div>' +
        '</div>'
      );
    }).join('') : '<div class="card"><div class="empty-state">Belum ada rekam catatan konsultasi kebun.</div></div>') +
    '</div>'
  );
}

function filterConsultationLogs(q) {
  window._pjState.searchConsult = q;
  const container = document.getElementById('pj-subtab-container');
  if (container) container.innerHTML = renderPJSubtabContent();
}

function openConsultationModal() {
  const custOptions = (CUSTOMERS_CACHE || []).map(function (c) {
    return '<option value="' + escapeHtml(c.name) + '" data-phone="' + escapeHtml(c.phone || '') + '">' + escapeHtml(c.name) + (c.phone ? ' (' + c.phone + ')' : '') + '</option>';
  }).join('');

  const currentUser = (window._currentUser && window._currentUser.name) ? window._currentUser.name : 'Staf Toko';

  const bodyHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group">' +
    '<label class="field-label">Nama Pelanggan <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="csl-cust-name" list="csl-cust-list" placeholder="Pilih / ketik nama..." oninput="onConsultCustSelect(this.value)" style="padding-left:14px;">' +
    '<datalist id="csl-cust-list">' + custOptions + '</datalist>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">No. WhatsApp / HP</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="csl-cust-phone" placeholder="08xxxxxxxxxx" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div class="field-group">' +
    '<label class="field-label">Topik Tanaman / Komoditas <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<select id="csl-topic" style="padding-left:14px;">' +
    '<option value="Cabai & Solanaceae">Cabai, Tomat & Terung</option>' +
    '<option value="Sayuran Daun">Sayuran Daun (Bayam, Kangkung, Sawi)</option>' +
    '<option value="Kacang & Polong">Kacang & Polong-polongan</option>' +
    '<option value="Herbal & Obat">Tanaman Herbal & Obat</option>' +
    '<option value="Pembenihan & Semai">Daya Tumbuh & Teknik Semai</option>' +
    '<option value="Media & Pupuk Kompos">Media Tanam & Pemupukan Organik</option>' +
    '<option value="Hama & Penyakit">Pengendalian Hama & Jamur</option>' +
    '<option value="Lainnya">Lainnya</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Petugas / Staf yang Menangani</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="csl-handled-by" value="' + escapeHtml(currentUser) + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Rincian Kendala Kebun Pelanggan <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<textarea id="csl-problem" rows="3" placeholder="Contoh: Daun cabai menguning keriting, media tanam terasa padat dan asam..." style="padding:10px 14px;"></textarea>' +
    '</div>' +
    '</div>' +

    '<div class="field-group">' +
    '<label class="field-label">Solusi & Rekomendasi Teknis yang Diberikan <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<textarea id="csl-solution" rows="3" placeholder="Contoh: Berikan kapur dolomit untuk menetralkan pH, semprotkan pestisida nabati neem oil sore hari..." style="padding:10px 14px;"></textarea>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-csl" onclick="submitConsultationForm()">Simpan Catatan Konsultasi</button>';

  openModal('Catat Sesi Konsultasi Kebun Pelanggan', bodyHtml, footerHtml);
}

function onConsultCustSelect(val) {
  const datalist = document.getElementById('csl-cust-list');
  if (!datalist) return;
  const options = datalist.querySelectorAll('option');
  for (let i = 0; i < options.length; i++) {
    if (options[i].value.toLowerCase() === (val || '').toLowerCase()) {
      const phone = options[i].getAttribute('data-phone');
      const phoneInput = document.getElementById('csl-cust-phone');
      if (phone && phoneInput && !phoneInput.value) {
        phoneInput.value = phone;
      }
      break;
    }
  }
}

function submitConsultationForm() {
  const custName = (document.getElementById('csl-cust-name').value || '').trim();
  const custPhone = (document.getElementById('csl-cust-phone').value || '').trim();
  const topic = document.getElementById('csl-topic').value;
  const handledBy = (document.getElementById('csl-handled-by').value || '').trim();
  const problem = (document.getElementById('csl-problem').value || '').trim();
  const solution = (document.getElementById('csl-solution').value || '').trim();

  if (!custName) { showToast('Nama pelanggan wajib diisi.', true); return; }
  if (!problem) { showToast('Tuliskan kendala kebun pelanggan.', true); return; }
  if (!solution) { showToast('Tuliskan solusi/rekomendasi yang diberikan.', true); return; }

  const btn = document.getElementById('btn-submit-csl');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  const payload = {
    customer_name: custName,
    customer_phone: custPhone,
    crop_topic: topic,
    problem_details: problem,
    solution_given: solution,
    handled_by: handledBy
  };

  api('saveConsultationLog', TOKEN, payload).then(function () {
    closeModal();
    showToast('Catatan konsultasi kebun berhasil disimpan.');
    renderPurnaJual(true);
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Catatan Konsultasi'; }
    showToast('Gagal menyimpan konsultasi: ' + (err.message || err), true);
  });
}

// ----------------------------------------------------------------------------
// FUNGSI BANTUAN KOMPRESI GAMBAR CANVAS
// ----------------------------------------------------------------------------
function compressImageFile(file, maxWidth, maxHeight, quality, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality || 0.75);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}


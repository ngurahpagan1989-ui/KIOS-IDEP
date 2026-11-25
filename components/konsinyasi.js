// ========================= MANAJEMEN TOKO CABANG / OUTLET MITRA TERPADU =========================
function renderKonsinyasi(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cached = getCachedData('outlets');
  if (!forceRefresh && cached) {
    drawKonsinyasiUI(cached);
    if (isCacheValid('outlets')) return;
  } else if (!cached) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat data Toko Cabang & Outlet Mitra...</div></div>';
  }

  api('getOutlets', TOKEN).then(function (outlets) {
    const list = Array.isArray(outlets) ? outlets : [];
    setCachedData('outlets', list);
    drawKonsinyasiUI(list);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat outlet mitra: ' + (err.message || err), true);
    }
  });
}

function drawKonsinyasiUI(list) {
  const content = document.getElementById('content');
  if (!content) return;

  window._currentKonsinyasiSubtab = window._currentKonsinyasiSubtab || 'outlets';

  if (window._currentKonsinyasiSubtab === 'transfers') {
    renderKonsinyasiTransfers();
    return;
  }

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Toko Cabang &amp; Mitra Konsinyasi</h1>' +
    '<p class="page-subtitle">Manajemen terpadu outlet mitra: saldo benih di rak, drop stok baru, interval audit, berita acara MOV resmi, dan faktur hasil penjualan.</p>' +
    '</div>' +
    '<div class="page-actions" style="display:flex;gap:8px;align-items:center;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'konsinyasi\')" title="Buka Panduan Konsinyasi &amp; Opname MOV">📖 Panduan Konsinyasi</button>' +
    '<button type="button" class="btn btn-primary" onclick="openOutletModal()">+ Tambah Outlet Mitra</button>' +
    '</div>' +
    '</div>' +
    '<div class="konsinyasi-subnav">' +
    '<button type="button" class="konsinyasi-subnav-btn active" onclick="switchKonsinyasiSubtab(\'outlets\')">🏪 Toko Cabang &amp; Mitra (' + list.length + ')</button>' +
    '<button type="button" class="konsinyasi-subnav-btn" onclick="switchKonsinyasiSubtab(\'transfers\')">🚚 Surat Jalan &amp; Serah Terima Lapangan</button>' +
    '</div>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Outlet Mitra &amp; Lokasi</th>' +
    '<th>Penanggung Jawab (PIC) &amp; WA</th>' +
    '<th>Tingkat Harga</th>' +
    '<th>Interval Kunjungan</th>' +
    '<th style="text-align:center;">Benih di Rak</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (list.length ? list.map(function (o) {
      // Indikator interval kunjungan
      let visitBadge = '';
      const days = o.days_since_audit !== undefined ? Number(o.days_since_audit) : 0;
      if (o.audit_status === 'red' || days > 30) {
        visitBadge = '<span class="badge-visit-urgent" title="Kunjungan opname sangat mendesak (> 30 hari)">🔴 ' + days + ' hr (Mendesak)</span>';
      } else if (o.audit_status === 'yellow' || days > 14) {
        visitBadge = '<span class="badge-visit-warn" title="Perlu dijadwalkan kunjungan opname (15-30 hari)">🟡 ' + days + ' hr (Perlu Jadwal)</span>';
      } else {
        visitBadge = '<span class="badge-visit-safe" title="Kondisi display dan kunjungan masih aman (&le; 14 hari)">🟢 ' + days + ' hr (Aman)</span>';
      }

      // Link direct WhatsApp
      let waLink = '';
      if (o.phone) {
        let cleanPhone = String(o.phone).replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
        waLink = '<a href="https://wa.me/' + cleanPhone + '" target="_blank" style="color:var(--primary);text-decoration:none;font-size:11px;display:inline-flex;align-items:center;gap:3px;margin-top:2px;">📱 ' + escapeHtml(o.phone) + '</a>';
      }

      return '<tr>' +
        '<td>' +
        '<div style="font-weight:700;color:var(--text-main);font-size:13px;display:flex;align-items:center;gap:6px;">' +
        '<span>' + escapeHtml(o.name) + '</span>' +
        (String(o.status || '').toLowerCase() === 'inactive' ? '<span class="badge badge-neutral" style="font-size:9px;">Nonaktif</span>' : '') +
        '</div>' +
        (o.address ? ('<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">📍 ' + escapeHtml(o.address) + '</div>') : '') +
        '</td>' +
        '<td>' +
        '<div style="font-weight:600;font-size:12px;">' + escapeHtml(o.pic_name || '-') + '</div>' +
        waLink +
        '</td>' +
        '<td><span class="outlet-price-tier-tag">' + escapeHtml(o.price_tier || 'Mitra') + '</span></td>' +
        '<td>' + visitBadge + '</td>' +
        '<td style="text-align:center;">' +
        '<strong style="color:var(--primary);font-size:14px;font-family:\'JetBrains Mono\',monospace;">' + (Number(o.total_stock_pcs || 0)) + '</strong> ' +
        '<span style="font-size:11px;color:var(--text-secondary);">pcs</span>' +
        '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="showOutletDetailModal(\'' + o.id + '\')" style="margin-right:4px;">👁️ Lihat Detail</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="openOutletModal(\'' + o.id + '\')" title="Edit Profil Outlet" style="margin-right:4px;">✏️</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--danger);" onclick="deleteOutletUI(\'' + o.id + '\', \'' + escapeHtml(o.name || '').replace(/'/g, "\\'") + '\')" title="Hapus Outlet">🗑️</button>' +
        '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div style="text-align:center;padding:24px;">Belum ada outlet mitra terdaftar. Klik "+ Tambah Outlet Mitra" untuk mendaftarkan toko mitra baru.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>';
}

function openOutletModal(outletId) {
  let existing = null;
  if (outletId && DATA_CACHE.outlets && DATA_CACHE.outlets.data) {
    existing = DATA_CACHE.outlets.data.filter(function (o) { return String(o.id) === String(outletId); })[0];
  }

  // Siapkan opsi tingkat harga khusus dari preset (default: 'Outlet')
  const presets = getDefaultPriceTierPresets();
  const tierList = [];
  presets.forEach(function (p) {
    if (p && p.name && tierList.indexOf(p.name) === -1) tierList.push(p.name);
  });
  ['Outlet', 'Bali Buda', 'Reguler'].forEach(function (t) {
    if (tierList.indexOf(t) === -1) tierList.push(t);
  });
  if (Array.isArray(PRICE_TIERS_LIST)) {
    PRICE_TIERS_LIST.forEach(function (t) {
      if (t && tierList.indexOf(t) === -1) tierList.push(t);
    });
  }

  const selectedTier = (existing && existing.price_tier) ? existing.price_tier : 'Outlet';
  const tierOptions = tierList.map(function (t) {
    const isSel = (t === selectedTier);
    return '<option value="' + escapeHtml(t) + '"' + (isSel ? ' selected' : '') + '>' + escapeHtml(t) + '</option>';
  }).join('');

  const bodyHtml =
    '<div class="field-group">' +
    '<label class="field-label">Nama Outlet Mitra / Toko Cabang <span style="color:var(--danger)">*</span></label>' +
    '<div class="input-wrapper"><input type="text" id="out-name" value="' + escapeHtml(existing ? existing.name : '') + '" placeholder="Contoh: Kios Pertanian Subak Lestari" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Nama Penanggung Jawab (PIC) <span style="color:var(--danger)">*</span></label>' +
    '<div class="input-wrapper"><input type="text" id="out-pic" value="' + escapeHtml(existing ? existing.pic_name : '') + '" placeholder="Contoh: Pak Ketut Sujana" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">No. WhatsApp Toko / PIC</label>' +
    '<div class="input-wrapper"><input type="text" id="out-phone" value="' + escapeHtml(existing ? existing.phone : '') + '" placeholder="Contoh: 081234567890" style="padding-left:14px;"></div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Alamat Lengkap / Lokasi Outlet</label>' +
    '<div class="input-wrapper"><input type="text" id="out-address" value="' + escapeHtml(existing ? existing.address : '') + '" placeholder="Contoh: Jl. Raya Marga, Banjar Belayu, Tabanan" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Tingkat Harga Khusus Outlet</label>' +
    '<select id="out-price-tier" class="field-input" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    tierOptions +
    '</select>' +
    '<div style="font-size:10.5px;color:var(--text-muted);margin-top:2px;">Menentukan harga acuan saat audit &amp; penerbitan faktur.</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Status Operasional Outlet</label>' +
    '<select id="out-status" class="field-input" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<option value="active"' + (!existing || String(existing.status || '').toLowerCase() !== 'inactive' ? ' selected' : '') + '>Aktif (Bisa Terima Drop Stok)</option>' +
    '<option value="inactive"' + (existing && String(existing.status || '').toLowerCase() === 'inactive' ? ' selected' : '') + '>Nonaktif</option>' +
    '</select>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-outlet" onclick="submitOutletForm(\'' + (existing ? existing.id : '') + '\')">💾 Simpan Profil Outlet</button>';

  openModal(existing ? 'Edit Outlet Mitra' : 'Tambah Outlet Mitra Baru', bodyHtml, footerHtml);
}

function submitOutletForm(outletId) {
  const name = document.getElementById('out-name').value.trim();
  const pic = document.getElementById('out-pic').value.trim();
  const phone = (document.getElementById('out-phone').value || '').trim();
  const address = (document.getElementById('out-address').value || '').trim();
  const priceTier = document.getElementById('out-price-tier').value;
  const status = document.getElementById('out-status').value;

  if (!name) { showToast('Nama outlet mitra wajib diisi.', true); return; }
  if (!pic) { showToast('Nama penanggung jawab (PIC) wajib diisi.', true); return; }

  const btn = document.getElementById('btn-submit-outlet');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';
  }

  api('saveOutlet', TOKEN, {
    id: outletId || '',
    name: name,
    pic_name: pic,
    phone: phone,
    address: address,
    price_tier: priceTier,
    status: status
  }).then(function (res) {
    if (DATA_CACHE.outlets) DATA_CACHE.outlets.timestamp = 0;
    closeModal();
    showToast('Profil outlet mitra berhasil disimpan.');
    renderKonsinyasi(true);
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '💾 Simpan Profil Outlet';
    }
    showToast('Gagal: ' + (err.message || err), true);
  });
}

function deleteOutletUI(outletId, outletName) {
  if (!outletId) return;
  const label = outletName || 'Outlet Mitra';
  showConfirmDialog(
    'Hapus Outlet Mitra',
    'Apakah Anda yakin ingin menghapus data outlet "' + label + '"? (Hanya outlet yang belum memiliki stok di rak atau riwayat surat jalan yang dapat dihapus).',
    function () {
      api('deleteOutlet', TOKEN, outletId).then(function () {
        if (DATA_CACHE.outlets) DATA_CACHE.outlets.timestamp = 0;
        showToast('Outlet "' + label + '" berhasil dihapus.');
        renderKonsinyasi(true);
      }).catch(function (err) {
        showToast('Gagal menghapus outlet: ' + (err.message || err), true);
      });
    },
    true
  );
}
window.deleteOutletUI = deleteOutletUI;

// ========================= MODAL 360° DETAIL OUTLET MITRA =========================
window._currentOutletDetail = null;

function showOutletDetailModal(outletId, activeTab) {
  activeTab = activeTab || 'stocks';
  showToast('Memuat rincian 360° outlet mitra...');

  api('getOutletDetail', TOKEN, outletId).then(function (data) {
    window._currentOutletDetail = data;
    const o = data.outlet || {};
    const stocks = Array.isArray(data.stocks) ? data.stocks : [];
    const transfers = Array.isArray(data.transfers) ? data.transfers : [];
    const audits = Array.isArray(data.audits) ? data.audits : [];

    // Indikator interval
    let visitBadge = '';
    const days = o.days_since_audit !== undefined ? Number(o.days_since_audit) : 0;
    if (o.audit_status === 'red' || days > 30) {
      visitBadge = '<span class="badge-visit-urgent">🔴 ' + days + ' hr lalu (Mendesak)</span>';
    } else if (o.audit_status === 'yellow' || days > 14) {
      visitBadge = '<span class="badge-visit-warn">🟡 ' + days + ' hr lalu (Perlu Jadwal)</span>';
    } else {
      visitBadge = '<span class="badge-visit-safe">🟢 ' + days + ' hr lalu (Aman)</span>';
    }

    // WA Link
    let waLink = '';
    if (o.phone) {
      let cleanPhone = String(o.phone).replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      waLink = '<a href="https://wa.me/' + cleanPhone + '" target="_blank" style="color:var(--primary);text-decoration:none;display:inline-flex;align-items:center;gap:3px;">📱 ' + escapeHtml(o.phone) + '</a>';
    }

    // Hitung total nilai persediaan rak
    let totalPcs = 0;
    let totalNilai = 0;
    stocks.forEach(function (s) {
      totalPcs += Number(s.qty_current || 0);
      totalNilai += Number(s.subtotal || 0);
    });

    // 1. Tab Sisa Stok
    const stockRowsHtml = stocks.length ? stocks.map(function (s) {
      return '<tr>' +
        '<td>' +
        '<div style="font-weight:700;color:var(--text-main);">' + escapeHtml(s.product_name) + '</div>' +
        '</td>' +
        '<td>' +
        (s.batch_id ? ('<span style="font-family:\'JetBrains Mono\',monospace;font-size:11px;background:var(--surface-muted);padding:2px 6px;border-radius:var(--radius-xs);border:1px solid var(--border);">' + escapeHtml(s.batch_id) + '</span>') : '<span style="color:var(--text-muted);font-size:11px;">-</span>') +
        '</td>' +
        '<td style="text-align:center;">' +
        '<strong style="color:var(--primary);font-size:14px;font-family:\'JetBrains Mono\',monospace;">' + (s.qty_current || 0) + '</strong> ' +
        '<span style="font-size:11px;color:var(--text-secondary);">' + escapeHtml(s.unit || 'pcs') + '</span>' +
        '</td>' +
        '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-size:12px;">' +
        formatRupiah(s.tier_price || 0) +
        '</td>' +
        '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;font-size:13px;color:var(--accent);">' +
        formatRupiah(s.subtotal || 0) +
        '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5"><div style="text-align:center;padding:24px;color:var(--text-secondary);">Belum ada stok fisik di rak outlet ini. Klik <strong>"+ Drop / Transfer Stok Baru"</strong> di atas untuk mengisi rak mitra.</div></td></tr>';

    const stockTabHtml =
      '<div class="table-container">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th>Varietas Benih</th>' +
      '<th>Batch Asal</th>' +
      '<th style="text-align:center;">Sisa Stok di Rak</th>' +
      '<th style="text-align:right;">Harga Satuan (' + escapeHtml(o.price_tier || 'Mitra') + ')</th>' +
      '<th style="text-align:right;">Total Nilai Rak</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + stockRowsHtml + '</tbody>' +
      (stocks.length ? (
        '<tfoot>' +
        '<tr style="background:var(--surface-muted);font-weight:700;">' +
        '<td colspan="2">TOTAL PERSEDIAAN RAK</td>' +
        '<td style="text-align:center;font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:14px;">' + totalPcs + ' pcs</td>' +
        '<td></td>' +
        '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--accent);font-size:14px;">' + formatRupiah(totalNilai) + '</td>' +
        '</tr>' +
        '</tfoot>'
      ) : '') +
      '</table>' +
      '</div>';

    // 2. Tab Riwayat Transfer / Drop Stok (Surat Jalan Konsinyasi)
    const transferRowsHtml = transfers.length ? transfers.map(function (t) {
      const isDelivered = (t.delivery_status === 'DELIVERED');
      const statusBadge = isDelivered ?
        '<span class="badge-delivered">✅ DELIVERED</span>' :
        '<span class="badge-in-transit">🚚 IN_TRANSIT</span>';

      const recipientInfo = isDelivered ?
        ('<div><strong>' + escapeHtml(t.actual_recipient_name || '-') + '</strong></div>' +
          '<div style="font-size:10px;color:var(--text-secondary);">' + escapeHtml(t.recipient_role || 'Penerima') + (t.received_at ? (' &bull; ' + formatDateTimeIndo(t.received_at)) : '') + '</div>') :
        '<span style="color:var(--text-muted);font-size:11px;">Menunggu Serah Terima</span>';

      const actionSignBtn = !isDelivered ?
        ('<button type="button" class="btn btn-primary btn-sm" onclick="openDeliveryReceiptModal(\'' + t.id + '\', \'' + o.id + '\')" style="margin-right:4px;">✍️ Serah Terima / Tanda Tangan</button>') :
        ('<button type="button" class="btn btn-secondary btn-sm" onclick="viewDeliveryReceiptModal(\'' + t.id + '\', \'' + o.id + '\')" style="margin-right:4px;">👁️ Bukti Serah Terima</button>');

      const docActionBtn = t.pdf_url ?
        ('<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="margin-right:4px;" title="Cetak Surat Jalan A4 Langsung">🖨️ Cetak SJ</button>' +
          '<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 PDF</a>') :
        ('<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" title="Cetak atau Simpan PDF Surat Jalan A4">🖨️ Cetak / PDF</button>');

      return '<tr>' +
        '<td>' + formatDate(t.sent_at) + '</td>' +
        '<td><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">' + escapeHtml(t.invoice_no || t.id) + '</strong></td>' +
        '<td style="text-align:center;"><strong style="font-size:13px;">' + (t.total_pcs || 0) + '</strong> pcs</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + recipientInfo + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' + actionSignBtn + docActionBtn + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div style="text-align:center;padding:24px;color:var(--text-secondary);">Belum ada riwayat drop stok untuk outlet ini.</div></td></tr>';

    const transferTabHtml =
      '<div class="table-container">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th>Tanggal Drop</th>' +
      '<th>No. Surat Jalan</th>' +
      '<th style="text-align:center;">Total Pcs</th>' +
      '<th>Status Pengiriman</th>' +
      '<th>Penerima di Lokasi</th>' +
      '<th style="text-align:right;">Aksi Surat Jalan</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + transferRowsHtml + '</tbody>' +
      '</table>' +
      '</div>';

    // 3. Tab Riwayat Kunjungan & Stok Opname Lapangan (MOV)
    const auditRowsHtml = audits.length ? audits.map(function (a) {
      const aItems = a.consignment_audit_items || [];
      const computedSold = aItems.reduce(function (s, it) { return s + Number(it.qty_sold || 0); }, 0);
      const computedMissing = aItems.reduce(function (s, it) { return s + Number(it.qty_missing || 0); }, 0);
      const computedChargeable = aItems.reduce(function (s, it) {
        return s + ((it.missing_chargeable === true || String(it.missing_chargeable) === 'true') ? Number(it.qty_missing || 0) : 0);
      }, 0);
      const computedReturned = aItems.reduce(function (s, it) { return s + Number(it.qty_returned || 0); }, 0);
      const computedRestock = aItems.reduce(function (s, it) { return s + Number(it.qty_restock || 0); }, 0);

      const totalSold = (a.total_sold !== undefined && a.total_sold !== null) ? Number(a.total_sold) : computedSold;
      const totalMissing = (a.total_missing !== undefined && a.total_missing !== null) ? Number(a.total_missing) : computedMissing;
      const totalChargeable = (a.total_chargeable_missing !== undefined && a.total_chargeable_missing !== null) ? Number(a.total_chargeable_missing) : computedChargeable;
      const totalWriteoff = (a.total_writeoff_missing !== undefined && a.total_writeoff_missing !== null) ? Number(a.total_writeoff_missing) : Math.max(0, totalMissing - totalChargeable);
      const totalReturned = (a.total_returned !== undefined && a.total_returned !== null) ? Number(a.total_returned) : computedReturned;
      const totalRestock = (a.total_restock !== undefined && a.total_restock !== null) ? Number(a.total_restock) : computedRestock;

      const pdfBtn = a.pdf_url ?
        '<a href="' + escapeHtml(a.pdf_url) + '" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 Buka PDF</a>' :
        '<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentAuditReport(\'' + escapeHtml(a.id) + '\')" title="Cetak Berita Acara Stok Opname A4">🖨️ Cetak BA</button>';

      const photoThumb = a.display_photo_url ?
        '<a href="' + escapeHtml(a.display_photo_url) + '" target="_blank" title="Buka Foto Display Rak">' +
        '<img src="' + escapeHtml(a.display_photo_url) + '" class="audit-hist-thumb" alt="Display" />' +
        '</a>' :
        '<div class="audit-hist-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>';

      const missingWaLine = Number(a.total_missing || 0) > 0 ?
        ('• Barang Hilang/Selisih: ' + a.total_missing + ' pcs (Ditagihkan ke Mitra: ' + (a.total_chargeable_missing || 0) + ' pcs, Beban Toko: ' + (a.total_writeoff_missing || 0) + ' pcs)\n') : '';

      const waText = encodeURIComponent(
        'Halo Bapak/Ibu ' + (a.outlet_pic || o.pic_name || '') + ' (' + (o.name || 'Toko Mitra') + '),\n\n' +
        'Berikut terlampir dokumen resmi *Berita Acara Stok Opname Konsinyasi*:\n' +
        '• No. Dokumen: #' + a.id + '\n' +
        '• Tanggal Opname: ' + formatDate(a.audit_date) + '\n' +
        '• Petugas Pemeriksa: ' + a.auditor_name + '\n' +
        '• Terjual: ' + (a.total_sold || 0) + ' pcs\n' +
        '• Retur Rusak/Exp: ' + totalReturned + ' pcs\n' +
        missingWaLine +
        '• Restock Baru di Tempat: ' + totalRestock + ' pcs\n' +
        (a.notes ? ('• Catatan: ' + a.notes + '\n') : '') +
        (a.pdf_url ? ('\nDokumen PDF Berita Acara dapat diunduh pada tautan Google Drive:\n' + a.pdf_url + '\n\n') : '\n') +
        'Terima kasih atas kerja samanya.\n*Manajemen POS & Inventaris*'
      );
      const waBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="openConsignmentAuditWAModal(\'' + escapeHtml(a.outlet_pic || o.pic_name) + '\',\'' + waText + '\')">💬 Kirim WA</button>';

      let invoiceActionHtml = '';
      const billableCount = totalSold + totalChargeable;
      if (a.invoice_id) {
        invoiceActionHtml = '<span class="badge badge-success" style="font-size:10px;">🧾 Faktur: #' + escapeHtml(a.invoice_id) + '</span>';
      } else if (billableCount > 0) {
        invoiceActionHtml = '<button type="button" class="btn btn-primary btn-sm" onclick="openConsignmentInvoiceModal(\'' + a.id + '\',\'' + escapeHtml(o.name || '') + '\',\'' + escapeHtml(o.phone || '') + '\',\'' + o.id + '\')">🧾 Buat Faktur (' + billableCount + ' pcs)</button>';
      }

      const missingCardInfo = Number(a.total_missing || 0) > 0 ?
        (' &bull; Hilang/Selisih: <strong style="color:var(--danger);">' + a.total_missing + ' pcs</strong> (' + (a.total_chargeable_missing || 0) + ' tagih mitra, ' + (a.total_writeoff_missing || 0) + ' beban Toko)') : '';

      return '<div class="audit-hist-card">' +
        '<div class="audit-hist-info">' +
        photoThumb +
        '<div>' +
        '<div style="font-size:12px;font-weight:700;color:var(--text-main);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span>#' + escapeHtml(a.id) + '</span>' +
        '<span class="badge badge-success" style="font-size:10px;">✓ Dual Signature</span>' +
        invoiceActionHtml +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
        '📅 ' + formatDate(a.audit_date) + ' &bull; Auditor: <strong>' + escapeHtml(a.auditor_name) + '</strong> &bull; PIC: <strong>' + escapeHtml(a.outlet_pic) + '</strong>' +
        '</div>' +
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
        'Terjual: <strong style="color:var(--success);">' + totalSold + ' pcs</strong> &bull; ' +
        'Retur: <strong style="color:var(--warning);">' + totalReturned + ' pcs</strong>' +
        missingCardInfo + ' &bull; ' +
        'Restock: <strong style="color:var(--primary);">' + totalRestock + ' pcs</strong>' +
        '</div>' +
        (a.notes ? ('<div style="font-size:11px;color:var(--text-muted);margin-top:2px;font-style:italic;">Catatan: ' + escapeHtml(a.notes) + '</div>') : '') +
        '</div>' +
        '</div>' +
        '<div class="audit-hist-actions">' +
        pdfBtn +
        waBtn +
        '</div>' +
        '</div>';
    }).join('') : '<div style="padding:24px;text-align:center;color:var(--text-secondary);background:var(--surface-muted);border:1px dashed var(--border);border-radius:var(--radius-sm);">Belum ada riwayat kunjungan dan audit stok opname. Klik <strong>"📋 Mulai Stok Opname Lapangan"</strong> di atas untuk melakukan kunjungan pertama.</div>';

    const auditTabHtml = '<div style="margin-top:6px;">' + auditRowsHtml + '</div>';

    const bodyHtml =
      // Bagian Atas: Header Card Profil Outlet
      '<div class="outlet-profile-card">' +
      '<div class="outlet-profile-info">' +
      '<div class="outlet-profile-title">' +
      '<span>' + escapeHtml(o.name) + '</span>' +
      '<span class="outlet-price-tier-tag">Tier: ' + escapeHtml(o.price_tier || 'Mitra') + '</span>' +
      visitBadge +
      '</div>' +
      '<div class="outlet-profile-meta">' +
      '<span>👤 PIC: <strong>' + escapeHtml(o.pic_name || '-') + '</strong></span>' +
      (waLink ? ('<span>' + waLink + '</span>') : '') +
      (o.address ? ('<span>📍 ' + escapeHtml(o.address) + '</span>') : '') +
      '</div>' +
      '</div>' +
      '<div class="outlet-profile-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="openTransferStockModal(\'' + o.id + '\')">📦 + Drop / Transfer Stok Baru</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openConsignmentAuditModal(\'' + o.id + '\')">📋 Mulai Stok Opname Lapangan</button>' +
      '</div>' +
      '</div>' +

      // Tab Navigasi 360°
      '<div class="outlet-tabs">' +
      '<button type="button" id="tab-btn-stocks" class="outlet-tab-btn ' + (activeTab === 'stocks' ? 'active' : '') + '" onclick="switchOutletTab(\'stocks\')">' +
      '🌿 Sisa Stok di Rak <span class="outlet-tab-badge">' + stocks.length + '</span>' +
      '</button>' +
      '<button type="button" id="tab-btn-transfers" class="outlet-tab-btn ' + (activeTab === 'transfers' ? 'active' : '') + '" onclick="switchOutletTab(\'transfers\')">' +
      '🚚 Riwayat Drop / Transfer <span class="outlet-tab-badge">' + transfers.length + '</span>' +
      '</button>' +
      '<button type="button" id="tab-btn-audits" class="outlet-tab-btn ' + (activeTab === 'audits' ? 'active' : '') + '" onclick="switchOutletTab(\'audits\')">' +
      '📋 Riwayat Opname &amp; MOV <span class="outlet-tab-badge">' + audits.length + '</span>' +
      '</button>' +
      '</div>' +

      // Konten Tab 1
      '<div id="tab-pane-stocks" class="outlet-tab-pane ' + (activeTab === 'stocks' ? 'active' : '') + '">' +
      stockTabHtml +
      '</div>' +

      // Konten Tab 2
      '<div id="tab-pane-transfers" class="outlet-tab-pane ' + (activeTab === 'transfers' ? 'active' : '') + '">' +
      transferTabHtml +
      '</div>' +

      // Konten Tab 3
      '<div id="tab-pane-audits" class="outlet-tab-pane ' + (activeTab === 'audits' ? 'active' : '') + '">' +
      auditTabHtml +
      '</div>';

    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>';

    openModal('Detail 360° Outlet Mitra: ' + o.name, bodyHtml, footerHtml, true);
  }).catch(function (err) {
    showToast('Gagal memuat detail outlet: ' + (err.message || err), true);
  });
}

function switchOutletTab(tabName) {
  ['stocks', 'transfers', 'audits'].forEach(function (t) {
    const btn = document.getElementById('tab-btn-' + t);
    const pane = document.getElementById('tab-pane-' + t);
    if (btn) {
      if (t === tabName) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (pane) {
      if (t === tabName) pane.classList.add('active');
      else pane.classList.remove('active');
    }
  });
}

// ========================= MODAL DROP / TRANSFER STOK BARU =========================
async function openTransferStockModal(outletId) {
  if (!PRODUCTS_CACHE || PRODUCTS_CACHE.length === 0) {
    if (DATA_CACHE && DATA_CACHE.products && Array.isArray(DATA_CACHE.products.data) && DATA_CACHE.products.data.length > 0) {
      PRODUCTS_CACHE = DATA_CACHE.products.data;
    } else {
      try {
        const pList = await api('getProducts', TOKEN);
        if (Array.isArray(pList)) {
          PRODUCTS_CACHE = pList;
          if (!DATA_CACHE.products) DATA_CACHE.products = {};
          DATA_CACHE.products.data = pList;
        }
      } catch (e) {
        console.warn('Gagal memuat produk transfer:', e);
      }
    }
  }
  let outletName = 'Outlet Mitra';
  if (window._currentOutletDetail && window._currentOutletDetail.outlet) {
    outletName = window._currentOutletDetail.outlet.name;
  } else if (DATA_CACHE.outlets && DATA_CACHE.outlets.data) {
    const o = DATA_CACHE.outlets.data.filter(function (x) { return String(x.id) === String(outletId); })[0];
    if (o) outletName = o.name;
  }

  const bodyHtml =
    '<div style="background:var(--surface-muted);border:1px solid var(--border);border-left:4px solid var(--primary);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">' +
    '<div style="font-size:13px;font-weight:700;color:var(--primary);">Drop / Pengiriman Stok ke ' + escapeHtml(outletName) + '</div>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Stok benih kemasan jadi akan dipotong otomatis dari gudang pusat secara FIFO dan ditambahkan ke saldo rak outlet. Dokumen Surat Jalan siap dicetak/disimpan PDF dan diverifikasi tanda tangan penerima.</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Daftar Varietas Benih yang Dikirim <span style="color:var(--danger)">*</span></label>' +
    '<div id="transfer-items-container"></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addTransferStockRow()" style="margin-top:8px;">+ Tambah Varietas Benih</button>' +
    '</div>' +
    '<div class="field-group" style="margin-top:14px;">' +
    '<label class="field-label">Catatan / Keterangan Pengiriman (Opsional)</label>' +
    '<input type="text" id="transfer-notes" class="field-input" placeholder="Contoh: Titipan display tambahan menyambut musim tanam..." style="width:100%;padding:8px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-transfer" onclick="submitTransferStock(\'' + outletId + '\')">⚡ Kirim &amp; Terbitkan Surat Jalan</button>';

  openModal('Drop / Transfer Stok Baru ke Outlet', bodyHtml, footerHtml);
  addTransferStockRow();
}

function addTransferStockRow() {
  const container = document.getElementById('transfer-items-container');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'price-tier-row transfer-stock-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML =
    '<select class="transfer-product field-input" style="flex:1;min-width:0;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;font-size:13px;text-overflow:ellipsis;">' +
    buildProductOptionsHTML('jadi') +
    '</select>' +
    '<input type="number" class="transfer-qty field-input" placeholder="Qty Pcs" min="1" value="10" style="width:85px;min-width:70px;padding:8px 8px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:center;font-weight:700;font-size:13px;">' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="Hapus baris" style="padding:6px 10px;line-height:1;font-size:14px;flex-shrink:0;">&times;</button>';
  container.appendChild(row);
}

function submitTransferStock(outletId) {
  const notes = (document.getElementById('transfer-notes').value || '').trim();
  const rows = Array.from(document.querySelectorAll('#transfer-items-container .price-tier-row'));
  const items = rows.map(function (row) {
    const prodEl = row.querySelector('.transfer-product');
    const qtyEl = row.querySelector('.transfer-qty');
    return {
      product_id: prodEl ? prodEl.value : '',
      qty: Number(qtyEl ? qtyEl.value : 0)
    };
  }).filter(function (it) { return it.product_id && it.qty > 0; });

  if (items.length === 0) {
    showToast('Minimal masukkan 1 item benih yang dikirim.', true);
    return;
  }

  // Validasi ketersediaan stok gudang pusat
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const prod = (PRODUCTS_CACHE || []).find(function (p) { return p.id === it.product_id; });
    const availStock = prod ? Number(prod.stock || 0) : 0;
    if (it.qty > availStock) {
      showToast('Stok gudang pusat untuk "' + (prod ? prod.name : 'Produk') + '" tidak mencukupi (' + availStock + ' ' + (prod ? prod.unit : 'pcs') + ' tersedia, butuh ' + it.qty + ').', true);
      return;
    }
  }

  const btn = document.getElementById('btn-submit-transfer');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⏳ Memproses Mutasi FIFO &amp; Menerbitkan Surat Jalan...';
  }

  api('transferStockToOutlet', TOKEN, {
    outlet_id: outletId,
    notes: notes,
    items: items
  }).then(function (res) {
    if (DATA_CACHE.outlets) DATA_CACHE.outlets.timestamp = 0;
    invalidateCache('products');
    closeModal();
    showToast('Transfer stok berhasil! Stok gudang dipotong FIFO.');

    if (res && res.surat_jalan_url) {
      showConfirmDialog(
        'Surat Jalan Delivery Order Terbit',
        'Surat Jalan pengiriman ke outlet berhasil dibuat di Google Drive. Apakah Anda ingin membuka/mengunduh dokumen PDF Surat Jalan sekarang?',
        function () {
          window.open(res.surat_jalan_url, '_blank');
        }
      );
    }

    // Refresh modal detail outlet tab transfers
    showOutletDetailModal(outletId, 'transfers');
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '⚡ Kirim &amp; Terbitkan Surat Jalan';
    }
    showToast('Gagal transfer stok: ' + (err.message || err), true);
  });
}

function openTransferSuratJalan(transferId) {
  showToast('Menyiapkan dokumen Surat Jalan...');
  api('getConsignmentSuratJalanPdf', TOKEN, transferId).then(function (res) {
    if (res && (res.pdf_url || res.url)) {
      window.open(res.pdf_url || res.url, '_blank');
    } else {
      printConsignmentSuratJalan(transferId);
    }
  }).catch(function (err) {
    console.warn('Fallback ke cetak HTML:', err);
    printConsignmentSuratJalan(transferId);
  });
}

function printConsignmentSuratJalan(transferId) {
  showToast('Menyiapkan dokumen Surat Jalan untuk dicetak...');
  api('getDeliveryOrderReceiptData', TOKEN, transferId).then(function (res) {
    if (!res || !res.transfer) {
      showToast('Gagal memuat data Surat Jalan.', true);
      return;
    }
    const transfer = res.transfer;
    const outlet = res.outlet || {};
    const items = res.items || [];
    const settings = APP_SETTINGS || window.APP_SETTINGS || {};
    const storeTitle = settings.store_name || 'Toko Kasir';
    const storeLogo = settings.store_logo || settings.store_logo_light || '';
    const storeAddress = settings.store_address || 'Br. Batulumbung, Desa Tegal Cangkring, Mendoyo, Jembrana - Bali';
    const storePhone = settings.store_phone || '0812-3456-7890';
    const storeEmail = settings.store_email || 'admin@pos.local';

    let totalQty = 0;
    let totalValue = 0;

    const itemsRows = items.map(function (it, idx) {
      const qty = Number(it.qty || 0);
      const price = Number(it.unit_price || 0);
      const lineVal = qty * price;
      totalQty += qty;
      totalValue += lineVal;
      const batchDisplay = it.batch_id ? escapeHtml(it.batch_id).replace(/,/g, '<br/>') : '-';
      return '<tr>' +
        '<td style="text-align:center;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;">' + (idx + 1) + '</td>' +
        '<td style="padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#1e293b;">' + escapeHtml(typeof formatCleanProductName === 'function' ? formatCleanProductName(it.product_name || it.product_id) : (it.product_name || it.product_id)) + '</td>' +
        '<td style="text-align:center;padding:7px 8px;border:1px solid #cbd5e1;font-size:10px;color:#475569;font-family:monospace;">' + batchDisplay + '</td>' +
        '<td style="text-align:center;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#2563EB;">' + qty + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
        '<td style="text-align:right;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;">Rp ' + price.toLocaleString('id-ID') + '</td>' +
        '<td style="text-align:right;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#1e293b;">Rp ' + lineVal.toLocaleString('id-ID') + '</td>' +
        '</tr>';
    }).join('');

    const logoHtml = storeLogo
      ? '<img src="' + escapeHtml(storeLogo) + '" style="max-height:55px;max-width:180px;object-fit:contain;display:block;margin-bottom:5px;" alt="Logo" />'
      : '<div style="font-size:15pt;font-weight:800;color:#2563EB;letter-spacing:0.5px;margin-bottom:3px;">' + escapeHtml(storeTitle).toUpperCase() + '</div>';

    const printHtml =
      '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8">' +
      '<title>Surat Jalan #' + escapeHtml(transfer.invoice_no || transfer.id) + '</title>' +
      '<style>' +
      '@page { size: A4 portrait; margin: 14mm 14mm 14mm 14mm; }' +
      'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; line-height: 1.4; margin: 0; padding: 0; font-size: 11px; }' +
      'table { width: 100%; border-collapse: collapse; }' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } tr { page-break-inside: avoid; } }' +
      '</style>' +
      '</head><body>' +
      '<div style="border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 16px;">' +
      '<table style="width:100%;border-collapse:collapse;"><tr>' +
      '<td style="vertical-align:top;width:58%;padding-right:15px;">' +
      logoHtml +
      '<div style="font-size:9.5pt;color:#475569;line-height:1.4;margin-top:2px;">' + escapeHtml(storeAddress) + '</div>' +
      '<div style="font-size:9.5pt;color:#475569;margin-top:2px;">Kontak/WA: ' + escapeHtml(storePhone) + (storeEmail ? (' | Email: ' + escapeHtml(storeEmail)) : '') + '</div>' +
      '</td>' +
      '<td style="text-align:right;vertical-align:top;width:42%;">' +
      '<div style="font-size:16pt;font-weight:800;color:#2563EB;letter-spacing:1px;line-height:1.2;">SURAT JALAN</div>' +
      '<div style="font-size:9pt;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:8px;">PENGIRIMAN STOK KONSINYASI</div>' +
      '<table style="display:inline-table;width:auto;text-align:left;font-size:9.5pt;border-collapse:collapse;">' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">No. SJ</td><td style="color:#1e293b;font-weight:bold;">: #' + escapeHtml(transfer.invoice_no || transfer.id) + '</td></tr>' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">Tanggal</td><td style="color:#1e293b;">: ' + escapeHtml(formatDate(transfer.sent_at)) + '</td></tr>' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">Status</td><td style="color:' + (transfer.delivery_status === 'DELIVERED' ? '#0f766e' : '#d97706') + ';font-weight:bold;">: ' + escapeHtml(transfer.delivery_status || 'DELIVERED') + '</td></tr>' +
      '</table>' +
      '</td>' +
      '</tr></table>' +
      '</div>' +

      '<table style="width:100%;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">' +
      '<tr>' +
      '<td style="padding:8px 12px;width:50%;vertical-align:top;border-right:1px solid #e2e8f0;">' +
      '<div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;">Tujuan Toko Cabang / Mitra</div>' +
      '<div style="font-size:13px;font-weight:bold;color:#2563EB;margin-top:2px;">' + escapeHtml(outlet.name || '-') + '</div>' +
      '<div style="font-size:10px;color:#334155;margin-top:3px;">PIC Toko: <strong>' + escapeHtml(outlet.pic_name || '-') + '</strong> (' + escapeHtml(outlet.phone || '-') + ')</div>' +
      '<div style="font-size:10px;color:#475569;margin-top:2px;">Alamat: ' + escapeHtml(outlet.address || '-') + '</div>' +
      '<div style="font-size:10px;color:#0f766e;margin-top:2px;">Tingkat Harga: <strong>' + escapeHtml(outlet.price_tier || 'Mitra') + '</strong></div>' +
      '</td>' +
      '<td style="padding:8px 12px;width:50%;vertical-align:top;">' +
      '<div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;">Informasi Pengiriman</div>' +
      '<div style="font-size:11px;font-weight:bold;color:#1e293b;margin-top:2px;">Tanggal Kirim: ' + escapeHtml(formatDateTimeIndo(transfer.sent_at)) + '</div>' +
      '<div style="font-size:10px;color:#64748b;margin-top:3px;">No. Dokumen: <strong>' + escapeHtml(transfer.invoice_no || transfer.id) + '</strong></div>' +
      '<div style="font-size:10px;color:#64748b;margin-top:2px;">ID Transfer: ' + escapeHtml(transfer.id) + '</div>' +
      (transfer.notes ? ('<div style="font-size:10px;color:#64748b;margin-top:2px;">Catatan: ' + escapeHtml(transfer.notes) + '</div>') : '') +
      (transfer.delivery_notes ? ('<div style="font-size:10px;color:#0f766e;margin-top:2px;"><strong>Catatan Lapangan:</strong> ' + escapeHtml(transfer.delivery_notes) + '</div>') : '') +
      (transfer.delivery_status === 'DELIVERED' ? ('<div style="display:inline-block;margin-top:4px;padding:2px 6px;background:#ecfdf5;color:#047857;border-radius:3px;font-size:9px;font-weight:bold;">Status: DELIVERED (Telah Diterima)</div>') : '') +
      '</td>' +
      '</tr>' +
      '</table>' +

      '<div style="margin-bottom:6px;font-size:10px;font-weight:bold;color:#334155;text-transform:uppercase;">Daftar Benih / Produk Titip Pajang di Rak Mitra:</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">' +
      '<thead>' +
      '<tr style="background:#2563EB;color:#ffffff;">' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;width:28px;">No</th>' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;text-align:left;">Nama Produk</th>' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;text-align:center;width:120px;">No. Batch / Lot</th>' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;text-align:center;width:75px;">Qty Kirim</th>' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;text-align:right;width:95px;">Harga Satuan</th>' +
      '<th style="padding:7px 8px;border:1px solid #1e40af;font-size:10px;text-align:right;width:105px;">Total Nilai Titip</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      itemsRows +
      '<tr style="background:#f1f5f9;font-weight:bold;">' +
      '<td colspan="3" style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;">TOTAL KESELURUHAN:</td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;color:#2563EB;">' + totalQty + ' pcs</td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;"></td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;color:#0f766e;">Rp ' + totalValue.toLocaleString('id-ID') + '</td>' +
      '</tr>' +
      '</tbody>' +
      '</table>' +

      '<div style="margin-bottom:14px;padding:8px 12px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:4px;font-size:9.5px;color:#475569;">' +
      '<strong>Ketentuan Konsinyasi:</strong>' +
      '<ul style="margin:4px 0 0 16px;padding:0;">' +
      '<li>Seluruh barang di atas dititipkan untuk dipajang dan dijual di outlet mitra.</li>' +
      '<li>Kepemilikan barang tetap berada pada pihak pengirim sampai barang dinyatakan terjual pada saat opname bersama.</li>' +
      '<li>Pemeriksaan stok fisik dan penagihan hasil penjualan dilakukan secara periodik melalui Berita Acara Rekonsiliasi resmi.</li>' +
      '</ul>' +
      '</div>' +

      '<div style="margin-top:24px;page-break-inside:avoid;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:8px;text-align:center;">BUKTI SERAH TERIMA DROP STOK TITIPAN</div>' +
      '<table style="width:100%;border:1px solid #cbd5e1;border-radius:6px;background:#ffffff;">' +
      '<tr>' +
      '<td style="width:50%;text-align:center;padding:14px;border-right:1px solid #cbd5e1;vertical-align:bottom;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:50px;">Pihak Pengirim</div>' +
      '<div style="border-top:1px solid #94a3b8;padding-top:4px;display:inline-block;width:80%;">' +
      '<strong style="font-size:11px;">Petugas Pengantar</strong>' +
      '<div style="font-size:9px;color:#64748b;">Tanggal: ' + escapeHtml(formatDate(transfer.sent_at)) + '</div>' +
      '</div>' +
      '</td>' +
      '<td style="width:50%;text-align:center;padding:14px;vertical-align:bottom;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:8px;">Pihak Penerima (Toko Cabang / Mitra)</div>' +
      ((transfer.recipient_signature_url || transfer.recipient_signature) ?
        ('<div style="height:55px;text-align:center;margin-bottom:6px;">' +
          '<img src="' + (transfer.recipient_signature_url || transfer.recipient_signature) + '" style="max-height:50px;max-width:160px;display:inline-block;" />' +
          '</div>') :
        '<div style="height:48px;"></div>'
      ) +
      '<div style="border-top:1px solid #94a3b8;padding-top:4px;display:inline-block;width:80%;">' +
      '<strong style="font-size:11px;">' + escapeHtml(transfer.actual_recipient_name || outlet.pic_name || outlet.name || 'Penanggung Jawab Toko') + '</strong>' +
      '<div style="font-size:9px;color:#64748b;">' + (transfer.recipient_role ? ('Jabatan: ' + escapeHtml(transfer.recipient_role)) : 'Tanda Tangan &amp; Cap Toko') + '</div>' +
      (transfer.received_at ? ('<div style="font-size:8.5px;color:#0f766e;margin-top:2px;">Diterima: ' + escapeHtml(formatDateTimeIndo(transfer.received_at)) + '</div>') : '') +
      '</div>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</div>' +

      '<div style="margin-top:18px;text-align:center;font-size:8px;color:#94a3b8;">' +
      'Surat Jalan digital ini diterbitkan secara sah oleh Sistem POS pada ' + escapeHtml(formatDateTimeIndo(transfer.sent_at)) + '.' +
      '</div>' +
      '<script>' +
      'window.onload = function() { window.print(); };' +
      '<\/script>' +
      '</body></html>';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    } else {
      showToast('Pop-up terblokir oleh browser. Izinkan pop-up untuk mencetak Surat Jalan.', true);
    }
  }).catch(function (err) {
    showToast('Gagal memuat Surat Jalan: ' + (err.message || err), true);
  });
}

// ==========================================================================
// MODUL TANDA TANGAN DIGITAL & BERITA ACARA SERAH TERIMA LAPANGAN (POD)
// ==========================================================================

let CURRENT_DELIVERY_ID = null;
window.CURRENT_DELIVERY_ID = null;
window._wasOutletModalOpen = false;
window._currentDeliveryData = null;
window._deliveryPadState = {
  canvas: null,
  ctx: null,
  drawing: false,
  hasDrawn: false,
  isSignatureLocked: false,
  deliveryId: null,
  parentOutletId: null
};

/**
 * Buka modal Serah Terima Barang Konsinyasi (Proof of Delivery / POD)
 */
function openDeliveryReceiptModal(deliveryId, parentOutletId) {
  // Simpan referensi data pengiriman yang sedang diproses ke variabel global sementara
  CURRENT_DELIVERY_ID = deliveryId;
  window.CURRENT_DELIVERY_ID = deliveryId;
  _deliveryPadState.deliveryId = deliveryId;
  _deliveryPadState.parentOutletId = parentOutletId || null;

  // 1. Jika ada modal detail surat jalan/outlet yang sedang aktif, sembunyikan terlebih dahulu
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer && (modalContainer.style.display === 'flex' || modalContainer.classList.contains('active') || (modalContainer.offsetWidth > 0 && modalContainer.offsetHeight > 0))) {
    window._wasOutletModalOpen = true;
    modalContainer.style.display = 'none';
    modalContainer.classList.remove('active');
  } else {
    window._wasOutletModalOpen = false;
  }

  showToast('Menyiapkan formulir Berita Acara Serah Terima...');

  api('getDeliveryOrderReceiptData', TOKEN, deliveryId).then(function (res) {
    if (!res || !res.transfer) {
      showToast('Data Surat Jalan tidak ditemukan.', true);
      // Pulihkan modal sebelumnya jika ada
      if (window._wasOutletModalOpen && modalContainer) {
        modalContainer.style.display = 'flex';
        modalContainer.classList.add('active');
      }
      return;
    }

    const t = res.transfer || {};
    const o = res.outlet || {};
    const items = res.items || [];
    window._currentDeliveryData = res;

    let itemsRows = '';
    let totalPcs = 0;
    if (items.length > 0) {
      itemsRows = items.map(function (it) {
        const qty = Number(it.qty || 0);
        totalPcs += qty;
        const skuDisplay = it.sku || (it.product_id && it.product_id.length > 12 ? it.product_id.slice(0, 8).toUpperCase() : it.product_id) || '-';
        const cleanName = typeof formatCleanProductName === 'function' ? formatCleanProductName(it.product_name) : it.product_name;
        return '<tr>' +
          '<td style="font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-size:11px;font-weight:600;">' + escapeHtml(skuDisplay) + '</td>' +
          '<td><strong>' + escapeHtml(cleanName) + '</strong></td>' +
          '<td style="text-align:center;font-family:\'JetBrains Mono\',monospace;font-size:11px;">' + escapeHtml(it.batch_id || '-') + '</td>' +
          '<td style="text-align:center;font-weight:700;color:var(--primary);">' + qty + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
          '</tr>';
      }).join('');
    } else {
      itemsRows = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:10px;">Tidak ada rincian item benih.</td></tr>';
    }

    const bodyHtml =
      '<!-- RINGKASAN PENGIRIMAN -->' +
      '<div class="pod-summary-card">' +
      '<div class="pod-summary-header">' +
      '<div>' +
      '<div class="pod-doc-tag">No. Surat Jalan: #' + escapeHtml(t.invoice_no || t.id) + '</div>' +
      '<div class="pod-outlet-title" style="margin-top:6px;">🏪 ' + escapeHtml(o.name || 'Toko Cabang / Mitra') + '</div>' +
      (o.address ? ('<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">📍 ' + escapeHtml(o.address) + '</div>') : '') +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div style="font-size:10.5px;color:var(--text-secondary);">Tanggal Pengiriman</div>' +
      '<div style="font-size:12.5px;font-weight:700;color:var(--text-main);">' + formatDate(t.sent_at) + '</div>' +
      '<div style="margin-top:4px;"><span class="badge-in-transit">🚚 Dalam Pengiriman</span></div>' +
      '</div>' +
      '</div>' +
      '<!-- INFO BADGE PIC TERDAFTAR SEBAGAI ACUAN PERBANDINGAN -->' +
      '<div class="pic-reference-badge">' +
      '<span class="icon">👤</span>' +
      '<span>PIC Terdaftar Outlet: <strong>' + escapeHtml(o.pic_name || 'Tidak Tercatat') + '</strong>' + (o.phone ? (' (' + escapeHtml(o.phone) + ')') : '') + '</span>' +
      '</div>' +
      '</div>' +

      '<!-- TABEL RINGKAS BENIH YANG DISERAHKAN -->' +
      '<div class="pod-items-box">' +
      '<div class="pod-items-label">' +
      '<span>📦 Rincian Benih Fisik yang Diserahkan</span>' +
      '<span style="font-weight:600;color:var(--primary);">' + totalPcs + ' pcs total</span>' +
      '</div>' +
      '<table class="pod-items-table">' +
      '<thead>' +
      '<tr>' +
      '<th style="width:85px;">SKU</th>' +
      '<th>Nama Benih</th>' +
      '<th style="text-align:center;width:110px;">Batch / Lot</th>' +
      '<th style="text-align:center;width:95px;">Jumlah</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + itemsRows + '</tbody>' +
      '<tfoot>' +
      '<tr>' +
      '<td colspan="3" style="text-align:right;">TOTAL KESELURUHAN:</td>' +
      '<td style="text-align:center;color:var(--primary);">' + totalPcs + ' pcs</td>' +
      '</tr>' +
      '</tfoot>' +
      '</table>' +
      '</div>' +

      '<!-- FORM BUKTI PENERIMAAN -->' +
      '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;">' +
      '<div style="font-size:12px;font-weight:700;color:var(--text-main);margin-bottom:12px;display:flex;align-items:center;gap:6px;">' +
      '<span>📋</span><span>Formulir Berita Acara &amp; Identitas Penerima</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
      '<div>' +
      '<label class="field-label">Nama Orang yang Menerima di Lokasi <span style="color:var(--danger)">*</span></label>' +
      '<input type="text" id="pod-recipient-name" class="field-input" placeholder="Contoh: Pak Ketut Sujana / Bli Wayan" value="' + escapeHtml(o.pic_name || '') + '" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);" required>' +
      '</div>' +
      '<div>' +
      '<label class="field-label">Jabatan / Status Penerima <span style="color:var(--danger)">*</span></label>' +
      '<select id="pod-recipient-role" class="field-input" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
      '<option value="Staf Toko / Kasir" selected>Staf Toko / Kasir</option>' +
      '<option value="PIC / Owner Cabang">PIC / Owner Cabang</option>' +
      '<option value="Staf Gudang">Staf Gudang</option>' +
      '<option value="Lainnya">Lainnya</option>' +
      '</select>' +
      '</div>' +
      '</div>' +
      '<div style="margin-bottom:14px;">' +
      '<label class="field-label">Catatan Lapangan (Opsional)</label>' +
      '<textarea id="pod-delivery-notes" class="field-input" rows="2" placeholder="Contoh: Diterima kasir karena PIC utama sedang bertugas di luar" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);resize:vertical;"></textarea>' +
      '</div>' +

      '<!-- KOTAK AREA TANDA TANGAN -->' +
      '<div class="pod-signature-area">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
      '<label class="field-label" style="margin-bottom:0;">' +
      'Goreskan Tanda Tangan Penerima <span style="color:var(--danger)">*</span>' +
      '</label>' +
      '<span id="signature-status-badge" class="badge badge-unsigned">Belum Ditandatangani</span>' +
      '</div>' +
      '<div class="pod-sig-canvas-container" id="pod-sig-canvas-container">' +
      '<canvas id="signature-pad" width="360" height="180"></canvas>' +
      '<div class="pod-sig-baseline"></div>' +
      '<div class="pod-sig-guide-text">Tanda Tangan Penerima</div>' +
      '</div>' +
      '<div class="pod-sig-actions">' +
      '<button type="button" id="btn-clear-signature" class="btn btn-outline-secondary" onclick="clearDeliverySignature()">🔄 Ulangi / Hapus</button>' +
      '<button type="button" id="btn-lock-signature" class="btn btn-outline-success" onclick="toggleLockSignature()">🔒 Kunci Tanda Tangan</button>' +
      '</div>' +
      '</div>' +
      '</div>';

    const backBtnText = window._wasOutletModalOpen ? '⬅️ Kembali ke Detail Surat Jalan' : '⬅️ Kembali';
    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closeDeliveryReceiptModal(true)">' + backBtnText + '</button>' +
      '<button type="button" id="btn-submit-delivery" class="btn btn-primary" onclick="submitDeliveryReceipt(\'' + t.id + '\')" disabled style="opacity:0.6;cursor:not-allowed;" title="Kunci tanda tangan terlebih dahulu untuk mengaktifkan">✅ Konfirmasi &amp; Selesaikan Serah Terima</button>';

    const bodyEl = document.getElementById('delivery-signature-modal-body') || document.getElementById('delivery-receipt-modal-body');
    const footerEl = document.getElementById('delivery-signature-modal-footer') || document.getElementById('delivery-receipt-modal-footer');
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;

    // 2. Tampilkan modal tanda tangan dengan menambahkan class aktif dan set display flex
    const modal = document.getElementById('delivery-signature-modal') || document.getElementById('delivery-receipt-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
    document.body.classList.add('modal-open');

    // 3. Inisialisasi dan sesuaikan ukuran canvas tanda tangan (#signature-pad) HANYA SETELAH modal tanda tangan sudah terlihat sepenuhnya di layar
    requestAnimationFrame(function () {
      setTimeout(function () {
        initDeliverySignaturePad();
      }, 70);
    });

  }).catch(function (err) {
    showToast('Gagal memuat rincian surat jalan: ' + (err.message || err), true);
    if (window._wasOutletModalOpen) {
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        modalContainer.style.display = 'flex';
        modalContainer.classList.add('active');
      }
      window._wasOutletModalOpen = false;
    }
  });
}

/**
 * Alias fungsi untuk kompatibilitas
 */
function openDeliverySignatureModal(deliveryId, parentOutletId) {
  openDeliveryReceiptModal(deliveryId, parentOutletId);
}

/**
 * Tutup modal Serah Terima / Tanda Tangan
 * @param {boolean} returnToPrevious - Jika true, pulihkan modal detail surat jalan sebelumnya
 */
function closeDeliveryReceiptModal(returnToPrevious) {
  const modal = document.getElementById('delivery-signature-modal') || document.getElementById('delivery-receipt-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  _deliveryPadState.drawing = false;

  // Jika diminta kembali dan sebelumnya ada modal parent yang terbuka, tampilkan kembali
  if (returnToPrevious && window._wasOutletModalOpen) {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.style.display = 'flex';
      modalContainer.classList.add('active');
      document.body.classList.add('modal-open');
    }
  } else {
    const anyModalStillOpen = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay.active');
    if (!anyModalStillOpen) {
      document.body.classList.remove('modal-open');
    }
  }
  window._wasOutletModalOpen = false;
}

/**
 * Inisialisasi Kanvas Tanda Tangan Digital dengan Touch & Mouse Handling
 * Disesuaikan ukurannya secara responsif terhadap kontainernya
 */
function initDeliverySignaturePad() {
  const canvas = document.getElementById('signature-pad');
  const container = document.getElementById('pod-sig-canvas-container');
  if (!canvas) return;

  // Terapkan touch-action none
  canvas.style.touchAction = 'none';

  // Bersihkan handler lama jika ada
  if (canvas._sigCleanup) {
    canvas._sigCleanup();
  }

  // Hitung lebar responsif dari container
  const cWidth = container ? container.clientWidth : 0;
  const availableWidth = cWidth > 50 ? (cWidth - 16) : 360;
  const targetWidth = Math.max(280, Math.min(availableWidth, 580));
  const targetHeight = 180;

  // Resolusi internal kanvas
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  canvas.style.width = targetWidth + 'px';
  canvas.style.height = targetHeight + 'px';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  _deliveryPadState.canvas = canvas;
  _deliveryPadState.ctx = ctx;
  _deliveryPadState.drawing = false;
  _deliveryPadState.hasDrawn = false;
  _deliveryPadState.isSignatureLocked = false;

  if (canvas) canvas.classList.remove('locked');
  if (container) container.classList.remove('locked');

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    if (_deliveryPadState.isSignatureLocked) return;
    if (e.cancelable) e.preventDefault();
    _deliveryPadState.drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function moveDraw(e) {
    if (_deliveryPadState.isSignatureLocked || !_deliveryPadState.drawing) return;
    if (e.cancelable) e.preventDefault(); // Mencegah scroll HP & pull-to-refresh
    _deliveryPadState.hasDrawn = true;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Update status badge tanda tangan saat mulai menggores
    const badge = document.getElementById('signature-status-badge');
    if (badge && !_deliveryPadState.isSignatureLocked) {
      badge.innerHTML = '✍️ Belum Dikunci';
      badge.className = 'badge badge-drafting';
    }
  }

  function endDraw(e) {
    if (!_deliveryPadState.drawing) return;
    _deliveryPadState.drawing = false;
  }

  // Event Desktop (Mouse)
  canvas.onmousedown = startDraw;
  canvas.onmousemove = moveDraw;
  const onWinMouseUp = function (e) { endDraw(e); };
  window.addEventListener('mouseup', onWinMouseUp);

  // Event Mobile Layar Sentuh (Passive false agar preventDefault aktif)
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });
  canvas.addEventListener('touchcancel', endDraw, { passive: false });

  // Simpan fungsi cleanup
  canvas._sigCleanup = function () {
    canvas.onmousedown = null;
    canvas.onmousemove = null;
    window.removeEventListener('mouseup', onWinMouseUp);
    canvas.removeEventListener('touchstart', startDraw);
    canvas.removeEventListener('touchmove', moveDraw);
    canvas.removeEventListener('touchend', endDraw);
    canvas.removeEventListener('touchcancel', endDraw);
  };
}

/**
 * Fitur Kunci / Buka Kunci Tanda Tangan (Lock Signature)
 */
function toggleLockSignature() {
  const canvas = _deliveryPadState.canvas || document.getElementById('signature-pad');
  const container = document.getElementById('pod-sig-canvas-container');
  const lockBtn = document.getElementById('btn-lock-signature');
  const badge = document.getElementById('signature-status-badge');
  const submitBtn = document.getElementById('btn-submit-delivery');

  // Validasi jika belum ada goresan garis di kanvas
  if (!_deliveryPadState.hasDrawn) {
    showToast('Harap bubuhkan tanda tangan terlebih dahulu sebelum mengunci!', true);
    return;
  }

  if (!_deliveryPadState.isSignatureLocked) {
    // 1. KUNCI TANDA TANGAN
    _deliveryPadState.isSignatureLocked = true;

    if (canvas) canvas.classList.add('locked');
    if (container) container.classList.add('locked');

    if (lockBtn) {
      lockBtn.innerHTML = '✏️ Buka Kunci / Ubah';
      lockBtn.className = 'btn btn-outline-warning';
    }

    if (badge) {
      badge.innerHTML = '✅ Terkunci &amp; Sah';
      badge.className = 'badge badge-locked';
    }

    // Aktifkan tombol submit formulir serah terima
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
      submitBtn.title = 'Selesaikan Serah Terima Konsinyasi';
    }

    showToast('Tanda tangan berhasil dikunci & disahkan.');
  } else {
    // 2. BUKA KUNCI TANDA TANGAN
    _deliveryPadState.isSignatureLocked = false;

    if (canvas) canvas.classList.remove('locked');
    if (container) container.classList.remove('locked');

    if (lockBtn) {
      lockBtn.innerHTML = '🔒 Kunci Tanda Tangan';
      lockBtn.className = 'btn btn-outline-success';
    }

    if (badge) {
      badge.innerHTML = '✍️ Belum Dikunci';
      badge.className = 'badge badge-drafting';
    }

    // Nonaktifkan kembali tombol submit formulir sampai dikunci ulang
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
      submitBtn.style.cursor = 'not-allowed';
      submitBtn.title = 'Kunci tanda tangan terlebih dahulu untuk mengaktifkan';
    }

    showToast('Kunci tanda tangan dibuka. Silakan ubah goresan atau kunci kembali.');
  }
}

/**
 * Bersihkan / Ulangi Goresan Tanda Tangan
 */
function clearDeliverySignature() {
  const canvas = _deliveryPadState.canvas || document.getElementById('signature-pad');
  const container = document.getElementById('pod-sig-canvas-container');
  const lockBtn = document.getElementById('btn-lock-signature');
  const badge = document.getElementById('signature-status-badge');
  const submitBtn = document.getElementById('btn-submit-delivery');

  if (_deliveryPadState.ctx && canvas) {
    _deliveryPadState.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  _deliveryPadState.hasDrawn = false;
  _deliveryPadState.isSignatureLocked = false;

  if (canvas) canvas.classList.remove('locked');
  if (container) container.classList.remove('locked');

  if (lockBtn) {
    lockBtn.innerHTML = '🔒 Kunci Tanda Tangan';
    lockBtn.className = 'btn btn-outline-success';
  }

  if (badge) {
    badge.innerHTML = 'Belum Ditandatangani';
    badge.className = 'badge badge-unsigned';
  }

  // Nonaktifkan kembali tombol submit formulir
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.6';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.title = 'Kunci tanda tangan terlebih dahulu untuk mengaktifkan';
  }

  showToast('Kanvas tanda tangan telah dibersihkan.');
}

/**
 * Konfirmasi & Selesaikan Serah Terima (Kirim ke Backend)
 */
function submitDeliveryReceipt(deliveryId) {
  const nameEl = document.getElementById('pod-recipient-name');
  const actualRecipientName = nameEl ? nameEl.value.trim() : '';
  if (!actualRecipientName) {
    showToast('Harap isi nama orang yang menerima di lokasi!', true);
    if (nameEl) nameEl.focus();
    return;
  }

  if (!_deliveryPadState.hasDrawn) {
    showToast('Harap bubuhkan tanda tangan penerima terlebih dahulu!', true);
    return;
  }

  // VALIDASI: Form Serah Terima menolak submit jika isSignatureLocked === false
  if (!_deliveryPadState.isSignatureLocked) {
    showToast('Harap kunci tanda tangan terlebih dahulu sebelum menyelesaikan serah terima!', true);
    const lockBtn = document.getElementById('btn-lock-signature');
    if (lockBtn) lockBtn.focus();
    return;
  }

  const roleEl = document.getElementById('pod-recipient-role');
  const recipientRole = roleEl ? roleEl.value : 'Staf Toko / Kasir';

  const notesEl = document.getElementById('pod-delivery-notes');
  const deliveryNotes = notesEl ? notesEl.value.trim() : '';

  const submitBtn = document.getElementById('btn-submit-delivery');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="sync-spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;margin-right:6px;"></span> Menyimpan Serah Terima...';
  }

  const signatureBase64 = _deliveryPadState.canvas.toDataURL('image/png');

  const payload = {
    deliveryId: deliveryId,
    actualRecipientName: actualRecipientName,
    recipientRole: recipientRole,
    signatureBase64: signatureBase64,
    deliveryNotes: deliveryNotes
  };

  api('confirmDeliveryReceipt', TOKEN, payload).then(function (res) {
    closeDeliveryReceiptModal();
    showToast(res.message || 'Serah terima surat jalan berhasil diverifikasi dan diselesaikan.');

    const receivedAt = res.received_at || formatDate(new Date());

    // Perbarui status surat jalan di tabel riwayat secara lokal menjadi 'DELIVERED'
    updateLocalTransferStatus(deliveryId, {
      delivery_status: 'DELIVERED',
      actual_recipient_name: actualRecipientName,
      recipient_role: recipientRole,
      recipient_signature: signatureBase64,
      received_at: receivedAt,
      delivery_notes: deliveryNotes,
      pdf_url: res.pdf_url || ''
    });

  }).catch(function (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '✅ Konfirmasi &amp; Selesaikan Serah Terima';
    }
    showToast('Gagal menyelesaikan serah terima: ' + (err.message || err), true);
  });
}

/**
 * Memperbarui status transfer secara lokal di memori dan antarmuka
 */
function updateLocalTransferStatus(deliveryId, updates) {
  // 1. Perbarui pada modal detail outlet jika sedang aktif
  if (window._currentOutletDetail && Array.isArray(window._currentOutletDetail.transfers)) {
    window._currentOutletDetail.transfers.forEach(function (t) {
      if (String(t.id) === String(deliveryId) || String(t.invoice_no) === String(deliveryId)) {
        Object.assign(t, updates);
      }
    });

    const activeTab = document.querySelector('.outlet-tab-btn.active');
    if (activeTab && activeTab.id === 'tab-btn-transfers') {
      showOutletDetailModal(window._currentOutletDetail.outlet.id, 'transfers');
    }
  }

  // 2. Perbarui pada daftar surat jalan konsinyasi utama jika sedang aktif
  if (window._currentKonsinyasiSubtab === 'transfers') {
    renderKonsinyasiTransfers();
  }

  // 3. Reset cache outlets agar data selalu segar
  if (DATA_CACHE && DATA_CACHE.outlets) {
    DATA_CACHE.outlets = null;
  }
}

/**
 * Preview Berita Acara & Bukti Serah Terima yang Sudah Selesai (DELIVERED)
 */
function viewDeliveryReceiptModal(deliveryId, parentOutletId) {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer && (modalContainer.style.display === 'flex' || modalContainer.classList.contains('active') || (modalContainer.offsetWidth > 0 && modalContainer.offsetHeight > 0))) {
    window._wasOutletModalOpen = true;
    modalContainer.style.display = 'none';
    modalContainer.classList.remove('active');
  }

  showToast('Memuat Berita Acara Serah Terima...');

  api('getDeliveryOrderReceiptData', TOKEN, deliveryId).then(function (res) {
    const t = res.transfer || {};
    const o = res.outlet || {};
    const items = res.items || [];

    let itemsRows = items.map(function (it) {
      const cleanName = typeof formatCleanProductName === 'function' ? formatCleanProductName(it.product_name) : it.product_name;
      return '<tr>' +
        '<td style="font-weight:600;color:var(--text-main);">' + escapeHtml(cleanName) + '</td>' +
        '<td style="text-align:center;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);">' + escapeHtml(it.batch_id || '-') + '</td>' +
        '<td style="text-align:center;font-weight:700;color:var(--primary);">' + Number(it.qty || 0) + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
        '</tr>';
    }).join('');
    if (!itemsRows) {
      itemsRows = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:12px;">Tidak ada rincian item benih.</td></tr>';
    }

    const receivedLabel = t.received_at ? formatDateTimeIndo(t.received_at) : formatDate(t.sent_at);

    const bodyHtml =
      '<div class="pod-summary-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
      '<div>' +
      '<div class="pod-doc-tag">#' + escapeHtml(t.invoice_no || t.id) + '</div>' +
      '<div class="pod-outlet-title" style="margin-top:6px;">🏪 ' + escapeHtml(o.name || t.outlet_name || '-') + '</div>' +
      '<div style="font-size:11.5px;color:var(--text-secondary);">PIC Outlet: <strong style="color:var(--text-main);">' + escapeHtml(o.pic_name || '-') + '</strong></div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<span class="badge-delivered">✅ DELIVERED</span>' +
      '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:6px;">Diterima: <strong style="color:var(--text-main);">' + escapeHtml(receivedLabel) + '</strong></div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:16px;">' +
      '<div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;">' +
      '<div style="font-size:10.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;">Orang yang Menerima Fisik</div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--text-main);margin-top:6px;">' + escapeHtml(t.actual_recipient_name || '-') + '</div>' +
      '<div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:4px;">Status: ' + escapeHtml(t.recipient_role || 'Staf Toko / Kasir') + '</div>' +
      (t.delivery_notes ? ('<div style="font-size:11.5px;color:var(--text-secondary);margin-top:8px;background:var(--surface);border:1px solid var(--border);padding:6px 8px;border-radius:var(--radius-xs);"><strong>Catatan:</strong> ' + escapeHtml(t.delivery_notes) + '</div>') : '') +
      '</div>' +
      '<div style="background:var(--surface-muted);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px;text-align:center;">' +
      '<div style="font-size:10.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.4px;font-weight:700;margin-bottom:8px;">Tanda Tangan Digital Penerima</div>' +
      ((t.recipient_signature_url || t.recipient_signature) ?
        ('<img src="' + (t.recipient_signature_url || t.recipient_signature) + '" style="max-height:90px;max-width:100%;object-fit:contain;border:1px dashed #94a3b8;border-radius:6px;padding:6px 12px;background:#F8FAFC;" alt="Tanda Tangan" />') :
        '<div style="color:var(--text-muted);font-size:12px;padding:20px;">(Tanda tangan tidak tersedia)</div>'
      ) +
      '</div>' +
      '</div>' +

      '<div class="pod-items-box">' +
      '<div class="pod-items-label"><span>📦 Daftar Benih yang Telah Diserahkan:</span></div>' +
      '<table class="pod-items-table">' +
      '<thead><tr><th>Nama Benih</th><th style="text-align:center;">Batch</th><th style="text-align:center;">Jumlah</th></tr></thead>' +
      '<tbody>' + itemsRows + '</tbody>' +
      '</table>' +
      '</div>';

    const docButtonsHtml = t.pdf_url ?
      ('<button type="button" class="btn btn-secondary" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="display:inline-flex;align-items:center;gap:6px;">🖨️ Cetak Surat Jalan</button>' +
        '<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;">📄 Unduh PDF Berita Acara Resmi</a>') :
      ('<button type="button" class="btn btn-primary" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="display:inline-flex;align-items:center;gap:6px;">🖨️ Cetak / Simpan PDF Surat Jalan</button>');

    const closeBtnText = window._wasOutletModalOpen ? '⬅️ Kembali ke Detail Surat Jalan' : 'Tutup';
    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closePodViewModal()">' + closeBtnText + '</button>' +
      docButtonsHtml;

    const bodyEl = document.getElementById('pod-view-modal-body');
    const footerEl = document.getElementById('pod-view-modal-footer');
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (footerEl) footerEl.innerHTML = footerHtml;

    const modal = document.getElementById('pod-view-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
    document.body.classList.add('modal-open');

  }).catch(function (err) {
    showToast('Gagal memuat bukti serah terima: ' + (err.message || err), true);
    if (window._wasOutletModalOpen) {
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        modalContainer.style.display = 'flex';
        modalContainer.classList.add('active');
      }
      window._wasOutletModalOpen = false;
    }
  });
}

function closePodViewModal() {
  const modal = document.getElementById('pod-view-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }

  if (window._wasOutletModalOpen) {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
      modalContainer.style.display = 'flex';
      modalContainer.classList.add('active');
      document.body.classList.add('modal-open');
    }
  } else {
    const anyModalOpen = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay.active');
    if (!anyModalOpen) {
      document.body.classList.remove('modal-open');
    }
  }
  window._wasOutletModalOpen = false;
}

/**
 * Tab Navigasi Konsinyasi & Tampilan Tabel Seluruh Surat Jalan
 */
window._currentKonsinyasiSubtab = 'outlets';
window._currentTransferFilter = 'ALL';

function switchKonsinyasiSubtab(tabName) {
  window._currentKonsinyasiSubtab = tabName;
  if (tabName === 'transfers') {
    renderKonsinyasiTransfers();
  } else {
    renderKonsinyasi();
  }
}

function renderKonsinyasiTransfers(filterStatus) {
  if (filterStatus) window._currentTransferFilter = filterStatus;
  const filter = window._currentTransferFilter || 'ALL';

  const content = document.getElementById('content');
  if (!content) return;

  const outlets = (DATA_CACHE.outlets && DATA_CACHE.outlets.data) ? DATA_CACHE.outlets.data : [];

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Toko Cabang &amp; Mitra Konsinyasi</h1>' +
    '<p class="page-subtitle">Pusat monitoring pengiriman Surat Jalan, serah terima fisik benih (Proof of Delivery), dan arsip tanda tangan digital mitra.</p>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button type="button" class="btn btn-primary" onclick="openOutletModal()">+ Tambah Outlet Mitra</button>' +
    '</div>' +
    '</div>' +
    '<div class="konsinyasi-subnav">' +
    '<button type="button" class="konsinyasi-subnav-btn" onclick="switchKonsinyasiSubtab(\'outlets\')">🏪 Toko Cabang &amp; Mitra (' + outlets.length + ')</button>' +
    '<button type="button" class="konsinyasi-subnav-btn active" onclick="switchKonsinyasiSubtab(\'transfers\')">🚚 Surat Jalan &amp; Serah Terima Lapangan</button>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">' +
    '<div class="filter-pills" style="display:flex;gap:6px;">' +
    '<button type="button" class="btn btn-sm ' + (filter === 'ALL' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderKonsinyasiTransfers(\'ALL\')">Semua Status</button>' +
    '<button type="button" class="btn btn-sm ' + (filter === 'IN_TRANSIT' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderKonsinyasiTransfers(\'IN_TRANSIT\')">🚚 In Transit (Perlu Serah Terima)</button>' +
    '<button type="button" class="btn btn-sm ' + (filter === 'DELIVERED' ? 'btn-primary' : 'btn-secondary') + '" onclick="renderKonsinyasiTransfers(\'DELIVERED\')">✅ Selesai (Delivered)</button>' +
    '</div>' +
    '<div>' +
    '<input type="text" id="filter-sj-search" placeholder="Cari No. SJ / Outlet..." oninput="filterSuratJalanTable()" style="padding:6px 12px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);min-width:200px;">' +
    '</div>' +
    '</div>' +
    '<div id="transfers-table-container">' +
    '<div style="text-align:center;padding:40px;color:var(--text-secondary);">' +
    '<span class="sync-spinner" style="display:inline-block;width:20px;height:20px;margin-right:8px;"></span> Memuat daftar Surat Jalan Konsinyasi...' +
    '</div>' +
    '</div>';

  api('getAllConsignmentTransfers', TOKEN, filter).then(function (transfers) {
    window._allConsignmentTransfers = transfers || [];
    renderTransfersTableRows(window._allConsignmentTransfers);
  }).catch(function (err) {
    const container = document.getElementById('transfers-table-container');
    if (container) {
      container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--danger);">Gagal memuat Surat Jalan: ' + escapeHtml(err.message || err) + '</div>';
    }
  });
}

function renderTransfersTableRows(list) {
  const container = document.getElementById('transfers-table-container');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div class="table-container" style="text-align:center;padding:36px;color:var(--text-secondary);">Tidak ada dokumen Surat Jalan yang cocok dengan filter saat ini.</div>';
    return;
  }

  const rowsHtml = list.map(function (t) {
    const isDelivered = (t.delivery_status === 'DELIVERED');
    const statusBadge = isDelivered ?
      '<span class="badge-delivered">✅ DELIVERED</span>' :
      '<span class="badge-in-transit">🚚 IN_TRANSIT</span>';

    const recipientInfo = isDelivered ?
      ('<div><strong>' + escapeHtml(t.actual_recipient_name || '-') + '</strong></div>' +
        '<div style="font-size:10px;color:var(--text-secondary);">' + escapeHtml(t.recipient_role || 'Penerima') + (t.received_at ? (' &bull; ' + formatDateTimeIndo(t.received_at)) : '') + '</div>') :
      '<span style="color:var(--text-muted);font-size:11px;">Menunggu Serah Terima</span>';

    const actionBtn = !isDelivered ?
      ('<button type="button" class="btn btn-primary btn-sm" onclick="openDeliveryReceiptModal(\'' + t.id + '\', \'' + t.outlet_id + '\')" style="margin-right:4px;">✍️ Serah Terima / Tanda Tangan</button>') :
      ('<button type="button" class="btn btn-secondary btn-sm" onclick="viewDeliveryReceiptModal(\'' + t.id + '\', \'' + t.outlet_id + '\')" style="margin-right:4px;">👁️ Bukti Serah Terima</button>');

    const docBtn = t.pdf_url ?
      ('<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="margin-right:4px;" title="Cetak Surat Jalan A4 Langsung">🖨️ Cetak</button>' +
        '<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 PDF</a>') :
      ('<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" title="Cetak atau Simpan PDF Surat Jalan A4">🖨️ Cetak / PDF</button>');

    return '<tr class="sj-row">' +
      '<td>' + formatDate(t.sent_at) + '</td>' +
      '<td><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">' + escapeHtml(t.invoice_no || t.id) + '</strong></td>' +
      '<td>' +
      '<div style="font-weight:700;color:var(--text-main);">' + escapeHtml(t.outlet_name) + '</div>' +
      '<div style="font-size:10.5px;color:var(--text-secondary);">PIC: ' + escapeHtml(t.pic_name) + '</div>' +
      '</td>' +
      '<td style="text-align:center;"><strong style="font-size:13px;">' + (t.total_pcs || 0) + '</strong> pcs</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td>' + recipientInfo + '</td>' +
      '<td style="text-align:right;white-space:nowrap;">' + actionBtn + docBtn + '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Tanggal Kirim</th>' +
    '<th>No. Surat Jalan</th>' +
    '<th>Toko Cabang / Mitra</th>' +
    '<th style="text-align:center;">Total Pcs</th>' +
    '<th>Status Pengiriman</th>' +
    '<th>Penerima di Lokasi</th>' +
    '<th style="text-align:right;">Aksi Serah Terima</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '</table>' +
    '</div>';
}

function filterSuratJalanTable() {
  const query = (document.getElementById('filter-sj-search').value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('.sj-row');
  rows.forEach(function (r) {
    const text = r.textContent.toLowerCase();
    r.style.display = text.indexOf(query) !== -1 ? '' : 'none';
  });
}

// ========================= MODUL STOK OPNAME LAPANGAN KONSINYASI =========================
window._currentAuditData = null;
window._sigPads = {};

// Mencegah pull-to-refresh atau reload tidak sengaja saat pengisian stok opname berlangsung
window.addEventListener('beforeunload', function (e) {
  const container = document.getElementById('modal-container');
  const isAuditOpen = !!(window._currentAuditData && container && container.style.display !== 'none');
  if (isAuditOpen) {
    e.preventDefault();
    e.returnValue = 'Data perhitungan fisik stok opname belum disimpan. Apakah Anda yakin ingin memuat ulang atau meninggalkan halaman?';
    return e.returnValue;
  }
});

async function openConsignmentAuditModal(outletId) {
  showToast('Menyiapkan formulir audit stok opname...');
  if (!PRODUCTS_CACHE || PRODUCTS_CACHE.length === 0) {
    try {
      const pList = await api('getProducts', TOKEN);
      if (Array.isArray(pList)) {
        PRODUCTS_CACHE = pList;
        if (!DATA_CACHE.products) DATA_CACHE.products = {};
        DATA_CACHE.products.data = pList;
      }
    } catch (e) { }
  }
  api('getOutletDetail', TOKEN, outletId).then(function (data) {
    const o = data.outlet || {};
    const stocks = Array.isArray(data.stocks) ? data.stocks : [];
    if (stocks.length === 0) {
      showToast('Belum ada stok fisik benih di outlet ini. Lakukan drop stok terlebih dahulu.', true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const auditorDefault = (typeof USER_NAME !== 'undefined' && USER_NAME) ? USER_NAME : ((typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.name) ? CURRENT_USER.name : 'Petugas Pemeriksa');

    window._currentAuditData = {
      outlet_id: outletId,
      store_name: o.name,
      store_phone: o.phone || '',
      outlet_pic: o.pic_name || '',
      items: stocks.map(function (s) {
        const sys = Number(s.qty_current || 0);
        return {
          product_id: s.product_id,
          product_name: s.product_name,
          batch_id: s.batch_id || '',
          unit: s.unit || 'pcs',
          qty_system: sys,
          qty_actual: sys,
          qty_returned: 0,
          qty_missing: 0,
          missing_chargeable: true,
          qty_sold: 0,
          qty_restock: 0,
          qty_balance: sys,
          notes: ''
        };
      }),
      photoBase64: '',
      sigInternalBase64: '',
      sigOutletBase64: ''
    };

    const tableRowsHtml = window._currentAuditData.items.map(function (it, idx) {
      return '<tr data-item-idx="' + idx + '">' +
        '<td>' +
        '<strong>' + escapeHtml(it.product_name) + '</strong>' +
        (it.batch_id ? ('<div style="font-size:9.5px;color:var(--text-muted);font-family:monospace;">Batch: ' + escapeHtml(it.batch_id) + '</div>') : '') +
        '</td>' +
        '<td style="text-align:center;"><span class="badge badge-neutral" id="audit-sys-' + idx + '">' + it.qty_system + '</span></td>' +
        '<td style="text-align:center;">' +
        '<input type="number" class="audit-qty-input" id="audit-actual-' + idx + '" value="' + it.qty_actual + '" min="0" oninput="recalcAuditRow(' + idx + ')">' +
        '</td>' +
        '<td style="text-align:center;">' +
        '<input type="number" class="audit-qty-input" id="audit-ret-' + idx + '" value="' + it.qty_returned + '" min="0" oninput="recalcAuditRow(' + idx + ')">' +
        '</td>' +
        '<td style="text-align:center;">' +
        '<input type="number" class="audit-qty-input" id="audit-missing-' + idx + '" value="' + (it.qty_missing || 0) + '" min="0" oninput="recalcAuditRow(' + idx + ')" style="border-color:rgba(239,68,68,0.5);color:var(--danger);font-weight:700;">' +
        '</td>' +
        '<td>' +
        '<select id="audit-chargeable-' + idx + '" class="field-input" onchange="recalcAuditRow(' + idx + ')" style="width:100%;min-width:140px;padding:4px 6px;font-size:10.5px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
        '<option value="true"' + (it.missing_chargeable ? ' selected' : '') + '>Ditagihkan ke Mitra (Kelalaian Toko)</option>' +
        '<option value="false"' + (!it.missing_chargeable ? ' selected' : '') + '>Write-off Toko (Beban Toko)</option>' +
        '</select>' +
        '</td>' +
        '<td style="text-align:center;">' +
        '<span class="audit-sold-badge" id="audit-sold-' + idx + '">0</span>' +
        '</td>' +
        '<td style="text-align:center;">' +
        '<input type="number" class="audit-qty-input" id="audit-restock-' + idx + '" value="' + it.qty_restock + '" min="0" oninput="recalcAuditRow(' + idx + ')">' +
        '</td>' +
        '<td style="text-align:center;">' +
        '<strong style="color:var(--primary);font-size:12px;" id="audit-balance-' + idx + '">' + it.qty_balance + '</strong>' +
        '</td>' +
        '<td>' +
        '<input type="text" class="field-input" placeholder="Kondisi rak / display..." id="audit-notes-' + idx + '" oninput="updateAuditItemNotes(' + idx + ', this.value)" style="width:100%;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
        '</td>' +
        '</tr>';
    }).join('');

    const bodyHtml =
      '<div style="margin-bottom:14px;background:var(--surface-muted);border:1px solid var(--border);border-left:4px solid var(--primary);padding:12px 14px;border-radius:var(--radius-sm);">' +
      '<div style="font-size:14px;font-weight:700;color:var(--primary);">' + escapeHtml(o.name) + '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Audit Opname Lapangan, Penanganan Selisih Fisik, Mutasi Retur, Restock Baru di Rak &amp; Rekonsiliasi Berita Acara MOV Resmi</div>' +
      '</div>' +

      // 1. Informasi Kunjungan
      '<div class="audit-form-section">' +
      '<div class="audit-section-title"><span>📋 1. Informasi Kunjungan &amp; Penanggung Jawab</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div>' +
      '<label class="field-label">Tanggal Opname</label>' +
      '<div class="input-wrapper"><input type="date" id="audit-date" value="' + todayStr + '" style="padding-left:12px;"></div>' +
      '</div>' +
      '<div>' +
      '<label class="field-label">Petugas Pemeriksa Toko</label>' +
      '<div class="input-wrapper"><input type="text" id="audit-auditor" value="' + escapeHtml(auditorDefault) + '" style="padding-left:12px;"></div>' +
      '</div>' +
      '<div>' +
      '<label class="field-label">Nama PIC / Supervisor Toko Mitra <span style="color:var(--danger)">*</span></label>' +
      '<div class="input-wrapper"><input type="text" id="audit-pic" value="' + escapeHtml(o.pic_name || '') + '" placeholder="Contoh: Pak Ketut / Ibu Wayan" style="padding-left:12px;"></div>' +
      '</div>' +
      '<div>' +
      '<label class="field-label">No. WhatsApp PIC (Untuk Kirim Berita Acara)</label>' +
      '<div class="input-wrapper"><input type="text" id="audit-pic-phone" value="' + escapeHtml(o.phone || '') + '" placeholder="Contoh: 081234567890" style="padding-left:12px;"></div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 2. Tabel Opname Interaktif
      '<div class="audit-form-section">' +
      '<div class="audit-section-title"><span>📦 2. Rekonsiliasi Stok Fisik, Selisih &amp; Hitung Unit Terjual</span></div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">' +
      'Unit terjual dihitung otomatis: <em>Saldo Sistem - (Fisik Rak + Retur + Hilang/Selisih)</em>. Jika barang hilang ditagihkan ke mitra, kuantiti akan otomatis diikutkan ke penagihan faktur.' +
      '</div>' +
      '<div class="audit-table-wrap">' +
      '<table class="audit-table">' +
      '<thead>' +
      '<tr>' +
      '<th>Produk</th>' +
      '<th style="text-align:center;">Saldo Lalu</th>' +
      '<th style="text-align:center;">Fisik di Rak</th>' +
      '<th style="text-align:center;">Retur Rusak/Exp</th>' +
      '<th style="text-align:center;">Hilang / Selisih</th>' +
      '<th style="text-align:center;">Beban Selisih</th>' +
      '<th style="text-align:center;">Terjual (Auto)</th>' +
      '<th style="text-align:center;">+ Restock Baru</th>' +
      '<th style="text-align:center;">Saldo Baru</th>' +
      '<th>Keterangan</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + tableRowsHtml + '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>' +

      // 3. Modul Kamera Bukti Display
      '<div class="audit-form-section">' +
      '<div class="audit-section-title"><span>📸 3. Bukti Foto Display / Penataan Rak Benih <span style="color:var(--danger)">*</span></span></div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">Ambil atau unggah foto rak pajangan benih di outlet. Foto otomatis dikompresi (maksimal 1000px) sebelum diunggah ke penyimpanan cloud.</div>' +
      '<div class="audit-photo-box" onclick="document.getElementById(\'audit-photo-input\').click()">' +
      '<input type="file" id="audit-photo-input" accept="image/*" capture="environment" onchange="handleAuditPhotoUpload(this)" style="display:none;">' +
      '<div id="audit-photo-placeholder">' +
      '<div style="font-size:32px;margin-bottom:6px;">📷</div>' +
      '<div style="font-size:13px;font-weight:700;color:var(--primary);">Klik untuk Ambil / Unggah Foto Rak Display</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Format JPEG/PNG, otomatis dikompresi hemat kuota</div>' +
      '</div>' +
      '<div id="audit-photo-preview-wrap" style="display:none;" class="audit-photo-preview-wrap">' +
      '<img id="audit-photo-preview" class="audit-photo-preview" src="" alt="Pratinjau Display" />' +
      '<div style="margin-top:8px;">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();document.getElementById(\'audit-photo-input\').click();">🔄 Ganti Foto</button>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 4. Modul Dual Signature Touchscreen
      '<div class="audit-form-section">' +
      '<div class="audit-section-title"><span>✍️ 4. Pengesahan Dual Tanda Tangan Digital <span style="color:var(--danger)">*</span></span></div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">Bubuhkan tanda tangan langsung menggunakan jari pada layar sentuh atau kursor mouse.</div>' +
      '<div class="sig-grid">' +
      '<div class="sig-card">' +
      '<div class="sig-card-header">' +
      '<span class="sig-title">Tanda Tangan Petugas Pemeriksa</span>' +
      '<button type="button" class="sig-clear-btn" onclick="clearSignaturePad(\'internal\')">Bersihkan</button>' +
      '</div>' +
      '<div class="sig-canvas-wrap">' +
      '<canvas id="sig-internal-canvas" class="sig-canvas"></canvas>' +
      '<div class="sig-baseline"></div>' +
      '<div class="sig-baseline-text">Tanda Tangan Auditor</div>' +
      '</div>' +
      '</div>' +
      '<div class="sig-card">' +
      '<div class="sig-card-header">' +
      '<span class="sig-title">Tanda Tangan PIC Toko Mitra</span>' +
      '<button type="button" class="sig-clear-btn" onclick="clearSignaturePad(\'outlet\')">Bersihkan</button>' +
      '</div>' +
      '<div class="sig-canvas-wrap">' +
      '<canvas id="sig-outlet-canvas" class="sig-canvas"></canvas>' +
      '<div class="sig-baseline"></div>' +
      '<div class="sig-baseline-text">Tanda Tangan PIC Toko</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      // 5. Catatan Observasi
      '<div class="audit-form-section">' +
      '<div class="audit-section-title"><span>📝 5. Catatan Observasi / Evaluasi Rak Display</span></div>' +
      '<textarea id="audit-field-notes" placeholder="Catatan kondisi pajangan benih, permintaan varian baru dari toko mitra, atau evaluasi kebersihan rak..." style="width:100%;min-height:60px;padding:8px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);resize:vertical;"></textarea>' +
      '</div>';

    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
      '<button type="button" class="btn btn-primary" id="btn-submit-audit" onclick="submitConsignmentAuditUI(\'' + outletId + '\')">⚡ Simpan &amp; Terbitkan Berita Acara Resmi</button>';

    openModal('Stok Opname Lapangan: ' + o.name, bodyHtml, footerHtml, true);

    setTimeout(function () {
      initSignaturePad('internal');
      initSignaturePad('outlet');
    }, 150);
  }).catch(function (err) {
    showToast('Gagal memuat formulir audit: ' + (err.message || err), true);
  });
}

function recalcAuditRow(idx) {
  if (!window._currentAuditData || !window._currentAuditData.items[idx]) return;
  const item = window._currentAuditData.items[idx];
  const actualInp = document.getElementById('audit-actual-' + idx);
  const retInp = document.getElementById('audit-ret-' + idx);
  const missingInp = document.getElementById('audit-missing-' + idx);
  const chargeableInp = document.getElementById('audit-chargeable-' + idx);
  const restockInp = document.getElementById('audit-restock-' + idx);
  const soldBadge = document.getElementById('audit-sold-' + idx);
  const balanceEl = document.getElementById('audit-balance-' + idx);

  const actual = Math.max(0, Number(actualInp ? actualInp.value : 0) || 0);
  const ret = Math.max(0, Number(retInp ? retInp.value : 0) || 0);
  const missing = Math.max(0, Number(missingInp ? missingInp.value : 0) || 0);
  const isChargeable = chargeableInp ? (chargeableInp.value === 'true') : true;
  const restock = Math.max(0, Number(restockInp ? restockInp.value : 0) || 0);
  const sys = item.qty_system;

  // Rekonsiliasi: qty_sold = Saldo Lalu - (qty_actual + qty_returned + qty_missing)
  const sold = Math.max(0, sys - (actual + ret + missing));
  const balance = actual + restock;

  item.qty_actual = actual;
  item.qty_returned = ret;
  item.qty_missing = missing;
  item.missing_chargeable = isChargeable;
  item.qty_sold = sold;
  item.qty_restock = restock;
  item.qty_balance = balance;

  if (soldBadge) {
    soldBadge.textContent = sold;
    if (sold > 0) {
      soldBadge.style.background = 'var(--success-bg)';
      soldBadge.style.color = 'var(--success)';
    } else {
      soldBadge.style.background = 'var(--surface-muted)';
      soldBadge.style.color = 'var(--text-secondary)';
    }
  }

  if (balanceEl) {
    balanceEl.textContent = balance;
  }
}

function updateAuditItemNotes(idx, text) {
  if (window._currentAuditData && window._currentAuditData.items[idx]) {
    window._currentAuditData.items[idx].notes = text;
  }
}

function handleAuditPhotoUpload(input) {
  if (!input || !input.files || input.files.length === 0) return;
  const file = input.files[0];
  showToast('Mengoptimasi dan mengompresi foto display...');

  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const maxDimension = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.70);
      if (window._currentAuditData) {
        window._currentAuditData.photoBase64 = compressedDataUrl;
      }

      const placeholder = document.getElementById('audit-photo-placeholder');
      const previewWrap = document.getElementById('audit-photo-preview-wrap');
      const previewImg = document.getElementById('audit-photo-preview');

      if (placeholder) placeholder.style.display = 'none';
      if (previewWrap) previewWrap.style.display = 'block';
      if (previewImg) previewImg.src = compressedDataUrl;

      showToast('Foto display berhasil dioptimasi.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function initSignaturePad(type) {
  const canvas = document.getElementById('sig-' + type + '-canvas');
  if (!canvas) return;

  canvas.style.touchAction = 'none';
  if (canvas._auditSigCleanup) {
    canvas._auditSigCleanup();
  }

  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(260, Math.round(rect.width || 320));
  canvas.height = Math.max(130, Math.round(rect.height || 140));

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;
  let hasDrawn = false;

  function getPos(e) {
    const cRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (cRect.width || 1);
    const scaleY = canvas.height / (cRect.height || 1);
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    return {
      x: (clientX - cRect.left) * scaleX,
      y: (clientY - cRect.top) * scaleY
    };
  }

  function startDraw(e) {
    if (e.cancelable) e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function moveDraw(e) {
    if (!drawing) return;
    if (e.cancelable) e.preventDefault();
    hasDrawn = true;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    if (!drawing) return;
    drawing = false;
  }

  canvas.onmousedown = startDraw;
  canvas.onmousemove = moveDraw;
  window.addEventListener('mouseup', endDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });
  canvas.addEventListener('touchcancel', endDraw, { passive: false });

  canvas._auditSigCleanup = function () {
    canvas.onmousedown = null;
    canvas.onmousemove = null;
    window.removeEventListener('mouseup', endDraw);
    canvas.removeEventListener('touchstart', startDraw);
    canvas.removeEventListener('touchmove', moveDraw);
    canvas.removeEventListener('touchend', endDraw);
    canvas.removeEventListener('touchcancel', endDraw);
  };

  window._sigPads[type] = {
    canvas: canvas,
    ctx: ctx,
    isDrawn: function () { return hasDrawn; },
    clear: function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawn = false;
    },
    toDataURL: function () {
      return canvas.toDataURL('image/png');
    }
  };
}

function clearSignaturePad(type) {
  if (window._sigPads && window._sigPads[type]) {
    window._sigPads[type].clear();
  }
}

function initAuditSignaturePads() {
  initSignaturePad('internal');
  initSignaturePad('outlet');
}
window.initAuditSignaturePads = initAuditSignaturePads;
window.openConsignmentAuditModal = openConsignmentAuditModal;
window.recalcAuditRow = recalcAuditRow;
window.updateAuditItemNotes = updateAuditItemNotes;
window.handleAuditPhotoUpload = handleAuditPhotoUpload;
window.initSignaturePad = initSignaturePad;
window.clearSignaturePad = clearSignaturePad;
window.submitConsignmentAuditUI = submitConsignmentAuditUI;
window.openAuditSuccessModal = openAuditSuccessModal;
window.openConsignmentAuditWAModal = openConsignmentAuditWAModal;
window.openConsignmentInvoiceModal = openConsignmentInvoiceModal;
window.submitConsignmentInvoice = submitConsignmentInvoice;

function submitConsignmentAuditUI(outletId) {
  if (!window._currentAuditData) return;

  const picName = (document.getElementById('audit-pic').value || '').trim();
  const picPhone = (document.getElementById('audit-pic-phone').value || '').trim();
  const auditorName = (document.getElementById('audit-auditor').value || '').trim();
  const auditDate = document.getElementById('audit-date').value;
  const notes = (document.getElementById('audit-field-notes').value || '').trim();

  if (!picName) {
    showToast('Nama PIC / Supervisor Toko Mitra wajib diisi.', true);
    document.getElementById('audit-pic').focus();
    return;
  }

  if (!window._currentAuditData.photoBase64) {
    showToast('Wajib mengambil/mengunggah foto bukti display rak!', true);
    return;
  }

  if (!window._sigPads['internal'] || !window._sigPads['internal'].isDrawn()) {
    showToast('Tanda tangan Petugas Pemeriksa belum dibubuhkan!', true);
    return;
  }

  if (!window._sigPads['outlet'] || !window._sigPads['outlet'].isDrawn()) {
    showToast('Tanda tangan PIC Toko Mitra belum dibubuhkan!', true);
    return;
  }

  // Validasi ketersediaan stok gudang pusat bila ada restock baru di rak
  const auditItemsList = window._currentAuditData.items || [];
  for (let i = 0; i < auditItemsList.length; i++) {
    const it = auditItemsList[i];
    const restockQty = Number(it.qty_restock || 0);
    if (restockQty > 0 && Array.isArray(PRODUCTS_CACHE) && PRODUCTS_CACHE.length > 0) {
      const prod = PRODUCTS_CACHE.find(function (p) { return p.id === it.product_id; });
      const avail = prod ? Number(prod.stock || 0) : 0;
      if (prod && restockQty > avail) {
        showToast('Stok gudang pusat untuk restock "' + prod.name + '" tidak mencukupi (' + avail + ' ' + (prod.unit || 'pcs') + ' tersedia, input restock ' + restockQty + ').', true);
        return;
      }
    }
  }

  const submitBtn = document.getElementById('btn-submit-audit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Menyimpan Berita Acara Opname...';
  }

  const payload = {
    outlet_id: outletId,
    store_name: window._currentAuditData.store_name,
    audit_date: auditDate,
    auditor_name: auditorName,
    outlet_pic: picName,
    outlet_phone: picPhone,
    notes: notes,
    display_photo_base64: window._currentAuditData.photoBase64,
    sig_internal_base64: window._sigPads['internal'].toDataURL(),
    sig_outlet_base64: window._sigPads['outlet'].toDataURL(),
    items: window._currentAuditData.items.map(function (it) {
      return {
        product_id: it.product_id,
        batch_id: it.batch_id || '',
        qty_system: it.qty_system,
        qty_actual: it.qty_actual,
        qty_sold: it.qty_sold,
        qty_returned: it.qty_returned,
        qty_missing: Number(it.qty_missing || 0),
        missing_chargeable: (it.missing_chargeable === true || String(it.missing_chargeable) === 'true'),
        qty_restock: it.qty_restock,
        notes: it.notes || ''
      };
    })
  };

  showToast('Menyimpan Berita Acara Stok Opname...');

  api('submitConsignmentAudit', TOKEN, payload).then(function (res) {
    if (DATA_CACHE.outlets) DATA_CACHE.outlets.timestamp = 0;
    invalidateCache('products');

    closeModal();
    openAuditSuccessModal(res, payload, outletId);
  }).catch(function (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '⚡ Simpan &amp; Terbitkan Berita Acara Resmi';
    }
    showToast('Gagal memproses audit: ' + (err.message || err), true);
  });
}

function openAuditSuccessModal(res, payload, outletId) {
  const storeName = payload.store_name || res.outlet_name || (window._currentAuditData ? window._currentAuditData.store_name : 'Toko Mitra');
  const picName = payload.outlet_pic || res.outlet_pic || '';
  const picPhone = (payload.outlet_phone || res.outlet_phone || '').trim();

  const missingWaLine = Number(res.total_missing || 0) > 0 ?
    ('• Barang Hilang/Selisih: ' + res.total_missing + ' pcs (Ditagihkan ke Mitra: ' + (res.total_chargeable_missing || 0) + ' pcs, Beban Toko: ' + (res.total_writeoff_missing || 0) + ' pcs)\n') : '';

  const waText = encodeURIComponent(
    'Halo Bapak/Ibu ' + picName + ' (' + storeName + '),\n\n' +
    'Terima kasih atas kerja samanya. Berikut terlampir dokumen digital *Berita Acara Stok Opname Konsinyasi*:\n' +
    '• No. Dokumen: #' + res.audit_id + '\n' +
    '• Tanggal Opname: ' + formatDate(res.audit_date) + '\n' +
    '• Petugas Pemeriksa: ' + payload.auditor_name + '\n' +
    '• Terjual: ' + (res.total_sold || 0) + ' pcs\n' +
    '• Retur Rusak/Exp: ' + (res.total_returned || 0) + ' pcs\n' +
    missingWaLine +
    '• Restock Baru di Rak: ' + (res.total_restock || 0) + ' pcs\n' +
    (payload.notes ? ('• Catatan: ' + payload.notes + '\n') : '') +
    (res.pdf_url ? ('\nDokumen resmi PDF dapat diakses/diunduh melalui Google Drive:\n' + res.pdf_url + '\n\n') : '\n') +
    'Salam hangat,\n*Manajemen POS & Inventaris*'
  );

  let waActionHtml = '';
  if (picPhone) {
    let clean = String(picPhone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    waActionHtml = '<a href="https://wa.me/' + clean + '?text=' + waText + '" target="_blank" class="btn btn-secondary btn-block" style="text-decoration:none;margin-top:8px;">💬 Kirim Berita Acara via WhatsApp (' + escapeHtml(picPhone) + ')</a>';
  } else {
    waActionHtml = '<button type="button" class="btn btn-secondary btn-block" style="margin-top:8px;" onclick="openConsignmentAuditWAModal(\'' + escapeHtml(picName) + '\',\'' + waText + '\')">💬 Kirim Berita Acara via WhatsApp</button>';
  }

  const billableCount = Number(res.total_sold || 0) + Number(res.total_chargeable_missing || 0);
  const invoiceBtnHtml = (billableCount > 0) ?
    '<button type="button" class="btn btn-primary btn-block" style="margin-top:8px;" onclick="openConsignmentInvoiceModal(\'' + res.audit_id + '\',\'' + escapeHtml(storeName) + '\',\'' + escapeHtml(picPhone) + '\',\'' + (outletId || '') + '\')">' +
    '🧾 Terbitkan Faktur Tagihan Penjualan (' + billableCount + ' pcs' + (Number(res.total_chargeable_missing || 0) > 0 ? (': ' + res.total_sold + ' terjual + ' + res.total_chargeable_missing + ' hilang') : ' terjual') + ')' +
    '</button>' : '';

  const missingSummaryHtml = Number(res.total_missing || 0) > 0 ?
    (' &bull; Hilang: <strong style="color:var(--danger);">' + res.total_missing + ' pcs</strong> (' + (res.total_chargeable_missing || 0) + ' tagih mitra, ' + (res.total_writeoff_missing || 0) + ' beban Toko)') : '';

  const bodyHtml =
    '<div style="text-align:center;padding:16px 0;">' +
    '<div style="font-size:48px;margin-bottom:10px;">📋</div>' +
    '<h2 style="margin-bottom:6px;color:var(--primary);">Berita Acara Resmi Diterbitkan!</h2>' +
    '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">' +
    'Stok opname untuk <strong>' + escapeHtml(storeName) + '</strong> berhasil diverifikasi dengan dual signature dan tersimpan di sistem.' +
    '</p>' +
    '<div style="background:var(--surface-muted);padding:14px;border-radius:var(--radius-sm);text-align:left;font-size:12px;margin-bottom:16px;">' +
    '<div>No. Berita Acara: <strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">#' + res.audit_id + '</strong></div>' +
    '<div style="margin-top:4px;">PIC Toko Mitra: <strong>' + escapeHtml(picName) + '</strong></div>' +
    '<div style="margin-top:4px;">Tanggal Opname: ' + formatDate(res.audit_date) + '</div>' +
    '<div style="margin-top:4px;">Terjual: <strong style="color:var(--success);">' + (res.total_sold || 0) + ' pcs</strong> &bull; Retur: <strong>' + (res.total_returned || 0) + ' pcs</strong>' + missingSummaryHtml + ' &bull; Restock: <strong>' + (res.total_restock || 0) + ' pcs</strong></div>' +
    '</div>' +
    (res.pdf_url ?
      '<a href="' + escapeHtml(res.pdf_url) + '" target="_blank" class="btn btn-primary btn-block btn-lg" style="text-decoration:none;display:flex;align-items:center;justify-content:center;gap:6px;">' +
      '<span>📄 Buka / Unduh Berita Acara (PDF)</span>' +
      '</a>' :
      '<button type="button" class="btn btn-primary btn-block btn-lg" onclick="printConsignmentAuditReport(\'' + escapeHtml(res.audit_id) + '\')" style="display:flex;align-items:center;justify-content:center;gap:6px;">' +
      '<span>🖨️ Cetak / Simpan PDF Berita Acara Opname</span>' +
      '</button>') +
    invoiceBtnHtml +
    waActionHtml +
    '</div>';

  openModal('Berita Acara Opname Sukses', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal();' + (outletId ? ('showOutletDetailModal(\'' + outletId + '\', \'audits\');') : 'renderKonsinyasi(true);') + '">Selesai &amp; Tutup</button>');
}

function printConsignmentAuditReport(auditId) {
  showToast('Menyiapkan dokumen Berita Acara Stok Opname...');
  api('getConsignmentAuditReceiptData', TOKEN, auditId).then(function (res) {
    if (!res || !res.audit) {
      showToast('Data Berita Acara Opname tidak ditemukan.', true);
      return;
    }
    const a = res.audit;
    const o = res.outlet || {};
    const items = res.items || [];
    const settings = APP_SETTINGS || window.APP_SETTINGS || {};
    const storeTitle = settings.store_name || 'Toko Kasir & Inventaris';
    const storeLogo = settings.store_logo || settings.store_logo_light || '';
    const storeAddress = settings.store_address || '';
    const storePhone = settings.store_phone || '';

    const rowsHtml = items.map(function (it, idx) {
      const sys = Number(it.qty_system || 0);
      const act = Number(it.qty_actual || 0);
      const ret = Number(it.qty_returned || 0);
      const miss = Number(it.qty_missing || 0);
      const sold = Number(it.qty_sold || 0);
      const restock = Number(it.qty_restock || 0);
      const bal = act + restock;
      const isChargeable = (it.missing_chargeable === true || String(it.missing_chargeable) === 'true');
      const missDesc = miss > 0 ? (miss + ' (' + (isChargeable ? 'Tagih Mitra' : 'Beban Toko') + ')') : '0';
      return '<tr>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">' + (idx + 1) + '</td>' +
        '<td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">' + escapeHtml(it.product_name || it.product_id) + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">' + sys + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">' + act + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">' + ret + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;">' + missDesc + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;font-weight:bold;color:#15803d;">' + sold + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;color:#2563eb;">+' + restock + '</td>' +
        '<td style="text-align:center;padding:6px;border:1px solid #cbd5e1;font-weight:bold;">' + bal + '</td>' +
        '</tr>';
    }).join('');

    const logoHtml = storeLogo
      ? '<img src="' + escapeHtml(storeLogo) + '" style="max-height:50px;max-width:160px;object-fit:contain;display:block;margin-bottom:4px;" alt="Logo" />'
      : '<div style="font-size:14pt;font-weight:800;color:#2563EB;">' + escapeHtml(storeTitle).toUpperCase() + '</div>';

    const sigAuditor = a.sig_idep_url || '';
    const sigOutlet = a.sig_outlet_url || '';

    const printHtml =
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Berita Acara Opname #' + escapeHtml(a.id) + '</title>' +
      '<style>@page{size:A4 portrait;margin:14mm;}body{font-family:Arial,sans-serif;color:#1e293b;font-size:11px;line-height:1.4;margin:0;}table{width:100%;border-collapse:collapse;}</style>' +
      '</head><body>' +
      '<div style="border-bottom:2px solid #2563EB;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div>' + logoHtml + '<div style="font-size:9.5px;color:#475569;">' + escapeHtml(storeAddress) + (storePhone ? (' | WA: ' + escapeHtml(storePhone)) : '') + '</div></div>' +
      '<div style="text-align:right;"><div style="font-size:14pt;font-weight:800;color:#2563EB;">BERITA ACARA STOK OPNAME</div><div style="font-size:9px;color:#64748b;">No. Dokumen: #' + escapeHtml(String(a.id || '').slice(0, 8).toUpperCase()) + ' | Tanggal: ' + escapeHtml(formatDate(a.audit_date)) + '</div></div>' +
      '</div>' +
      '<table style="margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;"><tr>' +
      '<td style="padding:8px 12px;width:50%;border-right:1px solid #e2e8f0;"><strong>Outlet Mitra:</strong> ' + escapeHtml(o.name || a.store_name || '-') + '<br/><strong>PIC Toko:</strong> ' + escapeHtml(a.outlet_pic || o.pic_name || '-') + ' (' + escapeHtml(a.outlet_phone || o.phone || '-') + ')</td>' +
      '<td style="padding:8px 12px;width:50%;"><strong>Petugas Pemeriksa:</strong> ' + escapeHtml(a.auditor_name || '-') + '<br/><strong>Status Faktur:</strong> ' + escapeHtml(a.invoice_id ? ('#' + a.invoice_id) : 'Belum Diterbitkan') + '</td>' +
      '</tr></table>' +
      '<table style="margin-bottom:14px;"><thead><tr style="background:#2563EB;color:#fff;font-size:10px;">' +
      '<th style="padding:6px;border:1px solid #1e40af;">No</th><th style="padding:6px;border:1px solid #1e40af;text-align:left;">Produk</th><th style="padding:6px;border:1px solid #1e40af;">Saldo Lalu</th><th style="padding:6px;border:1px solid #1e40af;">Fisik Rak</th><th style="padding:6px;border:1px solid #1e40af;">Retur</th><th style="padding:6px;border:1px solid #1e40af;">Selisih/Hilang</th><th style="padding:6px;border:1px solid #1e40af;">Terjual</th><th style="padding:6px;border:1px solid #1e40af;">Restock</th><th style="padding:6px;border:1px solid #1e40af;">Saldo Baru</th>' +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
      (a.notes ? ('<div style="margin-bottom:14px;padding:8px 10px;background:#f8fafc;border:1px solid #cbd5e1;"><strong>Catatan Observasi:</strong> ' + escapeHtml(a.notes) + '</div>') : '') +
      '<table style="margin-top:20px;border:1px solid #cbd5e1;"><tr>' +
      '<td style="width:50%;text-align:center;padding:12px;border-right:1px solid #cbd5e1;"><strong>Petugas Pemeriksa</strong><div style="height:60px;display:flex;align-items:center;justify-content:center;">' + (sigAuditor ? ('<img src="' + sigAuditor + '" style="max-height:55px;max-width:160px;" />') : '') + '</div><div style="border-top:1px solid #94a3b8;padding-top:4px;">' + escapeHtml(a.auditor_name || 'Auditor') + '</div></td>' +
      '<td style="width:50%;text-align:center;padding:12px;"><strong>PIC Toko Mitra</strong><div style="height:60px;display:flex;align-items:center;justify-content:center;">' + (sigOutlet ? ('<img src="' + sigOutlet + '" style="max-height:55px;max-width:160px;" />') : '') + '</div><div style="border-top:1px solid #94a3b8;padding-top:4px;">' + escapeHtml(a.outlet_pic || o.pic_name || 'PIC Mitra') + '</div></td>' +
      '</tr></table>' +
      '<script>window.onload=function(){window.print();};<\/script></body></html>';

    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(printHtml);
      w.document.close();
    } else {
      showToast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak Berita Acara.', true);
    }
  }).catch(function (err) {
    showToast('Gagal memuat Berita Acara: ' + (err.message || err), true);
  });
}
window.printConsignmentAuditReport = printConsignmentAuditReport;

function openConsignmentAuditWAModal(picName, encodedText) {
  showPromptDialog(
    'Kirim Berita Acara via WhatsApp',
    'Masukkan nomor WhatsApp PIC Toko Mitra (' + picName + '):',
    '',
    function (phone) {
      if (!phone) { showToast('Nomor WhatsApp wajib diisi.', true); return; }
      let clean = String(phone).replace(/[^0-9]/g, '');
      if (clean.startsWith('0')) clean = '62' + clean.slice(1);
      const url = 'https://wa.me/' + clean + '?text=' + encodedText;
      window.open(url, '_blank');
    }
  );
}

function openConsignmentInvoiceModal(auditId, storeName, defaultPhone, outletId) {
  const dueDateDefault = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const bodyHtml =
    '<div class="invoice-summary-box">' +
    '<div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:6px;">Tagihan Hasil Penjualan: ' + escapeHtml(storeName || 'Toko Mitra') + '</div>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:10px;">Ref. Berita Acara Stok Opname: #' + escapeHtml(auditId) + '</div>' +
    '<div style="font-size:12px;margin-bottom:8px;">Mengonversi unit terjual dari berita acara menjadi faktur penjualan resmi dengan harga tier khusus outlet ini.</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Skema Pembayaran Toko Mitra</label>' +
    '<select id="inv-payment-type" class="field-input" onchange="toggleConsignmentInvoiceDueDate(this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<option value="full">Lunas Langsung (Kas / Transfer Bank)</option>' +
    '<option value="installment">Tempo / Piutang Usaha (Invoice Jatuh Tempo)</option>' +
    '</select>' +
    '</div>' +
    '<div id="inv-due-date-wrap" class="field-group" style="display:none;">' +
    '<label class="field-label">Tanggal Jatuh Tempo Pembayaran <span style="color:var(--danger)">*</span></label>' +
    '<div class="input-wrapper"><input type="date" id="inv-due-date" value="' + dueDateDefault + '" style="padding-left:12px;"></div>' +
    '<div style="font-size:10.5px;color:var(--text-muted);margin-top:2px;">Pilih batas akhir pembayaran invoice oleh mitra.</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-consign-inv" onclick="submitConsignmentInvoice(\'' + auditId + '\', \'' + outletId + '\')">🧾 Buat Faktur Resmi</button>';

  openModal('Terbitkan Faktur Konsinyasi', bodyHtml, footerHtml);
}

function toggleConsignmentInvoiceDueDate(paymentType) {
  const wrap = document.getElementById('inv-due-date-wrap');
  if (wrap) wrap.style.display = paymentType === 'installment' ? 'block' : 'none';
}

function submitConsignmentInvoice(auditId, outletId) {
  const paymentType = document.getElementById('inv-payment-type').value;
  const dueDate = document.getElementById('inv-due-date') ? document.getElementById('inv-due-date').value : null;

  const btn = document.getElementById('btn-submit-consign-inv');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Memproses Faktur...'; }

  api('createConsignmentInvoice', TOKEN, {
    audit_id: auditId,
    outlet_id: outletId,
    payment_type: paymentType,
    due_date: dueDate
  }).then(function (res) {
    closeModal();
    showToast(res.message || 'Faktur konsinyasi berhasil diterbitkan.');
    renderKonsinyasi(true);
    if (outletId) {
      setTimeout(function () {
        showOutletDetailModal(outletId, 'audits');
      }, 350);
    }
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🧾 Buat Faktur Resmi'; }
    showToast('Gagal menerbitkan faktur: ' + (err.message || err), true);
  });
}



// Backward compatibility alias
function openConsignmentModal() { openOutletModal(); }
function showConsignmentDetail(id) { showOutletDetailModal(id); }
function openConsignmentSuratJalan(id) { openTransferSuratJalan(id); }


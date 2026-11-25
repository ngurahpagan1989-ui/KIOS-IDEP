// ========================= CRM PELANGGAN 360° =========================
function renderCRM(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cached = getCachedData('customers');
  if (!forceRefresh && cached) {
    CUSTOMERS_CACHE = cached;
    drawCRMUI(cached);
    if (isCacheValid('customers')) return;
  } else if (!cached) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat data pelanggan...</div></div>';
  }

  api('getCustomers', TOKEN).then(function (customers) {
    CUSTOMERS_CACHE = Array.isArray(customers) ? customers : [];
    setCachedData('customers', CUSTOMERS_CACHE);
    drawCRMUI(CUSTOMERS_CACHE);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat pelanggan: ' + (err.message || err), true);
    }
  });
}

function drawCRMUI(customers) {
  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Pelanggan (CRM)</h1>' +
    '<p class="page-subtitle">Kelola kontak member, kategori diskon, dan histori belanja 360 derajat.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openCustomerFormModal()">+ Tambah Pelanggan</button>' +
    '</div>' +
    '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
    '<input type="text" id="crm-search" placeholder="🔍 Cari nama pelanggan, no. WhatsApp, atau kategori..." oninput="renderFilteredCustomers()" style="padding:8px 12px;font-size:12.5px;border:1px solid rgba(255,255,255,0.15);border-radius:var(--radius-sm);width:100%;max-width:340px;background:rgba(15,23,42,0.95);color:#F8FAFC;">' +
    '</div>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr><th>Nama Pelanggan</th><th>Kontak WhatsApp</th><th>Email</th><th>Kategori</th><th style="text-align:right;">Aksi</th></tr>' +
    '</thead>' +
    '<tbody id="crm-tbody"></tbody>' +
    '</table>' +
    '</div>' +
    '<div id="crm-detail" style="margin-top:20px;"></div>';

  renderCustomerTable(customers);
}

function renderFilteredCustomers() {
  const inp = document.getElementById('crm-search');
  const q = (inp ? inp.value : '').toLowerCase().trim();
  const filtered = (CUSTOMERS_CACHE || []).filter(function (c) {
    return !q ||
      String(c.name || '').toLowerCase().includes(q) ||
      String(c.phone || '').toLowerCase().includes(q) ||
      String(c.email || '').toLowerCase().includes(q) ||
      String(c.category || '').toLowerCase().includes(q);
  });
  renderCustomerTable(filtered);
}
window.renderFilteredCustomers = renderFilteredCustomers;

function renderCustomerTable(customers) {
  const tbody = document.getElementById('crm-tbody');
  if (!tbody) return;

  if (!customers || customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div style="text-align:center;padding:24px;">Belum ada pelanggan terdaftar.</div></td></tr>';
    return;
  }

  tbody.innerHTML = customers.map(function (c) {
    const cls = { 'VIP': 'badge-danger', 'Member': 'badge-warning', 'Mitra': 'badge-success' }[c.category] || 'badge-neutral';
    return '<tr>' +
      '<td><strong>' + escapeHtml(c.name) + '</strong></td>' +
      '<td>' + escapeHtml(c.phone || '-') + '</td>' +
      '<td>' + escapeHtml(c.email || '-') + '</td>' +
      '<td><span class="badge ' + cls + '">' + escapeHtml(c.category || 'Reguler') + '</span></td>' +
      '<td style="text-align:right;">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="showCustomerDetail(\'' + c.id + '\')">360° Detail</button> ' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openCustomerFormModal(\'' + c.id + '\')">Edit</button> ' +
      '<button type="button" class="btn btn-danger btn-sm" onclick="deleteCustomerUI(\'' + c.id + '\', \'' + escapeHtml(c.name) + '\')">Hapus</button>' +
      '</td>' +
      '</tr>';
  }).join('');
}


function openCustomerFormModal(customerId) {
  const c = customerId ? CUSTOMERS_CACHE.filter(function (x) { return x.id === customerId; })[0] : null;
  const bodyHtml =
    '<div class="field-group"><label class="field-label">Nama Lengkap <span style="color:red;">*</span></label><div class="input-wrapper"><input type="text" id="cm-name" value="' + (c ? escapeHtml(c.name) : '') + '" style="padding-left:14px;" placeholder="Nama pelanggan..."></div></div>' +
    '<div class="field-group"><label class="field-label">Nomor WhatsApp / HP</label><div class="input-wrapper"><input type="text" id="cm-phone" value="' + (c ? escapeHtml(c.phone || '') : '') + '" style="padding-left:14px;" placeholder="08xxxxxxxxxx"></div></div>' +
    '<div class="field-group"><label class="field-label">Email</label><div class="input-wrapper"><input type="email" id="cm-email" value="' + (c ? escapeHtml(c.email || '') : '') + '" style="padding-left:14px;" placeholder="nama@email.com"></div></div>' +
    '<div class="field-group"><label class="field-label">Kategori Pelanggan</label><div class="input-wrapper"><select id="cm-category" style="padding-left:14px;">' +
    '<option value="Reguler"' + (!c || c.category === 'Reguler' ? ' selected' : '') + '>Reguler</option>' +
    '<option value="Member"' + (c && c.category === 'Member' ? ' selected' : '') + '>Member</option>' +
    '<option value="Mitra"' + (c && c.category === 'Mitra' ? ' selected' : '') + '>Mitra</option>' +
    '<option value="VIP"' + (c && c.category === 'VIP' ? ' selected' : '') + '>VIP</option>' +
    '</select></div></div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" onclick="submitCustomerForm(\'' + (customerId || '') + '\')">Simpan Pelanggan</button>';

  openModal(c ? 'Edit Data Pelanggan' : 'Pelanggan Baru', bodyHtml, footerHtml);
}

function openCustomerModal(id) {
  openCustomerFormModal(id);
}

function submitCustomerForm(customerId) {
  const nameInput = document.getElementById('cm-name');
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) { showToast('Nama pelanggan wajib diisi.', true); if (nameInput) nameInput.focus(); return; }

  const payload = {
    id: customerId || null,
    name: name,
    phone: document.getElementById('cm-phone') ? document.getElementById('cm-phone').value.trim() : '',
    email: document.getElementById('cm-email') ? document.getElementById('cm-email').value.trim() : '',
    category: document.getElementById('cm-category') ? document.getElementById('cm-category').value : 'Reguler'
  };

  api('saveCustomer', TOKEN, payload).then(function () {
    invalidateCache('customers');
    showToast('Data pelanggan tersimpan.');
    closeModal();
    renderCRM(true);
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

function submitCustomer(id) {
  submitCustomerForm(id);
}

function deleteCustomerUI(id, name) {
  showConfirmDialog('Hapus Pelanggan', 'Hapus pelanggan "' + name + '" dari basis data?', function () {
    api('deleteCustomer', TOKEN, id).then(function () {
      invalidateCache('customers');
      showToast('Pelanggan dihapus.');
      renderCRM(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

function showCustomerDetail(customerId) {
  const detailEl = document.getElementById('crm-detail');
  if (!detailEl) return;
  detailEl.innerHTML = '<div class="card"><div class="empty-state">Menyusun riwayat transaksi 360°...</div></div>';
  if (window.innerWidth <= 768) {
    setTimeout(function () { detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
  }

  api('getCustomerDetail', TOKEN, customerId).then(function (data) {
    const c = data.customer || {};
    const txs = Array.isArray(data.transactions) ? data.transactions : [];
    const recs = Array.isArray(data.receivables) ? data.receivables : [];

    detailEl.innerHTML =
      '<div class="card">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px;">' +
      '<div>' +
      '<h2>' + escapeHtml(c.name) + '</h2>' +
      '<div style="color:var(--text-secondary);font-size:13px;margin-top:2px;">' + escapeHtml(c.phone || '-') + ' &bull; ' + escapeHtml(c.email || '-') + '</div>' +
      '</div>' +
      '<div style="text-align:left;">' +
      '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;">Total Pengeluaran Belanja</div>' +
      '<div style="font-size:24px;font-weight:800;color:var(--primary);">' + formatRupiah(data.totalSpending) + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="crm-detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
      '<div>' +
      '<h3 style="font-size:14px;margin-bottom:10px;">Riwayat Nota Belanja</h3>' +
      '<div style="max-height:220px;overflow-y:auto;">' +
      (txs.length ? txs.map(function (t) {
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;" onclick="openTransactionDetailModal(\'' + t.id + '\')">' +
          '<span>#' + escapeHtml(t.id) + ' (' + formatDate(t.created_at) + ')</span>' +
          '<div style="display:flex;align-items:center;gap:6px;"><strong>' + formatRupiah(t.total) + '</strong><span class="badge badge-neutral" style="font-size:9px;">🔍 Rincian</span></div>' +
          '</div>';
      }).join('') : '<div style="color:var(--text-secondary);font-size:12px;">Belum pernah bertransaksi.</div>') +
      '</div>' +
      '</div>' +
      '<div>' +
      '<h3 style="font-size:14px;margin-bottom:10px;">Status Tagihan Piutang Aktif</h3>' +
      (recs.length ? recs.map(function (r) {
        return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">' +
          '<span>Nota #' + escapeHtml(r.transaction_id) + '</span><strong style="color:var(--danger);">' + formatRupiah(r.remaining) + '</strong>' +
          '</div>';
      }).join('') : '<div style="color:var(--text-secondary);font-size:12px;">Tidak memiliki piutang aktif.</div>') +
      '</div>' +
      '</div>' +
      '</div>';
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}


// ========================= PIUTANG & PEMBAYARAN TEMPO =========================
function renderPiutang(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cached = getCachedData('receivables');
  if (!forceRefresh && cached) {
    drawPiutangUI(cached);
    if (isCacheValid('receivables')) return;
  } else if (!cached) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat data piutang...</div></div>';
  }

  api('getReceivables', TOKEN).then(function (receivables) {
    const list = Array.isArray(receivables) ? receivables : [];
    setCachedData('receivables', list);
    drawPiutangUI(list);
  }).catch(function (err) {
    if (!cached) {
      showToast('Gagal memuat piutang: ' + (err.message || err), true);
    }
  });
}

function drawPiutangUI(list) {
  const content = document.getElementById('content');
  if (!content) return;

  const active = list.filter(function (r) { return r.status === 'active'; });
  const lunas = list.filter(function (r) { return r.status === 'lunas'; });
  const totalRemaining = active.reduce(function (s, r) { return s + Number(r.remaining || 0); }, 0);

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h1 class="page-title">Piutang &amp; Cicilan Pelanggan</h1>' +
    '<p class="page-subtitle">Monitoring tagihan belum lunas dan pencatatan pembayaran tempo.</p>' +
    '</div>' +
    '<div class="page-actions">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'piutang\')" title="Buka Panduan Piutang &amp; Pembayaran Tempo">📖 Panduan Piutang</button>' +
    '</div>' +
    '</div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card">' +
    '<div class="stat-header">' +
    '<span class="stat-label">Total Tagihan Aktif</span>' +
    '<span class="stat-icon">&#128179;</span>' +
    '</div>' +
    '<div class="stat-value">' + formatRupiah(totalRemaining) + '</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header">' +
    '<span class="stat-label">Jumlah Nota Tempo</span>' +
    '<span class="stat-icon">&#128203;</span>' +
    '</div>' +
    '<div class="stat-value">' + active.length + ' Nota</div>' +
    '</div>' +
    '</div>' +
    '<div class="card" style="margin-bottom:16px;">' +
    '<h3 style="margin-bottom:14px;">Daftar Piutang Aktif</h3>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Pelanggan</th>' +
    '<th>Total Nota</th>' +
    '<th>Sudah Bayar</th>' +
    '<th>Sisa Tagihan</th>' +
    '<th>Jatuh Tempo</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (active.length ? active.map(function (r) {
      const today = new Date();
      const isLate = r.due_date && new Date(r.due_date) < today;
      const badge = isLate ? '<span class="badge badge-danger">Terlambat</span>' : formatDate(r.due_date);
      return '<tr>' +
        '<td><strong>' + escapeHtml(r.customer_name) + '</strong></td>' +
        '<td>' + formatRupiah(r.total) + '</td>' +
        '<td>' + formatRupiah(r.paid) + '</td>' +
        '<td><strong style="color:var(--danger);">' + formatRupiah(r.remaining) + '</strong></td>' +
        '<td>' + badge + '</td>' +
        '<td style="text-align:right;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="openPaymentReceivableModal(\'' + r.id + '\',\'' + escapeHtml(r.customer_name) + '\',' + r.remaining + ')">Catat Bayar</button>' +
        '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div style="text-align:center;padding:20px;">Tidak ada tagihan piutang aktif.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>';

  if (lunas.length > 0) {
    content.innerHTML +=
      '<div class="card">' +
      '<h3 style="margin-bottom:14px;">Riwayat Tagihan Lunas</h3>' +
      '<div class="table-container">' +
      '<table>' +
      '<thead><tr><th>Pelanggan</th><th>Total Tagihan</th><th>Status</th></tr></thead>' +
      '<tbody>' +
      lunas.map(function (r) {
        return '<tr><td>' + escapeHtml(r.customer_name) + '</td><td>' + formatRupiah(r.total) + '</td><td><span class="badge badge-success">Lunas</span></td></tr>';
      }).join('') +
      '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>';
  }
}


function openPaymentReceivableModal(recId, remaining, customerName) {
  // Defensive swap if arguments are passed as (recId, customerName, remaining)
  if (typeof remaining === 'string' && typeof customerName === 'number') {
    const tmp = remaining;
    remaining = customerName;
    customerName = tmp;
  }
  customerName = customerName || 'Pelanggan';
  const bodyHtml =
    '<div style="text-align:center;padding:10px 0 16px;">' +
    '<div style="font-size:12px;color:var(--text-secondary);">SISA TAGIHAN</div>' +
    '<div style="font-size:28px;font-weight:800;color:var(--danger);">' + formatRupiah(remaining) + '</div>' +
    '<div style="font-size:13px;margin-top:4px;">Pelanggan: <strong>' + escapeHtml(customerName) + '</strong></div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Nominal Pembayaran (Rp) <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper"><input type="number" id="pay-amount" value="' + remaining + '" min="1" max="' + remaining + '" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Metode Pembayaran</label>' +
    '<div class="input-wrapper">' +
    '<select id="pay-method" style="padding-left:14px;">' +
    '<option value="CASH">Tunai (Kas Kasir)</option>' +
    '<option value="TRANSFER">Transfer Bank</option>' +
    '<option value="QRIS">QRIS</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Catatan / Keterangan</label>' +
    '<div class="input-wrapper"><input type="text" id="pay-notes" placeholder="Contoh: Angsuran nota tempo..." style="padding-left:14px;"></div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-submit-rec-pay" onclick="submitReceivablePayment(\'' + recId + '\')">Simpan Pembayaran</button>';

  openModal('Catat Angsuran / Pelunasan Piutang', bodyHtml, footerHtml);
}

function openPaymentModal(receivableId, name, remaining) {
  openPaymentReceivableModal(receivableId, remaining, name);
}

function submitReceivablePayment(recId) {
  const amountInput = document.getElementById('pay-amount');
  const amount = Number(amountInput ? amountInput.value : 0);
  if (amount <= 0) {
    showToast('Jumlah pelunasan harus lebih dari 0.', true);
    if (amountInput) amountInput.focus();
    return;
  }

  const methodEl = document.getElementById('pay-method');
  const paymentMethod = methodEl ? methodEl.value : 'CASH';
  const notesEl = document.getElementById('pay-notes');
  const notes = notesEl ? notesEl.value.trim() : '';

  const btn = document.getElementById('btn-submit-rec-pay');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Menyimpan...';
  }

  api('recordReceivablePayment', TOKEN, {
    receivable_id: recId,
    amount: amount,
    payment_method: paymentMethod,
    notes: notes
  }).then(function (res) {
    invalidateCache('receivables');
    invalidateCache('dashboard');
    showToast((res && res.message) || 'Pembayaran piutang berhasil dicatat.');
    closeModal();
    renderPiutang(true);
    if (typeof updateGlobalReceivableBadge === 'function') {
      updateGlobalReceivableBadge();
    }
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Simpan Pembayaran';
    }
    showToast('Gagal mencatat pembayaran: ' + (err.message || err), true);
  });
}

function submitPayment(receivableId) {
  submitReceivablePayment(receivableId);
}


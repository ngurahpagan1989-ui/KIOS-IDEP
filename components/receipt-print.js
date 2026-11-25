// ========================= CETAK & STRUK NOTA =========================
function generateMiniReceiptHTML(data) {
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Toko POS Kasir';
  const storeAddress = (APP_SETTINGS && APP_SETTINGS['store_address']) ? APP_SETTINGS['store_address'] : '';
  const storePhone = (APP_SETTINGS && APP_SETTINGS['store_phone']) ? APP_SETTINGS['store_phone'] : '';
  const storeSocial = (APP_SETTINGS && APP_SETTINGS['store_social']) ? APP_SETTINGS['store_social'] : '';
  const storeTagline = (APP_SETTINGS && (APP_SETTINGS['store_tagline'] || APP_SETTINGS['store_slogan'])) ? (APP_SETTINGS['store_tagline'] || APP_SETTINGS['store_slogan']) : 'Toko Benih Lokal & Edukasi Lingkungan';
  const storeLogo = (APP_SETTINGS && APP_SETTINGS['store_logo']) ? APP_SETTINGS['store_logo'] : '';
  const footerText = (APP_SETTINGS && APP_SETTINGS['invoice_footer']) ? APP_SETTINGS['invoice_footer'] : 'Terima kasih atas kunjungan Anda!';

  const items = data.items || [];
  let itemRows = '';

  items.forEach(function (i) {
    const expTag = i.selected_expiry ? ('<br><span style="font-size:9px;color:#555;">Exp: ' + escapeHtml(i.selected_expiry) + '</span>') : '';
    const batchTag = i.batch_id ? ('<br><span style="font-size:9px;color:#444;font-family:monospace;">[Batch: ' + escapeHtml(i.batch_id) + ']</span>') : '';
    const lineTotal = Number(i.price) * Number(i.qty);
    itemRows +=
      '<tr>' +
      '<td colspan="2" style="padding-top:4px;font-weight:600;font-size:11px;">' + escapeHtml(i.name) + batchTag + expTag + '</td>' +
      '</tr>' +
      '<tr style="border-bottom:1px dashed #ccc;">' +
      '<td style="padding-bottom:5px;font-size:11px;color:#444;">' + i.qty + ' x ' + formatRupiah(i.price) + '</td>' +
      '<td style="padding-bottom:5px;text-align:right;font-size:11px;font-weight:700;">' + formatRupiah(lineTotal) + '</td>' +
      '</tr>';
  });

  const feeSummary = resolveTxExtraFeeSummary(data);

  // Logo di tengah proporsional, hilangkan teks nama toko jika gambar logo sudah disetel
  let headerLogoHtml = '';
  if (storeLogo) {
    headerLogoHtml = '<div style="text-align:center;margin-bottom:6px;">' +
      '<img src="' + escapeHtml(storeLogo) + '" style="max-width:140px;max-height:55px;object-fit:contain;margin:0 auto;display:block;" alt="Logo Toko">' +
      '</div>';
  } else {
    // Fallback nama toko teks hanya jika logo belum disetel
    headerLogoHtml = '<div style="font-size:15px;font-weight:800;letter-spacing:0.5px;text-align:center;margin-bottom:4px;">' + escapeHtml(storeName.toUpperCase()) + '</div>';
  }

  // Sub-informasi ringkas langsung di bawah logo
  let subInfoHtml = '';
  if (storeTagline) {
    subInfoHtml += '<div style="font-size:11px;font-weight:600;color:#222;line-height:1.3;margin-bottom:2px;">' + escapeHtml(storeTagline) + '</div>';
  }
  const contactParts = [];
  if (storePhone) contactParts.push('WA: ' + escapeHtml(storePhone));
  if (storeSocial) contactParts.push(escapeHtml(storeSocial));
  if (contactParts.length > 0) {
    subInfoHtml += '<div style="font-size:10px;color:#444;line-height:1.3;">' + contactParts.join(' &bull; ') + '</div>';
  }
  if (storeAddress) {
    subInfoHtml += '<div style="font-size:9.5px;color:#666;line-height:1.25;margin-top:2px;">' + escapeHtml(storeAddress) + '</div>';
  }

  const voidWatermark = (data.is_void || data.status === 'VOID')
    ? '<div style="border:2px dashed #DC2626;background:#FEF2F2;color:#DC2626;text-align:center;font-weight:900;font-size:12px;padding:6px;margin:6px 0;letter-spacing:1px;">*** TRANSAKSI DIBATALKAN (VOID) ***</div>'
    : '';

  return '<div class="thermal-receipt" style="width:280px;margin:0 auto;padding:12px 8px;font-family:\'Courier New\',Courier,monospace;color:#111;background:#fff;line-height:1.35;box-sizing:border-box;">' +
    '<div style="text-align:center;margin-bottom:8px;">' +
    headerLogoHtml +
    subInfoHtml +
    '</div>' +
    voidWatermark +
    '<div style="border-top:1px dashed #222;border-bottom:1px dashed #222;padding:6px 0;margin:8px 0;font-size:10px;">' +
    '<div style="display:flex;justify-content:space-between;"><span>No. Nota:</span><span style="font-weight:bold;">#' + escapeHtml(data.invoice_no || data.id || '-') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Tanggal:</span><span>' + (data.date || formatDate(new Date())) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Pelanggan:</span><span>' + escapeHtml(data.name || 'Umum') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Metode:</span><span>' + escapeHtml(data.method || 'Tunai') + '</span></div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
    itemRows +
    '</table>' +
    '<div style="border-top:1px dashed #222;padding-top:6px;font-size:11px;">' +
    (feeSummary.hasBreakdown ? '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Subtotal:</span><span>' + formatRupiah(feeSummary.subtotal) + '</span></div>' +
      buildTxExtraFeeHTML(feeSummary, 'thermal') : '') +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:4px;"><span>TOTAL:</span><span>' + formatRupiah(data.total) + '</span></div>' +
    buildTxCashHTML(feeSummary, 'thermal') +
    ((data.payment_type === 'installment' && Number(data.remaining_receivable || 0) > 0) ? '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#DC2626;margin-top:2px;"><span>Sisa Piutang:</span><span>' + formatRupiah(data.remaining_receivable) + '</span></div>' : '') +
    '</div>' +
    '<div style="border-top:1px dashed #222;margin-top:10px;padding-top:8px;text-align:center;font-size:10px;color:#444;">' +
    escapeHtml(footerText) +
    '<div style="margin-top:4px;font-size:9px;color:#777;">Simpan struk ini sebagai bukti pembayaran benih.</div>' +
    '</div>' +
    '</div>';
}

function printMiniReceipt(receiptData) {
  if (!receiptData) {
    showToast('Data struk tidak ditemukan.', true);
    return;
  }

  const printHtml = generateMiniReceiptHTML(receiptData);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Popup diblokir peramban. Izinkan pop-up untuk mencetak struk.', true);
    return;
  }

  printWindow.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Struk-' + escapeHtml(receiptData.invoice_no || receiptData.id || 'POS') + '</title>' +
    '<style>' +
    '@page { size: auto; margin: 0; }' +
    '@media print { html, body { width: 100%; margin: 0; padding: 0; } }' +
    'body { margin: 0; padding: 6px; display: flex; justify-content: center; background: #fff; font-family: "Courier New", Courier, monospace; }' +
    'table { width: 100%; border-collapse: collapse; }' +
    '</style>' +
    '</head><body>' +
    printHtml +
    '<script>' +
    'window.onload = function() { window.print(); window.close(); };' +
    '<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
}

function printMiniReceiptFromInvoice(invoiceData) {
  if (!invoiceData || !invoiceData.transaction) return;
  const tx = invoiceData.transaction;
  const rec = invoiceData.receivable || null;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const items = (invoiceData.items || []).map(function (i) {
    return {
      name: i.product_name,
      batch_id: i.batch_id || '',
      qty: i.qty,
      price: i.price,
      selected_expiry: i.expiry_date
    };
  });

  const receiptData = {
    id: tx.id,
    invoice_no: tx.invoice_no || tx.id,
    name: invoiceData.customer ? invoiceData.customer.name : tx.customer_name,
    total: tx.total,
    subtotal: tx.subtotal,
    tax: tx.tax,
    shipping_cost: tx.shipping_cost,
    fee_note: tx.fee_note,
    qris_fee: tx.qris_fee,
    cash_received: tx.cash_received,
    change_amount: tx.change_amount,
    payment_type: tx.payment_type,
    remaining_receivable: rec ? rec.remaining : 0,
    method: tx.payment_method,
    date: formatDate(tx.created_at),
    status: tx.status,
    is_void: isVoid,
    items: items
  };

  printMiniReceipt(receiptData);
}


// ==============================================================================
// MODUL TANDA TANGAN & STEMPEL DIGITAL FAKTUR RESMI (ROLE: FINANCE)
// ==============================================================================
function getInvoiceSignatureData(tx) {
  if (!tx) return null;
  if (tx.finance_signature) {
    return {
      signature: tx.finance_signature,
      signer_name: tx.finance_signer_name || 'Bagian Keuangan',
      signed_at: tx.finance_signed_at || tx.created_at || new Date().toISOString()
    };
  }
  const id = tx.id || tx.invoice_no;
  if (id) {
    try {
      const raw = localStorage.getItem('inv_sig_' + id);
      if (raw) return JSON.parse(raw);
    } catch (e) { }
  }
  return null;
}

function renderInvoiceSignButtonHTML(tx) {
  if (!tx) return '';
  const sigData = getInvoiceSignatureData(tx);
  const isSigned = !!(sigData && sigData.signature);
  const txId = tx.id || tx.invoice_no || '';
  if (isSigned) {
    return '<button type="button" class="btn btn-secondary btn-sm" onclick="openInvoiceSignatureModal(\'' + escapeHtml(txId) + '\')" style="background:rgba(16,185,129,0.15);color:#34D399;border:1px solid rgba(16,185,129,0.4);font-weight:600;" title="Faktur sudah disahkan & ditandatangani Finance"><span style="font-size:12px;">✅</span> Disahkan Finance</button>';
  }
  return '<button type="button" class="btn btn-warning btn-sm" onclick="openInvoiceSignatureModal(\'' + escapeHtml(txId) + '\')" style="background:rgba(245,158,11,0.18);color:#FBBF24;border:1px solid rgba(245,158,11,0.4);font-weight:700;" title="Bubuhkan tanda tangan & stempel resmi digital Finance"><span style="font-size:12px;">✍️</span> Sahkan &amp; TTD (Finance)</button>';
}

function renderFinanceSignatureBlock(tx, s, isPrint) {
  s = s || APP_SETTINGS || {};
  const sigData = getInvoiceSignatureData(tx);
  const txId = (tx && (tx.id || tx.invoice_no)) || 'INV';

  if (sigData && sigData.signature) {
    const signerName = sigData.signer_name || 'Bagian Keuangan';
    const signedDate = sigData.signed_at ? new Date(sigData.signed_at) : new Date();
    const signedDateStr = formatDate(signedDate);
    const timeStr = String(signedDate.getHours()).padStart(2, '0') + ':' + String(signedDate.getMinutes()).padStart(2, '0');

    let stampHtml = '';
    if (s.store_stamp) {
      stampHtml = '<img src="' + escapeHtml(s.store_stamp) + '" alt="Cap Toko" style="position:absolute;top:-8px;right:12px;width:86px;height:86px;object-fit:contain;opacity:0.88;transform:rotate(-12deg);pointer-events:none;mix-blend-mode:multiply;z-index:3;">';
    } else {
      const stampDay = String(signedDate.getDate()).padStart(2, '0') + '/' + String(signedDate.getMonth() + 1).padStart(2, '0') + '/' + signedDate.getFullYear();
      const curveIdTop = 'stmp-top-' + String(txId).replace(/[^a-zA-Z0-9]/g, '');
      const curveIdBtm = 'stmp-btm-' + String(txId).replace(/[^a-zA-Z0-9]/g, '');
      stampHtml =
        '<div style="position:absolute;top:-8px;right:12px;width:88px;height:88px;opacity:0.88;transform:rotate(-12deg);pointer-events:none;mix-blend-mode:multiply;z-index:3;">' +
        '<svg viewBox="0 0 100 100" style="width:100%;height:100%;">' +
        '<circle cx="50" cy="50" r="47" fill="none" stroke="#1d4ed8" stroke-width="2.2"/>' +
        '<circle cx="50" cy="50" r="41" fill="none" stroke="#1d4ed8" stroke-width="1.2"/>' +
        '<path id="' + curveIdTop + '" d="M 18,50 A 32,32 0 1,1 82,50" fill="none"/>' +
        '<text font-size="6.5" font-weight="bold" fill="#1d4ed8" letter-spacing="0.8">' +
        '<textPath href="#' + curveIdTop + '" startOffset="50%" text-anchor="middle">★ MANAJEMEN KEUANGAN & FAKTUR RESMI ★</textPath>' +
        '</text>' +
        '<path id="' + curveIdBtm + '" d="M 82,50 A 32,32 0 0,1 18,50" fill="none"/>' +
        '<text font-size="6.2" font-weight="bold" fill="#1d4ed8" letter-spacing="0.5">' +
        '<textPath href="#' + curveIdBtm + '" startOffset="50%" text-anchor="middle">KIOS BENIH LESTARI</textPath>' +
        '</text>' +
        '<line x1="20" y1="40" x2="80" y2="40" stroke="#1d4ed8" stroke-width="1"/>' +
        '<text x="50" y="48" font-size="7.5" font-weight="900" fill="#1d4ed8" text-anchor="middle" letter-spacing="0.8">LUNAS / SAH</text>' +
        '<text x="50" y="56" font-size="5.8" font-weight="bold" fill="#1d4ed8" text-anchor="middle">' + stampDay + '</text>' +
        '<line x1="20" y1="60" x2="80" y2="60" stroke="#1d4ed8" stroke-width="1"/>' +
        '</svg>' +
        '</div>';
    }

    return (
      '<div style="width:220px;text-align:center;">' +
      '<div style="font-weight:600;color:' + ('#475569') + ';">Hormat Kami,</div>' +
      '<div style="font-weight:700;color:var(--primary);margin-top:1px;">PENGESAHAN DOKUMEN RESMI</div>' +
      '<div style="position:relative;height:65px;width:100%;margin:2px auto 4px auto;display:flex;align-items:center;justify-content:center;">' +
      '<img src="' + escapeHtml(sigData.signature) + '" alt="Tanda Tangan Finance" style="max-height:60px;max-width:160px;object-fit:contain;z-index:2;position:relative;">' +
      stampHtml +
      '</div>' +
      '<div style="font-weight:700;color:#0F172A;border-bottom:1px solid #0F172A;display:inline-block;min-width:160px;padding-bottom:2px;">( ' + escapeHtml(signerName) + ' )</div>' +
      '<div style="font-size:9.5px;color:#059669;font-weight:700;margin-top:2px;">✅ Disahkan Finance &bull; ' + signedDateStr + ' ' + timeStr + '</div>' +
      '</div>'
    );
  }

  const actionBtn = (!isPrint)
    ? '<div style="margin-top:4px;" class="no-print"><button type="button" class="btn btn-warning btn-sm" onclick="openInvoiceSignatureModal(\'' + escapeHtml(txId) + '\')" style="background:#FEF3C7;color:#92400E;border-color:#FCD34D;font-size:10.5px;font-weight:700;padding:2px 8px;">✍️ Sahkan &amp; TTD (Finance)</button></div>'
    : '';

  return (
    '<div style="width:200px;text-align:center;">' +
    '<div style="font-weight:600;color:' + ('#475569') + ';">Hormat Kami,</div>' +
    '<div style="font-weight:700;color:var(--primary);margin-top:1px;">PENGESAHAN DOKUMEN RESMI</div>' +
    '<div style="height:44px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:10px;font-style:italic;">(Menunggu TTD Finance)</div>' +
    '<div style="font-weight:700;color:#0F172A;border-bottom:1px solid #0F172A;display:inline-block;min-width:160px;padding-bottom:2px;">( Bagian Keuangan )</div>' +
    '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">Petugas Keuangan</div>' +
    actionBtn +
    '</div>'
  );
}

function openInvoiceSignatureModal(txId) {
  if (!txId) {
    if (window._curInv && window._curInv.transaction) {
      txId = window._curInv.transaction.id;
    }
  }
  if (!txId) {
    showToast('Pilih faktur terlebih dahulu.', true);
    return;
  }

  showToast('Menyiapkan formulir pengesahan faktur #' + txId + '...');
  api('getInvoiceData', TOKEN, txId).then(function (data) {
    if (!data || !data.transaction) {
      showToast('Data faktur tidak ditemukan.', true);
      return;
    }

    if (isCurrentUserFinance()) {
      showInvoiceSignaturePadDialog(data, CURRENT_USER);
    } else {
      promptFinanceSupervisorAuth(
        'Otorisasi Tanda Tangan Faktur #' + txId,
        'Pengesahan dan pembubuhan tanda tangan formal A4 merupakan kewenangan Bagian Keuangan (Role Finance). Silakan minta akun Finance untuk mengesahkan.',
        function (financeUser) {
          showInvoiceSignaturePadDialog(data, financeUser);
        }
      );
    }
  }).catch(function (err) {
    showToast('Gagal memuat data faktur: ' + (err.message || err), true);
  });
}

function showInvoiceSignaturePadDialog(data, signerUser) {
  const tx = data.transaction || {};
  const txId = tx.id || tx.invoice_no;
  const signerName = (signerUser && (signerUser.name || signerUser.full_name || signerUser.username)) || 'Bagian Keuangan';
  const existingSig = getInvoiceSignatureData(tx);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2250';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog" style="max-width:520px;">' +
    '<div class="modal-header" style="background:#F0FDF4;border-bottom:1px solid #BBF7D0;">' +
    '<h3 class="modal-title" style="color:#166534;display:flex;align-items:center;gap:8px;font-size:16px;">' +
    '<span>✍️</span> Pengesahan &amp; TTD Faktur Digital</h3>' +
    '<button type="button" class="modal-close-btn" id="sig-pad-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body" style="padding:16px 20px;">' +
    '<div style="background:#F8FAFC;padding:10px 14px;border-radius:6px;border:1px solid #E2E8F0;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;font-size:12.5px;">' +
    '<div><div>No. Faktur: <strong style="font-family:monospace;color:var(--primary);">#' + escapeHtml(txId) + '</strong></div>' +
    '<div>Pelanggan: <strong>' + escapeHtml(tx.customer_name || 'Umum') + '</strong></div></div>' +
    '<div style="text-align:right;"><div>Total: <strong style="color:var(--accent);">' + formatRupiah(tx.total) + '</strong></div>' +
    '<div style="font-size:11px;color:#16A34A;font-weight:700;">Role: Finance</div></div>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:12px;">' +
    '<label class="field-label" style="font-size:12px;font-weight:600;">Nama Petugas Finance / Penandatangan</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="sig-pad-signer" value="' + escapeHtml(existingSig ? existingSig.signer_name : signerName) + '" style="padding-left:14px;font-size:13px;font-weight:600;">' +
    '</div>' +
    '</div>' +
    '<div class="field-group" style="margin-bottom:6px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
    '<label class="field-label" style="margin:0;font-size:12px;font-weight:600;">Goreskan Tanda Tangan Anda di Bawah:</label>' +
    '<button type="button" class="btn btn-secondary btn-sm" id="sig-pad-clear" style="padding:2px 8px;font-size:11px;">🗑️ Bersihkan TTD</button>' +
    '</div>' +
    '<div style="border:2px dashed #94A3B8;border-radius:6px;background:#FFFFFF;position:relative;touch-action:none;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,0.06);">' +
    '<canvas id="invoice-signature-canvas" width="480" height="180" style="display:block;width:100%;height:180px;cursor:crosshair;"></canvas>' +
    '<div style="position:absolute;bottom:25px;left:20px;right:20px;border-bottom:1px dashed #CBD5E1;pointer-events:none;text-align:right;color:#94A3B8;font-size:10px;padding-bottom:2px;">(Tanda Tangan Sah)</div>' +
    '</div>' +
    '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Gunakan jari/stylus pada layar sentuh atau mouse pada desktop untuk menggambar tanda tangan.</small>' +
    '</div>' +
    '<div style="margin-top:12px;padding:10px 12px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;display:flex;align-items:center;gap:10px;">' +
    '<input type="checkbox" id="sig-pad-with-stamp" checked style="width:18px;height:18px;accent-color:#16A34A;cursor:pointer;">' +
    '<label for="sig-pad-with-stamp" style="font-size:12px;color:#166534;cursor:pointer;margin:0;line-height:1.3;">' +
    '<strong>Bubuhkan Stempel Resmi Digital Pengesahan Faktur</strong><br>' +
    '<span style="font-size:11px;color:#475569;">Stempel resmi otomatis diletakkan bersanding dengan tanda tangan pada Faktur Formal A4.</span>' +
    '</label>' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer" style="padding:12px 20px;background:var(--surface-muted);display:flex;justify-content:space-between;">' +
    '<button type="button" class="btn btn-secondary" id="sig-pad-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="sig-pad-save" style="background:#16A34A;border-color:#16A34A;font-weight:700;">💾 Sahkan &amp; Simpan TTD</button>' +
    '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const canvas = overlay.querySelector('#invoice-signature-canvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  let hasDrawn = false;
  let lastX = 0;
  let lastY = 0;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDraw(e) {
    isDrawing = true;
    hasDrawn = true;
    const c = getCanvasCoords(e);
    lastX = c.x;
    lastY = c.y;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
  }

  function drawMove(e) {
    if (!isDrawing) return;
    const c = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(c.x, c.y);
    ctx.stroke();
    lastX = c.x;
    lastY = c.y;
  }

  function stopDraw() {
    isDrawing = false;
  }

  canvas.addEventListener('mousedown', function (e) { startDraw(e); });
  canvas.addEventListener('mousemove', function (e) { drawMove(e); });
  canvas.addEventListener('mouseup', function () { stopDraw(); });
  canvas.addEventListener('mouseleave', function () { stopDraw(); });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    startDraw(e);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    drawMove(e);
  }, { passive: false });
  canvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    stopDraw();
  }, { passive: false });

  overlay.querySelector('#sig-pad-clear').onclick = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
  };

  const closeDialog = function () {
    overlay.remove();
    document.body.classList.remove('modal-open');
  };
  overlay.querySelector('#sig-pad-close').onclick = closeDialog;
  overlay.querySelector('#sig-pad-cancel').onclick = closeDialog;

  overlay.querySelector('#sig-pad-save').onclick = function () {
    if (!hasDrawn) {
      showToast('Silakan goreskan tanda tangan terlebih dahulu pada kotak.', true);
      return;
    }

    const inputSigner = (overlay.querySelector('#sig-pad-signer').value || '').trim() || signerName;
    const signatureDataUrl = canvas.toDataURL('image/png');
    const signedAtISO = new Date().toISOString();

    const signPayload = {
      signature: signatureDataUrl,
      signer_name: inputSigner,
      signed_at: signedAtISO
    };

    showToast('Menyimpan tanda tangan & pengesahan Finance...');
    api('signInvoice', TOKEN, txId, signPayload).then(function (res) {
      try {
        localStorage.setItem('inv_sig_' + txId, JSON.stringify(signPayload));
      } catch (e) { }

      tx.finance_signature = signatureDataUrl;
      tx.finance_signer_name = inputSigner;
      tx.finance_signed_at = signedAtISO;

      if (window._curInv && window._curInv.transaction && (window._curInv.transaction.id === txId || window._curInv.transaction.invoice_no === txId)) {
        window._curInv.transaction.finance_signature = signatureDataUrl;
        window._curInv.transaction.finance_signer_name = inputSigner;
        window._curInv.transaction.finance_signed_at = signedAtISO;
      }

      closeDialog();
      showToast('Faktur #' + txId + ' berhasil disahkan oleh ' + inputSigner + '!');

      const docBody = document.getElementById('invoice-doc-body');
      if (docBody && window._curInv) {
        docBody.innerHTML = buildInvoiceRenderAreaHTML(window._curInv, CURRENT_INVOICE_VIEW_MODE || 'formal');
        switchInvoiceView(CURRENT_INVOICE_VIEW_MODE || 'formal');
      }
      const renderArea = document.getElementById('invoice-render-area');
      if (renderArea && window._curInv) {
        renderArea.outerHTML = buildInvoiceRenderAreaHTML(window._curInv, CURRENT_INVOICE_VIEW_MODE || 'formal');
        switchInvoiceView(CURRENT_INVOICE_VIEW_MODE || 'formal');
      }
    }).catch(function (err) {
      showToast('Gagal menyimpan tanda tangan: ' + (err.message || err), true);
    });
  };
}

window.openInvoiceSignatureModal = openInvoiceSignatureModal;
window.showInvoiceSignaturePadDialog = showInvoiceSignaturePadDialog;
window.renderFinanceSignatureBlock = renderFinanceSignatureBlock;
window.renderInvoiceSignButtonHTML = renderInvoiceSignButtonHTML;
window.getInvoiceSignatureData = getInvoiceSignatureData;
window.isFinance = isFinance;
window.isCurrentUserFinance = isCurrentUserFinance;


function printInvoiceA4(invoiceData) {
  if (!invoiceData) invoiceData = window._curInv;
  if (!invoiceData || !invoiceData.transaction) {
    showToast('Data faktur tidak ditemukan.', true);
    return;
  }

  const tx = invoiceData.transaction;
  const items = invoiceData.items || [];
  const s = invoiceData.settings || APP_SETTINGS || {};
  const c = invoiceData.customer || { name: tx.customer_name || 'Umum', phone: '' };
  const isVoid = String(tx.status).toUpperCase() === 'VOID';

  const logoPrimary = s.store_logo || '';
  // Cukup tampilkan <img> logo di sebelah kiri tanpa disertai teks nama toko bertingkat
  const logoHtml = logoPrimary
    ? '<img src="' + escapeHtml(logoPrimary) + '" class="letterhead-logo" style="max-height:55px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px;" alt="Logo Toko">'
    : '<div style="font-size:18pt;font-weight:800;color:var(--primary);letter-spacing:0.5px;margin-bottom:4px;">' + escapeHtml(s.store_name || 'TOKO KASIR') + '</div>';

  const rowsHtml = items.map(function (it, idx) {
    const bInfo = it.batch_id ? ('<br><span style="font-size:10px;color:#555;font-family:monospace;">[Batch: ' + escapeHtml(it.batch_id) + ']</span>') : '';
    return '<tr>' +
      '<td style="padding:8px 10px;border:1px solid #D1D5DB;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #D1D5DB;"><strong>' + escapeHtml(it.product_name) + '</strong>' + bInfo + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #D1D5DB;text-align:center;">' + it.qty + (it.unit ? ' ' + it.unit : '') + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #D1D5DB;text-align:right;">' + formatRupiah(it.price) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #D1D5DB;text-align:right;font-weight:700;">' + formatRupiah(it.subtotal) + '</td>' +
      '</tr>';
  }).join('');

  const watermarkHtml = isVoid ? '<div class="invoice-void-watermark">DIBATALKAN (VOID)</div>' : '';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Izinkan pop-up untuk mencetak faktur resmi A4.', true);
    return;
  }

  const statusColor = isVoid ? '#DC2626' : (tx.status === 'paid' ? '#16A34A' : '#D97706');
  const statusLabel = isVoid ? 'DIBATALKAN (VOID)' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO / PIUTANG');
  const feeSummary = resolveTxExtraFeeSummary(tx);
  const displayInvoiceNo = tx.invoice_no || tx.id;

  printWindow.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Faktur-' + escapeHtml(displayInvoiceNo) + '</title>' +
    '<style>' +
    '@page { size: A4 portrait; margin: 12mm 15mm; }' +
    'body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; color: #1F2937; margin: 0; padding: 0; position: relative; line-height: 1.4; }' +
    'table { width: 100%; border-collapse: collapse; }' +
    'th { background: #2563EB; color: #ffffff; padding: 9px 10px; font-weight: 700; text-align: left; border: 1px solid #2563EB; font-size: 9.5pt; }' +
    'td { border: 1px solid #D1D5DB; }' +
    '.invoice-void-watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 55px; font-weight: 900; color: rgba(220,38,38,0.22); border: 6px dashed rgba(220,38,38,0.35); padding: 14px 36px; border-radius: 16px; letter-spacing: 4px; pointer-events: none; text-align: center; }' +
    'tr { page-break-inside: avoid; }' +
    '</style>' +
    '</head><body>' +
    watermarkHtml +
    '<div class="invoice-header letterhead" style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #2563EB;margin-bottom:14px;">' +
    '<div style="max-width:58%;">' +
    logoHtml +
    '<div style="font-size:9.5pt;color:#4B5563;line-height:1.45;margin-top:4px;">' +
    '<div>' + escapeHtml(s.store_address || 'Br. Medahan, Kemenuh, Sukawati, Gianyar, Bali 80582') + '</div>' +
    '<div>Kontak / WA: ' + escapeHtml(s.store_phone || '-') + (s.store_email ? ' &bull; Email: ' + escapeHtml(s.store_email) : '') + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;min-width:220px;">' +
    '<div style="font-size:20pt;font-weight:800;color:#2563EB;letter-spacing:1px;line-height:1.1;">FAKTUR PENJUALAN</div>' +
    '<table style="margin-top:6px;margin-left:auto;border-collapse:collapse;font-size:9.5pt;width:auto;">' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#4B5563;border:none;">No. Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;font-family:monospace;color:#2563EB;border:none;">#' + escapeHtml(displayInvoiceNo) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#4B5563;border:none;">Tanggal:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;color:#111827;border:none;">' + formatDate(tx.created_at) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#4B5563;border:none;">Status:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;color:' + statusColor + ';border:none;">' + statusLabel + '</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>' +

    '<div style="display:flex;justify-content:space-between;gap:20px;margin-bottom:14px;background:#F9FAFB;padding:10px 14px;border-radius:6px;border:1px solid #E5E7EB;font-size:9.5pt;">' +
    '<div>' +
    '<div style="font-size:8.5pt;font-weight:700;color:#6B7280;text-transform:uppercase;">DITAGIHKAN KEPADA:</div>' +
    '<div style="font-size:11pt;font-weight:700;color:#111827;margin-top:2px;">' + escapeHtml(c.name || tx.customer_name || 'Umum') + '</div>' +
    (c.phone ? '<div style="color:#4B5563;margin-top:1px;">No. Telp/WA: ' + escapeHtml(c.phone) + '</div>' : '') +
    '</div>' +
    '<div style="text-align:right;">' +
    '<div style="font-size:8.5pt;font-weight:700;color:#6B7280;text-transform:uppercase;">INFORMASI PEMBAYARAN:</div>' +
    '<div style="font-weight:700;color:#111827;margin-top:2px;">Metode: ' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + escapeHtml(tx.source || 'Offline') + ')</div>' +
    '</div>' +
    '</div>' +

    '<table style="margin-top:10px;margin-bottom:14px;">' +
    '<thead>' +
    '<tr>' +
    '<th style="width:40px;text-align:center;">No</th>' +
    '<th>Nama Komoditas / Benih &amp; Batch</th>' +
    '<th style="width:70px;text-align:center;">Qty</th>' +
    '<th style="width:120px;text-align:right;">Harga Satuan</th>' +
    '<th style="width:130px;text-align:right;">Subtotal</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rowsHtml + '</tbody>' +
    '<tfoot>' +
    '<tr><td colspan="4" style="text-align:right;padding:8px 12px;font-weight:600;">Subtotal:</td><td style="text-align:right;padding:8px 12px;font-weight:600;">' + formatRupiah(feeSummary.subtotal) + '</td></tr>' +
    buildTxExtraFeeHTML(feeSummary, 'standalone') +
    '<tr style="font-size:15px;font-weight:800;background:#F3F4F6;"><td colspan="4" style="text-align:right;padding:10px 12px;">TOTAL PEMBAYARAN:</td><td style="text-align:right;padding:10px 12px;color:#2563EB;">' + formatRupiah(tx.total) + '</td></tr>' +
    buildTxCashHTML(feeSummary, 'standalone') +
    '</tfoot>' +
    '</table>' +

    '<div style="display:flex;justify-content:space-between;gap:40px;margin-top:30px;padding-top:15px;text-align:center;">' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#4B5563;">Tanda Terima Pelanggan,</div>' +
    '<div style="height:50px;"></div>' +
    '<div style="font-weight:700;color:#111827;border-bottom:1px solid #111827;padding-bottom:2px;">( ' + escapeHtml(c.name || tx.customer_name || '___________________') + ' )</div>' +
    '</div>' +
    renderFinanceSignatureBlock(tx, s, true) +
    '</div>' +

    '<div style="text-align:center;font-size:11px;color:#6B7280;margin-top:30px;border-top:1px dashed #D1D5DB;padding-top:8px;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih atas kunjungan Anda!') +
    '</div>' +

    '<script>window.onload = function() { window.print(); };<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
}

function sendReceiptToWhatsApp(txIdOrData, name, phone, total, method) {
  let data = window._curInv;
  let tx = null;
  let items = [];
  let receivable = null;
  let custName = name || '';
  let custPhone = phone || '';

  if (typeof txIdOrData === 'object' && txIdOrData !== null) {
    data = txIdOrData;
    if (data.transaction) {
      tx = data.transaction;
      items = data.items || [];
      receivable = data.receivable || null;
      custName = (data.customer ? data.customer.name : tx.customer_name) || custName;
      custPhone = (data.customer ? data.customer.phone : '') || custPhone;
    } else {
      // Bentuk objek dari window._lastTxReceipt
      tx = {
        id: data.id || '',
        invoice_no: data.invoice_no || data.id || '',
        total: Number(data.total || 0),
        subtotal: Number(data.subtotal !== undefined ? data.subtotal : (data.total || 0)),
        tax: Number(data.tax || 0),
        shipping_cost: Number(data.shipping_cost || 0),
        fee_note: data.fee_note || '',
        qris_fee: Number(data.qris_fee || 0),
        cash_received: Number(data.cash_received || 0),
        change_amount: Number(data.change_amount || 0),
        payment_method: data.method || data.payment_method || 'Tunai',
        payment_type: data.payment_type || 'cash',
        customer_name: data.name || data.customer_name || 'Pelanggan',
        status: data.status || 'paid',
        created_at: data.created_at || new Date().toISOString()
      };
      items = data.items || [];
      receivable = data.payment_type === 'installment'
        ? { paid: data.down_payment || 0, remaining: data.remaining_receivable || 0, due_date: data.due_date || '' }
        : null;
      custName = data.name || data.customer_name || custName;
      custPhone = data.phone || custPhone;
    }
  } else {
    const matchedCur = (data && data.transaction && (data.transaction.id === txIdOrData || data.transaction.invoice_no === txIdOrData));
    tx = matchedCur ? data.transaction : { id: txIdOrData, invoice_no: txIdOrData, total: total, payment_method: method, customer_name: name, status: 'paid' };
    items = matchedCur ? (data.items || []) : [];
    receivable = matchedCur ? (data.receivable || null) : null;
    custName = custName || (matchedCur && data.customer ? data.customer.name : tx.customer_name) || '';
    custPhone = custPhone || (matchedCur && data.customer ? data.customer.phone : '') || '';
  }

  custName = custName || tx.customer_name || 'Kak/Bli';
  const displayNo = tx.invoice_no || tx.id || '-';

  if (!custPhone) {
    showPromptDialog('Kirim Struk via WhatsApp', 'Masukkan nomor WhatsApp pelanggan (misal: 08123456789):', '', function (val) {
      const nextPayload = {
        transaction: tx,
        items: items,
        receivable: receivable,
        customer: { name: custName, phone: val }
      };
      sendReceiptToWhatsApp(nextPayload);
    });
    return;
  }

  let cleanPhone = String(custPhone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
  if (cleanPhone.length < 8) {
    showToast('Nomor WhatsApp pelanggan tidak valid: ' + custPhone, true);
    return;
  }

  const dateStr = formatDate(tx.created_at || new Date());
  const statusUpper = String(tx.status || '').toUpperCase();
  const statusLabel = statusUpper === 'PAID' ? 'LUNAS' : (statusUpper === 'VOID' ? 'DIBATALKAN (VOID)' : 'TEMPO / CICILAN');
  const feeSummary = resolveTxExtraFeeSummary(tx);

  let itemLines = '';
  if (items.length > 0) {
    itemLines = items.map(function (it) {
      const pName = it.product_name || it.name || 'Produk';
      const batchTag = it.batch_id ? (' (' + it.batch_id + ')') : '';
      const lineSub = it.subtotal !== undefined ? it.subtotal : (Number(it.qty || 0) * Number(it.price || 0));
      return it.qty + 'x ' + pName + batchTag + ' = ' + formatRupiah(lineSub);
    }).join('\n');
  } else {
    itemLines = '1x Pembelian Produk = ' + formatRupiah(feeSummary.subtotal);
  }

  let text = '*Faktur Pembelian*\n';
  text += 'No: #' + displayNo + '\n';
  text += 'Tgl: ' + dateStr + '\n';
  text += 'Pelanggan: ' + custName + '\n';
  text += '--------------------------------\n';
  text += itemLines + '\n';
  text += '--------------------------------\n';
  if (feeSummary.hasBreakdown) {
    text += 'Subtotal Produk: ' + formatRupiah(feeSummary.subtotal) + '\n';
    if (feeSummary.tax > 0) text += 'Pajak: ' + formatRupiah(feeSummary.tax) + '\n';
    if (feeSummary.shippingCost > 0) text += feeSummary.shippingLabel + ': ' + formatRupiah(feeSummary.shippingCost) + '\n';
    if (feeSummary.customerQrisFee > 0) text += 'Biaya Admin QRIS: ' + formatRupiah(feeSummary.customerQrisFee) + '\n';
    if (feeSummary.unitemizedExtra > 0) text += 'Biaya Lainnya: ' + formatRupiah(feeSummary.unitemizedExtra) + '\n';
  }
  text += 'Total: *' + formatRupiah(tx.total) + '* (' + (tx.payment_method || 'Tunai') + ')\n';
  if (feeSummary.cashReceived > 0) {
    text += 'Bayar Tunai: ' + formatRupiah(feeSummary.cashReceived) + '\n';
    text += 'Kembalian: ' + formatRupiah(feeSummary.changeAmount) + '\n';
  }
  if (receivable && statusUpper !== 'VOID' && statusUpper !== 'PAID' && Number(receivable.remaining || 0) > 0) {
    text += 'DP Dibayar: ' + formatRupiah(receivable.paid || 0) + '\n';
    text += 'Sisa Piutang: *' + formatRupiah(receivable.remaining) + '*\n';
  }
  text += 'Status: ' + statusLabel + '\n\n';
  text += 'Terima kasih telah berbelanja bersama kami. Salam sukses! 🙏';

  const url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
  showToast('Membuka WhatsApp untuk mengirim struk #' + displayNo);
}

function promptVoidTransaction(txId, custName) {
  const bodyHtml =
    '<div style="line-height:1.5;">' +
    '<div style="background:#FEF2F2;border:1.5px dashed #F87171;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;color:#991B1B;">' +
    '<div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
    '<span>⚠️ Peringatan Pembatalan Transaksi (Void)</span>' +
    '</div>' +
    '<p style="font-size:12.5px;margin:0 0 6px 0;">' +
    'Apakah Anda yakin ingin membatalkan transaksi <strong>#' + escapeHtml(txId) + '</strong> atas nama <strong>' + escapeHtml(custName || 'Pelanggan') + '</strong>?' +
    '</p>' +
    '<ul style="margin:0;padding-left:18px;font-size:11.5px;color:#7F1D1D;">' +
    '<li>Stok fisik seluruh batch benih/barang pada nota ini akan <strong>otomatis dikembalikan (rollback)</strong> ke toples toko.</li>' +
    '<li>Status nota akan ditandai <strong>VOID</strong> secara permanen.</li>' +
    '<li>Piutang atau jadwal sapaan follow-up terkait nota ini otomatis dibatalkan.</li>' +
    '</ul>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label" style="font-weight:700;">Alasan Pembatalan Transaksi <span style="color:red;">*</span></label>' +
    '<div class="input-wrapper">' +
    '<textarea id="tx-void-reason" rows="3" placeholder="Contoh: Salah input varietas benih / dobel cetak nota / pelanggan membatalkan pembelian..." style="padding:8px 12px;font-size:13px;width:100%;box-sizing:border-box;"></textarea>' +
    '</div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-danger" id="btn-submit-void-tx" onclick="executeVoidTransaction(\'' + escapeHtml(txId) + '\')">' +
    '⚠️ Ya, Batalkan &amp; Rollback Stok' +
    '</button>';

  openModal('Konfirmasi Pembatalan Nota #' + txId, bodyHtml, footerHtml);
}

function executeVoidTransaction(txId) {
  const reasonInput = document.getElementById('tx-void-reason');
  const reason = reasonInput ? reasonInput.value.trim() : '';

  if (!reason) {
    showToast('Alasan pembatalan (void) wajib diisi.', true);
    if (reasonInput) reasonInput.focus();
    return;
  }

  const btn = document.getElementById('btn-submit-void-tx');
  if (btn) { btn.disabled = true; btn.textContent = 'Memproses Void & Rollback...'; }

  api('voidTransaction', TOKEN, txId, reason).then(function (res) {
    closeModal();
    showToast(res.message || 'Transaksi #' + txId + ' berhasil dibatalkan.');

    invalidateCache('recentInvoices');
    invalidateCache('products');
    invalidateCache('batches');
    invalidateCache('mutations');
    invalidateCache('stock_mutations');
    invalidateCache('dashboard');
    invalidateCache('receivables');

    if (Array.isArray(window._fakturTxList)) {
      window._fakturTxList.forEach(function (t) {
        if (String(t.id) === String(txId)) {
          t.status = 'VOID';
          t.void_at = res.void_at;
          t.void_by = res.void_by;
          t.void_reason = res.void_reason;
          if (t.gross_profit !== undefined) t.gross_profit = 0;
        }
      });
    }

    renderFaktur(true);

    setTimeout(function () {
      openTransactionDetailModal(txId);
    }, 300);
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = '⚠️ Ya, Batalkan & Rollback Stok'; }
    showToast('Gagal membatalkan transaksi: ' + (err.message || err), true);
  });
}

function startEditTransaction(transactionId) {
  showToast('Mengambil nota #' + transactionId + '...');
  api('getTransactionDetail', TOKEN, transactionId).then(function (data) {
    if (!data || !data.transaction) { showToast('Transaksi tidak ditemukan.', true); return; }
    if (data.transaction.status === 'VOID') {
      showToast('Transaksi VOID tidak dapat dikoreksi ulang.', true);
      return;
    }
    EDITING_TRANSACTION = data.transaction;
    CART = (data.items || []).map(function (item) {
      const p = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
      let matchedTier = 'Eceran';
      if (p && p.priceTiers) {
        const foundTier = p.priceTiers.filter(function (t) { return Number(t.price) === Number(item.price); })[0];
        if (foundTier) matchedTier = foundTier.tier_name;
      }
      return {
        cart_key: item.product_id + '__' + matchedTier,
        product_id: item.product_id,
        name: item.product_name,
        tier_name: matchedTier,
        price: Number(item.price),
        qty: Number(item.qty),
        selected_batch_id: (item.batch_id && !String(item.batch_id).includes(',')) ? item.batch_id : '',
        selected_expiry: item.expiry_date ? formatDate(item.expiry_date) : ''
      };
    });

    SELECTED_CUSTOMER = CUSTOMERS_CACHE.filter(function (c) { return c.id === EDITING_TRANSACTION.customer_id; })[0] || null;
    const custName = EDITING_TRANSACTION.customer_name || (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : '');

    closeModal();
    location.hash = '#pos';
    renderPOS();

    setTimeout(function () {
      const inp = document.getElementById('pos-customer-input');
      if (inp) {
        inp.value = custName;
        handleCustomerInput(custName);
      }
    }, 100);

    showToast('Mode koreksi nota #' + transactionId + ' aktif.');
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

function cancelEditMode() {
  resetCart();
  renderPOS();
  showToast('Koreksi dibatalkan.');
}

function openTransactionDetailModal(transactionId) {
  showToast('Memuat rincian nota #' + transactionId + '...');
  api('getInvoiceData', TOKEN, transactionId).then(function (data) {
    if (!data || !data.transaction) {
      showToast('Data transaksi tidak ditemukan.', true);
      return;
    }
    window._curInv = data;
    const tx = data.transaction;
    const items = data.items || [];
    const cust = data.customer || { name: tx.customer_name || 'Umum', phone: '' };
    const rec = data.receivable;
    const isVoid = String(tx.status).toUpperCase() === 'VOID';
    const userIsAdmin = isAdmin();

    let statusBadge = '';
    if (isVoid) {
      statusBadge = '<span class="badge-void">⚠️ DIBATALKAN (VOID)</span>';
    } else if (tx.status === 'paid') {
      statusBadge = '<span class="badge badge-success">LUNAS</span>';
    } else {
      statusBadge = '<span class="badge badge-warning">CICILAN / TEMPO</span>';
    }

    let voidBannerHtml = '';
    if (isVoid) {
      voidBannerHtml =
        '<div class="tx-void-banner">' +
        '<div style="font-size:24px;line-height:1;">⚠️</div>' +
        '<div>' +
        '<h4>TRANSAKSI DIBATALKAN (VOID)</h4>' +
        '<p>Nota ini dibatalkan pada <strong>' + escapeHtml(tx.void_at || '-') + '</strong> oleh <strong>' + escapeHtml(tx.void_by || 'Admin') + '</strong>.<br>' +
        'Alasan: <em>"' + escapeHtml(tx.void_reason || 'Tidak ada keterangan') + '"</em>.<br>' +
        'Stok fisik seluruh batch telah dikembalikan ke toples asal toko.</p>' +
        '</div>' +
        '</div>';
    }

    const itemRows = items.map(function (i) {
      const expTxt = i.expiry_date ? ('<br><span style="font-size:10px;color:var(--text-secondary);">📅 Exp: ' + formatDate(i.expiry_date) + '</span>') : '';
      const bText = i.batch_id ? ('<br><span style="font-size:10px;color:var(--text-secondary);font-family:monospace;">[Batch: ' + escapeHtml(i.batch_id) + ']</span>') : '';
      const firstBatch = (i.batch_id || '').split(',')[0].trim();
      const claimBtn = (!isVoid) ? (
        '<button type="button" class="btn btn-warning btn-xs" style="font-size:11px;padding:3px 8px;display:inline-flex;align-items:center;gap:3px;white-space:nowrap;font-weight:600;" onclick="claimSeedFromTransaction(\'' + escapeHtml(tx.id) + '\', \'' + escapeHtml(cust.name || '') + '\', \'' + escapeHtml(cust.phone || '') + '\', \'' + escapeHtml(i.product_id) + '\', \'' + escapeHtml(firstBatch) + '\')" title="Ajukan klaim garansi daya tumbuh untuk benih ini">' +
        '⚠️ Klaim Benih' +
        '</button>'
      ) : '<span style="font-size:11px;color:var(--text-secondary);">(Batal)</span>';

      let adminCols = '';
      if (userIsAdmin) {
        adminCols =
          '<td style="padding:8px 10px;text-align:right;" class="td-admin-cost">' + (i.cost !== undefined ? formatRupiah(i.cost) : '-') + '</td>' +
          '<td style="padding:8px 10px;text-align:right;" class="td-admin-margin">' + (i.gross_profit !== undefined ? (formatRupiah(i.gross_profit) + '<br><small style="font-size:10px;color:var(--text-secondary);font-weight:normal;">' + (i.margin_percent || 0) + '%</small>') : '-') + '</td>';
      }

      return '<tr>' +
        '<td style="padding:8px 10px;"><strong>' + escapeHtml(i.product_name) + '</strong>' + bText + expTxt + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + i.qty + '</td>' +
        '<td style="padding:8px 10px;text-align:right;">' + formatRupiah(i.price) + '</td>' +
        adminCols +
        '<td style="padding:8px 10px;text-align:right;font-weight:700;">' + formatRupiah(i.subtotal) + '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' + claimBtn + '</td>' +
        '</tr>';
    }).join('');

    let tempoHTML = '';
    if (rec && !isVoid) {
      tempoHTML =
        '<div style="background:var(--warning-bg);border:1px solid rgba(217,130,43,0.3);padding:10px 12px;border-radius:var(--radius-xs);margin-top:12px;font-size:12px;">' +
        '<div style="display:flex;justify-content:space-between;"><span>Uang Muka (DP):</span><strong>' + formatRupiah(rec.paid) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--danger);font-weight:700;margin-top:3px;"><span>Sisa Piutang:</span><span>' + formatRupiah(rec.remaining) + '</span></div>' +
        (rec.due_date ? '<div style="display:flex;justify-content:space-between;margin-top:3px;"><span>Jatuh Tempo:</span><span>' + formatDate(rec.due_date) + '</span></div>' : '') +
        '</div>';
    }

    let adminProfitSummary = '';
    if (userIsAdmin && !isVoid) {
      adminProfitSummary =
        '<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px dashed var(--border);color:#166534;font-size:12px;">' +
        '<span>Total HPP / Modal:</span><strong style="font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.total_cost || 0) + '</strong>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:4px;color:#047857;font-size:13px;font-weight:700;">' +
        '<span>Estimasi Margin Laba Kotor:</span><strong style="font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.gross_profit || 0) + '</strong>' +
        '</div>';
    }

    const adminHeaderCols = userIsAdmin ? '<th style="text-align:right;" class="th-admin-cost">HPP/Modal</th><th style="text-align:right;" class="th-admin-cost">Laba Kotor</th>' : '';

    const displayNo = tx.invoice_no || tx.id;
    const feeSummary = resolveTxExtraFeeSummary(tx);

    const bodyHtml =
      voidBannerHtml +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--surface-muted);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;font-size:12px;">' +
      '<div>' +
      '<div>No. Nota: <strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:14px;">#' + escapeHtml(displayNo) + '</strong></div>' +
      '<div style="color:var(--text-secondary);margin-top:2px;">Waktu: ' + formatDate(tx.created_at) + '</div>' +
      '<div style="margin-top:4px;">Kanal: <span class="badge badge-neutral">' + escapeHtml(tx.source || 'Offline') + '</span></div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div>Status: ' + statusBadge + '</div>' +
      '<div style="margin-top:4px;">Pelanggan: <strong>' + escapeHtml(cust.name || 'Umum') + '</strong></div>' +
      (cust.phone ? '<div style="color:var(--text-secondary);margin-top:2px;">WA: ' + escapeHtml(cust.phone) + '</div>' : '') +
      '</div>' +
      '</div>' +
      '<div class="table-container" style="margin-bottom:12px;max-height:240px;overflow-y:auto;">' +
      '<table>' +
      '<thead>' +
      '<tr><th>Produk &amp; Batch</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Harga</th>' + adminHeaderCols + '<th style="text-align:right;">Subtotal</th><th style="text-align:center;">Aksi</th></tr>' +
      '</thead>' +
      '<tbody>' + (itemRows || '<tr><td colspan="7"><div style="text-align:center;padding:12px;">Tidak ada rincian barang.</div></td></tr>') + '</tbody>' +
      '</table>' +
      '</div>' +
      '<div style="background:var(--surface-muted);padding:12px 14px;border-radius:var(--radius-sm);font-size:12px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Subtotal:</span><span>' + formatRupiah(feeSummary.subtotal) + '</span></div>' +
      buildTxExtraFeeHTML(feeSummary, 'detail') +
      '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:var(--primary);border-top:1px dashed var(--border);padding-top:6px;">' +
      '<span>Total Pembayaran:</span><span>' + formatRupiah(tx.total) + '</span>' +
      '</div>' +
      buildTxCashHTML(feeSummary, 'detail') +
      adminProfitSummary +
      '<div style="margin-top:4px;font-size:11px;color:var(--text-secondary);">Metode Pembayaran: <strong>' + escapeHtml(tx.payment_method || 'Tunai') + '</strong></div>' +
      '</div>' +
      tempoHTML;

    const voidBtnHtml = (!isVoid && userIsAdmin)
      ? '<button type="button" class="btn btn-tx-void btn-sm" onclick="promptVoidTransaction(\'' + tx.id + '\', \'' + escapeHtml(cust.name) + '\')">⚠️ Batalkan Transaksi (Void)</button>'
      : '';

    const footerHtml =
      '<div class="tx-modal-action-bar no-print">' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
      '<button type="button" class="btn btn-tx-formal btn-sm" onclick="openInvoiceModal(\'' + tx.id + '\', \'formal\')">🏛️ Faktur Formal (A4)</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openInvoiceModal(\'' + tx.id + '\', \'minimalist\')">📄 Faktur Minimalis</button>' +
      '<button type="button" class="btn btn-tx-thermal btn-sm" onclick="openInvoiceModal(\'' + tx.id + '\', \'thermal\')">🧾 Struk Termal (58mm)</button>' +
      '<button type="button" class="btn btn-tx-wa btn-sm" onclick="sendReceiptToWhatsApp(window._curInv)">📲 Kirim WA</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
      voidBtnHtml +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">✕ Tutup</button>' +
      '</div>' +
      '</div>';

    openModal('Rincian Transaksi #' + escapeHtml(displayNo), bodyHtml, footerHtml, true);
  }).catch(function (err) {
    showToast('Gagal memuat rincian: ' + (err.message || err), true);
  });
}

// ==========================================================================
// MODUL PRATINJAU DOKUMEN & SINKRONISASI CETAK MULTI-FORMAT (KASIR, MINIMALIS, A4)
// ==========================================================================
let CURRENT_INVOICE_VIEW_MODE = 'formal'; // 'thermal' | 'minimalist' | 'formal'

function angkaTerbilang(angka) {
  if (window.i18n && window.i18n.getLanguage() === 'en') {
    return window.i18n.numberToWords(angka) + ' Rupiah';
  }
  const n = Math.round(Number(angka) || 0);
  if (n < 0) return 'Minus ' + angkaTerbilang(Math.abs(n));
  if (n === 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function sebut(x) {
    x = Math.floor(x);
    if (x < 12) return satuan[x];
    if (x < 20) return sebut(x - 10) + ' Belas';
    if (x < 100) return sebut(Math.floor(x / 10)) + ' Puluh' + ((x % 10 !== 0) ? ' ' + sebut(x % 10) : '');
    if (x < 200) return 'Seratus' + ((x - 100 !== 0) ? ' ' + sebut(x - 100) : '');
    if (x < 1000) return sebut(Math.floor(x / 100)) + ' Ratus' + ((x % 100 !== 0) ? ' ' + sebut(x % 100) : '');
    if (x < 2000) return 'Seribu' + ((x - 1000 !== 0) ? ' ' + sebut(x - 1000) : '');
    if (x < 1000000) return sebut(Math.floor(x / 1000)) + ' Ribu' + ((x % 1000 !== 0) ? ' ' + sebut(x % 1000) : '');
    if (x < 1000000000) return sebut(Math.floor(x / 1000000)) + ' Juta' + ((x % 1000000 !== 0) ? ' ' + sebut(x % 1000000) : '');
    if (x < 1000000000000) return sebut(Math.floor(x / 1000000000)) + ' Miliar' + ((x % 1000000000 !== 0) ? ' ' + sebut(x % 1000000000) : '');
    return sebut(Math.floor(x / 1000000000000)) + ' Triliun' + ((x % 1000000000000 !== 0) ? ' ' + sebut(x % 1000000000000) : '');
  }

  const res = sebut(n).trim().replace(/\s+/g, ' ');
  return res + ' Rupiah';
}

function switchInvoiceView(mode) {
  if (mode === 'minimalis') mode = 'minimalist';
  if (!mode || (mode !== 'thermal' && mode !== 'minimalist' && mode !== 'formal')) {
    mode = 'formal';
  }
  CURRENT_INVOICE_VIEW_MODE = mode;

  // Sinkronisasi status tombol segmented tabs
  const tabBtns = document.querySelectorAll('.invoice-format-tab-btn');
  tabBtns.forEach(function (btn) {
    if (btn.getAttribute('data-mode') === mode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Tampilkan kanvas dokumen aktif, sembunyikan yang lain
  const canvases = document.querySelectorAll('#invoice-render-area .paper-canvas');
  canvases.forEach(function (c) {
    c.classList.remove('active-doc');
  });

  const targetEl = document.getElementById('view-' + (mode === 'thermal' ? 'receipt' : mode));
  if (targetEl) {
    targetEl.classList.add('active-doc');
  }
}

function printActiveInvoice() {
  const activeMode = CURRENT_INVOICE_VIEW_MODE || 'formal';
  document.body.classList.remove('print-thermal-active', 'print-minimalist-active', 'print-formal-active');
  document.body.classList.add('print-' + activeMode + '-active');

  window.print();

  window.onafterprint = function () {
    document.body.classList.remove('print-thermal-active', 'print-minimalist-active', 'print-formal-active');
  };

  setTimeout(function () {
    document.body.classList.remove('print-thermal-active', 'print-minimalist-active', 'print-formal-active');
  }, 1500);
}

function printFormalInvoice() {
  switchInvoiceView('formal');
  printActiveInvoice();
}

function printReceiptInvoice() {
  switchInvoiceView('thermal');
  printActiveInvoice();
}

function renderThermalReceiptHTML(data, isActive) {
  const tx = data.transaction || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const s = data.settings || APP_SETTINGS || {};
  const c = data.customer;
  const rec = data.receivable;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const logoPrimary = s.store_logo || '';

  let receiptItemRows = '';
  items.forEach(function (i) {
    const expTag = i.expiry_date ? ('<br><span style="font-size:9px;color:#555;">Exp: ' + formatDate(i.expiry_date) + '</span>') : '';
    const batchTag = i.batch_id ? ('<br><span style="font-size:9px;color:#444;font-family:monospace;">[Batch: ' + escapeHtml(i.batch_id) + ']</span>') : '';
    const lineTotal = Number(i.price || 0) * Number(i.qty || 0);
    receiptItemRows +=
      '<tr>' +
      '<td colspan="2" style="padding-top:4px;font-weight:600;font-size:11px;">' + escapeHtml(i.product_name) + batchTag + expTag + '</td>' +
      '</tr>' +
      '<tr style="border-bottom:1px dashed #ccc;">' +
      '<td style="padding-bottom:5px;font-size:11px;color:#444;">' + i.qty + ' x ' + formatRupiah(i.price) + '</td>' +
      '<td style="padding-bottom:5px;text-align:right;font-size:11px;font-weight:700;">' + formatRupiah(lineTotal) + '</td>' +
      '</tr>';
  });

  const feeSummary = resolveTxExtraFeeSummary(tx);

  let headerLogoHtml = '';
  if (logoPrimary) {
    headerLogoHtml = '<div style="text-align:center;margin-bottom:6px;">' +
      '<img src="' + escapeHtml(logoPrimary) + '" style="max-width:130px;max-height:50px;object-fit:contain;margin:0 auto;display:block;" alt="Logo Toko">' +
      '</div>';
  } else {
    headerLogoHtml = '<div style="font-size:15px;font-weight:800;letter-spacing:0.5px;text-align:center;margin-bottom:4px;">' + escapeHtml((s.store_name || 'TOKO KASIR').toUpperCase()) + '</div>';
  }

  const tagline = s.store_tagline || s.store_slogan || 'Pusat Benih Tanaman Lokal & Edukasi Permakultur';
  let subInfoHtml = '<div style="font-size:11px;font-weight:600;color:#222;line-height:1.3;margin-bottom:2px;text-align:center;">' + escapeHtml(tagline) + '</div>';
  const contactParts = [];
  if (s.store_phone) contactParts.push('WA: ' + escapeHtml(s.store_phone));
  if (s.store_social) contactParts.push(escapeHtml(s.store_social));
  if (contactParts.length > 0) {
    subInfoHtml += '<div style="font-size:10px;color:#444;line-height:1.3;text-align:center;">' + contactParts.join(' &bull; ') + '</div>';
  }
  if (s.store_address) {
    subInfoHtml += '<div style="font-size:9.5px;color:#666;line-height:1.25;margin-top:2px;text-align:center;">' + escapeHtml(s.store_address) + '</div>';
  }

  const voidWatermarkReceipt = isVoid
    ? '<div style="border:2px dashed #DC2626;background:#FEF2F2;color:#DC2626;text-align:center;font-weight:900;font-size:12px;padding:6px;margin:6px 0;letter-spacing:1px;">*** TRANSAKSI DIBATALKAN (VOID) ***</div>'
    : '';

  return '<div id="view-receipt" class="paper-canvas thermal-mode ' + (isActive ? 'active-doc' : '') + '">' +
    '<div style="text-align:center;margin-bottom:8px;">' +
    headerLogoHtml +
    subInfoHtml +
    '</div>' +
    voidWatermarkReceipt +
    '<div style="border-top:1px dashed #222;border-bottom:1px dashed #222;padding:6px 0;margin:8px 0;font-size:10px;">' +
    '<div style="display:flex;justify-content:space-between;"><span>No. Nota:</span><span style="font-weight:bold;">#' + escapeHtml(tx.invoice_no || tx.id || '-') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Tanggal:</span><span>' + formatDate(tx.created_at) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Pelanggan:</span><span>' + escapeHtml((c && c.name) ? c.name : (tx.customer_name || 'Umum')) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Metode:</span><span>' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + (isVoid ? 'VOID' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO')) + ')</span></div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
    receiptItemRows +
    '</table>' +
    '<div style="border-top:1px dashed #222;padding-top:6px;font-size:11px;">' +
    (feeSummary.hasBreakdown ? '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Subtotal:</span><span>' + formatRupiah(feeSummary.subtotal) + '</span></div>' +
      buildTxExtraFeeHTML(feeSummary, 'thermal') : '') +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:4px;"><span>TOTAL:</span><span>' + formatRupiah(tx.total) + '</span></div>' +
    buildTxCashHTML(feeSummary, 'thermal') +
    (rec && !isVoid ? '<div style="display:flex;justify-content:space-between;font-size:11px;color:#DC2626;margin-top:2px;"><span>Sisa Piutang:</span><span>' + formatRupiah(rec.remaining) + '</span></div>' : '') +
    '</div>' +
    '<div style="border-top:1px dashed #222;margin-top:10px;padding-top:8px;text-align:center;font-size:10px;color:#444;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih atas kunjungan Anda. Salam Lestari!') +
    '<div style="margin-top:3px;font-size:9px;color:#666;">Simpan struk ini sebagai bukti transaksi benih resmi.</div>' +
    '</div>' +
    '</div>';
}

function renderMinimalistInvoiceHTML(data, isActive) {
  const tx = data.transaction || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const s = data.settings || APP_SETTINGS || {};
  const c = data.customer;
  const rec = data.receivable;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const logoPrimary = s.store_logo || '';

  const watermarkHtml = isVoid ? '<div class="invoice-void-watermark" style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-25deg);font-size:44px;font-weight:900;color:rgba(220,38,38,0.2);border:4px dashed rgba(220,38,38,0.3);padding:10px 24px;border-radius:10px;letter-spacing:2px;pointer-events:none;z-index:10;text-align:center;">DIBATALKAN (VOID)</div>' : '';

  const itemRows = items.map(function (i) {
    const expInfo = (i.expiry_date ? ('<br><span style="font-size:10.5px;color:#64748B;">Exp: ' + formatDate(i.expiry_date) + '</span>') : '') +
      (i.batch_id ? ('<br><span style="font-size:10.5px;color:#64748B;font-family:monospace;">[Batch: ' + escapeHtml(i.batch_id) + ']</span>') : '');
    return '<tr style="border-bottom:1px solid #F1F5F9;">' +
      '<td style="padding:12px 10px;vertical-align:top;font-size:13px;color:#1E293B;"><strong>' + escapeHtml(i.product_name) + '</strong>' + expInfo + '</td>' +
      '<td style="padding:12px 8px;vertical-align:top;text-align:center;font-size:13px;color:#475569;">' + i.qty + '</td>' +
      '<td style="padding:12px 10px;vertical-align:top;text-align:right;font-size:13px;color:#475569;">' + formatRupiah(i.price) + '</td>' +
      '<td style="padding:12px 10px;vertical-align:top;text-align:right;font-size:13px;font-weight:700;color:#0F172A;">' + formatRupiah(i.subtotal) + '</td>' +
      '</tr>';
  }).join('');

  let logoHeaderHtml = '';
  if (logoPrimary) {
    logoHeaderHtml = '<img src="' + escapeHtml(logoPrimary) + '" style="max-height:44px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px;" alt="Logo Toko">';
  } else {
    logoHeaderHtml = '<div style="font-size:18px;font-weight:800;color:var(--primary);letter-spacing:0.5px;">' + escapeHtml(s.store_name || 'TOKO KASIR') + '</div>';
  }

  const statusColor = isVoid ? '#DC2626' : (tx.status === 'paid' ? '#16A34A' : '#D97706');
  const statusLabel = isVoid ? 'VOID' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO');
  const feeSummary = resolveTxExtraFeeSummary(tx);

  return '<div id="view-minimalist" class="paper-canvas minimalist-mode ' + (isActive ? 'active-doc' : '') + '">' +
    watermarkHtml +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2px solid #E2E8F0;margin-bottom:20px;">' +
    '<div>' +
    logoHeaderHtml +
    '<div style="font-size:11px;color:#64748B;line-height:1.4;margin-top:4px;">' +
    '<div>' + escapeHtml(s.store_address || 'Br. Medahan, Kemenuh, Sukawati, Gianyar, Bali') + '</div>' +
    '<div>' + (s.store_phone ? 'WA: ' + escapeHtml(s.store_phone) : '') + (s.store_email ? ' &bull; Email: ' + escapeHtml(s.store_email) : '') + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;">' +
    '<div style="font-size:18px;font-weight:800;letter-spacing:0.5px;color:#2563EB;">FAKTUR PENJUALAN</div>' +
    '<div style="font-size:12px;font-family:monospace;font-weight:700;color:#334155;margin-top:2px;">#' + escapeHtml(tx.invoice_no || tx.id) + '</div>' +
    '<div style="font-size:11.5px;color:#64748B;margin-top:2px;">' + formatDate(tx.created_at) + '</div>' +
    '<div style="margin-top:4px;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:10.5px;font-weight:700;background:' + (isVoid ? '#FEE2E2' : (tx.status === 'paid' ? '#DCFCE7' : '#FEF3C7')) + ';color:' + statusColor + ';">' + statusLabel + '</span></div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:20px;background:#F8FAFC;padding:12px 16px;border-radius:6px;border:1px solid #E2E8F0;">' +
    '<div>' +
    '<div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">DITUJUKAN KEPADA:</div>' +
    '<div style="font-size:13.5px;font-weight:700;color:#0F172A;margin-top:2px;">' + escapeHtml(c ? c.name : (tx.customer_name || 'Umum')) + '</div>' +
    (c && c.phone ? '<div style="font-size:11.5px;color:#64748B;margin-top:1px;">WA: ' + escapeHtml(c.phone) + '</div>' : '') +
    '</div>' +
    '<div style="text-align:right;">' +
    '<div style="font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">PEMBAYARAN:</div>' +
    '<div style="font-size:13px;font-weight:600;color:#0F172A;margin-top:2px;">' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + escapeHtml(tx.source || 'Offline') + ')</div>' +
    (rec && !isVoid ? '<div style="font-size:11px;color:#DC2626;font-weight:600;margin-top:1px;">Sisa: ' + formatRupiah(rec.remaining) + '</div>' : '') +
    '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">' +
    '<thead>' +
    '<tr style="border-bottom:2px solid #CBD5E1;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;">' +
    '<th style="padding:8px 10px;text-align:left;">Daftar Belanja</th>' +
    '<th style="padding:8px 8px;text-align:center;width:60px;">Qty</th>' +
    '<th style="padding:8px 10px;text-align:right;width:110px;">Harga</th>' +
    '<th style="padding:8px 10px;text-align:right;width:120px;">Total</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + itemRows + '</tbody>' +
    '</table>' +
    '<div style="display:flex;justify-content:flex-end;margin-top:12px;">' +
    '<div style="width:260px;">' +
    '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#64748B;"><span>Subtotal:</span><span>' + formatRupiah(feeSummary.subtotal) + '</span></div>' +
    buildTxExtraFeeHTML(feeSummary, 'minimalist') +
    '<div style="display:flex;justify-content:space-between;padding:8px 0 4px 0;border-top:2px solid #E2E8F0;margin-top:4px;font-size:15px;font-weight:800;color:#2563EB;">' +
    '<span>Total:</span><span>' + formatRupiah(tx.total) + '</span>' +
    '</div>' +
    buildTxCashHTML(feeSummary, 'minimalist') +
    (rec && !isVoid ? '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:12px;color:#DC2626;font-weight:700;"><span>Sisa Piutang:</span><span>' + formatRupiah(rec.remaining) + '</span></div>' : '') +
    '</div>' +
    '</div>' +
    '<div style="margin-top:28px;padding-top:12px;border-top:1px dashed #CBD5E1;font-size:11px;color:#64748B;text-align:center;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih atas kunjungan Anda!') +
    '</div>' +
    '</div>';
}

function renderFormalInvoiceHTML(data, isActive) {
  const tx = data.transaction || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const s = data.settings || APP_SETTINGS || {};
  const c = data.customer;
  const rec = data.receivable;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const logoPrimary = s.store_logo || '';
  const logoLight = s.store_logo_light || logoPrimary;

  const watermarkHtml = isVoid ? '<div class="invoice-void-watermark">DIBATALKAN (VOID)</div>' : '';

  const rowsFormal = items.map(function (i, idx) {
    const expInfo = (i.expiry_date ? ('<br><span style="font-size:10px;color:#475569;">Exp: ' + formatDate(i.expiry_date) + '</span>') : '') +
      (i.batch_id ? ('<br><span style="display:inline-block;margin-top:2px;font-size:9.5px;color:#4B382A;background:#EFE9D9;padding:1px 6px;border-radius:3px;font-family:monospace;word-break:break-all;">Lot/Batch: ' + escapeHtml(i.batch_id) + '</span>') : '');
    return '<tr style="border-bottom:1px solid #E2E8F0;">' +
      '<td style="padding:8px 6px;border:1px solid #E2E8F0;text-align:center;vertical-align:top;font-size:11.5px;">' + (idx + 1) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #E2E8F0;vertical-align:top;font-size:12px;"><strong>' + escapeHtml(i.product_name) + '</strong>' + expInfo + '</td>' +
      '<td style="padding:8px 8px;border:1px solid #E2E8F0;text-align:center;vertical-align:top;font-size:12px;">' + i.qty + ' sachet</td>' +
      '<td style="padding:8px 10px;border:1px solid #E2E8F0;text-align:right;vertical-align:top;font-size:12px;">' + formatRupiah(i.price) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #E2E8F0;text-align:right;font-weight:700;vertical-align:top;font-size:12px;">' + formatRupiah(i.subtotal) + '</td>' +
      '</tr>';
  }).join('');

  const logoImgHTMLFormal = logoLight
    ? '<img src="' + escapeHtml(logoLight) + '" style="max-height:50px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px;" alt="Logo Toko">'
    : '<div style="font-size:18px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:4px;">' + escapeHtml(s.store_name || 'TOKO KASIR') + '</div>';

  let dueDateStr = '- (Lunas Langsung)';
  if (isVoid) {
    dueDateStr = 'DIBATALKAN';
  } else if (rec && rec.due_date) {
    dueDateStr = formatDate(rec.due_date);
  } else if (tx.status !== 'paid') {
    const d = new Date(tx.created_at || new Date());
    d.setDate(d.getDate() + 30);
    dueDateStr = formatDate(d);
  }

  const terbilangText = angkaTerbilang(tx.total);
  const feeSummary = resolveTxExtraFeeSummary(tx);

  return '<div id="view-formal" class="paper-canvas formal-mode ' + (isActive ? 'active-doc' : '') + '">' +
    watermarkHtml +
    '<div class="letterhead" style="background:#2563EB !important;color:#ffffff !important;margin:-15mm -20mm 18px -20mm;padding:16mm 20mm 14mm 20mm;display:flex;justify-content:space-between;align-items:flex-start;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="max-width:58%;">' +
    logoImgHTMLFormal +
    '<div style="font-size:9.5pt;opacity:0.95;margin-top:4px;line-height:1.4;">' +
    '<div>' + escapeHtml(s.store_address || 'Br. Medahan, Kemenuh, Sukawati, Gianyar, Bali 80582') + '</div>' +
    '<div>' + (s.store_phone ? 'Kontak/WA: ' + escapeHtml(s.store_phone) : '') + (s.store_email ? ' &bull; Email: ' + escapeHtml(s.store_email) : '') + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;min-width:210px;">' +
    '<div style="font-size:22px;font-weight:800;letter-spacing:1px;font-family:\'General Sans\',sans-serif;line-height:1.1;">FAKTUR PENJUALAN</div>' +
    '<table style="margin-top:6px;margin-left:auto;border-collapse:collapse;font-size:9pt;color:#ffffff !important;width:auto;">' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#ffffff !important;opacity:0.95;border:none;">No. Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;font-family:monospace;color:#ffffff !important;border:none;">#' + escapeHtml(tx.invoice_no || tx.id) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#ffffff !important;opacity:0.95;border:none;">Tanggal Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;color:#ffffff !important;border:none;">' + formatDate(tx.created_at) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#ffffff !important;opacity:0.95;border:none;">Jatuh Tempo:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:600;color:#ffffff !important;border:none;">' + dueDateStr + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#ffffff !important;opacity:0.95;border:none;">Status:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:800;color:' + (isVoid ? '#FCA5A5' : (tx.status === 'paid' ? '#86EFAC' : '#FDE047')) + ' !important;border:none;">' + (isVoid ? 'DIBATALKAN (VOID)' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO')) + '</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;background:#F8FAFC !important;padding:12px 16px;border-radius:4px;border:1px solid #E2E8F0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="flex:1;">' +
    '<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">DITAGIHKAN KEPADA:</div>' +
    '<div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">' + escapeHtml(c ? c.name : (tx.customer_name || 'Umum')) + '</div>' +
    (c && c.phone ? '<div style="font-size:11.5px;color:#475569;margin-top:1px;">WA/Telp: ' + escapeHtml(c.phone) + '</div>' : '') +
    (c && c.address ? '<div style="font-size:11px;color:#475569;margin-top:1px;">Alamat: ' + escapeHtml(c.address) + '</div>' : '') +
    '</div>' +
    '<div style="text-align:right;flex:1;">' +
    '<div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">METODE &amp; KANAL:</div>' +
    '<div style="font-weight:700;color:#0F172A;margin-top:2px;">' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + escapeHtml(tx.source || 'Offline') + ')</div>' +
    '<div style="font-size:12px;font-weight:600;margin-top:1px;color:' + (isVoid ? '#DC2626' : (tx.status === 'paid' ? '#2E7D32' : '#D97706')) + ';">' + (isVoid ? 'Status: DIBATALKAN (VOID)' : (tx.status === 'paid' ? 'Status: LUNAS' : 'Status: CICILAN / TEMPO')) + '</div>' +
    '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #E2E8F0;">' +
    '<thead>' +
    '<tr style="background:#2563EB !important;color:#ffffff !important;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<th style="padding:9px 6px;text-align:center;border:1px solid #2563EB;width:35px;">No</th>' +
    '<th style="padding:9px 10px;text-align:left;border:1px solid #2563EB;">Item Benih &amp; Batch</th>' +
    '<th style="padding:9px 8px;text-align:center;border:1px solid #2563EB;width:80px;">Kuantitas</th>' +
    '<th style="padding:9px 10px;text-align:right;border:1px solid #2563EB;width:120px;">Harga Satuan</th>' +
    '<th style="padding:9px 10px;text-align:right;border:1px solid #2563EB;width:130px;">Subtotal</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rowsFormal + '</tbody>' +
    '<tfoot>' +
    '<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#475569;font-weight:500;border:1px solid #E2E8F0;">Subtotal:</td><td style="text-align:right;padding:6px 12px;font-weight:600;border:1px solid #E2E8F0;">' + formatRupiah(feeSummary.subtotal) + '</td></tr>' +
    buildTxExtraFeeHTML(feeSummary, 'formal') +
    '<tr style="font-size:15px;font-weight:800;color:#2563EB;background:#EFF6FF !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"><td colspan="4" style="text-align:right;padding:8px 12px;border:1px solid #E2E8F0;">TOTAL FAKTUR:</td><td style="text-align:right;padding:8px 12px;border:1px solid #E2E8F0;">' + formatRupiah(tx.total) + '</td></tr>' +
    buildTxCashHTML(feeSummary, 'formal') +
    (rec && !isVoid ? '<tr style="color:#B91C1C;font-weight:700;"><td colspan="4" style="text-align:right;padding:6px 12px;border:1px solid #E2E8F0;">Sisa Piutang:</td><td style="text-align:right;padding:6px 12px;border:1px solid #E2E8F0;">' + formatRupiah(rec.remaining) + '</td></tr>' : '') +
    '</tfoot>' +
    '</table>' +
    '<div style="margin-top:10px;padding:9px 12px;background:#EFF6FF;border:1px dashed #2563EB;border-radius:4px;font-size:11.5px;color:#0F172A;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<strong>Terbilang:</strong> <em style="font-weight:700;color:#2563EB;"># ' + terbilangText + ' #</em>' +
    '</div>' +
    '<div style="margin-top:12px;padding:10px 14px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:4px;font-size:11px;color:#0F172A;display:flex;align-items:center;gap:12px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="font-size:24px;line-height:1;">🏦</div>' +
    '<div style="line-height:1.4;">' +
    '<div style="font-weight:700;color:#2563EB;font-size:11.5px;">INFORMASI PEMBAYARAN TRANSFER BANK RESMI:</div>' +
    '<div>Bank: <strong>' + escapeHtml(s.bank_name || 'BNI (Bank Negara Indonesia)') + '</strong> &bull; No. Rekening: <strong style="font-family:monospace;font-size:12px;letter-spacing:0.5px;">' + escapeHtml(s.bank_account || '0178 849 203') + '</strong></div>' +
    '<div>Atas Nama: <strong>' + escapeHtml(s.bank_account_name || 'Rekening Toko') + '</strong> &bull; <span style="font-size:10px;color:#475569;">Mohon cantumkan No. Faktur pada berita transfer</span></div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:30px;margin-top:24px;padding-top:10px;font-size:11.5px;text-align:center;">' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#475569;">Tanda Terima Pelanggan / Penerima,</div>' +
    '<div style="height:50px;"></div>' +
    '<div style="font-weight:700;color:#0F172A;border-bottom:1px solid #0F172A;display:inline-block;min-width:160px;padding-bottom:2px;">( ' + escapeHtml(c ? c.name : (tx.customer_name || '_____________________')) + ' )</div>' +
    '<div style="font-size:10px;color:#475569;margin-top:2px;">Nama Terang &amp; Cap</div>' +
    '</div>' +
    renderFinanceSignatureBlock(tx, s, false) +
    '</div>' +
    '<div style="text-align:center;color:#475569;font-size:10.5px;margin-top:20px;border-top:1px dashed #E2E8F0;padding-top:8px;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih atas kunjungan Anda!') +
    '</div>' +
    '</div>';
}

function buildInvoiceRenderAreaHTML(data, activeMode) {
  if (activeMode === 'minimalis') activeMode = 'minimalist';
  if (!activeMode || (activeMode !== 'thermal' && activeMode !== 'minimalist' && activeMode !== 'formal')) {
    activeMode = 'formal';
  }
  return '<div id="invoice-render-area">' +
    renderThermalReceiptHTML(data, activeMode === 'thermal') +
    renderMinimalistInvoiceHTML(data, activeMode === 'minimalist') +
    renderFormalInvoiceHTML(data, activeMode === 'formal') +
    '</div>';
}

function buildInvoiceControlBarHTML(tx, activeMode) {
  if (activeMode === 'minimalis') activeMode = 'minimalist';
  if (!activeMode) activeMode = 'formal';
  return '<div class="no-print" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;">' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    '<div class="invoice-format-tabs">' +
    '<button type="button" class="invoice-format-tab-btn ' + (activeMode === 'thermal' ? 'active' : '') + '" data-mode="thermal" onclick="switchInvoiceView(\'thermal\')">🧾 Struk Termal (58mm)</button>' +
    '<button type="button" class="invoice-format-tab-btn ' + (activeMode === 'minimalist' ? 'active' : '') + '" data-mode="minimalist" onclick="switchInvoiceView(\'minimalist\')">📄 Faktur Minimalis</button>' +
    '<button type="button" class="invoice-format-tab-btn ' + (activeMode === 'formal' ? 'active' : '') + '" data-mode="formal" onclick="switchInvoiceView(\'formal\')">🏛️ Faktur Formal (A4)</button>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
    renderInvoiceSignButtonHTML(tx) +
    '<button type="button" class="btn btn-primary btn-sm" onclick="printActiveInvoice()" style="font-weight:700;"><span style="font-size:13px;">🖨️</span> Cetak / Simpan PDF</button>' +
    '<button type="button" class="btn btn-secondary btn-sm btn-tx-wa" onclick="sendReceiptToWhatsApp(window._curInv)" style="background:#25D366;color:#FFFFFF;border-color:#25D366;font-weight:600;">📲 Kirim WA</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">✕ Tutup</button>' +
    '</div>' +
    '</div>';
}

function scrollToFakturListMobile() {
  const listCard = document.querySelector('.faktur-list-card');
  if (listCard && window.innerWidth <= 768) {
    listCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
window.scrollToFakturListMobile = scrollToFakturListMobile;

function closeInvoicePanel() {
  const panel = document.getElementById('invoice-panel');
  if (panel) {
    panel.innerHTML =
      '<div class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary);">' +
      '<div style="font-size:40px;margin-bottom:10px;">🧾</div>' +
      '<h3 style="font-size:16px;color:var(--text-main);margin-bottom:6px;">Pilih Transaksi</h3>' +
      '<p style="font-size:13px;">Klik salah satu nota di panel kiri untuk membuka faktur dan menu aksinya.</p>' +
      '</div>';
  }
  scrollToFakturListMobile();
}

function openInvoiceModal(transactionId, template) {
  if (template === 'minimalis') template = 'minimalist';
  if (!template) template = 'formal';
  CURRENT_INVOICE_VIEW_MODE = template;

  showToast('Memuat dokumen faktur #' + transactionId + '...');
  api('getInvoiceData', TOKEN, transactionId).then(function (data) {
    if (!data || !data.transaction) {
      showToast('Data transaksi tidak ditemukan.', true);
      return;
    }
    window._curInv = data;
    const tx = data.transaction;

    const title = '📄 Pratinjau Dokumen Faktur #' + escapeHtml(tx.id);
    const bodyHtml = buildInvoiceControlBarHTML(tx, template) + buildInvoiceRenderAreaHTML(data, template);

    const footerHtml =
      '<div class="no-print" style="display:flex;justify-content:space-between;align-items:center;width:100%;flex-wrap:wrap;gap:8px;">' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="printActiveInvoice()" style="font-weight:700;"><span style="font-size:13px;">🖨️</span> Cetak / Simpan PDF</button>' +
      '<button type="button" class="btn btn-secondary btn-sm btn-tx-wa" onclick="sendReceiptToWhatsApp(window._curInv)" style="background:#25D366;color:#FFFFFF;border-color:#25D366;font-weight:600;">📲 Kirim WA</button>' +
      '</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">✕ Tutup</button>' +
      '</div>';

    openModal(title, bodyHtml, footerHtml, true);
    setTimeout(function () {
      switchInvoiceView(template);
    }, 50);
  }).catch(function (err) {
    showToast('Gagal memuat faktur: ' + (err.message || err), true);
  });
}

function claimSeedFromTransaction(txId, custName, custPhone, productId, batchId) {
  closeModal();
  setTimeout(function () {
    openClaimModal({
      transaction_id: txId,
      customer_name: custName,
      customer_phone: custPhone,
      product_id: productId,
      batch_id: batchId
    });
  }, 120);
}

function openTransactionHistoryModal() {
  api('getRecentTransactionsForInvoice', TOKEN).then(function (txs) {
    window._txHistoryList = Array.isArray(txs) ? txs : [];
    const bodyHtml =
      '<div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">' +
      '<input type="text" id="tx-hist-search" class="topbar-search" placeholder="Cari nomor nota atau nama pelanggan..." oninput="filterTransactionHistoryModal(this.value)" style="flex:1;">' +
      '</div>' +
      '<div id="tx-hist-container" style="max-height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px;"></div>';

    openModal('Riwayat Transaksi Terbaru', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal()">Tutup</button>', true);
    filterTransactionHistoryModal('');
  }).catch(function (err) {
    showToast('Gagal memuat riwayat: ' + (err.message || err), true);
  });
}

function filterTransactionHistoryModal(query) {
  const container = document.getElementById('tx-hist-container');
  if (!container) return;
  const list = window._txHistoryList || [];
  query = (query || '').toLowerCase().trim();

  const filtered = list.filter(function (t) {
    return !query ||
      String(t.id || '').toLowerCase().includes(query) ||
      String(t.customer_name || '').toLowerCase().includes(query) ||
      String(t.payment_method || '').toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-secondary);">Tidak ada transaksi yang cocok.</div>';
    return;
  }

  container.innerHTML = filtered.map(function (t) {
    const isLunas = t.status === 'paid';
    const statusBadge = isLunas
      ? '<span class="badge badge-success">Lunas</span>'
      : '<span class="badge badge-warning">Tempo</span>';

    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);">' +
      '<div>' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
      '<strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:13px;">#' + escapeHtml(t.id) + '</strong>' +
      statusBadge +
      '</div>' +
      '<div style="font-size:13px;font-weight:600;margin-top:3px;color:var(--text-main);">' +
      'Pelanggan: ' + escapeHtml(t.customer_name || 'Umum') +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
      formatDate(t.created_at) + ' &bull; ' + escapeHtml(t.payment_method || 'Tunai') +
      '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div style="font-size:14px;font-weight:800;color:var(--accent);font-family:\'JetBrains Mono\',monospace;">' +
      formatRupiah(t.total) +
      '</div>' +
      '<div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end;">' +
      '<button type="button" class="btn btn-primary btn-sm" style="padding:3px 10px;font-size:11px;" onclick="openTransactionDetailModal(\'' + t.id + '\')">🔍 Rincian</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" style="padding:3px 10px;font-size:11px;" onclick="startEditTransaction(\'' + t.id + '\')">✏️ Koreksi</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

function openFindTransactionToEditModal() {
  openTransactionHistoryModal();
}


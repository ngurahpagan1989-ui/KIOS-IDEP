// ========================= KEMAS MANDIRI & PRODUKSI BENIH =========================
function renderProduksi(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  const cachedProds = getCachedData('products');
  const cachedHistory = getCachedData('productions');
  const cachedBatches = getCachedData('batches');

  if (!forceRefresh && cachedProds && cachedHistory && cachedBatches) {
    drawProduksiUI(cachedProds, cachedHistory, cachedBatches);
    if (isCacheValid('productions') && isCacheValid('products') && isCacheValid('batches')) {
      return;
    }
  } else if (!cachedHistory) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat formulir kemas mandiri...</div></div>';
  }

  const fetchProducts = (!forceRefresh && isCacheValid('products') && cachedProds)
    ? Promise.resolve(cachedProds)
    : api('getProducts', TOKEN);
  const fetchProductions = api('getProductions', TOKEN);
  const fetchBatches = (!forceRefresh && isCacheValid('batches') && cachedBatches)
    ? Promise.resolve(cachedBatches)
    : api('getStockBatches', TOKEN).catch(function () { return []; });

  Promise.all([
    fetchProducts,
    fetchProductions,
    fetchBatches
  ]).then(function (results) {
    const allProducts = Array.isArray(results[0]) ? results[0] : [];
    const history = Array.isArray(results[1]) ? results[1] : [];
    const batches = Array.isArray(results[2]) ? results[2] : [];

    setCachedData('products', allProducts);
    setCachedData('productions', history);
    setCachedData('batches', batches);

    drawProduksiUI(allProducts, history, batches);
  }).catch(function (err) {
    if (!cachedHistory) {
      showToast('Gagal memuat data: ' + (err.message || err), true);
    }
  });
}

function drawProduksiUI(allProducts, history, allBatches) {
  const content = document.getElementById('content');
  if (!content) return;
  const todayStr = new Date().toISOString().split('T')[0];

  const batches = Array.isArray(allBatches)
    ? allBatches
    : (DATA_CACHE.batches && Array.isArray(DATA_CACHE.batches.data) ? DATA_CACHE.batches.data : []);

  // Hitung akumulasi qty_remaining > 0 dari tabel stock_batches per produk
  const batchStockMap = {};
  const batchCodeMap = {};
  batches.forEach(function (b) {
    if (!b) return;
    const pId = String(b.product_id !== undefined && b.product_id !== null ? b.product_id : '');
    const bId = String(b.id !== undefined && b.id !== null ? b.id : '');
    if (bId) {
      batchCodeMap[bId] = b.batch_code || bId;
    }
    if (!pId) return;
    const rem = Number(b.qty_remaining || 0);
    if (rem > 0) {
      batchStockMap[pId] = (batchStockMap[pId] || 0) + rem;
    }
  });

  function isCurahType(p) {
    if (!p) return false;
    const invType = String(p.inventory_type || '').trim().toLowerCase();
    const unit = String(p.unit || '').trim().toLowerCase();
    if (p.inventory_type === 'curah' || p.inventory_type === 'Curah Mentah') return true;
    if (invType === 'curah' || invType === 'curah mentah' || invType === 'curah_mentah') return true;
    if (unit === 'gr' || unit === 'gram' || unit === 'g' || isRawProduct(p.unit)) return true;
    return false;
  }

  const rawSources = (allProducts || []).filter(function (p) {
    if (!p) return false;
    const isActive = p.active !== false && p.active !== 0 && p.active !== 'false';
    if (!isActive) return false;

    // Pastikan pengecekan tipe persediaan mencakup variasi: inventory_type === 'curah', inventory_type === 'Curah Mentah', atau unit === 'gr'
    if (!isCurahType(p)) return false;

    // Cek ketersediaan stok riil: akumulasi qty_remaining > 0 dari stock_batches atau master stock
    const batchStock = batchStockMap[String(p.id)] || 0;
    const masterStock = Number(p.stock || 0);
    const realStock = batchStock > 0 ? batchStock : masterStock;

    p._realStock = realStock;
    return realStock > 0;
  });

  const targetPacks = (allProducts || []).filter(function (p) {
    if (!p) return false;
    const isActive = p.active !== false && p.active !== 0 && p.active !== 'false';
    if (!isActive) return false;
    return !isCurahType(p);
  });

  content.innerHTML =
    '<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">' +
    '<div>' +
    '<h1 class="page-title">Kemas Mandiri &amp; Produksi</h1>' +
    '<p class="page-subtitle">Konversi bahan curah gram ke produk sachet siap jual dengan penomoran lot dan kalkulasi HPP otomatis.</p>' +
    '</div>' +
    '<div class="page-actions">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'produksi\')" title="Buka Panduan Kemas Mandiri"><i class="fas fa-book-open" style="margin-right:5px;"></i>📖 Panduan Kemas</button>' +
    '</div>' +
    '</div>' +
    '<div class="card" style="margin-bottom:20px;">' +
    '<h3 style="margin-bottom:14px;">Formulir Pengemasan Baru</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">' +
    '<div>' +
    '<label class="field-label">Bahan Baku (Curah/Gram)</label>' +
    '<div class="input-wrapper">' +
    '<select id="prod-source" onchange="updateProductionSourceInfo()" style="padding-left:14px;">' +
    '<option value="">-- Pilih Bahan Baku Curah --</option>' +
    rawSources.map(function (s) {
      const sisa = s._realStock !== undefined ? s._realStock : (batchStockMap[String(s.id)] || s.stock || 0);
      return '<option value="' + escapeHtml(s.id) + '">' + escapeHtml(s.name) + ' (Sisa: ' + sisa + ' gr)</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Pilih Batch Asal (Lot Bahan Curah)</label>' +
    '<div class="input-wrapper">' +
    '<select id="prod-source-batch" onchange="onProductionBatchChange()" style="padding-left:14px;" disabled>' +
    '<option value="">-- Pilih Bahan Baku Dulu --</option>' +
    '</select>' +
    '</div>' +
    '<div id="prod-batch-info" style="font-size:11px;color:var(--text-secondary);margin-top:4px;display:none;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Target Kemasan (Siap Jual)</label>' +
    '<div class="input-wrapper">' +
    '<select id="prod-target" onchange="onPackagingTargetChange()" style="padding-left:14px;">' +
    '<option value="">-- Pilih Kemasan Pcs --</option>' +
    targetPacks.map(function (t) {
      const netLabel = t.weight_grams ? (' [' + t.weight_grams + ' gr]') : (t.variant ? (' [' + t.variant + ']') : '');
      return '<option value="' + t.id + '">' + escapeHtml(t.name) + netLabel + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">No. Batch / Lot Kemasan Baru (1:1 Otomatis)</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="prod-lot-no" readonly placeholder="Otomatis mengikuti batch bahan mentah" style="padding-left:14px;background:var(--surface-muted);font-weight:600;font-family:\'JetBrains Mono\',monospace;">' +
    '</div>' +
    '<small id="prod-batch-sync-label" style="font-size:11px;color:var(--primary);margin-top:4px;display:block;">ℹ️ Nomor batch kemasan sachet otomatis mengikuti kode batch bahan mentah terpilih.</small>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;">' +
    '<label class="field-label" style="margin-bottom:0;">Gram Diambil (Total)</label>' +
    '<span id="prod-gram-max-btn" style="font-size:11px;display:none;"></span>' +
    '</div>' +
    '<div class="input-wrapper" style="margin-top:4px;">' +
    '<input type="number" id="prod-gram-used" placeholder="500" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
    '</div>' +
    '<div id="prod-gram-hint" style="font-size:11px;margin-top:4px;display:none;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Gram Per Kemasan</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="prod-gram-pack" value="10" min="1" placeholder="10" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Hasil Estimasi Teoritis</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="prod-theoretical" readonly style="padding-left:14px;background:var(--surface-muted);" value="0 pcs">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Pcs Riil Dihasilkan</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="prod-pcs-actual" placeholder="Pcs nyata" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">BIAYA KEMASAN / PCS (PLASTIK &amp; LABEL)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="pack-packaging-cost" value="0" min="0" placeholder="0" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Tgl Produksi / Kemas</label>' +
    '<div class="input-wrapper">' +
    '<input type="date" id="prod-date" value="' + todayStr + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Tgl Kadaluarsa Kemasan</label>' +
    '<div class="input-wrapper">' +
    '<input type="date" id="prod-expiry" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="prod-hpp-preview" style="background:var(--surface-muted);padding:12px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">' +
    '<div>' +
    '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;">Rincian Modal &amp; Biaya</div>' +
    '<div style="font-size:13px;margin-top:2px;">' +
    'Modal Benih: <strong id="preview-modal-benih" style="color:var(--text-main);">Rp 0</strong> &bull; ' +
    'Biaya Kemas: <strong id="preview-biaya-kemas" style="color:var(--text-main);">Rp 0</strong>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;">' +
    '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;">Estimasi HPP Final / Sachet</div>' +
    '<div id="preview-hpp-final" style="font-size:18px;font-weight:800;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">Rp 0 / pcs</div>' +
    '</div>' +
    '</div>' +
    '<div style="margin-top:16px;text-align:right;">' +
    '<button type="button" class="btn btn-primary" onclick="submitProduction()">⚡ Proses &amp; Terbitkan Stok Kemasan</button>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<h3 style="margin-bottom:14px;">Riwayat Produksi Pengemasan</h3>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Tanggal</th>' +
    '<th>Bahan Curah (Batch Asal)</th>' +
    '<th>Gram Terpakai</th>' +
    '<th>Hasil Jadi</th>' +
    '<th>Pcs</th>' +
    '<th>HPP / Pcs</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (history.length ? history.map(function (row) {
      const bCode = row.source_batch_code || row.lot_no || batchCodeMap[String(row.source_batch_id || '')] || row.source_batch_id;
      const batchTag = bCode ? ('<br><span class="badge badge-neutral" style="font-size:10px;font-family:\'JetBrains Mono\',monospace;margin-top:2px;">Lot: ' + escapeHtml(bCode) + '</span>') : '';
      const hppVal = (row.cost_per_unit !== undefined && row.cost_per_unit !== null)
        ? Number(row.cost_per_unit)
        : Number(row.hpp_per_piece || 0);
      const hppDisplay = `Rp ${Number(hppVal || 0).toLocaleString('id-ID')}`;
      return '<tr>' +
        '<td>' + formatDateIndo(row.created_at) + '</td>' +
        '<td><strong>' + escapeHtml(row.source_name) + '</strong>' + batchTag + '</td>' +
        '<td>' + row.gram_used + ' gr</td>' +
        '<td><strong>' + escapeHtml(row.target_name) + '</strong></td>' +
        '<td><span class="badge badge-success">+' + row.pcs_produced + ' pcs</span></td>' +
        '<td><strong>' + hppDisplay + '</strong></td>' +
        '<td style="text-align:right;"><button type="button" class="btn btn-danger btn-sm" onclick="deleteProductionUI(\'' + row.id + '\')">Batal</button></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div style="text-align:center;padding:20px;">Belum ada riwayat pengemasan.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>';
}

function onPackagingTargetChange() {
  const tgtSelect = document.getElementById('prod-target');
  if (tgtSelect && tgtSelect.value) {
    const p = (PRODUCTS_CACHE || []).find(function (x) { return String(x.id) === String(tgtSelect.value); });
    if (p) {
      let gram = Number(p.weight_grams || 0);
      if (!gram && p.variant) {
        const m = String(p.variant).match(/(\d+(?:\.\d+)?)\s*(?:g|gr|gram)/i);
        if (m) gram = Number(m[1]);
      }
      if (gram > 0) {
        const gramInput = document.getElementById('prod-gram-pack');
        if (gramInput) {
          gramInput.value = gram;
        }
      }
    }
  }
  calculateTheoreticalPcs();
}

function calculateTheoreticalPcs() {
  const gramInput = document.getElementById('prod-gram-used');
  const gramUsed = Number(gramInput ? gramInput.value : 0);
  const gramPack = Number(document.getElementById('prod-gram-pack') ? document.getElementById('prod-gram-pack').value : 0);
  const resultEl = document.getElementById('prod-theoretical');
  const actualEl = document.getElementById('prod-pcs-actual');
  const batchSelect = document.getElementById('prod-source-batch');
  const hintEl = document.getElementById('prod-gram-hint');
  const maxBtnEl = document.getElementById('prod-gram-max-btn');
  const modalPreview = document.getElementById('preview-modal-benih');
  const kemasPreview = document.getElementById('preview-biaya-kemas');
  const hppPreview = document.getElementById('preview-hpp-final');
  const packagingCostInput = document.getElementById('pack-packaging-cost');
  const packagingCostPerPcs = Number(packagingCostInput ? packagingCostInput.value : 0);

  let remain = null;
  let hppPerGram = 0;
  if (batchSelect && batchSelect.selectedIndex > 0) {
    const opt = batchSelect.options[batchSelect.selectedIndex];
    if (opt && opt.dataset.remaining !== undefined) {
      remain = Number(opt.dataset.remaining || 0);
    }
    hppPerGram = opt ? Number(opt.dataset.cost !== undefined ? opt.dataset.cost : (opt.dataset.price || 0)) : 0;
  }

  if (remain !== null && maxBtnEl) {
    maxBtnEl.style.display = 'inline-block';
    maxBtnEl.innerHTML = '<a href="javascript:void(0)" onclick="setGramToBatchMax(' + remain + ')" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">Pakai Maks (' + remain + ' gr)</a>';
  } else if (maxBtnEl) {
    maxBtnEl.style.display = 'none';
  }

  if (remain !== null && gramUsed > remain) {
    if (gramInput) gramInput.style.borderColor = '#ef4444';
    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.style.color = '#ef4444';
      hintEl.innerHTML = '⚠️ Melebihi sisa fisik batch! Tersedia hanya <strong>' + remain + ' gr</strong> (kurang ' + (gramUsed - remain) + ' gr). <a href="javascript:void(0)" onclick="setGramToBatchMax(' + remain + ')" style="color:#ef4444;text-decoration:underline;font-weight:600;">Pakai ' + remain + ' gr</a>';
    }
  } else {
    if (gramInput) gramInput.style.borderColor = '';
    if (hintEl) {
      if (remain !== null && gramUsed > 0) {
        hintEl.style.display = 'block';
        hintEl.style.color = 'var(--text-secondary)';
        hintEl.innerHTML = '✓ Sisa batch setelah dikemas: <strong>' + (remain - gramUsed) + ' gr</strong>';
      } else {
        hintEl.style.display = 'none';
      }
    }
  }

  let theoreticalPcs = 0;
  if (gramUsed > 0 && gramPack > 0) {
    theoreticalPcs = Math.floor(gramUsed / gramPack);
    if (resultEl) resultEl.value = theoreticalPcs + ' pcs';
    if (actualEl && (!actualEl.value || actualEl.dataset.autoFilled === 'true')) {
      actualEl.value = theoreticalPcs;
      actualEl.dataset.autoFilled = 'true';
    }
  } else {
    if (resultEl) resultEl.value = '0 pcs';
  }

  const effectivePcs = Number(actualEl && actualEl.value ? actualEl.value : theoreticalPcs);
  if (effectivePcs > 0 && gramUsed > 0 && hppPerGram > 0) {
    const modalBenihPerPcs = Math.round((gramUsed * hppPerGram) / effectivePcs);
    const hppFinal = modalBenihPerPcs + packagingCostPerPcs;
    if (modalPreview) modalPreview.textContent = formatRupiah(modalBenihPerPcs);
    if (kemasPreview) kemasPreview.textContent = formatRupiah(packagingCostPerPcs);
    if (hppPreview) hppPreview.textContent = formatRupiah(hppFinal) + ' / pcs';
  } else {
    if (modalPreview) modalPreview.textContent = 'Rp 0';
    if (kemasPreview) kemasPreview.textContent = formatRupiah(packagingCostPerPcs);
    if (hppPreview) hppPreview.textContent = 'Rp 0 / pcs';
  }
}

function setGramToBatchMax(maxVal) {
  const gramInput = document.getElementById('prod-gram-used');
  if (gramInput) {
    gramInput.value = maxVal;
    calculateTheoreticalPcs();
  }
}

function updateProductionSourceInfo() {
  calculateTheoreticalPcs();
  const srcSelect = document.getElementById('prod-source');
  const tgtSelect = document.getElementById('prod-target');
  const srcId = srcSelect ? srcSelect.value : '';
  const batchSelect = document.getElementById('prod-source-batch');
  const batchInfo = document.getElementById('prod-batch-info');
  const lotNoInput = document.getElementById('prod-lot-no');
  const syncLabel = document.getElementById('prod-batch-sync-label');
  const hintEl = document.getElementById('prod-gram-hint');
  const maxBtnEl = document.getElementById('prod-gram-max-btn');
  if (hintEl) hintEl.style.display = 'none';
  if (maxBtnEl) maxBtnEl.style.display = 'none';
  if (!batchSelect) return;

  if (lotNoInput) lotNoInput.value = '';
  if (syncLabel) syncLabel.innerHTML = 'ℹ️ Nomor batch kemasan sachet otomatis mengikuti kode batch bahan mentah terpilih.';

  // Otomatis pre-select target kemasan yang cocok dengan varietas bahan curah
  if (srcSelect && tgtSelect && srcSelect.selectedIndex > 0) {
    const srcText = srcSelect.options[srcSelect.selectedIndex].text.toLowerCase();
    const cleanName = srcText.replace(/\(sisa.*?\)/gi, '').replace(/\(curah.*?\)/gi, '').replace(/curah/gi, '').trim();
    for (let i = 1; i < tgtSelect.options.length; i++) {
      const tgtText = tgtSelect.options[i].text.toLowerCase();
      if (cleanName && tgtText.includes(cleanName) && (tgtText.includes('kemasan') || tgtText.includes('sachet') || tgtText.includes('pack'))) {
        tgtSelect.selectedIndex = i;
        break;
      }
    }
  }

  if (!srcId) {
    batchSelect.innerHTML = '<option value="">-- Pilih Bahan Baku Dulu --</option>';
    batchSelect.disabled = true;
    if (batchInfo) batchInfo.style.display = 'none';
    return;
  }

  batchSelect.disabled = true;
  batchSelect.innerHTML = '<option value="">⏳ Mengambil daftar batch...</option>';
  if (batchInfo) batchInfo.style.display = 'none';

  api('getStockBatches', TOKEN, srcId).then(function (batches) {
    batchSelect.disabled = false;
    const available = (Array.isArray(batches) ? batches : []).filter(function (b) {
      const qcUpper = String(b.qc_status || '').toUpperCase();
      const isApproved = !b.qc_status || qcUpper === 'APPROVED' || qcUpper === 'PASSED' || qcUpper === '';
      const isNotQuarantine = String(b.quality_status || '').toUpperCase() !== 'QUARANTINE';
      return Number(b.qty_remaining || 0) > 0 && isApproved && isNotQuarantine;
    });

    if (available.length === 0) {
      batchSelect.innerHTML = '<option value="">-- Tidak ada batch benih yang lolos QC (APPROVED) --</option>';
      return;
    }

    let optionsHtml = '<option value="">-- Pilih Batch Asal Bahan Baku --</option>';
    available.forEach(function (b) {
      const expStr = b.expiry_date ? (' | Exp: ' + formatDate(b.expiry_date)) : '';
      const prodStr = b.production_date ? ('Tgl: ' + formatDate(b.production_date)) : ('Masuk: ' + formatDate(b.received_at));
      const hppPerGram = Number(b.cost_per_unit !== undefined && b.cost_per_unit !== null ? b.cost_per_unit : (b.buy_price || 0));
      const displayCode = b.batch_code || b.id;
      optionsHtml += '<option value="' + escapeHtml(b.id) + '" data-code="' + escapeHtml(displayCode) + '" data-remaining="' + b.qty_remaining + '" data-expiry="' + escapeHtml(b.expiry_date || '') + '" data-proddate="' + escapeHtml(b.production_date || '') + '" data-price="' + (b.buy_price || 0) + '" data-cost="' + hppPerGram + '">' +
        escapeHtml(displayCode) + ' — Sisa ' + b.qty_remaining + ' gr (' + prodStr + expStr + ')' +
        '</option>';
    });

    batchSelect.innerHTML = optionsHtml;
  }).catch(function (err) {
    batchSelect.disabled = false;
    batchSelect.innerHTML = '<option value="">Gagal memuat batch</option>';
    showToast('Gagal memuat batch produk: ' + (err.message || err), true);
  });
}

function onProductionBatchChange() {
  const batchSelect = document.getElementById('prod-source-batch');
  const batchInfo = document.getElementById('prod-batch-info');
  const expiryInput = document.getElementById('prod-expiry');
  const prodDateInput = document.getElementById('prod-date');
  const lotNoInput = document.getElementById('prod-lot-no');
  const syncLabel = document.getElementById('prod-batch-sync-label');
  if (!batchSelect) return;

  const selectedOpt = batchSelect.options[batchSelect.selectedIndex];
  if (!selectedOpt || !selectedOpt.value) {
    if (batchInfo) batchInfo.style.display = 'none';
    if (lotNoInput) lotNoInput.value = '';
    if (syncLabel) syncLabel.innerHTML = 'ℹ️ Nomor batch kemasan sachet otomatis mengikuti kode batch bahan mentah terpilih.';
    calculateTheoreticalPcs();
    return;
  }

  const remain = Number(selectedOpt.dataset.remaining || 0);
  const expiry = selectedOpt.dataset.expiry || '';
  const prodDate = selectedOpt.dataset.proddate || '';
  const price = Number(selectedOpt.dataset.cost !== undefined ? selectedOpt.dataset.cost : (selectedOpt.dataset.price || 0));
  const displayCode = selectedOpt.dataset.code || selectedOpt.value;

  // Otomatis sinkronkan kode batch kemasan sama persis 1:1 dengan batch asal
  if (lotNoInput) {
    lotNoInput.value = displayCode;
  }
  if (syncLabel) {
    syncLabel.innerHTML = '✅ Batch Kemasan: <strong style="font-family:\'JetBrains Mono\',monospace;">' + escapeHtml(displayCode) + '</strong> (1:1 identik bahan mentah)';
  }

  if (batchInfo) {
    batchInfo.style.display = 'block';
    batchInfo.innerHTML = '📦 Batch: <strong>' + escapeHtml(displayCode) + '</strong> | Sisa Fisik: <strong style="color:var(--primary);">' + remain + ' gr</strong> | Modal: ' + formatRupiah(price) + '/gr';
  }

  // Mewarisi tanggal produksi dan kadaluarsa jika tersedia
  if (prodDate && prodDateInput) {
    prodDateInput.value = prodDate.split(' ')[0];
  }
  if (expiry && expiryInput) {
    expiryInput.value = expiry.split(' ')[0];
  }

  // Evaluasi ulang input gram terhadap sisa stok batch yang baru dipilih
  calculateTheoreticalPcs();
}

function submitProduction() {
  const srcId = document.getElementById('prod-source').value;
  const tgtId = document.getElementById('prod-target').value;
  const batchSelect = document.getElementById('prod-source-batch');
  const srcBatchId = batchSelect ? batchSelect.value : '';
  const gramUsed = Number(document.getElementById('prod-gram-used').value || 0);
  const gramPack = Number(document.getElementById('prod-gram-pack').value || 0);
  const pcsActual = Number(document.getElementById('prod-pcs-actual').value || 0);
  const packagingCostInput = document.getElementById('pack-packaging-cost');
  const biayaKemasanPerPcs = packagingCostInput ? Math.max(0, Number(packagingCostInput.value || 0)) : 0;
  const prodDate = document.getElementById('prod-date') ? document.getElementById('prod-date').value : '';
  const expiry = document.getElementById('prod-expiry').value;

  if (!srcId || !tgtId) { showToast('Pilih bahan baku dan produk kemasan jadi.', true); return; }
  if (!srcBatchId) { showToast('Wajib memilih salah satu batch bahan mentah dari daftar.', true); return; }
  if (gramUsed <= 0) { showToast('Gram terpakai harus lebih dari 0.', true); return; }
  if (pcsActual <= 0) { showToast('Jumlah pcs dihasilkan harus lebih dari 0.', true); return; }

  let hppPerGram = 0;
  if (batchSelect) {
    const opt = batchSelect.options[batchSelect.selectedIndex];
    const remain = opt ? Number(opt.dataset.remaining || 0) : 0;
    hppPerGram = opt ? Number(opt.dataset.cost !== undefined ? opt.dataset.cost : (opt.dataset.price || 0)) : 0;
    if (isNaN(hppPerGram) || !isFinite(hppPerGram)) hppPerGram = 0;

    if (remain <= 0) {
      showToast('Batch terpilih tidak memiliki sisa stok!', true);
      return;
    }
    if (gramUsed > remain) {
      showToast('Gram diambil (' + gramUsed + ' gr) melebihi sisa fisik batch terpilih (' + remain + ' gr)!', true);
      return;
    }
  }

  // Hitung kalkulasi HPP otomatis:
  // - modalBenihPerPcs = (gramDiambil * hppPerGram) / pcsRiil
  // - hppFinalSachet = modalBenihPerPcs + biayaKemasanPerPcs
  let modalBenihPerPcs = pcsActual > 0 ? ((gramUsed * hppPerGram) / pcsActual) : 0;
  if (isNaN(modalBenihPerPcs) || !isFinite(modalBenihPerPcs)) modalBenihPerPcs = 0;

  let hppFinalSachet = Math.round(modalBenihPerPcs + biayaKemasanPerPcs);
  if (isNaN(hppFinalSachet) || !isFinite(hppFinalSachet)) hppFinalSachet = 0;

  let buyPriceRounded = Math.round(modalBenihPerPcs);
  if (isNaN(buyPriceRounded) || !isFinite(buyPriceRounded)) buyPriceRounded = 0;

  const tgtSelect = document.getElementById('prod-target');
  const tgtName = (tgtSelect && tgtSelect.selectedIndex >= 0) ? tgtSelect.options[tgtSelect.selectedIndex].text.trim() : '';
  const srcSelect = document.getElementById('prod-source');
  const srcName = (srcSelect && srcSelect.selectedIndex >= 0) ? srcSelect.options[srcSelect.selectedIndex].text.trim() : '';
  const selectedBatchOpt = (batchSelect && batchSelect.selectedIndex >= 0) ? batchSelect.options[batchSelect.selectedIndex] : null;
  const srcBatchCode = selectedBatchOpt ? (selectedBatchOpt.dataset.code || selectedBatchOpt.text.split('(')[0].trim()) : srcBatchId;
  const lotNo = document.getElementById('prod-lot-no') ? document.getElementById('prod-lot-no').value : srcBatchCode;

  showToast('Memproses kemas mandiri & pembaruan saldo...');
  api('processProduction', TOKEN, {
    source_product_id: srcId,
    source_batch_id: srcBatchId,
    source_batch_code: srcBatchCode,
    source_product_name: srcName,
    target_product_id: tgtId,
    target_product_name: tgtName,
    lot_no: lotNo,
    gram_used: gramUsed,
    gram_per_pack: gramPack,
    pcs_produced: pcsActual,
    production_date: prodDate,
    expiry_date: expiry,
    hpp_per_piece: hppFinalSachet,
    cost_per_unit: hppFinalSachet,
    buy_price: buyPriceRounded,
    seed_cost_per_unit: buyPriceRounded,
    modal_benih_per_pcs: buyPriceRounded,
    packaging_cost_per_unit: biayaKemasanPerPcs,
    packaging_cost: Math.round(biayaKemasanPerPcs * pcsActual),
    seed_cost: Math.round(gramUsed * hppPerGram),
    hpp_per_gram: hppPerGram
  }).then(async function (res) {
    // Sinkronisasi tabel products & packaging_logs di database Supabase secara langsung
    try {
      if (window.supabase) {
        // A. Ambil sisa saldo terbaru seluruh batch aktif produk curah sumber & update produk curah
        const { data: sBatches } = await window.supabase
          .from('stock_batches')
          .select('qty_remaining')
          .eq('product_id', srcId);
        const newSrcStock = (sBatches || []).reduce(function (sum, b) { return sum + Number(b.qty_remaining || 0); }, 0);
        await window.supabase.from('products').update({ stock: newSrcStock, updated_at: new Date().toISOString() }).eq('id', srcId);

        // B. Ambil total saldo terbaru seluruh batch produk kemasan target & update produk kemasan
        const { data: tBatches } = await window.supabase
          .from('stock_batches')
          .select('qty_remaining')
          .eq('product_id', tgtId);
        const newTgtStock = (tBatches || []).reduce(function (sum, b) { return sum + Number(b.qty_remaining || 0); }, 0);
        await window.supabase.from('products').update({ stock: newTgtStock, updated_at: new Date().toISOString() }).eq('id', tgtId);

        // C. Simpan riwayat ke packaging_logs jika tabel tersedia
        try {
          await window.supabase.from('packaging_logs').insert({
            source_product_id: srcId,
            target_product_id: tgtId,
            source_batch_id: srcBatchId,
            gram_used: gramUsed,
            pcs_produced: pcsActual,
            cost_per_unit: hppFinalSachet,
            packaging_cost_per_unit: biayaKemasanPerPcs,
            buy_price: buyPriceRounded,
            created_at: new Date().toISOString()
          });
        } catch (pLogErr) {
          // Abaikan jika tabel opsional
        }
      }
    } catch (syncErr) {
      console.warn('Gagal sinkronisasi sekunder tabel products:', syncErr);
    }

    invalidateCache('productions');
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('batches');
    invalidateCache('mutations');
    invalidateCache('stock_mutations');
    showToast('Pengemasan berhasil! HPP baru: Rp ' + Number(hppFinalSachet).toLocaleString('id-ID') + '/pcs');
    renderProduksi(true);
  }).catch(function (err) {
    showToast('Gagal: ' + (err.message || err), true);
  });
}

function deleteProductionUI(prodId) {
  showConfirmDialog('Batalkan Produksi', 'Batalkan produksi ini? Batch kemasan jadi akan dihapus dan modal kuantiti bahan mentah dikembalikan ke batch asal.', function () {
    api('deleteProduction', TOKEN, prodId).then(function () {
      invalidateCache('productions');
      invalidateCache('products');
      invalidateCache('dashboard');
      invalidateCache('batches');
      showToast('Produksi dibatalkan & stok dikembalikan.');
      renderProduksi(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}


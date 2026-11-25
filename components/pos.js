// ========================= KASIR (POS) =========================
let POS_MOBILE_ACTIVE_PANE = 'catalog';

function renderPOS(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  POS_MOBILE_ACTIVE_PANE = EDITING_TRANSACTION ? 'cart' : 'catalog';

  let editBannerHTML = '';
  if (EDITING_TRANSACTION) {
    editBannerHTML =
      '<div style="background:var(--warning-bg);border:1px solid rgba(217,130,43,0.3);color:var(--warning);padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div><strong>🔄 MODE KOREKSI NOTA:</strong> #' + escapeHtml(EDITING_TRANSACTION.id) + ' (' + formatDate(EDITING_TRANSACTION.created_at) + ')</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditMode()">Batal Koreksi</button>' +
      '</div>';
  }

  content.innerHTML =
    editBannerHTML +
    '<div class="pos-mobile-tabs" role="tablist" aria-label="Mode Tampilan Kasir">' +
    '<button type="button" id="pos-mob-tab-catalog" class="pos-mob-tab-btn' + (POS_MOBILE_ACTIVE_PANE === 'catalog' ? ' active' : '') + '" onclick="switchPOSMobilePane(\'catalog\')">📦 Katalog Produk</button>' +
    '<button type="button" id="pos-mob-tab-cart" class="pos-mob-tab-btn' + (POS_MOBILE_ACTIVE_PANE === 'cart' ? ' active' : '') + '" onclick="switchPOSMobilePane(\'cart\')">🛒 Keranjang <span id="pos-mob-cart-badge" class="pos-mob-cart-badge" data-no-i18n="true">0</span></button>' +
    '</div>' +
    '<div class="pos-layout" data-mobile-pane="' + POS_MOBILE_ACTIVE_PANE + '">' +
    '<div class="pos-catalog-panel">' +
    '<div class="pos-filter-bar">' +
    '<input type="text" id="pos-search" class="topbar-search" placeholder="Cari produk kemasan..." style="flex:1;">' +
    '<button type="button" class="btn btn-warning btn-sm" onclick="openOnlineOrderQueueModal()" id="btn-pos-online-orders" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;" title="Buka Antrean Pesanan Masuk dari Katalog Online"><i class="fas fa-shopping-bag"></i> Pesanan Online <span id="pos-online-order-badge" style="background:#EF4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10.5px;font-weight:800;display:none;">0</span></button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openPublicCatalogManager()" title="Buka / Bagikan Katalog & QR Meja Kasir" style="color:var(--primary);font-weight:700;display:inline-flex;align-items:center;gap:5px;"><i class="fas fa-qrcode"></i> Katalog &amp; QR</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openModuleGuide(\'pos\')" title="Buka Panduan Operasional Kasir (SOP)">📖 Panduan Kasir</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransactionHistoryModal()">📜 Riwayat Transaksi</button>' +
    '</div>' +
    '<div class="pos-product-grid" id="pos-product-grid"></div>' +
    '</div>' +
    '<div class="pos-cart-panel">' +
    '<div class="pos-cart-header">' +
    '<strong>' + (EDITING_TRANSACTION ? 'Koreksi Nota' : 'Keranjang Penjualan') + '</strong>' +
    '<div style="display:flex;gap:6px;align-items:center;">' +
    '<button type="button" class="btn btn-secondary btn-sm pos-mobile-back-catalog-btn" onclick="switchPOSMobilePane(\'catalog\')">+ Produk</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetCart();">Kosongkan</button>' +
    '</div>' +
    '</div>' +
    '<div style="padding:10px 14px;background:var(--surface-muted);border-bottom:1px solid var(--border);">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<span style="font-size:10px;font-weight:700;color:var(--text-secondary);">NAMA PELANGGAN / NOTA ATAS NAMA:</span>' +
    '<button type="button" class="btn btn-secondary btn-sm" style="padding:1px 6px;font-size:10px;" onclick="openQuickCustomerModal()">+ Member Lengkap</button>' +
    '</div>' +
    '<div class="input-wrapper" style="position:relative;">' +
    '<input type="text" id="pos-customer-input" list="pos-customer-datalist" placeholder="Ketik nama pelanggan (misal: Pak Ketut / Subak)..." oninput="handleCustomerInput(this.value)" style="padding-left:12px;padding-right:28px;background:#fff;font-weight:600;" autocomplete="off">' +
    '<button type="button" id="pos-customer-clear" onclick="clearCustomerInput()" style="position:absolute;right:8px;background:transparent;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;display:none;">&times;</button>' +
    '</div>' +
    '<datalist id="pos-customer-datalist"></datalist>' +
    '<div id="pos-customer-match-badge" style="margin-top:6px;font-size:11px;display:none;"></div>' +
    '<div id="pos-customer-new-box" style="display:none;margin-top:8px;background:#fff;padding:8px 10px;border-radius:var(--radius-xs);border:1px dashed var(--border);">' +
    '<div id="pos-member-phone-wrap" style="margin-bottom:6px;">' +
    '<input type="text" id="pos-customer-phone-input" oninput="syncPosCustomerPhone(this.value)" placeholder="No. WhatsApp (untuk struk WA / piutang, misal: 08123...)" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;font-weight:600;color:var(--primary);">' +
    '<input type="checkbox" id="pos-save-member-chk" onchange="toggleSaveMemberPhone(this.checked)">' +
    'Simpan ke Database Member CRM' +
    '</label>' +
    '</div>' +
    '</div>' +
    '<div class="pos-cart-items" id="pos-cart-items"></div>' +
    '<div class="pos-cart-summary" id="pos-cart-summary"></div>' +
    '</div>' +
    '</div>' +
    '<div id="pos-mobile-sticky-bar" class="pos-mobile-sticky-bar" data-visible="false">' +
    '<div class="pos-sticky-info" onclick="switchPOSMobilePane(\'cart\')" style="cursor:pointer;">' +
    '<span id="pos-sticky-qty" class="pos-sticky-qty">0 Item di Keranjang</span>' +
    '<span id="pos-sticky-total" class="pos-sticky-total" data-no-i18n="true">Rp 0</span>' +
    '</div>' +
    '<button type="button" class="btn btn-primary btn-sm pos-sticky-cta" onclick="switchPOSMobilePane(\'cart\')">Buka Keranjang &rarr;</button>' +
    '</div>';

  populateCustomerDatalist();
  renderCart();

  if (SELECTED_CUSTOMER && SELECTED_CUSTOMER.name) {
    const custInput = document.getElementById('pos-customer-input');
    const phoneInput = document.getElementById('pos-customer-phone-input');
    if (custInput) {
      custInput.value = SELECTED_CUSTOMER.name;
      handleCustomerInput(SELECTED_CUSTOMER.name);
    }
    if (phoneInput && SELECTED_CUSTOMER.phone) {
      phoneInput.value = SELECTED_CUSTOMER.phone;
    }
  }
  if (window.PENDING_POS_ONLINE_CART) {
    window.PENDING_POS_ONLINE_CART = false;
    if (typeof switchPOSMobilePane === 'function') switchPOSMobilePane('cart');
  }

  const cachedProds = getCachedData('products');
  const cachedCusts = getCachedData('customers');
  if (cachedCusts) {
    CUSTOMERS_CACHE = cachedCusts;
    populateCustomerDatalist();
  }

  if (!forceRefresh && cachedProds && cachedProds.length > 0) {
    setupPOSData(cachedProds);
    if (isCacheValid('products')) return;
  } else {
    const grid = document.getElementById('pos-product-grid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat katalog produk kasir...</div>';
  }

  api('getPosInitData', TOKEN).then(function (res) {
    setCachedData('products', res.products || []);
    setCachedData('customers', res.customers || []);
    setCachedData('settings', res.settings || {});
    if (res.batches && res.batches.length > 0) {
      setCachedData('batches', res.batches);
    }
    CUSTOMERS_CACHE = res.customers || [];
    APP_SETTINGS = res.settings || {};
    if (res.price_tiers_preset) {
      APP_SETTINGS['price_tiers_preset'] = res.price_tiers_preset;
    }
    PRICE_TIERS_LIST = (res.priceTiers && res.priceTiers.length > 0)
      ? res.priceTiers
      : getDefaultPriceTierPresets().map(function (t) { return t.name; });

    populateCustomerDatalist();
    setupPOSData(res.products || []);
  }).catch(function (err) {
    if (!cachedProds || cachedProds.length === 0) {
      showToast('Gagal memuat produk kasir: ' + (err.message || err), true);
      const grid = document.getElementById('pos-product-grid');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger);">Gagal memuat produk.<br><button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="renderPOS(true)">Coba Lagi</button></div>';
    }
  });
  startOnlineOrdersPolling();
}

function setupPOSData(allProducts) {
  const packagingProducts = (allProducts || []).filter(function (p) {
    return p && p.active && !isRawProduct(p.unit);
  });
  PRODUCTS_CACHE = packagingProducts.length > 0
    ? packagingProducts
    : (allProducts || []).filter(function (p) { return p && p.active; });

  renderPOSProductGrid(PRODUCTS_CACHE);
  renderCart();

  const posSearch = document.getElementById('pos-search');
  if (posSearch) {
    posSearch.oninput = function (e) {
      const query = (e.target.value || '').toLowerCase().trim();
      const filtered = PRODUCTS_CACHE.filter(function (p) {
        return (p.name || '').toLowerCase().includes(query) ||
          (p.category || '').toLowerCase().includes(query) ||
          (p.variant || '').toLowerCase().includes(query);
      });
      renderPOSProductGrid(filtered);
    };
  }
}

function populateCustomerDatalist() {
  const datalist = document.getElementById('pos-customer-datalist');
  if (!datalist) return;
  datalist.innerHTML = (CUSTOMERS_CACHE || []).map(function (c) {
    const phoneStr = c.phone ? ' — ' + c.phone : '';
    const catStr = c.category ? ' [' + c.category + ']' : '';
    return '<option value="' + escapeHtml(c.name) + '">' + escapeHtml(c.name + phoneStr + catStr) + '</option>';
  }).join('');
}

function syncPosCustomerPhone(val) {
  const cleanPhone = (val || '').trim();
  if (SELECTED_CUSTOMER) {
    SELECTED_CUSTOMER.phone = cleanPhone;
  } else {
    const inp = document.getElementById('pos-customer-input');
    const custName = inp ? inp.value.trim() : '';
    if (custName) {
      SELECTED_CUSTOMER = { id: '', name: custName, phone: cleanPhone, category: 'Reguler' };
    }
  }
}

function handleCustomerInput(val) {
  val = (val || '').trim();
  const clearBtn = document.getElementById('pos-customer-clear');
  const matchBadge = document.getElementById('pos-customer-match-badge');
  const newBox = document.getElementById('pos-customer-new-box');
  const phoneInput = document.getElementById('pos-customer-phone-input');

  if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';

  if (!val) {
    SELECTED_CUSTOMER = null;
    if (matchBadge) matchBadge.style.display = 'none';
    if (newBox) newBox.style.display = 'none';
    return;
  }

  const matched = (CUSTOMERS_CACHE || []).find(function (c) {
    return c.name.toLowerCase() === val.toLowerCase();
  });

  if (matched) {
    SELECTED_CUSTOMER = matched;
    if (phoneInput && matched.phone) phoneInput.value = matched.phone;
    if (matchBadge) {
      matchBadge.style.display = 'block';
      matchBadge.innerHTML = '<span class="badge badge-success" style="font-size:10px;">✓ Terdaftar di CRM: ' + escapeHtml(matched.category || 'Member') + (matched.phone ? ' (' + escapeHtml(matched.phone) + ')' : '') + '</span>';
    }
    if (newBox) newBox.style.display = 'none';
  } else {
    const existingPhone = (SELECTED_CUSTOMER && SELECTED_CUSTOMER.name && SELECTED_CUSTOMER.name.toLowerCase() === val.toLowerCase()) ? (SELECTED_CUSTOMER.phone || '') : '';
    const onlinePhone = (window.ACTIVE_ONLINE_ORDER_DATA && window.ACTIVE_ONLINE_ORDER_DATA.customer_name && window.ACTIVE_ONLINE_ORDER_DATA.customer_name.toLowerCase() === val.toLowerCase()) ? (window.ACTIVE_ONLINE_ORDER_DATA.customer_phone || '') : '';
    const preservedPhone = (phoneInput && phoneInput.value.trim()) ? phoneInput.value.trim() : (existingPhone || onlinePhone);

    SELECTED_CUSTOMER = { id: '', name: val, phone: preservedPhone, category: 'Reguler' };
    if (phoneInput && preservedPhone && !phoneInput.value.trim()) phoneInput.value = preservedPhone;
    if (matchBadge) {
      matchBadge.style.display = 'block';
      matchBadge.innerHTML = '<span class="badge badge-neutral" style="font-size:10px;">✍️ Pelanggan Baru (Sekali Transaksi)</span>';
    }
    if (newBox) newBox.style.display = 'block';
    const phoneWrap = document.getElementById('pos-member-phone-wrap');
    if (phoneWrap) phoneWrap.style.display = 'block';
  }
}

function clearCustomerInput() {
  const inp = document.getElementById('pos-customer-input');
  const phoneInp = document.getElementById('pos-customer-phone-input');
  if (inp) inp.value = '';
  if (phoneInp) phoneInp.value = '';
  handleCustomerInput('');
}

function toggleSaveMemberPhone(checked) {
  const wrap = document.getElementById('pos-member-phone-wrap');
  if (wrap) wrap.style.display = 'block';
  if (checked) {
    const phoneInp = document.getElementById('pos-customer-phone-input');
    if (phoneInp) phoneInp.focus();
  }
}

/**
 * Mengosongkan seluruh state keranjang POS, pelanggan terpilih, dan order online aktif.
 */
function resetCart() {
  EDITING_TRANSACTION = null;
  CART = [];
  SELECTED_CUSTOMER = null;
  SELECTED_CUSTOMER = null;
  window.ACTIVE_ONLINE_ORDER_ID = null;
  window.ACTIVE_ONLINE_ORDER_NO = null;
  window.ACTIVE_ONLINE_ORDER_DATA = null;
  window.PENDING_POS_ONLINE_CART = false;
  clearCustomerInput();
  const saveChk = document.getElementById('pos-save-member-chk');
  if (saveChk) saveChk.checked = false;
  if (typeof renderCart === 'function') renderCart();
}

function selectCustomer(customerId) {
  SELECTED_CUSTOMER = CUSTOMERS_CACHE.filter(function (c) { return c.id === customerId; })[0] || null;
}

function openQuickCustomerModal() {
  showPromptDialog('Daftar Pelanggan Cepat', 'Masukkan Nama Pelanggan:', '', function (name) {
    showPromptDialog('Nomor Kontak', 'Masukkan No. WhatsApp / HP Pelanggan:', '', function (phone) {
      api('saveCustomer', TOKEN, { name: name, phone: phone, category: 'Reguler' }).then(function (res) {
        invalidateCache('customers');
        const newC = { id: res.id, name: name, phone: phone, category: 'Reguler' };
        CUSTOMERS_CACHE.unshift(newC);
        SELECTED_CUSTOMER = newC;
        populateCustomerDatalist();
        const inp = document.getElementById('pos-customer-input');
        if (inp) {
          inp.value = name;
          handleCustomerInput(name);
        }
        showToast('Pelanggan tersimpan & terpilih.');
      });
    });
  });
}

function renderPOSProductGrid(products) {
  const grid = document.getElementById('pos-product-grid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">Tidak ada produk kemasan yang memiliki stok tersedia.</div>';
    return;
  }

  grid.innerHTML = products.map(function (p) {
    const varTag = p.variant ? '<span class="badge badge-neutral" style="font-size:10px;">' + escapeHtml(p.variant) + '</span>' : '';
    const tiers = (p.priceTiers && p.priceTiers.length > 0) ? p.priceTiers : [{ tier_name: 'Reguler', price: 0 }];
    const isOutOfStock = Number(p.stock || 0) <= 0;
    const stockBadge = isOutOfStock
      ? '<span class="badge badge-danger" style="font-size:10px;">Stok Habis</span>'
      : '<span class="product-card-stock">Tersedia: ' + p.stock + ' ' + escapeHtml(p.unit || 'pcs') + '</span>';

    let expiryInfoHTML = '';
    if (p.batches && p.batches.length > 0) {
      const withExpiry = p.batches.filter(function (b) { return b.expiry_date; });
      if (withExpiry.length > 0) {
        expiryInfoHTML = '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">📅 Exp: <strong style="color:var(--primary);">' + formatDate(withExpiry[0].expiry_date) + '</strong></div>';
      }
    }

    let priceDisplay = '';
    let multiTierBadge = '';

    const defTier = getDefaultTierForProduct(p);
    if (tiers.length > 1) {
      const regFound = tiers.find(function (t) { return (t.tier_name || '').toLowerCase() === 'reguler'; });
      const mainPrice = regFound ? regFound.price : defTier.price;
      priceDisplay = formatRupiah(mainPrice) + ' <span style="font-size:10.5px;font-weight:600;color:var(--text-secondary);">(Reguler)</span>';
      multiTierBadge = '<div style="margin-top:4px;"><span class="badge badge-neutral" style="font-size:10px;padding:2px 6px;">🏷️ ' + tiers.length + ' Pilihan Harga</span></div>';
    } else {
      priceDisplay = formatRupiah(defTier.price || tiers[0].price);
    }

    const cardOpacity = isOutOfStock ? 'opacity:0.65;' : '';

    return '<div class="product-card" style="' + cardOpacity + '" onclick="handlePOSProductClick(\'' + p.id + '\')">' +
      '<div>' +
      '<div class="product-card-title">' + escapeHtml(p.name) + ' ' + varTag + '</div>' +
      '<div style="margin-top:4px;">' + stockBadge + '</div>' +
      expiryInfoHTML +
      '</div>' +
      '<div>' +
      multiTierBadge +
      '<div class="product-card-price" style="margin-top:6px;">' + priceDisplay + '</div>' +
      '</div>' +
      '</div>';
  }).join('');
}

function getDefaultTierForProduct(product) {
  if (!product || !product.priceTiers || product.priceTiers.length === 0) {
    return { tier_name: 'Reguler', price: 0 };
  }
  const regTier = product.priceTiers.find(function (t) { return (t.tier_name || '').toLowerCase() === 'reguler'; });
  if (regTier) return regTier;
  const ecerTier = product.priceTiers.find(function (t) { return (t.tier_name || '').toLowerCase() === 'eceran'; });
  if (ecerTier) return ecerTier;
  return product.priceTiers[0];
}

function handlePOSProductClick(productId, forceDirectReguler) {
  if (!userCanEdit('pos')) {
    showToast('Mode Pantau (View-Only): Transaksi kasir dinonaktifkan untuk peran ini.', false, true);
    return;
  }
  const p = PRODUCTS_CACHE.filter(function (x) { return x.id === productId; })[0];
  if (!p) return;
  if (Number(p.stock || 0) <= 0) {
    showToast('Stok "' + p.name + '" sedang kosong (0 ' + (p.unit || 'pcs') + ').', true);
    return;
  }
  const tiers = (p.priceTiers && p.priceTiers.length > 0) ? p.priceTiers : [{ tier_name: 'Reguler', price: 0 }];

  if (forceDirectReguler || tiers.length === 1) {
    const defTier = getDefaultTierForProduct(p);
    addToCartWithTier(p.id, defTier.tier_name, Number(defTier.price || 0));
  } else {
    openSelectTierModal(p);
  }
}

function openSelectTierModal(product) {
  const tiers = (product.priceTiers && product.priceTiers.length > 0)
    ? [...product.priceTiers]
    : [{ tier_name: 'Reguler', price: 0 }];

  // Urutkan tier: Reguler di posisi pertama, diikuti Outlet, Bali Buda, dan lainnya
  const priority = { 'reguler': 1, 'eceran': 1, 'outlet': 2, 'bali buda': 3 };
  tiers.sort(function (a, b) {
    const pA = priority[(a.tier_name || '').toLowerCase()] || 99;
    const pB = priority[(b.tier_name || '').toLowerCase()] || 99;
    return pA - pB;
  });

  const bodyHtml =
    '<div style="text-align:center;padding:4px 0 14px;">' +
    '<h3 style="font-size:16px;margin-bottom:4px;color:var(--text-main);">' + escapeHtml(product.name) + (product.variant ? ' (' + escapeHtml(product.variant) + ')' : '') + '</h3>' +
    '<div style="font-size:12px;color:var(--text-secondary);">Tersedia: <strong style="color:var(--primary);">' + product.stock + ' ' + escapeHtml(product.unit || 'pcs') + '</strong></div>' +
    '<div style="font-size:13px;color:var(--primary);font-weight:600;margin-top:10px;">Pilih tingkat harga untuk barang ini:</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px;">' +
    tiers.map(function (t) {
      const isReg = (t.tier_name || '').toLowerCase() === 'reguler';
      const badge = isReg ? '<span class="badge badge-success" style="font-size:10px;margin-left:6px;">Default Eceran POS</span>' : '';
      return '<button type="button" class="btn btn-secondary" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-radius:var(--radius-sm);border:' + (isReg ? '2px solid var(--primary)' : '1.5px solid var(--border)') + ';background:' + (isReg ? 'rgba(122,80,49,0.06)' : 'var(--surface)') + ';text-align:left;font-size:14px;cursor:pointer;" ' +
        'onclick="addToCartWithTier(\'' + product.id + '\', \'' + escapeHtml(t.tier_name) + '\', ' + Number(t.price) + '); closeModal();">' +
        '<span>🏷️ <strong>' + escapeHtml(t.tier_name) + '</strong>' + badge + '</span>' +
        '<span style="font-weight:800;color:var(--accent);font-family:\'JetBrains Mono\',monospace;font-size:15px;">' + formatRupiah(t.price) + '</span>' +
        '</button>';
    }).join('') +
    '</div>';

  openModal('Pilihan Tingkat Harga', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>');
}

function addToCartWithTier(productId, tierName, price) {
  const p = PRODUCTS_CACHE.filter(function (x) { return x.id === productId; })[0];
  if (!p) return;

  // Validasi Restriksi Kasir POS:
  // - JIKA NON-BENIH: Bebas QC, langsung izinkan penambahan ke keranjang.
  // - JIKA BENIH: Wajib memiliki batch aktif berstatus APPROVED (lolos QC minimal 80%).
  const isSeed = isSeedProductClient(p);
  if (isSeed) {
    const approvedBatches = (p.batches || []).filter(function (b) {
      const qcUpper = String(b.qc_status || '').toUpperCase();
      const isNotQuarantine = String(b.quality_status || '').toUpperCase() !== 'QUARANTINE';
      return (qcUpper === 'APPROVED' || qcUpper === 'PASSED') && isNotQuarantine && Number(b.qty_remaining || 0) > 0;
    });
    if (p.batches && p.batches.length > 0 && approvedBatches.length === 0) {
      showToast('Produk benih "' + p.name + '" belum memiliki batch yang lolos Quality Control (APPROVED min 80%).', true);
      return;
    }
  }

  const totalInCart = CART.filter(function (c) { return c.product_id === productId; }).reduce(function (sum, item) { return sum + item.qty; }, 0);
  if (totalInCart + 1 > Number(p.stock || 0)) {
    showToast('Stok tidak mencukupi (Sisa: ' + p.stock + ' ' + escapeHtml(p.unit) + ')', true);
    return;
  }

  let defaultExpDate = '';
  if (p.batches && p.batches.length > 0) {
    const withExp = p.batches.filter(function (b) { return b.expiry_date; });
    if (withExp.length > 0) {
      defaultExpDate = formatDate(withExp[0].expiry_date);
    }
  }

  const cartKey = p.id + '__' + tierName;
  const existing = CART.filter(function (c) { return c.cart_key === cartKey; })[0];

  if (existing) {
    existing.qty++;
  } else {
    CART.push({
      cart_key: cartKey,
      product_id: p.id,
      name: p.variant ? (p.name + ' (' + p.variant + ')') : p.name,
      tier_name: tierName,
      price: Number(price || 0),
      qty: 1,
      selected_batch_id: '',
      selected_expiry: defaultExpDate
    });
  }

  renderCart();
  showToast('Ditambahkan: ' + p.name + ' (' + tierName + ')');
}

function changeCartItemTier(cartKey, newTierName) {
  const item = CART.filter(function (c) { return c.cart_key === cartKey; })[0];
  if (!item) return;
  const p = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
  if (!p || !p.priceTiers) return;

  const match = p.priceTiers.filter(function (t) { return t.tier_name === newTierName; })[0];
  if (!match) return;

  item.tier_name = match.tier_name;
  item.price = Number(match.price);
  item.cart_key = item.product_id + '__' + match.tier_name;

  const duplicates = CART.filter(function (c) { return c.cart_key === item.cart_key; });
  if (duplicates.length > 1) {
    const first = duplicates[0];
    const second = duplicates[1];
    first.qty += second.qty;
    CART = CART.filter(function (c) { return c !== second; });
  }
  renderCart();
}

function changeCartItemBatch(cartKey, newBatchId) {
  const item = CART.filter(function (c) { return c.cart_key === cartKey; })[0];
  if (!item) return;

  const p = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
  if (!p || !p.batches) return;

  if (!newBatchId) {
    item.selected_batch_id = '';
    const withExp = p.batches.filter(function (b) { return b.expiry_date; });
    item.selected_expiry = withExp.length > 0 ? formatDate(withExp[0].expiry_date) : '';
    renderCart();
    showToast('Batch diset ke Otomatis (FEFO terdekat)');
    return;
  }

  const selectedBatch = p.batches.filter(function (b) { return b.id === newBatchId; })[0];
  if (!selectedBatch) return;

  const bRemaining = Number(selectedBatch.qty_remaining || 0);
  if (bRemaining <= 0) {
    showToast('Batch ' + selectedBatch.id + ' tidak memiliki sisa stok (0 ' + (p.unit || 'pcs') + ').', true);
    return;
  }

  if (bRemaining < item.qty) {
    item.qty = bRemaining;
    showToast('Kuantitas keranjang disesuaikan ke ' + bRemaining + ' ' + (p.unit || 'pcs') + ' (sesuai sisa fisik batch ' + selectedBatch.id + ').');
  }

  item.selected_batch_id = selectedBatch.id;
  item.selected_expiry = selectedBatch.expiry_date ? formatDate(selectedBatch.expiry_date) : '-';
  renderCart();
  showToast('Batch dipilih: ' + selectedBatch.id + (selectedBatch.expiry_date ? ' (Exp: ' + formatDate(selectedBatch.expiry_date) + ')' : ''));
}

function updateCartQty(cartKey, delta) {
  const item = CART.filter(function (c) { return c.cart_key === cartKey; })[0];
  if (!item) return;

  if (delta > 0) {
    const p = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
    const totalInCart = CART.filter(function (c) { return c.product_id === item.product_id; }).reduce(function (sum, c) { return sum + c.qty; }, 0);
    if (p && totalInCart + 1 > Number(p.stock || 0)) {
      showToast('Stok tidak mencukupi (Sisa total: ' + (p.stock || 0) + ' ' + (p.unit || 'pcs') + ').', true);
      return;
    }
    if (item.selected_batch_id && p && p.batches) {
      const selB = p.batches.find(function (b) { return b.id === item.selected_batch_id; });
      if (selB && item.qty + 1 > Number(selB.qty_remaining || 0)) {
        showToast('Stok batch ' + selB.id + ' hanya tersisa ' + selB.qty_remaining + ' ' + (p.unit || 'pcs') + '. Ubah ke Otomatis FEFO untuk mengambil dari batch lain.', true);
        return;
      }
    }
  }

  item.qty += delta;
  if (item.qty <= 0) {
    CART = CART.filter(function (c) { return c.cart_key !== cartKey; });
  }
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById('pos-cart-items');
  const summaryEl = document.getElementById('pos-cart-summary');
  if (!itemsEl || !summaryEl) return;

  if (CART.length === 0) {
    itemsEl.innerHTML = '<div style="text-align:center;padding:40px 10px;color:var(--text-secondary);font-size:13px;">Keranjang masih kosong.<br>Klik produk untuk menambahkan.</div>';
    summaryEl.innerHTML = '';
    updatePOSMobileCartIndicators(0, 0);
    return;
  }

  itemsEl.innerHTML = CART.map(function (item) {
    const p = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
    const productTiers = (p && p.priceTiers && p.priceTiers.length > 0) ? p.priceTiers : [{ tier_name: item.tier_name || 'Eceran', price: item.price }];
    const productBatches = (p && p.batches) ? p.batches : [];

    let tierSelectorHTML = '';
    if (productTiers.length > 1) {
      tierSelectorHTML =
        '<div style="margin-top:4px;display:flex;align-items:center;gap:6px;">' +
        '<span style="font-size:10px;font-weight:700;color:var(--text-secondary);">Harga:</span>' +
        '<select onchange="changeCartItemTier(\'' + item.cart_key + '\', this.value)" style="padding:2px 8px;font-size:11px;font-weight:600;border:1px solid var(--primary);border-radius:var(--radius-xs);background:#fff;color:var(--primary);cursor:pointer;">' +
        productTiers.map(function (t) {
          const isSel = (item.tier_name === t.tier_name) ? ' selected' : '';
          return '<option value="' + escapeHtml(t.tier_name) + '"' + isSel + '>' + escapeHtml(t.tier_name) + ' — ' + formatRupiah(t.price) + '</option>';
        }).join('') +
        '</select>' +
        '</div>';
    } else {
      tierSelectorHTML =
        '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">' +
        escapeHtml(item.tier_name || 'Eceran') + ' &bull; ' + formatRupiah(item.price) +
        '</div>';
    }

    let batchSelectorHTML = '';
    if (productBatches.length > 0) {
      batchSelectorHTML =
        '<div style="margin-top:6px;background:var(--surface-muted);padding:4px 8px;border-radius:var(--radius-xs);border:1px solid var(--border);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">' +
        '<span style="font-size:10px;font-weight:700;color:var(--text-secondary);">PILIHAN KEDALUWARSA / BATCH:</span>' +
        (item.selected_expiry ? '<span style="font-size:10px;font-weight:700;color:var(--primary);">📅 ' + item.selected_expiry + '</span>' : '') +
        '</div>' +
        '<select onchange="changeCartItemBatch(\'' + item.cart_key + '\', this.value)" style="width:100%;padding:2px 6px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;cursor:pointer;">' +
        '<option value="">⚡ Otomatis FEFO (' + (item.selected_expiry || 'Antrean Terdekat') + ')</option>' +
        productBatches.map(function (b) {
          const expTxt = b.expiry_date ? formatDate(b.expiry_date) : 'Tanpa Exp';
          const isSel = (item.selected_batch_id === b.id) ? ' selected' : '';
          const displayBatchCode = b.batch_code || b.batch_no || b.id;
          return '<option value="' + escapeHtml(b.id) + '"' + isSel + '>' + escapeHtml(displayBatchCode) + ' — Exp: ' + expTxt + ' (Sisa ' + b.qty_remaining + ')</option>';
        }).join('') +
        '</select>' +
        '</div>';
    }

    return '<div class="cart-item">' +
      '<div class="cart-item-info">' +
      '<div class="cart-item-name">' + escapeHtml(item.name) + '</div>' +
      tierSelectorHTML +
      batchSelectorHTML +
      '<div class="cart-item-price" style="font-size:12px;font-weight:700;color:var(--accent);margin-top:6px;">' +
      formatRupiah(item.price * item.qty) +
      '</div>' +
      '</div>' +
      '<div class="cart-item-controls">' +
      '<button type="button" class="stepper-btn" onclick="updateCartQty(\'' + item.cart_key + '\', -1)">&minus;</button>' +
      '<span class="stepper-qty">' + item.qty + '</span>' +
      '<button type="button" class="stepper-btn" onclick="updateCartQty(\'' + item.cart_key + '\', 1)">+</button>' +
      '</div>' +
      '</div>';
  }).join('');

  const subtotal = CART.reduce(function (s, i) { return s + (i.price * i.qty); }, 0);
  const taxRate = Number(APP_SETTINGS['tax_rate'] || 0) / 100;
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;

  summaryEl.innerHTML =
    '<div class="summary-line"><span>Subtotal</span><span>' + formatRupiah(subtotal) + '</span></div>' +
    (taxRate > 0 ? '<div class="summary-line"><span>Pajak (' + (taxRate * 100) + '%)</span><span>' + formatRupiah(tax) + '</span></div>' : '') +
    '<div class="summary-line summary-total"><span>Total</span><span>' + formatRupiah(total) + '</span></div>' +
    '<button type="button" class="btn btn-primary btn-block btn-lg" style="margin-top:12px;" onclick="openCheckoutModal(' + total + ')">' +
    (EDITING_TRANSACTION ? 'Simpan Koreksi' : '⚡ Bayar Transaksi') +
    '</button>';

  const totalQtyCount = CART.reduce(function (s, i) { return s + Number(i.qty || 0); }, 0);
  updatePOSMobileCartIndicators(totalQtyCount, total);
}


function switchPOSMobilePane(pane) {
  POS_MOBILE_ACTIVE_PANE = (pane === 'cart') ? 'cart' : 'catalog';
  const layout = document.querySelector('.pos-layout');
  if (layout) {
    layout.setAttribute('data-mobile-pane', POS_MOBILE_ACTIVE_PANE);
  }
  const tabCatalog = document.getElementById('pos-mob-tab-catalog');
  const tabCart = document.getElementById('pos-mob-tab-cart');
  if (tabCatalog) tabCatalog.classList.toggle('active', POS_MOBILE_ACTIVE_PANE === 'catalog');
  if (tabCart) tabCart.classList.toggle('active', POS_MOBILE_ACTIVE_PANE === 'cart');
  const subtotal = CART.reduce(function (s, i) { return s + (i.price * i.qty); }, 0);
  const taxRate = Number(APP_SETTINGS['tax_rate'] || 0) / 100;
  const total = subtotal + Math.round(subtotal * taxRate);
  const totalQty = CART.reduce(function (s, i) { return s + Number(i.qty || 0); }, 0);
  updatePOSMobileCartIndicators(totalQty, total);
  const contentEl = document.getElementById('content');
  if (contentEl && window.innerWidth <= 768) {
    contentEl.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.switchPOSMobilePane = switchPOSMobilePane;

function updatePOSMobileCartIndicators(totalQty, totalAmount) {
  const badge = document.getElementById('pos-mob-cart-badge');
  if (badge) badge.textContent = String(totalQty || 0);

  const stickyBar = document.getElementById('pos-mobile-sticky-bar');
  const stickyQty = document.getElementById('pos-sticky-qty');
  const stickyTotal = document.getElementById('pos-sticky-total');
  const layout = document.querySelector('.pos-layout');
  const activePane = layout ? (layout.getAttribute('data-mobile-pane') || 'catalog') : POS_MOBILE_ACTIVE_PANE;

  if (stickyQty) {
    const itemLabel = (window.t ? window.t('Item di Keranjang') : 'Item di Keranjang');
    stickyQty.textContent = String(totalQty || 0) + ' ' + itemLabel;
  }
  if (stickyTotal) {
    stickyTotal.textContent = formatRupiah(totalAmount || 0);
  }
  if (stickyBar) {
    const shouldShow = (totalQty > 0) && (activePane !== 'cart') && userCanEdit('pos');
    stickyBar.setAttribute('data-visible', shouldShow ? 'true' : 'false');
  }
}

function addDaysLocalYMD(baseDateStr, days) {
  const baseYmd = getPurchaseLocalDateYMD(baseDateStr || new Date().toISOString()) || getPurchaseLocalDateYMD(new Date().toISOString());
  const parts = String(baseYmd).split('-');
  if (parts.length !== 3) return '';
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + Number(days || 0));
  if (isNaN(dt.getTime())) return '';
  return getPurchaseLocalDateYMD(dt.toISOString());
}

function getCheckoutPricingState(baseTotalOverride) {
  const ctx = window._CHECKOUT_CONTEXT || {};
  const baseTotal = Number(baseTotalOverride !== undefined ? baseTotalOverride : (ctx.baseTotal !== undefined ? ctx.baseTotal : 0)) || 0;
  const subtotal = Number(ctx.subtotal !== undefined ? ctx.subtotal : baseTotal) || 0;
  const tax = Number(ctx.tax !== undefined ? ctx.tax : Math.max(0, baseTotal - subtotal)) || 0;

  const shippingEl = document.getElementById('chk-shipping');
  const feeNoteEl = document.getElementById('chk-fee-note');
  const methodEl = document.getElementById('chk-method');
  const typeEl = document.getElementById('chk-type');
  const cashEl = document.getElementById('chk-cash-received');
  const dpEl = document.getElementById('chk-dp');

  const shippingCost = Math.max(0, Math.round(Number(shippingEl ? shippingEl.value : 0) || 0));
  const feeNote = feeNoteEl ? feeNoteEl.value.trim() : '';
  const method = methodEl ? methodEl.value : 'Tunai';
  const type = typeEl ? typeEl.value : 'full';

  const preQrisTotal = baseTotal + shippingCost;
  const qrisCfg = typeof getQrisConfig === 'function' ? getQrisConfig() : { mdr_rate: 0, mdr_payer: 'merchant' };
  const mdrRate = Number(qrisCfg.mdr_rate || 0);
  const isQris = method === 'QRIS';
  const isQrisCustomer = isQris && qrisCfg.mdr_payer === 'customer' && mdrRate > 0;
  const qrisFee = (isQris && mdrRate > 0) ? Math.round(preQrisTotal * (mdrRate / 100)) : 0;
  const customerQrisFee = isQrisCustomer ? qrisFee : 0;
  const grandTotal = preQrisTotal + customerQrisFee;

  const rawCashStr = cashEl ? String(cashEl.value || '').trim() : '';
  const hasExplicitCash = rawCashStr !== '';
  const parsedCash = hasExplicitCash ? Number(rawCashStr) : grandTotal;
  const cashReceived = isNaN(parsedCash) ? 0 : Math.round(parsedCash);
  const changeAmount = cashReceived - grandTotal;

  const dp = Math.max(0, Math.round(Number(dpEl ? dpEl.value : 0) || 0));
  const remainingTempo = Math.max(0, grandTotal - dp);

  return {
    subtotal: subtotal,
    tax: tax,
    baseTotal: baseTotal,
    shippingCost: shippingCost,
    feeNote: feeNote,
    preQrisTotal: preQrisTotal,
    mdrRate: mdrRate,
    isQris: isQris,
    isQrisCustomer: isQrisCustomer,
    qrisFee: qrisFee,
    customerQrisFee: customerQrisFee,
    grandTotal: grandTotal,
    rawCashStr: rawCashStr,
    hasExplicitCash: hasExplicitCash,
    cashReceived: cashReceived,
    changeAmount: changeAmount,
    dp: dp,
    remainingTempo: remainingTempo,
    method: method,
    type: type
  };
}

function updateCheckoutModalTotalsUI(baseTotalOverride) {
  const st = getCheckoutPricingState(baseTotalOverride);
  window._CURRENT_CHECKOUT_QRIS_FEE = st.qrisFee;

  const totalEl = document.getElementById('chk-grand-total-display');
  if (totalEl) totalEl.textContent = formatRupiah(st.grandTotal);

  const breakdownEl = document.getElementById('chk-breakdown-display');
  if (breakdownEl) {
    const parts = ['<span>Produk: <strong>' + formatRupiah(st.subtotal) + '</strong></span>'];
    if (st.tax > 0) parts.push('<span>Pajak: <strong>' + formatRupiah(st.tax) + '</strong></span>');
    if (st.shippingCost > 0) {
      const feeLbl = st.feeNote ? escapeHtml(st.feeNote) : 'Ongkir/Biaya';
      parts.push('<span style="color:var(--primary);">+ ' + feeLbl + ': <strong>' + formatRupiah(st.shippingCost) + '</strong></span>');
    }
    if (st.customerQrisFee > 0) {
      parts.push('<span style="color:var(--primary);">+ QRIS (' + st.mdrRate + '%): <strong>' + formatRupiah(st.customerQrisFee) + '</strong></span>');
    }
    breakdownEl.innerHTML = parts.join(' <span style="opacity:0.4;">•</span> ');
  }

  const qrisBox = document.getElementById('chk-qris-fee-box');
  if (qrisBox) {
    if (!st.isQris) {
      qrisBox.style.display = 'none';
      qrisBox.innerHTML = '';
    } else {
      qrisBox.style.display = 'block';
      if (st.mdrRate <= 0) {
        qrisBox.innerHTML = '<span style="color:var(--text-muted);"><i class="fas fa-info-circle"></i> Biaya MDR QRIS diatur 0% (Bebas biaya transaksi).</span>';
      } else if (st.isQrisCustomer) {
        qrisBox.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span><i class="fas fa-qrcode"></i> Biaya Admin QRIS (' + st.mdrRate + '%):</span>' +
          '<strong style="color:var(--primary);font-size:13px;">' + formatRupiah(st.qrisFee) + '</strong>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">' +
          'Biaya MDR dibebankan ke pelanggan. Total wajib dibayar: <strong>' + formatRupiah(st.grandTotal) + '</strong>.' +
          '</div>';
      } else {
        const netReceived = Math.max(0, st.grandTotal - st.qrisFee);
        qrisBox.innerHTML =
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
          '<span><i class="fas fa-qrcode"></i> Biaya MDR QRIS (' + st.mdrRate + '%):</span>' +
          '<strong style="color:#d97706;font-size:13px;">' + formatRupiah(st.qrisFee) + '</strong>' +
          '</div>' +
          '<div style="font-size:11px;color:var(--text-muted);">' +
          'Biaya MDR ditanggung toko. Estimasi penerimaan bersih: <strong>' + formatRupiah(netReceived) + '</strong> (Tagihan pelanggan tetap ' + formatRupiah(st.grandTotal) + ').' +
          '</div>';
      }
    }
  }

  const cashBox = document.getElementById('chk-cash-box');
  if (cashBox) {
    const showCash = st.method === 'Tunai' && st.type === 'full';
    cashBox.style.display = showCash ? 'block' : 'none';
    const changeEl = document.getElementById('chk-cash-change-display');
    if (changeEl && showCash) {
      if (!st.hasExplicitCash) {
        changeEl.innerHTML = '<span style="color:#16a34a;font-weight:600;">Uang Pas (' + formatRupiah(st.grandTotal) + ') &bull; Kembalian: <strong>Rp 0</strong></span>';
      } else if (st.cashReceived >= st.grandTotal) {
        changeEl.innerHTML = '<span style="color:#16a34a;font-weight:700;">Kembalian: ' + formatRupiah(st.changeAmount) + '</span>';
      } else {
        changeEl.innerHTML = '<span style="color:#ef4444;font-weight:700;">⚠️ Kurang Bayar: ' + formatRupiah(Math.abs(st.changeAmount)) + '</span>';
      }
    }
  }

  const tempoBox = document.getElementById('chk-tempo-box');
  if (tempoBox) {
    const showTempo = st.type === 'installment';
    tempoBox.style.display = showTempo ? 'block' : 'none';
    if (showTempo) {
      const dueEl = document.getElementById('chk-due');
      if (dueEl && !dueEl.value) {
        const txDateEl = document.getElementById('chk-date');
        dueEl.value = addDaysLocalYMD(txDateEl ? txDateEl.value : '', 14);
      }
      const remEl = document.getElementById('chk-tempo-remaining-display');
      if (remEl) {
        if (st.dp >= st.grandTotal && st.grandTotal > 0) {
          remEl.innerHTML = '<span style="color:#d97706;font-weight:600;">⚠️ Uang muka &ge; Total tagihan. Ubah ke Lunas Seketika atau kurangi DP.</span>';
        } else {
          remEl.innerHTML = 'Sisa Piutang: <strong style="color:#d97706;">' + formatRupiah(st.remainingTempo) + '</strong>';
        }
      }
    }
  }
}

function setCheckoutShippingQuick(amount) {
  const inp = document.getElementById('chk-shipping');
  if (!inp) return;
  inp.value = Number(amount || 0) > 0 ? String(amount) : '';
  updateCheckoutModalTotalsUI();
}

function setCheckoutCashQuick(amount) {
  const inp = document.getElementById('chk-cash-received');
  if (!inp) return;
  if (amount === 'exact') {
    const st = getCheckoutPricingState();
    inp.value = String(st.grandTotal);
  } else {
    inp.value = String(amount);
  }
  updateCheckoutModalTotalsUI();
}

function resolveTxExtraFeeSummary(tx) {
  const src = tx || {};
  const subtotal = Number(src.subtotal !== undefined ? src.subtotal : (src.total || 0)) || 0;
  const tax = Number(src.tax || 0) || 0;
  const total = Number(src.total || 0) || 0;
  let shippingCost = Math.max(0, Math.round(Number(src.shipping_cost || 0) || 0));
  const feeNote = String(src.fee_note || '').trim();
  const rawQrisFee = Math.max(0, Math.round(Number(src.qris_fee || 0) || 0));
  const basePlusShip = subtotal + tax + shippingCost;
  let customerQrisFee = 0;
  if (rawQrisFee > 0 && total > basePlusShip) {
    customerQrisFee = Math.min(rawQrisFee, Math.max(0, Math.round(total - basePlusShip)));
  }
  const accounted = basePlusShip + customerQrisFee;
  let unitemizedExtra = Math.max(0, Math.round(total - accounted));
  if (unitemizedExtra > 0 && shippingCost === 0 && customerQrisFee === 0) {
    shippingCost = unitemizedExtra;
    unitemizedExtra = 0;
  }
  const shippingLabel = feeNote ? ('Biaya Tambahan (' + feeNote + ')') : 'Ongkir / Biaya Tambahan';
  const cashReceived = Math.max(0, Math.round(Number(src.cash_received || 0) || 0));
  const changeAmount = Math.max(0, Math.round(Number(src.change_amount || 0) || 0));
  return {
    subtotal: subtotal,
    tax: tax,
    total: total,
    shippingCost: shippingCost,
    feeNote: feeNote,
    shippingLabel: shippingLabel,
    rawQrisFee: rawQrisFee,
    customerQrisFee: customerQrisFee,
    unitemizedExtra: unitemizedExtra,
    cashReceived: cashReceived,
    changeAmount: changeAmount,
    hasBreakdown: (tax > 0 || shippingCost > 0 || customerQrisFee > 0 || unitemizedExtra > 0)
  };
}

function buildTxExtraFeeHTML(summary, mode) {
  const rows = [];
  if (summary.tax > 0) rows.push({ label: 'Pajak', value: formatRupiah(summary.tax) });
  if (summary.shippingCost > 0) rows.push({ label: escapeHtml(summary.shippingLabel), value: formatRupiah(summary.shippingCost) });
  if (summary.customerQrisFee > 0) rows.push({ label: 'Biaya Admin QRIS', value: formatRupiah(summary.customerQrisFee) });
  if (summary.unitemizedExtra > 0) rows.push({ label: 'Biaya Lainnya', value: formatRupiah(summary.unitemizedExtra) });

  return rows.map(function (r) {
    if (mode === 'thermal') {
      return '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>' + r.label + ':</span><span>' + r.value + '</span></div>';
    }
    if (mode === 'minimalist') {
      return '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#64748B;"><span>' + r.label + ':</span><span>' + r.value + '</span></div>';
    }
    if (mode === 'formal') {
      return '<tr><td colspan="4" style="text-align:right;padding:4px 12px;color:#475569;font-weight:500;border:1px solid #E2E8F0;">' + r.label + ':</td><td style="text-align:right;padding:4px 12px;font-weight:600;border:1px solid #E2E8F0;">' + r.value + '</td></tr>';
    }
    if (mode === 'standalone') {
      return '<tr><td colspan="4" style="text-align:right;padding:6px 12px;font-weight:600;">' + r.label + ':</td><td style="text-align:right;padding:6px 12px;font-weight:600;">' + r.value + '</td></tr>';
    }
    return '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>' + r.label + ':</span><span>' + r.value + '</span></div>';
  }).join('');
}

function buildTxCashHTML(summary, mode) {
  if (!summary || summary.cashReceived <= 0) return '';
  if (mode === 'thermal') {
    return '<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:3px;color:#333;"><span>Bayar Tunai:</span><span>' + formatRupiah(summary.cashReceived) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:#333;"><span>Kembalian:</span><span>' + formatRupiah(summary.changeAmount) + '</span></div>';
  }
  if (mode === 'minimalist') {
    return '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11.5px;color:#475569;"><span>Bayar Tunai:</span><span>' + formatRupiah(summary.cashReceived) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11.5px;color:#16A34A;font-weight:600;"><span>Kembalian:</span><span>' + formatRupiah(summary.changeAmount) + '</span></div>';
  }
  if (mode === 'formal') {
    return '<tr><td colspan="4" style="text-align:right;padding:4px 12px;color:#475569;border:1px solid #E2E8F0;">Bayar Tunai:</td><td style="text-align:right;padding:4px 12px;border:1px solid #E2E8F0;">' + formatRupiah(summary.cashReceived) + '</td></tr>' +
      '<tr><td colspan="4" style="text-align:right;padding:4px 12px;color:#15803D;font-weight:600;border:1px solid #E2E8F0;">Kembalian:</td><td style="text-align:right;padding:4px 12px;color:#15803D;font-weight:600;border:1px solid #E2E8F0;">' + formatRupiah(summary.changeAmount) + '</td></tr>';
  }
  if (mode === 'standalone') {
    return '<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#4B5563;">Bayar Tunai:</td><td style="text-align:right;padding:6px 12px;">' + formatRupiah(summary.cashReceived) + '</td></tr>' +
      '<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#15803D;font-weight:600;">Kembalian:</td><td style="text-align:right;padding:6px 12px;color:#15803D;font-weight:600;">' + formatRupiah(summary.changeAmount) + '</td></tr>';
  }
  return '<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11.5px;color:var(--text-secondary);"><span>Bayar Tunai:</span><span>' + formatRupiah(summary.cashReceived) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11.5px;color:#16a34a;font-weight:600;"><span>Kembalian:</span><span>' + formatRupiah(summary.changeAmount) + '</span></div>';
}

function openCheckoutModal(total) {
  const custInput = document.getElementById('pos-customer-input');
  const enteredName = custInput ? custInput.value.trim() : (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : '');

  if (!enteredName) {
    showToast('Nama pelanggan wajib diisi sebelum checkout!', true);
    if (custInput) custInput.focus();
    return;
  }

  const taxRate = Number(APP_SETTINGS['tax_rate'] || 0) / 100;
  const subtotalCart = CART.reduce(function (s, i) { return s + (Number(i.qty || 0) * Number(i.price || 0)); }, 0);
  const taxCart = Math.round(subtotalCart * taxRate);
  window._CHECKOUT_CONTEXT = { subtotal: subtotalCart, tax: taxCart, baseTotal: Number(total || (subtotalCart + taxCart)) };
  window._CURRENT_CHECKOUT_QRIS_FEE = 0;

  const todayStr = getPurchaseLocalDateYMD(new Date().toISOString());
  const custName = enteredName;

  const curDate = (EDITING_TRANSACTION && EDITING_TRANSACTION.created_at)
    ? (getPurchaseLocalDateYMD(EDITING_TRANSACTION.created_at) || todayStr)
    : todayStr;
  const onlineOrder = (!EDITING_TRANSACTION && window.ACTIVE_ONLINE_ORDER_DATA) ? window.ACTIVE_ONLINE_ORDER_DATA : null;
  const curSource = (EDITING_TRANSACTION && EDITING_TRANSACTION.source)
    ? EDITING_TRANSACTION.source
    : (onlineOrder ? (onlineOrder.source || 'WhatsApp') : 'Offline');
  const curMethod = (EDITING_TRANSACTION && EDITING_TRANSACTION.payment_method) ? EDITING_TRANSACTION.payment_method : 'Tunai';
  const curType = (EDITING_TRANSACTION && EDITING_TRANSACTION.payment_type) ? EDITING_TRANSACTION.payment_type : 'full';
  const curShipping = (EDITING_TRANSACTION && Number(EDITING_TRANSACTION.shipping_cost || 0) > 0) ? Number(EDITING_TRANSACTION.shipping_cost) : '';
  const curFeeNote = (EDITING_TRANSACTION && EDITING_TRANSACTION.fee_note) ? String(EDITING_TRANSACTION.fee_note) : '';
  const curCashReceived = (EDITING_TRANSACTION && Number(EDITING_TRANSACTION.cash_received || 0) > 0) ? Number(EDITING_TRANSACTION.cash_received) : '';
  const curDueDate = (EDITING_TRANSACTION && EDITING_TRANSACTION.due_date)
    ? (getPurchaseLocalDateYMD(EDITING_TRANSACTION.due_date) || addDaysLocalYMD(curDate, 14))
    : addDaysLocalYMD(curDate, 14);

  const chipBtnStyle = 'padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid var(--border);background:var(--surface-card,var(--surface-muted));color:var(--text-main);cursor:pointer;';
  const onlineBannerHtml = onlineOrder ? (
    '<div style="margin:0 0 12px;padding:10px 12px;border-radius:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.28);font-size:12px;text-align:left;line-height:1.5;">' +
    '<div style="font-weight:700;color:#059669;">📦 Pesanan Online #' + escapeHtml(onlineOrder.order_no || '') + '</div>' +
    (onlineOrder.delivery_method ? '<div>🚚 Pengambilan: <strong>' + escapeHtml(onlineOrder.delivery_method) + '</strong></div>' : '') +
    (onlineOrder.notes ? '<div>📝 Catatan: <em>' + escapeHtml(onlineOrder.notes) + '</em></div>' : '') +
    '</div>'
  ) : '';

  const bodyHtml =
    '<div style="text-align:center;padding:8px 0 14px;">' +
    '<div style="font-size:12px;color:var(--text-secondary);">TOTAL TAGIHAN AKHIR</div>' +
    '<div id="chk-grand-total-display" style="font-size:32px;font-weight:800;color:var(--primary);font-family:\'Plus Jakarta Sans\',sans-serif;">' + formatRupiah(total) + '</div>' +
    '<div id="chk-breakdown-display" style="font-size:11.5px;color:var(--text-secondary);margin-top:4px;"></div>' +
    '<div style="font-size:13px;color:var(--text-main);margin-top:4px;">Nota Atas Nama: <strong>' + escapeHtml(custName) + '</strong></div>' +
    '</div>' +
    onlineBannerHtml +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Tgl Transaksi</label>' +
    '<div class="input-wrapper"><input type="date" id="chk-date" value="' + curDate + '" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Kanal Penjualan</label>' +
    '<div class="input-wrapper">' +
    '<select id="chk-source" style="padding-left:14px;">' +
    '<option value="Offline"' + (curSource === 'Offline' ? ' selected' : '') + '>Offline Toko</option>' +
    '<option value="WhatsApp"' + (curSource === 'WhatsApp' ? ' selected' : '') + '>WhatsApp</option>' +
    '<option value="Shopee"' + (curSource === 'Shopee' ? ' selected' : '') + '>Shopee</option>' +
    '<option value="Tokopedia"' + (curSource === 'Tokopedia' ? ' selected' : '') + '>Tokopedia</option>' +
    '<option value="TikTok"' + (curSource === 'TikTok' ? ' selected' : '') + '>TikTok Shop</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Ongkir / Biaya Tambahan (Rp)</label>' +
    '<div class="input-wrapper"><input type="number" min="0" id="chk-shipping" value="' + curShipping + '" placeholder="0" oninput="updateCheckoutModalTotalsUI()" style="padding-left:14px;"></div>' +
    '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px;">' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutShippingQuick(0)">Rp 0</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutShippingQuick(10000)">10rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutShippingQuick(15000)">15rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutShippingQuick(20000)">20rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutShippingQuick(25000)">25rb</button>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Keterangan Biaya (Opsional)</label>' +
    '<div class="input-wrapper"><input type="text" id="chk-fee-note" value="' + escapeHtml(curFeeNote) + '" placeholder="Misal: Ongkir JNE / Packing" oninput="updateCheckoutModalTotalsUI()" style="padding-left:14px;"></div>' +
    '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Metode Pembayaran</label>' +
    '<div class="input-wrapper">' +
    '<select id="chk-method" onchange="updateCheckoutModalTotalsUI()" style="padding-left:14px;">' +
    '<option value="Tunai"' + (curMethod === 'Tunai' ? ' selected' : '') + '>Tunai / Cash</option>' +
    '<option value="Transfer Bank"' + (curMethod === 'Transfer Bank' ? ' selected' : '') + '>Transfer Bank</option>' +
    '<option value="QRIS"' + (curMethod === 'QRIS' ? ' selected' : '') + '>QRIS</option>' +
    '<option value="E-Wallet"' + (curMethod === 'E-Wallet' ? ' selected' : '') + '>E-Wallet</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Tipe Pembayaran</label>' +
    '<div class="input-wrapper">' +
    '<select id="chk-type" onchange="updateCheckoutModalTotalsUI()" style="padding-left:14px;">' +
    '<option value="full"' + (curType === 'full' ? ' selected' : '') + '>Lunas Seketika</option>' +
    '<option value="installment"' + (curType === 'installment' ? ' selected' : '') + '>Cicilan / Tempo (Piutang)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="chk-qris-fee-box" style="display:none;margin-bottom:12px;padding:12px;background:var(--surface-muted);border-radius:var(--radius-sm);border-left:4px solid var(--primary);font-size:12px;"></div>' +
    '<div id="chk-cash-box" style="display:none;margin-bottom:12px;padding:12px;background:var(--surface-muted);border-radius:var(--radius-sm);border-left:4px solid #16a34a;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">' +
    '<label class="field-label" style="margin:0;">Uang Diterima / Tunai (Rp)</label>' +
    '<span style="font-size:11px;color:var(--text-secondary);">Kosongkan = Uang Pas</span>' +
    '</div>' +
    '<div class="input-wrapper"><input type="number" min="0" id="chk-cash-received" value="' + curCashReceived + '" placeholder="Otomatis Uang Pas..." oninput="updateCheckoutModalTotalsUI()" style="padding-left:14px;"></div>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;">' +
    '<button type="button" style="' + chipBtnStyle + 'font-weight:600;color:#16a34a;" onclick="setCheckoutCashQuick(\'exact\')">Uang Pas</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutCashQuick(50000)">Rp 50rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutCashQuick(100000)">Rp 100rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutCashQuick(200000)">Rp 200rb</button>' +
    '<button type="button" style="' + chipBtnStyle + '" onclick="setCheckoutCashQuick(500000)">Rp 500rb</button>' +
    '</div>' +
    '<div id="chk-cash-change-display" style="margin-top:8px;font-size:13px;"></div>' +
    '</div>' +
    '<div id="chk-tempo-box" style="display:none;padding:12px;background:var(--surface-muted);border-radius:var(--radius-sm);border-left:4px solid #d97706;margin-bottom:12px;">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
    '<div>' +
    '<label class="field-label">Uang Muka (DP)</label>' +
    '<div class="input-wrapper"><input type="number" min="0" id="chk-dp" placeholder="0" oninput="updateCheckoutModalTotalsUI()" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Jatuh Tempo Tagihan</label>' +
    '<div class="input-wrapper"><input type="date" id="chk-due" value="' + curDueDate + '" style="padding-left:14px;"></div>' +
    '</div>' +
    '</div>' +
    '<div id="chk-tempo-remaining-display" style="margin-top:8px;font-size:12.5px;"></div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" id="btn-submit-checkout" class="btn btn-primary" onclick="submitCheckout()">' + (EDITING_TRANSACTION ? 'Simpan Revisi Nota' : 'Selesaikan Transaksi') + '</button>';

  openModal('Checkout Pembayaran', bodyHtml, footerHtml);
  updateCheckoutModalTotalsUI();
}

function submitCheckout() {
  const submitBtn = document.getElementById('btn-submit-checkout');
  if (submitBtn && submitBtn.disabled) return;

  const custInput = document.getElementById('pos-customer-input');
  const enteredName = custInput ? custInput.value.trim() : (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : '');

  if (!enteredName) {
    showToast('Nama pelanggan wajib diisi untuk rekonsiliasi keuangan.', true);
    return;
  }

  const method = document.getElementById('chk-method').value;
  const type = document.getElementById('chk-type').value;
  const source = document.getElementById('chk-source').value;
  const txDate = document.getElementById('chk-date').value;
  if (txDate) {
    const lockCheck = isDateLockedByClosing(txDate);
    if (lockCheck.locked) {
      showToast('⚠️ Transaksi kasir ditolak: Tanggal ' + txDate + ' berada pada periode yang telah ditutup buku (' + lockCheck.periodName + ').', true);
      return;
    }
  }
  const taxRate = Number(APP_SETTINGS['tax_rate'] || 0) / 100;

  const saveMemberChk = document.getElementById('pos-save-member-chk');
  const isSaveMember = saveMemberChk ? saveMemberChk.checked : false;
  const phoneInput = document.getElementById('pos-customer-phone-input');
  const phoneVal = (phoneInput && phoneInput.value.trim())
    ? phoneInput.value.trim()
    : ((SELECTED_CUSTOMER && SELECTED_CUSTOMER.phone)
      ? String(SELECTED_CUSTOMER.phone).trim()
      : ((window.ACTIVE_ONLINE_ORDER_DATA && window.ACTIVE_ONLINE_ORDER_DATA.customer_phone)
        ? String(window.ACTIVE_ONLINE_ORDER_DATA.customer_phone).trim()
        : ''));

  if (type === 'installment' && !phoneVal && (!SELECTED_CUSTOMER || !SELECTED_CUSTOMER.phone)) {
    showToast('Transaksi cicilan / piutang tempo wajib memiliki nomor kontak pelanggan!', true);
    return;
  }

  // Hitung rincian total (Subtotal Produk + Pajak + Ongkir/Biaya Tambahan + Admin QRIS)
  const subtotalCart = CART.reduce(function (sum, item) {
    return sum + (Number(item.qty || 0) * Number(item.price || 0));
  }, 0);
  const taxCart = Math.round(subtotalCart * taxRate);
  const pricing = getCheckoutPricingState(subtotalCart + taxCart);

  if (method === 'Tunai' && type === 'full' && pricing.hasExplicitCash && pricing.cashReceived < pricing.grandTotal) {
    showToast('Nominal uang tunai diterima kurang dari Total Tagihan (' + formatRupiah(pricing.grandTotal) + ').', true);
    const cashEl = document.getElementById('chk-cash-received');
    if (cashEl) cashEl.focus();
    return;
  }

  let dpVal = 0;
  let dueDateVal = '';
  if (type === 'installment') {
    dpVal = Math.round(Number(document.getElementById('chk-dp').value || 0) || 0);
    dueDateVal = document.getElementById('chk-due').value;
    if (dpVal < 0) {
      showToast('Uang muka (DP) tidak boleh negatif.', true);
      return;
    }
    if (dpVal >= pricing.grandTotal && pricing.grandTotal > 0) {
      showToast('DP sudah mencapai Total Tagihan! Ubah tipe pembayaran menjadi Lunas Seketika.', true);
      return;
    }
    if (!dueDateVal) {
      showToast('Tanggal jatuh tempo piutang wajib diisi.', true);
      return;
    }
  }

  // Validasi Restriksi Mutu Kasir POS:
  // - Cek tipe produk tiap item di keranjang:
  //   * NON-BENIH: Langsung izinkan tanpa mengecek status QC maupun uji semai.
  //   * BENIH: Wajib validasi qc_status === 'APPROVED' dan daya tumbuh minimal 80%.
  for (let i = 0; i < CART.length; i++) {
    const item = CART[i];
    const prod = PRODUCTS_CACHE.filter(function (x) { return x.id === item.product_id; })[0];
    if (prod && isSeedProductClient(prod)) {
      if (item.selected_batch_id && prod.batches) {
        const targetB = prod.batches.filter(function (b) { return b.id === item.selected_batch_id; })[0];
        if (targetB) {
          const qcUpper = String(targetB.qc_status || '').toUpperCase();
          if (qcUpper !== 'APPROVED' && qcUpper !== 'PASSED') {
            showToast('Gagal: Batch "' + (targetB.batch_code || targetB.id) + '" pada produk benih "' + prod.name + '" belum lolos Quality Control (Status: ' + targetB.qc_status + ').', true);
            return;
          }
          if (Number(targetB.qty_remaining || 0) < item.qty) {
            showToast('Gagal: Stok batch "' + targetB.id + '" tidak mencukupi (' + targetB.qty_remaining + ' tersedia, butuh ' + item.qty + '). Silakan pilih Otomatis FEFO atau sesuaikan kuantitas.', true);
            return;
          }
        }
      } else if (prod.batches && prod.batches.length > 0) {
        const hasApprovedBatch = prod.batches.some(function (b) {
          const qcUpper = String(b.qc_status || '').toUpperCase();
          return (qcUpper === 'APPROVED' || qcUpper === 'PASSED') && Number(b.qty_remaining || 0) > 0;
        });
        if (!hasApprovedBatch) {
          showToast('Gagal: Produk benih "' + prod.name + '" belum memiliki batch yang lolos Quality Control (min 80%).', true);
          return;
        }
      }
    }
  }

  const finalCashReceived = (method === 'Tunai' && type === 'full') ? pricing.cashReceived : 0;
  const finalChangeAmount = (method === 'Tunai' && type === 'full') ? Math.max(0, pricing.cashReceived - pricing.grandTotal) : 0;

  const payload = {
    items: CART.map(function (c) {
      return {
        product_id: c.product_id,
        name: c.name || '',
        qty: c.qty,
        price: c.price,
        batch_id: c.selected_batch_id || ''
      };
    }),
    source: source,
    customer_id: SELECTED_CUSTOMER ? SELECTED_CUSTOMER.id : '',
    customer_name: enteredName,
    customer_phone: phoneVal,
    save_as_member: isSaveMember || (type === 'installment' && (!SELECTED_CUSTOMER || !SELECTED_CUSTOMER.id)),
    transaction_date: txDate,
    payment_method: method,
    payment_type: type,
    taxRate: taxRate,
    subtotal: subtotalCart,
    tax: taxCart,
    shipping_cost: pricing.shippingCost,
    fee_note: pricing.feeNote,
    qris_fee: pricing.qrisFee,
    qris_charged_to_customer: pricing.isQrisCustomer,
    cash_received: finalCashReceived,
    change_amount: finalChangeAmount,
    total: pricing.grandTotal
  };

  if (EDITING_TRANSACTION && EDITING_TRANSACTION.invoice_no) {
    payload.invoice_no = EDITING_TRANSACTION.invoice_no;
  }

  if (type === 'installment') {
    payload.downPayment = dpVal;
    payload.paid_amount = dpVal;
    payload.due_date = dueDateVal;
  }

  const origBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Memproses...';
  }

  showToast('Memproses transaksi FIFO/FEFO...');
  const apiCall = EDITING_TRANSACTION
    ? api('updateTransaction', TOKEN, EDITING_TRANSACTION.id, payload)
    : api('createTransaction', TOKEN, payload);

  apiCall.then(function (res) {
    invalidateCache('products');
    invalidateCache('batches');
    invalidateCache('mutations');
    invalidateCache('stock_mutations');
    invalidateCache('dashboard');
    invalidateCache('receivables');
    invalidateCache('recentInvoices');
    if (isSaveMember) invalidateCache('customers');

    window._lastTxReceipt = {
      id: res.id,
      invoice_no: res.invoice_no || payload.invoice_no || res.id,
      name: enteredName,
      phone: phoneVal,
      total: res.total !== undefined ? res.total : pricing.grandTotal,
      subtotal: res.subtotal !== undefined ? res.subtotal : subtotalCart,
      tax: res.tax !== undefined ? res.tax : taxCart,
      shipping_cost: res.shipping_cost !== undefined ? res.shipping_cost : pricing.shippingCost,
      fee_note: res.fee_note !== undefined ? res.fee_note : pricing.feeNote,
      qris_fee: res.qris_fee !== undefined ? res.qris_fee : pricing.qrisFee,
      cash_received: res.cash_received !== undefined ? res.cash_received : finalCashReceived,
      change_amount: res.change_amount !== undefined ? res.change_amount : finalChangeAmount,
      method: method,
      payment_type: type,
      status: type === 'installment' ? 'tempo' : 'paid',
      down_payment: type === 'installment' ? dpVal : 0,
      remaining_receivable: type === 'installment' ? Math.max(0, (res.total !== undefined ? res.total : pricing.grandTotal) - dpVal) : 0,
      due_date: type === 'installment' ? dueDateVal : '',
      date: formatDate(res.date || new Date()),
      created_at: res.date || new Date().toISOString(),
      items: CART.map(function (c) {
        return {
          name: c.name,
          product_name: c.name,
          qty: c.qty,
          price: c.price,
          subtotal: Number(c.qty || 0) * Number(c.price || 0),
          batch_id: c.selected_batch_id || '',
          selected_expiry: c.selected_expiry,
          selected_batch_id: c.selected_batch_id
        };
      })
    };

    if (window.ACTIVE_ONLINE_ORDER_ID || window.ACTIVE_ONLINE_ORDER_NO) {
      const orderTarget = window.ACTIVE_ONLINE_ORDER_ID || window.ACTIVE_ONLINE_ORDER_NO;
      updateOnlineOrderStatus(orderTarget, 'completed');
    }
    closeModal();
    openTxSuccessModal(res, payload);
    resetCart();
    updateGlobalReceivableBadge();
  }).catch(function (err) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText || 'Selesaikan Transaksi';
    }
    showToast('Gagal memproses transaksi: ' + (err.message || err), true);
  });
}

function openTxSuccessModal(res, payload) {
  const custName = payload.customer_name || (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : 'Umum');
  const displayNo = (res && res.invoice_no) || (payload && payload.invoice_no) || res.id;
  const shippingVal = Number((res && res.shipping_cost !== undefined) ? res.shipping_cost : (payload.shipping_cost || 0));
  const feeNote = (res && res.fee_note !== undefined) ? res.fee_note : (payload.fee_note || '');
  const qrisCustomerVal = payload.qris_charged_to_customer ? Number((res && res.qris_fee !== undefined) ? res.qris_fee : (payload.qris_fee || 0)) : 0;
  const cashVal = Number((res && res.cash_received !== undefined) ? res.cash_received : (payload.cash_received || 0));
  const changeVal = Number((res && res.change_amount !== undefined) ? res.change_amount : (payload.change_amount || 0));

  let extraLines = '';
  if (shippingVal > 0) {
    extraLines += '<div>' + escapeHtml(feeNote ? ('Biaya (' + feeNote + ')') : 'Ongkir / Biaya Tambahan') + ': <strong>' + formatRupiah(shippingVal) + '</strong></div>';
  }
  if (qrisCustomerVal > 0) {
    extraLines += '<div>Biaya Admin QRIS: <strong>' + formatRupiah(qrisCustomerVal) + '</strong></div>';
  }
  if (cashVal > 0) {
    extraLines += '<div>Uang Tunai: <strong>' + formatRupiah(cashVal) + '</strong> &bull; Kembalian: <strong style="color:#16a34a;">' + formatRupiah(changeVal) + '</strong></div>';
  }
  if (payload.payment_type === 'installment') {
    const dpVal = Number(payload.downPayment || 0);
    const sisaVal = Math.max(0, Number(res.total || 0) - dpVal);
    extraLines += '<div>Tipe: <strong style="color:#d97706;">Tempo / Piutang</strong> (DP: ' + formatRupiah(dpVal) + ' &bull; Sisa: <strong>' + formatRupiah(sisaVal) + '</strong>)</div>';
  }

  const bodyHtml =
    '<div style="text-align:center;padding:20px 0;">' +
    '<div style="font-size:48px;margin-bottom:12px;">✅</div>' +
    '<h2 style="margin-bottom:6px;">Transaksi Berhasil!</h2>' +
    '<p style="color:var(--text-secondary);font-size:13px;">Nota <strong>#' + escapeHtml(displayNo) + '</strong> tercatat rapi dalam database.</p>' +
    '<div style="background:var(--surface-muted);padding:14px;border-radius:var(--radius-sm);text-align:left;margin-top:16px;font-size:13px;line-height:1.6;">' +
    '<div>Total Pembayaran: <strong style="color:var(--primary);">' + formatRupiah(res.total) + '</strong></div>' +
    extraLines +
    '<div>Nota Atas Nama: <strong>' + escapeHtml(custName) + '</strong></div>' +
    '<div>Metode Bayar: <strong>' + escapeHtml(payload.payment_method) + '</strong></div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal();resetCart();renderPOS(true);">Transaksi Baru</button>' +
    '<button type="button" class="btn btn-secondary" onclick="printMiniReceipt(window._lastTxReceipt)">🖨️ Cetak Struk (PDF)</button>' +
    '<button type="button" class="btn btn-primary" onclick="sendReceiptToWhatsApp(window._lastTxReceipt)">💬 Kirim WA</button>';

  openModal('Transaksi Selesai', bodyHtml, footerHtml);
}


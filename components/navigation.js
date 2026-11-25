// Komponen UI: Client Hash Router, Navigasi Sidebar/Mobile, RBAC Guard & Badge Global

function updateGlobalReceivableBadge() {
  const badge = document.getElementById('badge-receivables-count');
  if (!badge || !TOKEN) return;

  if (isCacheValid('receivables')) {
    const activeCount = (DATA_CACHE.receivables.data || []).filter(function (r) { return r.status === 'active'; }).length;
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
    return;
  }

  api('getReceivables', TOKEN).then(function (recs) {
    const list = Array.isArray(recs) ? recs : [];
    DATA_CACHE.receivables = { data: list, timestamp: Date.now() };
    const activeCount = list.filter(function (r) { return r.status === 'active'; }).length;
    badge.textContent = activeCount;
    badge.style.display = activeCount > 0 ? 'inline-block' : 'none';
  }).catch(function () { });
}


// ========================= CLIENT ROUTER & MOBILE NAVIGATION =========================
function openSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeSidebarMobile() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
  if (typeof syncModalOpenState === 'function') {
    syncModalOpenState();
  } else {
    document.body.classList.remove('modal-open');
  }
}

function toggleSidebarMobile(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    closeSidebarMobile();
  } else {
    openSidebarMobile();
  }
}

window.openSidebarMobile = openSidebarMobile;
window.closeSidebarMobile = closeSidebarMobile;
window.toggleSidebarMobile = toggleSidebarMobile;


window.addEventListener('hashchange', function () { router(false); });

function navigateToRoute(route) {
  if (!route) return;
  route = route.replace(/^#/, '').trim() || 'dashboard';
  if (location.hash !== '#' + route) {
    try {
      location.hash = '#' + route;
      closeSidebarMobile();
      return;
    } catch (e) {
      console.warn('Hash navigation bypass:', e);
    }
  }
  router(false);
  closeSidebarMobile();
}

function showSection(sectionId) {
  if (!sectionId) return;
  navigateToRoute(sectionId);
}

function router(forceRefresh) {
  if (!TOKEN) return;
  let route = 'dashboard';
  try {
    route = (location.hash || '#dashboard').replace('#', '') || 'dashboard';
  } catch (e) {
    route = 'dashboard';
  }

  // Validasi izin can_view
  if (!userCanView(route)) {
    const allRoutes = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'expenses', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
    const allowed = allRoutes.filter(function (r) { return userCanView(r); })[0] || 'dashboard';
    if (allowed !== route) {
      showToast('Akses ke modul ' + route + ' dibatasi untuk peran ' + USER_ROLE + '.', true);
      location.hash = '#' + allowed;
      return;
    }
  }

  // Tampilkan atau sembunyikan Banner Mode Pantau (View-Only)
  const viewOnlyBanner = document.getElementById('view-only-banner');
  const roleNameEl = document.getElementById('view-only-role-name');
  if (viewOnlyBanner) {
    if (!userCanEdit(route)) {
      viewOnlyBanner.style.display = 'block';
      if (roleNameEl) roleNameEl.textContent = USER_ROLE;
    } else {
      viewOnlyBanner.style.display = 'none';
    }
  }

  updateSidebarVisibility();

  document.querySelectorAll('.nav-item').forEach(function (el) {
    if (el && el.dataset) {
      el.classList.toggle('active', el.dataset.route === route);
    }
  });

  const primaryRoutes = ['dashboard', 'pos', 'produk', 'stok'];
  document.querySelectorAll('.mobile-nav-item').forEach(function (el) {
    if (el && el.dataset) {
      el.classList.toggle('active', el.dataset.route === route);
    }
  });
  const moreMenuBtn = document.getElementById('mobile-menu-more-btn');
  if (moreMenuBtn) {
    moreMenuBtn.classList.toggle('active', !primaryRoutes.includes(route));
  }

  const titleEl = document.getElementById('current-view-title');
  const routeTitles = {
    'dashboard': 'Dashboard Ringkasan',
    'pos': 'Kasir (POS)',
    'produk': 'Katalog Produk',
    'stok': 'Stok & Antrean FIFO',
    'produksi': 'Kemas Mandiri & Produksi',
    'qc': 'Quality Control (QC)',
    'pembelian': 'Pembelian & Pengadaan',
    'konsinyasi': 'Konsinyasi Toko Mitra',
    'piutang': 'Piutang & Pembayaran Tempo',
    'expenses': 'Pengeluaran & Biaya Operasional',
    'crm': 'Pelanggan (CRM)',
    'purnajual': 'Purna Jual & Kepuasan Pelanggan',
    'purna-jual': 'Purna Jual & Kepuasan Pelanggan',
    'laporan': 'Laporan Penjualan & Margin',
    'pengaturan': 'Pengaturan Sistem',
    'faktur': 'Riwayat Transaksi & Faktur'
  };
  const rawTitle = routeTitles[route] || 'E-Kasir';
  if (titleEl) titleEl.textContent = (window.t ? window.t(rawTitle) : rawTitle);

  closeSidebarMobile();
  const activeTopbar = document.querySelector('.topbar');
  if (activeTopbar) activeTopbar.classList.remove('mobile-search-open');
  const mobSearchBtn = document.getElementById('mobile-search-toggle-btn');
  if (mobSearchBtn) mobSearchBtn.classList.remove('active');

  switch (route) {
    case 'dashboard': renderDashboard(forceRefresh); break;
    case 'pos': renderPOS(forceRefresh); break;
    case 'produk': renderProduk(forceRefresh); break;
    case 'stok': renderStok(forceRefresh); break;
    case 'produksi': renderProduksi(forceRefresh); break;
    case 'qc': renderQC(forceRefresh); break;
    case 'pembelian': renderPembelian(forceRefresh); break;
    case 'konsinyasi': renderKonsinyasi(forceRefresh); break;
    case 'piutang': renderPiutang(forceRefresh); break;
    case 'expenses': renderExpenses(forceRefresh); break;
    case 'crm': renderCRM(forceRefresh); break;
    case 'purnajual':
    case 'purna-jual': renderPurnaJual(forceRefresh); break;
    case 'laporan': renderLaporan(forceRefresh); break;
    case 'stok-valuasi':
    case 'valuasi-stok':
      switchLaporanMainView('stock_valuation');
      break;
    case 'pengaturan': renderPengaturan(forceRefresh); break;
    case 'faktur': renderFaktur(forceRefresh); break;
    default: renderPlaceholder(route); break;
  }

  applyViewOnlyRestrictions(route);
}

const PERM_EDIT_SELECTORS = [
  '#pos-btn-checkout',
  '#pos-btn-hold',
  '#btn-save-product',
  '#btn-submit-adj',
  '#btn-save-qc',
  '#btn-start-dht',
  '#btn-complete-dht',
  '#btn-submit-outlet',
  '#btn-submit-transfer',
  '#btn-submit-delivery',
  '#btn-submit-audit',
  '#btn-submit-consign-inv',
  '#btn-submit-rec-pay',
  '#btn-submit-claim',
  '#btn-submit-csl',
  '#btn-unlock-bank-settings',
  '#btn-save-tg',
  '#btn-test-tg',
  '#btn-webhook-tg',
  '#btn-save-user',
  '#btn-save-expense',
  '#btn-save-qris-cfg',
  '#btn-save-cat',
  'button[onclick*="openProductModal"]',
  'button[onclick*="submitProduct"]',
  'button[onclick*="addPriceTierRow"]',
  'button[onclick*="addBundledPackRow"]',
  'button[onclick*="addCustomTierToPack"]',
  'button[onclick*="openStockAdjustmentModal"]',
  'button[onclick*="submitStockAdjustment"]',
  'button[onclick*="submitProduction"]',
  'button[onclick*="processQuickPackaging"]',
  'button[onclick*="setGramToBatchMax"]',
  'button[onclick*="openQCEntryModal"]',
  'button[onclick*="actionCompleteDHT"]',
  'button[onclick*="submitQCForm"]',
  'button[onclick*="triggerQCCamera"]',
  'button[onclick*="removeQCPhoto"]',
  'button[onclick*="openPurchaseModal"]',
  'button[onclick*="openSupplierModal"]',
  'button[onclick*="openFarmerModal"]',
  'button[onclick*="submitPurchase"]',
  'button[onclick*="addPurchaseItemRow"]',
  'button[onclick*="regenerateBatchRow"]',
  'button[onclick*="toggleManualBatchInput"]',
  'button[onclick*="openCheckoutModal"]',
  'button[onclick*="submitCheckout"]',
  'button[onclick*="openQuickCustomerModal"]',
  'button[onclick*="updateCartQty"]',
  'button[onclick*="addToCartWithTier"]',
  'button[onclick*="openOutletModal"]',
  'button[onclick*="openTransferStockModal"]',
  'button[onclick*="openConsignmentAuditModal"]',
  'button[onclick*="openConsignmentInvoiceModal"]',
  'button[onclick*="openDeliveryReceiptModal"]',
  'button[onclick*="submitOutletForm"]',
  'button[onclick*="submitTransferStock"]',
  'button[onclick*="submitConsignmentAuditUI"]',
  'button[onclick*="submitConsignmentInvoice"]',
  'button[onclick*="submitDeliveryReceipt"]',
  'button[onclick*="addTransferStockRow"]',
  'button[onclick*="openPaymentReceivableModal"]',
  'button[onclick*="submitReceivablePayment"]',
  'button[onclick*="submitNewExpense"]',
  'button[onclick*="submitNewExpenseCategory"]',
  'button[onclick*="saveExpensesQrisConfig"]',
  'button[onclick*="resetDefaultExpenseCategories"]',
  'button[onclick*="openCustomerFormModal"]',
  'button[onclick*="submitCustomerForm"]',
  'button[onclick*="openClaimModal"]',
  'button[onclick*="claimSeedFromTransaction"]',
  'button[onclick*="createComplaintWithBatch"]',
  'button[onclick*="openConsultationModal"]',
  'button[onclick*="markFollowUpDirect"]',
  'button[onclick*="submitClaimForm"]',
  'button[onclick*="submitConsultationForm"]',
  'button[onclick*="startEditTransaction"]',
  'button[onclick*="saveStoreSettings"]',
  'button[onclick*="saveSessionTimeoutSettings"]',
  'button[onclick*="addPriceTierPresetRow"]',
  'button[onclick*="clearLogoSetting"]',
  'button[onclick*="unlockBankSettings"]',
  'button[onclick*="openRoleModal"]',
  'button[onclick*="saveRoleMatrixSettings"]',
  'button[onclick*="openUserModal"]',
  'button[onclick*="submitUserForm"]',
  'button[onclick*="submitRoleForm"]',
  'button[onclick*="saveTelegramSettings"]',
  'button[onclick*="testTelegramConnectionUI"]'
].join(', ');

const PERM_DELETE_SELECTORS = [
  '#btn-submit-void-tx',
  '#btn-execute-reset',
  '#panel-set-danger',
  'button[onclick*="deleteProductUI"]',
  'button[onclick*="deleteProductionUI"]',
  'button[onclick*="deletePurchaseUI"]',
  'button[onclick*="deleteTransactionUI"]',
  'button[onclick*="promptVoidTransaction"]',
  'button[onclick*="executeVoidTransaction"]',
  'button[onclick*="deleteOutletUI"]',
  'button[onclick*="deleteCustomerUI"]',
  'button[onclick*="deleteExpenseRecord"]',
  'button[onclick*="deleteExpenseUI"]',
  'button[onclick*="deleteExpenseCategory"]',
  'button[onclick*="deleteUserAccount"]',
  'button[onclick*="deleteUserUI"]',
  'button[onclick*="deleteCustomRole"]',
  'button[onclick*="openResetDataModal"]',
  'button[onclick*="executeResetTestingData"]',
  'button[onclick*=".remove()"]',
  '.btn-void'
].join(', ');

function isSafeNonMutationButton(el) {
  if (!el) return true;
  if (el.id === 'alert-modal-ok-btn' || el.id === 'confirm-modal-cancel-btn' || el.id === 'idle-stay-logged-in-btn' || el.id === 'idle-logout-now-btn' || el.classList.contains('modal-close-btn') || el.classList.contains('lang-btn')) {
    return true;
  }
  const onclickStr = String(el.getAttribute('onclick') || '').toLowerCase();
  if (!onclickStr) return false;
  return (
    onclickStr.indexOf('setlanguage') !== -1 ||
    onclickStr.indexOf('switch') !== -1 ||
    onclickStr.indexOf('scroll') !== -1 ||
    onclickStr.indexOf('selectroletab') !== -1 ||
    onclickStr.indexOf('filter') !== -1 ||
    onclickStr.indexOf('search') !== -1 ||
    onclickStr.indexOf('print') !== -1 ||
    onclickStr.indexOf('export') !== -1 ||
    onclickStr.indexOf('close') !== -1 ||
    onclickStr.indexOf('cancel') !== -1 ||
    onclickStr.indexOf('zoom') !== -1 ||
    onclickStr.indexOf('viewdeliveryreceiptmodal') !== -1 ||
    onclickStr.indexOf('openclaimphotoview') !== -1 ||
    onclickStr.indexOf('openqcphotoviewer') !== -1 ||
    onclickStr.indexOf('openqchistorymodal') !== -1 ||
    onclickStr.indexOf('openbatchdetailmodal') !== -1 ||
    onclickStr.indexOf('showbatchdetail') !== -1 ||
    onclickStr.indexOf('showcustomerdetail') !== -1 ||
    onclickStr.indexOf('showoutletdetailmodal') !== -1 ||
    onclickStr.indexOf('opentransactiondetailmodal') !== -1 ||
    onclickStr.indexOf('opentransactionhistorymodal') !== -1 ||
    onclickStr.indexOf('openinvoicemodal') !== -1 ||
    onclickStr.indexOf('loadinvoicepreview') !== -1 ||
    onclickStr.indexOf('opentransfersuratjalan') !== -1 ||
    onclickStr.indexOf('changemutationpage') !== -1 ||
    onclickStr.indexOf('notif') !== -1 ||
    onclickStr.indexOf('push') !== -1
  );
}

let _permObserverInitialized = false;
let _permApplying = false;

function getCurrentActiveRoute() {
  try {
    return normalizeModuleKey((location.hash || '#dashboard').replace('#', '') || 'dashboard');
  } catch (e) {
    return 'dashboard';
  }
}

function enforceRolePermissionsDOM(routeOverride) {
  if (_permApplying) return;
  _permApplying = true;
  try {
    const route = normalizeModuleKey(routeOverride || getCurrentActiveRoute());
    const isEditAllowed = userCanEdit(route);
    const isDeleteAllowed = userCanDelete(route);

    if (document.body) {
      document.body.classList.toggle('perm-no-edit', !isEditAllowed);
      document.body.classList.toggle('perm-no-delete', !isDeleteAllowed);
      document.body.classList.toggle('role-koordinator-active', isCoordinator());
    }

    // Pulihkan elemen yang sebelumnya disembunyikan jika sekarang diizinkan
    if (isEditAllowed) {
      document.querySelectorAll('[data-hidden-by-perm="edit"]').forEach(function (el) {
        el.style.removeProperty('display');
        el.removeAttribute('data-hidden-by-perm');
      });
    }
    if (isDeleteAllowed) {
      document.querySelectorAll('[data-hidden-by-perm="delete"]').forEach(function (el) {
        el.style.removeProperty('display');
        el.removeAttribute('data-hidden-by-perm');
      });
    }
    if (isEditAllowed && isDeleteAllowed) {
      document.querySelectorAll('.perm-empty-action-dash').forEach(function (el) { el.remove(); });
      return;
    }

    const scopes = [
      document.getElementById('content'),
      document.getElementById('modal-container'),
      document.getElementById('modal-qc-entry'),
      document.getElementById('modal-user-entry'),
      document.getElementById('modal-role-entry'),
      document.getElementById('modal-delivery-receipt')
    ].filter(Boolean);

    if (!isEditAllowed) {
      scopes.forEach(function (scope) {
        scope.querySelectorAll(PERM_EDIT_SELECTORS).forEach(function (el) {
          if (!isSafeNonMutationButton(el)) {
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-hidden-by-perm', 'edit');
          }
        });

        // Sembunyikan tombol upload logo pada Pengaturan
        scope.querySelectorAll('#set-logo-file, #set-logo-light-file').forEach(function (inp) {
          const lbl = inp.closest('label');
          if (lbl) {
            lbl.style.setProperty('display', 'none', 'important');
            lbl.setAttribute('data-hidden-by-perm', 'edit');
          }
        });
      });

      const contentEl = document.getElementById('content');
      if (contentEl) {
        // Sembunyikan card Form Pengemasan Baru di modul Kemas Mandiri agar bersih
        if (route === 'produksi') {
          const prodSource = contentEl.querySelector('#prod-source');
          const prodCard = prodSource ? prodSource.closest('.card') : null;
          if (prodCard) {
            prodCard.style.setProperty('display', 'none', 'important');
            prodCard.setAttribute('data-hidden-by-perm', 'edit');
          }
        }

        // Sembunyikan card Form Catat Pengeluaran & Tambah Kategori di modul Pengeluaran
        if (route === 'expenses') {
          const expForm = contentEl.querySelector('#form-new-expense');
          const expCard = expForm ? expForm.closest('.card') : null;
          if (expCard) {
            expCard.style.setProperty('display', 'none', 'important');
            expCard.setAttribute('data-hidden-by-perm', 'edit');
            if (expCard.parentElement && expCard.parentElement.style && expCard.parentElement.style.gridTemplateColumns) {
              expCard.parentElement.style.gridTemplateColumns = '1fr';
            }
          }
          const catInput = contentEl.querySelector('#cat-name-input');
          const catCard = catInput ? catInput.closest('.card') : null;
          if (catCard) {
            catCard.style.setProperty('display', 'none', 'important');
            catCard.setAttribute('data-hidden-by-perm', 'edit');
            if (catCard.parentElement && catCard.parentElement.style && catCard.parentElement.style.gridTemplateColumns) {
              catCard.parentElement.style.gridTemplateColumns = '1fr';
            }
          }
          contentEl.querySelectorAll('#qris-mdr-input, input[name="qris-mdr-payer"]').forEach(function (inp) {
            inp.disabled = true;
          });
        }

        // Kunci seluruh field input di modul Pengaturan (kecuali preferensi notifikasi HP pribadi)
        if (route === 'pengaturan') {
          contentEl.querySelectorAll('input, select, textarea').forEach(function (inp) {
            if (inp.hasAttribute('data-personal-notif-pref')) return;
            inp.disabled = true;
            inp.style.cursor = 'not-allowed';
          });
        }
      }
    }

    if (!isDeleteAllowed) {
      scopes.forEach(function (scope) {
        scope.querySelectorAll(PERM_DELETE_SELECTORS).forEach(function (el) {
          if (!isSafeNonMutationButton(el)) {
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-hidden-by-perm', 'delete');
          }
        });
        scope.querySelectorAll('.btn-danger').forEach(function (el) {
          if (!isSafeNonMutationButton(el)) {
            el.style.setProperty('display', 'none', 'important');
            el.setAttribute('data-hidden-by-perm', 'delete');
          }
        });
      });
    }

    // Rapikan kolom Aksi pada tabel: jika seluruh tombol di dalam <td> disembunyikan, tampilkan tanda '—'
    const contentNode = document.getElementById('content');
    if (contentNode) {
      contentNode.querySelectorAll('table tbody td').forEach(function (td) {
        const hasHiddenBtn = td.querySelector('[data-hidden-by-perm]');
        if (!hasHiddenBtn) return;
        const visibleInteractive = Array.from(td.querySelectorAll('button, a.btn, input, select')).filter(function (item) {
          return item.style.display !== 'none' && !item.hasAttribute('data-hidden-by-perm');
        });
        const existingDash = td.querySelector('.perm-empty-action-dash');
        if (visibleInteractive.length === 0) {
          const plainText = td.textContent.replace(/s+/g, '').trim();
          // Cek apakah teks yang tersisa hanya berasal dari tombol yang disembunyikan
          let clone = td.cloneNode(true);
          clone.querySelectorAll('[data-hidden-by-perm], .perm-empty-action-dash').forEach(function (n) { n.remove(); });
          if (!clone.textContent.trim() && !existingDash) {
            const dash = document.createElement('span');
            dash.className = 'perm-empty-action-dash';
            dash.style.cssText = 'color:#9CA3AF;font-size:12px;user-select:none;';
            dash.textContent = '—';
            td.appendChild(dash);
          }
        } else if (existingDash) {
          existingDash.remove();
        }
      });
    }
  } finally {
    _permApplying = false;
  }
}

function initPermissionDOMObserver() {
  if (_permObserverInitialized || typeof MutationObserver === 'undefined') return;
  _permObserverInitialized = true;
  let rafScheduled = false;
  const observer = new MutationObserver(function () {
    if (_permApplying || rafScheduled) return;
    const route = getCurrentActiveRoute();
    if (userCanEdit(route) && userCanDelete(route)) return;
    rafScheduled = true;
    requestAnimationFrame(function () {
      rafScheduled = false;
      enforceRolePermissionsDOM();
    });
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function applyViewOnlyRestrictions(route) {
  initPermissionDOMObserver();
  enforceRolePermissionsDOM(route);
  setTimeout(function () {
    enforceRolePermissionsDOM(route);
  }, 150);
}

function renderPlaceholder(route) {
  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML =
    '<div class="card" style="text-align:center;padding:60px 20px;">' +
    '<h2>Modul "' + escapeHtml(route) + '"</h2>' +
    '<p style="color:var(--text-secondary);margin-top:8px;">Modul ini sedang disiapkan.</p>' +
    '</div>';
}


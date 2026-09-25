// ========================= PENYIMPANAN AMAN & SESI BROWSER =========================
function getSafeSession(key) {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  } catch (e) {
    return window['__mem_' + key] || '';
  }
}

function setSafeSession(key, val) {
  try {
    sessionStorage.setItem(key, val);
    localStorage.setItem(key, val);
  } catch (e) {
    window['__mem_' + key] = val;
  }
}

function removeSafeSession(key) {
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch (e) {
    delete window['__mem_' + key];
  }
}

// ========================= GLOBAL STATE & SMART CACHE SISTEM =========================
let TOKEN = getSafeSession('ekasir_token') || null;
let USER_NAME = getSafeSession('ekasir_user') || '';
let USER_ROLE = getSafeSession('ekasir_role') || (String(USER_NAME).toLowerCase() === 'admin' ? 'Admin' : 'Kasir');
let CURRENT_USER = { name: USER_NAME, username: USER_NAME, role: USER_ROLE };
window._currentUser = CURRENT_USER;

let CURRENT_USER_PERMISSIONS = null;
try {
  const cachedPerms = getSafeSession('ekasir_permissions');
  if (cachedPerms) CURRENT_USER_PERMISSIONS = JSON.parse(cachedPerms);
} catch (e) { }

let AVAILABLE_ROLES = ['Admin', 'Koordinator', 'QC', 'Kasir'];
try {
  const cachedRoles = getSafeSession('ekasir_available_roles');
  if (cachedRoles) AVAILABLE_ROLES = JSON.parse(cachedRoles);
} catch (e) { }

function isAdmin() {
  const r = (CURRENT_USER && CURRENT_USER.role) || USER_ROLE || '';
  const u = (CURRENT_USER && CURRENT_USER.username) || USER_NAME || '';
  return String(r).toLowerCase().indexOf('admin') !== -1 || String(u).toLowerCase() === 'admin';
}

function userCanView(moduleKey) {
  if (isAdmin()) return true;
  if (!CURRENT_USER_PERMISSIONS) return true;
  const mod = CURRENT_USER_PERMISSIONS[moduleKey];
  return mod ? !!mod.can_view : false;
}

function userCanEdit(moduleKey) {
  if (isAdmin()) return true;
  if (USER_ROLE === 'Koordinator') return false;
  if (!CURRENT_USER_PERMISSIONS) return true;
  const mod = CURRENT_USER_PERMISSIONS[moduleKey];
  return mod ? !!mod.can_edit : false;
}

function userCanDelete(moduleKey) {
  if (isAdmin()) return true;
  if (USER_ROLE === 'Koordinator') return false;
  if (!CURRENT_USER_PERMISSIONS) return false;
  const mod = CURRENT_USER_PERMISSIONS[moduleKey];
  return mod ? !!mod.can_delete : false;
}
let PRODUCTS_CACHE = [];
let CUSTOMERS_CACHE = [];
let SUPPLIERS_CACHE = [];
let FARMERS_CACHE = [];
let PRICE_TIERS_LIST = ['Reguler', 'Outlet', 'Bali Buda'];
let CURRENT_PRICE_TIER = 'Reguler';
let SELECTED_CUSTOMER = null;
let SELECTED_FAKTUR_ID = null;
let EDITING_TRANSACTION = null;
let CART = [];
let APP_SETTINGS = {};
let CURRENT_PRODUCT_TAB = 'all';
let PRODUCT_SEARCH_QUERY = '';
let ACTIVE_REQUESTS_COUNT = 0;
let CURRENT_REPORT_DATA = null;
let CURRENT_REPORT_FILTER = { period: 'month', startDate: '', endDate: '' };
let CURRENT_REPORT_SUBTAB = 'channels';
let CURRENT_LAPORAN_VIEW = 'sales';
let STOCK_VALUATION_DATA = null;
let STOCK_VALUATION_FILTER = { query: '', type: 'all', status: 'all' };

const CACHE_TTL_MS = 5 * 60 * 1000;
const DATA_CACHE = {
  dashboard: { data: null, timestamp: 0 },
  products: { data: null, timestamp: 0 },
  purchases: { data: null, timestamp: 0 },
  suppliers: { data: null, timestamp: 0 },
  farmers: { data: null, timestamp: 0 },
  consignments: { data: null, timestamp: 0 },
  outlets: { data: null, timestamp: 0 },
  receivables: { data: null, timestamp: 0 },
  customers: { data: null, timestamp: 0 },
  afterSales: { data: null, timestamp: 0 },
  productions: { data: null, timestamp: 0 },
  qc_records: { data: null, timestamp: 0 },
  settings: { data: null, timestamp: 0 },
  recentInvoices: { data: null, timestamp: 0 }
};

function isCacheValid(key) {
  const item = DATA_CACHE[key];
  return item && item.data !== null && (Date.now() - item.timestamp < CACHE_TTL_MS);
}

function invalidateCache(key) {
  if (key) {
    if (DATA_CACHE[key]) DATA_CACHE[key].timestamp = 0;
  } else {
    Object.keys(DATA_CACHE).forEach(function (k) { DATA_CACHE[k].timestamp = 0; });
  }
}

const ACTIVE_ROUTES = [
  'dashboard', 'produk', 'stok', 'produksi', 'qc', 'pembelian',
  'pos', 'konsinyasi', 'piutang', 'crm', 'purnajual', 'purna-jual',
  'laporan', 'pengaturan', 'faktur'
];

// ========================= NETWORK API & UTILITIES =========================
function setProgressLoading(isLoading) {
  const bar = document.getElementById('top-progress-bar');
  const sync = document.getElementById('sync-indicator');
  if (isLoading) {
    ACTIVE_REQUESTS_COUNT++;
    if (bar) bar.style.display = 'block';
    if (sync) sync.style.display = 'flex';
  } else {
    ACTIVE_REQUESTS_COUNT = Math.max(0, ACTIVE_REQUESTS_COUNT - 1);
    if (ACTIVE_REQUESTS_COUNT === 0) {
      if (bar) bar.style.display = 'none';
      if (sync) sync.style.display = 'none';
    }
  }
}

function api(fnName, ...args) {
  setProgressLoading(true);
  if (typeof window.dispatchApiCall === 'function') {
    return Promise.resolve(window.dispatchApiCall(fnName, args))
      .catch(function (err) {
        const errMsg = err && err.message ? err.message : String(err);
        if (errMsg.includes('UNAUTHORIZED') || errMsg.includes('JWT expired')) {
          handleLogout();
          showToast('Sesi berakhir. Silakan login kembali.', true);
        }
        throw err;
      })
      .finally(function () {
        setProgressLoading(false);
      });
  }
  if (typeof window.api === 'function' && window.api !== api) {
    return Promise.resolve(window.api(fnName, ...args))
      .finally(function () {
        setProgressLoading(false);
      });
  }
  return new Promise(function (resolve, reject) {
    if (!window.google || !google.script || !google.script.run) {
      setProgressLoading(false);
      reject(new Error('Koneksi sistem backend belum terhubung. Pastikan Supabase client aktif.'));
      return;
    }
    google.script.run
      .withSuccessHandler(function (res) {
        setProgressLoading(false);
        resolve(res);
      })
      .withFailureHandler(function (err) {
        setProgressLoading(false);
        const errMsg = err && err.message ? err.message : String(err);
        if (errMsg.includes('UNAUTHORIZED')) {
          handleLogout();
          showToast('Sesi berakhir. Silakan login kembali.', true);
        }
        reject(err);
      })
    [fnName](...args);
  });
}

function formatRupiah(num) {
  num = Number(num || 0);
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function formatDate(d) {
  if (!d || d === '-' || d === 'null' || d === 'undefined') return '-';
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.trim())) {
    const raw = d.trim().split(' ')[0];
    const parts = raw.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return parts[2] + ' ' + (months[parseInt(parts[1], 10) - 1] || parts[1]) + ' ' + parts[0];
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function showToast(message, isError) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  if (!toast) return;

  if (toastMsg) toastMsg.textContent = message;
  if (toastIcon) toastIcon.innerHTML = isError ? '&#9888;' : '&#10003;';

  toast.className = 'toast show' + (isError ? ' toast-error' : '');
  toast.style.display = 'flex';

  setTimeout(function () {
    toast.style.display = 'none';
    toast.className = 'toast';
  }, 3500);
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function syncModalOpenState() {
  const activeModals = document.querySelectorAll('.modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"], .modal-overlay.active');
  if (activeModals.length === 0) {
    document.body.classList.remove('modal-open');
  }
}

function closeModal() {
  const modalContainer = document.getElementById('modal-container');
  if (modalContainer) modalContainer.style.display = 'none';
  document.querySelectorAll('.modal-overlay:not(#confirm-modal):not(#modal-container):not(#delivery-signature-modal):not(#delivery-receipt-modal):not(#pod-view-modal):not(#modal-reset-data):not(#modal-qc-entry):not(#modal-qc-photo-viewer)').forEach(function (m) {
    m.remove();
  });
  syncModalOpenState();
  window._currentAuditData = null;
}

function isRawProduct(unit) {
  const u = (unit || '').toLowerCase().trim();
  return u === 'gr' || u === 'gram' || u === 'g' || u === 'kg';
}

const FALLBACK_PRICE_TIER_PRESETS = [
  { name: 'Reguler', price: 25000, default: true },
  { name: 'Outlet', price: 20000 },
  { name: 'Bali Buda', price: 20300 }
];

function getDefaultPriceTierPresets() {
  if (window.APP_SETTINGS && window.APP_SETTINGS['price_tiers_preset']) {
    try {
      const raw = window.APP_SETTINGS['price_tiers_preset'];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.warn('Gagal parse price_tiers_preset:', e);
    }
  }
  return FALLBACK_PRICE_TIER_PRESETS;
}

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

// ========================= MODAL & DIALOG KUSTOM =========================
function showConfirmDialog(title, message, onConfirm, isDanger) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;

  const titleEl = modal.querySelector('.confirm-title');
  const msgEl = modal.querySelector('.confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  const cleanupConfirm = function () {
    modal.style.display = 'none';
    const mainModal = document.getElementById('modal-container');
    if (!mainModal || mainModal.style.display === 'none') {
      document.body.classList.remove('modal-open');
    }
  };

  if (okBtn) {
    okBtn.className = 'btn ' + (isDanger ? 'btn-danger' : 'btn-primary');
    okBtn.onclick = function () {
      cleanupConfirm();
      if (typeof onConfirm === 'function') onConfirm();
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = function () { cleanupConfirm(); };
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function showPromptDialog(title, message, defaultValue, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">' + escapeHtml(title) + '</h3>' +
    '<button type="button" class="modal-close-btn" id="prompt-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">' + escapeHtml(message) + '</p>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="prompt-input" value="' + escapeHtml(defaultValue || '') + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="prompt-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="prompt-ok">Lanjutkan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const input = overlay.querySelector('#prompt-input');
  const close = function () {
    overlay.remove();
    const mainModal = document.getElementById('modal-container');
    if (!mainModal || mainModal.style.display === 'none') {
      document.body.classList.remove('modal-open');
    }
  };

  overlay.querySelector('#prompt-close').onclick = close;
  overlay.querySelector('#prompt-cancel').onclick = close;
  overlay.querySelector('#prompt-ok').onclick = function () {
    const val = input.value.trim();
    close();
    if (val && typeof onConfirm === 'function') onConfirm(val);
  };
  input.focus();
}

function openModal(title, bodyHtml, footerHtml, isLarge) {
  const container = document.getElementById('modal-container');
  const dialog = document.getElementById('modal-dialog');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');

  if (!container || !dialog) return;

  if (isLarge) {
    dialog.classList.add('modal-dialog-lg');
  } else {
    dialog.classList.remove('modal-dialog-lg');
  }

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  if (footerEl) footerEl.innerHTML = footerHtml;

  const closeBtn = document.getElementById('modal-close-btn');
  const backdrop = document.getElementById('modal-backdrop');
  if (closeBtn) closeBtn.onclick = closeModal;
  if (backdrop) backdrop.onclick = closeModal;

  container.style.display = 'flex';
  document.body.classList.add('modal-open');
}

// ========================= AUTENTIKASI & INITIALIZER =========================
function handleLogin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const userEl = document.getElementById('login-username');
  const passEl = document.getElementById('login-password');
  const errorEl = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const submitBtn = document.getElementById('login-submit');
  const spinner = document.getElementById('login-spinner');

  if (!userEl || !passEl) return false;
  const username = userEl.value.trim();
  const password = passEl.value;

  if (errorEl) errorEl.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';
  if (submitBtn) submitBtn.disabled = true;

  api('loginUser', username, password).then(function (res) {
    if (spinner) spinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;

    if (!res.success) {
      if (errorText) errorText.textContent = res.message;
      if (errorEl) errorEl.style.display = 'flex';
      return;
    }

    TOKEN = res.token;
    USER_NAME = res.name || username;
    USER_ROLE = res.role || (String(username).toLowerCase() === 'admin' ? 'Admin' : 'Kasir');
    CURRENT_USER = { name: USER_NAME, username: username, role: USER_ROLE };
    window._currentUser = CURRENT_USER;
    CURRENT_USER_PERMISSIONS = res.permissions || null;
    if (res.available_roles && Array.isArray(res.available_roles)) {
      AVAILABLE_ROLES = res.available_roles;
    }
    setSafeSession('ekasir_token', TOKEN);
    setSafeSession('ekasir_user', USER_NAME);
    setSafeSession('ekasir_role', USER_ROLE);
    if (CURRENT_USER_PERMISSIONS) setSafeSession('ekasir_permissions', JSON.stringify(CURRENT_USER_PERMISSIONS));
    if (AVAILABLE_ROLES) setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
    enterApp();
  }).catch(function (err) {
    if (spinner) spinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    if (errorText) errorText.textContent = 'Gagal terhubung: ' + (err.message || err);
    if (errorEl) errorEl.style.display = 'flex';
  });

  return false;
}

function handleLogout() {
  TOKEN = null;
  USER_NAME = '';
  CURRENT_USER = null;
  CURRENT_USER_PERMISSIONS = null;
  removeSafeSession('ekasir_token');
  removeSafeSession('ekasir_user');
  removeSafeSession('ekasir_role');
  removeSafeSession('ekasir_permissions');
  removeSafeSession('ekasir_available_roles');
  invalidateCache();
  showLoginScreen();
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appShell) appShell.style.display = 'none';
}

function enterApp() {
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const userLabel = document.getElementById('user-name-label');
  const userTop = document.getElementById('user-name-top');
  const avatarInitial = document.getElementById('user-avatar-initial');
  const avatarTop = document.getElementById('user-avatar-top');

  if (loginScreen) loginScreen.style.display = 'none';
  if (appShell) {
    appShell.style.removeProperty('display');
    appShell.style.display = 'flex';
  }

  const initialLetter = (USER_NAME || 'Admin').charAt(0).toUpperCase();
  if (userLabel) userLabel.textContent = USER_NAME || 'Admin';
  if (userTop) userTop.textContent = USER_NAME || 'Admin';
  if (avatarInitial) avatarInitial.textContent = initialLetter;
  if (avatarTop) avatarTop.textContent = initialLetter;

  try {
    if (!location.hash || location.hash === '#' || location.hash === '#login') {
      location.hash = '#dashboard';
    }
  } catch (e) {
    console.warn('Hash bypass:', e);
  }

  applyBrandLogo();
  updateSidebarVisibility();
  router();
  updateGlobalReceivableBadge();
  prefetchCoreDataInBackground();
}

function updateSidebarVisibility() {
  const sidebarNav = document.getElementById('sidebar-nav');
  if (!sidebarNav) return;

  const roleText = document.getElementById('sidebar-role-text');
  if (roleText) {
    roleText.textContent = USER_ROLE + (USER_ROLE === 'Koordinator' ? ' (View-Only)' : ' & Gudang Terhubung');
  }

  const navItems = sidebarNav.querySelectorAll('.nav-item');
  navItems.forEach(function (item) {
    const route = item.getAttribute('data-route') || (item.getAttribute('href') || '').replace('#', '');
    if (!route) return;
    if (userCanView(route)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });

  const sections = sidebarNav.querySelectorAll('.nav-section-label');
  sections.forEach(function (sec) {
    let nextEl = sec.nextElementSibling;
    let hasVisible = false;
    while (nextEl && !nextEl.classList.contains('nav-section-label')) {
      if (nextEl.classList.contains('nav-item') && nextEl.style.display !== 'none') {
        hasVisible = true;
        break;
      }
      nextEl = nextEl.nextElementSibling;
    }
    sec.style.display = hasVisible ? 'block' : 'none';
  });
}

function prefetchCoreDataInBackground() {
  if (!TOKEN) return;
  setTimeout(function () {
    if (!isCacheValid('products')) {
      api('getPosInitData', TOKEN).then(function (res) {
        DATA_CACHE.products = { data: res.products || [], timestamp: Date.now() };
        DATA_CACHE.customers = { data: res.customers || [], timestamp: Date.now() };
        DATA_CACHE.settings = { data: res.settings || {}, timestamp: Date.now() };
        CUSTOMERS_CACHE = res.customers || [];
        APP_SETTINGS = res.settings || {};
        PRICE_TIERS_LIST = res.priceTiers || ['Eceran'];
        PRODUCTS_CACHE = (res.products || []).filter(function (p) {
          return p && p.active && Number(p.stock || 0) > 0 && !isRawProduct(p.unit);
        });
        applyBrandLogo();
      }).catch(function () { });
    }
  }, 100);
}

// Menerapkan dua versi logo: Primer untuk background terang & Sekunder untuk background gelap
function applyBrandLogo() {
  const logoPrimary = (APP_SETTINGS && APP_SETTINGS['store_logo']) ? APP_SETTINGS['store_logo'] : '';
  const logoLight = (APP_SETTINGS && APP_SETTINGS['store_logo_light']) ? APP_SETTINGS['store_logo_light'] : logoPrimary;

  const sidebarWrap = document.getElementById('sidebar-brand-logo-wrap');
  const loginWrap = document.getElementById('login-brand-logo-wrap');

  // Sidebar (Latar Belakang Hijau Gelap) -> Pakai Logo Light
  if (sidebarWrap) {
    if (logoLight) {
      sidebarWrap.innerHTML = '<img src="' + escapeHtml(logoLight) + '" class="sidebar-brand-logo-img" alt="Logo Kios IDEP" onerror="this.parentElement.innerHTML=\'<div class=\\\'brand-logo\\\'>IDEP</div>\'">';
    } else {
      sidebarWrap.innerHTML = '<div class="brand-logo" aria-hidden="true">IDEP</div>';
    }
  }

  // Layar Login (Latar Belakang Terang) -> Pakai Logo Primer Full Color
  if (loginWrap) {
    if (logoPrimary) {
      loginWrap.innerHTML = '<img src="' + escapeHtml(logoPrimary) + '" class="brand-logo-img" alt="Logo Kios IDEP" onerror="this.parentElement.innerHTML=\'<div class=\\\'brand-logo\\\'>IDEP</div>\'">';
    } else {
      loginWrap.innerHTML = '<div class="brand-logo" aria-hidden="true">IDEP</div>';
    }
  }
}

// Handler upload gambar logo dinamis (bisa untuk logo primary maupun light)
function handleLogoFileUpload(input, targetInputId, previewBoxId) {
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  if (!file.type.startsWith('image/')) {
    showToast('Harap pilih file gambar (PNG/JPG/SVG).', true);
    return;
  }

  showToast('Mengompres dan memproses logo...');
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      const maxDim = 240;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/png');
      const inputEl = document.getElementById(targetInputId);
      if (inputEl) inputEl.value = compressedDataUrl;
      updateLogoPreview(compressedDataUrl, previewBoxId);
      showToast('Logo berhasil diproses. Simpan profil toko untuk menerapkan.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function updateLogoPreview(val, boxId) {
  const previewBox = document.getElementById(boxId);
  if (!previewBox) return;
  val = (val || '').trim();
  if (val) {
    previewBox.innerHTML = '<img src="' + escapeHtml(val) + '" alt="Pratinjau Logo" onerror="this.parentElement.innerHTML=\'<span style=\\\'font-size:11px;color:var(--danger);\\\'>Gagal memuat</span>\'">';
  } else {
    previewBox.innerHTML = '<span style="font-size:11px;color:var(--text-muted);text-align:center;">Belum Ada Logo</span>';
  }
}

function clearLogoSetting(targetInputId, targetFileId, previewBoxId) {
  const inputEl = document.getElementById(targetInputId);
  const fileInput = document.getElementById(targetFileId);
  if (inputEl) inputEl.value = '';
  if (fileInput) fileInput.value = '';
  updateLogoPreview('', previewBoxId);
}

// ========================= CLIENT ROUTER =========================
window.addEventListener('hashchange', function () { router(false); });

function navigateToRoute(route) {
  if (!route) return;
  route = route.replace(/^#/, '').trim() || 'dashboard';
  if (location.hash !== '#' + route) {
    try {
      location.hash = '#' + route;
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
  let route = 'dashboard';
  try {
    route = (location.hash || '#dashboard').replace('#', '') || 'dashboard';
  } catch (e) {
    route = 'dashboard';
  }

  // Validasi izin can_view
  if (!userCanView(route)) {
    const allRoutes = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
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

  document.querySelectorAll('.mobile-nav-item').forEach(function (el) {
    if (el && el.dataset) {
      el.classList.toggle('active', el.dataset.route === route);
    }
  });

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
    'crm': 'Pelanggan (CRM)',
    'purnajual': 'Purna Jual & Kepuasan Pelanggan',
    'purna-jual': 'Purna Jual & Kepuasan Pelanggan',
    'laporan': 'Laporan Penjualan & Margin',
    'pengaturan': 'Pengaturan Sistem',
    'faktur': 'Riwayat Transaksi & Faktur'
  };
  if (titleEl) titleEl.textContent = routeTitles[route] || 'E-Kasir';

  closeSidebarMobile();

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

function applyViewOnlyRestrictions(route) {
  setTimeout(function () {
    const isEditAllowed = userCanEdit(route);
    const isDeleteAllowed = userCanDelete(route);

    if (!isEditAllowed) {
      const content = document.getElementById('content');
      if (!content) return;

      const mutationSelectors = [
        '#pos-btn-checkout',
        '#pos-btn-hold',
        '#btn-save-qc',
        '#btn-start-dht',
        '#btn-complete-dht',
        'button[onclick*="save"]',
        'button[onclick*="create"]',
        'button[onclick*="add"]',
        'button[onclick*="process"]',
        'button[onclick*="submit"]',
        'button[onclick*="openProductModal"]',
        'button[onclick*="openQCEntryModal"]',
        'button[onclick*="openPurchaseModal"]',
        'button[onclick*="processQuickPackaging"]',
        'button[onclick*="openNewTransferModal"]',
        'button[onclick*="openAuditModal"]'
      ];

      mutationSelectors.forEach(function (sel) {
        content.querySelectorAll(sel).forEach(function (btn) {
          const onclickStr = (btn.getAttribute('onclick') || '').toLowerCase();
          const isNavOrPreview = onclickStr.indexOf('switch') !== -1 ||
            onclickStr.indexOf('filter') !== -1 ||
            onclickStr.indexOf('search') !== -1 ||
            onclickStr.indexOf('tab') !== -1 ||
            onclickStr.indexOf('print') !== -1 ||
            onclickStr.indexOf('export') !== -1 ||
            onclickStr.indexOf('close') !== -1 ||
            onclickStr.indexOf('zoom') !== -1 ||
            onclickStr.indexOf('view') !== -1 ||
            onclickStr.indexOf('photo') !== -1;
          if (!isNavOrPreview) {
            btn.disabled = true;
            btn.classList.add('disabled');
            btn.title = 'Peran ' + USER_ROLE + ' dalam mode pantau (View-Only)';
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
          }
        });
      });
    }

    if (!isDeleteAllowed) {
      const content = document.getElementById('content');
      if (!content) return;
      const deleteSelectors = [
        'button[onclick*="void"]',
        'button[onclick*="delete"]',
        'button[onclick*="remove"]',
        '.btn-danger',
        '.btn-void'
      ];
      deleteSelectors.forEach(function (sel) {
        content.querySelectorAll(sel).forEach(function (btn) {
          const onclickStr = (btn.getAttribute('onclick') || '').toLowerCase();
          if (onclickStr.indexOf('close') === -1 && onclickStr.indexOf('cancel') === -1) {
            btn.style.display = 'none';
          }
        });
      });
    }
  }, 120);
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

// ========================= DASHBOARD =========================
function renderDashboard(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('dashboard')) {
    drawDashboardUI(DATA_CACHE.dashboard.data);
    return;
  }

  content.innerHTML =
    '<div class="content-skeleton-loader">' +
    '<div class="skeleton-header"></div>' +
    '<div class="skeleton-grid">' +
    '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>' +
    '</div>' +
    '</div>';

  api('getDashboardSummary', TOKEN).then(function (data) {
    data = data || {};
    DATA_CACHE.dashboard = { data: data, timestamp: Date.now() };
    drawDashboardUI(data);
  }).catch(function (err) {
    showToast('Gagal memuat dashboard: ' + (err.message || err), true);
  });
}

function drawDashboardUI(data) {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Ringkasan Operasional</h1>' +
    '<p class="page-subtitle">Pantau performa penjualan hari ini dan alert stok kritis secara real-time.</p>' +
    '</div>' +
    '</div>' +
    '<div class="stat-grid">' +
    '<div class="stat-card">' +
    '<div class="stat-header">' +
    '<span class="stat-label">Penjualan Hari Ini</span>' +
    '<span class="stat-icon">&#128176;</span>' +
    '</div>' +
    '<div class="stat-value">' + formatRupiah(data.todaySales) + '</div>' +
    '<div class="stat-meta">Omzet kotor transaksi hari ini</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header">' +
    '<span class="stat-label">Transaksi Hari Ini</span>' +
    '<span class="stat-icon">&#128203;</span>' +
    '</div>' +
    '<div class="stat-value">' + (data.todayTransactionCount || 0) + ' Nota</div>' +
    '<div class="stat-meta">Struk belanja terselesaikan</div>' +
    '</div>' +
    '<div class="stat-card">' +
    '<div class="stat-header">' +
    '<span class="stat-label">Piutang Aktif</span>' +
    '<span class="stat-icon">&#128179;</span>' +
    '</div>' +
    '<div class="stat-value">' + (data.receivables ? data.receivables.length : 0) + ' Klien</div>' +
    '<div class="stat-meta">Tagihan tempo berjalan</div>' +
    '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">' +
    renderPanel('Stok Menipis (&le; 5 pcs/gr)', data.lowStock, function (item) {
      return '<span style="font-weight:600;">' + escapeHtml(item.name) + '</span><span class="badge badge-danger">Sisa ' + item.stock + '</span>';
    }, 'Semua persediaan stok dalam batas aman.') +
    renderPanel('Mendekati Kadaluarsa (30 Hari)', data.expiring, function (item) {
      return '<span>' + escapeHtml(item.product_id) + '</span><span class="badge badge-warning">' + formatDate(item.expiry_date) + '</span>';
    }, 'Tidak ada stok mendekati kadaluarsa.') +
    '</div>';
}

function renderPanel(title, items, renderItem, emptyText) {
  let inner = '';
  if (!items || items.length === 0) {
    inner = '<div style="text-align:center;padding:18px;color:var(--text-secondary);font-size:13px;">' + emptyText + '</div>';
  } else {
    inner = items.map(function (item) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">' + renderItem(item) + '</div>';
    }).join('');
  }
  return '<div class="card"><h3 style="font-size:14px;margin-bottom:12px;">' + title + '</h3>' + inner + '</div>';
}

// ========================= KATALOG PRODUK & MULTI-TIER =========================
function renderProduk(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('products')) {
    drawProdukUI(DATA_CACHE.products.data);
    return;
  }

  content.innerHTML = '<div class="card"><div class="empty-state">Memuat katalog produk...</div></div>';

  api('getProducts', TOKEN).then(function (products) {
    const list = Array.isArray(products) ? products : [];
    DATA_CACHE.products = { data: list, timestamp: Date.now() };
    drawProdukUI(list);
  }).catch(function (err) {
    showToast('Gagal memuat produk: ' + (err.message || err), true);
  });
}

function drawProdukUI(products) {
  const content = document.getElementById('content');
  if (!content) return;

  PRODUCTS_CACHE = products.filter(function (p) { return p && p.active; });
  PRODUCT_SEARCH_QUERY = '';

  const countAll = PRODUCTS_CACHE.length;
  const countJadi = PRODUCTS_CACHE.filter(function (p) { return !isRawProduct(p.unit) && !(p.category || '').toLowerCase().includes('media'); }).length;
  const countMentah = PRODUCTS_CACHE.filter(function (p) { return isRawProduct(p.unit); }).length;
  const countMedia = PRODUCTS_CACHE.filter(function (p) { return (p.category || '').toLowerCase().includes('media'); }).length;

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Katalog Produk</h1>' +
    '<p class="page-subtitle">Kelola master data barang siap jual, bahan baku curah, media dan varian bahasa.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openProductModal()">+ Tambah Produk</button>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:12px;flex-wrap:wrap;">' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'all' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-all" onclick="setProductTab(\'all\')">Semua (' + countAll + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'jadi' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-jadi" onclick="setProductTab(\'jadi\')">📦 Siap Jual (' + countJadi + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'mentah' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-mentah" onclick="setProductTab(\'mentah\')">🌾 Curah/Gram (' + countMentah + ')</button>' +
    '<button type="button" class="btn ' + (CURRENT_PRODUCT_TAB === 'media' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" id="tab-media" onclick="setProductTab(\'media\')">📚 Media/Buku (' + countMedia + ')</button>' +
    '</div>' +
    '<div class="card">' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Nama Produk</th>' +
    '<th>Kategori</th>' +
    '<th>Tipe</th>' +
    '<th>Sisa Stok</th>' +
    '<th>Harga Jual (Tier)</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody id="produk-tbody"></tbody>' +
    '</table>' +
    '</div>' +
    '</div>';

  renderFilteredProducts();
}

function setProductTab(tab) {
  CURRENT_PRODUCT_TAB = tab;
  ['all', 'jadi', 'mentah', 'media'].forEach(function (t) {
    const el = document.getElementById('tab-' + t);
    if (el) el.className = 'btn btn-sm ' + (t === tab ? 'btn-primary' : 'btn-secondary');
  });
  renderFilteredProducts();
}

function renderFilteredProducts() {
  const filtered = PRODUCTS_CACHE.filter(function (p) {
    const isRaw = isRawProduct(p.unit);
    const isMedia = (p.category || '').toLowerCase().includes('media');
    let matchTab = true;
    if (CURRENT_PRODUCT_TAB === 'jadi') matchTab = !isRaw && !isMedia;
    if (CURRENT_PRODUCT_TAB === 'mentah') matchTab = isRaw;
    if (CURRENT_PRODUCT_TAB === 'media') matchTab = isMedia;

    const matchQuery = !PRODUCT_SEARCH_QUERY ||
      (p.name || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY) ||
      (p.category || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY) ||
      (p.variant || '').toLowerCase().includes(PRODUCT_SEARCH_QUERY);

    return matchTab && matchQuery;
  });
  renderProductRows(filtered);
}

function renderProductRows(products) {
  const tbody = document.getElementById('produk-tbody');
  if (!tbody) return;
  if (!products || products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div style="text-align:center;padding:24px;color:var(--text-secondary);">Tidak ada produk pada filter ini.</div></td></tr>';
    return;
  }
  tbody.innerHTML = products.map(function (p) {
    const isRaw = isRawProduct(p.unit);
    const isMedia = (p.category || '').toLowerCase().includes('media');
    let typeBadge = '<span class="badge badge-success">📦 Kemasan</span>';
    if (isRaw) typeBadge = '<span class="badge badge-warning">🌾 Curah</span>';
    if (isMedia) typeBadge = '<span class="badge badge-neutral">📚 Media</span>';

    const variantBadge = p.variant ? ' <span class="badge badge-neutral" style="font-size:10px;">' + escapeHtml(p.variant) + '</span>' : '';
    const mainPrice = p.priceTiers && p.priceTiers[0] ? formatRupiah(p.priceTiers[0].price) : '-';
    const extraTiers = p.priceTiers && p.priceTiers.length > 1 ? ' <span class="badge badge-neutral">+' + (p.priceTiers.length - 1) + ' tier</span>' : '';
    const stockBadge = Number(p.stock || 0) <= 5 ? 'badge-danger' : 'badge-neutral';

    return '<tr>' +
      '<td><strong>' + escapeHtml(p.name) + '</strong>' + variantBadge + '</td>' +
      '<td>' + escapeHtml(p.category || '-') + '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td><span class="badge ' + stockBadge + '">' + (p.stock || 0) + ' ' + escapeHtml(p.unit || '') + '</span></td>' +
      '<td>' + mainPrice + extraTiers + '</td>' +
      '<td style="text-align:right;">' +
      '<div class="action-btn-group" style="justify-content:flex-end;">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="openProductModal(\'' + p.id + '\')">Edit</button>' +
      '<button type="button" class="btn btn-danger btn-sm" onclick="deleteProductUI(\'' + p.id + '\', \'' + escapeHtml(p.name) + '\')">Hapus</button>' +
      '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function deleteProductUI(id, name) {
  showConfirmDialog('Hapus Produk', 'Nonaktifkan produk "' + name + '" dari katalog toko?', function () {
    api('deleteProduct', TOKEN, id).then(function () {
      invalidateCache('products');
      showToast('Produk dinonaktifkan.');
      renderProduk(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

function isSeedProductClient(productOrId) {
  if (!productOrId) return false;
  let p = (typeof productOrId === 'object' && productOrId !== null)
    ? productOrId
    : (PRODUCTS_CACHE || []).filter(function (x) { return String(x.id) === String(productOrId); })[0];
  if (!p) return false;

  if (p.is_seed !== undefined && p.is_seed !== null) return Boolean(p.is_seed);
  if (p.product_type) return String(p.product_type).toLowerCase().trim() === 'benih';

  const cat = String(p.category || '').toLowerCase().trim();
  const name = String(p.name || '').toLowerCase().trim();

  const nonSeedKeywords = ['buku', 'media', 'merchandise', 'kaos', 'baju', 'bibit', 'pupuk', 'nutrisi', 'polybag', 'pot', 'beras', 'pangan', 'lainnya'];
  for (let i = 0; i < nonSeedKeywords.length; i++) {
    if (cat.indexOf(nonSeedKeywords[i]) !== -1 || name.indexOf(nonSeedKeywords[i]) !== -1) {
      return false;
    }
  }

  const seedKeywords = ['benih', 'sayuran', 'herbal', 'bunga', 'tanaman', 'hortikultura'];
  for (let j = 0; j < seedKeywords.length; j++) {
    if (cat.indexOf(seedKeywords[j]) !== -1 || name.indexOf(seedKeywords[j]) !== -1) {
      return true;
    }
  }

  if (isRawProduct(p.unit)) return true;
  return cat === '' || cat === 'benih';
}

function onProductTypeSelectChange(val) {
  const badgeContainer = document.getElementById('pf-qc-badge-container');
  if (!badgeContainer) return;
  const isSeed = (val || '').toLowerCase() === 'benih';
  if (isSeed) {
    badgeContainer.innerHTML = '<span class="qc-type-badge-required">⚠️ Memerlukan alur QC &amp; Uji Semai</span>';
  } else {
    badgeContainer.innerHTML = '<span class="qc-type-badge-free">✅ Bebas QC (Langsung Aktif)</span>';
  }
}

function openProductModal(productId) {
  const product = productId ? PRODUCTS_CACHE.filter(function (p) { return p.id === productId; })[0] : null;
  const presets = getDefaultPriceTierPresets();
  const tiers = (product && product.priceTiers && product.priceTiers.length)
    ? product.priceTiers
    : presets.map(function (p) { return { tier_name: p.name, price: p.price }; });

  const isCreateNew = !productId;
  const isDefaultRaw = product ? isRawProduct(product.unit) : (CURRENT_PRODUCT_TAB === 'mentah');
  const currentUnit = product && product.unit ? product.unit : (isDefaultRaw ? 'gr' : 'pcs');
  const defaultCat = product ? product.category : (CURRENT_PRODUCT_TAB === 'media' ? 'Media' : '');
  const isMedia = (defaultCat || '').toLowerCase().includes('media');
  const defaultBundledCheck = (isCreateNew && isDefaultRaw && !isMedia);
  const currentVariant = product && product.variant ? product.variant : '';

  const defaultProductType = product && product.product_type
    ? product.product_type
    : (isMedia ? 'Buku' : (CURRENT_PRODUCT_TAB === 'media' ? 'Media Tanam' : 'Benih'));
  const isSeedType = defaultProductType.toLowerCase() === 'benih';

  const bundledSectionHtml = isCreateNew ?
    '<div id="pf-bundled-toggle-wrap" style="display:' + (isDefaultRaw && !isMedia ? 'block' : 'none') + ';margin-bottom:14px;background:#FAF7F2;border:1px dashed #7A5031;padding:10px 14px;border-radius:var(--radius-sm);">' +
    '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin:0;font-weight:700;color:#7A5031;font-size:13px;">' +
    '<input type="checkbox" id="pf-bundled-check"' + (defaultBundledCheck ? ' checked' : '') + ' style="width:18px;height:18px;accent-color:#7A5031;cursor:pointer;" onchange="toggleBundledPacks(this.checked)">' +
    '<span>✨ Sekaligus buatkan versi kemasan sachet siap jual (2-in-1)</span>' +
    '</label>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:3px;margin-left:28px;">' +
    'Otomatis membuat variasi sachet siap jual dan mendaftarkan harga bertingkatnya dalam 1 kali simpan.' +
    '</div>' +
    '</div>' +
    '<div id="bundled-packs-container" style="display:' + (defaultBundledCheck ? 'block' : 'none') + ';background:#FAF7F2;border:1.5px solid #E4D8CE;border-radius:var(--radius-sm);padding:14px;margin-bottom:16px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:1px solid #E4D8CE;padding-bottom:8px;">' +
    '<div>' +
    '<div style="font-size:13px;font-weight:700;color:#7A5031;">📦 Versi Kemasan Siap Jual (Sachet / Pack)</div>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:1px;">Nama kemasan otomatis tersinkronisasi mengikuti nama bahan curah + gramatur.</div>' +
    '</div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addBundledPackRow()" style="font-size:11.5px;border-color:#7A5031;color:#7A5031;font-weight:600;">+ Ukuran Sachet Lain</button>' +
    '</div>' +
    '<div id="bundled-pack-list"></div>' +
    '</div>' : '';

  const bodyHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Nama Produk ' + (isCreateNew ? '<span id="pf-name-type-hint" style="font-weight:normal;color:var(--text-muted);font-size:11px;">(Bahan Baku Curah)</span>' : '') + '</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="pf-name" placeholder="Contoh: Kangkung Lombok / Bayam Hijau" value="' + (product ? escapeHtml(product.name) : '') + '" oninput="updateAllBundledPackNames()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label class="field-label" style="margin-bottom:0;">Jenis / Klasifikasi Produk</label>' +
    '<div id="pf-qc-badge-container">' +
    (isSeedType
      ? '<span class="qc-type-badge-required">⚠️ Memerlukan alur QC &amp; Uji Semai</span>'
      : '<span class="qc-type-badge-free">✅ Bebas QC (Langsung Aktif)</span>') +
    '</div>' +
    '</div>' +
    '<div class="input-wrapper">' +
    '<select id="pf-product-type" onchange="onProductTypeSelectChange(this.value); updateBundledToggleVisibility();" style="padding-left:14px;font-weight:600;">' +
    '<option value="Benih"' + (defaultProductType === 'Benih' ? ' selected' : '') + '>🌱 Benih (Memerlukan QC &amp; Uji Semai)</option>' +
    '<option value="Buku"' + (defaultProductType === 'Buku' ? ' selected' : '') + '>📚 Buku &amp; Publikasi (Bebas QC)</option>' +
    '<option value="Media Tanam"' + (defaultProductType === 'Media Tanam' ? ' selected' : '') + '>🪴 Media Tanam &amp; Kompos (Bebas QC)</option>' +
    '<option value="Beras Merah"' + (defaultProductType === 'Beras Merah' ? ' selected' : '') + '>🌾 Pangan &amp; Beras Merah (Bebas QC)</option>' +
    '<option value="Bibit Tanaman"' + (defaultProductType === 'Bibit Tanaman' ? ' selected' : '') + '>🌿 Bibit Tanaman Hidup (Bebas QC)</option>' +
    '<option value="Merchandise"' + (defaultProductType === 'Merchandise' ? ' selected' : '') + '>👕 Merchandise &amp; Kaos (Bebas QC)</option>' +
    '<option value="Lainnya"' + (defaultProductType === 'Lainnya' ? ' selected' : '') + '>📦 Lainnya / Non-Benih (Bebas QC)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Kategori</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="pf-category" list="pf-cat-list" placeholder="Media, Sayuran Daun..." value="' + escapeHtml(defaultCat) + '" oninput="checkCategoryMedia(this.value); updateBundledToggleVisibility();" style="padding-left:14px;">' +
    '<datalist id="pf-cat-list">' +
    '<option value="Media"><option value="Sayuran Daun"><option value="Sayuran Buah"><option value="Herbal & Bunga"><option value="Pupuk & Nutrisi">' +
    '</datalist>' +
    '</div>' +
    '</div>' +
    '<div id="pf-media-variant-box" style="display:' + (isMedia ? 'block' : 'none') + ';background:var(--primary-light);border:1px solid rgba(30,77,63,0.15);padding:12px;border-radius:var(--radius-sm);margin-bottom:14px;">' +
    '<div style="font-weight:600;font-size:12px;color:var(--primary);margin-bottom:6px;">📚 Varian Bahasa:</div>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-bottom:8px;">' +
    '<label><input type="radio" name="pf-v-opt" value="Bahasa Indonesia"' + (currentVariant === 'Bahasa Indonesia' || (!currentVariant && isMedia) ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🇮🇩 Indonesia</label>' +
    '<label><input type="radio" name="pf-v-opt" value="English"' + (currentVariant === 'English' ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🇬🇧 English</label>' +
    '<label><input type="radio" name="pf-v-opt" value="Bilingual"' + (currentVariant === 'Bilingual' ? ' checked' : '') + ' onchange="selectVariantOption(this.value)"> 🌐 Bilingual</label>' +
    '</div>' +
    '<input type="text" id="pf-variant" placeholder="Varian bahasa" value="' + escapeHtml(currentVariant || 'Bahasa Indonesia') + '" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Tipe Barang</label>' +
    '<div class="input-wrapper">' +
    '<select id="pf-type" onchange="toggleUnitOptions(this.value); updateBundledToggleVisibility();" style="padding-left:14px;">' +
    '<option value="jadi"' + (!isDefaultRaw ? ' selected' : '') + '>📦 Kemasan Siap Jual</option>' +
    '<option value="mentah"' + (isDefaultRaw ? ' selected' : '') + '>🌾 Bahan Baku Curah</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Satuan (Unit)</label>' +
    '<div class="input-wrapper">' +
    '<select id="pf-unit" style="padding-left:14px;"></select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Umur Panen (Hari)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="pf-harvest-days" min="0" placeholder="Misal: 25, 75" value="' + (product && product.harvest_days ? product.harvest_days : '') + '" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '</div>' +
    bundledSectionHtml +
    '<div class="field-group">' +
    '<label class="field-label" id="pf-raw-tier-label">' + (isDefaultRaw ? 'Harga Jual Bahan Curah (Opsional bila hanya untuk stok produksi)' : 'Multi-Tier Harga Jual') + '</label>' +
    '<div id="pf-tiers"></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addPriceTierRow()" style="margin-top:6px;">+ Tambah Tier</button>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="btn-save-product" onclick="submitProduct(\'' + (product ? product.id : '') + '\')">Simpan Produk</button>';

  openModal(product ? 'Edit Produk' : 'Tambah Produk Baru', bodyHtml, footerHtml);
  toggleUnitOptions(isDefaultRaw ? 'mentah' : 'jadi', currentUnit);
  tiers.forEach(function (t) { addPriceTierRow(t.tier_name, t.price); });

  if (isCreateNew) {
    updateBundledToggleVisibility();
    if (defaultBundledCheck) {
      addBundledPackRow(20);
    }
  }
}

function updateBundledToggleVisibility() {
  const toggleWrap = document.getElementById('pf-bundled-toggle-wrap');
  const bundledContainer = document.getElementById('bundled-packs-container');
  const typeSelect = document.getElementById('pf-type');
  const catInput = document.getElementById('pf-category');
  const check = document.getElementById('pf-bundled-check');
  const hintEl = document.getElementById('pf-name-type-hint');
  const tierLabel = document.getElementById('pf-raw-tier-label');
  if (!toggleWrap || !typeSelect) return;

  const isMentah = typeSelect.value === 'mentah';
  const catVal = (catInput ? catInput.value : '').toLowerCase();
  const isMedia = catVal.includes('media');

  if (hintEl) {
    hintEl.textContent = isMentah ? '(Bahan Baku Curah)' : '(Kemasan Jadi)';
  }
  if (tierLabel) {
    tierLabel.textContent = isMentah ? 'Harga Jual Bahan Curah (Opsional bila hanya untuk stok produksi)' : 'Multi-Tier Harga Jual';
  }

  if (isMentah && !isMedia) {
    toggleWrap.style.display = 'block';
    if (check && check.checked && bundledContainer) {
      bundledContainer.style.display = 'block';
      const list = document.getElementById('bundled-pack-list');
      if (list && list.children.length === 0) {
        addBundledPackRow(20);
      } else {
        updateAllBundledPackNames();
      }
    }
  } else {
    toggleWrap.style.display = 'none';
    if (bundledContainer) bundledContainer.style.display = 'none';
  }
}

function toggleBundledPacks(isChecked) {
  const container = document.getElementById('bundled-packs-container');
  if (!container) return;
  container.style.display = isChecked ? 'block' : 'none';
  if (isChecked) {
    const list = document.getElementById('bundled-pack-list');
    if (list && list.children.length === 0) {
      addBundledPackRow(20);
    } else {
      updateAllBundledPackNames();
    }
  }
}

function generateSachetName(rawName, gram) {
  rawName = (rawName || '').trim();
  if (!rawName) return '';
  gram = Number(gram || 0);
  if (gram > 0) {
    return rawName + ' Sachet ' + gram + 'g';
  }
  return rawName + ' Sachet';
}

function updateAllBundledPackNames() {
  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const cards = document.querySelectorAll('#bundled-pack-list .bundled-pack-card');
  cards.forEach(function (card) {
    const nameInput = card.querySelector('.bundled-pack-name');
    const gramInput = card.querySelector('.bundled-pack-gram');
    if (nameInput && (!nameInput.dataset.manualEdited || !nameInput.value.trim())) {
      const gram = gramInput ? Number(gramInput.value || 0) : 0;
      nameInput.value = generateSachetName(rawName, gram);
    }
  });
}

function updateBundledPackRowName(gramInputEl) {
  const card = gramInputEl.closest('.bundled-pack-card');
  if (!card) return;
  const nameInput = card.querySelector('.bundled-pack-name');
  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const gram = Number(gramInputEl.value || 0);
  if (nameInput && (!nameInput.dataset.manualEdited || !nameInput.value.trim())) {
    nameInput.value = generateSachetName(rawName, gram);
  }
}

function addBundledPackRow(defaultGram) {
  const list = document.getElementById('bundled-pack-list');
  if (!list) return;

  if (defaultGram === undefined) {
    const count = list.children.length;
    defaultGram = count === 0 ? 20 : (count === 1 ? 50 : 100);
  }

  const presets = getDefaultPriceTierPresets();
  const regPreset = presets.filter(function (p) { return /reguler/i.test(p.name); })[0] || { name: 'Reguler', price: 25000 };
  const outPreset = presets.filter(function (p) { return /outlet/i.test(p.name); })[0] || { name: 'Outlet', price: 20000 };
  const bbPreset = presets.filter(function (p) { return /bali\s*buda/i.test(p.name); })[0] || { name: 'Bali Buda', price: 20300 };

  const rawName = (document.getElementById('pf-name') ? document.getElementById('pf-name').value : '').trim();
  const initialName = generateSachetName(rawName, defaultGram);
  const rowIndex = list.children.length;

  const card = document.createElement('div');
  card.className = 'bundled-pack-card';
  card.style.cssText = 'background:#ffffff;border:1px solid #E4D8CE;border-radius:var(--radius-xs);padding:10px 12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.04);';

  card.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
    '<span style="font-size:11.5px;font-weight:700;color:#7A5031;display:flex;align-items:center;gap:6px;">' +
    '<span>🌱 Kemasan Variasi #' + (rowIndex + 1) + '</span>' +
    '</span>' +
    (rowIndex > 0 ?
      '<button type="button" class="btn btn-secondary btn-sm" onclick="this.closest(\'.bundled-pack-card\').remove()" style="padding:1px 6px;font-size:11px;color:var(--danger);border-color:#fecaca;" title="Hapus variasi ini">&times; Hapus</button>' : '') +
    '</div>' +
    '<div style="display:grid;grid-template-columns:100px 1fr 110px;gap:8px;margin-bottom:8px;">' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Gramatur (gr)</label>' +
    '<input type="number" class="bundled-pack-gram" value="' + defaultGram + '" min="1" placeholder="Gram" oninput="updateBundledPackRowName(this)" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:center;font-weight:600;">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Nama Produk Kemasan Sachet</label>' +
    '<input type="text" class="bundled-pack-name" value="' + escapeHtml(initialName) + '" placeholder="Contoh: Kangkung Sachet 20g" oninput="this.dataset.manualEdited=\'true\'" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div>' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:2px;">Satuan</label>' +
    '<select class="bundled-pack-unit" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
    '<option value="sachet" selected>sachet</option>' +
    '<option value="pcs">pcs</option>' +
    '<option value="pack">pack</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">' +
    '<label style="font-size:10.5px;font-weight:600;color:var(--text-secondary);margin:0;">Harga Jual Kemasan Sachet (Multi-Tier)</label>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addCustomTierToPack(this)" style="padding:1px 6px;font-size:10px;line-height:1.2;">+ Tier Kustom</button>' +
    '</div>' +
    '<div class="bundled-tiers-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:var(--primary);margin-bottom:1px;">Reguler (Rp) <span style="color:var(--danger)">*</span></div>' +
    '<input type="number" class="bundled-price-reguler" data-tier-name="Reguler" value="' + regPreset.price + '" placeholder="25000" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:#0f766e;margin-bottom:1px;">Outlet (Rp)</div>' +
    '<input type="number" class="bundled-price-outlet" data-tier-name="Outlet" value="' + outPreset.price + '" placeholder="20000" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '<div class="bundled-tier-col">' +
    '<div style="font-size:10px;font-weight:600;color:#2563eb;margin-bottom:1px;">Bali Buda (Rp)</div>' +
    '<input type="number" class="bundled-price-balibuda" data-tier-name="Bali Buda" value="' + bbPreset.price + '" placeholder="20300" min="0" style="width:100%;padding:6px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '</div>' +
    '</div>' +
    '<div class="bundled-extra-tiers" style="margin-top:6px;"></div>' +
    '</div>';

  list.appendChild(card);
}

function addCustomTierToPack(btn) {
  const card = btn.closest('.bundled-pack-card');
  if (!card) return;
  const extraWrap = card.querySelector('.bundled-extra-tiers');
  if (!extraWrap) return;

  const row = document.createElement('div');
  row.className = 'bundled-custom-tier-row';
  row.style.cssText = 'display:flex;gap:6px;margin-bottom:4px;align-items:center;';
  row.innerHTML =
    '<input type="text" placeholder="Nama Tier Kustom" class="custom-tier-name" style="flex:1;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<input type="number" placeholder="Nominal Rp" class="custom-tier-price" min="0" style="flex:1;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()" style="padding:2px 6px;font-size:11px;">&times;</button>';
  extraWrap.appendChild(row);
}

function checkCategoryMedia(catVal) {
  const isMedia = (catVal || '').toLowerCase().includes('media');
  const box = document.getElementById('pf-media-variant-box');
  if (box) box.style.display = isMedia ? 'block' : 'none';
}

function selectVariantOption(val) {
  const input = document.getElementById('pf-variant');
  if (input) input.value = val;
}

function toggleUnitOptions(type, selectedUnit) {
  const unitSelect = document.getElementById('pf-unit');
  if (!unitSelect) return;
  if (type === 'mentah') {
    unitSelect.innerHTML =
      '<option value="gr"' + (selectedUnit === 'gr' ? ' selected' : '') + '>gr (Gram)</option>' +
      '<option value="kg"' + (selectedUnit === 'kg' ? ' selected' : '') + '>kg (Kilogram)</option>';
  } else {
    unitSelect.innerHTML =
      '<option value="pcs"' + (selectedUnit === 'pcs' || !selectedUnit ? ' selected' : '') + '>pcs (Pieces)</option>' +
      '<option value="sachet"' + (selectedUnit === 'sachet' ? ' selected' : '') + '>sachet</option>' +
      '<option value="pack"' + (selectedUnit === 'pack' ? ' selected' : '') + '>pack</option>';
  }
}

function addPriceTierRow(name, price) {
  const container = document.querySelector('#pf-tiers');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'price-tier-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML =
    '<input type="text" placeholder="Nama tier (Reguler/Outlet/Bali Buda)" class="tier-name" value="' + (name ? escapeHtml(name) : '') + '" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '<input type="number" placeholder="Nominal Rp" class="tier-price" value="' + (price !== undefined ? price : '') + '" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius-xs);font-weight:600;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="this.parentElement.remove()">&times;</button>';
  container.appendChild(row);
}

function submitProduct(productId) {
  const name = document.getElementById('pf-name').value.trim();
  const productType = document.getElementById('pf-product-type') ? document.getElementById('pf-product-type').value : 'Benih';
  const category = document.getElementById('pf-category').value.trim();
  const unit = document.getElementById('pf-unit').value.trim();
  const isMedia = (category || '').toLowerCase().includes('media');
  const variant = isMedia ? (document.getElementById('pf-variant').value.trim() || 'Bahasa Indonesia') : '';

  if (!name) { showToast('Nama produk wajib diisi.', true); return; }

  const isBundled = !productId && document.getElementById('pf-bundled-check') && document.getElementById('pf-bundled-check').checked;

  if (isBundled) {
    const packCards = Array.from(document.querySelectorAll('#bundled-pack-list .bundled-pack-card'));
    if (packCards.length === 0) {
      showToast('Minimal cantumkan 1 variasi kemasan sachet atau hilangkan centang 2-in-1.', true);
      return;
    }

    const packProducts = [];
    for (let i = 0; i < packCards.length; i++) {
      const card = packCards[i];
      const packName = (card.querySelector('.bundled-pack-name').value || '').trim();
      const packGram = Number(card.querySelector('.bundled-pack-gram').value || 0);
      const packUnit = card.querySelector('.bundled-pack-unit').value;

      const regInp = card.querySelector('.bundled-price-reguler');
      const outInp = card.querySelector('.bundled-price-outlet');
      const bbInp = card.querySelector('.bundled-price-balibuda');

      const pReg = Number(regInp ? regInp.value : 0);
      const pOut = Number(outInp ? outInp.value : 0);
      const pBB = Number(bbInp ? bbInp.value : 0);

      if (!packName) {
        showToast('Nama kemasan sachet pada variasi #' + (i + 1) + ' wajib diisi.', true);
        return;
      }

      const packTiers = [];
      if (pReg > 0) packTiers.push({ tier_name: 'Reguler', price: pReg });
      if (pOut > 0) packTiers.push({ tier_name: 'Outlet', price: pOut });
      if (pBB > 0) packTiers.push({ tier_name: 'Bali Buda', price: pBB });

      // Baca tier kustom tambahan jika ada
      const customRows = card.querySelectorAll('.bundled-custom-tier-row');
      customRows.forEach(function (r) {
        const cName = (r.querySelector('.custom-tier-name').value || '').trim();
        const cPrice = Number(r.querySelector('.custom-tier-price').value || 0);
        if (cName && cPrice > 0) {
          packTiers.push({ tier_name: cName, price: cPrice });
        }
      });

      if (packTiers.length === 0) {
        showToast('Minimal cantumkan 1 harga jual nominal positif (Reguler/Outlet/Bali Buda) untuk kemasan "' + packName + '".', true);
        return;
      }

      packProducts.push({
        name: packName,
        product_type: productType,
        variant: packGram > 0 ? (packGram + 'g') : '',
        unit: packUnit,
        priceTiers: packTiers
      });
    }

    const rawTiers = Array.from(document.querySelectorAll('#pf-tiers .price-tier-row')).map(function (row) {
      return {
        tier_name: row.querySelector('.tier-name').value.trim(),
        price: Number(row.querySelector('.tier-price').value || 0)
      };
    }).filter(function (t) { return t.tier_name && t.price > 0; });

    const btn = document.getElementById('btn-save-product');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Menyimpan 2-in-1 Produk...';
    }

    const payload = {
      rawProduct: {
        name: name,
        product_type: productType,
        category: category,
        variant: variant,
        unit: unit,
        photo_url: '',
        priceTiers: rawTiers
      },
      packProducts: packProducts
    };

    api('saveBundledProducts', TOKEN, payload).then(function (res) {
      invalidateCache('products');
      const firstPackName = packProducts.length > 0 ? packProducts[0].name : 'kemasan sachet';
      showToast('Berhasil membuat ' + res.count + ' produk: "' + escapeHtml(res.raw_name) + '" dan "' + escapeHtml(firstPackName) + '".');
      closeModal();
      renderProduk(true);
    }).catch(function (err) {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Simpan Produk';
      }
      showToast('Gagal menyimpan produk: ' + (err.message || err), true);
    });
    return;
  }

  // Alur simpan produk tunggal biasa
  const tiers = Array.from(document.querySelectorAll('#pf-tiers .price-tier-row')).map(function (row) {
    return {
      tier_name: row.querySelector('.tier-name').value.trim(),
      price: Number(row.querySelector('.tier-price').value || 0)
    };
  }).filter(function (t) { return t.tier_name && t.price > 0; });

  if (tiers.length === 0) { showToast('Minimal cantumkan 1 harga jual.', true); return; }

  const saveBtn = document.getElementById('btn-save-product');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '⏳ Menyimpan...';
  }

  const harvestDays = Number((document.getElementById('pf-harvest-days') && document.getElementById('pf-harvest-days').value) || 0);

  api('saveProduct', TOKEN, {
    id: productId || null,
    name: name,
    product_type: productType,
    category: category,
    variant: variant,
    unit: unit,
    harvest_days: harvestDays,
    priceTiers: tiers
  }).then(function () {
    invalidateCache('products');
    showToast('Produk berhasil disimpan.');
    closeModal();
    renderProduk(true);
  }).catch(function (err) {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Simpan Produk';
    }
    showToast('Gagal menyimpan: ' + (err.message || err), true);
  });
}

// ========================= STOK & BATCH FIFO =========================
function renderStok(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('products')) {
    drawStokUI(DATA_CACHE.products.data);
    return;
  }

  content.innerHTML = '<div class="card"><div class="empty-state">Memuat antrean stok &amp; batch...</div></div>';

  api('getProducts', TOKEN).then(function (products) {
    const list = Array.isArray(products) ? products : [];
    DATA_CACHE.products = { data: list, timestamp: Date.now() };
    drawStokUI(list);
  }).catch(function (err) {
    showToast('Gagal memuat data stok: ' + (err.message || err), true);
  });
}

function drawStokUI(products) {
  const content = document.getElementById('content');
  if (!content) return;

  PRODUCTS_CACHE = products.filter(function (p) { return p && p.active; });

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Stok &amp; Antrean Batch (FIFO)</h1>' +
    '<p class="page-subtitle">Pantau alokasi lot kedaluwarsa, tanggal produksi, dan mutasi keluar masuk gudang.</p>' +
    '</div>' +
    '</div>' +
    renderTraceabilityPanelHTML('stok') +
    '<div class="card">' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Nama Produk</th>' +
    '<th>Tipe Persediaan</th>' +
    '<th>Total Saldo Stok</th>' +
    '<th style="text-align:right;">Rincian Batch</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    PRODUCTS_CACHE.map(function (p) {
      const typeBadge = isRawProduct(p.unit) ? '<span class="badge badge-warning">Curah Mentah</span>' : '<span class="badge badge-success">Kemasan Siap Jual</span>';
      return '<tr>' +
        '<td><strong>' + escapeHtml(p.name) + '</strong></td>' +
        '<td>' + typeBadge + '</td>' +
        '<td><span class="badge badge-neutral">' + (p.stock || 0) + ' ' + escapeHtml(p.unit || '') + '</span></td>' +
        '<td style="text-align:right;">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="showBatchDetail(\'' + p.id + '\', \'' + escapeHtml(p.name) + '\')">Lihat Batch FIFO</button>' +
        '</td>' +
        '</tr>';
    }).join('') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div id="batch-detail" style="margin-top:20px;"></div>';
}

function showBatchDetail(productId, productName) {
  const detailEl = document.getElementById('batch-detail');
  if (!detailEl) return;
  detailEl.innerHTML = '<div class="card"><div class="empty-state">Mengaudit antrean batch FIFO...</div></div>';

  Promise.all([
    api('getStockBatches', TOKEN, productId),
    api('getStockMovements', TOKEN, productId)
  ]).then(function (results) {
    const batches = Array.isArray(results[0]) ? results[0] : [];
    const movements = Array.isArray(results[1]) ? results[1] : [];
    const today = new Date();

    const batchRows = batches.map(function (b) {
      let expiryBadge = '<span class="badge badge-neutral">-</span>';
      if (b.expiry_date) {
        const days = Math.ceil((new Date(b.expiry_date) - today) / (1000 * 60 * 60 * 24));
        const cls = days < 7 ? 'badge-danger' : days < 30 ? 'badge-warning' : 'badge-success';
        expiryBadge = '<span class="badge ' + cls + '">' + formatDate(b.expiry_date) + '</span>';
      }
      const prodDateStr = b.production_date ? formatDate(b.production_date) : (b.received_at ? formatDate(b.received_at) : '-');

      return '<tr>' +
        '<td><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">' + escapeHtml(b.id) + '</strong></td>' +
        '<td>' + prodDateStr + '</td>' +
        '<td>' + formatDate(b.received_at) + '</td>' +
        '<td>' + (b.qty_in || 0) + '</td>' +
        '<td><strong style="color:var(--primary);">' + (b.qty_remaining || 0) + '</strong></td>' +
        '<td><strong style="color:var(--primary);">' + formatRupiah(b.cost_per_unit || b.buy_price) + '</strong>' +
        ((b.cost_per_unit && Number(b.cost_per_unit) !== Number(b.buy_price) && Number(b.buy_price) > 0)
          ? '<br><span style="font-size:10px;color:var(--text-secondary);">(Beli: ' + formatRupiah(b.buy_price) + ')</span>'
          : '') + '</td>' +
        '<td>' + expiryBadge + '</td>' +
        '</tr>';
    }).join('');

    const movementRows = movements.slice(0, 15).map(function (m) {
      const sign = Number(m.qty) > 0 ? '+' : '';
      const color = Number(m.qty) > 0 ? 'var(--success)' : 'var(--danger)';
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px;">' +
        '<span>' + formatDate(m.created_at) + ' &bull; <strong style="text-transform:uppercase;">' + escapeHtml(m.type) + '</strong> (' + escapeHtml(m.notes || '-') + ')</span>' +
        '<strong style="color:' + color + ';">' + sign + m.qty + '</strong>' +
        '</div>';
    }).join('') || '<div style="text-align:center;padding:16px;color:var(--text-secondary);">Belum ada log mutasi stok.</div>';

    detailEl.innerHTML =
      '<div class="card" style="margin-bottom:16px;">' +
      '<h3 style="margin-bottom:12px;">Daftar Batch FIFO: ' + escapeHtml(productName) + '</h3>' +
      '<div class="table-container">' +
      '<table>' +
      '<thead>' +
      '<tr>' +
      '<th>Kode Batch / No. Lot</th>' +
      '<th>Tgl Produksi</th>' +
      '<th>Tgl Masuk</th>' +
      '<th>Qty Awal</th>' +
      '<th>Sisa Batch</th>' +
      '<th>HPP Modal Beli</th>' +
      '<th>Kadaluarsa</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' + (batchRows || '<tr><td colspan="7"><div style="text-align:center;padding:16px;">Tidak ada batch aktif.</div></td></tr>') + '</tbody>' +
      '</table>' +
      '</div>' +
      '</div>' +
      '<div class="card">' +
      '<h3 style="margin-bottom:12px;">Riwayat Mutasi Stok Fisik</h3>' +
      movementRows +
      '</div>';
  }).catch(function (err) {
    showToast('Gagal memuat batch: ' + (err.message || err), true);
  });
}

// ========================= KEMAS MANDIRI & PRODUKSI BENIH =========================
function renderProduksi(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('productions') && isCacheValid('products')) {
    drawProduksiUI(DATA_CACHE.products.data, DATA_CACHE.productions.data);
    return;
  }

  if (!DATA_CACHE.productions.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">Memuat formulir kemas mandiri...</div></div>';
  }

  Promise.all([
    isCacheValid('products') ? Promise.resolve(DATA_CACHE.products.data) : api('getProducts', TOKEN),
    api('getProductions', TOKEN)
  ]).then(function (results) {
    const allProducts = Array.isArray(results[0]) ? results[0] : [];
    const history = Array.isArray(results[1]) ? results[1] : [];
    DATA_CACHE.products = { data: allProducts, timestamp: Date.now() };
    DATA_CACHE.productions = { data: history, timestamp: Date.now() };
    drawProduksiUI(allProducts, history);
  }).catch(function (err) {
    showToast('Gagal memuat data: ' + (err.message || err), true);
  });
}

function drawProduksiUI(allProducts, history) {
  const content = document.getElementById('content');
  if (!content) return;
  const todayStr = new Date().toISOString().split('T')[0];

  const rawSources = allProducts.filter(function (p) {
    // Menu Quick Kemas: Sumber bahan baku curah hanya menampilkan benih curah yang aktif dan berstok
    return p && p.active && Number(p.stock || 0) > 0 && isRawProduct(p.unit) && isSeedProductClient(p);
  });
  const targetPacks = allProducts.filter(function (p) {
    return p && p.active && !isRawProduct(p.unit);
  });

  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Kemas Mandiri &amp; Produksi</h1>' +
    '<p class="page-subtitle">Konversi bahan curah gram ke produk sachet siap jual dengan penomoran lot dan kalkulasi HPP otomatis.</p>' +
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
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + ' (Sisa: ' + s.stock + ' ' + escapeHtml(s.unit) + ')</option>';
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
    '<select id="prod-target" style="padding-left:14px;">' +
    '<option value="">-- Pilih Kemasan Pcs --</option>' +
    targetPacks.map(function (t) {
      return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
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
    '<label class="field-label">Gram Diambil (Total)</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="prod-gram-used" placeholder="500" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Gram Per Kemasan</label>' +
    '<div class="input-wrapper">' +
    '<input type="number" id="prod-gram-pack" placeholder="10" oninput="calculateTheoreticalPcs()" style="padding-left:14px;">' +
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
    '<input type="number" id="prod-pcs-actual" placeholder="Pcs nyata" style="padding-left:14px;">' +
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
    (history.length ? history.map(function (h) {
      const batchTag = h.source_batch_id ? ('<br><span class="badge badge-neutral" style="font-size:10px;font-family:\'JetBrains Mono\',monospace;margin-top:2px;">' + escapeHtml(h.source_batch_id) + '</span>') : '';
      return '<tr>' +
        '<td>' + formatDate(h.created_at) + '</td>' +
        '<td><strong>' + escapeHtml(h.source_name) + '</strong>' + batchTag + '</td>' +
        '<td>' + h.gram_used + ' gr</td>' +
        '<td><strong>' + escapeHtml(h.target_name) + '</strong></td>' +
        '<td><span class="badge badge-success">+' + h.pcs_produced + ' pcs</span></td>' +
        '<td><strong>' + formatRupiah(h.hpp_per_piece) + '</strong></td>' +
        '<td style="text-align:right;"><button type="button" class="btn btn-danger btn-sm" onclick="deleteProductionUI(\'' + h.id + '\')">Batal</button></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div style="text-align:center;padding:20px;">Belum ada riwayat pengemasan.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>' +
    '</div>';
}

function calculateTheoreticalPcs() {
  const gramUsed = Number(document.getElementById('prod-gram-used').value || 0);
  const gramPack = Number(document.getElementById('prod-gram-pack').value || 0);
  const resultEl = document.getElementById('prod-theoretical');
  const actualEl = document.getElementById('prod-pcs-actual');

  if (gramUsed > 0 && gramPack > 0) {
    const theo = Math.floor(gramUsed / gramPack);
    if (resultEl) resultEl.value = theo + ' pcs';
    if (actualEl && !actualEl.value) actualEl.value = theo;
  } else {
    if (resultEl) resultEl.value = '0 pcs';
  }
}

function updateProductionSourceInfo() {
  calculateTheoreticalPcs();
  const srcId = document.getElementById('prod-source').value;
  const batchSelect = document.getElementById('prod-source-batch');
  const batchInfo = document.getElementById('prod-batch-info');
  const lotNoInput = document.getElementById('prod-lot-no');
  const syncLabel = document.getElementById('prod-batch-sync-label');
  if (!batchSelect) return;

  if (lotNoInput) lotNoInput.value = '';
  if (syncLabel) syncLabel.innerHTML = 'ℹ️ Nomor batch kemasan sachet otomatis mengikuti kode batch bahan mentah terpilih.';

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
      const isApproved = String(b.qc_status || '').toUpperCase() === 'APPROVED';
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
      optionsHtml += '<option value="' + escapeHtml(b.id) + '" data-remaining="' + b.qty_remaining + '" data-expiry="' + escapeHtml(b.expiry_date || '') + '" data-proddate="' + escapeHtml(b.production_date || '') + '" data-price="' + (b.buy_price || 0) + '">' +
        escapeHtml(b.id) + ' — Sisa ' + b.qty_remaining + ' gr (' + prodStr + expStr + ')' +
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
    return;
  }

  const remain = Number(selectedOpt.dataset.remaining || 0);
  const expiry = selectedOpt.dataset.expiry || '';
  const prodDate = selectedOpt.dataset.proddate || '';
  const price = Number(selectedOpt.dataset.price || 0);

  // Otomatis sinkronkan kode batch kemasan sama persis 1:1 dengan batch asal
  if (lotNoInput) {
    lotNoInput.value = selectedOpt.value;
  }
  if (syncLabel) {
    syncLabel.innerHTML = '✅ Batch Kemasan: <strong style="font-family:\'JetBrains Mono\',monospace;">' + escapeHtml(selectedOpt.value) + '</strong> (1:1 identik bahan mentah)';
  }

  if (batchInfo) {
    batchInfo.style.display = 'block';
    batchInfo.innerHTML = '📦 Batch: <strong>' + escapeHtml(selectedOpt.value) + '</strong> | Sisa Fisik: <strong style="color:var(--primary);">' + remain + ' gr</strong> | Modal: ' + formatRupiah(price) + '/gr';
  }

  // Mewarisi tanggal produksi dan kadaluarsa jika tersedia
  if (prodDate && prodDateInput) {
    prodDateInput.value = prodDate.split(' ')[0];
  }
  if (expiry && expiryInput) {
    expiryInput.value = expiry.split(' ')[0];
  }
}

function submitProduction() {
  const srcId = document.getElementById('prod-source').value;
  const tgtId = document.getElementById('prod-target').value;
  const batchSelect = document.getElementById('prod-source-batch');
  const srcBatchId = batchSelect ? batchSelect.value : '';
  const gramUsed = Number(document.getElementById('prod-gram-used').value || 0);
  const gramPack = Number(document.getElementById('prod-gram-pack').value || 0);
  const pcsActual = Number(document.getElementById('prod-pcs-actual').value || 0);
  const prodDate = document.getElementById('prod-date') ? document.getElementById('prod-date').value : '';
  const expiry = document.getElementById('prod-expiry').value;

  if (!srcId || !tgtId) { showToast('Pilih bahan baku dan produk kemasan jadi.', true); return; }
  if (!srcBatchId) { showToast('Wajib memilih salah satu batch bahan mentah dari daftar.', true); return; }
  if (gramUsed <= 0) { showToast('Gram terpakai harus lebih dari 0.', true); return; }
  if (pcsActual <= 0) { showToast('Jumlah pcs dihasilkan harus lebih dari 0.', true); return; }

  if (batchSelect) {
    const opt = batchSelect.options[batchSelect.selectedIndex];
    const remain = opt ? Number(opt.dataset.remaining || 0) : 0;
    if (remain <= 0) {
      showToast('Batch terpilih tidak memiliki sisa stok!', true);
      return;
    }
    if (gramUsed > remain) {
      showToast('Gram diambil (' + gramUsed + ' gr) melebihi sisa fisik batch terpilih (' + remain + ' gr)!', true);
      return;
    }
  }

  showToast('Memproses kemas mandiri & pembaruan saldo...');
  api('processProduction', TOKEN, {
    source_product_id: srcId,
    source_batch_id: srcBatchId,
    target_product_id: tgtId,
    lot_no: srcBatchId,
    gram_used: gramUsed,
    gram_per_pack: gramPack,
    pcs_produced: pcsActual,
    production_date: prodDate,
    expiry_date: expiry
  }).then(function (res) {
    invalidateCache('productions');
    invalidateCache('products');
    invalidateCache('dashboard');
    showToast('Pengemasan berhasil! HPP baru: ' + formatRupiah(res.hpp_per_piece) + '/pcs');
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
      showToast('Produksi dibatalkan & stok dikembalikan.');
      renderProduksi(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

// ========================= QUALITY CONTROL (QC) BENIH =========================

let CURRENT_QC_RECORDS = [];
let CURRENT_QC_FILTER = 'Semua';
let currentQCPhotoBase64 = '';

function renderQC(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('qc_records') && isCacheValid('products')) {
    CURRENT_QC_RECORDS = DATA_CACHE.qc_records.data || [];
    drawQCUI(CURRENT_QC_RECORDS, DATA_CACHE.products.data || []);
    return;
  }

  if (!DATA_CACHE.qc_records || !DATA_CACHE.qc_records.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">🔬 Mengambil rekam uji Quality Control benih...</div></div>';
  }

  Promise.all([
    api('getQCRecords', TOKEN),
    isCacheValid('products') ? Promise.resolve(DATA_CACHE.products.data) : api('getProducts', TOKEN)
  ]).then(function (results) {
    const qcRecords = Array.isArray(results[0]) ? results[0] : [];
    const products = Array.isArray(results[1]) ? results[1] : [];
    DATA_CACHE.qc_records = { data: qcRecords, timestamp: Date.now() };
    DATA_CACHE.products = { data: products, timestamp: Date.now() };
    CURRENT_QC_RECORDS = qcRecords;
    drawQCUI(qcRecords, products);
  }).catch(function (err) {
    showToast('Gagal memuat data QC: ' + (err.message || err), true);
  });
}

function getQCStageLabel(stageCode) {
  const map = {
    'UJI_1_PETANI': '1. Uji Lapangan Petani',
    'UJI_2_IDEP': '2. Uji Semai Kantor (Pre-DHT)',
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
    'Standardisasi uji duplo 100 butir (Ambang Minimal IDEP 80%), penjemuran DHT 24 jam, &amp; dokumentasi foto baki on-site.' +
    '</p>' +
    '</div>' +
    '<div style="display:flex;gap:10px;align-items:center;">' +
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

function actionCompleteDHT(batchId) {
  if (!batchId) return;
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-title');
  const msgEl = document.getElementById('confirm-message');
  const okBtn = document.getElementById('confirm-ok-btn');
  const cancelBtn = document.getElementById('confirm-cancel-btn');

  if (modal && titleEl && msgEl && okBtn && cancelBtn) {
    titleEl.textContent = 'Keluarkan Benih dari Oven DHT?';
    msgEl.textContent = 'Apakah Anda yakin proses pengeringan oven selama 24 jam untuk batch "' + batchId + '" telah selesai dan benih siap dipindahkan ke tahap Uji Semai Pasca-DHT?';
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
      api('completeDHTSession', TOKEN, { batch_id: batchId, notes: 'Dikeluarkan dari oven tepat waktu.' }).then(function (res) {
        showToast(res.message || 'Proses oven DHT selesai! Batch siap untuk Uji Semai Pasca-DHT.');
        invalidateCache('qc_records');
        invalidateCache('products');
        renderQC(true);
      }).catch(function (err) {
        showToast('Gagal menyelesaikan DHT: ' + (err.message || err), true);
      });
    };
  } else {
    if (confirm('Keluarkan batch "' + batchId + '" dari oven DHT dan lanjutkan ke Uji Semai Pasca-DHT?')) {
      showToast('Memperbarui status pengeluaran oven DHT...');
      api('completeDHTSession', TOKEN, { batch_id: batchId, notes: 'Dikeluarkan dari oven tepat waktu.' }).then(function (res) {
        showToast(res.message || 'Proses oven DHT selesai! Batch siap untuk Uji Semai Pasca-DHT.');
        invalidateCache('qc_records');
        invalidateCache('products');
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
      const matchBatch = String(r.batch_id || '').toLowerCase().indexOf(kw) !== -1;
      const matchProd = String(r.product_name || '').toLowerCase().indexOf(kw) !== -1;
      const matchStage = String(r.last_stage || '').toLowerCase().indexOf(kw) !== -1;
      if (!matchBatch && !matchProd && !matchStage) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return '<tr><td colspan="8"><div class="empty-state" style="padding:40px 20px;">Tidak ada batch benih yang sesuai dengan filter "' + escapeHtml(filterCategory) + '".</div></td></tr>';
  }

  return filtered.map(function (b, index) {
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
      const safeTitle = escapeHtml(b.batch_id + ' - ' + b.product_name);
      const safeMeta = escapeHtml(getQCStageLabel(b.last_stage) + ' | Daya Tumbuh: ' + (b.last_germination_rate !== null ? b.last_germination_rate + '%' : '-'));
      photoHtml = '<img src="' + escapeHtml(b.last_photo_url) + '" alt="Foto Baki" class="qc-photo-thumbnail" title="Klik untuk memperbesar foto baki" onclick="openQCPhotoViewer(\'' + escapeHtml(b.last_photo_url) + '\', \'' + safeTitle + '\', \'' + safeMeta + '\')">';
    }

    // 3. Status Kelulusan
    let statusBadge = '<span class="badge badge-qc-waiting">⚠️ Menunggu Uji</span>';
    if (b.category === 'Lolos Mutu') {
      statusBadge = '<span class="badge badge-qc-passed"><i class="fas fa-check-circle"></i> Lolos Mutu</span>';
    } else if (b.category === 'Karantina/Gagal') {
      statusBadge = '<span class="badge badge-qc-failed"><i class="fas fa-times-circle"></i> Karantina / Gagal</span>';
    } else if (b.category === 'Proses DHT') {
      const ovenBadgeLabel = b.dht_info ? (b.dht_info.oven_no + ' (' + b.dht_info.target_temp + '°C)') : 'Proses DHT';
      statusBadge = '<span class="badge-qc-oven-running"><span class="flame-icon">🔥</span> ' + escapeHtml(ovenBadgeLabel) + '</span>';
    }

    // 4. Tahap Terakhir
    const stageLabel = getQCStageLabel(b.last_stage);
    const dateLabel = b.last_tested_at ? ('<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + formatDate(b.last_tested_at) + '</div>') : '';

    // 5. Tombol Aksi
    let actionButtons = '';
    if (b.category === 'Proses DHT' || (b.dht_info && !b.dht_info.is_finished)) {
      actionButtons =
        '<button type="button" class="btn btn-sm btn-success" onclick="actionCompleteDHT(\'' + escapeHtml(b.batch_id) + '\')" title="Keluarkan dari Oven &amp; Selesaikan Tahap DHT" style="margin-right:4px;">' +
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
      '<span style="font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);font-size:12px;">' + escapeHtml(b.batch_id) + '</span>' +
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
      optionsHtml += '<option value="' + escapeHtml(b.batch_id) + '"' + (isSelected ? ' selected' : '') + '>' +
        escapeHtml(b.batch_id) + ' — ' + escapeHtml(b.product_name) + ' (' + escapeHtml(catLabel) + ')' +
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
    if (!batch.last_stage || batch.last_stage === '-') {
      stageSelect.value = 'UJI_1_PETANI';
    } else if (batch.last_stage === 'UJI_1_PETANI') {
      stageSelect.value = 'UJI_2_IDEP';
    } else if (batch.last_stage === 'UJI_2_IDEP') {
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
      if (stageNote) stageNote.innerHTML = '⭐ <strong>Uji penentu mutu akhir:</strong> Jika total daya tumbuh ≥ 80%, batch otomatis berstatus APPROVED dan terbuka untuk kasir POS &amp; Kemas Mandiri.';
    } else if (val === 'UJI_2_IDEP') {
      if (stageNote) stageNote.innerHTML = 'Uji verifikasi daya tumbuh di laboratorium/kantor IDEP sebelum benih dimasukkan ke lemari pengering DHT.';
    } else {
      if (stageNote) stageNote.innerHTML = 'Uji semai awal di lahan petani mitra saat panen benih selesai dirontokkan.';
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
  if (textEl) textEl.textContent = 'Daya Tumbuh: ' + total + '% (Standar IDEP: Min 80%)';
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
  openQCPhotoViewer(currentQCPhotoBase64, 'Pratinjau Foto Baki Semai', 'Batch: ' + escapeHtml(batchId || '-') + ' | Tahap: ' + getQCStageLabel(stage));
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
    stage: stage,
    tray_a: trayA,
    tray_b: trayB,
    notes: notes,
    imageBase64: currentQCPhotoBase64,
    imageMimeType: 'image/jpeg'
  };

  if (statusBox) statusBox.style.display = 'block';
  if (statusText) statusText.textContent = currentQCPhotoBase64 ? 'Menyimpan catatan dan mengunggah foto ke Drive...' : 'Menyimpan catatan uji QC ke Spreadsheet...';
  if (btnSave) btnSave.disabled = true;

  api('saveQCStageWithPhoto', TOKEN, payload).then(function (res) {
    if (statusBox) statusBox.style.display = 'none';
    if (btnSave) btnSave.disabled = false;
    showToast(res.message || 'Catatan QC berhasil disimpan!');
    closeQCEntryModal();
    invalidateCache('qc_records');
    invalidateCache('products');
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

  const history = batch.history || [];
  let bodyHtml =
    '<div style="margin-bottom:14px;padding:10px 14px;background:var(--surface-muted);border-radius:8px;">' +
    '<div style="font-weight:700;font-size:14px;color:var(--text-main);">' + escapeHtml(batch.product_name) + '</div>' +
    '<div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">Kode Batch: <code>' + escapeHtml(batch.batch_id) + '</code> | Sisa Stok: ' + batch.qty_remaining + ' ' + escapeHtml(batch.unit) + ' | Status Mutu: <strong>' + escapeHtml(batch.qc_status) + '</strong></div>' +
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
        const isPass = h.status === 'PASSED';
        const rateDisplay = h.stage === 'DHT_24JAM' ? 'Oven DHT 24J' : (rate + '% (A:' + (h.tray_a_count || 0) + ' B:' + (h.tray_b_count || 0) + ')');
        const photoLink = h.photo_drive_url
          ? '<a href="#" onclick="openQCPhotoViewer(\'' + escapeHtml(h.photo_drive_url) + '\', \'' + escapeHtml(batch.batch_id + ' - ' + stageLabel) + '\', \'Daya Tumbuh: ' + rateDisplay + '\'); return false;" style="color:#2563EB;font-weight:600;">📷 Lihat Foto</a>'
          : '<span style="color:var(--text-secondary);font-size:11px;">-</span>';

        return '<tr>' +
          '<td><strong>' + formatDate(h.tested_at) + '</strong><br><small style="color:var(--text-secondary);">' + escapeHtml(h.tested_by || '-') + '</small></td>' +
          '<td>' + stageLabel + '</td>' +
          '<td><strong>' + rateDisplay + '</strong></td>' +
          '<td>' + photoLink + '</td>' +
          '<td><span class="badge ' + (isPass ? 'badge-success' : 'badge-danger') + '">' + escapeHtml(h.status) + '</span></td>' +
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

  openModal('Riwayat Uji QC: ' + batch.batch_id, bodyHtml, footerHtml, true);
}

// ========================= PEMBELIAN (PENGADAAN) =========================
function renderPembelian(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('purchases') && isCacheValid('suppliers') && isCacheValid('farmers')) {
    drawPembelianUI(DATA_CACHE.purchases.data);
    return;
  }

  if (!DATA_CACHE.purchases.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">Memuat riwayat pengadaan...</div></div>';
  }

  Promise.all([
    api('getPurchases', TOKEN),
    isCacheValid('suppliers') ? Promise.resolve(DATA_CACHE.suppliers.data) : api('getSuppliers', TOKEN),
    isCacheValid('products') ? Promise.resolve(DATA_CACHE.products.data) : api('getProducts', TOKEN),
    isCacheValid('farmers') ? Promise.resolve(DATA_CACHE.farmers.data) : api('getFarmers', TOKEN)
  ]).then(function (results) {
    const purchases = Array.isArray(results[0]) ? results[0] : [];
    SUPPLIERS_CACHE = Array.isArray(results[1]) ? results[1] : [];
    const rawProducts = Array.isArray(results[2]) ? results[2] : [];
    PRODUCTS_CACHE = rawProducts.filter(function (p) { return p && p.active; });
    FARMERS_CACHE = Array.isArray(results[3]) ? results[3] : [];

    DATA_CACHE.purchases = { data: purchases, timestamp: Date.now() };
    DATA_CACHE.suppliers = { data: SUPPLIERS_CACHE, timestamp: Date.now() };
    DATA_CACHE.products = { data: rawProducts, timestamp: Date.now() };
    DATA_CACHE.farmers = { data: FARMERS_CACHE, timestamp: Date.now() };

    drawPembelianUI(purchases);
  }).catch(function (err) {
    showToast('Gagal memuat pembelian: ' + (err.message || err), true);
  });
}

function drawPembelianUI(purchases) {
  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML =
    '<div class="page-header">' +
    '<div>' +
    '<h1 class="page-title">Pembelian &amp; Pengadaan</h1>' +
    '<p class="page-subtitle">Pencatatan faktur masuk dari supplier dan mitra penangkar benih.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-primary" onclick="openPurchaseModal()">+ Pembelian Baru</button>' +
    '</div>' +
    '<div class="table-container">' +
    '<table>' +
    '<thead>' +
    '<tr>' +
    '<th>Tanggal</th>' +
    '<th>Supplier</th>' +
    '<th>Nama Petani / Penangkar</th>' +
    '<th>No. Faktur</th>' +
    '<th>Total Pengadaan</th>' +
    '<th style="text-align:right;">Aksi</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' +
    (purchases.length ? purchases.map(function (p) {
      return '<tr>' +
        '<td>' + formatDate(p.created_at) + '</td>' +
        '<td><strong>' + escapeHtml(p.supplier_name) + '</strong></td>' +
        '<td>' + escapeHtml(p.farmer_name || '-') + '</td>' +
        '<td>' + escapeHtml(p.invoice_no || '-') + '</td>' +
        '<td><strong>' + formatRupiah(p.total) + '</strong></td>' +
        '<td style="text-align:right;">' +
        '<button type="button" class="btn btn-danger btn-sm" onclick="deletePurchaseUI(\'' + p.id + '\')">Hapus</button>' +
        '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div style="text-align:center;padding:24px;">Belum ada pembelian tercatat.</div></td></tr>') +
    '</tbody>' +
    '</table>' +
    '</div>';
}

function deletePurchaseUI(purchaseId) {
  showConfirmDialog('Hapus Pembelian', 'Hapus faktur pengadaan ini? Seluruh batch stok dan mutasi yang masuk akan dibersihkan.', function () {
    api('deletePurchase', TOKEN, purchaseId).then(function () {
      invalidateCache('purchases');
      invalidateCache('products');
      invalidateCache('qc_records');
      showToast('Pembelian berhasil dihapus.');
      renderPembelian(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

function openPurchaseModal() {
  const bodyHtml =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:14px;">' +
    '<div>' +
    '<label class="field-label">Supplier</label>' +
    '<div style="display:flex;gap:6px;">' +
    '<select id="pur-supplier" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);"></select>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openSupplierModal()">+ Baru</button>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Nama Petani / Penangkar Mitra</label>' +
    '<div style="display:flex;gap:6px;">' +
    '<select id="pur-farmer" onchange="onFarmerSelectedChange(this.value)" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);"></select>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openFarmerModal()">+ Baru</button>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">No. Faktur / Surat Jalan</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="pur-invoice" placeholder="Contoh: INV-SUP-01" style="padding-left:14px;">' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Filter Jenis Produk</label>' +
    '<div class="input-wrapper">' +
    '<select id="pur-cat-filter" onchange="filterPurchaseProductOptions(this.value)" style="padding-left:14px;">' +
    '<option value="all">Semua Produk</option>' +
    '<option value="mentah">🌾 Bahan Baku Curah (Gram)</option>' +
    '<option value="jadi">📦 Barang Jadi Kemasan (Pcs)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
    '<label class="field-label" style="margin-bottom:0;">Daftar Item Pembelian &amp; Perhitungan HPP (Landed Cost)</label>' +
    '<span style="font-size:11px;color:var(--text-secondary);"><i class="fas fa-calculator" style="margin-right:4px;"></i>Rumus: <strong>HPP Final = Harga Beli + Biaya Tambahan/Pcs</strong></span>' +
    '</div>' +
    '<div class="purchase-items-wrapper">' +
    '<div class="purchase-items-table">' +
    '<div class="purchase-grid-header">' +
    '<div>Nama Produk</div>' +
    '<div>No. Batch / Lot</div>' +
    '<div style="text-align:center;">Qty</div>' +
    '<div>Harga Beli (Rp)</div>' +
    '<div>Biaya Ekstra/Pcs (Rp)</div>' +
    '<div>HPP Final/Pcs (Rp)</div>' +
    '<div>Tgl Produksi</div>' +
    '<div>Tgl Kadaluarsa</div>' +
    '<div style="text-align:center;">Aksi</div>' +
    '</div>' +
    '<div id="pur-items" style="max-height:360px;overflow-y:auto;"></div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;flex-wrap:wrap;gap:10px;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addPurchaseItemRow()">+ Tambah Baris Barang</button>' +
    '<div style="display:flex;gap:18px;align-items:center;">' +
    '<div style="font-size:12px;color:var(--text-secondary);">Total Item Qty: <strong id="pur-total-qty" style="color:var(--text-main);font-size:13px;">0</strong></div>' +
    '<div style="font-size:13px;font-weight:700;color:var(--primary,#1b5e20);">Total Pengadaan: <span id="pur-grand-total" style="font-size:15px;color:var(--primary,#1b5e20);">Rp 0</span></div>' +
    '</div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" onclick="submitPurchase()">Simpan Faktur Pembelian</button>';

  openModal('Pembelian / Pengadaan Baru', bodyHtml, footerHtml, true);
  const dialog = document.getElementById('modal-dialog');
  if (dialog) {
    dialog.style.maxWidth = '1120px';
  }
  renderSupplierOptions();
  renderFarmerOptions();
  addPurchaseItemRow();

  const farmerEl = document.getElementById('pur-farmer');
  if (farmerEl) {
    farmerEl.addEventListener('change', function () {
      onFarmerSelectedChange(this.value);
    });
  }
}

function buildProductOptionsHTML(category, selectedId) {
  const list = PRODUCTS_CACHE || [];
  const filtered = list.filter(function (p) {
    if (!p || !p.active) return false;
    const isRaw = isRawProduct(p.unit);
    if (category === 'mentah') return isRaw;
    if (category === 'jadi') return !isRaw;
    return true;
  });

  if (filtered.length === 0) return '<option value="">-- Tidak ada produk --</option>';

  return filtered.map(function (p) {
    let tag = isRawProduct(p.unit) ? '🌾 [Curah] ' : '📦 [Kemasan] ';
    const varTag = p.variant ? ' [' + escapeHtml(p.variant) + ']' : '';
    const isSel = (p.id === selectedId) ? ' selected' : '';
    return '<option value="' + p.id + '"' + isSel + '>' + tag + escapeHtml(p.name) + varTag + ' (' + escapeHtml(p.unit || '') + ')</option>';
  }).join('');
}

function calculatePurchaseRowHPP(targetEl) {
  if (!targetEl) return;
  const row = targetEl.closest ? targetEl.closest('.price-tier-row') : targetEl;
  if (!row) return;

  const priceInput = row.querySelector('.pi-price, .pur-item-buy-price');
  const extraInput = row.querySelector('.pur-item-cost-extra');
  const hppDisplay = row.querySelector('.pur-item-hpp-display');

  const buyPrice = parseFloat(priceInput ? priceInput.value : 0) || 0;
  const extraCost = parseFloat(extraInput ? extraInput.value : 0) || 0;
  const hppFinal = Math.max(0, buyPrice + extraCost);

  if (hppDisplay) {
    const formatted = formatRupiah(hppFinal);
    if (hppDisplay.tagName === 'INPUT') {
      hppDisplay.value = formatted;
    } else {
      hppDisplay.textContent = formatted;
    }
    hppDisplay.dataset.value = hppFinal;
  }

  updatePurchaseModalTotal();
}

function updatePurchaseModalTotal() {
  const grandTotalEl = document.getElementById('pur-grand-total');
  const totalQtyEl = document.getElementById('pur-total-qty');
  if (!grandTotalEl && !totalQtyEl) return;

  let grandTotal = 0;
  let totalQty = 0;
  const rows = document.querySelectorAll('#pur-items .price-tier-row');
  rows.forEach(function (r) {
    const qty = parseFloat(r.querySelector('.pi-qty') ? r.querySelector('.pi-qty').value : 0) || 0;
    const price = parseFloat(r.querySelector('.pi-price, .pur-item-buy-price') ? r.querySelector('.pi-price, .pur-item-buy-price').value : 0) || 0;
    const extra = parseFloat(r.querySelector('.pur-item-cost-extra') ? r.querySelector('.pur-item-cost-extra').value : 0) || 0;
    const hpp = price + extra;
    grandTotal += (qty * hpp);
    totalQty += qty;
  });

  if (grandTotalEl) grandTotalEl.textContent = formatRupiah(grandTotal);
  if (totalQtyEl) totalQtyEl.textContent = totalQty.toLocaleString('id-ID');
}

function addPurchaseItemRow() {
  const catFilter = document.getElementById('pur-cat-filter') ? document.getElementById('pur-cat-filter').value : 'all';
  const container = document.getElementById('pur-items');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const row = document.createElement('div');
  row.className = 'price-tier-row pur-item-row';

  row.innerHTML =
    '<div>' +
    '<select class="pi-product pur-item-product" onchange="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;font-size:12px;font-weight:600;">' +
    buildProductOptionsHTML(catFilter) +
    '</select>' +
    '</div>' +
    '<div>' +
    '<div style="display:flex;gap:4px;">' +
    '<input type="text" class="pi-lot pur-item-lot" oninput="this.dataset.manual=\'true\'" placeholder="Auto / Manual" style="flex:1;min-width:0;width:100%;padding:6px 6px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);font-family:\'JetBrains Mono\',monospace;">' +
    '<button type="button" class="btn-regen-batch" title="Generate ulang kode acak" onclick="regenerateBatchRow(this)" style="padding:4px 6px;border:1px solid var(--border);background:#fff;border-radius:var(--radius-xs);cursor:pointer;font-size:11px;">🔄</button>' +
    '</div>' +
    '</div>' +
    '<div>' +
    '<input type="number" class="pi-qty pur-item-qty" placeholder="Qty" min="1" value="1" oninput="calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 4px;font-size:12px;text-align:center;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '<div>' +
    '<input type="number" class="pi-price pur-item-buy-price" placeholder="0" min="0" oninput="calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:right;">' +
    '</div>' +
    '<div>' +
    '<input type="number" class="pur-item-cost-extra pi-cost-extra" placeholder="0" min="0" value="0" oninput="calculatePurchaseRowHPP(this)" style="width:100%;padding:6px 6px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:right;">' +
    '</div>' +
    '<div>' +
    '<input type="text" class="pur-item-hpp-display" readonly value="Rp 0" data-value="0" title="HPP Final / Pcs = Harga Beli + Biaya Ekstra" style="width:100%;padding:6px 6px;font-size:12px;font-weight:700;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-xs);cursor:default;text-align:right;">' +
    '</div>' +
    '<div>' +
    '<input type="date" class="pi-prod-date pur-item-prod-date" value="' + todayStr + '" style="width:100%;padding:6px 4px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '<div>' +
    '<input type="date" class="pi-expiry pur-item-expiry" onchange="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" oninput="autoFillPurchaseRowBatch(this.closest(\'.price-tier-row\'), false)" style="width:100%;padding:6px 4px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '<div style="text-align:center;">' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.closest(\'.price-tier-row\').remove();renumberPurchaseBatchSequences();updatePurchaseModalTotal();" title="Hapus baris" style="padding:4px 8px;font-size:12px;line-height:1;">&times;</button>' +
    '</div>';

  container.appendChild(row);
  autoFillPurchaseRowBatch(row, false);
  calculatePurchaseRowHPP(row);
}

function cleanFarmerInitialClient(farmerName) {
  if (!farmerName) return 'ID01';
  const str = String(farmerName).trim().toUpperCase();
  if (/^[A-Z]{2,4}\d{2}$/.test(str)) {
    return str;
  }
  let clean = String(farmerName).trim().replace(/^(?:(?:pak|bpk|ibu|bu|bapak|bli|mas|mbak|i|ni)\.?\s+)+/gi, '').trim();
  if (!clean) clean = String(farmerName).trim();

  const letters = clean.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (!letters) return 'ID01';

  const consonants = letters.replace(/[AEIOU]/g, '');
  let code = '';
  if (consonants.length >= 2) {
    code = consonants.slice(0, 2);
  } else if (consonants.length === 1 && letters.length >= 2) {
    code = consonants[0] + letters.replace(consonants[0], '').slice(0, 1);
  } else {
    code = letters.slice(0, 2).padEnd(2, 'X');
  }
  return code + '01';
}

function extractYYMMClient(expiryDate) {
  if (expiryDate) {
    const parts = String(expiryDate).trim().split(/[-/]/);
    if (parts.length >= 2) {
      if (parts[0].length === 4) {
        return parts[0].slice(2, 4) + String(parts[1]).padStart(2, '0');
      } else if (parts.length >= 3 && parts[2].length === 4) {
        return parts[2].slice(2, 4) + String(parts[1]).padStart(2, '0');
      }
    }
  }
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  const yy = String(future.getFullYear()).slice(2, 4);
  const mm = String(future.getMonth() + 1).padStart(2, '0');
  return yy + mm;
}

function flashInputHighlight(inputEl) {
  if (!inputEl) return;
  inputEl.style.transition = 'none';
  inputEl.style.borderColor = 'var(--success, #2e7d32)';
  inputEl.style.backgroundColor = 'var(--success-bg, #edf7ed)';
  setTimeout(function () {
    inputEl.style.transition = 'all 0.5s ease';
    inputEl.style.borderColor = 'var(--border, #e8e0c9)';
    inputEl.style.backgroundColor = '';
  }, 350);
}

function getPurchaseRowIndex(row) {
  if (!row || !row.parentNode) return 1;
  const rows = Array.from(row.parentNode.querySelectorAll('.price-tier-row'));
  const idx = rows.indexOf(row);
  return idx >= 0 ? idx + 1 : 1;
}

function renumberPurchaseBatchSequences() {
  document.querySelectorAll('#pur-items .price-tier-row').forEach(function (row) {
    autoFillPurchaseRowBatch(row, false);
  });
}

function generateClientBatchCode(farmerIdOrName, expiryDate, itemIndex) {
  const template = (APP_SETTINGS && (APP_SETTINGS['batch_format_template'] || APP_SETTINGS['batch_format'])) || 'BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}';

  // 1. Token {FARMER}
  let farmerCode = '';
  if (farmerIdOrName && String(farmerIdOrName).trim()) {
    const term = String(farmerIdOrName).trim();
    const list = FARMERS_CACHE || [];
    const f = list.find(function (x) {
      return String(x.id) === term || String(x.name).toLowerCase() === term.toLowerCase();
    });
    if (f && f.code && String(f.code).trim()) {
      farmerCode = String(f.code).trim().toUpperCase();
    } else if (f && f.name) {
      farmerCode = cleanFarmerInitialClient(f.name);
    } else {
      farmerCode = cleanFarmerInitialClient(term);
    }
  }
  if (!farmerCode || (farmerCode === 'ID01' && !farmerIdOrName)) {
    farmerCode = 'GEN';
  }

  // 2. Token {YYMM}
  const yymm = extractYYMMClient(expiryDate);

  // 3. Token {RAND4}
  const rand4 = Math.random().toString(36).substring(2, 6).toUpperCase();

  // 4. Token {SEQ}
  const seqNum = Number(itemIndex) || 1;
  const seq = String(seqNum).padStart(2, '0');

  // Token legacy
  const today = new Date();
  const yy = String(today.getFullYear()).slice(2, 4);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const ymd = yy + mm + dd;

  let code = template
    .replace(/\{FARMER\}/g, farmerCode)
    .replace(/\{YYMM\}/g, yymm)
    .replace(/\{RAND4\}/g, rand4)
    .replace(/\{SEQ\}/g, seq)
    .replace(/\{PREFIX\}/g, 'RAW')
    .replace(/\{YMD\}/g, ymd)
    .replace(/\{LOT\}/g, farmerCode + '-' + rand4);

  code = code.replace(/[-_]{2,}/g, '-').replace(/^[-_]+|[-_]+$/g, '');
  return code;
}

function generateBatchCodeClient(farmerName, expiryDate, productId, customPrefix) {
  return generateClientBatchCode(farmerName, expiryDate, 1);
}

function autoFillPurchaseRowBatch(row, forceNewRandom) {
  if (!row) return;
  const lotInput = row.querySelector('.pi-lot');
  if (!lotInput) return;
  if (!forceNewRandom && lotInput.dataset.manual === 'true' && lotInput.value.trim() !== '') {
    return;
  }

  const farmerEl = document.getElementById('pur-farmer');
  let farmerIdOrName = '';
  if (farmerEl) {
    if (farmerEl.tagName === 'SELECT') {
      farmerIdOrName = farmerEl.value;
      if (!farmerIdOrName && farmerEl.selectedIndex > 0) {
        const opt = farmerEl.options[farmerEl.selectedIndex];
        farmerIdOrName = opt.dataset.code || opt.dataset.name || opt.text;
      }
    } else {
      farmerIdOrName = farmerEl.value.trim();
    }
  }

  const expiry = (row.querySelector('.pi-expiry') ? row.querySelector('.pi-expiry').value : '').trim();
  const itemIndex = getPurchaseRowIndex(row);

  const batchCode = generateClientBatchCode(farmerIdOrName, expiry, itemIndex);
  lotInput.value = batchCode;
  flashInputHighlight(lotInput);

  if (forceNewRandom) {
    delete lotInput.dataset.manual;
  }
}

function regenerateBatchRow(btn) {
  const row = btn.closest('.price-tier-row');
  if (row) {
    autoFillPurchaseRowBatch(row, true);
    showToast('Token acak batch berhasil di-generate ulang.');
  }
}

function renderTraceabilityPanelHTML(prefix) {
  const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
    return '<option value="' + p.id + '">' + escapeHtml(p.name) + ' (' + escapeHtml(p.unit || '') + ')</option>';
  }).join('');

  return (
    '<div class="traceability-panel">' +
    '<div class="traceability-header">' +
    '<div class="traceability-title">🔍 Pelacakan Cepat Toples Induk Berdasarkan Exp (Traceability)</div>' +
    '<small style="color:var(--text-secondary);">Identifikasi toples asal bahan curah &amp; petani penangkar dari kode bulan/tahun exp (MM/YY).</small>' +
    '</div>' +
    '<div class="traceability-controls">' +
    '<div>' +
    '<label class="field-label" style="font-size:11px;">Filter Produk (Opsional)</label>' +
    '<select id="trace-prod-' + prefix + '" style="padding:7px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;width:100%;font-size:13px;">' +
    '<option value="">-- Semua Produk --</option>' +
    prodOptions +
    '</select>' +
    '</div>' +
    '<div>' +
    '<label class="field-label" style="font-size:11px;">Bulan/Tahun Exp (MM/YY atau YYYY-MM)</label>' +
    '<div class="input-wrapper">' +
    '<input type="text" id="trace-exp-' + prefix + '" placeholder="Contoh: 12/27 atau 2712" onkeydown="if(event.key===\'Enter\') runTraceabilitySearch(\'' + prefix + '\')" style="padding-left:14px;font-size:13px;font-family:\'JetBrains Mono\',monospace;">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;">' +
    '<button type="button" class="btn btn-primary btn-sm" onclick="runTraceabilitySearch(\'' + prefix + '\')">🔎 Lacak Batch</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="resetTraceabilitySearch(\'' + prefix + '\')">Reset</button>' +
    '</div>' +
    '</div>' +
    '<div id="trace-results-' + prefix + '"></div>' +
    '</div>'
  );
}

function runTraceabilitySearch(prefix) {
  const prodSelect = document.getElementById('trace-prod-' + prefix);
  const expInput = document.getElementById('trace-exp-' + prefix);
  const resultsContainer = document.getElementById('trace-results-' + prefix);
  if (!resultsContainer) return;

  const prodId = prodSelect ? prodSelect.value.trim() : '';
  const expQuery = expInput ? expInput.value.trim() : '';

  if (!prodId && !expQuery) {
    showToast('Masukkan minimal pilihan produk atau bulan/tahun kadaluarsa (MM/YY).', true);
    return;
  }

  resultsContainer.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-secondary);">⏳ Melacak toples induk &amp; persediaan batch...</div>';

  api('searchBatchTraceability', TOKEN, prodId, expQuery).then(function (batches) {
    const list = Array.isArray(batches) ? batches : [];
    if (list.length === 0) {
      resultsContainer.innerHTML =
        '<div style="padding:16px;text-align:center;background:var(--surface-muted);border-radius:var(--radius-xs);color:var(--text-muted);">' +
        'Tidak ditemukan toples atau batch yang sesuai dengan filter ("' + escapeHtml(expQuery || 'Semua Exp') + '").' +
        '</div>';
      return;
    }

    let cardsHtml = '<div class="traceability-grid">';
    list.forEach(function (b) {
      const typeBadge = b.is_raw
        ? '<span class="badge badge-warning" style="font-size:10px;">Toples Curah (Bahan Baku)</span>'
        : '<span class="badge badge-success" style="font-size:10px;">Kemasan Sachet (Siap Jual)</span>';

      const expFormatted = b.expiry_date ? formatDate(b.expiry_date) : '-';
      const inDateFormatted = b.received_at ? formatDate(b.received_at) : (b.production_date ? formatDate(b.production_date) : '-');

      const actionBtn = (prefix === 'pj')
        ? '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="createComplaintWithBatch(\'' + escapeHtml(b.batch_id) + '\', \'' + escapeHtml(b.product_id) + '\', \'' + escapeHtml(b.product_name) + '\')">➕ Tiket Komplain</button>'
        : '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="showBatchDetail(\'' + escapeHtml(b.product_id) + '\', \'' + escapeHtml(b.product_name) + '\')">Audit Batch</button>';

      cardsHtml +=
        '<div class="batch-card">' +
        '<div class="batch-card-header">' +
        '<span class="batch-card-id">' + escapeHtml(b.batch_id) + '</span>' +
        typeBadge +
        '</div>' +
        '<div class="batch-card-body">' +
        '<div><strong>🌾 ' + escapeHtml(b.product_name) + '</strong></div>' +
        '<div>👨‍🌾 Penangkar / Petani: <strong style="color:var(--primary);">' + escapeHtml(b.farmer_name) + '</strong></div>' +
        '<div>📅 Tgl Masuk: ' + inDateFormatted + '</div>' +
        '<div>⏳ Tgl Kedaluwarsa: <strong style="color:var(--danger);">' + expFormatted + '</strong></div>' +
        '<div>📦 Sisa Stok Fisik: <strong style="color:var(--primary);font-size:13px;">' + b.qty_remaining + ' ' + escapeHtml(b.unit) + '</strong> (dari ' + b.qty_in + ' ' + escapeHtml(b.unit) + ')</div>' +
        '</div>' +
        '<div class="batch-card-footer">' +
        '<button type="button" class="btn btn-secondary btn-sm" style="font-size:11px;" onclick="navigator.clipboard.writeText(\'' + escapeHtml(b.batch_id) + '\');showToast(\'Kode batch disalin: ' + escapeHtml(b.batch_id) + '\');">📋 Salin</button>' +
        actionBtn +
        '</div>' +
        '</div>';
    });
    cardsHtml += '</div>';

    resultsContainer.innerHTML = cardsHtml;
  }).catch(function (err) {
    resultsContainer.innerHTML = '<div style="color:var(--danger);padding:12px;">Gagal melacak batch: ' + (err.message || err) + '</div>';
  });
}

function resetTraceabilitySearch(prefix) {
  const prodSelect = document.getElementById('trace-prod-' + prefix);
  const expInput = document.getElementById('trace-exp-' + prefix);
  const resultsContainer = document.getElementById('trace-results-' + prefix);
  if (prodSelect) prodSelect.value = '';
  if (expInput) expInput.value = '';
  if (resultsContainer) resultsContainer.innerHTML = '';
}

function createComplaintWithBatch(batchId, prodId, prodName) {
  openAfterSalesModal();
  setTimeout(function () {
    const desc = document.getElementById('as-desc');
    if (desc) desc.value = 'Komplain terkait batch lot: ' + batchId + ' (Toples asal teridentifikasi)';
    const prodSelect = document.getElementById('as-prod');
    if (prodSelect && prodId) prodSelect.value = prodId;
  }, 150);
}

function filterPurchaseProductOptions(category) {
  document.querySelectorAll('#pur-items .pi-product').forEach(function (select) {
    const val = select.value;
    select.innerHTML = buildProductOptionsHTML(category, val);
  });
}

function renderSupplierOptions(selectedId) {
  const select = document.getElementById('pur-supplier');
  if (!select) return;
  if (!SUPPLIERS_CACHE || SUPPLIERS_CACHE.length === 0) {
    select.innerHTML = '<option value="">-- Belum ada supplier, klik "+ Baru" --</option>';
    return;
  }
  select.innerHTML = SUPPLIERS_CACHE.map(function (s) {
    return '<option value="' + s.id + '"' + (s.id === selectedId ? ' selected' : '') + '>' + escapeHtml(s.name) + '</option>';
  }).join('');
}

function openSupplierModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Supplier Baru</h3>' +
    '<button type="button" class="modal-close-btn" id="sup-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<div class="field-group"><label class="field-label">Nama Supplier</label><div class="input-wrapper"><input type="text" id="sup-name" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Kontak WhatsApp</label><div class="input-wrapper"><input type="text" id="sup-contact" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Alamat</label><div class="input-wrapper"><input type="text" id="sup-address" style="padding-left:14px;"></div></div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="sup-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="sup-save">Simpan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = function () { overlay.remove(); };
  overlay.querySelector('#sup-close').onclick = close;
  overlay.querySelector('#sup-cancel').onclick = close;
  overlay.querySelector('#sup-save').onclick = function () {
    const name = document.getElementById('sup-name').value.trim();
    if (!name) { showToast('Nama supplier wajib diisi.', true); return; }
    api('saveSupplier', TOKEN, {
      name: name,
      contact: document.getElementById('sup-contact').value.trim(),
      address: document.getElementById('sup-address').value.trim()
    }).then(function (res) {
      invalidateCache('suppliers');
      SUPPLIERS_CACHE.push({ id: res.id, name: name });
      renderSupplierOptions(res.id);
      showToast('Supplier ditambahkan.');
      close();
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  };
}

function renderFarmerOptions(selectedId) {
  const select = document.getElementById('pur-farmer');
  if (!select) return;
  const list = FARMERS_CACHE || [];
  let html = '<option value="">-- Pilih Petani Penangkar --</option>';
  list.forEach(function (f) {
    const isSelected = (selectedId && (String(f.id) === String(selectedId) || String(f.name) === String(selectedId))) ? ' selected' : '';
    const codePart = f.code ? escapeHtml(f.code) : '';
    const addrPart = f.address ? (' - ' + escapeHtml(f.address)) : '';
    const label = escapeHtml(f.name) + (codePart || addrPart ? (' (' + codePart + addrPart + ')') : '');
    html += '<option value="' + escapeHtml(f.id) + '" data-name="' + escapeHtml(f.name) + '" data-code="' + escapeHtml(f.code || '') + '"' + isSelected + '>' + label + '</option>';
  });
  select.innerHTML = html;
}

function openFarmerModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '2100';
  overlay.innerHTML =
    '<div class="modal-backdrop"></div>' +
    '<div class="modal-dialog modal-dialog-sm">' +
    '<div class="modal-header">' +
    '<h3 class="modal-title">Petani Penangkar Baru</h3>' +
    '<button type="button" class="modal-close-btn" id="far-close">&times;</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<div class="field-group"><label class="field-label">Nama Lengkap Petani *</label><div class="input-wrapper"><input type="text" id="far-name" placeholder="Contoh: Pak Ketut" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Kode Inisial Petani (Opsional)</label><div class="input-wrapper"><input type="text" id="far-code" placeholder="Contoh: KT01 (Otomatis jika kosong)" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;"></div></div>' +
    '<div class="field-group"><label class="field-label">Nomor Kontak WhatsApp</label><div class="input-wrapper"><input type="text" id="far-phone" placeholder="Contoh: 08123456789" style="padding-left:14px;"></div></div>' +
    '<div class="field-group"><label class="field-label">Wilayah / Alamat Asal</label><div class="input-wrapper"><input type="text" id="far-address" placeholder="Contoh: Baturiti, Tabanan" style="padding-left:14px;"></div></div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button type="button" class="btn btn-secondary" id="far-cancel">Batal</button>' +
    '<button type="button" class="btn btn-primary" id="far-save">Simpan</button>' +
    '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  const close = function () { overlay.remove(); };
  overlay.querySelector('#far-close').onclick = close;
  overlay.querySelector('#far-cancel').onclick = close;
  overlay.querySelector('#far-save').onclick = function () {
    const name = document.getElementById('far-name').value.trim();
    if (!name) { showToast('Nama lengkap petani wajib diisi.', true); return; }
    const code = document.getElementById('far-code').value.trim().toUpperCase();
    const phone = document.getElementById('far-phone').value.trim();
    const address = document.getElementById('far-address').value.trim();

    api('saveFarmer', TOKEN, {
      name: name,
      code: code,
      phone: phone,
      address: address
    }).then(function (res) {
      invalidateCache('farmers');
      const newFarmer = {
        id: res.id,
        name: res.name || name,
        code: res.code || code || cleanFarmerInitialClient(name),
        phone: phone,
        address: address
      };
      if (!Array.isArray(FARMERS_CACHE)) FARMERS_CACHE = [];
      const existingIdx = FARMERS_CACHE.findIndex(function (x) { return x.id === res.id; });
      if (existingIdx >= 0) {
        FARMERS_CACHE[existingIdx] = newFarmer;
      } else {
        FARMERS_CACHE.push(newFarmer);
      }
      renderFarmerOptions(res.id);
      onFarmerSelectedChange(res.id);
      showToast('Petani penangkar berhasil disimpan.');
      close();
    }).catch(function (err) {
      showToast('Gagal: ' + (err.message || err), true);
    });
  };
}

function onFarmerSelectedChange(farmerId) {
  document.querySelectorAll('#pur-items .price-tier-row').forEach(function (row) {
    autoFillPurchaseRowBatch(row, false);
  });
}

function submitPurchase() {
  const supplierId = document.getElementById('pur-supplier').value;
  const farmerEl = document.getElementById('pur-farmer');
  let farmerName = '';
  let farmerId = '';
  if (farmerEl) {
    if (farmerEl.tagName === 'SELECT') {
      farmerId = farmerEl.value;
      const opt = farmerEl.options[farmerEl.selectedIndex];
      if (opt && opt.value) {
        farmerName = opt.dataset.name || opt.text;
      }
    } else {
      farmerName = (farmerEl.value || '').trim();
    }
  }
  const invoiceNo = document.getElementById('pur-invoice').value.trim();
  const todayStr = new Date().toISOString().split('T')[0];

  const rows = Array.from(document.querySelectorAll('#pur-items .price-tier-row'));

  // Validasi pengaman: jika ada baris item dengan kolom .pi-lot masih kosong, jalankan generateClientBatchCode
  rows.forEach(function (row, idx) {
    const lotInput = row.querySelector('.pi-lot');
    if (lotInput && !lotInput.value.trim()) {
      const expVal = row.querySelector('.pi-expiry') ? row.querySelector('.pi-expiry').value : '';
      lotInput.value = generateClientBatchCode(farmerId || farmerName, expVal, idx + 1);
    }
  });

  const items = rows.map(function (row, idx) {
    const prodDateVal = row.querySelector('.pi-prod-date') ? row.querySelector('.pi-prod-date').value : '';
    const lotInput = row.querySelector('.pi-lot');
    let batchNo = lotInput ? lotInput.value.trim() : '';
    if (!batchNo) {
      const expVal = row.querySelector('.pi-expiry') ? row.querySelector('.pi-expiry').value : '';
      batchNo = generateClientBatchCode(farmerId || farmerName, expVal, idx + 1);
    }

    const buyPrice = Number(row.querySelector('.pi-price, .pur-item-buy-price') ? row.querySelector('.pi-price, .pur-item-buy-price').value : 0) || 0;
    const additionalCost = Number(row.querySelector('.pur-item-cost-extra') ? row.querySelector('.pur-item-cost-extra').value : 0) || 0;
    const hppDisplay = row.querySelector('.pur-item-hpp-display');
    let costPerUnit = (hppDisplay && hppDisplay.dataset && hppDisplay.dataset.value !== undefined)
      ? Number(hppDisplay.dataset.value)
      : (buyPrice + additionalCost);
    if (isNaN(costPerUnit) || costPerUnit <= 0) {
      costPerUnit = buyPrice + additionalCost;
    }

    return {
      product_id: row.querySelector('.pi-product').value,
      batch_no: batchNo,
      qty: Number(row.querySelector('.pi-qty').value || 0),
      buy_price: buyPrice,
      additional_cost: additionalCost,
      cost_per_unit: costPerUnit,
      production_date: prodDateVal || todayStr,
      expiry_date: row.querySelector('.pi-expiry').value || ''
    };
  }).filter(function (i) { return i.product_id && i.qty > 0 && i.buy_price > 0; });

  if (items.length === 0) {
    showToast('Minimal 1 item pembelian valid harus terisi (Qty & Harga Beli harus lebih dari 0).', true);
    return;
  }

  const grandTotal = items.reduce(function (sum, item) {
    return sum + (item.qty * item.cost_per_unit);
  }, 0);

  api('createPurchase', TOKEN, {
    supplier_id: supplierId,
    farmer_id: farmerId,
    farmer_name: farmerName,
    invoice_no: invoiceNo,
    total: grandTotal,
    items: items
  }).then(function () {
    invalidateCache('purchases');
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('qc_records');
    showToast('Pembelian berhasil disimpan.');
    closeModal();
    renderPembelian(true);
  }).catch(function (err) {
    showToast('Gagal menyimpan: ' + (err.message || err), true);
  });
}

// ========================= KASIR (POS) =========================
function renderPOS(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  let editBannerHTML = '';
  if (EDITING_TRANSACTION) {
    editBannerHTML =
      '<div style="background:var(--warning-bg);border:1px solid rgba(217,130,43,0.3);color:var(--warning);padding:10px 14px;border-radius:var(--radius-sm);margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">' +
      '<div><strong>🔄 MODE KOREKSI NOTA:</strong> #' + escapeHtml(EDITING_TRANSACTION.id) + ' (' + formatDate(EDITING_TRANSACTION.created_at) + ')</div>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="cancelEditMode()">Batal Koreksi</button>' +
      '</div>';
  }

  content.innerHTML =
    editBannerHTML +
    '<div class="pos-layout">' +
    '<div class="pos-catalog-panel">' +
    '<div class="pos-filter-bar">' +
    '<input type="text" id="pos-search" class="topbar-search" placeholder="Cari produk kemasan..." style="flex:1;">' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransactionHistoryModal()">📜 Riwayat Transaksi</button>' +
    '</div>' +
    '<div class="pos-product-grid" id="pos-product-grid"></div>' +
    '</div>' +
    '<div class="pos-cart-panel">' +
    '<div class="pos-cart-header">' +
    '<strong>' + (EDITING_TRANSACTION ? 'Koreksi Nota' : 'Keranjang Penjualan') + '</strong>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="CART=[];renderCart();">Kosongkan</button>' +
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
    '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;font-weight:600;color:var(--primary);">' +
    '<input type="checkbox" id="pos-save-member-chk" onchange="toggleSaveMemberPhone(this.checked)">' +
    'Simpan ke Database Member CRM' +
    '</label>' +
    '<div id="pos-member-phone-wrap" style="display:none;margin-top:6px;">' +
    '<input type="text" id="pos-customer-phone-input" placeholder="Nomor WhatsApp (misal: 08123456789)" style="width:100%;padding:5px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="pos-cart-items" id="pos-cart-items"></div>' +
    '<div class="pos-cart-summary" id="pos-cart-summary"></div>' +
    '</div>' +
    '</div>';

  populateCustomerDatalist();

  if (SELECTED_CUSTOMER && SELECTED_CUSTOMER.name) {
    const custInput = document.getElementById('pos-customer-input');
    if (custInput) {
      custInput.value = SELECTED_CUSTOMER.name;
      handleCustomerInput(SELECTED_CUSTOMER.name);
    }
  }

  if (!forceRefresh && isCacheValid('products') && DATA_CACHE.products.data && DATA_CACHE.products.data.length > 0) {
    setupPOSData(DATA_CACHE.products.data);
  } else {
    const grid = document.getElementById('pos-product-grid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);"><span class="sync-spinner" style="display:inline-block;width:24px;height:24px;margin-bottom:8px;"></span><br>Memuat katalog produk kasir...</div>';

    api('getPosInitData', TOKEN).then(function (res) {
      DATA_CACHE.products = { data: res.products || [], timestamp: Date.now() };
      DATA_CACHE.customers = { data: res.customers || [], timestamp: Date.now() };
      DATA_CACHE.settings = { data: res.settings || {}, timestamp: Date.now() };
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
      showToast('Gagal memuat produk kasir: ' + (err.message || err), true);
      const grid = document.getElementById('pos-product-grid');
      if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--danger);">Gagal memuat produk.<br><button type="button" class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="renderPOS(true)">Coba Lagi</button></div>';
    });
  }
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

function handleCustomerInput(val) {
  val = (val || '').trim();
  const clearBtn = document.getElementById('pos-customer-clear');
  const matchBadge = document.getElementById('pos-customer-match-badge');
  const newBox = document.getElementById('pos-customer-new-box');

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
    if (matchBadge) {
      matchBadge.style.display = 'block';
      matchBadge.innerHTML = '<span class="badge badge-success" style="font-size:10px;">✓ Terdaftar di CRM: ' + escapeHtml(matched.category || 'Member') + (matched.phone ? ' (' + escapeHtml(matched.phone) + ')' : '') + '</span>';
    }
    if (newBox) newBox.style.display = 'none';
  } else {
    SELECTED_CUSTOMER = { id: '', name: val, phone: '', category: 'Reguler' };
    if (matchBadge) {
      matchBadge.style.display = 'block';
      matchBadge.innerHTML = '<span class="badge badge-neutral" style="font-size:10px;">✍️ Pelanggan Baru (Sekali Transaksi)</span>';
    }
    if (newBox) newBox.style.display = 'block';
  }
}

function clearCustomerInput() {
  const inp = document.getElementById('pos-customer-input');
  if (inp) inp.value = '';
  handleCustomerInput('');
}

function toggleSaveMemberPhone(checked) {
  const wrap = document.getElementById('pos-member-phone-wrap');
  if (wrap) wrap.style.display = checked ? 'block' : 'none';
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

  if (Number(selectedBatch.qty_remaining || 0) < item.qty) {
    showToast('Perhatian: Stok sisa pada batch ' + selectedBatch.id + ' hanya ' + selectedBatch.qty_remaining + ' ' + (p.unit || 'pcs') + '!', true);
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
      showToast('Stok tidak mencukupi.', true);
      return;
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
          return '<option value="' + escapeHtml(b.id) + '"' + isSel + '>' + escapeHtml(b.id) + ' — Exp: ' + expTxt + ' (Sisa ' + b.qty_remaining + ')</option>';
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
}

function openCheckoutModal(total) {
  const custInput = document.getElementById('pos-customer-input');
  const enteredName = custInput ? custInput.value.trim() : (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : '');

  if (!enteredName) {
    showToast('Nama pelanggan wajib diisi sebelum checkout!', true);
    if (custInput) custInput.focus();
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const custName = enteredName;

  const curDate = (EDITING_TRANSACTION && EDITING_TRANSACTION.created_at) ? String(EDITING_TRANSACTION.created_at).split(' ')[0] : todayStr;
  const curSource = (EDITING_TRANSACTION && EDITING_TRANSACTION.source) ? EDITING_TRANSACTION.source : 'Offline';
  const curMethod = (EDITING_TRANSACTION && EDITING_TRANSACTION.payment_method) ? EDITING_TRANSACTION.payment_method : 'Tunai';
  const curType = (EDITING_TRANSACTION && EDITING_TRANSACTION.payment_type) ? EDITING_TRANSACTION.payment_type : 'full';

  const bodyHtml =
    '<div style="text-align:center;padding:8px 0 16px;">' +
    '<div style="font-size:12px;color:var(--text-secondary);">TOTAL TAGIHAN</div>' +
    '<div style="font-size:32px;font-weight:800;color:var(--primary);font-family:\'Plus Jakarta Sans\',sans-serif;">' + formatRupiah(total) + '</div>' +
    '<div style="font-size:13px;color:var(--text-main);margin-top:4px;">Nota Atas Nama: <strong>' + escapeHtml(custName) + '</strong></div>' +
    '</div>' +
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
    '<label class="field-label">Metode Pembayaran</label>' +
    '<div class="input-wrapper">' +
    '<select id="chk-method" style="padding-left:14px;">' +
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
    '<select id="chk-type" onchange="document.getElementById(\'chk-tempo-box\').style.display=this.value===\'installment\'?\'grid\':\'none\'" style="padding-left:14px;">' +
    '<option value="full"' + (curType === 'full' ? ' selected' : '') + '>Lunas Seketika</option>' +
    '<option value="installment"' + (curType === 'installment' ? ' selected' : '') + '>Cicilan / Tempo (Piutang)</option>' +
    '</select>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div id="chk-tempo-box" style="display:' + (curType === 'installment' ? 'grid' : 'none') + ';grid-template-columns:1fr 1fr;gap:12px;padding:12px;background:var(--surface-muted);border-radius:var(--radius-sm);margin-bottom:12px;">' +
    '<div>' +
    '<label class="field-label">Uang Muka (DP)</label>' +
    '<div class="input-wrapper"><input type="number" id="chk-dp" placeholder="0" style="padding-left:14px;"></div>' +
    '</div>' +
    '<div>' +
    '<label class="field-label">Jatuh Tempo Tagihan</label>' +
    '<div class="input-wrapper"><input type="date" id="chk-due" style="padding-left:14px;"></div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal()">Batal</button>' +
    '<button type="button" class="btn btn-primary" onclick="submitCheckout()">' + (EDITING_TRANSACTION ? 'Simpan Revisi Nota' : 'Selesaikan Transaksi') + '</button>';

  openModal('Checkout Pembayaran', bodyHtml, footerHtml);
}

function submitCheckout() {
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
  const taxRate = Number(APP_SETTINGS['tax_rate'] || 0) / 100;

  const saveMemberChk = document.getElementById('pos-save-member-chk');
  const isSaveMember = saveMemberChk ? saveMemberChk.checked : false;
  const phoneInput = document.getElementById('pos-customer-phone-input');
  const phoneVal = phoneInput ? phoneInput.value.trim() : (SELECTED_CUSTOMER ? (SELECTED_CUSTOMER.phone || '') : '');

  if (type === 'installment' && !phoneVal && (!SELECTED_CUSTOMER || !SELECTED_CUSTOMER.phone)) {
    showToast('Transaksi cicilan / piutang tempo wajib memiliki nomor kontak pelanggan!', true);
    return;
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
            showToast('Gagal: Batch "' + targetB.id + '" pada produk benih "' + prod.name + '" belum lolos Quality Control (Status: ' + targetB.qc_status + ').', true);
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

  const payload = {
    items: CART.map(function (c) {
      return {
        product_id: c.product_id,
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
    taxRate: taxRate
  };

  if (type === 'installment') {
    payload.downPayment = Number(document.getElementById('chk-dp').value || 0);
    payload.due_date = document.getElementById('chk-due').value;
  }

  showToast('Memproses transaksi FIFO/FEFO...');
  const apiCall = EDITING_TRANSACTION
    ? api('updateTransaction', TOKEN, EDITING_TRANSACTION.id, payload)
    : api('createTransaction', TOKEN, payload);

  apiCall.then(function (res) {
    invalidateCache('products');
    invalidateCache('dashboard');
    invalidateCache('receivables');
    invalidateCache('recentInvoices');
    if (isSaveMember) invalidateCache('customers');

    window._lastTxReceipt = {
      id: res.id,
      name: enteredName,
      phone: phoneVal,
      total: res.total,
      subtotal: res.subtotal || 0,
      tax: res.tax || 0,
      method: method,
      date: res.date || formatDate(new Date()),
      items: CART.map(function (c) {
        return {
          name: c.name,
          qty: c.qty,
          price: c.price,
          selected_expiry: c.selected_expiry,
          selected_batch_id: c.selected_batch_id
        };
      })
    };

    closeModal();
    openTxSuccessModal(res, payload);
    EDITING_TRANSACTION = null;
    CART = [];
    updateGlobalReceivableBadge();
  }).catch(function (err) {
    showToast('Gagal memproses transaksi: ' + (err.message || err), true);
  });
}

function openTxSuccessModal(res, payload) {
  const custName = payload.customer_name || (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.name : 'Umum');
  const custPhone = payload.customer_phone || (SELECTED_CUSTOMER ? SELECTED_CUSTOMER.phone : '');

  const bodyHtml =
    '<div style="text-align:center;padding:20px 0;">' +
    '<div style="font-size:48px;margin-bottom:12px;">✅</div>' +
    '<h2 style="margin-bottom:6px;">Transaksi Berhasil!</h2>' +
    '<p style="color:var(--text-secondary);font-size:13px;">Nota <strong>#' + res.id + '</strong> tercatat rapi dalam database.</p>' +
    '<div style="background:var(--surface-muted);padding:14px;border-radius:var(--radius-sm);text-align:left;margin-top:16px;font-size:13px;">' +
    '<div>Total Pembayaran: <strong style="color:var(--primary);">' + formatRupiah(res.total) + '</strong></div>' +
    '<div>Nota Atas Nama: <strong>' + escapeHtml(custName) + '</strong></div>' +
    '<div>Metode Bayar: <strong>' + escapeHtml(payload.payment_method) + '</strong></div>' +
    '</div>' +
    '</div>';

  const footerHtml =
    '<button type="button" class="btn btn-secondary" onclick="closeModal();renderPOS(true);">Transaksi Baru</button>' +
    '<button type="button" class="btn btn-secondary" onclick="printMiniReceipt(window._lastTxReceipt)">🖨️ Cetak Struk (PDF)</button>' +
    '<button type="button" class="btn btn-primary" onclick="sendReceiptToWhatsApp(\'' + res.id + '\', \'' + custName + '\', \'' + custPhone + '\', ' + res.total + ', \'' + payload.payment_method + '\')">💬 Kirim WA</button>';

  openModal('Transaksi Selesai', bodyHtml, footerHtml);
}

// ========================= CETAK & STRUK NOTA =========================
function generateMiniReceiptHTML(data) {
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'KIOS IDEP POS';
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

  const subtotal = data.subtotal !== undefined ? data.subtotal : data.total;
  const tax = Number(data.tax || 0);

  // Logo di tengah proporsional, hilangkan teks nama toko karena gambar logo sudah memuat teks "Kios IDEP"
  let headerLogoHtml = '';
  if (storeLogo) {
    headerLogoHtml = '<div style="text-align:center;margin-bottom:6px;">' +
      '<img src="' + escapeHtml(storeLogo) + '" style="max-width:140px;max-height:55px;object-fit:contain;margin:0 auto;display:block;" alt="Kios IDEP">' +
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
    '<div style="display:flex;justify-content:space-between;"><span>No. Nota:</span><span style="font-weight:bold;">#' + escapeHtml(data.id || '-') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Tanggal:</span><span>' + (data.date || formatDate(new Date())) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Pelanggan:</span><span>' + escapeHtml(data.name || 'Umum') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Metode:</span><span>' + escapeHtml(data.method || 'Tunai') + '</span></div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
    itemRows +
    '</table>' +
    '<div style="border-top:1px dashed #222;padding-top:6px;font-size:11px;">' +
    (tax > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Subtotal:</span><span>' + formatRupiah(subtotal) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Pajak:</span><span>' + formatRupiah(tax) + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:4px;"><span>TOTAL:</span><span>' + formatRupiah(data.total) + '</span></div>' +
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
    '<title>Struk-' + (receiptData.id || 'POS') + '</title>' +
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
    name: invoiceData.customer ? invoiceData.customer.name : tx.customer_name,
    total: tx.total,
    subtotal: tx.subtotal,
    tax: tx.tax,
    method: tx.payment_method,
    date: formatDate(tx.created_at),
    status: tx.status,
    is_void: isVoid,
    items: items
  };

  printMiniReceipt(receiptData);
}

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
    ? '<img src="' + escapeHtml(logoPrimary) + '" class="letterhead-logo" style="max-height:55px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px;" alt="Logo Kios IDEP">'
    : '<div style="font-size:18pt;font-weight:800;color:#1E4D3F;letter-spacing:0.5px;margin-bottom:4px;">' + escapeHtml(s.store_name || 'KIOS IDEP') + '</div>';

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

  printWindow.document.write(
    '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<title>Faktur-' + escapeHtml(tx.id) + '</title>' +
    '<style>' +
    '@page { size: A4 portrait; margin: 12mm 15mm; }' +
    'body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-size: 10pt; color: #1F2937; margin: 0; padding: 0; position: relative; line-height: 1.4; }' +
    'table { width: 100%; border-collapse: collapse; }' +
    'th { background: #1E4D3F; color: #ffffff; padding: 9px 10px; font-weight: 700; text-align: left; border: 1px solid #1E4D3F; font-size: 9.5pt; }' +
    'td { border: 1px solid #D1D5DB; }' +
    '.invoice-void-watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 55px; font-weight: 900; color: rgba(220,38,38,0.22); border: 6px dashed rgba(220,38,38,0.35); padding: 14px 36px; border-radius: 16px; letter-spacing: 4px; pointer-events: none; text-align: center; }' +
    'tr { page-break-inside: avoid; }' +
    '</style>' +
    '</head><body>' +
    watermarkHtml +
    '<div class="invoice-header letterhead" style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid #1E4D3F;margin-bottom:14px;">' +
    '<div style="max-width:58%;">' +
    logoHtml +
    '<div style="font-size:9.5pt;color:#4B5563;line-height:1.45;margin-top:4px;">' +
    '<div>' + escapeHtml(s.store_address || 'Br. Medahan, Kemenuh, Sukawati, Gianyar, Bali 80582') + '</div>' +
    '<div>Kontak / WA: ' + escapeHtml(s.store_phone || '-') + (s.store_email ? ' &bull; Email: ' + escapeHtml(s.store_email) : '') + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;min-width:220px;">' +
    '<div style="font-size:20pt;font-weight:800;color:#1E4D3F;letter-spacing:1px;line-height:1.1;">FAKTUR PENJUALAN</div>' +
    '<table style="margin-top:6px;margin-left:auto;border-collapse:collapse;font-size:9.5pt;width:auto;">' +
    '<tr><td style="padding:1.5px 6px;text-align:right;color:#4B5563;border:none;">No. Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;font-family:monospace;color:#1E4D3F;border:none;">#' + escapeHtml(tx.id) + '</td></tr>' +
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
    '<tr><td colspan="4" style="text-align:right;padding:8px 12px;font-weight:600;">Subtotal:</td><td style="text-align:right;padding:8px 12px;font-weight:600;">' + formatRupiah(tx.subtotal) + '</td></tr>' +
    (Number(tx.tax) > 0 ? '<tr><td colspan="4" style="text-align:right;padding:6px 12px;font-weight:600;">Pajak:</td><td style="text-align:right;padding:6px 12px;font-weight:600;">' + formatRupiah(tx.tax) + '</td></tr>' : '') +
    '<tr style="font-size:15px;font-weight:800;background:#F3F4F6;"><td colspan="4" style="text-align:right;padding:10px 12px;">TOTAL PEMBAYARAN:</td><td style="text-align:right;padding:10px 12px;color:#1E4D3F;">' + formatRupiah(tx.total) + '</td></tr>' +
    '</tfoot>' +
    '</table>' +

    '<div style="display:flex;justify-content:space-between;gap:40px;margin-top:40px;padding-top:20px;text-align:center;">' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#4B5563;">Tanda Terima Pelanggan,</div>' +
    '<div style="height:60px;"></div>' +
    '<div style="font-weight:700;color:#111827;border-bottom:1px solid #111827;padding-bottom:2px;">( ' + escapeHtml(c.name || tx.customer_name || '___________________') + ' )</div>' +
    '</div>' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#4B5563;">Hormat Kami,</div>' +
    '<div style="height:60px;"></div>' +
    '<div style="font-weight:700;color:#111827;border-bottom:1px solid #111827;padding-bottom:2px;">( ' + escapeHtml(s.store_name || 'Kios IDEP') + ' )</div>' +
    '</div>' +
    '</div>' +

    '<div style="text-align:center;font-size:11px;color:#6B7280;margin-top:30px;border-top:1px dashed #D1D5DB;padding-top:8px;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih telah melestarikan benih lokal bersama Kios IDEP. Salam Lestari!') +
    '</div>' +

    '<script>window.onload = function() { window.print(); };<\/script>' +
    '</body></html>'
  );
  printWindow.document.close();
}

function sendReceiptToWhatsApp(txId, name, phone, total, method) {
  let data = window._curInv;
  if (typeof txId === 'object' && txId !== null) {
    data = txId;
    txId = (data.transaction && data.transaction.id) ? data.transaction.id : '';
    name = (data.customer ? data.customer.name : (data.transaction ? data.transaction.customer_name : '')) || '';
    phone = (data.customer ? data.customer.phone : '') || '';
    total = data.transaction ? data.transaction.total : 0;
    method = data.transaction ? data.transaction.payment_method : 'Tunai';
  }

  const tx = (data && data.transaction) ? data.transaction : { id: txId, total: total, payment_method: method, customer_name: name, status: 'paid' };
  const items = (data && data.items) || [];
  const custName = name || (data && data.customer ? data.customer.name : tx.customer_name) || 'Kak/Bli';
  const custPhone = phone || (data && data.customer ? data.customer.phone : '') || '';

  if (!custPhone) {
    showPromptDialog('Kirim Struk via WhatsApp', 'Masukkan nomor WhatsApp pelanggan (misal: 08123456789):', '', function (val) {
      sendReceiptToWhatsApp(txId, custName, val, total, method);
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
  const statusLabel = tx.status === 'paid' ? 'LUNAS' : (tx.status === 'VOID' ? 'DIBATALKAN (VOID)' : 'TEMPO / CICILAN');

  let itemLines = '';
  if (items.length > 0) {
    itemLines = items.map(function (it) {
      const batchTag = it.batch_id ? (' (' + it.batch_id + ')') : '';
      return it.qty + 'x ' + it.product_name + batchTag + ' = ' + formatRupiah(it.subtotal);
    }).join('\n');
  } else {
    itemLines = '1x Pembelian Produk = ' + formatRupiah(tx.total);
  }

  let text = '*Faktur Pembelian - Kios IDEP*\n';
  text += 'No: #' + tx.id + '\n';
  text += 'Tgl: ' + dateStr + '\n';
  text += 'Pelanggan: ' + custName + '\n';
  text += '--------------------------------\n';
  text += itemLines + '\n';
  text += '--------------------------------\n';
  text += 'Total: *' + formatRupiah(tx.total) + '* (' + (tx.payment_method || 'Tunai') + ')\n';
  text += 'Status: ' + statusLabel + '\n\n';
  text += 'Terima kasih telah berbelanja benih lokal di Kios IDEP. Salam lestari! 🙏';

  const url = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
  showToast('Membuka WhatsApp untuk mengirim struk #' + tx.id);
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
  EDITING_TRANSACTION = null;
  CART = [];
  SELECTED_CUSTOMER = null;
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

    const bodyHtml =
      voidBannerHtml +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;background:var(--surface-muted);padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;font-size:12px;">' +
      '<div>' +
      '<div>No. Nota: <strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:14px;">#' + escapeHtml(tx.id) + '</strong></div>' +
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
      '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Subtotal:</span><span>' + formatRupiah(tx.subtotal) + '</span></div>' +
      (Number(tx.tax) > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Pajak:</span><span>' + formatRupiah(tx.tax) + '</span></div>' : '') +
      '<div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:var(--primary);border-top:1px dashed var(--border);padding-top:6px;">' +
      '<span>Total Pembayaran:</span><span>' + formatRupiah(tx.total) + '</span>' +
      '</div>' +
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
      '<button type="button" class="btn btn-tx-wa btn-sm" onclick="sendReceiptToWhatsApp(\'' + tx.id + '\', \'' + escapeHtml(cust.name) + '\', \'' + escapeHtml(cust.phone || '') + '\', ' + tx.total + ', \'' + escapeHtml(tx.payment_method) + '\')">📲 Kirim WA</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">' +
      voidBtnHtml +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">✕ Tutup</button>' +
      '</div>' +
      '</div>';

    openModal('Rincian Transaksi #' + tx.id, bodyHtml, footerHtml, true);
  }).catch(function (err) {
    showToast('Gagal memuat rincian: ' + (err.message || err), true);
  });
}

// ==========================================================================
// MODUL PRATINJAU DOKUMEN & SINKRONISASI CETAK MULTI-FORMAT (KASIR, MINIMALIS, A4)
// ==========================================================================
let CURRENT_INVOICE_VIEW_MODE = 'formal'; // 'thermal' | 'minimalist' | 'formal'

function angkaTerbilang(angka) {
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

  const subtotal = tx.subtotal !== undefined ? tx.subtotal : tx.total;
  const tax = Number(tx.tax || 0);

  let headerLogoHtml = '';
  if (logoPrimary) {
    headerLogoHtml = '<div style="text-align:center;margin-bottom:6px;">' +
      '<img src="' + escapeHtml(logoPrimary) + '" style="max-width:130px;max-height:50px;object-fit:contain;margin:0 auto;display:block;" alt="Logo Kios IDEP">' +
      '</div>';
  } else {
    headerLogoHtml = '<div style="font-size:15px;font-weight:800;letter-spacing:0.5px;text-align:center;margin-bottom:4px;">' + escapeHtml((s.store_name || 'KIOS IDEP').toUpperCase()) + '</div>';
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
    '<div style="display:flex;justify-content:space-between;"><span>No. Nota:</span><span style="font-weight:bold;">#' + escapeHtml(tx.id || '-') + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Tanggal:</span><span>' + formatDate(tx.created_at) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Pelanggan:</span><span>' + escapeHtml((c && c.name) ? c.name : (tx.customer_name || 'Umum')) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;"><span>Metode:</span><span>' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + (isVoid ? 'VOID' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO')) + ')</span></div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">' +
    receiptItemRows +
    '</table>' +
    '<div style="border-top:1px dashed #222;padding-top:6px;font-size:11px;">' +
    (tax > 0 ? '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Subtotal:</span><span>' + formatRupiah(subtotal) + '</span></div>' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>Pajak:</span><span>' + formatRupiah(tax) + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;margin-top:4px;"><span>TOTAL:</span><span>' + formatRupiah(tx.total) + '</span></div>' +
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
    logoHeaderHtml = '<img src="' + escapeHtml(logoPrimary) + '" style="max-height:44px;max-width:180px;object-fit:contain;display:block;margin-bottom:4px;" alt="Logo Kios IDEP">';
  } else {
    logoHeaderHtml = '<div style="font-size:18px;font-weight:800;color:#1E4D3F;letter-spacing:0.5px;">' + escapeHtml(s.store_name || 'KIOS IDEP') + '</div>';
  }

  const statusColor = isVoid ? '#DC2626' : (tx.status === 'paid' ? '#16A34A' : '#D97706');
  const statusLabel = isVoid ? 'VOID' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO');

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
    '<div style="font-size:18px;font-weight:800;letter-spacing:0.5px;color:#1E4D3F;">FAKTUR PENJUALAN</div>' +
    '<div style="font-size:12px;font-family:monospace;font-weight:700;color:#334155;margin-top:2px;">#' + escapeHtml(tx.id) + '</div>' +
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
    '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#64748B;"><span>Subtotal:</span><span>' + formatRupiah(tx.subtotal !== undefined ? tx.subtotal : tx.total) + '</span></div>' +
    (Number(tx.tax) > 0 ? '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;color:#64748B;"><span>Pajak:</span><span>' + formatRupiah(tx.tax) + '</span></div>' : '') +
    '<div style="display:flex;justify-content:space-between;padding:8px 0 4px 0;border-top:2px solid #E2E8F0;margin-top:4px;font-size:15px;font-weight:800;color:#1E4D3F;">' +
    '<span>Total:</span><span>' + formatRupiah(tx.total) + '</span>' +
    '</div>' +
    (rec && !isVoid ? '<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:12px;color:#DC2626;font-weight:700;"><span>Sisa Piutang:</span><span>' + formatRupiah(rec.remaining) + '</span></div>' : '') +
    '</div>' +
    '</div>' +
    '<div style="margin-top:28px;padding-top:12px;border-top:1px dashed #CBD5E1;font-size:11px;color:#64748B;text-align:center;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih telah berbelanja di Kios IDEP. Salam Lestari!') +
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
    const expInfo = (i.expiry_date ? ('<br><span style="font-size:10px;color:#6B5749;">Exp: ' + formatDate(i.expiry_date) + '</span>') : '') +
      (i.batch_id ? ('<br><span style="font-size:10px;color:#6B5749;font-family:monospace;">[Batch: ' + escapeHtml(i.batch_id) + ']</span>') : '');
    return '<tr style="border-bottom:1px solid #E8E0C9;">' +
      '<td style="padding:8px 6px;border:1px solid #E8E0C9;text-align:center;vertical-align:top;font-size:11.5px;">' + (idx + 1) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #E8E0C9;vertical-align:top;font-size:12px;"><strong>' + escapeHtml(i.product_name) + '</strong>' + expInfo + '</td>' +
      '<td style="padding:8px 8px;border:1px solid #E8E0C9;text-align:center;vertical-align:top;font-size:12px;">' + i.qty + ' sachet</td>' +
      '<td style="padding:8px 10px;border:1px solid #E8E0C9;text-align:right;vertical-align:top;font-size:12px;">' + formatRupiah(i.price) + '</td>' +
      '<td style="padding:8px 10px;border:1px solid #E8E0C9;text-align:right;font-weight:700;vertical-align:top;font-size:12px;">' + formatRupiah(i.subtotal) + '</td>' +
      '</tr>';
  }).join('');

  const logoImgHTMLFormal = logoLight
    ? '<img src="' + escapeHtml(logoLight) + '" style="max-height:50px;max-width:200px;object-fit:contain;display:block;margin-bottom:6px;" alt="Logo Kios IDEP">'
    : '<div style="font-size:18px;font-weight:800;letter-spacing:0.5px;color:#ffffff;margin-bottom:4px;">' + escapeHtml(s.store_name || 'KIOS IDEP') + '</div>';

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

  return '<div id="view-formal" class="paper-canvas formal-mode ' + (isActive ? 'active-doc' : '') + '">' +
    watermarkHtml +
    '<div class="letterhead" style="background:#7A5031 !important;color:#ffffff !important;margin:-15mm -20mm 18px -20mm;padding:16mm 20mm 14mm 20mm;display:flex;justify-content:space-between;align-items:flex-start;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="max-width:58%;">' +
    logoImgHTMLFormal +
    '<div style="font-size:9.5pt;opacity:0.95;margin-top:4px;line-height:1.4;">' +
    '<div>' + escapeHtml(s.store_address || 'Br. Medahan, Kemenuh, Sukawati, Gianyar, Bali 80582') + '</div>' +
    '<div>' + (s.store_phone ? 'Kontak/WA: ' + escapeHtml(s.store_phone) : '') + (s.store_email ? ' &bull; Email: ' + escapeHtml(s.store_email) : '') + '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:right;min-width:210px;">' +
    '<div style="font-size:22px;font-weight:800;letter-spacing:1px;font-family:\'General Sans\',sans-serif;line-height:1.1;">FAKTUR PENJUALAN</div>' +
    '<table style="margin-top:6px;margin-left:auto;border-collapse:collapse;font-size:9pt;color:#ffffff;width:auto;">' +
    '<tr><td style="padding:1.5px 6px;text-align:right;opacity:0.9;border:none;">No. Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;font-family:monospace;border:none;">#' + escapeHtml(tx.id) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;opacity:0.9;border:none;">Tanggal Faktur:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;border:none;">' + formatDate(tx.created_at) + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;opacity:0.9;border:none;">Jatuh Tempo:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:600;border:none;">' + dueDateStr + '</td></tr>' +
    '<tr><td style="padding:1.5px 6px;text-align:right;opacity:0.9;border:none;">Status:</td><td style="padding:1.5px 0 1.5px 6px;text-align:right;font-weight:700;border:none;">' + (isVoid ? 'DIBATALKAN (VOID)' : (tx.status === 'paid' ? 'LUNAS' : 'TEMPO')) + '</td></tr>' +
    '</table>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;background:#FAF7E8 !important;padding:12px 16px;border-radius:4px;border:1px solid #E8E0C9;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="flex:1;">' +
    '<div style="font-size:10px;font-weight:700;color:#6B5749;text-transform:uppercase;letter-spacing:0.5px;">DITAGIHKAN KEPADA:</div>' +
    '<div style="font-size:14px;font-weight:700;color:#362417;margin-top:2px;">' + escapeHtml(c ? c.name : (tx.customer_name || 'Umum')) + '</div>' +
    (c && c.phone ? '<div style="font-size:11.5px;color:#6B5749;margin-top:1px;">WA/Telp: ' + escapeHtml(c.phone) + '</div>' : '') +
    (c && c.address ? '<div style="font-size:11px;color:#6B5749;margin-top:1px;">Alamat: ' + escapeHtml(c.address) + '</div>' : '') +
    '</div>' +
    '<div style="text-align:right;flex:1;">' +
    '<div style="font-size:10px;font-weight:700;color:#6B5749;text-transform:uppercase;letter-spacing:0.5px;">METODE &amp; KANAL:</div>' +
    '<div style="font-weight:700;color:#362417;margin-top:2px;">' + escapeHtml(tx.payment_method || 'Tunai') + ' (' + escapeHtml(tx.source || 'Offline') + ')</div>' +
    '<div style="font-size:12px;font-weight:600;margin-top:1px;color:' + (isVoid ? '#DC2626' : (tx.status === 'paid' ? '#2E7D32' : '#D97706')) + ';">' + (isVoid ? 'Status: DIBATALKAN (VOID)' : (tx.status === 'paid' ? 'Status: LUNAS' : 'Status: CICILAN / TEMPO')) + '</div>' +
    '</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;border:1px solid #E8E0C9;">' +
    '<thead>' +
    '<tr style="background:#7A5031 !important;color:#ffffff !important;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<th style="padding:9px 6px;text-align:center;border:1px solid #7A5031;width:35px;">No</th>' +
    '<th style="padding:9px 10px;text-align:left;border:1px solid #7A5031;">Item Benih &amp; Batch</th>' +
    '<th style="padding:9px 8px;text-align:center;border:1px solid #7A5031;width:80px;">Kuantitas</th>' +
    '<th style="padding:9px 10px;text-align:right;border:1px solid #7A5031;width:120px;">Harga Satuan</th>' +
    '<th style="padding:9px 10px;text-align:right;border:1px solid #7A5031;width:130px;">Subtotal</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>' + rowsFormal + '</tbody>' +
    '<tfoot>' +
    '<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#6B5749;font-weight:500;border:1px solid #E8E0C9;">Subtotal:</td><td style="text-align:right;padding:6px 12px;font-weight:600;border:1px solid #E8E0C9;">' + formatRupiah(tx.subtotal !== undefined ? tx.subtotal : tx.total) + '</td></tr>' +
    (Number(tx.tax) > 0 ? '<tr><td colspan="4" style="text-align:right;padding:4px 12px;color:#6B5749;font-weight:500;border:1px solid #E8E0C9;">Pajak:</td><td style="text-align:right;padding:4px 12px;font-weight:600;border:1px solid #E8E0C9;">' + formatRupiah(tx.tax) + '</td></tr>' : '') +
    '<tr style="font-size:15px;font-weight:800;color:#7A5031;background:#FAF7E8 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;"><td colspan="4" style="text-align:right;padding:8px 12px;border:1px solid #E8E0C9;">TOTAL FAKTUR:</td><td style="text-align:right;padding:8px 12px;border:1px solid #E8E0C9;">' + formatRupiah(tx.total) + '</td></tr>' +
    (rec && !isVoid ? '<tr style="color:#B91C1C;font-weight:700;"><td colspan="4" style="text-align:right;padding:6px 12px;border:1px solid #E8E0C9;">Sisa Piutang:</td><td style="text-align:right;padding:6px 12px;border:1px solid #E8E0C9;">' + formatRupiah(rec.remaining) + '</td></tr>' : '') +
    '</tfoot>' +
    '</table>' +
    '<div style="margin-top:10px;padding:9px 12px;background:#FAF7E8;border:1px dashed #7A5031;border-radius:4px;font-size:11.5px;color:#362417;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<strong>Terbilang:</strong> <em style="font-weight:700;color:#7A5031;"># ' + terbilangText + ' #</em>' +
    '</div>' +
    '<div style="margin-top:12px;padding:10px 14px;background:#FAF7E8;border:1px solid #E8E0C9;border-radius:4px;font-size:11px;color:#362417;display:flex;align-items:center;gap:12px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">' +
    '<div style="font-size:24px;line-height:1;">🏦</div>' +
    '<div style="line-height:1.4;">' +
    '<div style="font-weight:700;color:#7A5031;font-size:11.5px;">INFORMASI PEMBAYARAN TRANSFER BANK RESMI:</div>' +
    '<div>Bank: <strong>BNI (Bank Negara Indonesia)</strong> &bull; No. Rekening: <strong style="font-family:monospace;font-size:12px;letter-spacing:0.5px;">0178 849 203</strong></div>' +
    '<div>Atas Nama: <strong>Yayasan IDEP Selaras Alam</strong> &bull; <span style="font-size:10px;color:#6B5749;">Mohon cantumkan No. Faktur pada berita transfer</span></div>' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;gap:30px;margin-top:24px;padding-top:10px;font-size:11.5px;text-align:center;">' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#6B5749;">Tanda Terima Pelanggan / Penerima,</div>' +
    '<div style="height:50px;"></div>' +
    '<div style="font-weight:700;color:#362417;border-bottom:1px solid #362417;display:inline-block;min-width:160px;padding-bottom:2px;">( ' + escapeHtml(c ? c.name : (tx.customer_name || '_____________________')) + ' )</div>' +
    '<div style="font-size:10px;color:#6B5749;margin-top:2px;">Nama Terang &amp; Cap</div>' +
    '</div>' +
    '<div style="width:200px;">' +
    '<div style="font-weight:600;color:#6B5749;">Hormat Kami,</div>' +
    '<div style="font-weight:700;color:#7A5031;margin-top:1px;">Kios IDEP Selaras Alam</div>' +
    '<div style="height:36px;"></div>' +
    '<div style="font-weight:700;color:#362417;border-bottom:1px solid #362417;display:inline-block;min-width:160px;padding-bottom:2px;">( Bagian Keuangan / Kasir )</div>' +
    '<div style="font-size:10px;color:#6B5749;margin-top:2px;">Petugas Kios IDEP</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:center;color:#6B5749;font-size:10.5px;margin-top:20px;border-top:1px dashed #E8E0C9;padding-top:8px;">' +
    escapeHtml(s.invoice_footer || 'Terima kasih telah melestarikan benih lokal bersama Kios IDEP. Salam Lestari!') +
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
    '<button type="button" class="btn btn-primary btn-sm" onclick="printActiveInvoice()" style="font-weight:700;"><span style="font-size:13px;">🖨️</span> Cetak / Simpan PDF</button>' +
    '<button type="button" class="btn btn-secondary btn-sm btn-tx-wa" onclick="sendReceiptToWhatsApp(window._curInv)" style="background:#25D366;color:#FFFFFF;border-color:#25D366;font-weight:600;">📲 Kirim WA</button>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="closeModal()">✕ Tutup</button>' +
    '</div>' +
    '</div>';
}

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

// ========================= MANAJEMEN TOKO CABANG / OUTLET MITRA TERPADU =========================
function renderKonsinyasi(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('outlets')) {
    drawKonsinyasiUI(DATA_CACHE.outlets.data);
    return;
  }

  if (!DATA_CACHE.outlets || !DATA_CACHE.outlets.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">Memuat data Toko Cabang & Outlet Mitra...</div></div>';
  }

  api('getOutlets', TOKEN).then(function (outlets) {
    const list = Array.isArray(outlets) ? outlets : [];
    if (!DATA_CACHE.outlets) DATA_CACHE.outlets = { data: null, timestamp: 0 };
    DATA_CACHE.outlets = { data: list, timestamp: Date.now() };
    drawKonsinyasiUI(list);
  }).catch(function (err) {
    showToast('Gagal memuat outlet mitra: ' + (err.message || err), true);
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
    '<button type="button" class="btn btn-primary" onclick="openOutletModal()">+ Tambah Outlet Mitra</button>' +
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
        (o.status === 'inactive' ? '<span class="badge badge-neutral" style="font-size:9px;">Nonaktif</span>' : '') +
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
        '<button type="button" class="btn btn-secondary btn-sm" onclick="openOutletModal(\'' + o.id + '\')" title="Edit Profil Outlet">✏️</button>' +
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
    '<option value="active"' + (!existing || existing.status !== 'inactive' ? ' selected' : '') + '>Aktif (Bisa Terima Drop Stok)</option>' +
    '<option value="inactive"' + (existing && existing.status === 'inactive' ? ' selected' : '') + '>Nonaktif</option>' +
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
          '<div style="font-size:10px;color:var(--text-secondary);">' + escapeHtml(t.recipient_role || 'Penerima') + (t.received_at ? (' &bull; ' + formatDate(t.received_at)) : '') + '</div>') :
        '<span style="color:var(--text-muted);font-size:11px;">Menunggu Serah Terima</span>';

      const actionSignBtn = !isDelivered ?
        ('<button type="button" class="btn btn-primary btn-sm" onclick="openDeliveryReceiptModal(\'' + t.id + '\', \'' + o.id + '\')" style="margin-right:4px;">✍️ Serah Terima / Tanda Tangan</button>') :
        ('<button type="button" class="btn btn-secondary btn-sm" onclick="viewDeliveryReceiptModal(\'' + t.id + '\', \'' + o.id + '\')" style="margin-right:4px;">👁️ Bukti Serah Terima</button>');

      const printSjBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="margin-right:4px;" title="Cetak Surat Jalan A4 Langsung">🖨️ Cetak SJ</button>';
      const pdfBtn = t.pdf_url ?
        '<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 PDF</a>' :
        '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransferSuratJalan(\'' + t.id + '\')">📄 PDF</button>';

      return '<tr>' +
        '<td>' + formatDate(t.sent_at) + '</td>' +
        '<td><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);">' + escapeHtml(t.invoice_no || t.id) + '</strong></td>' +
        '<td style="text-align:center;"><strong style="font-size:13px;">' + (t.total_pcs || 0) + '</strong> pcs</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + recipientInfo + '</td>' +
        '<td style="text-align:right;white-space:nowrap;">' + actionSignBtn + printSjBtn + pdfBtn + '</td>' +
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
      const pdfBtn = a.pdf_url ?
        '<a href="' + escapeHtml(a.pdf_url) + '" target="_blank" class="btn btn-primary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 Buka PDF</a>' :
        '<span class="badge badge-neutral">PDF di Drive</span>';

      const photoThumb = a.display_photo_url ?
        '<a href="' + escapeHtml(a.display_photo_url) + '" target="_blank" title="Buka Foto Display Rak">' +
        '<img src="' + escapeHtml(a.display_photo_url) + '" class="audit-hist-thumb" alt="Display" />' +
        '</a>' :
        '<div class="audit-hist-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>';

      const missingWaLine = Number(a.total_missing || 0) > 0 ?
        ('• Barang Hilang/Selisih: ' + a.total_missing + ' pcs (Ditagihkan ke Mitra: ' + (a.total_chargeable_missing || 0) + ' pcs, Beban IDEP: ' + (a.total_writeoff_missing || 0) + ' pcs)\n') : '';

      const waText = encodeURIComponent(
        'Halo Bapak/Ibu ' + (a.outlet_pic || o.pic_name || '') + ' (' + (o.name || 'Toko Mitra') + '),\n\n' +
        'Berikut terlampir dokumen resmi *Berita Acara Stok Opname Konsinyasi Kios IDEP*:\n' +
        '• No. Dokumen: #' + a.id + '\n' +
        '• Tanggal Opname: ' + formatDate(a.audit_date) + '\n' +
        '• Petugas IDEP: ' + a.auditor_name + '\n' +
        '• Terjual: ' + (a.total_sold || 0) + ' pcs\n' +
        '• Retur Rusak/Exp: ' + (a.total_returned || 0) + ' pcs\n' +
        missingWaLine +
        '• Restock Baru di Tempat: ' + (a.total_restock || 0) + ' pcs\n' +
        (a.notes ? ('• Catatan: ' + a.notes + '\n') : '') +
        (a.pdf_url ? ('\nDokumen PDF Berita Acara dapat diunduh pada tautan Google Drive:\n' + a.pdf_url + '\n\n') : '\n') +
        'Terima kasih atas kerja samanya.\n*Kios IDEP — POS & Pusat Benih*'
      );
      const waBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="openConsignmentAuditWAModal(\'' + escapeHtml(a.outlet_pic || o.pic_name) + '\',\'' + waText + '\')">💬 Kirim WA</button>';

      let invoiceActionHtml = '';
      const billableCount = Number(a.total_sold || 0) + Number(a.total_chargeable_missing || 0);
      if (a.invoice_id) {
        invoiceActionHtml = '<span class="badge badge-success" style="font-size:10px;">🧾 Faktur: #' + escapeHtml(a.invoice_id) + '</span>';
      } else if (billableCount > 0) {
        invoiceActionHtml = '<button type="button" class="btn btn-primary btn-sm" onclick="openConsignmentInvoiceModal(\'' + a.id + '\',\'' + escapeHtml(o.name || '') + '\',\'' + escapeHtml(o.phone || '') + '\',\'' + o.id + '\')">🧾 Buat Faktur (' + billableCount + ' pcs)</button>';
      }

      const missingCardInfo = Number(a.total_missing || 0) > 0 ?
        (' &bull; Hilang/Selisih: <strong style="color:#dc2626;">' + a.total_missing + ' pcs</strong> (' + (a.total_chargeable_missing || 0) + ' tagih mitra, ' + (a.total_writeoff_missing || 0) + ' beban IDEP)') : '';

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
        'Terjual: <strong style="color:var(--success);">' + (a.total_sold || 0) + ' pcs</strong> &bull; ' +
        'Retur: <strong style="color:var(--warning);">' + (a.total_returned || 0) + ' pcs</strong>' +
        missingCardInfo + ' &bull; ' +
        'Restock: <strong style="color:#2563eb;">' + (a.total_restock || 0) + ' pcs</strong>' +
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
function openTransferStockModal(outletId) {
  let outletName = 'Outlet Mitra';
  if (window._currentOutletDetail && window._currentOutletDetail.outlet) {
    outletName = window._currentOutletDetail.outlet.name;
  } else if (DATA_CACHE.outlets && DATA_CACHE.outlets.data) {
    const o = DATA_CACHE.outlets.data.filter(function (x) { return String(x.id) === String(outletId); })[0];
    if (o) outletName = o.name;
  }

  const bodyHtml =
    '<div style="background:#FAF7F2;border:1px solid #E4D8CE;padding:12px 14px;border-radius:var(--radius-sm);margin-bottom:14px;">' +
    '<div style="font-size:13px;font-weight:700;color:var(--primary);">Drop / Pengiriman Stok ke ' + escapeHtml(outletName) + '</div>' +
    '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Stok benih kemasan jadi akan dipotong otomatis dari gudang pusat secara FIFO dan ditambahkan ke saldo rak outlet. Dokumen Surat Jalan Delivery Order otomatis diterbitkan ke Google Drive.</div>' +
    '</div>' +
    '<div class="field-group">' +
    '<label class="field-label">Daftar Varietas Benih yang Dikirim <span style="color:var(--danger)">*</span></label>' +
    '<div id="transfer-items-container"></div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="addTransferStockRow()" style="margin-top:8px;">+ Tambah Varietas Benih</button>' +
    '</div>' +
    '<div class="field-group" style="margin-top:14px;">' +
    '<label class="field-label">Catatan / Keterangan Pengiriman (Opsional)</label>' +
    '<input type="text" id="transfer-notes" placeholder="Contoh: Titipan display tambahan menyambut musim tanam..." style="width:100%;padding:8px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
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
  row.className = 'price-tier-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML =
    '<select class="transfer-product" style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;font-weight:600;">' +
    buildProductOptionsHTML('jadi') +
    '</select>' +
    '<input type="number" class="transfer-qty" placeholder="Qty Pcs" min="1" value="10" style="width:100px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);text-align:center;font-weight:700;">' +
    '<button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()" title="Hapus baris">&times;</button>';
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
  showToast('Memuat Surat Jalan PDF dari Google Drive...');
  api('getConsignmentSuratJalanPdf', TOKEN, transferId).then(function (res) {
    if (res && res.pdf_url) {
      window.open(res.pdf_url, '_blank');
    } else {
      showToast('Tautan Surat Jalan tidak ditemukan.', true);
    }
  }).catch(function (err) {
    showToast('Gagal memuat Surat Jalan: ' + (err.message || err), true);
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
    const settings = STORE_SETTINGS || {};
    const storeTitle = settings.store_name || 'KIOS IDEP';
    const storeLogo = settings.store_logo || settings.store_logo_light || '';
    const storeAddress = settings.store_address || 'Br. Batulumbung, Desa Tegal Cangkring, Mendoyo, Jembrana - Bali';
    const storePhone = settings.store_phone || '0812-3456-7890';
    const storeEmail = settings.store_email || 'kios@idepfoundation.org';

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
        '<td style="padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#1e293b;">' + escapeHtml(it.product_name || it.product_id) + '</td>' +
        '<td style="text-align:center;padding:7px 8px;border:1px solid #cbd5e1;font-size:10px;color:#475569;font-family:monospace;">' + batchDisplay + '</td>' +
        '<td style="text-align:center;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#7A5031;">' + qty + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
        '<td style="text-align:right;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;">Rp ' + price.toLocaleString('id-ID') + '</td>' +
        '<td style="text-align:right;padding:7px 8px;border:1px solid #cbd5e1;font-size:11px;font-weight:bold;color:#1e293b;">Rp ' + lineVal.toLocaleString('id-ID') + '</td>' +
        '</tr>';
    }).join('');

    const logoHtml = storeLogo
      ? '<img src="' + escapeHtml(storeLogo) + '" style="max-height:55px;max-width:180px;object-fit:contain;display:block;margin-bottom:5px;" alt="Logo" />'
      : '<div style="font-size:15pt;font-weight:800;color:#7A5031;letter-spacing:0.5px;margin-bottom:3px;">' + escapeHtml(storeTitle).toUpperCase() + '</div>';

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
      '<div style="border-bottom: 2px solid #7A5031; padding-bottom: 12px; margin-bottom: 16px;">' +
      '<table style="width:100%;border-collapse:collapse;"><tr>' +
      '<td style="vertical-align:top;width:58%;padding-right:15px;">' +
      logoHtml +
      '<div style="font-size:9.5pt;color:#475569;line-height:1.4;margin-top:2px;">' + escapeHtml(storeAddress) + '</div>' +
      '<div style="font-size:9.5pt;color:#475569;margin-top:2px;">Kontak/WA: ' + escapeHtml(storePhone) + (storeEmail ? (' | Email: ' + escapeHtml(storeEmail)) : '') + '</div>' +
      '</td>' +
      '<td style="text-align:right;vertical-align:top;width:42%;">' +
      '<div style="font-size:16pt;font-weight:800;color:#7A5031;letter-spacing:1px;line-height:1.2;">SURAT JALAN</div>' +
      '<div style="font-size:9pt;color:#64748b;font-weight:600;text-transform:uppercase;margin-bottom:8px;">PENGIRIMAN STOK KONSINYASI</div>' +
      '<table style="display:inline-table;width:auto;text-align:left;font-size:9.5pt;border-collapse:collapse;">' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">No. SJ</td><td style="color:#1e293b;font-weight:bold;">: #' + escapeHtml(transfer.invoice_no || transfer.id) + '</td></tr>' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">Tanggal</td><td style="color:#1e293b;">: ' + escapeHtml(transfer.sent_at ? transfer.sent_at.split(' ')[0] : '-') + '</td></tr>' +
      '<tr><td style="color:#64748b;padding:2px 8px 2px 0;font-weight:600;">Status</td><td style="color:' + (transfer.delivery_status === 'DELIVERED' ? '#0f766e' : '#d97706') + ';font-weight:bold;">: ' + escapeHtml(transfer.delivery_status || 'DELIVERED') + '</td></tr>' +
      '</table>' +
      '</td>' +
      '</tr></table>' +
      '</div>' +

      '<table style="width:100%;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">' +
      '<tr>' +
      '<td style="padding:8px 12px;width:50%;vertical-align:top;border-right:1px solid #e2e8f0;">' +
      '<div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;">Tujuan Toko Cabang / Mitra</div>' +
      '<div style="font-size:13px;font-weight:bold;color:#7A5031;margin-top:2px;">' + escapeHtml(outlet.name || '-') + '</div>' +
      '<div style="font-size:10px;color:#334155;margin-top:3px;">PIC Toko: <strong>' + escapeHtml(outlet.pic_name || '-') + '</strong> (' + escapeHtml(outlet.phone || '-') + ')</div>' +
      '<div style="font-size:10px;color:#475569;margin-top:2px;">Alamat: ' + escapeHtml(outlet.address || '-') + '</div>' +
      '<div style="font-size:10px;color:#0f766e;margin-top:2px;">Tingkat Harga: <strong>' + escapeHtml(outlet.price_tier || 'Mitra') + '</strong></div>' +
      '</td>' +
      '<td style="padding:8px 12px;width:50%;vertical-align:top;">' +
      '<div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:bold;">Informasi Pengiriman</div>' +
      '<div style="font-size:11px;font-weight:bold;color:#1e293b;margin-top:2px;">Tanggal Kirim: ' + escapeHtml(transfer.sent_at || '-') + '</div>' +
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
      '<tr style="background:#7A5031;color:#ffffff;">' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;width:28px;">No</th>' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;text-align:left;">Nama Produk</th>' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;text-align:center;width:120px;">No. Batch / Lot</th>' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;text-align:center;width:75px;">Qty Kirim</th>' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;text-align:right;width:95px;">Harga Satuan</th>' +
      '<th style="padding:7px 8px;border:1px solid #5C381E;font-size:10px;text-align:right;width:105px;">Total Nilai Titip</th>' +
      '</tr>' +
      '</thead>' +
      '<tbody>' +
      itemsRows +
      '<tr style="background:#f1f5f9;font-weight:bold;">' +
      '<td colspan="3" style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;">TOTAL KESELURUHAN:</td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;color:#7A5031;">' + totalQty + ' pcs</td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;"></td>' +
      '<td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;color:#0f766e;">Rp ' + totalValue.toLocaleString('id-ID') + '</td>' +
      '</tr>' +
      '</tbody>' +
      '</table>' +

      '<div style="margin-bottom:14px;padding:8px 12px;background:#FAF7F2;border:1px dashed #D6C7BA;border-radius:4px;font-size:9.5px;color:#5c381e;">' +
      '<strong>Ketentuan Konsinyasi:</strong>' +
      '<ul style="margin:4px 0 0 16px;padding:0;">' +
      '<li>Seluruh barang di atas dititipkan untuk dipajang dan dijual di outlet mitra Kios IDEP.</li>' +
      '<li>Kepemilikan barang tetap berada pada Kios IDEP sampai barang dinyatakan terjual pada saat opname bersama.</li>' +
      '<li>Pemeriksaan stok fisik dan penagihan hasil penjualan dilakukan secara periodik melalui Berita Acara Rekonsiliasi resmi.</li>' +
      '</ul>' +
      '</div>' +

      '<div style="margin-top:24px;page-break-inside:avoid;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:8px;text-align:center;">BUKTI SERAH TERIMA DROP STOK TITIPAN</div>' +
      '<table style="width:100%;border:1px solid #cbd5e1;border-radius:6px;background:#ffffff;">' +
      '<tr>' +
      '<td style="width:50%;text-align:center;padding:14px;border-right:1px solid #cbd5e1;vertical-align:bottom;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:50px;">Pihak Pengirim (Kios IDEP)</div>' +
      '<div style="border-top:1px solid #94a3b8;padding-top:4px;display:inline-block;width:80%;">' +
      '<strong style="font-size:11px;">Petugas Pengantar IDEP</strong>' +
      '<div style="font-size:9px;color:#64748b;">Tanggal: ' + (transfer.sent_at ? transfer.sent_at.split(' ')[0] : '-') + '</div>' +
      '</div>' +
      '</td>' +
      '<td style="width:50%;text-align:center;padding:14px;vertical-align:bottom;">' +
      '<div style="font-size:10px;font-weight:bold;color:#475569;margin-bottom:8px;">Pihak Penerima (Toko Cabang / Mitra)</div>' +
      (transfer.recipient_signature ?
        ('<div style="height:55px;text-align:center;margin-bottom:6px;">' +
          '<img src="' + transfer.recipient_signature + '" style="max-height:50px;max-width:160px;display:inline-block;" />' +
          '</div>') :
        '<div style="height:48px;"></div>'
      ) +
      '<div style="border-top:1px solid #94a3b8;padding-top:4px;display:inline-block;width:80%;">' +
      '<strong style="font-size:11px;">' + escapeHtml(transfer.actual_recipient_name || outlet.pic_name || outlet.name || 'Penanggung Jawab Toko') + '</strong>' +
      '<div style="font-size:9px;color:#64748b;">' + (transfer.recipient_role ? ('Jabatan: ' + escapeHtml(transfer.recipient_role)) : 'Tanda Tangan &amp; Cap Toko') + '</div>' +
      (transfer.received_at ? ('<div style="font-size:8.5px;color:#0f766e;margin-top:2px;">Diterima: ' + escapeHtml(transfer.received_at) + '</div>') : '') +
      '</div>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</div>' +

      '<div style="margin-top:18px;text-align:center;font-size:8px;color:#94a3b8;">' +
      'Surat Jalan digital ini diterbitkan secara sah oleh Sistem E-Kasir Kios IDEP pada ' + escapeHtml(transfer.sent_at || '-') + '.' +
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
        return '<tr>' +
          '<td style="font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);">' + escapeHtml(it.product_id || '-') + '</td>' +
          '<td><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
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
      return '<tr>' +
        '<td>' + escapeHtml(it.product_name) + '</td>' +
        '<td style="text-align:center;font-family:\'JetBrains Mono\',monospace;">' + escapeHtml(it.batch_id || '-') + '</td>' +
        '<td style="text-align:center;font-weight:bold;">' + Number(it.qty || 0) + ' ' + escapeHtml(it.unit || 'pcs') + '</td>' +
        '</tr>';
    }).join('');

    const bodyHtml =
      '<div class="pod-summary-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div>' +
      '<div class="pod-doc-tag">#' + escapeHtml(t.invoice_no || t.id) + '</div>' +
      '<div class="pod-outlet-title" style="margin-top:4px;">🏪 ' + escapeHtml(o.name || '-') + '</div>' +
      '<div style="font-size:11px;color:var(--text-secondary);">PIC Outlet: ' + escapeHtml(o.pic_name || '-') + '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<span class="badge-delivered">✅ DELIVERED</span>' +
      '<div style="font-size:11px;color:var(--text-secondary);margin-top:4px;">Diterima: ' + (t.received_at || formatDate(t.sent_at)) + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">' +
      '<div style="background:#FFFFFF;border:1px solid var(--border);border-radius:var(--radius-xs);padding:12px;">' +
      '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:bold;">Orang yang Menerima Fisik</div>' +
      '<div style="font-size:14px;font-weight:bold;color:var(--text-main);margin-top:2px;">' + escapeHtml(t.actual_recipient_name || '-') + '</div>' +
      '<div style="font-size:11.5px;color:var(--primary);font-weight:600;margin-top:2px;">Status: ' + escapeHtml(t.recipient_role || 'Staf Toko / Kasir') + '</div>' +
      (t.delivery_notes ? ('<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;background:var(--surface-muted);padding:6px 8px;border-radius:4px;"><strong>Catatan:</strong> ' + escapeHtml(t.delivery_notes) + '</div>') : '') +
      '</div>' +
      '<div style="background:#FFFFFF;border:1px solid var(--border);border-radius:var(--radius-xs);padding:12px;text-align:center;">' +
      '<div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:bold;margin-bottom:6px;">Tanda Tangan Digital Penerima</div>' +
      (t.recipient_signature ?
        ('<img src="' + t.recipient_signature + '" style="max-height:85px;max-width:100%;object-fit:contain;border:1px dashed #cbd5e1;border-radius:4px;padding:4px;background:#FAF7F2;" alt="Tanda Tangan" />') :
        '<div style="color:var(--text-muted);font-size:12px;padding:20px;">(Tanda tangan tidak tersedia)</div>'
      ) +
      '</div>' +
      '</div>' +

      '<div class="pod-items-box">' +
      '<div class="pod-items-label"><span>Daftar Benih yang Telah Diserahkan:</span></div>' +
      '<table class="pod-items-table">' +
      '<thead><tr><th>Nama Benih</th><th style="text-align:center;">Batch</th><th style="text-align:center;">Jumlah</th></tr></thead>' +
      '<tbody>' + itemsRows + '</tbody>' +
      '</table>' +
      '</div>';

    const printSjBtn = '<button type="button" class="btn btn-secondary" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="display:inline-flex;align-items:center;gap:4px;">🖨️ Cetak Surat Jalan</button>';
    const pdfBtn = t.pdf_url ?
      ('<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-primary" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 Unduh PDF Berita Acara Resmi</a>') :
      ('<button type="button" class="btn btn-primary" onclick="openTransferSuratJalan(\'' + t.id + '\')">📄 Buka PDF Surat Jalan</button>');

    const closeBtnText = window._wasOutletModalOpen ? '⬅️ Kembali ke Detail Surat Jalan' : 'Tutup';
    const footerHtml =
      '<button type="button" class="btn btn-secondary" onclick="closePodViewModal()">' + closeBtnText + '</button>' +
      printSjBtn +
      pdfBtn;

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
        '<div style="font-size:10px;color:var(--text-secondary);">' + escapeHtml(t.recipient_role || 'Penerima') + (t.received_at ? (' &bull; ' + formatDate(t.received_at)) : '') + '</div>') :
      '<span style="color:var(--text-muted);font-size:11px;">Menunggu Serah Terima</span>';

    const actionBtn = !isDelivered ?
      ('<button type="button" class="btn btn-primary btn-sm" onclick="openDeliveryReceiptModal(\'' + t.id + '\', \'' + t.outlet_id + '\')" style="margin-right:4px;">✍️ Serah Terima / Tanda Tangan</button>') :
      ('<button type="button" class="btn btn-secondary btn-sm" onclick="viewDeliveryReceiptModal(\'' + t.id + '\', \'' + t.outlet_id + '\')" style="margin-right:4px;">👁️ Bukti Serah Terima</button>');

    const printSjBtn = '<button type="button" class="btn btn-secondary btn-sm" onclick="printConsignmentSuratJalan(\'' + t.id + '\')" style="margin-right:4px;" title="Cetak Surat Jalan A4 Langsung">🖨️ Cetak</button>';
    const pdfBtn = t.pdf_url ?
      ('<a href="' + escapeHtml(t.pdf_url) + '" target="_blank" class="btn btn-secondary btn-sm" style="text-decoration:none;display:inline-flex;align-items:center;gap:4px;">📄 PDF</a>') :
      ('<button type="button" class="btn btn-secondary btn-sm" onclick="openTransferSuratJalan(\'' + t.id + '\')">📄 PDF</button>');

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
      '<td style="text-align:right;white-space:nowrap;">' + actionBtn + printSjBtn + pdfBtn + '</td>' +
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

function openConsignmentAuditModal(outletId) {
  showToast('Menyiapkan formulir audit stok opname...');
  api('getOutletDetail', TOKEN, outletId).then(function (data) {
    const o = data.outlet || {};
    const stocks = Array.isArray(data.stocks) ? data.stocks : [];
    if (stocks.length === 0) {
      showToast('Belum ada stok fisik benih di outlet ini. Lakukan drop stok terlebih dahulu.', true);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const auditorDefault = (typeof USER_NAME !== 'undefined' && USER_NAME) ? USER_NAME : ((typeof CURRENT_USER !== 'undefined' && CURRENT_USER && CURRENT_USER.name) ? CURRENT_USER.name : 'Petugas IDEP');

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
      sigIdepBase64: '',
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
        '<input type="number" class="audit-qty-input" id="audit-missing-' + idx + '" value="' + (it.qty_missing || 0) + '" min="0" oninput="recalcAuditRow(' + idx + ')" style="border-color:#fca5a5;color:#dc2626;font-weight:700;">' +
        '</td>' +
        '<td>' +
        '<select id="audit-chargeable-' + idx + '" onchange="recalcAuditRow(' + idx + ')" style="width:100%;min-width:140px;padding:4px 6px;font-size:10.5px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;font-weight:600;">' +
        '<option value="true"' + (it.missing_chargeable ? ' selected' : '') + '>Ditagihkan ke Mitra (Kelalaian Toko)</option>' +
        '<option value="false"' + (!it.missing_chargeable ? ' selected' : '') + '>Write-off IDEP (Beban Kios)</option>' +
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
        '<input type="text" placeholder="Kondisi rak / display..." id="audit-notes-' + idx + '" oninput="updateAuditItemNotes(' + idx + ', this.value)" style="width:100%;padding:4px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
        '</td>' +
        '</tr>';
    }).join('');

    const bodyHtml =
      '<div style="margin-bottom:14px;background:#FAF7F2;border:1px solid #E4D8CE;padding:12px 14px;border-radius:var(--radius-sm);">' +
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
      '<label class="field-label">Petugas Pemeriksa Kios IDEP</label>' +
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
      '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px;">Ambil atau unggah foto rak pajangan benih di outlet. Foto otomatis dikompresi (maksimal 1000px) sebelum diunggah ke Google Drive.</div>' +
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
      '<span class="sig-title">Tanda Tangan Petugas IDEP</span>' +
      '<button type="button" class="sig-clear-btn" onclick="clearSignaturePad(\'idep\')">Bersihkan</button>' +
      '</div>' +
      '<div class="sig-canvas-wrap">' +
      '<canvas id="sig-idep-canvas" class="sig-canvas"></canvas>' +
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
      initSignaturePad('idep');
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

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 320;
  canvas.height = rect.height || 140;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let drawing = false;
  let hasDrawn = false;

  function getPos(e) {
    const cRect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - cRect.left,
        y: e.touches[0].clientY - cRect.top
      };
    }
    return {
      x: e.clientX - cRect.left,
      y: e.clientY - cRect.top
    };
  }

  function startDraw(e) {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function moveDraw(e) {
    if (!drawing) return;
    e.preventDefault();
    hasDrawn = true;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw(e) {
    if (!drawing) return;
    drawing = false;
  }

  canvas.onmousedown = startDraw;
  canvas.onmousemove = moveDraw;
  window.addEventListener('mouseup', endDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', moveDraw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });

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

  if (!window._sigPads['idep'] || !window._sigPads['idep'].isDrawn()) {
    showToast('Tanda tangan Petugas IDEP belum dibubuhkan!', true);
    return;
  }

  if (!window._sigPads['outlet'] || !window._sigPads['outlet'].isDrawn()) {
    showToast('Tanda tangan PIC Toko Mitra belum dibubuhkan!', true);
    return;
  }

  const submitBtn = document.getElementById('btn-submit-audit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Menyusun Berita Acara &amp; Mengunggah ke Drive...';
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
    sig_idep_base64: window._sigPads['idep'].toDataURL(),
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

  showToast('Menyusun PDF Berita Acara & sinkronisasi Google Drive...');

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
    ('• Barang Hilang/Selisih: ' + res.total_missing + ' pcs (Ditagihkan ke Mitra: ' + (res.total_chargeable_missing || 0) + ' pcs, Beban IDEP: ' + (res.total_writeoff_missing || 0) + ' pcs)\n') : '';

  const waText = encodeURIComponent(
    'Halo Bapak/Ibu ' + picName + ' (' + storeName + '),\n\n' +
    'Terima kasih atas kerja samanya. Berikut terlampir dokumen digital *Berita Acara Stok Opname Konsinyasi Kios IDEP*:\n' +
    '• No. Dokumen: #' + res.audit_id + '\n' +
    '• Tanggal Opname: ' + formatDate(res.audit_date) + '\n' +
    '• Petugas IDEP: ' + payload.auditor_name + '\n' +
    '• Terjual: ' + (res.total_sold || 0) + ' pcs\n' +
    '• Retur Rusak/Exp: ' + (res.total_returned || 0) + ' pcs\n' +
    missingWaLine +
    '• Restock Baru di Rak: ' + (res.total_restock || 0) + ' pcs\n' +
    (payload.notes ? ('• Catatan: ' + payload.notes + '\n') : '') +
    (res.pdf_url ? ('\nDokumen resmi PDF dapat diakses/diunduh melalui Google Drive:\n' + res.pdf_url + '\n\n') : '\n') +
    'Salam hangat,\n*Kios IDEP — POS & Pusat Benih*'
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
    (' &bull; Hilang: <strong style="color:var(--danger);">' + res.total_missing + ' pcs</strong> (' + (res.total_chargeable_missing || 0) + ' tagih mitra, ' + (res.total_writeoff_missing || 0) + ' beban IDEP)') : '';

  const bodyHtml =
    '<div style="text-align:center;padding:16px 0;">' +
    '<div style="font-size:48px;margin-bottom:10px;">📋</div>' +
    '<h2 style="margin-bottom:6px;color:var(--primary);">Berita Acara Resmi Diterbitkan!</h2>' +
    '<p style="color:var(--text-secondary);font-size:13px;margin-bottom:16px;">' +
    'Stok opname untuk <strong>' + escapeHtml(storeName) + '</strong> berhasil diverifikasi dengan dual signature dan diarsipkan ke Google Drive.' +
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
      '<div class="badge badge-warning" style="display:block;padding:8px;">PDF berhasil diarsipkan di folder Drive.</div>') +
    invoiceBtnHtml +
    waActionHtml +
    '</div>';

  openModal('Berita Acara Opname Sukses', bodyHtml, '<button type="button" class="btn btn-secondary" onclick="closeModal();' + (outletId ? ('showOutletDetailModal(\'' + outletId + '\', \'audits\');') : 'renderKonsinyasi(true);') + '">Selesai &amp; Tutup</button>');
}

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
  }).catch(function (err) {
    if (btn) { btn.disabled = false; btn.textContent = '🧾 Buat Faktur Resmi'; }
    showToast('Gagal menerbitkan faktur: ' + (err.message || err), true);
  });
}



// Backward compatibility alias
function openConsignmentModal() { openOutletModal(); }
function showConsignmentDetail(id) { showOutletDetailModal(id); }
function openConsignmentSuratJalan(id) { openTransferSuratJalan(id); }

// ========================= PIUTANG & PEMBAYARAN TEMPO =========================
function renderPiutang(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('receivables')) {
    drawPiutangUI(DATA_CACHE.receivables.data);
    return;
  }

  if (!DATA_CACHE.receivables.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">Memuat data piutang...</div></div>';
  }

  api('getReceivables', TOKEN).then(function (receivables) {
    const list = Array.isArray(receivables) ? receivables : [];
    DATA_CACHE.receivables = { data: list, timestamp: Date.now() };
    drawPiutangUI(list);
  }).catch(function (err) { showToast('Gagal memuat piutang: ' + (err.message || err), true); });
}

function drawPiutangUI(list) {
  const content = document.getElementById('content');
  if (!content) return;

  const active = list.filter(function (r) { return r.status === 'active'; });
  const lunas = list.filter(function (r) { return r.status === 'lunas'; });
  const totalRemaining = active.reduce(function (s, r) { return s + Number(r.remaining || 0); }, 0);

  content.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title">Piutang &amp; Cicilan Pelanggan</h1>' +
        '<p class="page-subtitle">Monitoring tagihan belum lunas dan pencatatan pembayaran tempo.</p>' +
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

// ========================= CRM PELANGGAN 360° =========================
function renderCRM(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('customers')) {
    drawCRMUI(DATA_CACHE.customers.data);
    return;
  }

  if (!DATA_CACHE.customers.data) {
    content.innerHTML = '<div class="card"><div class="empty-state">Memuat data pelanggan...</div></div>';
  }

  api('getCustomers', TOKEN).then(function (customers) {
    CUSTOMERS_CACHE = Array.isArray(customers) ? customers : [];
    DATA_CACHE.customers = { data: CUSTOMERS_CACHE, timestamp: Date.now() };
    drawCRMUI(CUSTOMERS_CACHE);
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
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

  api('getCustomerDetail', TOKEN, customerId).then(function (data) {
    const c = data.customer || {};
    const txs = Array.isArray(data.transactions) ? data.transactions : [];
    const recs = Array.isArray(data.receivables) ? data.receivables : [];

    detailEl.innerHTML =
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">' +
          '<div>' +
            '<h2>' + escapeHtml(c.name) + '</h2>' +
            '<div style="color:var(--text-secondary);font-size:13px;margin-top:2px;">' + escapeHtml(c.phone || '-') + ' &bull; ' + escapeHtml(c.email || '-') + '</div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:11px;color:var(--text-secondary);text-transform:uppercase;">Total Pengeluaran Belanja</div>' +
            '<div style="font-size:24px;font-weight:800;color:var(--primary);">' + formatRupiah(data.totalSpending) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
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

  if (!forceRefresh && window._pjState && window._pjState.claims && window._pjState.claims.length > 0) {
    drawPurnaJualIntegratedUI();
    return;
  }

  content.innerHTML = '<div class="card"><div class="empty-state">Memuat modul Purna Jual & Kepuasan Pelanggan...</div></div>';

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

    updatePurnaJualNavBadge();

    // Pilih batch pertama jika belum ada batch terpilih untuk recall
    if (!window._pjState.activeBatchId && window._pjState.batches.length > 0) {
      window._pjState.activeBatchId = window._pjState.batches[0].id;
    }

    drawPurnaJualIntegratedUI();
  }).catch(function (err) {
    showToast('Gagal memuat data purna jual: ' + (err.message || err), true);
    content.innerHTML = '<div class="card"><div class="empty-state">Terjadi kendala saat memuat data. Silakan coba kembali.</div></div>';
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

function openClaimModal(prefillData) {
  ensurePjBatchesLoaded();

  const custOptions = (CUSTOMERS_CACHE || []).map(function (c) {
    return '<option value="' + escapeHtml(c.name) + '" data-phone="' + escapeHtml(c.phone || '') + '">' + escapeHtml(c.name) + (c.phone ? ' (' + c.phone + ')' : '') + '</option>';
  }).join('');

  const prodOptions = (PRODUCTS_CACHE || []).map(function (p) {
    return '<option value="' + p.id + '">' + escapeHtml(p.name + (p.variant ? ' - ' + p.variant : '')) + '</option>';
  }).join('');

  const bodyHtml =
    '<div style="background:#FAF7F2;border:1.5px solid #E8DFD8;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
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
      opts += '<option value="' + p.id + '">' + escapeHtml(p.name + (p.variant ? ' - ' + p.variant : '')) + '</option>';
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
      return '<option value="' + p.id + '">' + escapeHtml(p.name + (p.variant ? ' - ' + p.variant : '')) + '</option>';
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
        return '<option value="' + p.id + '">' + escapeHtml(p.name + (p.variant ? ' - ' + p.variant : '')) + '</option>';
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
      '<button type="button" class="btn btn-secondary btn-xs" onclick="reloadFollowUpData()" title="Sinkronkan ulang data sapaan pelanggan dari spreadsheet">' +
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
      "Halo Kak/Bli " + custName + ", salam lestari dari Kios IDEP 🙏\n\n" +
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
      '<div style="background:#FAF7F2;border:1px solid #E8DFD8;border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:14px;">' +
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

  const currentUser = (window._currentUser && window._currentUser.name) ? window._currentUser.name : 'Staf Kios IDEP';

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

// ========================= LAPORAN PENJUALAN & MARGIN FIFO =========================
function renderLaporan(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (CURRENT_LAPORAN_VIEW === 'stock_valuation') {
    loadStockValuationReport(forceRefresh);
    return;
  }

  // Set default filter awal bulan s/d hari ini jika belum terisi
  if (!CURRENT_REPORT_FILTER.startDate || !CURRENT_REPORT_FILTER.endDate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    CURRENT_REPORT_FILTER.period = 'month';
    CURRENT_REPORT_FILTER.startDate = y + '-' + m + '-01';
    CURRENT_REPORT_FILTER.endDate = y + '-' + m + '-' + d;
  }

  content.innerHTML =
    '<div class="card">' +
      '<div class="empty-state">' +
        '<span class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:10px;"></span><br>' +
        'Mengkalkulasi pembukuan omzet, HPP FIFO riil, dan penyerapan petani...' +
      '</div>' +
    '</div>';

  loadReport(CURRENT_REPORT_FILTER);
}

function loadReport(filterPayload) {
  if (typeof filterPayload === 'string') {
    CURRENT_REPORT_FILTER.period = filterPayload;
  } else if (filterPayload && typeof filterPayload === 'object') {
    Object.assign(CURRENT_REPORT_FILTER, filterPayload);
  }

  setProgressLoading(true);
  api('getReport', TOKEN, CURRENT_REPORT_FILTER.period, CURRENT_REPORT_FILTER.startDate, CURRENT_REPORT_FILTER.endDate).then(function (data) {
    setProgressLoading(false);
    CURRENT_REPORT_DATA = data;
    if (data.startDate) CURRENT_REPORT_FILTER.startDate = data.startDate;
    if (data.endDate) CURRENT_REPORT_FILTER.endDate = data.endDate;
    if (data.period) CURRENT_REPORT_FILTER.period = data.period;
    drawLaporanUI(data, CURRENT_REPORT_FILTER);
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal memuat laporan: ' + (err.message || err), true);
  });
}

function applyCustomReportFilter() {
  const startEl = document.getElementById('report-start-date');
  const endEl = document.getElementById('report-end-date');
  const sVal = startEl ? startEl.value : '';
  const eVal = endEl ? endEl.value : '';

  if (!sVal || !eVal) {
    showToast('Harap pilih Tanggal Mulai dan Tanggal Selesai.', true);
    return;
  }
  if (sVal > eVal) {
    showToast('Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai.', true);
    return;
  }

  loadReport({
    period: 'custom',
    startDate: sVal,
    endDate: eVal
  });
}

function switchReportSubtab(tabName) {
  CURRENT_REPORT_SUBTAB = tabName;
  const buttons = document.querySelectorAll('.report-tab-btn');
  buttons.forEach(function (btn) {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  const panes = document.querySelectorAll('.report-subtab-pane');
  panes.forEach(function (pane) {
    if (pane.id === 'report-subtab-' + tabName) {
      pane.style.display = 'block';
    } else {
      pane.style.display = 'none';
    }
  });
}

function formatReportDateTime(val) {
  if (!val) return '-';
  const d = new Date(String(val).replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(val).slice(0, 16);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const yr = d.getFullYear();
  const hr = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return day + '/' + mon + '/' + yr + ' ' + hr + ':' + min;
}

function filterReportTransactions(query) {
  query = (query || '').trim().toLowerCase();
  const txs = (CURRENT_REPORT_DATA && CURRENT_REPORT_DATA.transactions) ? CURRENT_REPORT_DATA.transactions : [];
  let filtered = txs;
  if (query) {
    filtered = txs.filter(function (t) {
      const idMatch = String(t.id || '').toLowerCase().includes(query);
      const custMatch = String(t.customer_name || '').toLowerCase().includes(query);
      const payMatch = String(t.payment_method || '').toLowerCase().includes(query);
      const srcMatch = String(t.source || '').toLowerCase().includes(query);
      const itemsMatch = String(t.items_summary || '').toLowerCase().includes(query);
      return idMatch || custMatch || payMatch || srcMatch || itemsMatch;
    });
  }
  renderReportTransactionRows(filtered);
  updateReportTableFooter(filtered);
}

function renderReportTransactionRows(list) {
  const tbody = document.getElementById('report-tx-tbody');
  if (!tbody) return;
  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada transaksi yang sesuai dengan filter atau kata kunci.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(function (tx, idx) {
    const isPaid = String(tx.status || '').toLowerCase() === 'paid';
    const statusBadge = isPaid
      ? '<span class="badge badge-success" style="font-size:10px;padding:2px 6px;font-weight:700;">LUNAS</span>'
      : '<span class="badge badge-warning" style="font-size:10px;padding:2px 6px;font-weight:700;">TEMPO</span>';

    let srcIcon = '🏪';
    const sLower = String(tx.source || '').toLowerCase();
    if (sLower.includes('wa') || sLower.includes('whatsapp')) srcIcon = '💬';
    else if (sLower.includes('shopee')) srcIcon = '🟠';
    else if (sLower.includes('tokopedia')) srcIcon = '🟢';
    else if (sLower.includes('tiktok')) srcIcon = '🎵';
    else if (sLower.includes('konsinyasi')) srcIcon = '📦';

    const marginPct = Number(tx.margin_pct || 0);
    const marginClass = marginPct >= 0 ? 'badge-success' : 'badge-danger';

    return '<tr>' +
      '<td style="text-align:center;font-size:12px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td style="font-size:12px;white-space:nowrap;color:var(--text-secondary);">' + formatReportDateTime(tx.created_at) + '</td>' +
      '<td><span style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:var(--primary);">' + escapeHtml(tx.id) + '</span></td>' +
      '<td>' +
        '<div style="font-weight:600;color:var(--text-main);font-size:12.5px;">' + escapeHtml(tx.customer_name || 'Umum') + '</div>' +
      '</td>' +
      '<td><span class="badge badge-neutral" style="font-size:11px;display:inline-flex;align-items:center;gap:3px;">' + srcIcon + ' ' + escapeHtml(tx.source || 'Offline') + '</span></td>' +
      '<td>' +
        '<div style="max-width:260px;font-size:12px;line-height:1.4;color:var(--text-main);" title="' + escapeHtml(tx.items_summary) + '">' +
          '<span>' + escapeHtml(tx.items_summary) + '</span>' +
          '<span class="badge badge-neutral" style="font-size:10px;margin-left:4px;white-space:nowrap;font-weight:700;">' + (tx.item_count || 0) + ' pcs</span>' +
        '</div>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;color:var(--text-main);font-size:12.5px;">' + formatRupiah(tx.subtotal) + '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-size:12.5px;">' + formatRupiah(tx.cogs) + '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);font-size:13px;background:rgba(46,125,50,0.06);padding:4px 8px;border-radius:var(--radius-xs);">' + formatRupiah(tx.gross_profit) + '</td>' +
      '<td style="text-align:center;"><span class="badge ' + marginClass + '" style="font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;">' + marginPct + '%</span></td>' +
      '<td style="text-align:center;">' +
        '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">' +
          '<span style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">' + escapeHtml(tx.payment_method || 'Tunai') + '</span>' +
          statusBadge +
        '</div>' +
      '</td>' +
      '<td style="text-align:center;">' +
        '<button type="button" class="btn btn-secondary btn-xs" onclick="openTransactionDetailModal(\'' + escapeHtml(tx.id) + '\')" title="Lihat rincian nota & struk #' + escapeHtml(tx.id) + '" style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:4px 8px;font-weight:600;">🔍 Rincian</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function updateReportTableFooter(list) {
  const tfoot = document.getElementById('report-tx-tfoot');
  const countEl = document.getElementById('report-tx-count');
  list = list || [];

  const totalTxs = (CURRENT_REPORT_DATA && CURRENT_REPORT_DATA.transactions) ? CURRENT_REPORT_DATA.transactions.length : list.length;
  if (countEl) {
    countEl.textContent = 'Menampilkan ' + list.length + ' dari ' + totalTxs + ' transaksi';
  }

  if (!tfoot) return;
  const subtotalAcc = list.reduce(function (s, t) { return s + Number(t.subtotal || 0); }, 0);
  const cogsAcc = list.reduce(function (s, t) { return s + Number(t.cogs || 0); }, 0);
  const grossAcc = subtotalAcc - cogsAcc;
  const marginAccPct = subtotalAcc > 0 ? Math.round((grossAcc / subtotalAcc) * 100) : 0;

  tfoot.innerHTML =
    '<tr>' +
      '<th colspan="6" style="text-align:right;padding:12px;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:12.5px;">' +
        'TOTAL AKUMULASI (' + list.length + ' Nota):' +
      '</th>' +
      '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:13px;">' + formatRupiah(subtotalAcc) + '</th>' +
      '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-secondary);background:var(--surface-muted);font-size:13px;">' + formatRupiah(cogsAcc) + '</th>' +
      '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);background:rgba(46,125,50,0.12);font-size:13.5px;">' + formatRupiah(grossAcc) + '</th>' +
      '<th style="text-align:center;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);background:var(--surface-muted);font-size:12.5px;">' + marginAccPct + '%</th>' +
      '<th colspan="2" style="background:var(--surface-muted);"></th>' +
    '</tr>';
}

function drawLaporanUI(data, filter) {
  const content = document.getElementById('content');
  if (!content) return;

  data = data || {
    summary: { totalRevenue: 0, totalSubtotal: 0, totalCost: 0, grossMargin: 0, grossMarginPct: 0, totalTransactions: 0 },
    transactions: [],
    channelsBreakdown: [],
    outletsBreakdown: [],
    farmersAbsorption: [],
    criticalBatches: [],
    topProducts: [],
    slowProducts: []
  };

  const summary = data.summary || {
    totalRevenue: data.totalRevenue || 0,
    totalSubtotal: data.totalSubtotalRevenue || data.netRevenue || 0,
    totalCost: data.totalCost || 0,
    grossMargin: data.grossMargin || 0,
    grossMarginPct: data.grossMarginPct || 0,
    totalTransactions: data.totalTransactions || 0
  };

  const period = filter.period || 'month';
  const startDateVal = data.startDate || filter.startDate || '';
  const endDateVal = data.endDate || filter.endDate || '';
  const transactionsList = data.transactions || [];

  // 1. Render Tab Kanal Penjualan
  let channelsHtml = '';
  if (data.channelsBreakdown && data.channelsBreakdown.length > 0) {
    channelsHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
        '<table style="width:100%;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:30%;">Kanal Penjualan</th>' +
              '<th style="width:15%;text-align:right;">Jumlah Nota</th>' +
              '<th style="width:25%;text-align:right;">Total Omzet (Rp)</th>' +
              '<th style="width:30%;">Kontribusi Omzet</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            data.channelsBreakdown.map(function (ch) {
              let icon = '🏪';
              const sLower = ch.source.toLowerCase();
              if (sLower.includes('whatsapp') || sLower.includes('wa')) icon = '💬';
              else if (sLower.includes('shopee')) icon = '🟠';
              else if (sLower.includes('tokopedia')) icon = '🟢';
              else if (sLower.includes('tiktok')) icon = '🎵';
              else if (sLower.includes('konsinyasi')) icon = '📦';

              return '<tr>' +
                '<td><strong>' + icon + ' ' + escapeHtml(ch.source) + '</strong></td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;">' + ch.transactions_count + '</td>' +
                '<td style="text-align:right;font-weight:700;font-family:\'JetBrains Mono\',monospace;color:var(--text-main);">' + formatRupiah(ch.total_revenue) + '</td>' +
                '<td>' +
                  '<div style="display:flex;align-items:center;gap:8px;">' +
                    '<div class="channel-progress-bar" style="flex:1;">' +
                      '<div class="channel-progress-fill" style="width:' + ch.percentage + '%;"></div>' +
                    '</div>' +
                    '<span style="font-size:11.5px;font-weight:700;color:var(--primary);min-width:34px;text-align:right;">' + ch.percentage + '%</span>' +
                  '</div>' +
                '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
  } else {
    channelsHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada data penjualan pada rentang periode ini.</div>';
  }

  // 2. Render Tab Konsinyasi & Cabang
  let outletsHtml = '';
  if (data.outletsBreakdown && data.outletsBreakdown.length > 0) {
    outletsHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
        '<table style="width:100%;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:25%;">Outlet Mitra / Cabang</th>' +
              '<th style="width:12%;">Tier Harga</th>' +
              '<th style="width:12%;text-align:right;">Pcs Terjual</th>' +
              '<th style="width:12%;text-align:right;">Pcs Retur</th>' +
              '<th style="width:18%;text-align:center;">Pcs Selisih / Hilang</th>' +
              '<th style="width:21%;text-align:right;">Total Tagihan (Rp)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            data.outletsBreakdown.map(function (o) {
              const missingBadge = (o.total_missing_chargeable > 0 || o.total_missing_writeoff > 0)
                ? '<div style="font-size:11px;display:flex;flex-direction:column;gap:2px;align-items:center;">' +
                    (o.total_missing_chargeable > 0 ? '<span class="badge badge-warning" style="font-size:10px;">Ditagih: ' + o.total_missing_chargeable + ' pcs</span>' : '') +
                    (o.total_missing_writeoff > 0 ? '<span class="badge badge-neutral" style="font-size:10px;">Write-off: ' + o.total_missing_writeoff + ' pcs</span>' : '') +
                  '</div>'
                : '<span style="color:var(--text-muted);font-size:11px;">0 pcs</span>';

              return '<tr>' +
                '<td>' +
                  '<strong>' + escapeHtml(o.outlet_name) + '</strong>' +
                  '<div style="font-size:10.5px;color:var(--text-muted);">' + o.audits_count + ' kali audit opname</div>' +
                '</td>' +
                '<td><span class="badge badge-neutral">' + escapeHtml(o.price_tier) + '</span></td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;color:var(--success);">' + o.total_sold + ' pcs</td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--warning);">' + o.total_returned + ' pcs</td>' +
                '<td style="text-align:center;">' + missingBadge + '</td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--accent);font-size:13.5px;">' + formatRupiah(o.total_invoice) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
  } else {
    outletsHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada audit konsinyasi atau penjualan outlet mitra dalam periode ini.</div>';
  }

  // 3. Render Tab Penyerapan Petani Penangkar
  let farmersHtml = '';
  if (data.farmersAbsorption && data.farmersAbsorption.length > 0) {
    farmersHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
        '<table style="width:100%;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:25%;">Nama Petani / Kelompok Tani</th>' +
              '<th style="width:30%;">Varietas Benih Diserap</th>' +
              '<th style="width:15%;text-align:right;">Benih Curah</th>' +
              '<th style="width:15%;text-align:right;">Kemasan Sachet</th>' +
              '<th style="width:15%;text-align:right;">Dana Pengadaan (Rp)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            data.farmersAbsorption.map(function (f) {
              const rawStr = f.total_raw_gram >= 1000
                ? (f.total_raw_gram / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg'
                : (f.total_raw_gram > 0 ? f.total_raw_gram.toLocaleString('id-ID') + ' gr' : '-');
              const sachetStr = f.total_sachet_pcs > 0 ? f.total_sachet_pcs.toLocaleString('id-ID') + ' pcs' : '-';

              return '<tr>' +
                '<td><strong>🌾 ' + escapeHtml(f.farmer_name) + '</strong></td>' +
                '<td style="font-size:12px;color:var(--text-secondary);">' + escapeHtml(f.varieties) + '</td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + rawStr + '</td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + sachetStr + '</td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--primary);font-size:13.5px;">' + formatRupiah(f.total_payout) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
  } else {
    farmersHtml = '<div style="text-align:center;padding:32px;color:var(--text-secondary);">Belum ada data pengadaan benih dari petani penangkar pada periode ini.</div>';
  }

  // 4. Render Tab Kesehatan Stok & Peringatan Kedaluwarsa
  let stocksHtml = '';
  if (data.criticalBatches && data.criticalBatches.length > 0) {
    stocksHtml =
      '<div class="table-container" style="overflow-x:auto;">' +
        '<table style="width:100%;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:28%;">Varietas Produk Benih</th>' +
              '<th style="width:22%;">No. Batch / Lot</th>' +
              '<th style="width:12%;text-align:right;">Sisa Stok</th>' +
              '<th style="width:12%;">Tgl Expired</th>' +
              '<th style="width:12%;text-align:center;">Status Hari</th>' +
              '<th style="width:14%;text-align:right;">Valuasi Risiko (Rp)</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            data.criticalBatches.map(function (b) {
              const isDanger = b.days_left <= 30;
              const badgeClass = isDanger ? 'report-badge-risk-danger' : 'report-badge-risk-warning';
              const daysStr = b.days_left <= 0 ? 'Kedaluwarsa' : b.days_left + ' hari lagi';

              return '<tr>' +
                '<td>' +
                  '<strong>' + escapeHtml(b.product_name) + '</strong>' +
                  (b.variant ? ' <span class="badge badge-neutral" style="font-size:10px;">' + escapeHtml(b.variant) + '</span>' : '') +
                '</td>' +
                '<td><code style="font-size:11px;">' + escapeHtml(b.batch_id) + '</code></td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:600;">' + b.qty_remaining + ' ' + escapeHtml(b.unit) + '</td>' +
                '<td style="font-size:12px;">' + escapeHtml(b.expiry_date) + '</td>' +
                '<td style="text-align:center;"><span class="' + badgeClass + '">' + daysStr + '</span></td>' +
                '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--danger);">' + formatRupiah(b.risk_valuation) + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>';
  } else {
    stocksHtml = '<div style="text-align:center;padding:32px;color:var(--success);">✅ Semua persediaan benih berada dalam kondisi aman (> 60 hari dari kedaluwarsa).</div>';
  }

  // 5. Render Tab Rotasi Produk (Top 5 Laris vs 5 Slow-Moving)
  let productsHtml =
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
      '<div>' +
        '<h4 style="margin-bottom:10px;color:var(--primary);display:flex;align-items:center;gap:6px;">' +
          '<span>🚀 5 Produk Paling Laris</span>' +
          '<span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">(Rotasi Cepat)</span>' +
        '</h4>' +
        '<div class="table-container">' +
          '<table style="width:100%;">' +
            '<thead><tr><th>Nama Produk</th><th style="text-align:right;">Terjual</th></tr></thead>' +
            '<tbody>' +
              ((data.topProducts && data.topProducts.length > 0) ? data.topProducts.map(function (p) {
                return '<tr>' +
                  '<td><strong>' + escapeHtml(p.product_name) + '</strong></td>' +
                  '<td style="text-align:right;"><span class="badge badge-success" style="font-family:\'JetBrains Mono\',monospace;">' + p.qty + ' ' + escapeHtml(p.unit) + '</span></td>' +
                '</tr>';
              }).join('') : '<tr><td colspan="2"><div style="text-align:center;padding:16px;color:var(--text-secondary);">Belum ada data transaksi.</div></td></tr>') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<h4 style="margin-bottom:10px;color:var(--warning);display:flex;align-items:center;gap:6px;">' +
          '<span>🐢 5 Produk Slow-Moving</span>' +
          '<span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">(Perputaran Lambat)</span>' +
        '</h4>' +
        '<div class="table-container">' +
          '<table style="width:100%;">' +
            '<thead><tr><th>Nama Produk</th><th style="text-align:right;">Terjual</th></tr></thead>' +
            '<tbody>' +
              ((data.slowProducts && data.slowProducts.length > 0) ? data.slowProducts.map(function (p) {
                return '<tr>' +
                  '<td><strong>' + escapeHtml(p.product_name) + '</strong></td>' +
                  '<td style="text-align:right;"><span class="badge badge-neutral" style="font-family:\'JetBrains Mono\',monospace;">' + p.qty + ' ' + escapeHtml(p.unit) + '</span></td>' +
                '</tr>';
              }).join('') : '<tr><td colspan="2"><div style="text-align:center;padding:16px;color:var(--text-secondary);">Belum ada data produk.</div></td></tr>') +
            '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>' +
    '</div>';

  content.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title">Laporan Penjualan &amp; Margin FIFO</h1>' +
        '<p class="page-subtitle">Analisis menyeluruh kinerja keuangan, margin FIFO asli per transaksi belanja, penyerapan petani, dan rotasi stok.</p>' +
      '</div>' +
    '</div>' +

    '<!-- SWITCHER TAB UTAMA MODUL LAPORAN -->' +
    '<div class="laporan-nav-switcher">' +
      '<button type="button" class="laporan-nav-tab-btn active" onclick="switchLaporanMainView(\'sales\')">📈 Laporan Penjualan &amp; Margin FIFO</button>' +
      '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi Aset</button>' +
    '</div>' +

    '<!-- BAR FILTER PERIODE FLEKSIBEL & TOMBOL AKSI -->' +
    '<div class="report-filter-bar">' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span style="font-size:11.5px;font-weight:700;color:var(--text-secondary);margin-right:4px;">PILIHAN CEPAT:</span>' +
        '<button type="button" class="btn ' + (period === 'today' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'today\')">Hari Ini</button>' +
        '<button type="button" class="btn ' + (period === 'week' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'week\')">7 Hari</button>' +
        '<button type="button" class="btn ' + (period === 'month' ? 'btn-primary' : 'btn-secondary') + ' btn-sm" onclick="loadReport(\'month\')">Bulan Ini</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<div style="display:flex;align-items:center;gap:4px;">' +
          '<label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">Dari Tgl:</label>' +
          '<input type="date" id="report-start-date" value="' + escapeHtml(startDateVal) + '" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:4px;">' +
          '<label style="font-size:11.5px;font-weight:600;color:var(--text-secondary);">Sampai Tgl:</label>' +
          '<input type="date" id="report-end-date" value="' + escapeHtml(endDateVal) + '" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-xs);background:#fff;">' +
        '</div>' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="applyCustomReportFilter()">🔎 Terapkan</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;">' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="exportReportToCSV()" title="Unduh data laporan lengkap ke format CSV / Excel">📥 Ekspor CSV/Excel</button>' +
        '<button type="button" class="btn btn-secondary btn-sm" onclick="printReportSummary()" title="Cetak rekapitulasi laporan resmi (format A4/PDF)">🖨️ Cetak Rekap Laporan (A4/PDF)</button>' +
      '</div>' +
    '</div>' +

    '<!-- 4 KARTU RINGKASAN METRIK -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:18px;">' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Total Omzet</span><span class="stat-icon">&#128176;</span></div>' +
        '<div class="stat-value" style="font-size:22px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(summary.totalSubtotal) + '</div>' +
        '<div class="stat-meta">Kotor: ' + formatRupiah(summary.totalRevenue) + ' • ' + summary.totalTransactions + ' Nota</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Total Laba Kotor FIFO</span><span class="stat-icon">&#128200;</span></div>' +
        '<div class="stat-value" style="font-size:22px;color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(summary.grossMargin) + '</div>' +
        '<div class="stat-meta">Modal HPP: ' + formatRupiah(summary.totalCost) + '</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Rata-rata Margin (%)</span><span class="stat-icon">&#128202;</span></div>' +
        '<div class="stat-value" style="font-size:22px;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">' + summary.grossMarginPct + '%</div>' +
        '<div class="stat-meta">Margin Laba Terhadap Omzet</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Volume Nota</span><span class="stat-icon">&#129534;</span></div>' +
        '<div class="stat-value" style="font-size:22px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + summary.totalTransactions + '</div>' +
        '<div class="stat-meta">Nota Belanja Selesai Diproses</div>' +
      '</div>' +
    '</div>' +

    '<!-- TABEL RINCIAN PENJUALAN KOMPREHENSIF PER TRANSAKSI BELANJA -->' +
    '<div class="card" style="margin-bottom:20px;padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
        '<div>' +
          '<h3 style="font-size:16px;font-weight:700;color:var(--primary);display:flex;align-items:center;gap:6px;margin:0 0 2px 0;">' +
            '<span>🧾</span> Tabel Rincian Penjualan &amp; Margin FIFO' +
          '</h3>' +
          '<div style="font-size:11.5px;color:var(--text-secondary);">Daftar transaksi belanja per nota lengkap dengan HPP modal riil dan margin keuntungan.</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<input type="text" id="report-tx-search" placeholder="🔍 Cari nomor nota, pelanggan, atau metode bayar..." oninput="filterReportTransactions(this.value)" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:340px;background:#FFF;">' +
          '<span id="report-tx-count" class="badge badge-neutral" style="font-size:11.5px;font-weight:600;padding:6px 10px;">Menampilkan ' + transactionsList.length + ' transaksi</span>' +
        '</div>' +
      '</div>' +

      '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-sm);border:1px solid var(--border);">' +
        '<table id="report-transactions-table" style="width:100%;min-width:1150px;border-collapse:collapse;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:40px;text-align:center;">No</th>' +
              '<th style="width:130px;">Waktu Transaksi</th>' +
              '<th style="width:125px;">No. Nota</th>' +
              '<th style="width:140px;">Pelanggan</th>' +
              '<th style="width:100px;">Kanal</th>' +
              '<th style="width:230px;">Item Terjual</th>' +
              '<th style="width:125px;text-align:right;">Omzet (Subtotal)</th>' +
              '<th style="width:115px;text-align:right;">HPP FIFO</th>' +
              '<th style="width:125px;text-align:right;">Laba Kotor</th>' +
              '<th style="width:75px;text-align:center;">Margin</th>' +
              '<th style="width:110px;text-align:center;">Metode Bayar</th>' +
              '<th style="width:85px;text-align:center;">Aksi</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="report-tx-tbody"></tbody>' +
          '<tfoot id="report-tx-tfoot"></tfoot>' +
        '</table>' +
      '</div>' +
    '</div>' +

    '<!-- TABULASI ANALITIK PENDUKUNG (KANAL, KONSINYASI, SERAPAN PETANI, STOK EXPIRED) -->' +
    '<div class="card" style="padding:0;overflow:hidden;">' +
      '<div style="display:flex;border-bottom:1px solid var(--border);background:var(--surface-muted);padding:0 12px;overflow-x:auto;gap:4px;">' +
        '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'channels' ? 'active' : '') + '" data-tab="channels" onclick="switchReportSubtab(\'channels\')">🏢 Kontribusi Kanal</button>' +
        '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'outlets' ? 'active' : '') + '" data-tab="outlets" onclick="switchReportSubtab(\'outlets\')">🏪 Konsinyasi &amp; Cabang</button>' +
        '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'farmers' ? 'active' : '') + '" data-tab="farmers" onclick="switchReportSubtab(\'farmers\')">🌾 Penyerapan Petani Penangkar</button>' +
        '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'stocks' ? 'active' : '') + '" data-tab="stocks" onclick="switchReportSubtab(\'stocks\')">⚠️ Kesehatan Stok &amp; Expired</button>' +
        '<button type="button" class="report-tab-btn ' + (CURRENT_REPORT_SUBTAB === 'products' ? 'active' : '') + '" data-tab="products" onclick="switchReportSubtab(\'products\')">📊 Rotasi Produk (Top &amp; Slow)</button>' +
        '<button type="button" class="report-tab-btn" data-tab="stock_valuation" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi</button>' +
      '</div>' +
      '<div style="padding:16px;">' +
        '<div class="report-subtab-pane" id="report-subtab-channels" style="display:' + (CURRENT_REPORT_SUBTAB === 'channels' ? 'block' : 'none') + ';">' + channelsHtml + '</div>' +
        '<div class="report-subtab-pane" id="report-subtab-outlets" style="display:' + (CURRENT_REPORT_SUBTAB === 'outlets' ? 'block' : 'none') + ';">' + outletsHtml + '</div>' +
        '<div class="report-subtab-pane" id="report-subtab-farmers" style="display:' + (CURRENT_REPORT_SUBTAB === 'farmers' ? 'block' : 'none') + ';">' + farmersHtml + '</div>' +
        '<div class="report-subtab-pane" id="report-subtab-stocks" style="display:' + (CURRENT_REPORT_SUBTAB === 'stocks' ? 'block' : 'none') + ';">' + stocksHtml + '</div>' +
        '<div class="report-subtab-pane" id="report-subtab-products" style="display:' + (CURRENT_REPORT_SUBTAB === 'products' ? 'block' : 'none') + ';">' + productsHtml + '</div>' +
      '</div>' +
    '</div>';

  // Render baris transaksi belanja & footer tabel
  renderReportTransactionRows(transactionsList);
  updateReportTableFooter(transactionsList);
}

function exportReportToCSV() {
  if (!CURRENT_REPORT_DATA) {
    showToast('Silakan tunggu hingga data laporan selesai dimuat.', true);
    return;
  }

  const d = CURRENT_REPORT_DATA;
  const summary = d.summary || {
    totalRevenue: d.totalRevenue || 0,
    totalSubtotal: d.totalSubtotalRevenue || d.netRevenue || 0,
    totalCost: d.totalCost || 0,
    grossMargin: d.grossMargin || 0,
    grossMarginPct: d.grossMarginPct || 0,
    totalTransactions: d.totalTransactions || 0
  };
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Kios Benih Komunitas IDEP';
  const lines = [];

  function escapeCsv(val) {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return '"' + s + '"';
  }

  // Header Dokumen
  lines.push([escapeCsv(storeName), escapeCsv('LAPORAN PENJUALAN & MARGIN FIFO')].join(','));
  lines.push([escapeCsv('Periode'), escapeCsv((d.startDate || '') + ' s/d ' + (d.endDate || ''))].join(','));
  lines.push([escapeCsv('Dicetak Pada'), escapeCsv(new Date().toLocaleString('id-ID'))].join(','));
  lines.push('');

  // 1. Ringkasan Keuangan
  lines.push(escapeCsv('=== 1. RINGKASAN KINERJA KEUANGAN FIFO ==='));
  lines.push([escapeCsv('Total Omzet Kotor (Rp)'), escapeCsv(summary.totalRevenue)].join(','));
  lines.push([escapeCsv('Total Omzet Subtotal (Rp)'), escapeCsv(summary.totalSubtotal)].join(','));
  lines.push([escapeCsv('Total HPP FIFO Riil (Rp)'), escapeCsv(summary.totalCost)].join(','));
  lines.push([escapeCsv('Laba Kotor (Rp)'), escapeCsv(summary.grossMargin)].join(','));
  lines.push([escapeCsv('Persentase Margin (%)'), escapeCsv(summary.grossMarginPct + '%')].join(','));
  lines.push([escapeCsv('Volume Nota Transaksi'), escapeCsv(summary.totalTransactions)].join(','));
  lines.push('');

  // 2. Rincian Transaksi Komprehensif per Nota
  lines.push(escapeCsv('=== 2. RINCIAN TRANSAKSI PENJUALAN PER NOTA BELANJA ==='));
  lines.push([
    escapeCsv('No'),
    escapeCsv('Waktu Transaksi'),
    escapeCsv('No. Nota'),
    escapeCsv('Nama Pelanggan'),
    escapeCsv('Kanal Penjualan'),
    escapeCsv('Ringkasan Item Belanja'),
    escapeCsv('Total Kuantiti (Pcs)'),
    escapeCsv('Omzet Subtotal (Rp)'),
    escapeCsv('Pajak (Rp)'),
    escapeCsv('Total Akhir (Rp)'),
    escapeCsv('HPP FIFO Riil (Rp)'),
    escapeCsv('Laba Kotor (Rp)'),
    escapeCsv('Margin (%)'),
    escapeCsv('Metode Pembayaran'),
    escapeCsv('Status Pembayaran')
  ].join(','));

  const txs = d.transactions || [];
  txs.forEach(function (t, idx) {
    lines.push([
      escapeCsv(idx + 1),
      escapeCsv(formatReportDateTime(t.created_at)),
      escapeCsv(t.id),
      escapeCsv(t.customer_name || 'Umum'),
      escapeCsv(t.source || 'Offline'),
      escapeCsv(t.items_summary || '-'),
      escapeCsv(t.item_count || 0),
      escapeCsv(t.subtotal || 0),
      escapeCsv(t.tax || 0),
      escapeCsv(t.total || 0),
      escapeCsv(t.cogs || 0),
      escapeCsv(t.gross_profit || 0),
      escapeCsv((t.margin_pct || 0) + '%'),
      escapeCsv(t.payment_method || 'Tunai'),
      escapeCsv(t.status === 'paid' ? 'LUNAS' : 'TEMPO')
    ].join(','));
  });
  lines.push('');

  // 3. Kanal Penjualan
  lines.push(escapeCsv('=== 3. KONTRIBUSI KANAL PENJUALAN ==='));
  lines.push([escapeCsv('Kanal Penjualan'), escapeCsv('Jumlah Nota'), escapeCsv('Total Omzet (Rp)'), escapeCsv('Kontribusi (%)')].join(','));
  (d.channelsBreakdown || []).forEach(function (ch) {
    lines.push([escapeCsv(ch.source), escapeCsv(ch.transactions_count), escapeCsv(ch.total_revenue), escapeCsv(ch.percentage + '%')].join(','));
  });
  lines.push('');

  // 4. Konsinyasi & Cabang
  lines.push(escapeCsv('=== 4. REKAPITULASI MITRA KONSINYASI & OUTLET CABANG ==='));
  lines.push([escapeCsv('Nama Outlet Mitra'), escapeCsv('Tier Harga'), escapeCsv('Pcs Terjual'), escapeCsv('Pcs Retur'), escapeCsv('Pcs Selisih Ditagih'), escapeCsv('Pcs Selisih Write-off'), escapeCsv('Total Tagihan Terbit (Rp)')].join(','));
  (d.outletsBreakdown || []).forEach(function (o) {
    lines.push([escapeCsv(o.outlet_name), escapeCsv(o.price_tier), escapeCsv(o.total_sold), escapeCsv(o.total_returned), escapeCsv(o.total_missing_chargeable), escapeCsv(o.total_missing_writeoff), escapeCsv(o.total_invoice)].join(','));
  });
  lines.push('');

  // 5. Serapan Petani Penangkar
  lines.push(escapeCsv('=== 5. PENYERAPAN HASIL PANEN PETANI PENANGKAR ==='));
  lines.push([escapeCsv('Nama Petani'), escapeCsv('Varietas Benih Diserap'), escapeCsv('Benih Curah (Gram)'), escapeCsv('Kemasan Sachet (Pcs)'), escapeCsv('Dana Pengadaan Terserap (Rp)')].join(','));
  (d.farmersAbsorption || []).forEach(function (f) {
    lines.push([escapeCsv(f.farmer_name), escapeCsv(f.varieties), escapeCsv(f.total_raw_gram), escapeCsv(f.total_sachet_pcs), escapeCsv(f.total_payout)].join(','));
  });
  lines.push('');

  // 6. Stok Kritis & Risiko Kedaluwarsa
  lines.push(escapeCsv('=== 6. PERINGATAN KESEHATAN STOK & RISIKO KEDALUWARSA ==='));
  lines.push([escapeCsv('Varietas Produk'), escapeCsv('No. Batch / Lot'), escapeCsv('Sisa Stok'), escapeCsv('Tanggal Kedaluwarsa'), escapeCsv('Sisa Hari'), escapeCsv('Valuasi Modal Berisiko (Rp)')].join(','));
  (d.criticalBatches || []).forEach(function (b) {
    lines.push([escapeCsv(b.product_name + (b.variant ? ' (' + b.variant + ')' : '')), escapeCsv(b.batch_id), escapeCsv(b.qty_remaining + ' ' + b.unit), escapeCsv(b.expiry_date), escapeCsv(b.days_left), escapeCsv(b.risk_valuation)].join(','));
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = 'Laporan_Penjualan_Kios_IDEP_' + (d.startDate || 'start') + '_' + (d.endDate || 'end') + '.csv';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Laporan CSV berhasil diunduh: ' + filename);
}

function printReportSummary() {
  if (!CURRENT_REPORT_DATA) {
    showToast('Silakan tunggu hingga data laporan selesai dimuat.', true);
    return;
  }

  const d = CURRENT_REPORT_DATA;
  const summary = d.summary || {
    totalRevenue: d.totalRevenue || 0,
    totalSubtotal: d.totalSubtotalRevenue || d.netRevenue || 0,
    totalCost: d.totalCost || 0,
    grossMargin: d.grossMargin || 0,
    grossMarginPct: d.grossMarginPct || 0,
    totalTransactions: d.totalTransactions || 0
  };
  const storeName = (APP_SETTINGS && APP_SETTINGS['store_name']) ? APP_SETTINGS['store_name'] : 'Kios Benih Komunitas IDEP';
  const storeAddress = (APP_SETTINGS && APP_SETTINGS['store_address']) ? APP_SETTINGS['store_address'] : 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = (APP_SETTINGS && APP_SETTINGS['store_phone']) ? APP_SETTINGS['store_phone'] : '';
  const storeLogo = (APP_SETTINGS && APP_SETTINGS['store_logo']) ? APP_SETTINGS['store_logo'] : '';

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const txs = d.transactions || [];
  const txRowsHtml = txs.map(function (t, idx) {
    return '<tr>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;white-space:nowrap;">' + formatReportDateTime(t.created_at) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-family:monospace;font-weight:bold;">' + escapeHtml(t.id) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;">' + escapeHtml(t.customer_name || 'Umum') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;">' + escapeHtml(t.source || 'Offline') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-size:10px;">' + escapeHtml(t.items_summary || '-') + ' (' + (t.item_count || 0) + ' pcs)</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(t.subtotal) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(t.cogs) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;color:#1e7e34;">' + formatRupiah(t.gross_profit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;font-family:monospace;">' + (t.margin_pct || 0) + '%</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + escapeHtml(t.payment_method || 'Tunai') + ' (' + (t.status === 'paid' ? 'LUNAS' : 'TEMPO') + ')</td>' +
    '</tr>';
  }).join('');

  const reportLogoHeaderHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:200px;margin:0 auto 6px auto;display:block;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:16px;">' +
      reportLogoHeaderHtml +
      '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
      '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;border-radius:4px;font-size:12px;font-weight:700;">' +
        'REKAPITULASI LAPORAN PENJUALAN &amp; MARGIN FIFO' +
      '</div>' +
      '<div style="font-size:11px;color:#666;margin-top:4px;">' +
        'Periode Transaksi: <strong>' + escapeHtml(d.startDate) + '</strong> s/d <strong>' + escapeHtml(d.endDate) + '</strong> &bull; Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
      '</div>' +
    '</div>' +

    '<!-- 1. RINGKASAN FINANSIAL -->' +
    '<h4 style="font-size:12px;margin-bottom:6px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:3px;">1. Ringkasan Kinerja Penjualan &amp; Laba FIFO</h4>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px;">' +
      '<tr>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Total Omzet Bersih:</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;font-weight:700;font-family:monospace;">' + formatRupiah(summary.totalSubtotal) + '</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Total Modal HPP FIFO:</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;width:25%;font-weight:700;font-family:monospace;">' + formatRupiah(summary.totalCost) + '</td>' +
      '</tr>' +
      '<tr>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;background:#f9f9f9;">Laba Kotor (FIFO Riil):</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;color:#1e7e34;font-family:monospace;">' + formatRupiah(summary.grossMargin) + ' (' + summary.grossMarginPct + '%)</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;background:#f9f9f9;">Volume Nota Transaksi:</td>' +
        '<td style="padding:4px 8px;border:1px solid #ddd;font-weight:700;font-family:monospace;">' + summary.totalTransactions + ' Nota</td>' +
      '</tr>' +
    '</table>' +

    '<!-- 2. TABEL RINCIAN TRANSAKSI PER NOTA -->' +
    '<h4 style="font-size:12px;margin-bottom:6px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:3px;">2. Rincian Transaksi Belanja &amp; Laba Kotor FIFO</h4>' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
      '<thead>' +
        '<tr style="background:#f0f0f0;">' +
          '<th style="border:1px solid #ddd;padding:4px;">No</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">Waktu</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">No. Nota</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">Pelanggan</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">Kanal</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">Item Terjual</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;">Subtotal</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;">HPP FIFO</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;">Laba Kotor</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:center;">Margin</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:center;">Pembayaran</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        (txRowsHtml || '<tr><td colspan="11" style="border:1px solid #ddd;text-align:center;padding:10px;">Tidak ada transaksi belanja dalam periode ini.</td></tr>') +
      '</tbody>' +
      '<tfoot>' +
        '<tr style="background:#f0f0f0;font-weight:bold;">' +
          '<td colspan="6" style="border:1px solid #ddd;padding:6px;text-align:right;">TOTAL AKUMULASI:</td>' +
          '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;">' + formatRupiah(summary.totalSubtotal) + '</td>' +
          '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;">' + formatRupiah(summary.totalCost) + '</td>' +
          '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;color:#1e7e34;">' + formatRupiah(summary.grossMargin) + '</td>' +
          '<td style="border:1px solid #ddd;padding:6px;text-align:center;font-family:monospace;">' + summary.grossMarginPct + '%</td>' +
          '<td style="border:1px solid #ddd;padding:6px;"></td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>' +

    '<!-- 3. TANDA TANGAN PENGESAHAN -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:28px;padding:0 24px;font-size:11px;page-break-inside:avoid;">' +
      '<div style="text-align:center;width:200px;">' +
        '<div>Disusun Oleh,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Petugas / Kasir Toko</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:160px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
      '</div>' +
      '<div style="text-align:center;width:200px;">' +
        '<div>Diverifikasi &amp; Disetujui,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Manajer / Keuangan Kios IDEP</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:160px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  window.print();
  setTimeout(function () {
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
  }, 1000);
}

// ========================= LAPORAN POSISI STOK, VALUASI ASET & STOCK OPNAME =========================

function loadSalesReportView(forceRefresh) {
  if (forceRefresh) {
    invalidateCache('report');
  }
  loadReport(CURRENT_REPORT_FILTER);
}

function filterLaporanPeriod(p) {
  CURRENT_REPORT_FILTER.period = p;
  loadSalesReportView(true);
}

function loadStockValuationView() {
  loadStockValuationReport(true);
}

function switchLaporanMainView(viewName) {
  CURRENT_LAPORAN_VIEW = viewName || 'sales';
  if (CURRENT_LAPORAN_VIEW === 'stock_valuation') {
    loadStockValuationReport();
  } else {
    loadReport(CURRENT_REPORT_FILTER);
  }
}

function loadStockValuationReport(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && STOCK_VALUATION_DATA) {
    drawStockValuationUI(STOCK_VALUATION_DATA);
    return;
  }

  content.innerHTML =
    '<div class="card">' +
      '<div class="empty-state">' +
        '<span class="sync-spinner" style="display:inline-block;width:28px;height:28px;margin-bottom:10px;"></span><br>' +
        'Mengambil posisi stok riil, menghitung valuasi aset FIFO, dan memetakan status benih...' +
      '</div>' +
    '</div>';

  setProgressLoading(true);
  api('getStockValuationReport', TOKEN).then(function (res) {
    setProgressLoading(false);
    if (!res || !res.success) {
      showToast('Gagal memuat laporan stok: ' + (res ? res.message : 'Respon kosong'), true);
      return;
    }
    STOCK_VALUATION_DATA = res;
    drawStockValuationUI(res);
  }).catch(function (err) {
    setProgressLoading(false);
    showToast('Gagal mengambil laporan posisi stok: ' + (err.message || err), true);
  });
}

function drawStockValuationUI(data) {
  const content = document.getElementById('content');
  if (!content) return;

  data = data || { summary: {}, items: [] };
  const summary = data.summary || {
    totalVarieties: 0,
    totalPackedPcs: 0,
    totalBulkGrams: 0,
    totalAssetValue: 0
  };

  // Format Bulk Grams / Kg
  let bulkStr = '0 gr';
  if (summary.totalBulkGrams >= 1000) {
    bulkStr = (summary.totalBulkGrams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg';
  } else if (summary.totalBulkGrams > 0) {
    bulkStr = summary.totalBulkGrams.toLocaleString('id-ID') + ' gr';
  }

  content.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title">Laporan Posisi Stok &amp; Valuasi Aset</h1>' +
        '<p class="page-subtitle">Monitoring posisi inventaris benih aktif, valuasi modal metode FIFO, kesegaran lot batch, dan lembar kerja opname fisik.</p>' +
      '</div>' +
    '</div>' +

    '<!-- SWITCHER TAB UTAMA MODUL LAPORAN -->' +
    '<div class="laporan-nav-switcher">' +
      '<button type="button" class="laporan-nav-tab-btn" onclick="switchLaporanMainView(\'sales\')">📈 Laporan Penjualan &amp; Margin FIFO</button>' +
      '<button type="button" class="laporan-nav-tab-btn active" onclick="switchLaporanMainView(\'stock_valuation\')">📦 Posisi Stok &amp; Valuasi Aset</button>' +
    '</div>' +

    '<!-- 4 KARTU RINGKASAN METRIK (KPI) -->' +
    '<div class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:18px;">' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Varietas Aktif</span><span class="stat-icon">🌱</span></div>' +
        '<div class="stat-value" style="font-size:24px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + summary.totalVarieties + '</div>' +
        '<div class="stat-meta">Ragam Varietas Benih Siap Salur</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Total Sachet Siap Jual</span><span class="stat-icon">📦</span></div>' +
        '<div class="stat-value" style="font-size:24px;color:var(--primary);font-family:\'JetBrains Mono\',monospace;">' + summary.totalPackedPcs.toLocaleString('id-ID') + ' pcs</div>' +
        '<div class="stat-meta">Kemasan Retail Eceran Toko</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Total Stok Curah</span><span class="stat-icon">🌾</span></div>' +
        '<div class="stat-value" style="font-size:24px;color:var(--text-main);font-family:\'JetBrains Mono\',monospace;">' + bulkStr + '</div>' +
        '<div class="stat-meta">Bahan Baku Gudang Penangkaran</div>' +
      '</div>' +
      '<div class="stat-card">' +
        '<div class="stat-header"><span class="stat-label">Total Valuasi Aset</span><span class="stat-icon">💰</span></div>' +
        '<div class="stat-value" style="font-size:24px;color:var(--success);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(summary.totalAssetValue) + '</div>' +
        '<div class="stat-meta">Akumulasi Nilai Modal FIFO Riil</div>' +
      '</div>' +
    '</div>' +

    '<!-- BILAH FILTER & AKSI INTERAKTIF -->' +
    '<div class="card" style="margin-bottom:20px;padding:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:280px;">' +
          '<input type="text" id="stock-val-search" placeholder="🔍 Cari varietas benih atau ID batch..." oninput="filterStockValuationTable()" style="padding:7px 12px;font-size:12.5px;border:1px solid var(--border);border-radius:var(--radius-sm);width:100%;max-width:260px;background:#FFF;">' +
          '<select id="stock-val-type-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#FFF;">' +
            '<option value="all">Semua Tipe Stok</option>' +
            '<option value="packed">Kemasan Sachet (Pcs)</option>' +
            '<option value="bulk">Baku / Curah (Gr)</option>' +
          '</select>' +
          '<select id="stock-val-status-filter" onchange="filterStockValuationTable()" style="padding:7px 10px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#FFF;">' +
            '<option value="all">Semua Peringatan / Status</option>' +
            '<option value="AMAN">🟢 Aman &amp; Segar</option>' +
            '<option value="MENIPIS">⚠️ Stok Menipis</option>' +
            '<option value="UJI_ULANG">🔬 Butuh Uji Semai Ulang</option>' +
            '<option value="KEDALUWARSA">⛔ Kedaluwarsa</option>' +
          '</select>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="loadStockValuationReport(true)" title="Segarkan Data">&#8635; Segarkan</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="printStockValuationA4()" title="Cetak Laporan Valuasi Aset Modal format A4 Resmi">🖨️ Cetak Valuasi Aset (A4)</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="printStockOpnameSheetA4()" title="Cetak Lembar Kerja Stock Opname Fisik format A4 (Harga disembunyikan)">📋 Cetak Lembar Opname Fisik (A4)</button>' +
        '</div>' +
      '</div>' +

      '<div class="table-container" style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-sm);border:1px solid var(--border);">' +
        '<table id="stock-valuation-table" style="width:100%;min-width:1050px;border-collapse:collapse;">' +
          '<thead>' +
            '<tr>' +
              '<th style="width:40px;text-align:center;">No</th>' +
              '<th style="width:240px;">Varietas Benih</th>' +
              '<th style="width:130px;">Tipe</th>' +
              '<th style="width:180px;">Kode Batch FIFO</th>' +
              '<th style="width:110px;text-align:right;">Sisa Stok</th>' +
              '<th style="width:120px;text-align:right;">HPP Satuan</th>' +
              '<th style="width:130px;text-align:right;">Nilai Valuasi (Rp)</th>' +
              '<th style="width:160px;text-align:center;">Status &amp; Usia</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody id="stock-val-tbody"></tbody>' +
          '<tfoot id="stock-val-tfoot"></tfoot>' +
        '</table>' +
      '</div>' +
    '</div>';

  filterStockValuationTable();
}

function filterStockValuationTable() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items)) return;

  const searchEl = document.getElementById('stock-val-search');
  const typeEl = document.getElementById('stock-val-type-filter');
  const statusEl = document.getElementById('stock-val-status-filter');

  const query = (searchEl ? searchEl.value : '').trim().toLowerCase();
  const type = typeEl ? typeEl.value : 'all';
  const status = statusEl ? statusEl.value : 'all';

  let filtered = STOCK_VALUATION_DATA.items;

  if (query) {
    filtered = filtered.filter(function (item) {
      const nameMatch = String(item.product_name || '').toLowerCase().includes(query);
      const batchMatch = String(item.batch_id || '').toLowerCase().includes(query);
      const prodIdMatch = String(item.product_id || '').toLowerCase().includes(query);
      return nameMatch || batchMatch || prodIdMatch;
    });
  }

  if (type !== 'all') {
    filtered = filtered.filter(function (item) {
      return item.type === type;
    });
  }

  if (status !== 'all') {
    filtered = filtered.filter(function (item) {
      return item.status === status;
    });
  }

  renderStockValuationRows(filtered);
  updateStockValuationFooter(filtered);
}

function renderStockValuationRows(items) {
  const tbody = document.getElementById('stock-val-tbody');
  if (!tbody) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-secondary);">Tidak ada batch stok yang sesuai dengan filter atau kata kunci.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(function (item, idx) {
    let badgeHtml = '';
    if (item.status === 'KEDALUWARSA') {
      badgeHtml = '<span class="badge-stock-expired">⛔ Kedaluwarsa</span>';
    } else if (item.status === 'MENIPIS') {
      badgeHtml = '<span class="badge-stock-low">⚠️ Stok Menipis</span>';
    } else if (item.status === 'UJI_ULANG') {
      badgeHtml = '<span class="badge-stock-retest">🔬 Butuh Uji Ulang</span>';
    } else {
      badgeHtml = '<span class="badge-stock-safe">🟢 Aman &amp; Segar</span>';
    }

    const typeBadge = item.type === 'bulk'
      ? '<span class="badge badge-neutral" style="font-size:11px;background:#eef2f6;color:#334155;">🌾 Curah (' + escapeHtml(item.unit) + ')</span>'
      : '<span class="badge badge-neutral" style="font-size:11px;background:#e8f4fd;color:#0369a1;">📦 Sachet (' + escapeHtml(item.unit) + ')</span>';

    return '<tr>' +
      '<td style="text-align:center;font-size:12px;color:var(--text-muted);">' + (idx + 1) + '</td>' +
      '<td>' +
        '<div style="font-weight:600;color:var(--text-main);font-size:12.5px;">' + escapeHtml(item.product_name) + '</div>' +
        '<div style="font-size:10.5px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;">ID: ' + escapeHtml(item.product_id) + '</div>' +
      '</td>' +
      '<td>' + typeBadge + '</td>' +
      '<td>' +
        '<code style="font-family:\'JetBrains Mono\',monospace;font-size:12px;font-weight:700;color:var(--primary);">' + escapeHtml(item.batch_id) + '</code>' +
        '<div style="font-size:10.5px;color:var(--text-muted);">Exp: ' + escapeHtml(item.expiry_date || '-') + '</div>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--text-main);font-size:13px;">' +
        item.current_stock.toLocaleString('id-ID') + ' <span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">' + escapeHtml(item.unit) + '</span>' +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;color:var(--text-secondary);font-size:12.5px;">' +
        formatRupiah(item.hpp_unit) +
      '</td>' +
      '<td style="text-align:right;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);font-size:13px;background:rgba(46,125,50,0.04);">' +
        formatRupiah(item.total_value) +
      '</td>' +
      '<td style="text-align:center;">' +
        badgeHtml +
        '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Usia simpan: ' + item.age_days + ' hari</div>' +
        (item.status === 'UJI_ULANG'
          ? '<button type="button" class="btn btn-xs" style="margin-top:4px;background:#f59e0b;color:#ffffff;border:none;padding:3px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:4px;" onclick="openQCEntryModal(\'' + escapeHtml(item.batch_id) + '\', \'UJI_BERKALA\')">🔬 Uji Berkala</button>'
          : '') +
      '</td>' +
    '</tr>';
  }).join('');
}

function updateStockValuationFooter(items) {
  const tfoot = document.getElementById('stock-val-tfoot');
  if (!tfoot) return;

  items = items || [];
  const totalVal = items.reduce(function (sum, it) { return sum + Number(it.total_value || 0); }, 0);
  const totalBatches = items.length;

  tfoot.innerHTML =
    '<tr>' +
      '<th colspan="6" style="text-align:right;padding:12px;font-weight:700;color:var(--text-main);background:var(--surface-muted);font-size:12.5px;">' +
        'TOTAL AKUMULASI NILAI ASET (' + totalBatches + ' Batch):' +
      '</th>' +
      '<th style="text-align:right;padding:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:var(--success);background:rgba(46,125,50,0.12);font-size:14px;">' +
        formatRupiah(totalVal) +
      '</th>' +
      '<th style="background:var(--surface-muted);"></th>' +
    '</tr>';
}

function printStockValuationA4() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items)) {
    showToast('Data laporan stok belum siap untuk dicetak.', true);
    return;
  }

  const s = APP_SETTINGS || {};
  const storeName = s.store_name || 'Kios Benih Komunitas IDEP';
  const storeAddress = s.store_address || 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = s.store_phone || '';
  const storeLogo = s.store_logo || s.store_logo_light || '';

  const summary = STOCK_VALUATION_DATA.summary || {};
  const items = STOCK_VALUATION_DATA.items || [];

  let bulkStr = '0 gr';
  if (summary.totalBulkGrams >= 1000) {
    bulkStr = (summary.totalBulkGrams / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg';
  } else if (summary.totalBulkGrams > 0) {
    bulkStr = (summary.totalBulkGrams || 0).toLocaleString('id-ID') + ' gr';
  }

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const logoHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:180px;display:block;margin:0 auto 6px auto;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  const rowsHtml = items.map(function (it, idx) {
    return '<tr>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;"><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;">' + (it.type === 'bulk' ? 'Curah' : 'Sachet') + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;font-family:monospace;font-size:10px;">' + escapeHtml(it.batch_id) + '<br><span style="color:#666;">Exp: ' + escapeHtml(it.expiry_date || '-') + '</span></td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;">' + it.current_stock.toLocaleString('id-ID') + ' ' + escapeHtml(it.unit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;">' + formatRupiah(it.hpp_unit) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:right;font-family:monospace;font-weight:bold;color:#1e7e34;">' + formatRupiah(it.total_value) + '</td>' +
      '<td style="border:1px solid #ddd;padding:4px;text-align:center;font-size:10px;">' + escapeHtml(it.status) + ' (' + it.age_days + ' hr)</td>' +
    '</tr>';
  }).join('');

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:14px;">' +
      logoHtml +
      '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
      '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:0.5px;">' +
        'LAPORAN VALUASI ASET &amp; POSISI STOK BENIH' +
      '</div>' +
      '<div style="font-size:10.5px;color:#666;margin-top:4px;">' +
        'Dicetak Pada: ' + new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' &bull; Oleh: ' + escapeHtml(CURRENT_USER ? CURRENT_USER.name : 'Kasir / Admin Toko') +
      '</div>' +
    '</div>' +

    '<!-- 4 KOTAK KPI RINGKASAN HORIZONTAL -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px;">' +
      '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Varietas Aktif:</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;font-weight:bold;font-family:monospace;">' + (summary.totalVarieties || 0) + ' Jenis Tanaman</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;background:#f9f9f9;">Sachet Siap Jual:</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;width:25%;font-weight:bold;font-family:monospace;">' + (summary.totalPackedPcs || 0).toLocaleString('id-ID') + ' pcs</td>' +
      '</tr>' +
      '<tr>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;background:#f9f9f9;">Total Benih Curah:</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;font-family:monospace;">' + bulkStr + '</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;background:#f9f9f9;">Total Valuasi Aset Modal:</td>' +
        '<td style="padding:6px 8px;border:1px solid #ddd;font-weight:bold;color:#1e7e34;font-family:monospace;">' + formatRupiah(summary.totalAssetValue || 0) + '</td>' +
      '</tr>' +
    '</table>' +

    '<!-- TABEL RINCIAN VALUASI ASET PER BATCH -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
      '<thead>' +
        '<tr style="background:#f0f0f0;">' +
          '<th style="border:1px solid #ddd;padding:4px;width:28px;">No</th>' +
          '<th style="border:1px solid #ddd;padding:4px;">Varietas Benih</th>' +
          '<th style="border:1px solid #ddd;padding:4px;width:60px;">Tipe</th>' +
          '<th style="border:1px solid #ddd;padding:4px;width:140px;">Kode Batch FIFO</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:80px;">Sisa Stok</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:75px;">HPP Satuan</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:right;width:95px;">Nilai Valuasi (Rp)</th>' +
          '<th style="border:1px solid #ddd;padding:4px;text-align:center;width:85px;">Status</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        (rowsHtml || '<tr><td colspan="8" style="border:1px solid #ddd;text-align:center;padding:10px;">Tidak ada batch persediaan aktif.</td></tr>') +
      '</tbody>' +
      '<tfoot>' +
        '<tr style="background:#f0f0f0;font-weight:bold;">' +
          '<td colspan="6" style="border:1px solid #ddd;padding:6px;text-align:right;">TOTAL AKUMULASI NILAI ASET MODAL:</td>' +
          '<td style="border:1px solid #ddd;padding:6px;text-align:right;font-family:monospace;color:#1e7e34;font-size:11.5px;">' + formatRupiah(summary.totalAssetValue || 0) + '</td>' +
          '<td style="border:1px solid #ddd;padding:6px;"></td>' +
        '</tr>' +
      '</tfoot>' +
    '</table>' +

    '<!-- 2 KOLOM TANDA TANGAN PENGESAHAN -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:28px;padding:0 24px;font-size:11px;page-break-inside:avoid;">' +
      '<div style="text-align:center;width:220px;">' +
        '<div>Dibuat Oleh,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Kasir / Pengelola Persediaan</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
      '</div>' +
      '<div style="text-align:center;width:220px;">' +
        '<div>Diketahui Oleh,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Manajer Toko / Yayasan IDEP</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Tanggal: ________________</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  document.body.classList.add('printing-stock-report');

  const cleanup = function () {
    document.body.classList.remove('printing-stock-report');
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
  setTimeout(cleanup, 2000);
}

function printStockOpnameSheetA4() {
  if (!STOCK_VALUATION_DATA || !Array.isArray(STOCK_VALUATION_DATA.items)) {
    showToast('Data lembar opname stok belum siap untuk dicetak.', true);
    return;
  }

  const s = APP_SETTINGS || {};
  const storeName = s.store_name || 'Kios Benih Komunitas IDEP';
  const storeAddress = s.store_address || 'Banjar Baturinggit, Desa Belayu, Kec. Marga, Tabanan - Bali';
  const storePhone = s.store_phone || '';
  const storeLogo = s.store_logo || s.store_logo_light || '';

  const items = STOCK_VALUATION_DATA.items || [];

  let existingPrintArea = document.getElementById('print-report-container');
  if (existingPrintArea) existingPrintArea.remove();

  const printContainer = document.createElement('div');
  printContainer.id = 'print-report-container';
  printContainer.className = 'print-report-area';

  const logoHtml = storeLogo
    ? '<img src="' + escapeHtml(storeLogo) + '" alt="Logo" style="max-height:55px;max-width:180px;display:block;margin:0 auto 6px auto;object-fit:contain;">'
    : '<h2 style="margin:0 0 4px 0;font-size:18px;text-transform:uppercase;letter-spacing:0.5px;color:#1A1A1A;">' + escapeHtml(storeName) + '</h2>';

  // Baris tabel opname (SEMUA HARGA / HPP / VALUASI UANG DISEMBUNYIKAN)
  const rowsHtml = items.map(function (it, idx) {
    return '<tr>' +
      '<td style="border:1px solid #333;padding:5px 3px;text-align:center;font-size:10px;">' + (idx + 1) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;font-size:10.5px;"><strong>' + escapeHtml(it.product_name) + '</strong></td>' +
      '<td style="border:1px solid #333;padding:5px 4px;text-align:center;font-size:10px;">' + escapeHtml(it.unit) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;font-family:monospace;font-size:10px;">' + escapeHtml(it.batch_id) + '</td>' +
      '<td style="border:1px solid #333;padding:5px 6px;text-align:right;font-family:monospace;font-size:11px;font-weight:bold;">' + it.current_stock.toLocaleString('id-ID') + '</td>' +
      '<td style="border:1px solid #333;padding:4px;width:75px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
      '<td style="border:1px solid #333;padding:4px;width:65px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
      '<td style="border:1px solid #333;padding:4px;width:120px;background:#fff;"><div style="height:22px;border:1px dashed #aaa;"></div></td>' +
    '</tr>';
  }).join('');

  printContainer.innerHTML =
    '<div style="text-align:center;border-bottom:2.5px solid #333;padding-bottom:12px;margin-bottom:12px;">' +
      logoHtml +
      '<div style="font-size:11px;color:#555;margin-top:2px;">' + escapeHtml(storeAddress) + (storePhone ? ' • Telp/WA: ' + escapeHtml(storePhone) : '') + '</div>' +
      '<div style="margin-top:8px;display:inline-block;padding:4px 14px;background:#f0f0f0;border-radius:4px;font-size:13px;font-weight:700;letter-spacing:0.5px;">' +
        'LEMBAR STOCK OPNAME FISIK PERSEDIAAN BENIH' +
      '</div>' +
      '<div style="font-size:10.5px;color:#666;margin-top:4px;">' +
        'Tanggal Audit: ___________________ &bull; Lokasi Gudang: Gudang Utama Kios IDEP &bull; Dicetak: ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) +
      '</div>' +
    '</div>' +

    '<div style="font-size:10px;color:#555;margin-bottom:8px;padding:4px 8px;background:#fdf6e2;border-left:3px solid #b78103;">' +
      '<strong>Petunjuk Checker:</strong> Hitung kuantitas fisik riil di rak/wadah penyimpanan, tuliskan angka hasil hitung pada kolom <em>Hitungan Fisik Nyata</em>, hitung selisihnya (+/-), dan catat kondisi kemasan jika ada kerusakan.' +
    '</div>' +

    '<!-- TABEL PENGHITUNGAN FISIK LAPANGAN -->' +
    '<table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px;">' +
      '<thead>' +
        '<tr style="background:#f0f0f0;">' +
          '<th style="border:1px solid #333;padding:5px 3px;width:26px;text-align:center;">No</th>' +
          '<th style="border:1px solid #333;padding:5px 6px;text-align:left;">Varietas Benih</th>' +
          '<th style="border:1px solid #333;padding:5px 4px;width:55px;text-align:center;">Kemasan</th>' +
          '<th style="border:1px solid #333;padding:5px 6px;width:150px;text-align:left;">Kode Batch FIFO</th>' +
          '<th style="border:1px solid #333;padding:5px 6px;width:75px;text-align:right;">Stok Sistem</th>' +
          '<th style="border:1px solid #333;padding:5px 4px;width:75px;text-align:center;background:#e9f5e9;">Hitungan Fisik Nyata</th>' +
          '<th style="border:1px solid #333;padding:5px 4px;width:65px;text-align:center;background:#fff8e1;">Selisih (+/-)</th>' +
          '<th style="border:1px solid #333;padding:5px 4px;width:120px;text-align:center;">Catatan Kondisi Fisik</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>' +
        (rowsHtml || '<tr><td colspan="8" style="border:1px solid #333;text-align:center;padding:10px;">Tidak ada batch persediaan aktif untuk diopname.</td></tr>') +
      '</tbody>' +
    '</table>' +

    '<!-- 2 KOLOM TANDA TANGAN AUDIT OPNAME -->' +
    '<div style="display:flex;justify-content:space-between;margin-top:24px;padding:0 30px;font-size:11px;page-break-inside:avoid;">' +
      '<div style="text-align:center;width:220px;">' +
        '<div>Petugas Hitung Lapangan,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Checker Fisik Opname</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Nama: ________________</div>' +
      '</div>' +
      '<div style="text-align:center;width:220px;">' +
        '<div>Disaksikan &amp; Diperiksa Oleh,</div>' +
        '<div style="font-weight:700;margin-top:2px;">Saksi / Pemeriksa Opname</div>' +
        '<div style="height:55px;"></div>' +
        '<div style="border-bottom:1px solid #333;width:170px;margin:0 auto;"></div>' +
        '<div style="font-size:10px;color:#666;margin-top:3px;">Nama: ________________</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(printContainer);
  document.body.classList.add('printing-stock-report');

  const cleanup = function () {
    document.body.classList.remove('printing-stock-report');
    if (printContainer && printContainer.parentNode) {
      printContainer.parentNode.removeChild(printContainer);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(function () {
    window.print();
  }, 350);
}

let CURRENT_ROLES_PERMISSIONS = null;
let CURRENT_SELECTED_ROLE_TAB = 'Admin';
let CURRENT_USERS_LIST = [];
let CURRENT_SETTINGS_SUBTAB = 'profile';

function renderPengaturan(forceRefresh) {
  const content = document.getElementById('content');
  if (!content) return;

  if (!forceRefresh && isCacheValid('settings')) {
    drawPengaturanUI(DATA_CACHE.settings.data);
    return;
  }

  if (!DATA_CACHE.settings || !DATA_CACHE.settings.data) {
    content.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="display:inline-block;width:24px;height:24px;border:3px solid rgba(30,77,63,0.2);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px;"></span><br>Memuat pengaturan sistem...</div></div>';
  }

  api('getSettings', TOKEN).then(function (settings) {
    DATA_CACHE.settings = { data: settings || {}, timestamp: Date.now() };
    APP_SETTINGS = settings || {};
    drawPengaturanUI(settings || {});
  }).catch(function (err) {
    showToast('Gagal memuat pengaturan: ' + (err.message || err), true);
  });
}

function switchSettingsSubtab(subtab) {
  CURRENT_SETTINGS_SUBTAB = subtab;
  const tabs = ['profile', 'pricing', 'users', 'roles', 'telegram', 'danger'];
  tabs.forEach(function (t) {
    const btn = document.getElementById('tab-set-btn-' + t);
    const panel = document.getElementById('panel-set-' + t);
    if (btn) {
      if (t === subtab) {
        btn.classList.add('active');
        btn.style.background = 'var(--primary)';
        btn.style.color = '#ffffff';
        btn.style.borderColor = 'var(--primary)';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'var(--surface)';
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderColor = 'var(--border)';
      }
    }
    if (panel) panel.style.display = (t === subtab) ? 'block' : 'none';
  });

  if (subtab === 'roles') {
    loadRolePermissionsUI();
  } else if (subtab === 'users') {
    loadUsersManagementUI();
  }
}

function drawPengaturanUI(settings) {
  const content = document.getElementById('content');
  if (!content) return;

  const currentLogo = settings['store_logo'] || '';
  const currentLogoLight = settings['store_logo_light'] || '';
  const isUserAdmin = isAdmin();

  content.innerHTML =
    '<div class="page-header">' +
      '<div>' +
        '<h1 class="page-title">Pengaturan Sistem</h1>' +
        '<p class="page-subtitle">Konfigurasi profil toko, tarif pajak, format batch &amp; preset multi-tier, hak akses peran, akun pengguna, dan integrasi Bot Telegram.</p>' +
      '</div>' +
    '</div>' +

    '<!-- SUB-NAVIGASI TAB PENGATURAN -->' +
    '<div class="nav-tabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:12px;flex-wrap:wrap;">' +
      '<button type="button" id="tab-set-btn-profile" class="role-tab-btn active" style="background:var(--primary);color:#fff;border-color:var(--primary);" onclick="switchSettingsSubtab(\'profile\')">🏪 Profil Toko &amp; Pajak</button>' +
      '<button type="button" id="tab-set-btn-pricing" class="role-tab-btn" onclick="switchSettingsSubtab(\'pricing\')">🏷️ Format Batch &amp; Multi-Tier</button>' +
      (isUserAdmin ? '<button type="button" id="tab-set-btn-users" class="role-tab-btn" onclick="switchSettingsSubtab(\'users\')">👥 Kelola Akun Pengguna</button>' : '') +
      (isUserAdmin ? '<button type="button" id="tab-set-btn-roles" class="role-tab-btn" onclick="switchSettingsSubtab(\'roles\')">🛡️ Matriks Hak Akses</button>' : '') +
      (isUserAdmin ? '<button type="button" id="tab-set-btn-telegram" class="role-tab-btn" onclick="switchSettingsSubtab(\'telegram\')">🤖 Bot Telegram</button>' : '') +
      (isUserAdmin ? '<button type="button" id="tab-set-btn-danger" class="role-tab-btn" onclick="switchSettingsSubtab(\'danger\')">🚨 Zona Bahaya</button>' : '') +
    '</div>' +

    '<!-- PANEL 1: PROFIL TOKO & PAJAK -->' +
    '<div id="panel-set-profile" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'profile' ? 'block' : 'none') + ';">' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        '<div class="card">' +
          '<h3 style="margin-bottom:16px;">Profil Toko &amp; Pajak</h3>' +
          
          '<!-- 1. LOGO PRIMER (FULL COLOR / LATAR TERANG) -->' +
          '<div class="field-group">' +
            '<label class="field-label">Logo Utama (Full Color / Layar Login &amp; Struk)</label>' +
            '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px;">' +
              '<div class="logo-preview-box" id="setting-logo-preview" style="background:#fff;border:1px solid var(--border);width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);overflow:hidden;">' +
                (currentLogo
                  ? '<img src="' + escapeHtml(currentLogo) + '" alt="Logo Terpasang" style="max-width:100%;max-height:100%;object-fit:contain;">'
                  : '<span style="font-size:10px;color:var(--text-muted);text-align:center;">Belum Ada</span>') +
              '</div>' +
              '<div style="flex:1;min-width:180px;">' +
                '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
                  '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">' +
                    '📁 Upload' +
                    '<input type="file" id="set-logo-file" accept="image/*" style="display:none;" onchange="handleLogoFileUpload(this, \'set-store-logo\', \'setting-logo-preview\')">' +
                  '</label>' +
                  '<button type="button" class="btn btn-secondary btn-sm" onclick="clearLogoSetting(\'set-store-logo\', \'set-logo-file\', \'setting-logo-preview\')">Hapus</button>' +
                '</div>' +
                '<div class="input-wrapper">' +
                  '<input type="text" id="set-store-logo" placeholder="Atau paste link URL logo warna..." value="' + escapeHtml(currentLogo) + '" oninput="updateLogoPreview(this.value, \'setting-logo-preview\')" style="padding-left:14px;font-size:12px;">' +
                '</div>' +
                '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Digunakan untuk layar login, faktur minimalis, dan struk kasir.</small>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<!-- 2. LOGO SEKUNDER (PUTIH / MONOKROM / LATAR GELAP) -->' +
          '<div class="field-group">' +
            '<label class="field-label">Logo Sekunder (Putih/Monokrom / Sidebar &amp; Faktur Formal)</label>' +
            '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px;">' +
              '<div class="logo-preview-box" id="setting-logo-light-preview" style="background:var(--primary);border:1px solid var(--border);width:80px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-xs);overflow:hidden;">' +
                (currentLogoLight
                  ? '<img src="' + escapeHtml(currentLogoLight) + '" alt="Logo Terpasang" style="max-width:100%;max-height:100%;object-fit:contain;">'
                  : '<span style="font-size:10px;color:#fff;text-align:center;opacity:0.8;">Belum Ada</span>') +
              '</div>' +
              '<div style="flex:1;min-width:180px;">' +
                '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">' +
                  '<label class="btn btn-secondary btn-sm" style="cursor:pointer;">' +
                    '📁 Upload' +
                    '<input type="file" id="set-logo-light-file" accept="image/*" style="display:none;" onchange="handleLogoFileUpload(this, \'set-store-logo-light\', \'setting-logo-light-preview\')">' +
                  '</label>' +
                  '<button type="button" class="btn btn-secondary btn-sm" onclick="clearLogoSetting(\'set-store-logo-light\', \'set-logo-light-file\', \'setting-logo-light-preview\')">Hapus</button>' +
                '</div>' +
                '<div class="input-wrapper">' +
                  '<input type="text" id="set-store-logo-light" placeholder="Atau paste link URL logo putih/transparan..." value="' + escapeHtml(currentLogoLight) + '" oninput="updateLogoPreview(this.value, \'setting-logo-light-preview\')" style="padding-left:14px;font-size:12px;">' +
                '</div>' +
                '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Digunakan untuk menu samping (sidebar hijau tua) dan kop faktur formal.</small>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="field-group">' +
            '<label class="field-label">Nama Toko / Kios</label>' +
            '<div class="input-wrapper">' +
              '<input type="text" id="set-store-name" value="' + escapeHtml(settings['store_name'] || '') + '" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Alamat Lengkap</label>' +
            '<div class="input-wrapper">' +
              '<input type="text" id="set-store-address" value="' + escapeHtml(settings['store_address'] || '') + '" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Kontak WhatsApp</label>' +
            '<div class="input-wrapper">' +
              '<input type="text" id="set-store-phone" value="' + escapeHtml(settings['store_phone'] || '') + '" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Tarif Pajak (PPN %)</label>' +
            '<div class="input-wrapper">' +
              '<input type="number" id="set-tax-rate" value="' + escapeHtml(settings['tax_rate'] !== undefined ? settings['tax_rate'] : '0') + '" min="0" max="100" step="0.1" style="padding-left:14px;">' +
            '</div>' +
            '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Persentase pajak yang dikenakan pada transaksi (misal: 0 untuk bebas pajak atau 11 untuk PPN 11%).</small>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Catatan Kaki Faktur</label>' +
            '<div class="input-wrapper">' +
              '<input type="text" id="set-invoice-footer" value="' + escapeHtml(settings['invoice_footer'] || 'Terima kasih atas kunjungan Anda!') + '" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" onclick="saveStoreSettings()">Simpan Profil Toko &amp; Pajak</button>' +
        '</div>' +

        '<div class="card">' +
          '<h3 style="margin-bottom:16px;">Ubah Password Akun</h3>' +
          '<div class="field-group">' +
            '<label class="field-label">Password Saat Ini</label>' +
            '<div class="input-wrapper">' +
              '<input type="password" id="set-old-pass" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Password Baru</label>' +
            '<div class="input-wrapper">' +
              '<input type="password" id="set-new-pass" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<div class="field-group">' +
            '<label class="field-label">Ulangi Password Baru</label>' +
            '<div class="input-wrapper">' +
              '<input type="password" id="set-confirm-pass" style="padding-left:14px;">' +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn btn-primary" onclick="submitChangePassword()">Perbarui Password</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- PANEL 2: FORMAT BATCH & MULTI-TIER -->' +
    '<div id="panel-set-pricing" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'pricing' ? 'block' : 'none') + ';">' +
      '<div class="card" style="margin-bottom:16px;">' +
        '<h3 style="margin-bottom:6px;">Format Kode Batch FIFO</h3>' +
        '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Template otomatis untuk menghasilkan kode lot/batch benih saat pembelian atau produksi.</p>' +
        '<div class="field-group">' +
          '<label class="field-label">Template Format Kode Batch</label>' +
          '<div class="input-wrapper">' +
            '<input type="text" id="set-batch-format" value="' + escapeHtml(settings['batch_format_template'] || settings['batch_format'] || 'BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}') + '" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;">' +
          '</div>' +
          '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Gunakan token dinamis: <code>{FARMER}</code> (inisial petani), <code>{YYMM}</code> (thn+bln exp), <code>{RAND4}</code> (4 karakter acak), <code>{SEQ}</code> (nomor urut 01, 02). Contoh: <code>BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}</code>.</small>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:gap:8px;">' +
          '<div>' +
            '<h3 style="margin-bottom:4px;">Preset Tingkat Harga (Multi-Tier Pricing)</h3>' +
            '<p style="font-size:12px;color:var(--text-secondary);margin:0;">' +
              'Standarisasi tingkatan harga jual produk (Reguler untuk eceran kasir POS, Outlet untuk cabang/mitra konsinyasi, dan Bali Buda untuk mitra khusus).' +
            '</p>' +
          '</div>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="addPriceTierPresetRow()">+ Tambah Preset Tier Baru</button>' +
        '</div>' +
        '<div class="table-container" style="overflow-x:auto;">' +
          '<table style="width:100%;margin-bottom:0;">' +
            '<thead>' +
              '<tr>' +
                '<th style="width:45%;padding:10px 14px;">Nama Tingkat Harga (Tier)</th>' +
                '<th style="width:40%;padding:10px 14px;">Nominal Bawaan / Default (Rp)</th>' +
                '<th style="width:15%;text-align:center;padding:10px 14px;">Aksi</th>' +
              '</tr>' +
            '</thead>' +
            '<tbody id="price-tier-presets-body"></tbody>' +
          '</table>' +
        '</div>' +
        '<div style="margin-top:16px;display:flex;justify-content:flex-end;">' +
          '<button type="button" class="btn btn-primary" onclick="saveStoreSettings()">💾 Simpan Format Batch &amp; Multi-Tier</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<!-- PANEL 3: MATRIKS HAK AKSES -->' +
    (isUserAdmin
      ? '<div id="panel-set-roles" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'roles' ? 'block' : 'none') + ';">' +
          '<div class="card" id="role-matrix-container">' +
            '<div class="empty-state">⏳ Memuat matriks hak akses...</div>' +
          '</div>' +
        '</div>'
      : '') +

    '<!-- PANEL 4: MANAJEMEN PENGGUNA -->' +
    (isUserAdmin
      ? '<div id="panel-set-users" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'users' ? 'block' : 'none') + ';">' +
          '<div class="card" id="users-management-container">' +
            '<div class="empty-state">⏳ Memuat daftar pengguna...</div>' +
          '</div>' +
        '</div>'
      : '') +

    '<!-- PANEL 5: INTEGRASI BOT TELEGRAM -->' +
    (isUserAdmin
      ? '<div id="panel-set-telegram" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'telegram' ? 'block' : 'none') + ';">' +
          '<div class="card" style="max-width:850px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px;padding-bottom:14px;border-bottom:1px solid var(--border);">' +
              '<div style="display:flex;align-items:center;gap:12px;">' +
                '<span style="font-size:28px;">🤖</span>' +
                '<div>' +
                  '<h3 style="margin:0;">Integrasi Bot Telegram</h3>' +
                  '<p style="font-size:12px;color:var(--text-secondary);margin:2px 0 0 0;">Push alert operasional otomatis &amp; asisten perintah dua arah E-KASIR v2.</p>' +
                '</div>' +
              '</div>' +
              '<div id="telegram-status-badge">' +
                (Boolean(settings['telegram_bot_token'] && settings['telegram_chat_id'])
                  ? '<span class="badge badge-success" style="padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">🟢 Aktif Terhubung</span>'
                  : '<span class="badge" style="background:var(--surface-muted);color:var(--text-secondary);border:1px solid var(--border);padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">⚪ Belum Dikonfigurasi</span>') +
              '</div>' +
            '</div>' +

            '<div class="field-group">' +
              '<label class="field-label">Telegram Bot Token <span style="color:var(--danger)">*</span></label>' +
              '<div class="input-wrapper" style="position:relative;">' +
                '<input type="password" id="set-tg-token" value="' + escapeHtml(settings['telegram_bot_token'] || '') + '" placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuvWXyz" style="padding-left:14px;padding-right:42px;font-family:\'JetBrains Mono\',monospace;">' +
                '<button type="button" class="input-action-btn" onclick="toggleTgTokenVisibility()" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:14px;" title="Intip Token">👁️</button>' +
              '</div>' +
              '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">Token otentikasi bot resmi yang diperoleh dari <code>@BotFather</code> di Telegram.</small>' +
            '</div>' +

            '<div class="field-group">' +
              '<label class="field-label">Target Chat ID / Channel ID <span style="color:var(--danger)">*</span></label>' +
              '<div class="input-wrapper">' +
                '<input type="text" id="set-tg-chat-id" value="' + escapeHtml(settings['telegram_chat_id'] || '') + '" placeholder="Contoh: -1001234567890 (ID Grup/Channel) atau 987654321 (ID Akun)" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;">' +
              '</div>' +
              '<small style="color:var(--text-muted);font-size:11px;margin-top:4px;display:block;">ID akun atau grup Telegram tujuan pengiriman notifikasi (gunakan bot seperti <code>@userinfobot</code> untuk cek ID).</small>' +
            '</div>' +

            '<div style="background:var(--surface-muted);padding:14px 16px;border-radius:var(--radius-xs);border:1px solid var(--border);margin-bottom:18px;">' +
              '<div style="font-size:12px;font-weight:700;color:var(--text-main);margin-bottom:10px;">Pilihan Notifikasi Otomatis (Push Alerts)</div>' +
              '<div style="display:flex;flex-direction:column;gap:10px;">' +
                '<label style="display:flex;align-items:center;gap:10px;font-size:12.5px;cursor:pointer;">' +
                  '<input type="checkbox" id="set-tg-notif-void" class="role-checkbox-custom" ' + (settings['telegram_notif_void'] !== 'false' ? 'checked' : '') + '>' +
                  '<span>⚠️ <strong>Alert Void Transaksi:</strong> Notifikasi instan saat nota kasir dibatalkan/void oleh admin.</span>' +
                '</label>' +
                '<label style="display:flex;align-items:center;gap:10px;font-size:12.5px;cursor:pointer;">' +
                  '<input type="checkbox" id="set-tg-notif-dht" class="role-checkbox-custom" ' + (settings['telegram_notif_dht'] !== 'false' ? 'checked' : '') + '>' +
                  '<span>🔥 <strong>Pengingat Oven DHT:</strong> Notifikasi saat sesi oven 24 jam dimulai dan saat selesai dikeluarkan.</span>' +
                '</label>' +
                '<label style="display:flex;align-items:center;gap:10px;font-size:12.5px;cursor:pointer;">' +
                  '<input type="checkbox" id="set-tg-notif-qc" class="role-checkbox-custom" ' + (settings['telegram_notif_qc'] !== 'false' ? 'checked' : '') + '>' +
                  '<span>⛔ <strong>Karantina &amp; Kelulusan QC:</strong> Peringatan batch benih gagal (&lt;80%) atau lolos uji mutu pasca-DHT.</span>' +
                '</label>' +
              '</div>' +
            '</div>' +

            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:20px;">' +
              '<button type="button" class="btn btn-primary" id="btn-save-tg" onclick="saveTelegramSettings()">💾 Simpan Pengaturan Bot</button>' +
              '<button type="button" class="btn btn-secondary" id="btn-test-tg" onclick="testTelegramConnectionUI()">🔔 Uji Kirim Notifikasi</button>' +
              '<button type="button" class="btn btn-secondary" id="btn-webhook-tg" onclick="setupTelegramWebhookUI()">🔗 Sinkronkan Webhook Bot</button>' +
            '</div>' +

            '<div style="background:var(--surface-muted);border-left:4px solid var(--primary);padding:14px 16px;border-radius:0 var(--radius-xs) var(--radius-xs) 0;">' +
              '<div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:6px;">📖 Panduan Perintah Dua Arah (Bot Commands)</div>' +
              '<div style="font-size:11.5px;color:var(--text-secondary);line-height:1.6;">' +
                'Setelah Webhook disinkronkan, staf dapat mengetik perintah berikut di Telegram untuk cek data secara real-time:<br>' +
                '• <code>/omzet</code> — Rekap total transaksi dan omzet kotor hari ini (tidak termasuk void)<br>' +
                '• <code>/stok [kata_kunci]</code> — Cek sisa stok fisik benih kemasan dan curah<br>' +
                '• <code>/dht</code> — Cek toples yang sedang di oven DHT dan hitung mundur sisa waktu<br>' +
                '• <code>/qc</code> — Cek jumlah toples benih curah yang menunggu uji QC<br>' +
                '• <code>/bantuan</code> — Tampilkan panduan daftar perintah' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +

    '<!-- PANEL 6: ZONA BAHAYA -->' +
    (isUserAdmin
      ? '<div id="panel-set-danger" style="display:' + (CURRENT_SETTINGS_SUBTAB === 'danger' ? 'block' : 'none') + ';">' +
          '<div class="card card-danger-zone">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">' +
              '<div>' +
                '<div style="display:flex;align-items:center;gap:8px;">' +
                  '<span style="font-size:20px;">🚨</span>' +
                  '<h3 style="margin:0;color:#b91c1c;">Zona Bahaya / Pembersihan Data Uji Coba</h3>' +
                '</div>' +
                '<p style="font-size:12.5px;color:#7f1d1d;margin:6px 0 0 0;line-height:1.4;">' +
                  'Gunakan fitur ini untuk menghapus seluruh riwayat transaksi simulasi. Data master produk dan pengaturan tidak akan terhapus.' +
                '</p>' +
              '</div>' +
              '<button type="button" class="btn btn-danger" onclick="openResetDataModal()" style="white-space:nowrap;display:inline-flex;align-items:center;gap:6px;">' +
                '🗑️ Buka Panel Reset Data' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '');

  // Inisialisasi baris preset tingkat harga
  let currentPresets = [];
  try {
    if (typeof settings['price_tiers_preset'] === 'string' && settings['price_tiers_preset'].trim()) {
      currentPresets = JSON.parse(settings['price_tiers_preset']);
    } else if (Array.isArray(settings['price_tiers_preset'])) {
      currentPresets = settings['price_tiers_preset'];
    }
  } catch (e) {
    currentPresets = [];
  }
  if (!Array.isArray(currentPresets) || currentPresets.length === 0) {
    currentPresets = getDefaultPriceTierPresets();
  }

  const tbody = document.getElementById('price-tier-presets-body');
  if (tbody) {
    tbody.innerHTML = '';
    currentPresets.forEach(function (p) {
      addPriceTierPresetRow(p.name, p.price, p.default);
    });
  }

  if (CURRENT_SETTINGS_SUBTAB === 'roles' && isUserAdmin) {
    loadRolePermissionsUI();
  } else if (CURRENT_SETTINGS_SUBTAB === 'users' && isUserAdmin) {
    loadUsersManagementUI();
  }
}

function addPriceTierPresetRow(name, price, isDefault) {
  const tbody = document.getElementById('price-tier-presets-body');
  if (!tbody) return;
  const isReg = (name || '').toLowerCase() === 'reguler';
  const tr = document.createElement('tr');
  tr.className = 'preset-tier-row';
  tr.innerHTML =
    '<td style="padding:8px 12px;">' +
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<input type="text" class="field-input preset-tier-name" value="' + escapeHtml(name || '') + '" placeholder="Misal: Reguler / Outlet / Grosir" style="width:100%;font-weight:600;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
        (isReg ? '<span class="badge badge-success" style="font-size:10px;white-space:nowrap;">Default POS</span>' : '') +
      '</div>' +
    '</td>' +
    '<td style="padding:8px 12px;">' +
      '<div class="input-wrapper" style="position:relative;">' +
        '<span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text-muted);font-weight:600;">Rp</span>' +
        '<input type="number" class="field-input preset-tier-price" value="' + (price !== undefined && price !== null && price !== '' ? Number(price) : '') + '" placeholder="0" min="0" step="100" style="width:100%;padding-left:32px;font-family:\'JetBrains Mono\',monospace;font-weight:700;padding-top:6px;padding-bottom:6px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
      '</div>' +
    '</td>' +
    '<td style="text-align:center;padding:8px 12px;">' +
      (isReg
        ? '<span style="font-size:11px;color:var(--text-muted);font-style:italic;">Tier Utama</span>'
        : '<button type="button" class="btn btn-secondary btn-sm" style="color:var(--danger);padding:4px 8px;" onclick="this.closest(\'tr\').remove()" title="Hapus Tier">🗑️ Hapus</button>') +
    '</td>';
  tbody.appendChild(tr);
}

// ========================= MATRIKS HAK AKSES (ROLES & PERMISSIONS) =========================
function loadRolePermissionsUI() {
  const container = document.getElementById('role-matrix-container');
  if (!container) return;
  if (!isAdmin()) {
    container.innerHTML = '<div class="alert-banner alert-warning">Hanya Admin yang dapat mengelola hak akses peran.</div>';
    return;
  }

  container.innerHTML = '<div class="empty-state">⏳ Memuat matriks hak akses...</div>';
  api('getRolePermissions', TOKEN).then(function (res) {
    if (res && res.permissions) {
      CURRENT_ROLES_PERMISSIONS = res.permissions;
      if (res.roles) AVAILABLE_ROLES = res.roles;
      renderRoleMatrixUI();
    }
  }).catch(function (err) {
    container.innerHTML = '<div class="alert-banner alert-danger">Gagal memuat hak akses: ' + escapeHtml(err.message || err) + '</div>';
  });
}

function renderRoleMatrixUI() {
  const container = document.getElementById('role-matrix-container');
  if (!container || !CURRENT_ROLES_PERMISSIONS) return;

  const roles = Object.keys(CURRENT_ROLES_PERMISSIONS);
  if (!CURRENT_ROLES_PERMISSIONS[CURRENT_SELECTED_ROLE_TAB]) {
    CURRENT_SELECTED_ROLE_TAB = roles[0] || 'Admin';
  }

  const roleName = CURRENT_SELECTED_ROLE_TAB;
  const perms = CURRENT_ROLES_PERMISSIONS[roleName] || {};

  const moduleNames = {
    'dashboard': 'Dashboard Ringkasan',
    'pos': 'Kasir (POS)',
    'produk': 'Katalog Produk',
    'stok': 'Stok & Batch FIFO',
    'produksi': 'Kemas Mandiri (Produksi)',
    'qc': 'Quality Control (QC)',
    'pembelian': 'Pembelian Stok',
    'konsinyasi': 'Konsinyasi Mitra',
    'piutang': 'Piutang & Tempo',
    'crm': 'Pelanggan (CRM)',
    'purnajual': 'Purna Jual & Kepuasan',
    'faktur': 'Riwayat Transaksi & Faktur',
    'laporan': 'Laporan & Valuasi Stok',
    'pengaturan': 'Pengaturan Sistem'
  };

  let roleTabsHtml = '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">';
  roles.forEach(function (r) {
    const isActive = r === roleName;
    roleTabsHtml += '<button type="button" class="role-tab-btn' + (isActive ? ' active' : '') + '" onclick="selectRoleTab(\'' + escapeHtml(r) + '\')">' +
      escapeHtml(r) + (r === 'Koordinator' ? ' (View-Only)' : '') +
    '</button>';
  });
  roleTabsHtml += '<button type="button" class="btn btn-secondary btn-sm" onclick="openRoleModal()" style="display:inline-flex;align-items:center;gap:4px;">+ Tambah Peran Baru</button>';
  roleTabsHtml += '</div>';

  let roleDesc = '';
  if (roleName === 'Admin') {
    roleDesc = '<div class="alert-banner alert-success" style="margin-bottom:14px;"><strong>🛡️ Administrator:</strong> Memiliki akses penuh (Lihat, Input/Ubah, Hapus) pada seluruh modul. Matriks terkunci demi integritas sistem.</div>';
  } else if (roleName === 'Koordinator') {
    roleDesc = '<div class="alert-banner alert-info" style="margin-bottom:14px;"><strong>👁️ Koordinator Program:</strong> Memiliki hak akses baca/pantau (View-Only) ke seluruh modul, tanpa izin memodifikasi atau menghapus data.</div>';
  } else {
    roleDesc = '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;">Atur centang izin akses per modul untuk peran <strong>' + escapeHtml(roleName) + '</strong>.</p>';
  }

  let tableHtml =
    '<div class="table-container" style="overflow-x:auto;">' +
      '<table class="role-matrix-table" style="width:100%;margin-bottom:0;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:40px;text-align:center;">No</th>' +
            '<th>Modul Sistem</th>' +
            '<th style="width:140px;text-align:center;">👁️ [Lihat]</th>' +
            '<th style="width:140px;text-align:center;">✏️ [Input/Ubah]</th>' +
            '<th style="width:140px;text-align:center;">🗑️ [Hapus/Batal]</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  const modules = Object.keys(moduleNames);
  modules.forEach(function (mKey, idx) {
    const mod = perms[mKey] || { can_view: false, can_edit: false, can_delete: false };
    const isAdminRole = roleName === 'Admin';
    const isKoordinator = roleName === 'Koordinator';

    const viewChecked = isAdminRole || isKoordinator || !!mod.can_view;
    const editChecked = isAdminRole ? true : (isKoordinator ? false : !!mod.can_edit);
    const delChecked = isAdminRole ? true : (isKoordinator ? false : !!mod.can_delete);

    const viewDisabled = isAdminRole || isKoordinator;
    const editDisabled = isAdminRole || isKoordinator;
    const delDisabled = isAdminRole || isKoordinator;

    tableHtml +=
      '<tr>' +
        '<td style="text-align:center;color:var(--text-muted);font-size:12px;">' + (idx + 1) + '</td>' +
        '<td>' +
          '<div style="font-weight:600;color:var(--text-main);">' + escapeHtml(moduleNames[mKey]) + '</div>' +
          '<code style="font-size:10.5px;color:var(--text-muted);font-family:\'JetBrains Mono\',monospace;">' + escapeHtml(mKey) + '</code>' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<input type="checkbox" class="role-checkbox-custom ' + (isAdminRole ? 'role-checkbox-admin' : '') + '" ' +
            (viewChecked ? 'checked ' : '') +
            (viewDisabled ? 'disabled ' : '') +
            'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_view\', this.checked)">' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<input type="checkbox" class="role-checkbox-custom ' + (isAdminRole ? 'role-checkbox-admin' : '') + '" ' +
            (editChecked ? 'checked ' : '') +
            (editDisabled ? 'disabled ' : '') +
            'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_edit\', this.checked)">' +
        '</td>' +
        '<td style="text-align:center;">' +
          '<input type="checkbox" class="role-checkbox-custom ' + (isAdminRole ? 'role-checkbox-admin' : '') + '" ' +
            (delChecked ? 'checked ' : '') +
            (delDisabled ? 'disabled ' : '') +
            'onchange="updateRoleMatrixPerm(\'' + escapeHtml(roleName) + '\', \'' + escapeHtml(mKey) + '\', \'can_delete\', this.checked)">' +
        '</td>' +
      '</tr>';
  });

  tableHtml +=
        '</tbody>' +
      '</table>' +
    '</div>';

  const actionButtons =
    '<div style="margin-top:16px;display:flex;justify-content:flex-end;gap:10px;">' +
      '<button type="button" class="btn btn-primary" onclick="saveRoleMatrixSettings()" ' + (roleName === 'Admin' ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>' +
        '💾 Simpan Matriks Hak Akses' +
      '</button>' +
    '</div>';

  container.innerHTML = roleTabsHtml + roleDesc + tableHtml + actionButtons;
}

function selectRoleTab(roleName) {
  CURRENT_SELECTED_ROLE_TAB = roleName;
  renderRoleMatrixUI();
}

function updateRoleMatrixPerm(roleName, moduleKey, action, checked) {
  if (!CURRENT_ROLES_PERMISSIONS || !CURRENT_ROLES_PERMISSIONS[roleName]) return;
  if (!CURRENT_ROLES_PERMISSIONS[roleName][moduleKey]) {
    CURRENT_ROLES_PERMISSIONS[roleName][moduleKey] = { can_view: false, can_edit: false, can_delete: false };
  }
  CURRENT_ROLES_PERMISSIONS[roleName][moduleKey][action] = checked;

  // Jika can_edit atau can_delete dicentang, otomatis can_view dicentang
  if ((action === 'can_edit' || action === 'can_delete') && checked) {
    CURRENT_ROLES_PERMISSIONS[roleName][moduleKey]['can_view'] = true;
    renderRoleMatrixUI();
  }
}

function saveRoleMatrixSettings() {
  if (!CURRENT_ROLES_PERMISSIONS) return;
  const btn = event && event.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  api('saveRolePermissions', TOKEN, CURRENT_ROLES_PERMISSIONS).then(function (res) {
    showToast('Matriks hak akses berhasil disimpan!');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Matriks Hak Akses'; }
  }).catch(function (err) {
    showToast('Gagal menyimpan hak akses: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Matriks Hak Akses'; }
  });
}

function openRoleModal() {
  const modal = document.getElementById('modal-role-entry');
  const input = document.getElementById('new-role-name');
  if (input) input.value = '';
  if (modal) modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeRoleModal() {
  const modal = document.getElementById('modal-role-entry');
  if (modal) modal.style.display = 'none';
  syncModalOpenState();
}

function submitRoleForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.getElementById('new-role-name');
  if (!input) return false;
  const newRole = input.value.trim();
  if (!newRole) {
    showToast('Nama peran wajib diisi.', true);
    return false;
  }

  if (CURRENT_ROLES_PERMISSIONS && CURRENT_ROLES_PERMISSIONS[newRole]) {
    showToast('Peran "' + newRole + '" sudah ada.', true);
    return false;
  }

  if (!CURRENT_ROLES_PERMISSIONS) CURRENT_ROLES_PERMISSIONS = {};
  const defaultPerms = {};
  const allRoutes = ['dashboard', 'pos', 'produk', 'stok', 'produksi', 'qc', 'pembelian', 'konsinyasi', 'piutang', 'crm', 'purnajual', 'faktur', 'laporan', 'pengaturan'];
  allRoutes.forEach(function (m) {
    defaultPerms[m] = { can_view: true, can_edit: false, can_delete: false };
  });

  CURRENT_ROLES_PERMISSIONS[newRole] = defaultPerms;
  if (AVAILABLE_ROLES.indexOf(newRole) === -1) AVAILABLE_ROLES.push(newRole);

  closeRoleModal();
  selectRoleTab(newRole);
  showToast('Peran baru "' + newRole + '" berhasil ditambahkan. Silakan sesuaikan centang modul.');
  return false;
}

// ========================= MANAJEMEN PENGGUNA (USERS) =========================
function loadUsersManagementUI() {
  const container = document.getElementById('users-management-container');
  if (!container) return;
  if (!isAdmin()) {
    container.innerHTML = '<div class="alert-banner alert-warning">Hanya Admin yang dapat mengelola pengguna.</div>';
    return;
  }

  container.innerHTML = '<div class="empty-state">⏳ Memuat daftar pengguna...</div>';
  api('getUsers', TOKEN).then(function (users) {
    CURRENT_USERS_LIST = Array.isArray(users) ? users : [];
    renderUsersListUI();
  }).catch(function (err) {
    container.innerHTML = '<div class="alert-banner alert-danger">Gagal memuat pengguna: ' + escapeHtml(err.message || err) + '</div>';
  });
}

function renderUsersListUI() {
  const container = document.getElementById('users-management-container');
  if (!container) return;

  const headerHtml =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">' +
      '<div>' +
        '<h3 style="margin-bottom:4px;">Daftar Akun Pengguna</h3>' +
        '<p style="font-size:12px;color:var(--text-secondary);margin:0;">Kelola akun staf kasir, operator QC, koordinator, dan administrator.</p>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="openUserModal()">+ Tambah Pengguna Baru</button>' +
    '</div>';

  if (!CURRENT_USERS_LIST || CURRENT_USERS_LIST.length === 0) {
    container.innerHTML = headerHtml + '<div class="empty-state">Belum ada akun pengguna.</div>';
    return;
  }

  let tableHtml =
    '<div class="table-container" style="overflow-x:auto;">' +
      '<table style="width:100%;margin-bottom:0;">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:40px;text-align:center;">No</th>' +
            '<th>Username</th>' +
            '<th>Nama Lengkap</th>' +
            '<th>Peran / Hak Akses</th>' +
            '<th>Dibuat Pada</th>' +
            '<th style="width:120px;text-align:center;">Aksi</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

  CURRENT_USERS_LIST.forEach(function (u, idx) {
    const isMainAdmin = String(u.username).toLowerCase() === 'admin';
    let roleBadge = '<span class="badge badge-info">' + escapeHtml(u.role || 'Kasir') + '</span>';
    if (u.role === 'Admin') roleBadge = '<span class="badge badge-success">Admin</span>';
    else if (u.role === 'Koordinator') roleBadge = '<span class="badge" style="background:#E0E7FF;color:#3730A3;">Koordinator (View)</span>';
    else if (u.role === 'QC') roleBadge = '<span class="badge" style="background:#FEF3C7;color:#92400E;">QC</span>';

    tableHtml +=
      '<tr>' +
        '<td style="text-align:center;color:var(--text-muted);font-size:12px;">' + (idx + 1) + '</td>' +
        '<td><strong style="font-family:\'JetBrains Mono\',monospace;color:var(--text-main);">' + escapeHtml(u.username) + '</strong></td>' +
        '<td>' + escapeHtml(u.name || '-') + '</td>' +
        '<td>' + roleBadge + '</td>' +
        '<td style="font-size:12px;color:var(--text-secondary);">' + (u.created_at ? formatDate(u.created_at) : '-') + '</td>' +
        '<td style="text-align:center;">' +
          '<div style="display:flex;gap:6px;justify-content:center;">' +
            '<button type="button" class="btn btn-xs btn-secondary" onclick="openUserModal(\'' + escapeHtml(u.id) + '\')">✏️ Edit</button>' +
            (!isMainAdmin
              ? '<button type="button" class="btn btn-xs btn-danger" onclick="deleteUserAccount(\'' + escapeHtml(u.id) + '\', \'' + escapeHtml(u.username) + '\')">🗑️</button>'
              : '') +
          '</div>' +
        '</td>' +
      '</tr>';
  });

  tableHtml += '</tbody></table></div>';
  container.innerHTML = headerHtml + tableHtml;
}

function openUserModal(userId) {
  const modal = document.getElementById('modal-user-entry');
  const titleEl = document.getElementById('user-modal-title');
  const idEl = document.getElementById('user-id');
  const userEl = document.getElementById('user-username');
  const nameEl = document.getElementById('user-fullname');
  const roleSelect = document.getElementById('user-role-select');
  const passEl = document.getElementById('user-password');
  const passStar = document.getElementById('user-pass-required-star');
  const passHint = document.getElementById('user-pass-hint');
  if (!modal) return;

  // Isi dropdown role dinamis
  if (roleSelect) {
    let rolesOptions = '';
    const roles = AVAILABLE_ROLES && AVAILABLE_ROLES.length > 0 ? AVAILABLE_ROLES : ['Admin', 'Koordinator', 'QC', 'Kasir'];
    roles.forEach(function (r) {
      rolesOptions += '<option value="' + escapeHtml(r) + '">' + escapeHtml(r) + (r === 'Koordinator' ? ' (View-Only)' : '') + '</option>';
    });
    roleSelect.innerHTML = rolesOptions;
  }

  if (userId) {
    const user = CURRENT_USERS_LIST.filter(function (u) { return String(u.id) === String(userId); })[0];
    if (user) {
      if (titleEl) titleEl.textContent = 'Edit Akun Pengguna';
      if (idEl) idEl.value = user.id;
      if (userEl) { userEl.value = user.username; userEl.readOnly = true; }
      if (nameEl) nameEl.value = user.name || '';
      if (roleSelect) roleSelect.value = user.role || 'Kasir';
      if (passEl) { passEl.value = ''; passEl.required = false; }
      if (passStar) passStar.style.display = 'none';
      if (passHint) passHint.style.display = 'block';
    }
  } else {
    if (titleEl) titleEl.textContent = 'Tambah Akun Pengguna';
    if (idEl) idEl.value = '';
    if (userEl) { userEl.value = ''; userEl.readOnly = false; }
    if (nameEl) nameEl.value = '';
    if (roleSelect) roleSelect.value = 'Kasir';
    if (passEl) { passEl.value = ''; passEl.required = true; }
    if (passStar) passStar.style.display = 'inline';
    if (passHint) passHint.style.display = 'none';
  }

  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeUserModal() {
  const modal = document.getElementById('modal-user-entry');
  if (modal) modal.style.display = 'none';
  syncModalOpenState();
}

function submitUserForm(e) {
  if (e && e.preventDefault) e.preventDefault();
  const id = (document.getElementById('user-id') || {}).value || '';
  const username = (document.getElementById('user-username') || {}).value || '';
  const name = (document.getElementById('user-fullname') || {}).value || '';
  const role = (document.getElementById('user-role-select') || {}).value || 'Kasir';
  const password = (document.getElementById('user-password') || {}).value || '';

  if (!username.trim()) {
    showToast('Username wajib diisi.', true);
    return false;
  }
  if (!id && !password) {
    showToast('Password wajib diisi untuk pengguna baru.', true);
    return false;
  }

  const btn = document.getElementById('btn-save-user');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  const payload = {
    id: id,
    username: username.trim(),
    name: name.trim(),
    role: role,
    password: password
  };

  api('saveUser', TOKEN, payload).then(function () {
    showToast('Pengguna berhasil disimpan!');
    closeUserModal();
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengguna'; }
    loadUsersManagementUI();
  }).catch(function (err) {
    showToast('Gagal menyimpan pengguna: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengguna'; }
  });

  return false;
}

function deleteUserAccount(userId, username) {
  if (!confirm('Apakah Anda yakin ingin menghapus akun pengguna "' + username + '"?')) return;

  api('deleteUser', TOKEN, userId).then(function () {
    showToast('Akun pengguna berhasil dihapus.');
    loadUsersManagementUI();
  }).catch(function (err) {
    showToast('Gagal menghapus pengguna: ' + (err.message || err), true);
  });
}

function deleteUserUI(userId, username) {
  if (!username && CURRENT_USERS_LIST) {
    const u = CURRENT_USERS_LIST.find(function (x) { return String(x.id) === String(userId); });
    if (u) username = u.username;
  }
  deleteUserAccount(userId, username || 'ini');
}


function saveStoreSettingsUI() {
  saveStoreSettings();
}

function saveStoreSettings() {
  const storeLogo = (document.getElementById('set-store-logo') ? document.getElementById('set-store-logo').value.trim() : '');
  const storeLogoLight = (document.getElementById('set-store-logo-light') ? document.getElementById('set-store-logo-light').value.trim() : '');
  const batchFormat = (document.getElementById('set-batch-format') ? document.getElementById('set-batch-format').value.trim() : '') || 'BATCH-{FARMER}-{YYMM}-{RAND4}-{SEQ}';
  const taxRateInput = document.getElementById('set-tax-rate');
  const taxRate = taxRateInput ? taxRateInput.value.trim() : (APP_SETTINGS.tax_rate || '0');

  // Kumpulkan preset tier harga
  const presetRows = document.querySelectorAll('#price-tier-presets-body .preset-tier-row');
  const presets = [];
  presetRows.forEach(function (row) {
    const tName = (row.querySelector('.preset-tier-name').value || '').trim();
    const tPrice = Number(row.querySelector('.preset-tier-price').value || 0);
    if (tName) {
      presets.push({
        name: tName,
        price: tPrice,
        default: tName.toLowerCase() === 'reguler'
      });
    }
  });

  const presetJson = presets.length > 0
    ? JSON.stringify(presets)
    : JSON.stringify(FALLBACK_PRICE_TIER_PRESETS);

  const payload = {
    store_logo: storeLogo,
    store_logo_light: storeLogoLight,
    store_name: document.getElementById('set-store-name') ? document.getElementById('set-store-name').value.trim() : '',
    store_address: document.getElementById('set-store-address') ? document.getElementById('set-store-address').value.trim() : '',
    store_phone: document.getElementById('set-store-phone') ? document.getElementById('set-store-phone').value.trim() : '',
    tax_rate: taxRate,
    invoice_footer: document.getElementById('set-invoice-footer') ? document.getElementById('set-invoice-footer').value.trim() : '',
    batch_format_template: batchFormat,
    batch_format: batchFormat,
    price_tiers_preset: presetJson
  };

  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    if (!APP_SETTINGS) APP_SETTINGS = {};
    Object.assign(APP_SETTINGS, payload);
    APP_SETTINGS['price_tiers_preset'] = presetJson;
    PRICE_TIERS_LIST = presets.map(function (p) { return p.name; });
    applyBrandLogo();
    showToast('Pengaturan profil toko & preset tingkat harga berhasil disimpan.');
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

// Alias untuk kompatibilitas nama fungsi modul
// filterFakturTable is defined as function in Faktur module below
const switchLaporanSubtab = switchReportSubtab;

function submitChangePassword() {
  const oldP = document.getElementById('set-old-pass').value;
  const newP = document.getElementById('set-new-pass').value;
  const confP = document.getElementById('set-confirm-pass').value;

  if (!oldP || !newP) { showToast('Lengkapi formulir password.', true); return; }
  if (newP !== confP) { showToast('Konfirmasi password tidak sesuai.', true); return; }
  if (newP.length < 6) { showToast('Password minimal 6 karakter.', true); return; }

  api('changePassword', TOKEN, oldP, newP).then(function (res) {
    if (res.success) {
      showToast('Password akun berhasil diganti.');
      document.getElementById('set-old-pass').value = '';
      document.getElementById('set-new-pass').value = '';
      document.getElementById('set-confirm-pass').value = '';
    } else {
      showToast(res.message || 'Gagal mengubah password.', true);
    }
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

// ============================================================================
// LOGIKA INTEGRASI BOT TELEGRAM
// ============================================================================

function toggleTgTokenVisibility() {
  const input = document.getElementById('set-tg-token');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function updateTelegramStatusBadge(token, chatId) {
  const badgeEl = document.getElementById('telegram-status-badge');
  if (!badgeEl) return;
  const isConfigured = Boolean((token || '').trim() && (chatId || '').trim());
  if (isConfigured) {
    badgeEl.innerHTML = '<span class="badge badge-success" style="padding:6px 12px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;">🟢 Aktif Terhubung</span>';
  } else {
    badgeEl.innerHTML = '<span class="badge" style="background:var(--surface-muted);color:var(--text-secondary);border:1px solid var(--border);padding:6px 12px;font-size:12px;display:inline-flex;align-items:center;gap:6px;">⚪ Belum Dikonfigurasi</span>';
  }
}

function saveTelegramSettings() {
  const token = (document.getElementById('set-tg-token') ? document.getElementById('set-tg-token').value : '').trim();
  const chatId = (document.getElementById('set-tg-chat-id') ? document.getElementById('set-tg-chat-id').value : '').trim();
  const notifVoid = document.getElementById('set-tg-notif-void') ? document.getElementById('set-tg-notif-void').checked : true;
  const notifDht = document.getElementById('set-tg-notif-dht') ? document.getElementById('set-tg-notif-dht').checked : true;
  const notifQc = document.getElementById('set-tg-notif-qc') ? document.getElementById('set-tg-notif-qc').checked : true;

  const btn = document.getElementById('btn-save-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

  const payload = {
    telegram_bot_token: token,
    telegram_chat_id: chatId,
    telegram_notif_void: String(notifVoid),
    telegram_notif_dht: String(notifDht),
    telegram_notif_qc: String(notifQc)
  };

  api('saveSettings', TOKEN, payload).then(function () {
    invalidateCache('settings');
    if (!APP_SETTINGS) APP_SETTINGS = {};
    Object.assign(APP_SETTINGS, payload);
    showToast('Pengaturan Bot Telegram berhasil disimpan.');
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Pengaturan Bot'; }
    updateTelegramStatusBadge(token, chatId);
  }).catch(function (err) {
    showToast('Gagal: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan Pengaturan Bot'; }
  });
}

function testTelegramConnectionUI() {
  const btn = document.getElementById('btn-test-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mengirim Pesan Tes...'; }

  api('testTelegramConnection', TOKEN).then(function (res) {
    showToast(res.message || 'Pesan tes berhasil dikirim ke Telegram!');
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Uji Kirim Notifikasi'; }
  }).catch(function (err) {
    showToast('Gagal tes koneksi: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Uji Kirim Notifikasi'; }
  });
}

function setupTelegramWebhookUI() {
  const currentUrl = window.location.href.split('?')[0].split('#')[0];
  const webAppUrl = prompt('Masukkan URL Web App deployment Google Apps Script (harus berakhiran /exec):', currentUrl);
  if (!webAppUrl) return;

  const btn = document.getElementById('btn-webhook-tg');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Mendaftarkan Webhook...'; }

  api('setupTelegramWebhook', TOKEN, webAppUrl.trim()).then(function (res) {
    showToast(res.message || 'Webhook Telegram berhasil didaftarkan!');
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Sinkronkan Webhook Bot'; }
  }).catch(function (err) {
    showToast('Gagal sinkronisasi webhook: ' + (err.message || err), true);
    if (btn) { btn.disabled = false; btn.textContent = '🔗 Sinkronkan Webhook Bot'; }
  });
}

// ==========================================================================
// MODUL RESET DATA UJI COBA (DANGER ZONE)
// ==========================================================================

/**
 * Buka modal panel reset data uji coba
 */
function openResetDataModal() {
  const modal = document.getElementById('modal-reset-data');
  if (!modal) return;

  // Reset checklist modul ke kondisi awal (tercentang semua)
  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');
  if (cbPos) cbPos.checked = true;
  if (cbConsign) cbConsign.checked = true;
  if (cbAftersales) cbAftersales.checked = true;

  // Kosongkan input konfirmasi teks
  const input = document.getElementById('reset-confirmation-input');
  if (input) {
    input.value = '';
    input.disabled = false;
  }

  // Nonaktifkan tombol eksekusi sampai divalidasi
  const btn = document.getElementById('btn-execute-reset');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
    btn.innerHTML = '🗑️ Hapus Permanen Data Terpilih';
  }

  modal.style.display = 'flex';
  modal.classList.add('active');
  document.body.classList.add('modal-open');

  if (input) {
    setTimeout(function () { input.focus(); }, 100);
  }
}

/**
 * Tutup modal panel reset data
 */
function closeResetDataModal() {
  const modal = document.getElementById('modal-reset-data');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
  const anyOpenModal = document.querySelector('.modal-overlay[style*="display: flex"], .modal-overlay.active');
  if (!anyOpenModal) {
    document.body.classList.remove('modal-open');
  }
}

/**
 * Validasi input konfirmasi teks kata 'RESET' dan minimal 1 modul terpilih
 */
function validateResetConfirmInput() {
  const input = document.getElementById('reset-confirmation-input');
  const btn = document.getElementById('btn-execute-reset');
  if (!input || !btn) return;

  const text = (input.value || '').trim();
  const isTextMatch = (text === 'RESET');

  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');

  const hasModuleSelected = (cbPos && cbPos.checked) ||
                            (cbConsign && cbConsign.checked) ||
                            (cbAftersales && cbAftersales.checked);

  if (isTextMatch && hasModuleSelected) {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.55';
    btn.style.cursor = 'not-allowed';
  }
}

/**
 * Eksekusi penghapusan data uji coba ke backend
 */
function executeResetTestingData() {
  const input = document.getElementById('reset-confirmation-input');
  const text = input ? input.value.trim() : '';
  if (text !== 'RESET') {
    showToast('Ketik kata RESET dengan benar untuk konfirmasi!', true);
    return;
  }

  const selectedModules = [];
  const cbPos = document.getElementById('reset-mod-pos');
  const cbConsign = document.getElementById('reset-mod-consign');
  const cbAftersales = document.getElementById('reset-mod-aftersales');

  if (cbPos && cbPos.checked) selectedModules.push('pos');
  if (cbConsign && cbConsign.checked) selectedModules.push('consign');
  if (cbAftersales && cbAftersales.checked) selectedModules.push('aftersales');

  if (selectedModules.length === 0) {
    showToast('Pilih setidaknya satu modul yang ingin dikosongkan!', true);
    return;
  }

  const btn = document.getElementById('btn-execute-reset');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="sync-spinner" style="display:inline-block;width:14px;height:14px;border-width:2px;margin-right:6px;"></span> Membersihkan Data...';
  }
  if (input) input.disabled = true;

  showToast('Memproses pembersihan data uji coba...');

  api('resetTestingData', TOKEN, selectedModules).then(function (res) {
    closeResetDataModal();
    showToast(res.message || 'Data riwayat uji coba berhasil dikosongkan!');

    // 1. Bersihkan seluruh cache lokal terkait modul yang direset
    if (window.DATA_CACHE) {
      if (selectedModules.indexOf('pos') !== -1) {
        DATA_CACHE.transactions = null;
        DATA_CACHE.recentInvoices = null;
        DATA_CACHE.dashboard = null;
        DATA_CACHE.reports = null;
        DATA_CACHE.receivables = null;
      }
      if (selectedModules.indexOf('consign') !== -1) {
        DATA_CACHE.consignments = null;
        DATA_CACHE.transfers = null;
        DATA_CACHE.outlets = null;
        DATA_CACHE.consignmentAudits = null;
        window._currentOutletDetail = null;
      }
      if (selectedModules.indexOf('aftersales') !== -1) {
        DATA_CACHE.aftersales = null;
        DATA_CACHE.claims = null;
        DATA_CACHE.consultations = null;
      }
    }

    // 2. Reset cart kasir lokal jika modul kasir direset
    if (selectedModules.indexOf('pos') !== -1 && typeof resetCart === 'function') {
      resetCart();
    }

    // 3. Refresh tampilan lokal modul yang sedang aktif
    const currentHash = (window.location.hash || '').replace('#', '') || 'pengaturan';
    if (typeof handleRoute === 'function') {
      handleRoute(currentHash, true);
    }
  }).catch(function (err) {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🗑️ Hapus Permanen Data Terpilih';
    }
    if (input) input.disabled = false;
    showToast('Gagal mereset data: ' + (err.message || err), true);
  });
}

// ========================= RIWAYAT TRANSAKSI & FAKTUR =========================
function renderFaktur(forceRefresh, startDate, endDate) {
  const content = document.getElementById('content');
  if (!content) return;

  // Tentukan default rentang tanggal (30 hari terakhir)
  const now = new Date();
  const endDefault = now.toISOString().split('T')[0];
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const startDefault = past30.toISOString().split('T')[0];

  const actualStart = startDate || window._fakturStartDate || startDefault;
  const actualEnd = endDate || window._fakturEndDate || endDefault;

  window._fakturStartDate = actualStart;
  window._fakturEndDate = actualEnd;

  const cacheKey = 'recentInvoices_' + actualStart + '_' + actualEnd;

  if (!forceRefresh && DATA_CACHE[cacheKey] && (Date.now() - DATA_CACHE[cacheKey].timestamp < 60000)) {
    drawFakturUI(DATA_CACHE[cacheKey].data);
    return;
  }

  content.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="display:inline-block;width:24px;height:24px;border:3px solid rgba(30,77,63,0.2);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px;"></span><br>Memuat riwayat faktur transaksi periode ' + formatDate(actualStart) + ' s.d. ' + formatDate(actualEnd) + '...</div></div>';

  api('getRecentTransactionsForInvoice', TOKEN, actualStart, actualEnd).then(function (list) {
    list = Array.isArray(list) ? list : [];
    DATA_CACHE[cacheKey] = { data: list, timestamp: Date.now() };
    DATA_CACHE.recentInvoices = { data: list, timestamp: Date.now() }; // fallback compat
    drawFakturUI(list);
  }).catch(function (err) {
    showToast('Gagal memuat faktur: ' + (err.message || err), true);
  });
}

function applyFakturDateFilter() {
  const startEl = document.getElementById('faktur-start-date');
  const endEl = document.getElementById('faktur-end-date');
  const start = startEl ? startEl.value : '';
  const end = endEl ? endEl.value : '';
  if (start && end && start > end) {
    showToast('Tanggal awal tidak boleh melebihi tanggal akhir.', true);
    return;
  }
  renderFaktur(true, start, end);
}

function resetFakturDateFilter() {
  const now = new Date();
  const endDefault = now.toISOString().split('T')[0];
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const startDefault = past30.toISOString().split('T')[0];
  renderFaktur(true, startDefault, endDefault);
}

function drawFakturUI(list) {
  const content = document.getElementById('content');
  if (!content) return;
  window._fakturTxList = list || [];

  // Hitung ringkasan statistik
  const validList = (list || []).filter(function (t) { return String(t.status).toUpperCase() !== 'VOID'; });
  const voidList = (list || []).filter(function (t) { return String(t.status).toUpperCase() === 'VOID'; });
  const totalOmzet = validList.reduce(function (sum, t) { return sum + (Number(t.total) || 0); }, 0);
  const adminUser = isAdmin();

  let totalGrossProfit = 0;
  if (adminUser) {
    totalGrossProfit = validList.reduce(function (sum, t) { return sum + (Number(t.gross_profit) || 0); }, 0);
  }
  const avgMargin = totalOmzet > 0 ? Math.round((totalGrossProfit / totalOmzet) * 100) : 0;

  const currentStart = window._fakturStartDate || '';
  const currentEnd = window._fakturEndDate || '';

  content.innerHTML =
    '<div class="page-header no-print" style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">' +
      '<div>' +
        '<h1 class="page-title" style="margin:0;font-size:18px;">Riwayat Transaksi &amp; Faktur</h1>' +
        '<p class="page-subtitle" style="margin:2px 0 0 0;font-size:12px;">Cetak faktur formal A4, simpan PDF, struk thermal kasir, dan kirim nota via WhatsApp.</p>' +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-secondary);">' +
        'Total: <strong style="color:var(--text-main);">' + list.length + ' Nota</strong>' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:360px 1fr;gap:16px;align-items:start;">' +
      '<div class="card" style="max-height:86vh;overflow-y:auto;padding:14px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<h3 style="font-size:14px;margin:0;">Daftar Transaksi</h3>' +
          '<span style="font-size:11px;color:var(--text-secondary);">' + list.length + ' Nota</span>' +
        '</div>' +

        // Bar Filter Rentang Tanggal
        '<div class="faktur-filter-bar" style="background:var(--surface-muted);padding:10px;border-radius:var(--radius-xs);border:1px solid var(--border);margin-bottom:10px;">' +
          '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-bottom:4px;">Periode Tanggal</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">' +
            '<div>' +
              '<label style="font-size:9px;color:var(--text-secondary);display:block;">Mulai:</label>' +
              '<input type="date" id="faktur-start-date" value="' + currentStart + '" style="width:100%;padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:4px;">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:9px;color:var(--text-secondary);display:block;">Sampai:</label>' +
              '<input type="date" id="faktur-end-date" value="' + currentEnd + '" style="width:100%;padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:4px;">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;">' +
            '<button type="button" class="btn btn-primary btn-sm" onclick="applyFakturDateFilter()" style="flex:1;padding:4px 8px;font-size:11px;">🔍 Filter</button>' +
            '<button type="button" class="btn btn-secondary btn-sm" onclick="resetFakturDateFilter()" style="padding:4px 8px;font-size:11px;" title="Kembalikan ke 30 Hari Terakhir">🔄 30 Hari</button>' +
          '</div>' +
        '</div>' +

        // Bar Filter Pencarian & Status
        '<div style="margin-bottom:10px;display:flex;flex-direction:column;gap:6px;">' +
          '<input type="text" id="faktur-search-input" class="topbar-search" placeholder="Cari nota, pelanggan, cara bayar..." oninput="filterFakturList()" style="width:100%;">' +
          '<select id="faktur-status-filter" onchange="filterFakturList()" style="padding:6px 8px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-xs);">' +
            '<option value="all">Semua Status Pembayaran</option>' +
            '<option value="paid">Lunas (Paid)</option>' +
            '<option value="partial">Cicilan / Tempo</option>' +
            '<option value="void">Dibatalkan (VOID)</option>' +
          '</select>' +
        '</div>' +
        '<div id="faktur-list-container" style="display:flex;flex-direction:column;gap:8px;"></div>' +
      '</div>' +
      '<div id="invoice-panel">' +
        '<div class="card" style="text-align:center;padding:60px 20px;color:var(--text-secondary);">' +
          '<div style="font-size:40px;margin-bottom:10px;">🧾</div>' +
          '<h3 style="font-size:16px;color:var(--text-main);margin-bottom:6px;">Pilih Transaksi</h3>' +
          '<p style="font-size:13px;">Klik salah satu nota di panel kiri untuk membuka faktur dan menu aksinya.</p>' +
        '</div>' +
      '</div>' +
    '</div>';

  filterFakturList();

  if (list && list.length > 0 && !SELECTED_FAKTUR_ID) {
    loadInvoicePreview(list[0].id);
  }
}


function renderFakturRows(list) {
  const container = document.getElementById('faktur-list-container');
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-secondary);font-size:12px;">Tidak ada nota yang cocok.</div>';
    return;
  }

  const adminUser = isAdmin();
  container.innerHTML = list.map(function (t) {
    const isSelected = (SELECTED_FAKTUR_ID === t.id);
    const isVoid = String(t.status).toUpperCase() === 'VOID';

    let badge = '';
    if (isVoid) {
      badge = '<span class="badge badge-void" style="background:#DC2626;color:#FFFFFF;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">VOID</span>';
    } else if (t.status === 'paid') {
      badge = '<span class="badge badge-success">Lunas</span>';
    } else {
      badge = '<span class="badge badge-warning">Tempo</span>';
    }

    const clientName = t.customer_name || 'Umum';

    const cardStyle = isSelected
      ? 'padding:10px 12px;border:1.5px solid var(--primary);cursor:pointer;border-radius:var(--radius-sm);background:var(--primary-light);transition:all 0.15s;'
      : 'padding:10px 12px;border:1px solid var(--border);cursor:pointer;border-radius:var(--radius-sm);background:var(--surface);transition:all 0.15s;';

    const priceHTML = isVoid
      ? '<span style="text-decoration:line-through;color:var(--text-secondary);font-size:11px;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(t.total) + '</span>'
      : '<strong style="color:var(--accent);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(t.total) + '</strong>';

    const profitHTML = (adminUser && !isVoid && t.gross_profit !== undefined)
      ? '<span style="font-size:10px;color:#16A34A;font-weight:600;margin-left:6px;" title="Estimasi Laba Kotor">+' + formatRupiah(t.gross_profit) + '</span>'
      : '';

    const voidNoteHTML = isVoid
      ? '<div style="font-size:10px;color:#DC2626;margin-top:2px;font-style:italic;">Dibatalkan: ' + escapeHtml(t.void_reason || 'Nota Void') + '</div>'
      : '';

    return '<div style="' + cardStyle + '" onclick="loadInvoicePreview(\'' + t.id + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<strong style="font-family:\'JetBrains Mono\',monospace;color:var(--primary);font-size:12px;">#' + escapeHtml(t.id) + '</strong>' +
        badge +
      '</div>' +
      '<div style="font-size:12px;color:var(--text-main);margin-top:4px;font-weight:600;">' +
        escapeHtml(clientName) + profitHTML +
      '</div>' +
      voidNoteHTML +
      '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-secondary);margin-top:3px;">' +
        '<span>' + formatDate(t.created_at) + ' &bull; ' + escapeHtml(t.payment_method || 'Tunai') + '</span>' +
        priceHTML +
      '</div>' +
    '</div>';
  }).join('');
}

function filterFakturTable(query) {
  const container = document.getElementById('faktur-list-container');
  if (!container) return;
  const list = window._fakturTxList || [];
  const searchEl = document.getElementById('faktur-search-input');
  const filterEl = document.getElementById('faktur-status-filter');

  const q = (typeof query === 'string' ? query : (searchEl ? searchEl.value : '')).toLowerCase().trim();
  const statusFilter = filterEl ? filterEl.value : 'all';

  const filtered = list.filter(function (t) {
    const isVoid = String(t.status).toUpperCase() === 'VOID';
    const matchQuery = !q ||
      String(t.id || '').toLowerCase().includes(q) ||
      String(t.customer_name || '').toLowerCase().includes(q) ||
      String(t.payment_method || '').toLowerCase().includes(q);

    let matchStatus = true;
    if (statusFilter === 'paid') matchStatus = (t.status === 'paid' && !isVoid);
    if (statusFilter === 'partial') matchStatus = (t.status !== 'paid' && !isVoid);
    if (statusFilter === 'void') matchStatus = isVoid;

    return matchQuery && matchStatus;
  });

  renderFakturRows(filtered);
}

function filterFakturList() {
  filterFakturTable();
}

function loadInvoicePreview(transactionId) {
  SELECTED_FAKTUR_ID = transactionId;
  filterFakturList();

  const panel = document.getElementById('invoice-panel');
  if (!panel) return;
  panel.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="display:inline-block;width:24px;height:24px;border:3px solid rgba(30,77,63,0.2);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin-bottom:8px;"></span><br>Memuat faktur #' + escapeHtml(transactionId) + '...</div></div>';

  api('getInvoiceData', TOKEN, transactionId).then(function (data) {
    window._curInv = data;
    renderInvoiceLayout(data, CURRENT_INVOICE_VIEW_MODE || 'formal');
  }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
}

function renderInvoiceLayout(data, template) {
  if (template === 'minimalis') template = 'minimalist';
  if (!template) template = 'formal';
  CURRENT_INVOICE_VIEW_MODE = template;

  const panel = document.getElementById('invoice-panel');
  if (!panel || !data || !data.transaction) return;

  const tx = data.transaction;
  const isVoid = String(tx.status).toUpperCase() === 'VOID';
  const custName = (data.customer ? data.customer.name : tx.customer_name) || 'Umum';
  const adminUser = isAdmin();

  let statusBadge = '';
  if (isVoid) {
    statusBadge = '<span class="badge badge-void" style="background:#DC2626;color:#FFFFFF;font-weight:800;font-size:12px;padding:3px 8px;border-radius:4px;">VOID / DIBATALKAN</span>';
  } else if (tx.status === 'paid') {
    statusBadge = '<span class="badge badge-success">LUNAS</span>';
  } else {
    statusBadge = '<span class="badge badge-warning">CICILAN / TEMPO</span>';
  }

  const voidBannerHTML = isVoid ? (
    '<div class="tx-void-banner" style="background:#FEE2E2;border:1px solid #F87171;color:#991B1B;padding:12px 16px;border-radius:6px;margin-bottom:14px;display:flex;align-items:flex-start;gap:12px;">' +
      '<span style="font-size:24px;line-height:1;">⚠️</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:13px;font-weight:800;letter-spacing:0.5px;">TRANSAKSI TELAH DIBATALKAN (VOID)</div>' +
        '<div style="font-size:12px;margin-top:3px;line-height:1.4;">' +
          'Dibatalkan pada: <strong>' + formatDate(tx.void_at || tx.updated_at) + '</strong> oleh <strong>' + escapeHtml(tx.void_by || 'Admin') + '</strong>.<br>' +
          'Alasan: <em>"' + escapeHtml(tx.void_reason || '-') + '"</em>.<br>' +
          '<span style="color:#065F46;font-weight:600;">✓ Kuantitas sachet/benih telah dikembalikan ke stok batch fisik.</span>' +
        '</div>' +
      '</div>' +
    '</div>'
  ) : '';

  const totalCardHTML = isVoid ? (
    '<div style="text-align:right;">' +
      '<div style="font-size:10px;color:#DC2626;text-transform:uppercase;font-weight:800;">NOTA BATAL (VOID)</div>' +
      '<div style="font-size:20px;font-weight:800;color:var(--text-secondary);text-decoration:line-through;font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.total) + '</div>' +
    '</div>'
  ) : (
    '<div style="text-align:right;">' +
      '<div style="font-size:10px;color:var(--text-secondary);text-transform:uppercase;font-weight:700;">TOTAL TAGIHAN</div>' +
      '<div style="font-size:20px;font-weight:800;color:var(--accent);font-family:\'JetBrains Mono\',monospace;">' + formatRupiah(tx.total) + '</div>' +
      (adminUser && tx.gross_profit !== undefined ? (
        '<div style="font-size:11px;color:#16A34A;font-weight:700;margin-top:2px;">Est. Laba: ' + formatRupiah(tx.gross_profit) + ' (' + (tx.margin_percent || 0) + '%)</div>'
      ) : '') +
    '</div>'
  );

  panel.innerHTML =
    '<div class="card" style="margin-bottom:14px;padding:16px 20px;">' +
      voidBannerHTML +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="font-family:\'JetBrains Mono\',monospace;font-size:16px;font-weight:800;color:var(--primary);">#' + escapeHtml(tx.id) + '</span>' +
            statusBadge +
          '</div>' +
          '<div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">' +
            'Klien: <strong style="color:var(--text-main);">' + escapeHtml(custName) + '</strong> &bull; ' + formatDate(tx.created_at) + ' (' + escapeHtml(tx.payment_method || 'Tunai') + ')' +
          '</div>' +
        '</div>' +
        totalCardHTML +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;" class="no-print">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          '<div class="invoice-format-tabs">' +
            '<button type="button" class="invoice-format-tab-btn ' + (template === 'thermal' ? 'active' : '') + '" data-mode="thermal" onclick="switchInvoiceView(\'thermal\')">🧾 Struk Termal (58mm)</button>' +
            '<button type="button" class="invoice-format-tab-btn ' + (template === 'minimalist' ? 'active' : '') + '" data-mode="minimalist" onclick="switchInvoiceView(\'minimalist\')">📄 Faktur Minimalis</button>' +
            '<button type="button" class="invoice-format-tab-btn ' + (template === 'formal' ? 'active' : '') + '" data-mode="formal" onclick="switchInvoiceView(\'formal\')">🏛️ Faktur Formal (A4)</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
          '<button type="button" class="btn btn-primary btn-sm" onclick="printActiveInvoice()" style="font-weight:700;"><span style="font-size:13px;">🖨️</span> Cetak / Simpan PDF</button>' +
          '<button type="button" class="btn btn-secondary btn-sm btn-tx-wa" onclick="sendReceiptToWhatsApp(window._curInv)" style="background:#25D366;color:#FFFFFF;border-color:#25D366;font-weight:600;">📲 Kirim WA</button>' +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="openTransactionDetailModal(\'' + tx.id + '\')">🔍 Rincian Lengkap</button>' +
          '<button type="button" class="btn btn-warning btn-sm" onclick="openTransactionDetailModal(\'' + tx.id + '\')" title="Ajukan klaim garansi benih dari nota ini" style="font-weight:600;">🌱 Klaim Benih</button>' +
          (!isVoid ? '<button type="button" class="btn btn-secondary btn-sm" onclick="startEditTransaction(\'' + tx.id + '\')">✏️ Koreksi Nota</button>' : '') +
          (!isVoid && adminUser ? '<button type="button" class="btn btn-danger btn-sm btn-tx-void" onclick="promptVoidTransaction(\'' + tx.id + '\', \'' + escapeHtml(custName).replace(/'/g, "\\'") + '\')" style="font-weight:700;">⚠️ Batalkan (Void)</button>' : '') +
          (adminUser ? '<button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteTransactionUI(\'' + tx.id + '\')" style="color:#DC2626;border:1px solid #DC2626;padding:4px 8px;font-size:11px;" title="Hapus permanen darurat (khusus admin)">🗑️</button>' : '') +
          '<button type="button" class="btn btn-secondary btn-sm" onclick="closeInvoicePanel()" title="Tutup pratinjau faktur">✕ Tutup</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div id="invoice-doc-body">' + buildInvoiceRenderAreaHTML(data, template) + '</div>';

  switchInvoiceView(template);
}

function buildInvoiceHTML(data, template) {
  const mode = (template === 'minimalis') ? 'minimalist' : (template || 'formal');
  return buildInvoiceRenderAreaHTML(data, mode);
}

function printInvoice() {
  printActiveInvoice();
}

function deleteTransactionUI(id) {
  if (!isAdmin()) {
    showToast('Akses ditolak: Hanya Admin yang berhak menghapus transaksi.', true);
    return;
  }
  showConfirmDialog('Hapus Transaksi', 'Hapus permanen nota #' + id + '? Catatan: Jika ingin jejak audit pembatalan tersimpan, disarankan menggunakan fitur [Batalkan Transaksi (Void)].', function () {
    api('deleteTransaction', TOKEN, id).then(function () {
      invalidateCache('recentInvoices');
      invalidateCache('products');
      invalidateCache('dashboard');
      invalidateCache('receivables');
      showToast('Transaksi dihapus & stok dikembalikan.');
      SELECTED_FAKTUR_ID = null;
      renderFaktur(true);
    }).catch(function (err) { showToast('Gagal: ' + (err.message || err), true); });
  }, true);
}

// ========================= INITIALIZATION & GLOBAL LISTENERS =========================
document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.onsubmit = handleLogin;

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = handleLogout;

  const togglePassBtn = document.getElementById('toggle-password-visibility');
  const passInput = document.getElementById('login-password');
  if (togglePassBtn && passInput) {
    togglePassBtn.onclick = function () {
      passInput.type = passInput.type === 'password' ? 'text' : 'password';
    };
  }

  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const closeBtn = document.getElementById('sidebar-close-btn');

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.onclick = function () {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
    };
  }

  window.closeSidebarMobile = function () {
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  };

  if (closeBtn) closeBtn.onclick = closeSidebarMobile;
  if (backdrop) backdrop.onclick = closeSidebarMobile;

  const refreshBtn = document.getElementById('topbar-refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = function () {
      invalidateCache();
      router(true);
      showToast('Data toko disegarkan.');
    };
  }

  if (TOKEN) {
    enterApp();
  } else {
    showLoginScreen();
  }
});

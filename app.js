/**
 * ==============================================================================
 * KIOS-IDEP — APPLICATION ENTRY POINT & GLOBAL BOOTSTRAPPER
 * ==============================================================================
 * Seluruh modul inti telah dipisahkan secara modular ke dalam:
 *   - config/     : Konfigurasi Supabase & global state/cache
 *   - utils/      : Session storage, theme, formatters & modal/dialog
 *   - services/   : Auth/RBAC, API bridge Supabase, PWA & pusat notifikasi
 *   - components/ : Komponen UI per fitur/halaman aplikasi
 * ==============================================================================
 */

// ========================= INITIALIZATION & GLOBAL LISTENERS =========================
document.addEventListener('DOMContentLoaded', function () {
  // 1. Form login (#login-form) ter-bind ke handleLogin(event)
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.onsubmit = handleLogin;
  }

  // 2. Tombol intip password (#toggle-password-visibility)
  const togglePassBtn = document.getElementById('toggle-password-visibility');
  const passInput = document.getElementById('login-password');
  if (togglePassBtn && passInput) {
    togglePassBtn.onclick = function (e) {
      if (e) e.preventDefault();
      const isPass = passInput.type === 'password';
      passInput.type = isPass ? 'text' : 'password';
      togglePassBtn.innerHTML = isPass ? '&#128064;' : '&#128065;';
      togglePassBtn.setAttribute('title', isPass ? 'Sembunyikan password' : 'Lihat password');
    };
  }

  // 3. Navigasi Sidebar Mobile & Bottom Bar (#sidebar-toggle-btn, #mobile-menu-more-btn, #sidebar-close-btn, #sidebar-backdrop)
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const mobileMenuMoreBtn = document.getElementById('mobile-menu-more-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (toggleBtn) {
    toggleBtn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      toggleSidebarMobile(e);
    };
  }

  if (mobileMenuMoreBtn) {
    mobileMenuMoreBtn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      openSidebarMobile();
    };
  }

  if (closeBtn) {
    closeBtn.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      closeSidebarMobile();
    };
  }

  if (backdrop) {
    backdrop.onclick = function (e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      closeSidebarMobile();
    };
  }

  // 4. Tombol logout (#logout-btn) memanggil handleLogout()
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = function () { handleLogout(); };
  }

  const refreshBtn = document.getElementById('topbar-refresh-btn');
  if (refreshBtn) {
    refreshBtn.onclick = function () {
      invalidateCache();
      router(true);
      showToast('Data toko disegarkan.');
    };
  }

  // 5. Mekanisme auto-login / session restore tanpa flash + cek idle timeout
  if (window.__IDLE_EXPIRED_ON_LOAD) {
    const expiredMin = Number(window.__IDLE_EXPIRED_ON_LOAD) || getSessionTimeoutMinutes();
    window.__IDLE_EXPIRED_ON_LOAD = false;
    handleLogout({ reason: 'idle', minutes: expiredMin });
  } else {
    const restoredToken = TOKEN || getSafeSession('ekasir_token');
    if (restoredToken && !isSessionIdleExpiredNow()) {
      TOKEN = restoredToken;
      USER_NAME = USER_NAME || getSafeSession('ekasir_user') || 'Admin';
      USER_ROLE = USER_ROLE || getSafeSession('ekasir_role') || (String(USER_NAME).toLowerCase() === 'admin' ? 'Admin' : 'Kasir');
      CURRENT_USER = { name: USER_NAME, username: USER_NAME, role: USER_ROLE };
      window._currentUser = CURRENT_USER;
      enterApp();
    } else if (restoredToken && isSessionIdleExpiredNow()) {
      triggerIdleAutoLogout(getSessionTimeoutMinutes());
    } else {
      showLoginScreen();
      consumePendingIdleLogoutNotice();
    }
  }

  // 6. Pencarian Global Topbar (#topbar-global-search, #search-clear-btn & #mobile-search-toggle-btn)
  const globalSearchInput = document.getElementById('topbar-global-search');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const mobileSearchToggleBtn = document.getElementById('mobile-search-toggle-btn');

  if (mobileSearchToggleBtn) {
    mobileSearchToggleBtn.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      const topbarEl = document.querySelector('.topbar');
      if (!topbarEl) return;
      const isOpen = topbarEl.classList.toggle('mobile-search-open');
      mobileSearchToggleBtn.classList.toggle('active', isOpen);
      if (isOpen && globalSearchInput) {
        setTimeout(function () { globalSearchInput.focus(); }, 60);
      }
    });
  }

  function handleGlobalSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (searchClearBtn) {
      searchClearBtn.style.display = q ? 'block' : 'none';
    }

    const currentRoute = (location.hash || '#dashboard').replace('#', '').trim() || 'dashboard';

    // 1. Jika di POS Kasir
    if (currentRoute === 'pos') {
      const posSearch = document.getElementById('pos-search');
      if (posSearch) {
        posSearch.value = query;
      }
      if (typeof PRODUCTS_CACHE !== 'undefined' && Array.isArray(PRODUCTS_CACHE)) {
        const filtered = PRODUCTS_CACHE.filter(function (p) {
          return !q ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.variant || '').toLowerCase().includes(q);
        });
        if (typeof renderPOSProductGrid === 'function') {
          renderPOSProductGrid(filtered);
        }
      }
    }
    // 2. Jika di Katalog Produk
    else if (currentRoute === 'produk') {
      PRODUCT_SEARCH_QUERY = q;
      const prodSearch = document.getElementById('produk-search-input');
      if (prodSearch && prodSearch.value !== query) {
        prodSearch.value = query;
      }
      if (typeof renderFilteredProducts === 'function') {
        renderFilteredProducts();
      }
    }
    // 3. Jika di Riwayat Faktur
    else if (currentRoute === 'faktur') {
      const fakturSearch = document.getElementById('faktur-search-input');
      if (fakturSearch) {
        fakturSearch.value = query;
      }
      if (typeof filterFakturList === 'function') {
        filterFakturList();
      }
    }
    // 4. Jika di CRM / Pelanggan
    else if (currentRoute === 'crm') {
      const crmSearch = document.getElementById('crm-search');
      if (crmSearch) {
        crmSearch.value = query;
        if (typeof renderFilteredCustomers === 'function') {
          renderFilteredCustomers();
        }
      }
    }
    // 5. Jika di Pengeluaran / Expenses
    else if (currentRoute === 'expenses') {
      const expSearch = document.getElementById('expense-search-input');
      if (expSearch) {
        expSearch.value = query;
      }
      if (typeof onExpenseSearch === 'function') {
        onExpenseSearch(query);
      }
    }
    // 6. Jika di Konsinyasi
    else if (currentRoute === 'konsinyasi') {
      const cards = document.querySelectorAll('.outlet-card');
      cards.forEach(function (card) {
        const cardText = card.textContent.toLowerCase();
        card.style.display = (!q || cardText.includes(q)) ? '' : 'none';
      });
    }
    // 7. Jika di Piutang
    else if (currentRoute === 'piutang') {
      const piutangRows = document.querySelectorAll('#content table tbody tr');
      piutangRows.forEach(function (tr) {
        const rowText = tr.textContent.toLowerCase();
        tr.style.display = (!q || rowText.includes(q)) ? '' : 'none';
      });
    }
  }

  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', function (e) {
      handleGlobalSearch(e.target.value);
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function () {
      if (globalSearchInput) {
        globalSearchInput.value = '';
        globalSearchInput.focus();
      }
      handleGlobalSearch('');
    });
  }

  // 7. Inisialisasi PWA Install Button & Banner
  initPwaInstall();
});

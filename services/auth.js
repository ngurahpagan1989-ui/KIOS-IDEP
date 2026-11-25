// Modul Layanan: Autentikasi, RBAC Permissions, Idle Auto-Logout & Session Initializer

// --- RBAC & Hak Akses Modul ---
function normalizeModuleKey(route) {
  const r = String(route || 'dashboard').replace(/^#/, '').trim().toLowerCase();
  if (r === 'purna-jual') return 'purnajual';
  if (r === 'stok-valuasi' || r === 'valuasi-stok') return 'laporan';
  return r || 'dashboard';
}

function isAdmin() {
  const r = (CURRENT_USER && CURRENT_USER.role) || USER_ROLE || '';
  const u = (CURRENT_USER && CURRENT_USER.username) || USER_NAME || '';
  return String(r).toLowerCase().indexOf('admin') !== -1 || String(u).toLowerCase() === 'admin';
}

function isCoordinator() {
  if (isAdmin()) return false;
  const r = String((CURRENT_USER && CURRENT_USER.role) || USER_ROLE || '').trim().toLowerCase();
  return r.indexOf('koordinator') !== -1 || r.indexOf('coordinator') !== -1;
}

function isFinance() {
  const r = String((CURRENT_USER && CURRENT_USER.role) || USER_ROLE || '').trim().toLowerCase();
  return r.indexOf('finance') !== -1 || r.indexOf('keuangan') !== -1;
}

function isCurrentUserFinance() {
  return isFinance();
}

function userCanView(moduleKey) {
  if (isAdmin() || isCoordinator()) return true;
  const key = normalizeModuleKey(moduleKey);
  if (!CURRENT_USER_PERMISSIONS) return true;
  const mod = CURRENT_USER_PERMISSIONS[key];
  return mod ? !!mod.can_view : false;
}

function userCanEdit(moduleKey) {
  if (isAdmin()) return true;
  if (isCoordinator()) return false;
  const key = normalizeModuleKey(moduleKey);
  if (!CURRENT_USER_PERMISSIONS) return true;
  const mod = CURRENT_USER_PERMISSIONS[key];
  return mod ? !!mod.can_edit : false;
}

function userCanDelete(moduleKey) {
  if (isAdmin()) return true;
  if (isCoordinator()) return false;
  const key = normalizeModuleKey(moduleKey);
  if (!CURRENT_USER_PERMISSIONS) return false;
  const mod = CURRENT_USER_PERMISSIONS[key];
  return mod ? !!mod.can_delete : false;
}

// ==============================================================================
// 3. AUTENTIKASI PENGGUNA & MANAJEMEN ROLE
// ==============================================================================

async function loginSupabaseUser(identifier, password) {
  if (!supabase) throw new Error('Supabase client belum siap.');

  let email = identifier.trim();
  if (!email.includes('@')) {
    email = `${email.toLowerCase()}@pos.local`;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    // Fallback: cek langsung ke tabel profiles jika akun dibuat dari menu Akun Pengguna
    const cleanUser = identifier.trim();
    const { data: profMatch } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', cleanUser)
      .maybeSingle();

    if (profMatch && profMatch.password && String(profMatch.password) === String(password)) {
      const userProfile = {
        id: profMatch.id,
        email: email,
        username: profMatch.username,
        name: profMatch.full_name || profMatch.name || profMatch.username,
        role: profMatch.role || 'Kasir',
        phone: profMatch.phone || ''
      };
      const fakeToken = 'local_' + profMatch.id + '_' + Date.now();
      window.CURRENT_SESSION = { access_token: fakeToken, user: userProfile };
      window.CURRENT_USER_PROFILE = userProfile;
      try {
        localStorage.setItem('ekasir_token', fakeToken);
        localStorage.setItem('ekasir_user', userProfile.name);
        localStorage.setItem('ekasir_role', userProfile.role);
        sessionStorage.setItem('ekasir_token', fakeToken);
        sessionStorage.setItem('ekasir_user', userProfile.name);
        sessionStorage.setItem('ekasir_role', userProfile.role);
        localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
        localStorage.setItem('idep_pos_token', fakeToken);
        localStorage.setItem('ekasir_last_activity', String(Date.now()));
        localStorage.removeItem('ekasir_idle_logout_notice');
        window.__IDLE_EXPIRED_ON_LOAD = false;
      } catch (e) { }
      return {
        success: true,
        token: fakeToken,
        user: userProfile,
        role: userProfile.role,
        name: userProfile.name
      };
    }
    throw new Error('Username atau kata sandi tidak valid. (' + error.message + ')');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const userProfile = {
    id: data.user.id,
    email: data.user.email,
    username: profile ? profile.username : (data.user.user_metadata?.username || email.split('@')[0]),
    name: profile ? profile.full_name : (data.user.user_metadata?.full_name || 'Staf Kios'),
    role: profile ? profile.role : (data.user.user_metadata?.role || 'Kasir'),
    phone: profile ? profile.phone : ''
  };

  window.CURRENT_SESSION = data.session;
  window.CURRENT_USER_PROFILE = userProfile;

  const userDisplayName = userProfile.name || userProfile.username;
  const userRole = userProfile.role || 'Kasir';
  try {
    localStorage.setItem('ekasir_token', data.session.access_token);
    localStorage.setItem('ekasir_user', userDisplayName);
    localStorage.setItem('ekasir_role', userRole);
    sessionStorage.setItem('ekasir_token', data.session.access_token);
    sessionStorage.setItem('ekasir_user', userDisplayName);
    sessionStorage.setItem('ekasir_role', userRole);
    localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
    localStorage.setItem('idep_pos_token', data.session.access_token);
    localStorage.setItem('ekasir_last_activity', String(Date.now()));
    localStorage.removeItem('ekasir_idle_logout_notice');
    window.__IDLE_EXPIRED_ON_LOAD = false;
  } catch (e) {
    console.warn('[Session] Gagal menyimpan sesi:', e);
  }

  return {
    success: true,
    token: data.session.access_token,
    user: userProfile,
    role: userProfile.role,
    name: userProfile.name
  };
}

function isSupabaseSessionIdleExpired() {
  try {
    if (window.__IDLE_EXPIRED_ON_LOAD) return true;
    const lastAct = Number(localStorage.getItem('ekasir_last_activity') || 0);
    const rawMin = localStorage.getItem('ekasir_timeout_minutes');
    let timeoutMin = (rawMin !== null && rawMin !== '') ? Number(rawMin) : 30;
    if (isNaN(timeoutMin)) timeoutMin = 30;
    if (lastAct > 0 && timeoutMin > 0 && (Date.now() - lastAct >= timeoutMin * 60000)) {
      return true;
    }
  } catch (e) {}
  return false;
}

async function logoutSupabaseUser() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.CURRENT_SESSION = null;
  window.CURRENT_USER_PROFILE = null;
  try {
    localStorage.removeItem('ekasir_token');
    localStorage.removeItem('ekasir_user');
    localStorage.removeItem('ekasir_role');
    sessionStorage.removeItem('ekasir_token');
    sessionStorage.removeItem('ekasir_user');
    sessionStorage.removeItem('ekasir_role');
    localStorage.removeItem('idep_pos_user');
    localStorage.removeItem('idep_pos_token');
    localStorage.removeItem('ekasir_last_activity');
  } catch (e) {}
}

async function checkSupabaseSession() {
  if (!supabase) return null;
  if (isSupabaseSessionIdleExpired()) {
    await logoutSupabaseUser();
    return null;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    const userProfile = {
      id: session.user.id,
      email: session.user.email,
      username: profile ? profile.username : session.user.email.split('@')[0],
      name: profile ? (profile.full_name || profile.name || profile.username) : 'Staf Kios',
      role: profile ? (profile.role || 'Kasir') : 'Kasir',
      phone: profile ? (profile.phone || '') : ''
    };

    window.CURRENT_SESSION = session;
    window.CURRENT_USER_PROFILE = userProfile;
    try {
      const userDisplayName = userProfile.name || userProfile.username;
      const userRole = userProfile.role || 'Kasir';
      localStorage.setItem('ekasir_token', session.access_token);
      localStorage.setItem('ekasir_user', userDisplayName);
      localStorage.setItem('ekasir_role', userRole);
      sessionStorage.setItem('ekasir_token', session.access_token);
      sessionStorage.setItem('ekasir_user', userDisplayName);
      sessionStorage.setItem('ekasir_role', userRole);
      localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
    } catch (e) {}
    return userProfile;
  }

  // Fallback untuk akun pengguna yang login melalui tabel profiles (local token)
  try {
    const savedUserRaw = localStorage.getItem('idep_pos_user');
    const savedToken = localStorage.getItem('idep_pos_token') || localStorage.getItem('ekasir_token') || '';
    if (savedUserRaw && savedToken) {
      const parsedUser = JSON.parse(savedUserRaw);
      if (parsedUser && (parsedUser.id || parsedUser.username)) {
        let q = supabase.from('profiles').select('*');
        if (parsedUser.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(parsedUser.id))) {
          q = q.eq('id', parsedUser.id);
        } else {
          q = q.ilike('username', String(parsedUser.username || parsedUser.id));
        }
        const { data: freshProfile } = await q.maybeSingle();
        const userProfile = freshProfile ? {
          id: freshProfile.id,
          email: parsedUser.email || (freshProfile.username + '@pos.local'),
          username: freshProfile.username,
          name: freshProfile.full_name || freshProfile.name || freshProfile.username,
          role: freshProfile.role || 'Kasir',
          phone: freshProfile.phone || ''
        } : parsedUser;

        window.CURRENT_SESSION = { access_token: savedToken, user: userProfile };
        window.CURRENT_USER_PROFILE = userProfile;
        const userDisplayName = userProfile.name || userProfile.username;
        const userRole = userProfile.role || 'Kasir';
        localStorage.setItem('ekasir_user', userDisplayName);
        localStorage.setItem('ekasir_role', userRole);
        sessionStorage.setItem('ekasir_user', userDisplayName);
        sessionStorage.setItem('ekasir_role', userRole);
        localStorage.setItem('idep_pos_user', JSON.stringify(userProfile));
        return userProfile;
      }
    }
  } catch (e) {}

  return null;
}


window.loginSupabaseUser = loginSupabaseUser;
window.logoutSupabaseUser = logoutSupabaseUser;
window.checkSupabaseSession = checkSupabaseSession;

// ========================= IDLE SESSION AUTO-LOGOUT MANAGER =========================
const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const IDLE_WARNING_THRESHOLD_SECONDS = 60;
const ACTIVITY_WRITE_THROTTLE_MS = 10000;

let _idleMonitorInterval = null;
let _idleListenersBound = false;
let _idleWarningVisible = false;
let _lastActivityWriteTime = 0;
let _isAutoLoggingOut = false;

function getSessionTimeoutMinutes() {
  try {
    if (APP_SETTINGS && APP_SETTINGS['session_timeout_minutes'] !== undefined && APP_SETTINGS['session_timeout_minutes'] !== '') {
      const fromApp = parseInt(APP_SETTINGS['session_timeout_minutes'], 10);
      if (!isNaN(fromApp) && fromApp >= 0) return fromApp;
    }
    const raw = localStorage.getItem('ekasir_timeout_minutes');
    if (raw !== null && raw !== '') {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
  } catch (e) { }
  return DEFAULT_SESSION_TIMEOUT_MINUTES;
}

function syncSessionTimeoutFromSettings(settings) {
  if (!settings || typeof settings !== 'object') return;
  if (settings['session_timeout_minutes'] !== undefined && settings['session_timeout_minutes'] !== null && settings['session_timeout_minutes'] !== '') {
    const mins = parseInt(settings['session_timeout_minutes'], 10);
    if (!isNaN(mins) && mins >= 0) {
      try {
        localStorage.setItem('ekasir_timeout_minutes', String(mins));
      } catch (e) { }
    }
  }
}

function recordUserActivity(force) {
  if (!TOKEN) return;
  if (_idleWarningVisible && !force) return;
  const now = Date.now();
  if (!force && (now - _lastActivityWriteTime < ACTIVITY_WRITE_THROTTLE_MS)) return;
  _lastActivityWriteTime = now;
  try {
    localStorage.setItem('ekasir_last_activity', String(now));
  } catch (e) { }
}

function getLastActivityTimestamp() {
  try {
    const val = Number(localStorage.getItem('ekasir_last_activity') || 0);
    if (val > 0) return val;
  } catch (e) { }
  return _lastActivityWriteTime || 0;
}

function isSessionIdleExpiredNow() {
  const timeoutMin = getSessionTimeoutMinutes();
  if (timeoutMin <= 0) return false;
  const lastAct = getLastActivityTimestamp();
  if (!lastAct) return false;
  return (Date.now() - lastAct) >= (timeoutMin * 60 * 1000);
}

function showIdleWarningModal(secondsLeft, totalWarningSeconds) {
  const modal = document.getElementById('idle-timeout-modal');
  const numEl = document.getElementById('idle-countdown-number');
  const barEl = document.getElementById('idle-progress-bar');
  if (!modal) return;

  if (numEl) numEl.textContent = String(secondsLeft);
  if (barEl && totalWarningSeconds > 0) {
    const pct = Math.max(0, Math.min(100, (secondsLeft / totalWarningSeconds) * 100));
    barEl.style.width = pct + '%';
  }

  if (!_idleWarningVisible) {
    _idleWarningVisible = true;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    if (window.i18n && typeof window.i18n.translateDOM === 'function') {
      window.i18n.translateDOM(modal);
    }
    const stayBtn = document.getElementById('idle-stay-logged-in-btn');
    if (stayBtn) {
      try { stayBtn.focus(); } catch (e) { }
    }
  }
}

function closeIdleWarningModal() {
  const modal = document.getElementById('idle-timeout-modal');
  if (modal) modal.style.display = 'none';
  if (_idleWarningVisible) {
    _idleWarningVisible = false;
    syncModalOpenState();
  }
}

function extendActiveSession() {
  recordUserActivity(true);
  closeIdleWarningModal();
  showToast('Sesi login berhasil dilanjutkan.');
}
window.extendActiveSession = extendActiveSession;

function clearLoginBannerStyle() {
  const errorEl = document.getElementById('login-error');
  if (!errorEl) return;
  errorEl.className = 'alert-banner alert-danger';
  const iconEl = errorEl.querySelector('.alert-icon');
  if (iconEl) iconEl.innerHTML = '&#9888;';
}

function showIdleLogoutBannerOnLogin(minutes) {
  const errorEl = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  if (!errorEl || !errorText) return;
  const mins = Number(minutes) > 0 ? Number(minutes) : DEFAULT_SESSION_TIMEOUT_MINUTES;
  errorEl.className = 'alert-banner alert-idle-warning';
  const iconEl = errorEl.querySelector('.alert-icon');
  if (iconEl) iconEl.innerHTML = '&#9203;';
  errorText.textContent = 'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama ' + mins + ' menit. Silakan masuk kembali.';
  delete errorText._origText;
  if (errorText.firstChild) delete errorText.firstChild._origText;
  errorEl.style.display = 'flex';
  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(errorEl);
  }
}

function consumePendingIdleLogoutNotice() {
  try {
    const raw = localStorage.getItem('ekasir_idle_logout_notice');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && (Date.now() - Number(parsed.ts) < 12 * 3600 * 1000)) {
      showIdleLogoutBannerOnLogin(parsed.minutes || getSessionTimeoutMinutes());
      return true;
    }
    localStorage.removeItem('ekasir_idle_logout_notice');
  } catch (e) { }
  return false;
}

function triggerIdleAutoLogout(timeoutMin) {
  if (_isAutoLoggingOut) return;
  _isAutoLoggingOut = true;
  try {
    const mins = Number(timeoutMin) > 0 ? Number(timeoutMin) : getSessionTimeoutMinutes();
    closeIdleWarningModal();
    try { closeModal(); } catch (e) { }
    CART = [];
    EDITING_TRANSACTION = null;
    SELECTED_CUSTOMER = null;
    try {
      localStorage.setItem('ekasir_idle_logout_notice', JSON.stringify({ minutes: mins, ts: Date.now() }));
    } catch (e) { }
    handleLogout({ reason: 'idle', minutes: mins });
  } finally {
    _isAutoLoggingOut = false;
  }
}

function checkIdleSessionStatus() {
  if (!TOKEN) {
    closeIdleWarningModal();
    return;
  }
  const timeoutMin = getSessionTimeoutMinutes();
  if (timeoutMin <= 0) {
    closeIdleWarningModal();
    return;
  }

  const timeoutMs = timeoutMin * 60 * 1000;
  const warningSec = Math.min(IDLE_WARNING_THRESHOLD_SECONDS, Math.max(10, Math.floor((timeoutMs / 1000) / 2)));
  const warningMs = warningSec * 1000;
  const lastAct = getLastActivityTimestamp();

  if (!lastAct) {
    recordUserActivity(true);
    return;
  }

  const elapsed = Date.now() - lastAct;
  const remainingMs = timeoutMs - elapsed;

  if (remainingMs <= 0) {
    triggerIdleAutoLogout(timeoutMin);
  } else if (remainingMs <= warningMs) {
    const secLeft = Math.max(1, Math.ceil(remainingMs / 1000));
    showIdleWarningModal(secLeft, warningSec);
  } else if (_idleWarningVisible) {
    closeIdleWarningModal();
  }
}

function initIdleSessionListeners() {
  if (_idleListenersBound) return;
  _idleListenersBound = true;

  const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'mousemove'];
  const onActivity = function () {
    recordUserActivity(false);
  };
  activityEvents.forEach(function (evt) {
    window.addEventListener(evt, onActivity, { passive: true, capture: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && TOKEN) {
      checkIdleSessionStatus();
    }
  });

  window.addEventListener('focus', function () {
    if (TOKEN) {
      checkIdleSessionStatus();
    }
  });

  window.addEventListener('storage', function (e) {
    if (!e) return;
    if (e.key === 'ekasir_token' && !e.newValue && TOKEN) {
      stopIdleSessionMonitor();
      TOKEN = null;
      USER_NAME = '';
      USER_ROLE = '';
      CURRENT_USER = null;
      CURRENT_USER_PERMISSIONS = null;
      CART = [];
      EDITING_TRANSACTION = null;
      SELECTED_CUSTOMER = null;
      if (document.body) {
        document.body.classList.remove('perm-no-edit', 'perm-no-delete', 'role-koordinator-active');
      }
      showLoginScreen();
      consumePendingIdleLogoutNotice();
    } else if ((e.key === 'ekasir_last_activity' || e.key === 'ekasir_timeout_minutes') && TOKEN) {
      checkIdleSessionStatus();
    }
  });
}

function startIdleSessionMonitor(isFreshLogin) {
  initIdleSessionListeners();
  const cachedSettings = getCachedData('settings');
  if (cachedSettings) {
    syncSessionTimeoutFromSettings(cachedSettings);
  }
  if (isFreshLogin || !getLastActivityTimestamp()) {
    recordUserActivity(true);
  }
  if (_idleMonitorInterval) {
    clearInterval(_idleMonitorInterval);
  }
  _idleMonitorInterval = setInterval(checkIdleSessionStatus, 1000);
  checkIdleSessionStatus();
}

function stopIdleSessionMonitor() {
  if (_idleMonitorInterval) {
    clearInterval(_idleMonitorInterval);
    _idleMonitorInterval = null;
  }
  closeIdleWarningModal();
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
  const lcdStatus = document.getElementById('vault-lcd-status');
  const lcdLock = document.getElementById('vault-lcd-lock');
  const doorCard = document.getElementById('vault-door-card');

  if (!userEl || !passEl) return false;
  const username = userEl.value.trim();
  const password = passEl.value;

  VaultAudio.playClick();
  spinCamWheel(120);

  if (lcdStatus) {
    lcdStatus.textContent = 'MEMVERIFIKASI...';
    lcdStatus.className = 'vault-lcd-status vault-status-verifying';
  }

  clearLoginBannerStyle();
  if (errorEl) errorEl.style.display = 'none';
  if (spinner) spinner.style.display = 'inline-block';
  if (submitBtn) submitBtn.disabled = true;

  api('loginUser', username, password).then(function (res) {
    if (spinner) spinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;

    if (!res.success) {
      VaultAudio.playError();
      if (doorCard) {
        doorCard.classList.remove('vault-shake');
        void doorCard.offsetWidth; // force reflow
        doorCard.classList.add('vault-shake');
      }
      if (lcdStatus) {
        lcdStatus.textContent = 'AKSES DITOLAK';
        lcdStatus.className = 'vault-lcd-status vault-status-denied';
      }
      clearLoginBannerStyle();
      if (errorText) errorText.textContent = res.message;
      if (errorEl) errorEl.style.display = 'flex';
      return;
    }

    // Login Sukses: Efek Buka Pintu Brankas
    VaultAudio.playSuccess();
    spinCamWheel(720);
    if (doorCard) doorCard.classList.add('vault-unlocked');
    if (lcdStatus) {
      lcdStatus.textContent = 'AKSES DIIZINKAN';
      lcdStatus.className = 'vault-lcd-status vault-status-granted';
    }
    if (lcdLock) {
      lcdLock.textContent = 'TERBUKA';
      lcdLock.className = 'vault-lcd-lock vault-lock-open';
    }

    window.__IDLE_EXPIRED_ON_LOAD = false;
    try { localStorage.removeItem('ekasir_idle_logout_notice'); } catch (err) { }

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
    recordUserActivity(true);

    setTimeout(function () {
      enterApp();
    }, 600);
  }).catch(function (err) {
    if (spinner) spinner.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    VaultAudio.playError();
    if (doorCard) {
      doorCard.classList.remove('vault-shake');
      void doorCard.offsetWidth;
      doorCard.classList.add('vault-shake');
    }
    if (lcdStatus) {
      lcdStatus.textContent = 'ERROR SISTEM';
      lcdStatus.className = 'vault-lcd-status vault-status-denied';
    }
    clearLoginBannerStyle();
    if (errorText) errorText.textContent = 'Gagal terhubung: ' + (err.message || err);
    if (errorEl) errorEl.style.display = 'flex';
  });

  return false;
}

function handleLogout(opts) {
  const isIdleLogout = !!(opts && opts.reason === 'idle');
  stopIdleSessionMonitor();
  if (typeof cleanupAppNotifications === 'function') {
    cleanupAppNotifications();
  }
  TOKEN = null;
  USER_NAME = '';
  USER_ROLE = '';
  CURRENT_USER = null;
  CURRENT_USER_PERMISSIONS = null;
  if (typeof resetCart === 'function') resetCart();
  removeSafeSession('ekasir_token');
  removeSafeSession('ekasir_user');
  removeSafeSession('ekasir_role');
  removeSafeSession('ekasir_permissions');
  removeSafeSession('ekasir_available_roles');
  try {
    localStorage.removeItem('ekasir_last_activity');
    if (!isIdleLogout) {
      localStorage.removeItem('ekasir_idle_logout_notice');
    }
  } catch (e) { }
  if (document.body) {
    document.body.classList.remove('perm-no-edit', 'perm-no-delete', 'role-koordinator-active');
  }
  if (document.documentElement) document.documentElement.classList.remove('has-session');
  invalidateCache();
  if (typeof logoutSupabaseUser === 'function') {
    logoutSupabaseUser().catch(function () { });
  }
  showLoginScreen();
  if (isIdleLogout) {
    showIdleLogoutBannerOnLogin(opts.minutes || getSessionTimeoutMinutes());
  } else {
    clearLoginBannerStyle();
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.style.display = 'none';
  }
}

function showLoginScreen() {
  if (document.documentElement) document.documentElement.classList.remove('has-session');
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  if (loginScreen) loginScreen.style.display = 'flex';
  if (appShell) appShell.style.display = 'none';
}

function enterApp() {
  if (document.documentElement) document.documentElement.classList.add('has-session');
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

  startIdleSessionMonitor(false);
  applyBrandLogo();
  updateSidebarVisibility();
  router();
  updateGlobalReceivableBadge();
  prefetchCoreDataInBackground();
  syncGlobalRolePermissions();
  if (typeof initAppNotifications === 'function') {
    initAppNotifications();
  }
}

function syncGlobalRolePermissions() {
  api('getRolePermissions', TOKEN).then(function (res) {
    if (!res) return;
    const perms = (res.permissions && typeof res.permissions === 'object') ? res.permissions : (typeof res === 'object' && !res.error ? res : null);
    if (!perms) return;
    CURRENT_ROLES_PERMISSIONS = perms;
    const rolesList = Array.isArray(res.roles) && res.roles.length > 0 ? res.roles : Object.keys(perms);
    AVAILABLE_ROLES = rolesList;
    setSafeSession('ekasir_available_roles', JSON.stringify(AVAILABLE_ROLES));
    if (USER_ROLE && perms[USER_ROLE]) {
      CURRENT_USER_PERMISSIONS = perms[USER_ROLE];
      setSafeSession('ekasir_permissions', JSON.stringify(CURRENT_USER_PERMISSIONS));
    }
    updateSidebarVisibility();
    const roleContainer = document.getElementById('role-matrix-container');
    if (roleContainer) {
      renderRoleMatrixUI();
    }
  }).catch(function () { });
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

  document.querySelectorAll('.mobile-nav-item').forEach(function (mobItem) {
    const mobRoute = mobItem.getAttribute('data-route') || (mobItem.getAttribute('href') || '').replace('#', '');
    if (mobRoute) {
      mobItem.style.display = userCanView(mobRoute) ? '' : 'none';
    }
  });

  const quickPosBtn = document.querySelector('.topbar-quick-pos');
  if (quickPosBtn) {
    quickPosBtn.style.display = (userCanView('pos') && userCanEdit('pos')) ? '' : 'none';
  }
}

function prefetchCoreDataInBackground() {
  if (!TOKEN) return;
  setTimeout(function () {
    if (!isCacheValid('products')) {
      api('getPosInitData', TOKEN).then(function (res) {
        setCachedData('products', res.products || []);
        setCachedData('customers', res.customers || []);
        setCachedData('settings', res.settings || {});
        if (res.batches && res.batches.length > 0) {
          setCachedData('batches', res.batches);
        }
        CUSTOMERS_CACHE = res.customers || [];
        APP_SETTINGS = res.settings || {};
        syncSessionTimeoutFromSettings(APP_SETTINGS);
        PRICE_TIERS_LIST = res.priceTiers || ['Eceran'];
        PRODUCTS_CACHE = (res.products || []).filter(function (p) {
          return p && p.active && Number(p.stock || 0) > 0 && !isRawProduct(p.unit);
        });
        applyBrandLogo();
      }).catch(function () { });
    } else if (!isCacheValid('settings')) {
      api('getSettings', TOKEN).then(function (settings) {
        setCachedData('settings', settings || {});
        APP_SETTINGS = settings || {};
        syncSessionTimeoutFromSettings(APP_SETTINGS);
        applyBrandLogo();
      }).catch(function () { });
    }

    // Prefetch santai di latar belakang untuk master data yang sering dibuka
    setTimeout(function () {
      if (!isCacheValid('outlets')) {
        api('getOutlets', TOKEN).then(function (list) {
          setCachedData('outlets', Array.isArray(list) ? list : []);
        }).catch(function () { });
      }
      if (!isCacheValid('suppliers')) {
        api('getSuppliers', TOKEN).then(function (list) {
          setCachedData('suppliers', Array.isArray(list) ? list : []);
          SUPPLIERS_CACHE = Array.isArray(list) ? list : [];
        }).catch(function () { });
      }
      if (!isCacheValid('farmers')) {
        api('getFarmers', TOKEN).then(function (list) {
          setCachedData('farmers', Array.isArray(list) ? list : []);
          FARMERS_CACHE = Array.isArray(list) ? list : [];
        }).catch(function () { });
      }
    }, 1200);
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
      sidebarWrap.innerHTML = '<img src="' + escapeHtml(logoLight) + '" class="sidebar-brand-logo-img" alt="Logo Toko" onerror="this.parentElement.innerHTML=\'<div class=\\\'brand-logo\\\'>🏪</div>\'">';
    } else {
      sidebarWrap.innerHTML = '<div class="brand-logo" aria-hidden="true">🏪</div>';
    }
  }

  // Layar Login (Latar Belakang Terang) -> Pakai Logo Primer Full Color
  if (loginWrap) {
    if (logoPrimary) {
      loginWrap.innerHTML = '<img src="' + escapeHtml(logoPrimary) + '" class="brand-logo-img" alt="Logo Toko" onerror="this.parentElement.innerHTML=\'<div class=\\\'brand-logo\\\'>🏪</div>\'">';
    } else {
      loginWrap.innerHTML = '<div class="brand-logo" aria-hidden="true">🏪</div>';
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


// Sinkronisasi otomatis sesi Supabase saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  checkSupabaseSession().then(user => {
    if (user && typeof updateUserInfoUI === 'function') {
      updateUserInfoUI(user);
    }
  });
});

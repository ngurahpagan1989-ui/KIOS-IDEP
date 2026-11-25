// ==============================================================================
// PUSAT NOTIFIKASI OPERASIONAL & NOTIFIKASI LANGSUNG KE HP (PWA + WEB PUSH VAPID)
// ==============================================================================
const DEFAULT_VAPID_PUBLIC_KEY = 'BLzhkf4qxdi1rwnsNMJoReFfNtgOdxwuvcGpdRoDQGZ6GZ88JyRkMJ5FAcrINdyKTjoHZmRmwfp8BhmbXiGhF9w';
const NOTIF_STORAGE_KEY = 'pos_app_notifications_v1';
const NOTIF_READ_IDS_KEY = 'pos_read_notif_ids_v1';
const NOTIF_PREFS_KEY = 'pos_device_notif_prefs_v1';
const NOTIF_ENABLED_KEY = 'pos_device_notif_enabled_v1';
const NOTIF_DAILY_SCAN_KEY = 'pos_daily_alert_keys_v1';
const NOTIF_ALL_CATEGORIES = ['security', 'sales', 'stock', 'qc', 'finance', 'aftersales'];

let APP_NOTIFICATIONS_LIST = [];
let CURRENT_NOTIF_FILTER = 'all';
let _notifSystemInitialized = false;
let _notifScanIntervalId = null;
let _notifEscBound = false;
const _shownOsNotifIds = new Set();

function getConfiguredVapidPublicKey() {
  const fromSettings = (APP_SETTINGS && APP_SETTINGS['vapid_public_key']) ? String(APP_SETTINGS['vapid_public_key']).trim() : '';
  return fromSettings || DEFAULT_VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getDeviceNotifPrefs() {
  const defaults = {
    security: true,
    sales: true,
    stock: true,
    qc: true,
    finance: true,
    aftersales: true,
    sound: true
  };
  try {
    const raw = localStorage.getItem(NOTIF_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return Object.assign(defaults, parsed);
      }
    }
  } catch (e) { }
  return defaults;
}

function saveDeviceNotifPrefs(prefs) {
  try {
    localStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) { }
}

function getEnabledNotifCategoriesArray() {
  const prefs = getDeviceNotifPrefs();
  return NOTIF_ALL_CATEGORIES.filter(function (c) { return prefs[c] !== false; });
}

function isDeviceNotifEnabled() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  try {
    return localStorage.getItem(NOTIF_ENABLED_KEY) !== 'false';
  } catch (e) {
    return true;
  }
}

function getReadNotifIdsSet() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_READ_IDS_KEY) || '[]');
    if (Array.isArray(raw)) return new Set(raw);
  } catch (e) { }
  return new Set();
}

function saveReadNotifIdsSet(idSet) {
  try {
    const arr = Array.from(idSet).slice(-250);
    localStorage.setItem(NOTIF_READ_IDS_KEY, JSON.stringify(arr));
  } catch (e) { }
}

function loadStoredNotifications() {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
    if (Array.isArray(raw)) return raw;
  } catch (e) { }
  return [];
}

function persistNotificationsList() {
  try {
    const trimmed = APP_NOTIFICATIONS_LIST.slice(0, 80);
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) { }
}

function getNotifCategoryMeta(category, urgent) {
  const cat = String(category || 'general').toLowerCase();
  if (urgent && cat === 'security') return { icon: '🚨', label: 'Keamanan' };
  switch (cat) {
    case 'security': return { icon: '🛡️', label: 'Keamanan & Audit' };
    case 'sales': return { icon: '💰', label: 'Kasir POS' };
    case 'stock': return { icon: '📦', label: 'Persediaan Stok' };
    case 'qc': return { icon: '🔬', label: 'QC & Oven DHT' };
    case 'finance': return { icon: '💳', label: 'Piutang & Konsinyasi' };
    case 'aftersales': return { icon: '🌱', label: 'Purna Jual' };
    default: return { icon: '🔔', label: 'Sistem' };
  }
}

function formatNotifRelativeTime(isoStr) {
  if (!isoStr) return 'Baru saja';
  const ts = new Date(isoStr).getTime();
  if (isNaN(ts)) return 'Baru saja';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 45) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + ' mnt lalu';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + ' jam lalu';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return diffDay + ' hr lalu';
  return formatDate(isoStr);
}

function playGentleNotifChime(isUrgent) {
  const prefs = getDeviceNotifPrefs();
  if (prefs.sound === false) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isUrgent ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isUrgent ? 740 : 587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(isUrgent ? 987.77 : 783.99, ctx.currentTime + 0.11);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.33);
    setTimeout(function () {
      try { ctx.close(); } catch (e) { }
    }, 500);
  } catch (e) { }
}

function ringTopbarBellAnimation() {
  const btn = document.getElementById('topbar-notif-btn');
  if (!btn) return;
  btn.classList.remove('bell-ringing');
  void btn.offsetWidth;
  btn.classList.add('bell-ringing');
  setTimeout(function () {
    btn.classList.remove('bell-ringing');
  }, 1600);
}

function triggerNativePhoneNotification(notif, forceShow) {
  if (!notif || typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (!forceShow && !isDeviceNotifEnabled()) return;

  const prefs = getDeviceNotifPrefs();
  const cat = String(notif.category || 'general').toLowerCase();
  if (!forceShow && NOTIF_ALL_CATEGORIES.indexOf(cat) !== -1 && prefs[cat] === false) {
    return;
  }

  const notifId = String(notif.id || ('notif-' + Date.now()));
  if (!forceShow && _shownOsNotifIds.has(notifId)) return;
  _shownOsNotifIds.add(notifId);

  const cleanRoute = notif.route
    ? (String(notif.route).startsWith('#') ? String(notif.route) : ('#' + String(notif.route)))
    : '#dashboard';

  const options = {
    body: notif.body || 'Pembaruan operasional toko.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: notifId,
    renotify: true,
    requireInteraction: Boolean(notif.urgent),
    vibrate: notif.urgent ? [240, 100, 240, 100, 320] : [150, 70, 150],
    data: {
      id: notifId,
      title: notif.title || '🔔 Notifikasi Toko',
      body: notif.body || '',
      category: cat,
      route: cleanRoute,
      urgent: Boolean(notif.urgent),
      created_at: notif.created_at || new Date().toISOString()
    }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(function (reg) {
      if (reg && typeof reg.showNotification === 'function') {
        return reg.showNotification(notif.title || '🔔 Notifikasi Toko', options);
      }
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SHOW_LOCAL_NOTIFICATION',
          payload: Object.assign({ title: notif.title || '🔔 Notifikasi Toko' }, options.data)
        });
      }
    }).catch(function () { });
  }
}

function ingestIncomingNotification(rawNotif, opts) {
  if (!rawNotif || typeof rawNotif !== 'object') return;
  const options = opts || {};
  const id = String(rawNotif.id || ('notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)));

  const normalized = {
    id: id,
    title: String(rawNotif.title || '🔔 Notifikasi Toko'),
    body: String(rawNotif.body || ''),
    category: String(rawNotif.category || 'general').toLowerCase(),
    route: String(rawNotif.route || '#dashboard').startsWith('#')
      ? String(rawNotif.route || '#dashboard')
      : ('#' + String(rawNotif.route || 'dashboard')),
    urgent: Boolean(rawNotif.urgent),
    actor_name: String(rawNotif.actor_name || 'Sistem'),
    created_at: rawNotif.created_at || new Date().toISOString()
  };

  const existsIdx = APP_NOTIFICATIONS_LIST.findIndex(function (item) {
    return item && item.id === normalized.id;
  });

  const isBrandNew = existsIdx === -1;
  if (isBrandNew) {
    APP_NOTIFICATIONS_LIST.unshift(normalized);
  } else {
    APP_NOTIFICATIONS_LIST[existsIdx] = Object.assign({}, APP_NOTIFICATIONS_LIST[existsIdx], normalized);
  }

  APP_NOTIFICATIONS_LIST.sort(function (a, b) {
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
  if (APP_NOTIFICATIONS_LIST.length > 80) {
    APP_NOTIFICATIONS_LIST.length = 80;
  }

  persistNotificationsList();
  updateTopbarNotifBadge();
  renderNotificationCenterList();

  if (isBrandNew && !options.silent) {
    ringTopbarBellAnimation();
    if (options.playSound !== false) {
      playGentleNotifChime(normalized.urgent);
    }
    if (options.showOsBanner !== false) {
      triggerNativePhoneNotification(normalized, Boolean(options.forceBanner));
    }
  }
}

function updateTopbarNotifBadge() {
  const badgeEl = document.getElementById('topbar-notif-badge');
  if (!badgeEl) return;
  const readSet = getReadNotifIdsSet();
  const prefs = getDeviceNotifPrefs();
  const unreadCount = APP_NOTIFICATIONS_LIST.filter(function (n) {
    if (!n || readSet.has(n.id)) return false;
    if (NOTIF_ALL_CATEGORIES.indexOf(n.category) !== -1 && prefs[n.category] === false) return false;
    return true;
  }).length;

  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badgeEl.style.display = 'inline-flex';
  } else {
    badgeEl.textContent = '0';
    badgeEl.style.display = 'none';
  }
}

function getDeviceEnvironmentInfo() {
  const ua = (navigator.userAgent || '').toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isStandalone = ('standalone' in window.navigator && window.navigator.standalone) ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const hasNotificationApi = typeof Notification !== 'undefined';
  const hasPushManager = ('serviceWorker' in navigator) && ('PushManager' in window);
  const permission = hasNotificationApi ? Notification.permission : 'unsupported';
  return {
    isIos: isIos,
    isStandalone: isStandalone,
    hasNotificationApi: hasNotificationApi,
    hasPushManager: hasPushManager,
    permission: permission,
    enabled: isDeviceNotifEnabled()
  };
}

function renderNotifDeviceStatusBar() {
  const bar = document.getElementById('notif-device-status-bar');
  if (!bar) return;
  const env = getDeviceEnvironmentInfo();

  if (env.isIos && !env.isStandalone) {
    bar.innerHTML =
      '<div class="notif-device-card">' +
      '<div class="notif-device-card-info">' +
      '<span class="notif-device-card-title">📱 iPhone/iPad: Pasang ke Layar Utama</span>' +
      '<span class="notif-device-card-desc">Ketuk tombol <strong>Bagikan (Share)</strong> di Safari lalu pilih <strong>Tambah ke Layar Utama</strong> agar notifikasi HP aktif.</span>' +
      '</div>' +
      '</div>';
    return;
  }

  if (!env.hasNotificationApi) {
    bar.innerHTML =
      '<div class="notif-device-card">' +
      '<div class="notif-device-card-info">' +
      '<span class="notif-device-card-title">ℹ️ Pusat Notifikasi Dalam Aplikasi Aktif</span>' +
      '<span class="notif-device-card-desc">Browser ini belum mendukung pop-up OS, namun seluruh notifikasi realtime tetap tampil di lonceng ini.</span>' +
      '</div>' +
      '</div>';
    return;
  }

  if (env.permission === 'denied') {
    bar.innerHTML =
      '<div class="notif-device-card">' +
      '<div class="notif-device-card-info">' +
      '<span class="notif-device-card-title" style="color:#B91C1C;">🔕 Izin Notifikasi Browser Diblokir</span>' +
      '<span class="notif-device-card-desc">Buka ikon gembok di bilah alamat browser HP Anda, lalu ubah izin <strong>Notifikasi</strong> menjadi <strong>Izinkan (Allow)</strong>.</span>' +
      '</div>' +
      '</div>';
    return;
  }

  if (env.enabled) {
    bar.innerHTML =
      '<div class="notif-device-card">' +
      '<div class="notif-device-card-info">' +
      '<span class="notif-device-card-title" style="color:#15803D;">🟢 Notifikasi HP Aktif di Perangkat Ini</span>' +
      '<span class="notif-device-card-desc">HP Anda siap menerima sinyal transaksi, stok kritis, QC, dan jatuh tempo secara langsung.</span>' +
      '</div>' +
      '<div class="notif-device-card-btns">' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="sendTestDeviceNotification()">🔔 Tes Bunyi</button>' +
      '</div>' +
      '</div>';
  } else {
    bar.innerHTML =
      '<div class="notif-device-card">' +
      '<div class="notif-device-card-info">' +
      '<span class="notif-device-card-title">📲 Aktifkan Notifikasi Langsung di HP Ini</span>' +
      '<span class="notif-device-card-desc">Terima pemberitahuan otomatis layaknya WhatsApp tanpa bot pihak ketiga.</span>' +
      '</div>' +
      '<div class="notif-device-card-btns">' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="enableDevicePushNotifications()">Aktifkan Sekarang</button>' +
      '</div>' +
      '</div>';
  }

  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(bar);
  }
}

function renderNotificationCenterList() {
  const listEl = document.getElementById('notif-center-list');
  if (!listEl) return;

  renderNotifDeviceStatusBar();

  const readSet = getReadNotifIdsSet();
  const prefs = getDeviceNotifPrefs();

  const filtered = APP_NOTIFICATIONS_LIST.filter(function (item) {
    if (!item) return false;
    if (CURRENT_NOTIF_FILTER === 'all') {
      if (NOTIF_ALL_CATEGORIES.indexOf(item.category) !== -1 && prefs[item.category] === false) {
        return false;
      }
      return true;
    }
    if (CURRENT_NOTIF_FILTER === 'urgent') return Boolean(item.urgent);
    return item.category === CURRENT_NOTIF_FILTER;
  });

  if (filtered.length === 0) {
    listEl.innerHTML =
      '<div class="notif-empty-state">' +
      '<div style="font-size:28px;margin-bottom:8px;">🔔</div>' +
      '<div style="font-weight:600;color:var(--text-main);margin-bottom:4px;">Belum Ada Notifikasi pada Kategori Ini</div>' +
      '<div style="font-size:12px;">Klik <strong>Pindai Kondisi Toko</strong> di bawah untuk memeriksa stok kritis, oven DHT, piutang, dan jadwal sapa pelanggan.</div>' +
      '</div>';
    if (window.i18n && typeof window.i18n.translateDOM === 'function') {
      window.i18n.translateDOM(listEl);
    }
    return;
  }

  listEl.innerHTML = filtered.map(function (item) {
    const isUnread = !readSet.has(item.id);
    const meta = getNotifCategoryMeta(item.category, item.urgent);
    const safeId = escapeHtml(item.id);
    const safeRoute = escapeHtml(item.route || '#dashboard');
    return (
      '<div class="notif-item-card' + (isUnread ? ' unread' : '') + (item.urgent ? ' urgent' : '') + '" onclick="handleNotificationCardClick(\'' + safeId + '\', \'' + safeRoute + '\')">' +
      '<div class="notif-item-icon" aria-hidden="true">' + meta.icon + '</div>' +
      '<div class="notif-item-body-wrap">' +
      '<div class="notif-item-top-row">' +
      '<div class="notif-item-title">' + escapeHtml(item.title) + '</div>' +
      '<span class="notif-item-time" data-no-i18n="true">' + escapeHtml(formatNotifRelativeTime(item.created_at)) + '</span>' +
      '</div>' +
      '<div class="notif-item-desc">' + escapeHtml(item.body) + '</div>' +
      '<div class="notif-item-meta">' +
      '<span class="notif-cat-tag">' + escapeHtml(meta.label) + '</span>' +
      '<span>Oleh: ' + escapeHtml(item.actor_name || 'Sistem') + '</span>' +
      '</div>' +
      '</div>' +
      (isUnread ? '<span class="notif-unread-dot" title="Belum dibaca"></span>' : '') +
      '</div>'
    );
  }).join('');
}

function toggleNotificationCenter(ev) {
  if (ev && ev.stopPropagation) ev.stopPropagation();
  const panel = document.getElementById('notif-center-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  if (isOpen) {
    closeNotificationCenter();
  } else {
    openNotificationCenter();
  }
}

function openNotificationCenter() {
  const panel = document.getElementById('notif-center-panel');
  const overlay = document.getElementById('notif-center-overlay');
  const btn = document.getElementById('topbar-notif-btn');
  if (!panel) return;

  renderNotificationCenterList();
  if (overlay) overlay.style.display = 'block';
  panel.style.display = 'flex';
  if (btn) btn.setAttribute('aria-expanded', 'true');
  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(panel);
  }
}

function closeNotificationCenter() {
  const panel = document.getElementById('notif-center-panel');
  const overlay = document.getElementById('notif-center-overlay');
  const btn = document.getElementById('topbar-notif-btn');
  if (panel) panel.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function setNotificationFilter(filterKey) {
  CURRENT_NOTIF_FILTER = filterKey || 'all';
  document.querySelectorAll('#notif-filter-bar .notif-filter-pill').forEach(function (pill) {
    pill.classList.toggle('active', pill.getAttribute('data-filter') === CURRENT_NOTIF_FILTER);
  });
  renderNotificationCenterList();
}

function markSingleNotificationRead(notifId) {
  if (!notifId) return;
  const readSet = getReadNotifIdsSet();
  readSet.add(String(notifId));
  saveReadNotifIdsSet(readSet);
  updateTopbarNotifBadge();
}

function markAllNotificationsRead() {
  const readSet = getReadNotifIdsSet();
  APP_NOTIFICATIONS_LIST.forEach(function (item) {
    if (item && item.id) readSet.add(String(item.id));
  });
  saveReadNotifIdsSet(readSet);
  updateTopbarNotifBadge();
  renderNotificationCenterList();
  showToast('Seluruh notifikasi ditandai sudah dibaca.');
}

function clearNotificationHistory() {
  const readSet = getReadNotifIdsSet();
  APP_NOTIFICATIONS_LIST.forEach(function (item) {
    if (item && item.id) readSet.add(String(item.id));
  });
  saveReadNotifIdsSet(readSet);
  APP_NOTIFICATIONS_LIST = [];
  persistNotificationsList();
  updateTopbarNotifBadge();
  renderNotificationCenterList();
  showToast('Riwayat notifikasi pada perangkat ini dibersihkan.');
}

function handleNotificationCardClick(notifId, targetRoute) {
  markSingleNotificationRead(notifId);
  closeNotificationCenter();
  const cleanRoute = String(targetRoute || '#dashboard').startsWith('#')
    ? String(targetRoute || '#dashboard')
    : ('#' + String(targetRoute || 'dashboard'));
  const routeKey = normalizeModuleKey(cleanRoute.replace('#', ''));
  if (!userCanView(routeKey)) {
    showToast('Akses ke modul ' + routeKey + ' dibatasi untuk peran ' + USER_ROLE + '.', true);
    return;
  }
  if (location.hash === cleanRoute) {
    router();
  } else {
    location.hash = cleanRoute;
  }
}

function openNotificationSettingsTab() {
  closeNotificationCenter();
  if (!userCanView('pengaturan')) {
    enableDevicePushNotifications();
    return;
  }
  CURRENT_SETTINGS_SUBTAB = 'notif';
  if (location.hash === '#pengaturan') {
    renderPengaturan(false);
    switchSettingTab('notif');
  } else {
    location.hash = '#pengaturan';
    setTimeout(function () {
      switchSettingTab('notif');
    }, 120);
  }
}

async function syncExistingPushSubscription(silent) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      const subJson = sub.toJSON ? sub.toJSON() : {};
      const keys = subJson.keys || {};
      window.__CURRENT_PUSH_ENDPOINT = sub.endpoint || '';
      if (TOKEN && sub.endpoint) {
        await api('savePushSubscription', TOKEN, {
          endpoint: sub.endpoint,
          p256dh: keys.p256dh || '',
          auth: keys.auth || '',
          categories: getEnabledNotifCategoriesArray(),
          device_label: navigator.userAgent || 'Perangkat POS'
        });
      }
      return sub;
    }
  } catch (e) {
    if (!silent) console.warn('[Push] Sinkronisasi langganan gagal:', e);
  }
  return null;
}

async function enableDevicePushNotifications() {
  const env = getDeviceEnvironmentInfo();
  if (env.isIos && !env.isStandalone) {
    showToast('Di iPhone/iPad: Ketuk Bagikan (Share) di Safari lalu pilih "Tambah ke Layar Utama" terlebih dahulu.', true);
    return;
  }
  if (!env.hasNotificationApi) {
    showToast('Browser perangkat ini belum mendukung pop-up notifikasi sistem.', true);
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      renderNotifDeviceStatusBar();
      refreshNotifSettingsPaneUI();
      showToast('Izin notifikasi belum diberikan. Silakan klik Izinkan (Allow) pada browser Anda.', true);
      return;
    }

    localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
    let pushMode = 'realtime_local';

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const vapidKey = getConfiguredVapidPublicKey();
          if (vapidKey) {
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey)
            });
          }
        }
        if (sub && sub.endpoint) {
          const subJson = sub.toJSON ? sub.toJSON() : {};
          const keys = subJson.keys || {};
          window.__CURRENT_PUSH_ENDPOINT = sub.endpoint;
          const saveRes = await api('savePushSubscription', TOKEN, {
            endpoint: sub.endpoint,
            p256dh: keys.p256dh || '',
            auth: keys.auth || '',
            categories: getEnabledNotifCategoriesArray(),
            device_label: navigator.userAgent || 'Handphone POS'
          });
          if (saveRes && saveRes.mode === 'full_web_push') {
            pushMode = 'full_web_push';
          }
        }
      } catch (subErr) {
        console.warn('[Push] Fallback ke mode notifikasi lokal & realtime:', subErr);
      }
    }

    renderNotifDeviceStatusBar();
    refreshNotifSettingsPaneUI();

    triggerNativePhoneNotification({
      id: 'welcome-notif-' + Date.now(),
      title: '🎉 Notifikasi POS Aktif!',
      body: pushMode === 'full_web_push'
        ? 'Handphone ini sudah terhubung penuh (Realtime + Background Web Push).'
        : 'Handphone ini siap menerima notifikasi operasional secara langsung!',
      category: 'general',
      route: '#dashboard',
      urgent: false
    }, true);

    showToast('Notifikasi langsung di handphone ini berhasil diaktifkan!');
  } catch (err) {
    showToast('Gagal mengaktifkan notifikasi: ' + (err.message || err), true);
  }
}

async function disableDevicePushNotifications() {
  try {
    localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const ep = sub.endpoint;
        try { await sub.unsubscribe(); } catch (e) { }
        if (TOKEN && ep) {
          await api('removePushSubscription', TOKEN, ep);
        }
      }
    }
    window.__CURRENT_PUSH_ENDPOINT = '';
    renderNotifDeviceStatusBar();
    refreshNotifSettingsPaneUI();
    showToast('Notifikasi pop-up pada perangkat ini dinonaktifkan.');
  } catch (err) {
    showToast('Gagal menonaktifkan notifikasi: ' + (err.message || err), true);
  }
}

async function sendTestDeviceNotification() {
  if (!isDeviceNotifEnabled()) {
    await enableDevicePushNotifications();
    return;
  }

  const testItem = {
    id: 'test-notif-' + Date.now(),
    title: '🔔 Tes Notifikasi Berhasil!',
    body: 'Mantap! Sinyal notifikasi mendarat mulus di layar handphone Anda.',
    category: 'general',
    route: '#dashboard',
    urgent: false,
    actor_name: USER_NAME || 'Pengguna',
    created_at: new Date().toISOString()
  };

  ingestIncomingNotification(testItem, { showOsBanner: true, forceBanner: true, playSound: true });

  if (window.__CURRENT_PUSH_ENDPOINT && TOKEN) {
    api('sendTestWebPush', TOKEN, {
      id: 'push-' + testItem.id,
      title: '📲 Tes Background Web Push',
      body: 'Server Web Push berhasil menghubungi handphone Anda!',
      category: 'general',
      route: '#dashboard',
      targetEndpoint: window.__CURRENT_PUSH_ENDPOINT
    }).catch(function () { });
  }

  showToast('Notifikasi uji coba dikirim ke layar perangkat Anda!');
}

function togglePersonalNotifCategory(catKey, isChecked) {
  const prefs = getDeviceNotifPrefs();
  prefs[catKey] = Boolean(isChecked);
  saveDeviceNotifPrefs(prefs);
  updateTopbarNotifBadge();
  renderNotificationCenterList();
  syncExistingPushSubscription(true);
  showToast('Preferensi kategori notifikasi HP diperbarui.');
}

function saveAdminVapidPublicKeyUI() {
  if (!userCanEdit('pengaturan')) {
    showToast('Akses ditolak: Hanya Administrator yang dapat mengubah kunci publik VAPID.', true);
    return;
  }
  const input = document.getElementById('set-vapid-public-key');
  if (!input) return;
  const val = String(input.value || '').trim() || DEFAULT_VAPID_PUBLIC_KEY;
  api('saveSettings', TOKEN, { vapid_public_key: val }).then(function () {
    if (!APP_SETTINGS) APP_SETTINGS = {};
    APP_SETTINGS['vapid_public_key'] = val;
    invalidateCache('settings');
    syncExistingPushSubscription(true);
    showToast('Kunci publik Web Push VAPID berhasil disimpan.');
  }).catch(function (err) {
    showToast('Gagal menyimpan kunci VAPID: ' + (err.message || err), true);
  });
}

function buildNotifSettingsPaneHTML(settings) {
  const env = getDeviceEnvironmentInfo();
  const prefs = getDeviceNotifPrefs();
  const vapidVal = (settings && settings['vapid_public_key']) ? settings['vapid_public_key'] : getConfiguredVapidPublicKey();
  const isUserAdmin = isAdmin();

  const statusBannerHtml = env.enabled
    ? (
      '<div class="notif-settings-status-banner is-active" id="notif-pane-status-box">' +
      '<div>' +
      '<div style="font-size:15px;font-weight:700;color:#166534;margin-bottom:4px;">🟢 Notifikasi Langsung Aktif di Perangkat Ini</div>' +
      '<div style="font-size:12.5px;color:#15803D;">Handphone/perangkat ini akan otomatis menampilkan pop-up dan getaran saat terjadi peristiwa operasional penting.</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="sendTestDeviceNotification()">🔔 Kirim Tes ke HP Ini</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" onclick="disableDevicePushNotifications()">🔕 Matikan di HP Ini</button>' +
      '</div>' +
      '</div>'
    )
    : (
      '<div class="notif-settings-status-banner" id="notif-pane-status-box">' +
      '<div>' +
      '<div style="font-size:15px;font-weight:700;color:var(--text-main);margin-bottom:4px;">📲 Notifikasi Langsung Belum Aktif di Perangkat Ini</div>' +
      '<div style="font-size:12.5px;color:var(--text-secondary);">' +
      (env.isIos && !env.isStandalone
        ? 'Untuk pengguna iPhone/iPad: Ketuk <strong>Bagikan (Share)</strong> di Safari lalu pilih <strong>Tambah ke Layar Utama</strong> terlebih dahulu.'
        : 'Aktifkan dalam 1 ketukan untuk menerima peringatan transaksi, stok habis, karantina QC, dan jatuh tempo langsung di layar HP Anda.') +
      '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
      '<button type="button" class="btn btn-primary" onclick="enableDevicePushNotifications()">📲 Aktifkan Notifikasi di HP Ini</button>' +
      '</div>' +
      '</div>'
    );

  const prefItems = [
    { key: 'security', title: '🚨 Keamanan, Void & Koreksi Stok', desc: 'Pembatalan nota (VOID), koreksi faktur, koreksi stok manual, dan perubahan rekening.' },
    { key: 'sales', title: '💰 Transaksi Kasir (POS) Baru', desc: 'Pemberitahuan setiap ada penjualan tunai, QRIS, transfer, maupun nota tempo baru.' },
    { key: 'stock', title: '📦 Stok Kritis & Kadaluarsa Batch', desc: 'Peringatan otomatis saat sisa stok <= 5 unit atau batch mendekati kadaluarsa H-30.' },
    { key: 'qc', title: '🔬 Quality Control & Oven DHT 24 Jam', desc: 'Lot benih masuk karantina/afkir QC serta pengingat selesai pengeringan oven DHT.' },
    { key: 'finance', title: '💳 Piutang Tempo & Konsinyasi Mitra', desc: 'Tagihan jatuh tempo, cicilan masuk, serta jadwal kunjungan opname outlet > 14 hari.' },
    { key: 'aftersales', title: '🌱 Klaim Garansi & Sapa Pelanggan H+7', desc: 'Klaim garansi daya tumbuh dari pelanggan dan pengingat antrean follow-up semai.' },
    { key: 'sound', title: '🔊 Nada Dering Lembut Saat Aplikasi Dibuka', desc: 'Bunyikan nada singkat yang nyaman saat notifikasi baru masuk ketika layar aplikasi aktif.' }
  ];

  const prefsGridHtml = prefItems.map(function (p) {
    const checkedAttr = prefs[p.key] !== false ? ' checked' : '';
    return (
      '<label class="notif-pref-card">' +
      '<input type="checkbox" data-personal-notif-pref="true"' + checkedAttr + ' onchange="togglePersonalNotifCategory(\'' + p.key + '\', this.checked)">' +
      '<div>' +
      '<div style="font-size:13px;font-weight:700;color:var(--text-main);margin-bottom:2px;">' + p.title + '</div>' +
      '<div style="font-size:11.5px;color:var(--text-secondary);line-height:1.4;">' + p.desc + '</div>' +
      '</div>' +
      '</label>'
    );
  }).join('');

  const adminVapidCardHtml = isUserAdmin
    ? (
      '<div class="card" style="margin-top:16px;">' +
      '<h3 style="margin-bottom:6px;">🔐 Konfigurasi Web Push Latar Belakang (VAPID Public Key)</h3>' +
      '<p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">Digunakan agar notifikasi tetap berbunyi di layar kunci HP meskipun aplikasi sedang ditutup rapat (bekerja bersama Supabase Edge Function <code>send-push</code>).</p>' +
      '<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">' +
      '<div class="field-group" style="flex:1;min-width:240px;margin-bottom:0;">' +
      '<label class="field-label" for="set-vapid-public-key">VAPID Public Key (ECDSA P-256 Base64URL)</label>' +
      '<div class="input-wrapper"><input type="text" id="set-vapid-public-key" value="' + escapeHtml(vapidVal) + '" style="padding-left:14px;font-family:\'JetBrains Mono\',monospace;font-size:12px;"></div>' +
      '</div>' +
      '<button type="button" class="btn btn-primary btn-sm" onclick="saveAdminVapidPublicKeyUI()" style="height:40px;padding:0 16px;">💾 Simpan Kunci VAPID</button>' +
      '</div>' +
      '</div>'
    )
    : '';

  return (
    '<div class="card">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px;">' +
    '<div>' +
    '<h3 style="margin:0 0 4px 0;">📲 Pengaturan Notifikasi Handphone (PWA &amp; Realtime)</h3>' +
    '<p style="margin:0;font-size:12.5px;color:var(--text-secondary);">Pengaturan ini berlaku khusus untuk <strong>perangkat / HP yang sedang Anda pegang saat ini</strong>, sehingga setiap staf dapat memilih kategori sesuai tugasnya.</p>' +
    '</div>' +
    '<button type="button" class="btn btn-secondary btn-sm" onclick="runSmartOperationalAlertScan(true)">🔍 Pindai Kondisi Toko Sekarang</button>' +
    '</div>' +
    statusBannerHtml +
    '<h4 style="margin:0 0 4px 0;font-size:14px;color:var(--text-main);">Pilih Kategori Notifikasi di Perangkat Ini</h4>' +
    '<p style="margin:0;font-size:12px;color:var(--text-muted);">Centang jenis pemberitahuan yang ingin Anda terima di HP ini:</p>' +
    '<div class="notif-pref-grid">' + prefsGridHtml + '</div>' +
    '</div>' +
    adminVapidCardHtml
  );
}

function refreshNotifSettingsPaneUI() {
  const pane = document.getElementById('pane-notif');
  if (!pane) return;
  pane.innerHTML = buildNotifSettingsPaneHTML(APP_SETTINGS || {});
  if (typeof enforceRolePermissionsDOM === 'function') {
    enforceRolePermissionsDOM('pengaturan');
  }
  if (window.i18n && typeof window.i18n.translateDOM === 'function') {
    window.i18n.translateDOM(pane);
  }
}

function getDailyEmittedAlertKeys() {
  const todayStr = new Date().toISOString().split('T')[0];
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTIF_DAILY_SCAN_KEY) || '{}');
    if (parsed && parsed.date === todayStr && Array.isArray(parsed.keys)) {
      return { date: todayStr, set: new Set(parsed.keys) };
    }
  } catch (e) { }
  return { date: todayStr, set: new Set() };
}

function saveDailyEmittedAlertKeys(dateStr, keySet) {
  try {
    localStorage.setItem(NOTIF_DAILY_SCAN_KEY, JSON.stringify({
      date: dateStr,
      keys: Array.from(keySet)
    }));
  } catch (e) { }
}

async function runSmartOperationalAlertScan(isManual) {
  if (!TOKEN) return;
  const tracker = getDailyEmittedAlertKeys();
  const todayStr = tracker.date;
  let emittedCount = 0;

  function emitScanAlert(uniqueKey, alertObj) {
    const fullId = 'scan-' + todayStr + '-' + uniqueKey + (isManual ? ('-m' + Date.now().toString().slice(-4)) : '');
    if (!isManual && tracker.set.has(uniqueKey)) return;
    tracker.set.add(uniqueKey);
    emittedCount++;
    ingestIncomingNotification({
      id: fullId,
      title: alertObj.title,
      body: alertObj.body,
      category: alertObj.category,
      route: alertObj.route,
      urgent: Boolean(alertObj.urgent),
      actor_name: 'Pemindai Otomatis',
      created_at: new Date().toISOString()
    }, {
      showOsBanner: isManual || Boolean(alertObj.urgent) || emittedCount <= 2,
      playSound: emittedCount === 1
    });
  }

  try {
    const results = await Promise.allSettled([
      api('getDashboardSummary', TOKEN),
      api('getQCRecords', TOKEN),
      api('getReceivables', TOKEN),
      api('getOutlets', TOKEN),
      api('getFollowUpList', TOKEN)
    ]);

    // 1. Stok Menipis & Mendekati Kadaluarsa
    if (results[0].status === 'fulfilled' && results[0].value) {
      const dash = results[0].value;
      const lowList = Array.isArray(dash.lowStock) ? dash.lowStock : [];
      if (lowList.length > 0) {
        const zeroCount = lowList.filter(function (p) { return Number(p.stock || 0) <= 0; }).length;
        const preview = lowList.slice(0, 3).map(function (p) { return p.name + ' (' + p.stock + ' ' + (p.unit || 'pcs') + ')'; }).join(', ');
        emitScanAlert('low-stock-' + lowList.length, {
          title: zeroCount > 0 ? ('🔴 ' + zeroCount + ' Produk Habis & Stok Menipis!') : ('⚠️ ' + lowList.length + ' Produk Stok Menipis (<= 5)'),
          body: preview + (lowList.length > 3 ? ' dan ' + (lowList.length - 3) + ' produk lainnya perlu restock.' : '.'),
          category: 'stock',
          route: '#stok',
          urgent: zeroCount > 0
        });
      }

      const expList = Array.isArray(dash.expiring) ? dash.expiring : [];
      if (expList.length > 0) {
        const expPreview = expList.slice(0, 2).map(function (b) { return (b.product_id || b.batch_code) + ' (Exp: ' + formatDate(b.expiry_date) + ')'; }).join(', ');
        emitScanAlert('expiring-' + expList.length, {
          title: '⏳ ' + expList.length + ' Batch Mendekati Kadaluarsa (H-30)',
          body: expPreview + (expList.length > 2 ? ' +' + (expList.length - 2) + ' batch lainnya.' : '.'),
          category: 'stock',
          route: '#stok',
          urgent: false
        });
      }
    }

    // 2. Oven DHT Jatuh Tempo / Selesai 24 Jam & Karantina QC
    if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
      const qcList = results[1].value;
      const nowMs = Date.now();
      const dueDht = qcList.filter(function (q) {
        if (!q || !q.dht_info || q.dht_info.is_finished) return false;
        const endMs = q.dht_info.end_time ? new Date(q.dht_info.end_time).getTime() : NaN;
        return !isNaN(endMs) && endMs <= nowMs;
      });
      if (dueDht.length > 0) {
        emitScanAlert('dht-due-' + dueDht.length, {
          title: '🔥 ' + dueDht.length + ' Sesi Oven DHT Sudah 24 Jam!',
          body: dueDht.slice(0, 2).map(function (d) { return d.product_name + ' (' + d.batch_code + ')'; }).join(', ') + ' siap dikeluarkan dari oven.',
          category: 'qc',
          route: '#qc',
          urgent: true
        });
      }
      const pendingQcCount = qcList.filter(function (q) {
        return q && (q.category === 'Menunggu Uji' || q.category === 'Proses DHT' || q.category === 'Butuh Uji Berkala');
      }).length;
      const qcBadge = document.getElementById('badge-qc-count');
      if (qcBadge) {
        qcBadge.textContent = String(pendingQcCount);
        qcBadge.style.display = pendingQcCount > 0 ? 'inline-block' : 'none';
      }
    }

    // 3. Piutang Jatuh Tempo / Lewat Tempo
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
      const activeRecs = results[2].value.filter(function (r) {
        return r && r.status === 'active' && Number(r.remaining || 0) > 0 && r.due_date && String(r.due_date).slice(0, 10) <= todayStr;
      });
      if (activeRecs.length > 0) {
        const totalDue = activeRecs.reduce(function (s, r) { return s + Number(r.remaining || 0); }, 0);
        emitScanAlert('receivable-due-' + activeRecs.length, {
          title: '💳 ' + activeRecs.length + ' Tagihan Piutang Jatuh Tempo',
          body: 'Total sisa tagihan ' + formatRupiah(totalDue) + ' (' + activeRecs.slice(0, 2).map(function (r) { return r.customer_name; }).join(', ') + ') perlu ditindaklanjuti.',
          category: 'finance',
          route: '#piutang',
          urgent: true
        });
      }
    }

    // 4. Outlet Konsinyasi > 14 Hari Belum Opname
    if (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) {
      const dueOutlets = results[3].value.filter(function (o) {
        if (!o || String(o.status || 'ACTIVE').toLowerCase() === 'inactive') return false;
        if (o.days_since_audit !== undefined) return Number(o.days_since_audit) > 14;
        if (o.last_audit_date) {
          const d = (Date.now() - new Date(o.last_audit_date).getTime()) / 86400000;
          return !isNaN(d) && d > 14;
        }
        return false;
      });
      if (dueOutlets.length > 0) {
        emitScanAlert('outlet-visit-' + dueOutlets.length, {
          title: '🏪 ' + dueOutlets.length + ' Outlet Mitra Perlu Kunjungan Opname',
          body: dueOutlets.slice(0, 3).map(function (o) { return o.name; }).join(', ') + ' sudah melewati jadwal 14 hari.',
          category: 'finance',
          route: '#konsinyasi',
          urgent: false
        });
      }
    }

    // 5. Antrean Sapa Pelanggan H+7 Semai & Siap Panen
    if (results[4].status === 'fulfilled' && results[4].value && results[4].value.counts) {
      const counts = results[4].value.counts;
      const totalFollowUp = Number(counts.totalActive || 0);
      const pjBadge = document.getElementById('badge-purnajual-count');
      if (pjBadge) {
        pjBadge.textContent = String(totalFollowUp);
        pjBadge.style.display = totalFollowUp > 0 ? 'inline-block' : 'none';
      }
      if (totalFollowUp > 0) {
        emitScanAlert('followup-' + totalFollowUp, {
          title: '🌱 ' + totalFollowUp + ' Pelanggan Siap Disapa (Purna Jual)',
          body: (counts.h7Count || 0) + ' cek semai H+7 dan ' + (counts.harvestCount || 0) + ' pendampingan panen menunggu sapaan WA.',
          category: 'aftersales',
          route: '#purnajual',
          urgent: false
        });
      }
    }

    saveDailyEmittedAlertKeys(todayStr, tracker.set);

    if (isManual) {
      if (emittedCount > 0) {
        showToast('Pemindaian selesai: ditemukan ' + emittedCount + ' pengingat operasional.');
      } else {
        showToast('Pemindaian selesai: seluruh indikator operasional toko aman terkendali!');
      }
    }
  } catch (err) {
    if (isManual) {
      showToast('Gagal memindai kondisi toko: ' + (err.message || err), true);
    }
  }
}

function setupSupabaseRealtimeNotifChannel() {
  if (!window.supabase || typeof window.supabase.channel !== 'function') return;
  try {
    if (window.__LIVE_NOTIF_CHANNEL) {
      try { window.supabase.removeChannel(window.__LIVE_NOTIF_CHANNEL); } catch (e) { }
      window.__LIVE_NOTIF_CHANNEL = null;
    }

    const channel = window.supabase
      .channel('pos-live-notifs', {
        config: { broadcast: { self: false } }
      })
      .on('broadcast', { event: 'new_notif' }, function (msg) {
        const payload = msg && msg.payload ? msg.payload : msg;
        if (payload) {
          ingestIncomingNotification(payload, { showOsBanner: true, playSound: true });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_notifications' }, function (evt) {
        if (evt && evt.new) {
          ingestIncomingNotification(evt.new, { showOsBanner: true, playSound: true });
        }
      })
      .subscribe();

    window.__LIVE_NOTIF_CHANNEL = channel;
  } catch (err) {
    console.warn('[Realtime Notif] Gagal menyambungkan channel:', err);
  }
}

function initAppNotifications() {
  if (!TOKEN) return;

  APP_NOTIFICATIONS_LIST = loadStoredNotifications();
  updateTopbarNotifBadge();
  renderNotificationCenterList();

  if (!_notifEscBound) {
    _notifEscBound = true;
    window.addEventListener('pos:local-notif-emitted', function (ev) {
      const detail = ev && ev.detail;
      if (!detail) return;
      ingestIncomingNotification(detail, {
        showOsBanner: Boolean(detail.forceBanner),
        forceBanner: Boolean(detail.forceBanner),
        playSound: false
      });
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        const panel = document.getElementById('notif-center-panel');
        if (panel && panel.style.display !== 'none') {
          closeNotificationCenter();
        }
      }
    });
  }

  setupSupabaseRealtimeNotifChannel();
  syncExistingPushSubscription(true);

  // Muat riwayat notifikasi terbaru dari server (aman jika tabel belum dibuat)
  api('getRecentAppNotifications', TOKEN, 40).then(function (remoteList) {
    if (Array.isArray(remoteList) && remoteList.length > 0) {
      remoteList.forEach(function (item) {
        ingestIncomingNotification(item, { silent: true, showOsBanner: false, playSound: false });
      });
    }
  }).catch(function () { });

  if (_notifScanIntervalId) {
    clearInterval(_notifScanIntervalId);
  }
  setTimeout(function () {
    if (TOKEN) runSmartOperationalAlertScan(false);
  }, 4200);
  _notifScanIntervalId = setInterval(function () {
    if (TOKEN) runSmartOperationalAlertScan(false);
  }, 15 * 60 * 1000);

  _notifSystemInitialized = true;
}

function cleanupAppNotifications() {
  closeNotificationCenter();
  if (_notifScanIntervalId) {
    clearInterval(_notifScanIntervalId);
    _notifScanIntervalId = null;
  }
  if (window.__LIVE_NOTIF_CHANNEL && window.supabase && typeof window.supabase.removeChannel === 'function') {
    try { window.supabase.removeChannel(window.__LIVE_NOTIF_CHANNEL); } catch (e) { }
    window.__LIVE_NOTIF_CHANNEL = null;
  }
  _notifSystemInitialized = false;
}

window.toggleNotificationCenter = toggleNotificationCenter;
window.openNotificationCenter = openNotificationCenter;
window.closeNotificationCenter = closeNotificationCenter;
window.setNotificationFilter = setNotificationFilter;
window.markAllNotificationsRead = markAllNotificationsRead;
window.clearNotificationHistory = clearNotificationHistory;
window.handleNotificationCardClick = handleNotificationCardClick;
window.openNotificationSettingsTab = openNotificationSettingsTab;
window.enableDevicePushNotifications = enableDevicePushNotifications;
window.disableDevicePushNotifications = disableDevicePushNotifications;
window.sendTestDeviceNotification = sendTestDeviceNotification;
window.togglePersonalNotifCategory = togglePersonalNotifCategory;
window.saveAdminVapidPublicKeyUI = saveAdminVapidPublicKeyUI;
window.runSmartOperationalAlertScan = runSmartOperationalAlertScan;
window.buildNotifSettingsPaneHTML = buildNotifSettingsPaneHTML;
window.refreshNotifSettingsPaneUI = refreshNotifSettingsPaneUI;



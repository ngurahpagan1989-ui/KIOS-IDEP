// Modul Layanan: Realtime Broadcast, Upload Storage & Progressive Web App (PWA)

// ==============================================================================
// 1B. ENGINE NOTIFIKASI REALTIME & WEB PUSH (HANDPHONE / PWA)
// ==============================================================================
window.__LIVE_NOTIF_CHANNEL = window.__LIVE_NOTIF_CHANNEL || null;
window.__CURRENT_PUSH_ENDPOINT = window.__CURRENT_PUSH_ENDPOINT || '';

function ensureLiveNotifBroadcastChannel() {
  if (!supabase) return null;
  if (window.__LIVE_NOTIF_CHANNEL) return window.__LIVE_NOTIF_CHANNEL;
  try {
    const ch = supabase.channel('pos-live-notifs', {
      config: { broadcast: { self: false } }
    });
    ch.subscribe();
    window.__LIVE_NOTIF_CHANNEL = ch;
    return ch;
  } catch (err) {
    return null;
  }
}

function emitOperationalNotification(notif) {
  if (!notif || typeof notif !== 'object') return null;
  try {
    const user = window.CURRENT_USER_PROFILE || window.CURRENT_USER || {};
    const actorName = notif.actor_name || user.full_name || user.name || user.username || window.USER_NAME || 'Sistem';
    const rawRoute = String(notif.route || '#dashboard');
    const detail = {
      id: notif.id || ('notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
      title: String(notif.title || '🔔 Notifikasi Toko'),
      body: String(notif.body || ''),
      category: String(notif.category || 'general'),
      route: rawRoute.startsWith('#') ? rawRoute : ('#' + rawRoute),
      urgent: Boolean(notif.urgent),
      actor_name: String(actorName),
      created_at: notif.created_at || new Date().toISOString()
    };

    // 1. Update pusat notifikasi di tab saat ini secara instan
    try {
      window.dispatchEvent(new CustomEvent('pos:local-notif-emitted', {
        detail: Object.assign({}, detail, { isFromCurrentTab: true, forceBanner: Boolean(notif.forceBanner) })
      }));
    } catch (e) {}

    // 2. Broadcast instan ke seluruh HP/tab lain yang sedang online via Supabase Realtime
    if (!notif.localOnly && supabase) {
      try {
        const ch = ensureLiveNotifBroadcastChannel();
        if (ch && typeof ch.send === 'function') {
          ch.send({
            type: 'broadcast',
            event: 'new_notif',
            payload: detail
          }).catch(function () {});
        }
      } catch (e) {}

      // 3. Simpan riwayat ke tabel app_notifications (aman jika tabel belum dibuat)
      try {
        supabase.from('app_notifications').insert({
          id: detail.id,
          title: detail.title,
          body: detail.body,
          category: detail.category,
          route: detail.route,
          urgent: detail.urgent,
          actor_name: detail.actor_name,
          created_at: detail.created_at
        }).then(function () {}, function () {});
      } catch (e) {}

      // 4. Kirim Web Push W3C (VAPID) ke HP yang sedang terkunci / aplikasi tertutup
      if (!notif.skipPush && supabase.functions && typeof supabase.functions.invoke === 'function') {
        try {
          supabase.functions.invoke('send-push', {
            body: {
              id: detail.id,
              title: detail.title,
              body: detail.body,
              category: detail.category,
              route: detail.route,
              urgent: detail.urgent,
              actor_name: detail.actor_name,
              excludeEndpoint: window.__CURRENT_PUSH_ENDPOINT || ''
            }
          }).then(function () {}, function () {});
        } catch (e) {}
      }
    }

    return detail;
  } catch (err) {
    console.warn('[Notif] Gagal mengirim sinyal notifikasi:', err);
    return null;
  }
}
window.emitOperationalNotification = emitOperationalNotification;
window.ensureLiveNotifBroadcastChannel = ensureLiveNotifBroadcastChannel;

/**
 * Unggah gambar base64 langsung ke Supabase Storage dan kembalikan URL publiknya
 */
async function uploadToSupabaseStorage(bucketName, fileName, base64Data, contentType = 'image/jpeg', allowFallback = true) {
  if (!supabase) {
    if (allowFallback && base64Data) return base64Data;
    throw new Error('Supabase client belum terinisialisasi.');
  }
  if (!base64Data) return '';

  try {
    const blob = dataURLtoBlob(base64Data);
    const cleanPath = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(cleanPath, blob, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      console.warn(`[Storage Upload Error] Bucket: ${bucketName}. Menggunakan cadangan data URL Base64.`, error);
      if (allowFallback) return base64Data;
      throw new Error(`Gagal mengunggah berkas ke ${bucketName}: ${error.message}`);
    }

    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(cleanPath);

    return publicData && publicData.publicUrl ? publicData.publicUrl : (allowFallback ? base64Data : '');
  } catch (err) {
    console.warn(`[Storage Exception] Bucket: ${bucketName}. Menggunakan cadangan data URL Base64.`, err);
    if (allowFallback) return base64Data;
    throw new Error(`Gagal mengunggah berkas ke ${bucketName}: ${err.message || err}`);
  }
}

window.uploadToSupabaseStorage = uploadToSupabaseStorage;

// ========================= PROGRESSIVE WEB APP (PWA) =========================
let deferredInstallPrompt = null;

// 1. Registrasi Service Worker saat window load
if ('serviceWorker' in navigator) {
  let refreshingSw = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshingSw) return;
    refreshingSw = true;
    window.location.reload();
  });
  navigator.serviceWorker.addEventListener('message', function (event) {
    const msg = event && event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'NAVIGATE_FROM_NOTIFICATION' && msg.route) {
      if (msg.notifId && typeof markSingleNotificationRead === 'function') {
        markSingleNotificationRead(msg.notifId);
      }
      if (typeof closeNotificationCenter === 'function') {
        closeNotificationCenter();
      }
      const cleanRoute = String(msg.route).startsWith('#') ? String(msg.route) : ('#' + String(msg.route));
      if (location.hash === cleanRoute && typeof router === 'function') {
        router();
      } else {
        location.hash = cleanRoute;
      }
    } else if (msg.type === 'SW_PUSH_RECEIVED' && msg.payload && typeof ingestIncomingNotification === 'function') {
      ingestIncomingNotification(msg.payload, { showOsBanner: false, playSound: false });
    }
  });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js?v=15.0', { updateViaCache: 'none' })
      .then(function (reg) {
        console.log('[PWA] Service Worker berhasil terdaftar:', reg.scope);
        try { if (reg.update) reg.update(); } catch (e) { }
      })
      .catch(function (err) {
        console.warn('[PWA] Registrasi Service Worker gagal:', err);
      });
  });
}

// 2. Tangkap event beforeinstallprompt untuk Chrome / Edge / Android
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.display = 'block';
  }
});

// 3. Sembunyikan banner saat aplikasi berhasil diinstal
window.addEventListener('appinstalled', function () {
  console.log('[PWA] Aplikasi POS berhasil diinstal.');
  deferredInstallPrompt = null;
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.style.display = 'none';
  }
  showToast('Aplikasi POS berhasil ditambahkan ke Layar Utama!');
});

// 4. Inisialisasi tombol instalasi dan dukungan iOS Safari
function initPwaInstall() {
  const banner = document.getElementById('pwa-install-banner');
  const btn = document.getElementById('pwa-install-btn');
  if (!btn) return;

  const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = ('standalone' in window.navigator && window.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  // Jika dibuka di Safari iOS dan belum dalam mode standalone, tampilkan banner
  if (isIos && !isStandalone && banner) {
    banner.style.display = 'block';
  }

  btn.addEventListener('click', function () {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') {
          console.log('[PWA] Pengguna menerima prompt instalasi');
          if (banner) banner.style.display = 'none';
        }
        deferredInstallPrompt = null;
      });
    } else if (isIos) {
      // Panduan iOS Safari: Add to Home Screen
      showToast('Panduan iOS: Ketuk tombol Bagikan (Share ⎋) di Safari lalu pilih "Tambah ke Layar Utama" (Add to Home Screen ➕)');
    } else {
      showToast('Untuk menginstal: Buka menu browser Anda lalu pilih "Instal Aplikasi" atau "Tambah ke Layar Utama".');
    }
  });
}



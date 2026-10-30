const CACHE_NAME = 'kios-idep-v6.1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=5.7',
  './i18n.js?v=2.9',
  './app.js?v=5.8',
  './supabaseClient.js?v=5.4',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Event Install: Cache semua aset statis utama dengan bypass HTTP cache browser
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => (res && res.ok ? cache.put(url, res) : null))
            .catch(() => null)
        )
      );
    })
  );
});

// Event Activate: Bersihkan cache versi lama dan claim semua tab client
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event Fetch: Strategi Network-First (tanpa terjebak HTTP cache basi) & bypass penuh untuk Supabase
self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method !== 'GET') return;
  if (req.url.includes('supabase.co') || req.url.includes('telegram.org')) return;
  if (!req.url.startsWith('http')) return;

  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(req, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (req.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});

// Helper penyusun opsi notifikasi native OS Handphone / Desktop
function buildSwNotificationOptions(payload) {
  const p = payload || {};
  const isUrgent = Boolean(p.urgent);
  const cleanRoute = p.route
    ? (String(p.route).startsWith('#') ? String(p.route) : '#' + String(p.route))
    : '#dashboard';

  return {
    body: p.body || 'Ada pembaruan operasional baru di Kios IDEP.',
    icon: p.icon || './icon-192.png',
    badge: p.badge || './icon-192.png',
    tag: p.tag || p.id || ('idep-notif-' + Date.now()),
    renotify: true,
    requireInteraction: isUrgent,
    vibrate: isUrgent ? [240, 100, 240, 100, 320] : [150, 70, 150],
    data: {
      id: p.id || ('notif-' + Date.now()),
      title: p.title || 'Kios IDEP',
      body: p.body || '',
      category: p.category || 'general',
      route: cleanRoute,
      urgent: isUrgent,
      actor_name: p.actor_name || '',
      created_at: p.created_at || new Date().toISOString()
    }
  };
}

// Event Push: Menerima Web Push W3C (VAPID) dari Supabase Edge Function saat aplikasi tertutup
self.addEventListener('push', (event) => {
  let payload = {
    title: '🔔 Kios IDEP',
    body: 'Terdapat aktivitas operasional baru yang memerlukan perhatian.',
    category: 'general',
    route: '#dashboard',
    urgent: false
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') {
        payload = Object.assign(payload, parsed);
      }
    } catch (err) {
      try {
        payload.body = event.data.text() || payload.body;
      } catch (e) {}
    }
  }

  const title = payload.title || '🔔 Kios IDEP';
  const options = buildSwNotificationOptions(payload);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => {
          try {
            client.postMessage({
              type: 'SW_PUSH_RECEIVED',
              payload: Object.assign({}, options.data, { title: title })
            });
          } catch (e) {}
        });
      })
    ])
  );
});

// Event Message: Menerima instruksi tampilkan notifikasi lokal/realtime dari halaman PWA aktif
self.addEventListener('message', (event) => {
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (msg.type === 'SHOW_LOCAL_NOTIFICATION') {
    const payload = msg.payload || {};
    const title = payload.title || '🔔 Kios IDEP';
    const options = buildSwNotificationOptions(payload);
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Event Notification Click: Buka aplikasi Kios IDEP & arahkan langsung ke modul terkait (Deep-Link)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetRoute = data.route
    ? (String(data.route).startsWith('#') ? String(data.route) : '#' + String(data.route))
    : '#dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client && 'focus' in client) {
          return client.focus().then((focusedClient) => {
            try {
              (focusedClient || client).postMessage({
                type: 'NAVIGATE_FROM_NOTIFICATION',
                route: targetRoute,
                notifId: data.id || ''
              });
            } catch (e) {}
            return focusedClient || client;
          });
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('./index.html' + targetRoute);
      }
    })
  );
});

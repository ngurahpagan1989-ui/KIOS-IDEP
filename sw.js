const CACHE_NAME = 'kios-idep-v5.8';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css?v=5.5',
  './i18n.js?v=2.7',
  './app.js?v=5.5',
  './supabaseClient.js?v=5.2',
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

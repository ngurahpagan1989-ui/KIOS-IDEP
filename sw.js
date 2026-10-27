const CACHE_NAME = 'kios-idep-v5.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './i18n.js',
  './app.js',
  './supabaseClient.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Event Install: Cache semua aset statis utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Event Activate: Bersihkan cache versi lama dan claim client
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

// Event Fetch: Strategi Network-First untuk aset statis, bypass mutlak untuk Supabase
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya proses request GET
  if (req.method !== 'GET') {
    return;
  }

  // Bypass (jangan pernah cache) request yang menuju Supabase agar data stok & kasir real-time
  if (req.url.includes('supabase.co')) {
    return;
  }

  // Bypass skema non-http/https (seperti ekstensi browser)
  if (!req.url.startsWith('http')) {
    return;
  }

  // Strategi Network-First
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Jika request sukses, perbarui cache secara dinamis
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline atau jaringan gagal, gunakan cache lokal
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback navigasi jika halaman offline dibuka
          if (req.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./');
          }
        });
      })
  );
});

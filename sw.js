const CACHE_APP = 'kanba-cache-v4';
const CACHE_NAME = CACHE_APP;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/product.html',
  '/checkout.html',
  '/enter.html',
  '/md.html',
  '/css/theme.css',
  '/css/index.css',
  '/css/product.css',
  '/css/checkout.css',
  '/css/enter.css',
  '/js/theme.js',
  '/js/index.js',
  '/js/product.js',
  '/js/checkout.js',
  '/js/enter.js',
  '/js/navbar.js',
  '/js/auth.js',
  '/data/products.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // For navigation (HTML page requests)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            const cleanPath = url.pathname.replace(/\/+$|\.html$/g, '') || '/';
            if (cleanPath === '/checkout') return caches.match('/checkout.html');
            if (cleanPath === '/enter') return caches.match('/enter.html');
            if (cleanPath === '/product') return caches.match('/product.html');
            if (cleanPath === '/md') return caches.match('/md.html');
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images, JSON)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached asset immediately, revalidate in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

const CACHE_NAME = 'kanba-cache-v10';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/product.html',
  '/checkout.html',
  '/enter.html',
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
  '/data/products.json',
  'https://cdn.jsdelivr.net/gh/0xKanba/assets@master/shop/pro.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Initial caching skipped some files:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache first for images (Fast caching of all dynamic and static photos)
  if (
    event.request.destination === 'image' || 
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i) ||
    url.pathname.includes('/images/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version immediately for super-fast loads, update in background
            fetch(event.request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {});
            return cachedResponse;
          }

          return fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {});
        });
      })
    );
    return;
  }

  // Network-first fallback to Cache for other assets (ensures fresh code changes bypass cache when online)
  if (ASSETS_TO_CACHE.includes(url.pathname) || url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            return cache.match(event.request);
          });
      })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});

const CACHE_NAME = 'kanba-cache-v16';
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

  // Stale-While-Revalidate for local assets (HTML, CSS, JS, etc.) to ensure instant 0ms load times and background caching
  if (ASSETS_TO_CACHE.includes(url.pathname) || url.origin === self.location.origin) {
    let cacheKey = event.request;
    if (url.origin === self.location.origin) {
      const cleanPath = url.pathname.replace(/\/+$|\.html$/g, '') || '/';
      if (cleanPath === '/checkout') {
        cacheKey = '/checkout.html';
      } else if (cleanPath === '/enter') {
        cacheKey = '/enter.html';
      } else if (cleanPath === '/product') {
        cacheKey = '/product.html';
      } else if (cleanPath === '/md') {
        cacheKey = '/md.html';
      } else if (cleanPath === '/' || cleanPath === '/index') {
        cacheKey = '/index.html';
      }
    }

    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(cacheKey).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
              if (cacheKey !== event.request) {
                cache.put(cacheKey, networkResponse.clone());
              }
            }
            return networkResponse;
          }).catch(() => {
            // Offline fallback
          });
          
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  event.respondWith(fetch(event.request));
});


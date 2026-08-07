const CACHE_NAME = 'kanba-cache-202608071129-f7a9226';
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

  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  // Handle images with Cache First + Background Revalidate
  if (
    event.request.destination === 'image' || 
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i) ||
    url.pathname.includes('/images/')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
              cache.put(event.request, networkResponse.clone()).catch(() => {});
            }
            return networkResponse;
          }).catch(() => {});

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Handle navigation & page requests (HTML)
  if (event.request.mode === 'navigate' || url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline or network error, serve from cache
          let cacheKey = event.request;
          const cleanPath = url.pathname.replace(/\/+$|\.html$/g, '') || '/';
          if (cleanPath === '/checkout') cacheKey = '/checkout.html';
          else if (cleanPath === '/enter') cacheKey = '/enter.html';
          else if (cleanPath === '/product') cacheKey = '/product.html';
          else if (cleanPath === '/md') cacheKey = '/md.html';
          else if (cleanPath === '/' || cleanPath === '/index') cacheKey = '/index.html';

          return caches.match(cacheKey).then(res => res || caches.match('/index.html'));
        })
    );
    return;
  }
});



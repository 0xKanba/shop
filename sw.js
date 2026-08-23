// Service Worker for Fast Local Caching & Automatic Updates
const CACHE_APP = 'hltrade-app-202608231746-6071034';
const CACHE_IMGS = 'hltrade-img-202608231746-6071034';
const CACHE_FONTS = 'hltrade-fnt-202608231746-6071034';

const CURRENT_CACHES = [CACHE_APP, CACHE_IMGS, CACHE_FONTS];

// Core App Shell and Data Assets to Pre-cache immediately
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/product.html',
  '/checkout.html',
  '/enter.html',
  '/manifest.json',
  '/css/index.css',
  '/css/product.css',
  '/css/checkout.css',
  '/css/enter.css',
  '/css/theme.css',
  '/js/auth.js',
  '/js/checkout.js',
  '/js/enter.js',
  '/js/index.js',
  '/js/navbar.js',
  '/js/product.js',
  '/js/theme.js',
  '/data/products.json',
  '/data/p1.json',
  '/data/p2.json',
  '/data/p3.json',
  'https://cdn.jsdelivr.net/gh/0xKanba/assets@master/shop/pro.webp',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

// Install Event: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_APP).then(async (cache) => {
      // Safe resilient caching so one failing asset doesn't abort caching the rest
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clear outdated cache buckets and take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!CURRENT_CACHES.includes(key)) {
            console.log(`[SW] Removing outdated cache: ${key}`);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Smart Multi-Tier Caching for maximum speed and auto-updating
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // 2. Bypass dynamic API/Auth endpoints (Always Network-First / Direct)
  if (
    url.hostname.includes('login.kanba.pw') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    return;
  }

  // 3. Fonts & Icons: Cache-First Strategy (Fast & Permanent until version bump)
  if (
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.includes('/webfonts/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_FONTS).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Images (.webp, .png, .jpg, .svg, cdn assets): Cache-First with Dynamic Cache
  if (
    request.destination === 'image' ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.includes('/shop/') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_IMGS).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        }).catch(() => {
          // If offline and image not cached, return empty fallback if needed
          return cachedResponse;
        });
      })
    );
    return;
  }

  // 5. HTML Pages, Scripts, CSS & JSON Data: Stale-While-Revalidate
  // Serves instantaneous local cache while refreshing cache in background
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_APP).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          if (request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });

      return cachedResponse || fetchPromise;
    })
  );
});

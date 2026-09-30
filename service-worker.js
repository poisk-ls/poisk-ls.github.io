const CACHE_VERSION = 'site-v10-static';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = '/offline.html';
const SHELL = [
  '/',
  '/404.html',
  OFFLINE_URL,
  '/assets/css/style.css',
  '/assets/js/common.js',
  '/assets/js/search.js',
  '/assets/js/subject.js',
  '/assets/js/image-viewer.js',
  '/assets/js/pwa-install.js',
  '/assets/js/background.js',
  '/assets/css/highlight.min.css',
  '/assets/data/search-index.json',
  '/assets/data/posts.json',
  '/assets/data/navigation.json',
  '/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))));
    return;
  }

  // Content data (post list, search index, navigation) is network-first so a new or
  // changed post is never hidden by a stale cached copy; the cache is only the offline fallback.
  if (/\/assets\/data\/[^/]+\.json$/i.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  // Cache-first for immutable/static assets; network fallback for anything not cached.
  if (/\.(?:css|js|webp|png|jpe?g|svg|woff2?|json|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
      return response;
    })));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

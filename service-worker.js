/* ==========================================================================
   Service worker: full offline support after the first online visit.

   How it works
   - Everything is resolved against the worker's own scope (self.registration.scope),
     never a hardcoded "/", so it works at the domain root, in a sub-folder, and on
     localhost alike.
   - install: pre-caches the app shell, then reads search-index.json and posts.json
     and pre-caches EVERY page and thumbnail listed there. Each cached HTML page is
     scanned for the CSS / JS / image files it references, and each cached CSS file for
     its url(...) assets, so nothing the pages need is left out. Third-party CSS, fonts
     and scripts (Google Fonts, Font Awesome, SweetAlert) are cached best-effort.
   - Pages are stored under one canonical key (see pageKey), so "/pages/about",
     "/pages/about.html", "/pages/about/" and "?page=2" variants all hit the same entry.
   - fetch: pages are network-first (fresh online, cached offline, offline.html as the
     last resort, so the browser never shows ERR_FILE_NOT_FOUND); data and CSS are
     network-first; scripts and images are stale-while-revalidate; every handler has an
     offline fallback.
   - activate: removes caches from older versions and takes control of open pages.
   Bump CACHE_VERSION whenever the file list or caching rules change.
   ========================================================================== */
const CACHE_VERSION = 'site-v29';
const CACHE = CACHE_VERSION + '-cache';
const SCOPE = self.registration.scope; // always ends with "/"
const SCOPE_PATH = new URL(SCOPE).pathname;
const NETWORK_TIMEOUT = 6000;

const scoped = path => new URL(String(path).replace(/^\/+/, ''), SCOPE).href;
const OFFLINE_URL = scoped('offline.html');
const FALLBACK_IMAGE = scoped('assets/img/thumbnail/empty.jpg');

// Files every page needs. Anything else is discovered from the pages and data.
const SHELL = [
  'index.html', 'offline.html', '404.html', 'manifest.webmanifest',
  'assets/css/style.css', 'assets/css/dark-felt.css', 'assets/css/about-tabs.css', 'assets/css/highlight.min.css', 'assets/css/404.css',
  'assets/js/file-compat.js', 'assets/js/offline-data.js', 'assets/js/common.js', 'assets/js/about-tabs.js', 'assets/js/search.js', 'assets/js/subject.js', 'assets/js/view-toggle.js',
  'assets/js/image-viewer.js', 'assets/js/pwa-install.js', 'assets/js/background.js',
  'assets/js/post.js', 'assets/js/404.js', 'assets/js/highlight.min.js',
  'assets/js/post/content.js', 'assets/js/post/scroll.js', 'assets/js/post/highlight.js',
  'assets/js/post/clipboard.js', 'assets/js/post/toc.js', 'assets/js/post/giscus.js', 'assets/js/post/analytics.js',
  'assets/vendor/jura/jura.css', 'assets/vendor/fontawesome/css/all.min.css', 'assets/vendor/fontawesome/webfonts/fa-solid-900.woff2',
  'assets/vendor/fontawesome/webfonts/fa-regular-400.woff2', 'assets/vendor/fontawesome/webfonts/fa-brands-400.woff2', 'assets/vendor/sweetalert2/sweetalert2.all.min.js',
  'assets/data/settings.json', 'assets/data/search-index.json', 'assets/data/posts.json',
  'assets/data/navigation.json', 'assets/data/site.json', 'assets/data/subjects.json', 'assets/data/themes.json',
  'assets/img/favicon.webp', 'assets/img/profile.webp', 'assets/img/loading.webp', 'assets/img/tile.webp',
  'assets/img/pwa/icon-192.webp', 'assets/img/pwa/icon-512.webp', 'assets/img/thumbnail/empty.jpg'
].map(scoped);

// Third-party files the pages load; cached best-effort (they may be unreachable).
const EXTERNAL = [];  // fonts, icons and SweetAlert2 are now self-hosted (assets/vendor)
const EXTERNAL_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'readme-typing-svg.herokuapp.com'];

/* ---------- helpers ---------- */

// Canonical cache key for a page: no query/hash, no ".html", no "/index", no trailing slash.
function pageKey(input) {
  const u = new URL(input, SCOPE);
  let p = u.pathname.replace(/\/index(?:\.html)?$/i, '/').replace(/\.html$/i, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  try { p = decodeURIComponent(p); } catch (_) { /* keep as-is */ }
  return u.origin + p.toLowerCase();
}

// Redirected responses cannot be used to answer a navigation; copy the body into a clean one.
async function clean(response) {
  if (!response.redirected && response.type !== 'opaqueredirect') return response;
  const body = await response.blob();
  return new Response(body, { status: 200, statusText: 'OK', headers: response.headers });
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

async function putPage(cache, url, response) {
  await cache.put(new Request(pageKey(url)), await clean(response));
}

// Look a request up ignoring ?v= / ?page= style query strings.
const lookup = (request, extra) => caches.match(request, Object.assign({ cacheName: CACHE, ignoreSearch: true }, extra));

/* ---------- pre-caching ---------- */

async function cacheFile(cache, url, seen) {
  if (seen.has(url)) return null;
  seen.add(url);
  try {
    const response = await fetch(new Request(url, { cache: 'reload' }));
    if (!response || !response.ok) return null;
    await cache.put(url, response.clone());
    return response;
  } catch (_) { return null; }
}

function extractUrls(text, base, isCss) {
  const found = new Set();
  const add = raw => {
    if (!raw || /^(?:data:|blob:|mailto:|tel:|javascript:|#)/i.test(raw)) return;
    try { found.add(new URL(raw.trim(), base).href.split('#')[0]); } catch (_) { /* ignore */ }
  };
  if (isCss) {
    text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (_, __, u) => { add(u); return _; });
  } else {
    text.replace(/(?:src|href)\s*=\s*["']([^"']+)["']/gi, (_, u) => { add(u); return _; });
  }
  return Array.from(found);
}

const isStaticAsset = u => /\.(?:css|js|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|json|webmanifest)$/i.test(new URL(u).pathname);
const isSameOrigin = u => new URL(u).origin === self.location.origin;

async function precache() {
  const cache = await caches.open(CACHE);
  const seen = new Set();

  // 1. App shell (static files). HTML is stored under its page key.
  const shellResults = await Promise.all(SHELL.map(async url => {
    const response = await cacheFile(cache, url, seen);
    if (response && /\.html$/i.test(new URL(url).pathname)) await putPage(cache, url, response.clone());
    return [url, response];
  }));
  if (!shellResults.find(([url, r]) => url === OFFLINE_URL && r)) throw new Error('offline.html could not be cached');
  if (!shellResults.find(([url, r]) => /\/index\.html$/.test(url) && r)) throw new Error('index.html could not be cached');

  // 2. Every page and image listed in the data files.
  const pages = new Set();
  const assets = new Set();
  for (const file of ['assets/data/search-index.json', 'assets/data/posts.json']) {
    try {
      const response = await cache.match(scoped(file));
      const list = response ? await response.json() : [];
      (Array.isArray(list) ? list : []).forEach(entry => {
        if (entry && typeof entry.url === 'string') pages.add(entry.url);
        if (entry && typeof entry.image === 'string' && entry.image) assets.add(scoped(entry.image));
      });
    } catch (_) { /* data file unreadable: the shell still works */ }
  }
  await Promise.all(Array.from(assets).map(url => cacheFile(cache, url, seen)));

  // 3. Each page, plus the CSS / JS / images it references.
  const pageUrls = new Set(['index.html'].map(scoped));
  pages.forEach(u => {
    const abs = scoped(u);
    pageUrls.add(/\.html$/i.test(abs) ? abs : (abs.replace(/\/+$/, '') + '.html'));
  });
  const discovered = new Set();
  await Promise.all(Array.from(pageUrls).map(async url => {
    let response;
    try { response = await fetch(new Request(url, { cache: 'reload' })); } catch (_) { return; }
    if (!response || !response.ok) return;
    await putPage(cache, url, response.clone());
    try { extractUrls(await response.clone().text(), url, false).forEach(u => discovered.add(u)); } catch (_) { /* ignore */ }
  }));
  await Promise.all(Array.from(discovered).filter(u => isSameOrigin(u) && isStaticAsset(u)).map(u => cacheFile(cache, u, seen)));

  // 4. Assets referenced from cached CSS (images, fonts).
  const cssUrls = Array.from(seen).filter(u => /\.css$/i.test(new URL(u).pathname));
  const fromCss = new Set();
  await Promise.all(cssUrls.map(async url => {
    try {
      const response = await cache.match(url);
      if (response) extractUrls(await response.text(), url, true).forEach(u => fromCss.add(u));
    } catch (_) { /* ignore */ }
  }));
  await Promise.all(Array.from(fromCss).filter(isSameOrigin).map(u => cacheFile(cache, u, seen)));

  // 5. Third-party CSS/JS and the fonts they reference (best effort, never fails install).
  await Promise.all(EXTERNAL.map(async url => {
    try {
      let response;
      try { response = await fetch(new Request(url, { mode: 'cors', credentials: 'omit' })); }
      catch (_) { response = await fetch(new Request(url, { mode: 'no-cors', credentials: 'omit' })); }
      if (!response || (!response.ok && response.type !== 'opaque')) return;
      await cache.put(url, response.clone());
      if (response.type !== 'opaque' && /css/i.test(response.headers.get('content-type') || '')) {
        const files = extractUrls(await response.text(), url, true);
        await Promise.all(files.map(async f => {
          try {
            const r = await fetch(new Request(f, { mode: 'no-cors', credentials: 'omit' }));
            if (r && (r.ok || r.type === 'opaque')) await cache.put(f, r);
          } catch (_) { /* ignore */ }
        }));
      }
    } catch (_) { /* third-party unreachable: skip */ }
  }));
}

/* ---------- lifecycle ---------- */

self.addEventListener('install', event => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.disable(); } catch (_) { /* ignore */ } }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* ---------- fetch handling ---------- */

async function handleNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT);
    if (response && response.ok && response.type === 'basic') {
      // Only cache real pages, not the server's 404 page or redirects to other sites.
      cache.put(new Request(pageKey(request.url)), (await clean(response.clone()))).catch(() => {});
      return response.redirected ? await clean(response) : response;
    }
    if (response && response.status !== 404) return response;
    const cached = await cache.match(pageKey(request.url));
    return cached || response;
  } catch (_) {
    const cached = await cache.match(pageKey(request.url));
    if (cached) return cached;
    const offline = await cache.match(new Request(pageKey(OFFLINE_URL)));
    return offline || new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><h1>Offline</h1><p>This page is not available without a network connection.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    const cached = await lookup(request);
    if (cached) return cached;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(CACHE);
  const cached = await lookup(request);
  const refresh = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  if (cached) { event.waitUntil(refresh); return cached; }
  const response = await refresh;
  if (response) return response;
  if (request.destination === 'image') {
    const fallback = await lookup(FALLBACK_IMAGE);
    if (fallback) return fallback;
  }
  return new Response('', { status: 504, statusText: 'Offline' });
}

/* ---------- freshness override (added) ----------
   Why edits did not show after a refresh: every fetch(request) above goes through the
   browser's HTTP cache, and GitHub Pages serves every file with "Cache-Control: max-age=600".
   So even the "network-first" handlers were handed the stale copy for up to 10 minutes, and
   scripts/images (stale-while-revalidate) were answered from cache first. This listener is
   registered BEFORE the handler below and re-issues same-origin pages, CSS, JS, JSON and
   images with cache:'no-cache' (revalidate with the server; unchanged files cost a tiny 304),
   reusing the existing network-first helpers for timeout + offline fallback. Fonts and all
   third-party requests are left to the original handler. */
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!/^https?:$/.test(url.protocol) || url.origin !== self.location.origin) return;
  if (/\.(?:woff2?|ttf)$/i.test(url.pathname)) return;

  const isPage = request.mode === 'navigate';
  if (!isPage && !isStaticAsset(url.href)) return;

  const revalidate = new Request(request, { cache: 'no-cache' });
  const isImage = request.destination === 'image';
  event.respondWith(isPage ? handleNavigation(revalidate) : networkFirst(revalidate).then(async response => {
    if (isImage && response.status === 504) { const fallback = await lookup(FALLBACK_IMAGE); if (fallback) return fallback; }
    return response;
  }));
  event.stopImmediatePropagation(); // keep the original handler below from also responding
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!/^https?:$/.test(url.protocol)) return;

  if (url.origin !== self.location.origin) {
    if (EXTERNAL_HOSTS.indexOf(url.hostname) !== -1) event.respondWith(staleWhileRevalidate(request, event));
    return; // analytics and other third parties pass through untouched
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Content data and stylesheets: network-first so edits show up, cache when offline.
  if (/\/assets\/data\/[^/]+\.json$/i.test(url.pathname) || /\.css$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url.href)) event.respondWith(staleWhileRevalidate(request, event));
});

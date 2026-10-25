/* file-compat.js - lets the site run straight from disk (file:///.../index.html).
   Loaded FIRST, synchronously, in <head> of every page. On http(s) it returns at once
   and changes nothing, so GitHub Pages / any server behaves exactly as before.

   On file:// browsers differ from a web server in three ways; this fixes each:
   1. Extensionless links ("../pages/about") do not resolve to about.html.
      -> every internal link is rewritten to its real .html file, including links added
         later by scripts (search results, post lists, related posts).
   2. fetch() of local .json files is blocked.
      -> assets/js/offline-data.js (generated from assets/data/*.json) is loaded and a
         fetch() shim answers those requests from it.
   3. Root-absolute paths ("/pages/x", "/") point at the drive root.
      -> they are re-based onto the site folder.
   Nothing here needs a server or an internet connection. */
(function () {
  'use strict';
  if (location.protocol !== 'file:') return;

  var script = document.currentScript;
  var root;
  try { root = new URL('../../', script.src).href; } catch (_) { return; }
  window.__FILE_MODE = true;
  window.__SITE_ROOT = root;

  /* ---- 2. embedded data + fetch shim ------------------------------------------- */
  document.write('<script src="' + root + 'assets/js/offline-data.js"><\/script>');

  var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = function (input, init) {
    try {
      var raw = typeof input === 'string' ? input : (input && input.url) || String(input);
      var u = new URL(raw, document.baseURI);
      if (u.protocol === 'file:' && /\.json$/i.test(u.pathname) && u.href.indexOf(root) === 0) {
        var key = decodeURIComponent(u.href.slice(root.length).split(/[?#]/)[0]);
        var store = window.__OFFLINE_DATA || {};
        if (Object.prototype.hasOwnProperty.call(store, key)) {
          return Promise.resolve(new Response(JSON.stringify(store[key]), {
            status: 200, headers: { 'Content-Type': 'application/json' }
          }));
        }
        return Promise.reject(new TypeError('Offline data not found for ' + key + ' (run tools/build-offline-data)'));
      }
    } catch (_) { /* fall through to the native fetch */ }
    return nativeFetch ? nativeFetch(input, init) : Promise.reject(new TypeError('fetch unavailable'));
  };

  /* ---- 1 + 3. link rewriting ----------------------------------------------------- */
  var SCHEME = /^[a-z][a-z0-9+.-]*:/i;
  var ROOT_PATH = new URL(root).pathname;   // e.g. /C:/Users/USER/Downloads/jade/poisk-ls/

  function fixHref(href) {
    if (!href || href.charAt(0) === '#' || href.slice(0, 2) === '//') return href;
    if (SCHEME.test(href) && href.slice(0, 5).toLowerCase() !== 'file:') return href;

    var m = /^([^?#]*)(.*)$/.exec(href), path = m[1], tail = m[2];
    if (path === '') return href;                               // "?x=1" / "#y"

    // Re-base root-absolute paths ("/pages/x") onto the site folder.
    if (path.charAt(0) === '/' && path.indexOf(ROOT_PATH) !== 0) {
      path = root + path.replace(/^\/+/, '');
    }

    // Directory-style link ("", ".", "..", "../", "pages/") -> its index.html.
    if (/(^|\/)\.{0,2}$/.test(path) || /\/$/.test(path)) {
      return path.replace(/\/?$/, '/') + 'index.html' + tail;
    }
    var last = path.slice(path.lastIndexOf('/') + 1);
    if (last.indexOf('.') === -1) path += '.html';              // "../pages/about" -> about.html
    return path + tail;
  }

  function fixLink(a) {
    var href = a.getAttribute('href');
    if (href == null || a.hasAttribute('download')) return;
    var next = fixHref(href);
    if (next !== href) a.setAttribute('href', next);
  }

  function fixAll(scope) {
    var list = (scope || document).querySelectorAll ? (scope || document).querySelectorAll('a[href]') : [];
    for (var i = 0; i < list.length; i++) fixLink(list[i]);
    if (scope && scope.nodeType === 1 && scope.matches && scope.matches('a[href]')) fixLink(scope);
  }

  document.addEventListener('DOMContentLoaded', function () {
    fixAll(document);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'attributes') { if (r.target.nodeType === 1) fixLink(r.target); continue; }
        for (var j = 0; j < r.addedNodes.length; j++) if (r.addedNodes[j].nodeType === 1) fixAll(r.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  });

  /* Safety net: a click that still reaches an extensionless link is corrected on the spot. */
  document.addEventListener('click', function (event) {
    var a = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (a) fixLink(a);
  }, true);
})();

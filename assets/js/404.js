/* 404 page: show the requested path and wire up Go Back. No dependencies.
   The path is written with textContent only, so any URL is displayed safely. */
(function () {
    'use strict';

    function requestedPath() {
        var p = '';
        try { p = decodeURIComponent(location.pathname); } catch (e) { p = location.pathname; }
        p = p.replace(/\s+/g, ' ').trim();
        if (!p || p === '/') p = '/';
        return p.length > 80 ? p.slice(0, 77) + '...' : p;
    }

    function init() {
        var path = requestedPath();
        ['nf-path', 'nf-path-2'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.textContent = path;
        });

        var back = document.getElementById('nf-back');
        if (back) {
            back.addEventListener('click', function () {
                // Arrived from another page (there is something real to go back to) -> go back.
                // Typed URL, bookmark or stripped referrer -> fall back to the home page.
                if (window.history.length > 1 && document.referrer) window.history.back();
                else window.location.href = (location.protocol === 'file:') ? new URL('index.html', document.baseURI).href : '/';
            });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

/* ==========================================================================
   about-tabs.js  —  tab switching for the About page (pages/about.html)

   - Loaded synchronously right after the tab markup, so the tab view is in place
     before the first paint (no flash of the old post list, no flash of the wrong tab).
   - Pure show/hide of already-present panels: no fetches, no reloads, no layout jumps.
   - Deep links: about#certificate (also #exp), about#resume, about#whoami. The hash is
     kept in sync with history.replaceState (no scroll jump, no extra history entries),
     and back/forward or a manually edited hash switch tabs too.
   - Keyboard (WAI-ARIA tabs pattern): Left/Right (wrapping), Home, End.
   - The resume PDF preview iframe is only given its src the first time the RESUME tab
     opens, so the page does not load Google Drive until it is needed.
   ========================================================================== */
(function () {
    'use strict';

    var root = document.getElementById('about-tabs');
    if (!root) return;

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = {};
    tabs.forEach(function (tab) {
        var panel = document.getElementById(tab.getAttribute('aria-controls'));
        if (panel) panels[tab.getAttribute('data-tab')] = panel;
    });
    if (!tabs.length) return;

    var DEFAULT_TAB = tabs[0].getAttribute('data-tab');
    var ALIASES = {
        certification: 'certificate', certificates: 'certificate', cert: 'certificate',
        exp: 'certificate', experience: 'certificate',
        cv: 'resume',
        whoam: 'whoami', 'whoam-i': 'whoami'
    };

    // Hand over from the post list to the tabs (CSS keys off this class).
    var host = root.parentNode;
    if (host && host.classList) host.classList.add('about-tabs-on');

    function resolve(name) {
        name = String(name || '').replace(/^#/, '').toLowerCase();
        try { name = decodeURIComponent(name); } catch (e) { /* keep raw */ }
        if (ALIASES[name]) name = ALIASES[name];
        return panels[name] ? name : null;
    }

    function loadLazy(panel) {
        Array.prototype.forEach.call(panel.querySelectorAll('iframe[data-src]'), function (frame) {
            frame.setAttribute('src', frame.getAttribute('data-src'));
            frame.removeAttribute('data-src');
        });
    }

    function writeHash(name) {
        var target = '#' + name;
        if (location.hash === target) return;
        try {
            history.replaceState(history.state, '', target);
        } catch (e) { /* file:// or sandboxed frames: the tab still switches */ }
    }

    // If the user has scrolled past the tab bar, bring it back so the new panel starts in view.
    function keepBarVisible() {
        var rect = root.getBoundingClientRect();
        if (rect.top < 0 && root.scrollIntoView) root.scrollIntoView({ block: 'start' });
    }

    // Very narrow screens: the bar can scroll sideways. Bring the active tab into view by
    // moving only the bar's own scroll position (never the page).
    var list = root.querySelector('[role="tablist"]');
    function revealTab(tab) {
        if (!list || list.scrollWidth <= list.clientWidth) return;
        var left = tab.offsetLeft - list.offsetLeft;
        var right = left + tab.offsetWidth;
        if (left < list.scrollLeft) list.scrollLeft = left - 8;
        else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth + 8;
    }

    var current = null;

    function activate(name, opts) {
        opts = opts || {};
        var next = resolve(name) || DEFAULT_TAB;
        var changed = next !== current;

        tabs.forEach(function (tab) {
            var on = tab.getAttribute('data-tab') === next;
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
            tab.tabIndex = on ? 0 : -1;
            if (on && opts.focus) tab.focus({ preventScroll: true });
            if (on && opts.reveal) revealTab(tab);
        });

        Object.keys(panels).forEach(function (key) {
            var panel = panels[key];
            if (key === next) {
                if (panel.hidden) panel.hidden = false;
                loadLazy(panel);
            } else if (!panel.hidden) {
                panel.hidden = true;
            }
        });

        current = next;
        if (opts.updateHash) writeHash(next);
        if (changed && opts.keepVisible) keepBarVisible();
    }

    tabs.forEach(function (tab, index) {
        tab.addEventListener('click', function () {
            activate(tab.getAttribute('data-tab'), { updateHash: true, keepVisible: true, reveal: true });
        });

        tab.addEventListener('keydown', function (event) {
            var to = null;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') to = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') to = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') to = 0;
            else if (event.key === 'End') to = tabs.length - 1;
            if (to === null) return;
            event.preventDefault();
            activate(tabs[to].getAttribute('data-tab'), { focus: true, updateHash: true, reveal: true });
        });
    });

    // Back/forward, or the hash edited by hand.
    window.addEventListener('hashchange', function () {
        var name = resolve(location.hash);
        if (name && name !== current) activate(name, { reveal: true });
    });

    // Initial state: deep link if present, otherwise the first tab. The hash is left
    // alone on load so the plain /pages/about URL stays clean.
    activate(resolve(location.hash) || DEFAULT_TAB, { reveal: true });
})();

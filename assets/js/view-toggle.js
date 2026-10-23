/* ==========================================================================
   Grid / List view toggle for the All Posts section (index.html).

   - The layout itself is pure CSS, keyed on <html data-post-view="grid|list">.
     An inline script in <head> restores the saved value before first paint, so
     there is no flash of the wrong layout on refresh.
   - This file only (1) switches that attribute when a toggle button is used,
     (2) keeps aria-pressed in sync for assistive tech, and (3) remembers the
     choice in localStorage. It never touches the list items, so pagination,
     the post data and everything in subject.js behave exactly as before.
   - If localStorage is unavailable (private mode, blocked), the toggle still
     works for the current page view; it just isn't remembered.
   ========================================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'postView';
    var DEFAULT_VIEW = 'grid';
    var VIEWS = ['grid', 'list'];

    var root = document.documentElement;
    var toggle = document.querySelector('.view-toggle');
    if (!toggle) return;

    var buttons = Array.prototype.slice.call(toggle.querySelectorAll('[data-view]'));
    if (!buttons.length) return;

    function readSaved() {
        var value = null;
        try { value = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
        return VIEWS.indexOf(value) !== -1 ? value : DEFAULT_VIEW;
    }

    function save(view) {
        try { localStorage.setItem(STORAGE_KEY, view); } catch (e) { /* storage unavailable */ }
    }

    function apply(view) {
        root.dataset.postView = view;
        buttons.forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.getAttribute('data-view') === view));
        });
    }

    toggle.addEventListener('click', function (event) {
        var button = event.target.closest('[data-view]');
        if (!button || !toggle.contains(button)) return;
        var view = button.getAttribute('data-view');
        if (VIEWS.indexOf(view) === -1) return;
        apply(view);
        save(view);
    });

    // Keep several open tabs in step with each other.
    window.addEventListener('storage', function (event) {
        if (event.key === STORAGE_KEY) apply(readSaved());
    });

    // pageshow also covers the back/forward cache, where scripts do not re-run.
    window.addEventListener('pageshow', function () { apply(readSaved()); });

    apply(readSaved());
})();

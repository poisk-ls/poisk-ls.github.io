/* ==========================================================================
   Grid / List view toggle, shared by every page that shows repeated content:
   the All Posts list (index) and every category list.

   - The layout itself is pure CSS, keyed on <html data-post-view="grid|list">.
     An inline script in <head> restores the saved value before first paint, so
     there is no flash of the wrong layout on load or navigation.
   - ONE choice is stored (localStorage "postView") and applied everywhere, so the
     view picked on one page is the view on every other page.
   - Toggles are created from one template. A page that already contains a
     .view-toolbar (the index) keeps it; for the other sections the toolbar is
     inserted automatically. To add the toggle to a new repeated-content section,
     add one entry to SECTIONS below and style it with the data-post-view attribute.
   - Only the attribute and the buttons' aria-pressed state change; list items are
     never touched, so pagination, post data and subject.js behave exactly as before.
   - If localStorage is unavailable (private mode, blocked) the toggle still works
     for the current page; it just isn't remembered.
   ========================================================================== */
(function () {
    'use strict';

    var STORAGE_KEY = 'postView';
    var DEFAULT_VIEW = 'grid';
    var VIEWS = ['grid', 'list'];
    var root = document.documentElement;

    /* ---- Sections that get a toggle: where to put it and what it controls ---- */
    var SECTIONS = [
        // Category / All Posts lists: toolbar goes right above the list.
        // ("You May Also Like" intentionally has no toggle.)
        { selector: '#category-list', label: 'Post layout', addClass: 'posts-view' }
    ];

    var ICON_GRID = '<svg class="view-toggle-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><rect x="3" y="3" width="8" height="8" rx="1.75"/><rect x="13" y="3" width="8" height="8" rx="1.75"/><rect x="3" y="13" width="8" height="8" rx="1.75"/><rect x="13" y="13" width="8" height="8" rx="1.75"/></svg>';
    var ICON_LIST = '<svg class="view-toggle-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><line x1="9" y1="6" x2="20.5" y2="6"/><line x1="9" y1="12" x2="20.5" y2="12"/><line x1="9" y1="18" x2="20.5" y2="18"/><line x1="3.5" y1="6" x2="4.5" y2="6"/><line x1="3.5" y1="12" x2="4.5" y2="12"/><line x1="3.5" y1="18" x2="4.5" y2="18"/></svg>';

    function readSaved() {
        var value = null;
        try { value = localStorage.getItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
        return VIEWS.indexOf(value) !== -1 ? value : DEFAULT_VIEW;
    }

    function save(view) {
        try { localStorage.setItem(STORAGE_KEY, view); } catch (e) { /* storage unavailable */ }
    }

    function buttonsAll() {
        return Array.prototype.slice.call(document.querySelectorAll('.view-toggle [data-view]'));
    }

    // Updates the layout attribute and every toggle on the page (they always agree).
    function apply(view) {
        root.dataset.postView = view;
        buttonsAll().forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.getAttribute('data-view') === view));
        });
    }

    function makeToolbar(section) {
        var bar = document.createElement('div');
        bar.className = 'view-toolbar';
        bar.innerHTML =
            '<div class="view-toggle" role="group" aria-label="' + section.label + '">' +
            '<button type="button" class="view-toggle-btn" data-view="grid" aria-pressed="false" aria-label="Grid view" title="Grid view">' + ICON_GRID + '</button>' +
            '<button type="button" class="view-toggle-btn" data-view="list" aria-pressed="false" aria-label="List view" title="List view">' + ICON_LIST + '</button>' +
            '</div>';
        return bar;
    }

    function mount() {
        SECTIONS.forEach(function (section) {
            var el = document.querySelector(section.selector);
            if (!el) return;
            if (section.addClass) el.classList.add(section.addClass);

            // Keep a toolbar that is already in the page markup (index.html).
            var prev = el.previousElementSibling;
            if (prev && prev.classList.contains('view-toolbar')) return;
            el.parentNode.insertBefore(makeToolbar(section), el);
        });
    }

    // One delegated listener serves every toggle, present or added later.
    document.addEventListener('click', function (event) {
        var button = event.target.closest && event.target.closest('.view-toggle [data-view]');
        if (!button) return;
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

    function init() {
        mount();
        apply(readSaved());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

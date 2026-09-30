(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const baseurlMeta = $('meta[name="baseurl"]');
  const baseurl = baseurlMeta ? baseurlMeta.content : '';

  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch (_) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (_) {} }
  };

  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle('dark-theme', dark);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $$('.ico-dark, .ico-light').forEach(icon => icon.classList.toggle('active', dark));
    const main = $('main');
    if (main) $$('.pre-dark', main).forEach(block => block.classList.toggle('pre-dark', dark));
    changeGiscusTheme(dark ? 'noborder_gray' : 'light');
  }

  function changeGiscusTheme(theme) {
    const iframe = $('iframe.giscus-frame');
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app');
  }

  function initNavigation() {
    const nav = $('#navigation');
    const menu = $('#btn-nav');
    const drawer = $('#sidebar-drawer');
    const closeButton = $('#btn-sidebar-close');
    const backdrop = $('[data-sidebar-close]');
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    const expandedStorageKey = 'sidebar:expanded';

    const normalizePath = value => {
      try {
        const url = new URL(value, window.location.origin);
        let path = decodeURIComponent(url.pathname || '/');
        const prefix = baseurl || '';
        if (prefix && prefix !== '/' && path.startsWith(prefix)) {
          path = path.slice(prefix.length) || '/';
        }
        path = path.replace(/index\.html$/i, '').replace(/\.html$/i, '').replace(/\/+/g, '/');
        return path.replace(/\/$/, '') || '/';
      } catch (_) {
        return '/';
      }
    };

    const readExpanded = () => {
      const raw = storage.get(expandedStorageKey);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(value => typeof value === 'string') : [];
      } catch (_) {
        return [];
      }
    };

    const saveExpanded = () => {
      if (!nav) return;
      const keys = $$('.nav-tree-node.is-expanded', nav)
        .map(node => node.dataset.navKey)
        .filter(Boolean);
      storage.set(expandedStorageKey, JSON.stringify(keys));
    };

    const setExpanded = (node, expanded, persist = true) => {
      if (!node || !$('.nav-tree-children', node)) return;
      const button = $('.nav-list-expander', node);
      const label = $('.nav-tree-label', node)?.textContent?.trim() || 'section';
      node.classList.toggle('is-expanded', expanded);
      if (button) {
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', `${expanded ? 'Collapse' : 'Expand'} ${label}`);
      }
      if (persist) saveExpanded();
    };

    const updateActiveState = () => {
      if (!nav) return;
      const currentPath = normalizePath(window.location.href);
      const nodes = $$('.nav-tree-node', nav);

      nodes.forEach(node => {
        node.classList.remove('is-current', 'is-active');
        const link = $('.nav-list-link', node);
        if (link) link.removeAttribute('aria-current');
      });

      const currentNode = nodes.find(node => {
        const link = $('.nav-list-link', node);
        return link && normalizePath(link.href) === currentPath;
      });

      if (!currentNode) return;

      currentNode.classList.add('is-current');
      $('.nav-list-link', currentNode)?.setAttribute('aria-current', 'page');

      let parent = currentNode.parentElement?.closest('.nav-tree-node');
      while (parent) {
        parent.classList.add('is-active');
        setExpanded(parent, true, false);
        parent = parent.parentElement?.closest('.nav-tree-node');
      }

      if ($('.nav-tree-children', currentNode)) setExpanded(currentNode, true, false);
    };

    if (nav) {
      const savedExpanded = new Set(readExpanded());
      $$('.nav-tree-node', nav).forEach(node => {
        if (savedExpanded.has(node.dataset.navKey)) setExpanded(node, true, false);
      });

      $$('.nav-list-expander', nav).forEach(expander => {
        expander.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          const node = expander.closest('.nav-tree-node');
          if (!node) return;
          setExpanded(node, !node.classList.contains('is-expanded'));
        });
      });

      nav.addEventListener('click', event => {
        const link = event.target.closest?.('.nav-list-link');
        if (!link) return;
        updateActiveState();
      });

      updateActiveState();
      window.addEventListener('popstate', updateActiveState);
      window.addEventListener('hashchange', updateActiveState);
    }

    if (!menu || !drawer) return;

    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let lastTrigger = menu;

    const setDrawerState = (open, { focus = false } = {}) => {
      const mobile = mobileQuery.matches;
      if (!mobile) open = false;

      document.documentElement.classList.toggle('sidebar-drawer-open', open);
      document.body.classList.toggle('sidebar-drawer-open', open);
      menu.classList.toggle('nav-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      drawer.setAttribute('aria-hidden', String(!open && mobile));
      drawer.inert = !open && mobile;

      if (backdrop) backdrop.setAttribute('aria-hidden', String(!open));

      if (focus) {
        if (open) {
          requestAnimationFrame(() => closeButton?.focus());
        } else {
          requestAnimationFrame(() => lastTrigger?.focus());
        }
      }
    };

    const syncDrawerForViewport = () => {
      if (mobileQuery.matches) {
        setDrawerState(false);
      } else {
        document.documentElement.classList.remove('sidebar-drawer-open');
        document.body.classList.remove('sidebar-drawer-open');
        menu.classList.remove('nav-open');
        menu.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-label', 'Open navigation menu');
        drawer.removeAttribute('aria-hidden');
        drawer.inert = false;
        if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
      }
    };

    menu.addEventListener('click', () => {
      lastTrigger = menu;
      const open = !document.body.classList.contains('sidebar-drawer-open');
      setDrawerState(open, { focus: true });
    });

    closeButton?.addEventListener('click', () => setDrawerState(false, { focus: true }));
    backdrop?.addEventListener('click', () => setDrawerState(false, { focus: true }));

    drawer.addEventListener('click', event => {
      const link = event.target.closest?.('.nav-list-link');
      if (!link) return;
      setDrawerState(false);
    });

    document.addEventListener('keydown', event => {
      if (!mobileQuery.matches || !document.body.classList.contains('sidebar-drawer-open')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerState(false, { focus: true });
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = $$(focusableSelector, drawer).filter(element => !element.closest('[hidden]'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    window.addEventListener('resize', syncDrawerForViewport, { passive: true });
    mobileQuery.addEventListener?.('change', syncDrawerForViewport);
    syncDrawerForViewport();
  }

  // Sidebar links (site title, avatar, navigation tree) always trigger a real,
  // full document load. Clicking the link for the page you are already on
  // reloads it instead of doing nothing, and a page restored from the
  // back/forward cache is reloaded so no stale sidebar/theme state is shown.
  function initSidebarRefresh() {
    const sidebar = $('.sidebar-left');
    if (!sidebar) return;

    const canonical = url => ({
      path: url.pathname.replace(/index\.html$/i, '').replace(/\.html$/i, '').replace(/\/+$/, '') || '/',
      search: url.search
    });

    sidebar.addEventListener('click', event => {
      const link = event.target.closest?.('a[href]');
      if (!link || !sidebar.contains(link) || event.defaultPrevented) return;

      // Leave new-tab, download, modified and non-primary clicks to the browser.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

      let url;
      try { url = new URL(link.href, window.location.href); } catch (_) { return; }
      if (!/^https?:$/.test(url.protocol) || url.origin !== window.location.origin) return;
      if (url.hash) return;

      const target = canonical(url);
      const here = canonical(window.location);
      event.preventDefault();

      if (target.path === here.path && target.search === here.search) window.location.reload();
      else window.location.assign(url.href);
    });

    window.addEventListener('pageshow', event => {
      if (event.persisted) window.location.reload();
    });
  }

  function initMobileLayoutGeometry() {
    const sidebar = $('.sidebar-left');
    const header = sidebar?.querySelector('.side-banner');
    if (sidebar && header) {
      const setHeaderHeight = () => {
        if (!window.matchMedia('(max-width: 1024px)').matches) {
          sidebar.style.removeProperty('--mobile-sidebar-header-height');
          return;
        }
        const height = Math.ceil(header.getBoundingClientRect().height);
        if (height > 0) sidebar.style.setProperty('--mobile-sidebar-header-height', `${height}px`);
      };

      setHeaderHeight();
      window.addEventListener('resize', setHeaderHeight, { passive: true });
      if ('ResizeObserver' in window) new ResizeObserver(setHeaderHeight).observe(header);
    }

    const applyTawkPosition = () => {
      const mobile = window.matchMedia('(max-width: 1024px)').matches;
      const root = document.documentElement;
      const container = document.getElementById('tawkchat-container');
      const frame = container?.querySelector('iframe') || document.querySelector('iframe[title*="chat" i]');
      const target = container || frame?.parentElement;

      if (!mobile || !target) {
        root.style.setProperty('--mobile-tawk-size', '0px');
        return;
      }

      target.setAttribute('data-mobile-floating-control', 'tawk');
      const rect = target.getBoundingClientRect();
      const measuredSize = Math.max(48, Math.min(80, Math.ceil(Math.max(rect.height || 0, frame?.getBoundingClientRect().height || 0))));
      const fallbackSize = measuredSize || 60;
      root.style.setProperty('--mobile-tawk-size', `${fallbackSize}px`);

      // Tawk controls its own inline position. Override only the mobile bottom
      // slot so the service remains untouched while the launcher gets a stable
      // relationship to this site's floating controls.
      const bottom = getComputedStyle(root).getPropertyValue('--mobile-floating-bottom').trim();
      if (bottom && target.style.getPropertyValue('bottom') !== bottom) target.style.setProperty('bottom', bottom);
    };

    let tawkTimer = 0;
    const scheduleTawkPosition = () => {
      window.clearTimeout(tawkTimer);
      tawkTimer = window.setTimeout(applyTawkPosition, 80);
    };

    scheduleTawkPosition();
    window.addEventListener('resize', scheduleTawkPosition, { passive: true });
    window.addEventListener('orientationchange', scheduleTawkPosition, { passive: true });

    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => scheduleTawkPosition());
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function initTheme() {
    const buttons = $$('.btn-brightness');
    const saved = storage.get('theme');
    applyTheme(saved === 'light' ? 'light' : 'dark');
    if (!buttons.length) return;
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        storage.set('theme', next);
        applyTheme(next);
      });
    });
  }

  function initSearchUI() {
    const search = $('#search');
    const input = $('#search-input');
    const clear = $('#btn-clear');
    if (!search || !input) return;

    $$('.btn-search').forEach(button => button.addEventListener('click', () => {
      search.classList.add('active');
      search.setAttribute('aria-hidden', 'false');
      window.loadSearchIndex?.();
      requestAnimationFrame(() => input.focus());
    }));

    search.addEventListener('click', event => {
      if (!event.target.closest('.search-box')) { search.classList.remove('active'); search.setAttribute('aria-hidden', 'true'); }
    });

    clear?.addEventListener('click', () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });

    document.addEventListener('keydown', event => {
      if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        search.classList.add('active');
        search.setAttribute('aria-hidden', 'false');
        window.loadSearchIndex?.();
        input.focus();
      }
      if (event.key === 'Escape') { search.classList.remove('active'); search.setAttribute('aria-hidden', 'true'); }
    });
  }

  function init() {
    initNavigation();
    initSidebarRefresh();
    initMobileLayoutGeometry();
    initTheme();
    initSearchUI();
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });
})();

function searchPost(pages) {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-result');
  const clear = document.getElementById('btn-clear');
  if (!input || !results) return;

  const source = Array.isArray(pages) ? pages.filter(post => !(post.title === 'Home' && post.type === 'category')) : [];
  const normalized = source.map(post => ({
    ...post,
    _title: String(post.title || '').toLowerCase(),
    _path: String(post.path || '').toLowerCase(),
    _tags: String(post.tags || '').toLowerCase()
  }));

  let timer = 0;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => renderSearch(input.value), 90);
  });

  function renderSearch(value) {
    const keyword = value.trim().toLowerCase();
    results.replaceChildren();
    const active = keyword.length > 0;
    results.style.display = active ? 'block' : 'none';
    if (clear) clear.style.display = active ? 'block' : 'none';
    if (!active) return;

    const matched = normalized.filter(post => post._title.includes(keyword) || post._path.includes(keyword) || post._tags.includes(keyword));
    matched.sort((a, b) => (a.type === b.type ? 0 : a.type === 'category' ? 1 : -1));

    if (!matched.length) {
      const li = document.createElement('li');
      li.className = 'result-item';
      li.innerHTML = '<span class="description">There is no search result.</span>';
      results.append(li);
      return;
    }

    const fragment = document.createDocumentFragment();
    matched.forEach(post => {
      const li = document.createElement('li');
      li.className = 'result-item';
      const link = document.createElement('a');
      link.href = post.url || '#';
      const path = highlightKeyword(post.path || '', keyword) || 'Home';
      if (post.type === 'post') {
        link.innerHTML = `<table><thead><tr><th><svg class="ico-book"></svg></th><th>${highlightKeyword(post.title || '', keyword)}</th></tr></thead><tbody><tr><td><svg class="ico-folder"></svg></td><td>${path}</td></tr><tr><td><svg class="ico-tags"></svg></td><td>${highlightKeyword(post.tags || '', keyword) || 'none'}</td></tr><tr><td><svg class="ico-calendar"></svg></td><td>${escapeHtml(post.date || '')}</td></tr></tbody></table>`;
      } else {
        link.innerHTML = `<table><thead><tr><th><svg class="ico-folder"></svg></th><th>${path}</th></tr></thead></table>`;
      }
      li.append(link);
      fragment.append(li);
    });
    results.append(fragment);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}

function highlightKeyword(text, keyword) {
  const value = String(text || '');
  const term = String(keyword || '');
  if (!term) return escapeHtml(value);
  const escaped = escapeHtml(value);
  const escapedTerm = escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedTerm, 'ig'), match => `<span class="highlight">${match}</span>`);
}

/* ------------------------------------------------------------------------
   "You May Also Like"
   Builds the related-pages list at runtime from the site's page index.

   Relevance is scored from the current page's own data:
     - shared tags ............................ strongest signal
     - same folder / same top-level section ... structural signal
     - shared keywords (title, description, body excerpt) ... content signal
   Only pages with a positive score are shown (best first, max 6), the current
   page is never included, and each card links straight to its page.
   ------------------------------------------------------------------------ */
function searchRelated(pages, options) {
  const refBox = document.getElementById('related-box');
  const refResults = document.getElementById('related-posts');
  if (!refBox || !refResults || !Array.isArray(pages)) return;

  const opts = options || {};
  const MAX_RELATED = 6;

  // One canonical form for every URL so "/a/b.html", "/a/b", "/a/b/" and
  // "/a/b/index.html" (plus baseurl, query strings, hashes, %-encoding and
  // case differences) all compare equal.
  const canonicalUrl = value => {
    let path = String(value || '');
    try { path = new URL(path, window.location.origin).pathname; } catch (_) { path = path.split(/[?#]/)[0]; }
    try { path = decodeURIComponent(path); } catch (_) { /* keep as-is */ }
    return (path
      .replace(/\/index\.html$/i, '/')
      .replace(/\.html$/i, '')
      .replace(/\/+$/, '') || '/').toLowerCase();
  };

  const currentKey = canonicalUrl(opts.currentUrl || window.location.pathname);

  const tagKey = tag => {
    const raw = String(tag || '').trim().toLowerCase();
    // "db🛢️" and "db" should match; emoji-only tags fall back to the raw value.
    return raw.replace(/[^\p{L}\p{N}]+/gu, '') || raw;
  };

  const tagsOf = page => {
    const list = Array.isArray(page.tagList)
      ? page.tagList
      : String(page.tags || '').split(',');
    return new Set(list.map(tagKey).filter(Boolean));
  };

  const pathParts = page => String(page.path || '')
    .split('>')
    .map(part => part.trim().toLowerCase())
    .filter(Boolean);

  const STOP_WORDS = new Set((
    'a an and are as at be but by for from has have how i if in into is it its me my of on or our so that the their ' +
    'them then there these this to too up us was we what when where which who will with you your about all also any can ' +
    'com http https www html post page pages site new one use using used get'
  ).split(' '));

  const keywordsOf = text => {
    const words = String(text || '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));
    return new Set(words);
  };

  const countShared = (a, b) => {
    let count = 0;
    a.forEach(item => { if (b.has(item)) count += 1; });
    return count;
  };

  // Only real, titled, non-category pages can be recommended.
  const seen = new Set();
  const posts = pages.filter(page => {
    if (!page || page.type === 'category' || !page.title || !page.url) return false;
    const key = canonicalUrl(page.url);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const current = pages.find(page => canonicalUrl(page && page.url) === currentKey);
  if (!current) {
    refBox.style.display = 'none';
    return;
  }

  const currentTags = tagsOf(current);
  const currentPath = pathParts(current);
  const currentTitleWords = keywordsOf(current.title);
  const currentBodyWords = keywordsOf([current.title, current.description, current.excerpt].join(' '));

  const ranked = posts
    // Never recommend the page being viewed.
    .filter(page => canonicalUrl(page.url) !== currentKey)
    .map(page => {
      const path = pathParts(page);
      const sharedTags = countShared(tagsOf(page), currentTags);
      const sameFolder = path.length > 0 && currentPath.length > 0 && path.join('>') === currentPath.join('>');
      const sameSection = path.length > 0 && currentPath.length > 0 && path[0] === currentPath[0];
      const sharedTitleWords = countShared(keywordsOf(page.title), currentTitleWords);
      const sharedBodyWords = countShared(keywordsOf([page.title, page.description, page.excerpt].join(' ')), currentBodyWords);

      // A page needs at least one real relationship (tag, folder/section or a
      // title keyword). Incidental overlap in body text alone is not enough,
      // so unrelated pages are never used as filler.
      const related = sharedTags > 0 || sameFolder || sameSection || sharedTitleWords > 0;

      const score = !related ? 0 :
        sharedTags * 10 +
        (sameFolder ? 6 : sameSection ? 3 : 0) +
        Math.min(sharedTitleWords, 3) * 2 +
        Math.min(sharedBodyWords, 6);

      return { page, score, category: path.length ? path[path.length - 1] : '' };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      String(b.page.date || '').localeCompare(String(a.page.date || '')) ||
      String(a.page.title).localeCompare(String(b.page.title)))
    .slice(0, MAX_RELATED);

  refResults.replaceChildren();
  if (!ranked.length) {
    refBox.style.display = 'none';
    return;
  }

  refBox.style.display = '';
  const fragment = document.createDocumentFragment();

  ranked.forEach(({ page, category }) => {
    const li = document.createElement('li');
    li.className = 'related-item';

    const link = document.createElement('a');
    link.href = page.url;
    link.setAttribute('aria-label', page.title);

    const image = document.createElement('img');
    image.src = page.image || opts.fallbackImage || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = page.title || '';
    if (opts.fallbackImage) {
      image.addEventListener('error', () => {
        if (image.getAttribute('src') !== opts.fallbackImage) image.src = opts.fallbackImage;
      }, { once: true });
    }

    const categoryEl = document.createElement('p');
    categoryEl.className = 'category';
    categoryEl.textContent = category ? category.charAt(0).toUpperCase() + category.slice(1) : 'No category';

    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = page.title || '';

    const date = document.createElement('p');
    date.className = 'date';
    date.textContent = page.date && page.date !== '1900-01-01'
      ? new Date(page.date + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
      : '-';

    link.append(image, categoryEl, title, date);
    li.append(link);
    fragment.append(li);
  });

  refResults.append(fragment);
}

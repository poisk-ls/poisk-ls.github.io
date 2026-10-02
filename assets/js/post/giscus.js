window.PostModules = window.PostModules || {};
window.PostModules.giscus = function () {
  const GISCUS_ORIGIN = 'https://giscus.app';
  const meta = name => document.querySelector(`meta[name="${name}"]`)?.content;

  // ---- Comment counter -------------------------------------------------------------
  // The count is keyed by page path (matches giscus data-mapping="pathname") and cached in
  // localStorage so it is correct immediately after a refresh, on back/forward navigation
  // and in other open tabs, before the Giscus iframe has reported anything.
  const counterValue = document.getElementById('num-comments');
  const counterLink = document.getElementById('comments-counter');
  const path = location.pathname.replace(/\/+$/, '') || '/';
  const storageKey = `comments:count:${path}`;

  const store = {
    get() { try { return localStorage.getItem(storageKey); } catch (_) { return null; } },
    set(value) { try { localStorage.setItem(storageKey, String(value)); } catch (_) {} }
  };

  const parseCount = raw => {
    if (raw === null || raw === undefined || raw === '') return null;
    const number = Number(raw);
    return Number.isInteger(number) && number >= 0 ? number : null;
  };

  const render = count => {
    if (!counterValue) return;
    counterValue.textContent = count === null ? '-' : String(count);
    if (counterLink) {
      const label = count === null ? 'Comments' : `${count} ${count === 1 ? 'comment' : 'comments'}`;
      counterLink.setAttribute('aria-label', label);
      counterLink.setAttribute('title', label);
    }
  };

  const update = count => {
    const next = parseCount(count);
    if (next === null) return;
    render(next);
    store.set(next);
  };

  // Giscus reports comments and replies separately; the visible thread contains both.
  const totalFor = discussion =>
    (Number(discussion.totalCommentCount) || 0) + (Number(discussion.totalReplyCount) || 0);

  render(parseCount(store.get()));

  if (!window.__giscusCounterBound) {
    window.__giscusCounterBound = true;

    window.addEventListener('message', event => {
      if (event.origin !== GISCUS_ORIGIN) return;
      const data = event.data && event.data.giscus;
      if (!data || typeof data !== 'object') return;
      // Only metadata messages carry a count. Other messages (e.g. iframe resize) must not
      // touch it. Giscus re-sends metadata whenever a comment is added, edited or deleted.
      if (Object.prototype.hasOwnProperty.call(data, 'discussion')) {
        update(data.discussion ? totalFor(data.discussion) : 0);
      } else if (typeof data.error === 'string' && /discussion not found/i.test(data.error)) {
        update(0);
      }
    });

    // Keep other tabs in sync, and restore from cache when a page comes back from bfcache.
    window.addEventListener('storage', event => {
      if (event.key === storageKey) render(parseCount(event.newValue));
    });
    window.addEventListener('pageshow', event => {
      if (event.persisted) render(parseCount(store.get()));
    });
  }

  // ---- Giscus loader ---------------------------------------------------------------
  const repo = meta('giscus_repo');
  if (!repo || document.querySelector('script[data-giscus-loader="true"]')) return;

  const script = document.createElement('script');
  const attrs = {
    src: `${GISCUS_ORIGIN}/client.js`,
    'data-repo': repo,
    'data-repo-id': meta('giscus_repoId'),
    'data-category': meta('giscus_category'),
    'data-category-id': meta('giscus_categoryId'),
    'data-mapping': 'pathname',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    // Required for the counter: without it Giscus never posts the comment total.
    'data-emit-metadata': '1',
    'data-input-position': 'top',
    'data-theme': document.documentElement.dataset.theme === 'light' ? 'light' : 'noborder_gray',
    'data-lang': 'en',
    // No data-loading="lazy": the iframe must load so the counter is accurate without scrolling.
    crossorigin: 'anonymous',
    async: ''
  };

  script.dataset.giscusLoader = 'true';
  Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
  document.body.appendChild(script);
};

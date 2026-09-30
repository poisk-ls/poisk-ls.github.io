(() => {
  'use strict';
  const indexUrl = '/assets/data/search-index.json';
  let loaded = false;
  let loading = null;
  function loadSearchIndex() {
    if (loaded) return Promise.resolve(window.__searchPages || []);
    if (loading) return loading;
    loading = fetch(indexUrl, {credentials:'same-origin',cache:'no-cache'}).then(r => {
      if (!r.ok) throw new Error(`Search index request failed: ${r.status}`);
      return r.json();
    }).then(pages => {
      window.__searchPages = Array.isArray(pages) ? pages : [];
      loaded = true;
      if (typeof searchPost === 'function') searchPost(window.__searchPages);
      const input = document.getElementById('search-input');
      if (input?.value) input.dispatchEvent(new Event('input', {bubbles:true}));
      if (typeof searchRelated === 'function') searchRelated(window.__searchPages, {currentUrl: location.href, fallbackImage:'/assets/img/thumbnail/empty.jpg'});
      return window.__searchPages;
    }).catch(error => { console.error('[search] Unable to load search index', error); window.__searchPages=[]; return []; });
    return loading;
  }
  window.loadSearchIndex = loadSearchIndex;
  document.addEventListener('click', event => { if (event.target.closest?.('.btn-search, .tag-box .tag')) loadSearchIndex(); }, {passive:true});
  document.addEventListener('keydown', event => { if (event.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) loadSearchIndex(); });
  window.addEventListener('load', () => { if (document.querySelector('.post-header')) loadSearchIndex(); }, {once:true});
})();
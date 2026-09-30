window.PostModules = window.PostModules || {};
window.PostModules.giscus = function () {
  const meta = name => document.querySelector(`meta[name="${name}"]`)?.content;
  const repo = meta('giscus_repo');
  if (!repo || document.querySelector('script[data-giscus-loader="true"]')) return;

  const script = document.createElement('script');
  const attrs = {
    src: 'https://giscus.app/client.js',
    'data-repo': repo,
    'data-repo-id': meta('giscus_repoId'),
    'data-category': meta('giscus_category'),
    'data-category-id': meta('giscus_categoryId'),
    'data-mapping': 'pathname',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': 'preferred_color_scheme',
    'data-lang': 'en',
    'data-loading': 'lazy',
    crossorigin: 'anonymous',
    async: ''
  };

  script.dataset.giscusLoader = 'true';
  Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
  document.body.appendChild(script);

  window.addEventListener('message', event => {
    if (event.origin !== 'https://giscus.app' || !event.data?.giscus) return;
    const count = document.getElementById('num-comments');
    if (!count) return;
    count.textContent = event.data.giscus.discussion?.totalCommentCount ?? '0';
  });
};

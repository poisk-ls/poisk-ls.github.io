document.addEventListener('DOMContentLoaded', function () {
  const innerContent = document.querySelector('main');
  if (!innerContent) return;
  const modules = window.PostModules || {};
  const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  modules.toc?.(innerContent);
  modules.content?.(innerContent);
  modules.scroll?.();
  modules.highlight?.(innerContent, currentTheme);
  modules.giscus?.();
  modules.clipboard?.();
});

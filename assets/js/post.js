document.addEventListener('DOMContentLoaded', function () {
  const innerContent = document.querySelector('main');
  if (!innerContent) return;
  const modules = window.PostModules || {};
  const currentTheme = localStorage.getItem('theme');
  modules.toc?.(innerContent);
  modules.content?.(innerContent);
  modules.scroll?.();
  modules.highlight?.(innerContent, currentTheme);
  modules.analytics?.();
  modules.giscus?.();
  modules.clipboard?.();
});

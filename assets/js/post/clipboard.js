window.PostModules = window.PostModules || {};
window.PostModules.clipboard = function () {
  if (!navigator.clipboard) return;
  document.querySelectorAll('pre').forEach(block => {
    if (block.querySelector('.code-copy-button')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'code-copy-button'; button.title = 'Copy Code'; button.setAttribute('aria-label', 'Copy code');
    const icon = document.createElement('svg'); icon.setAttribute('aria-hidden', 'true');
    button.append(icon); block.append(button);
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(block.querySelector('code')?.innerText || ''); button.setAttribute('aria-label', 'Code copied'); }
      catch (_) { button.setAttribute('aria-label', 'Copy failed'); }
    });
  });
};

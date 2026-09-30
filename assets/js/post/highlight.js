window.PostModules = window.PostModules || {};
window.PostModules.highlight = function (innerContent, currentTheme) {
  if (currentTheme === 'dark') innerContent.querySelectorAll('pre').forEach(codeblock => codeblock.classList.add('pre-dark'));
  window.addEventListener('load', () => {
    if (window.hljs?.highlightAll) window.hljs.highlightAll();
    document.querySelectorAll('.language-text, .language-plaintext').forEach(codeblock => codeblock.querySelectorAll('.hljs-keyword, .hljs-meta, .hljs-selector-tag').forEach(node => { node.outerHTML = node.innerHTML; }));
  }, { once: true });
};

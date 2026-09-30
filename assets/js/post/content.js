window.PostModules = window.PostModules || {};
window.PostModules.content = function (innerContent) {
  innerContent.querySelectorAll('a:not(.related-item a)').forEach(link => link.setAttribute('data-content', link.innerText));
  document.querySelectorAll('.tag-box .tag').forEach(tagButton => {
    tagButton.addEventListener('click', () => {
      const searchPage = document.querySelector('#search');
      const input = document.getElementById('search-input');
      const value = tagButton.getAttribute('contentID');
      if (!searchPage || !input) return;
      searchPage.classList.add('active');
      searchPage.setAttribute('aria-hidden', 'false');
      window.loadSearchIndex?.().then(() => { input.value = value || ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
    });
  });
};

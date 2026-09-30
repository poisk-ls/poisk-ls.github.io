window.PostModules = window.PostModules || {};
window.PostModules.scroll = function () {
  const arrowButton = document.querySelector('.top-arrow');
  if (arrowButton) {
    let tick = false;
    const update = () => { tick = false; arrowButton.classList.toggle('arrow-open', window.scrollY >= 512); };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    arrowButton.addEventListener('click', () => window.scroll({ top: 0, behavior: 'smooth' }));
    // Accessible + reliable: behaves as a real button and falls back to an instant jump.
    arrowButton.setAttribute('role', 'button');
    arrowButton.setAttribute('tabindex', '0');
    arrowButton.setAttribute('aria-label', 'Back to top');
    arrowButton.setAttribute('title', 'Back to top');
    arrowButton.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        try { window.scroll({ top: 0, behavior: 'smooth' }); } catch (_) { window.scrollTo(0, 0); }
      }
    });
  }
  document.getElementById('comments-counter')?.addEventListener('click', () => document.getElementById('giscus')?.scrollIntoView({ behavior: 'smooth' }));
};

window.PostModules = window.PostModules || {};
window.PostModules.scroll = function () {
  const arrowButton = document.querySelector('.top-arrow');
  if (arrowButton) {
    let tick = false;
    const update = () => { tick = false; arrowButton.classList.toggle('arrow-open', window.scrollY >= 512); };
    window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
    update();
    arrowButton.addEventListener('click', () => window.scroll({ top: 0, behavior: 'smooth' }));
  }
  document.getElementById('comments-counter')?.addEventListener('click', () => document.getElementById('giscus')?.scrollIntoView({ behavior: 'smooth' }));
};

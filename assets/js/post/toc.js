window.PostModules = window.PostModules || {};
window.PostModules.toc = function (innerContent) {
  const headings = innerContent.querySelectorAll('h1, h2');
  const tocBoard = document.querySelector('.toc-board');
  if (!tocBoard) return;
  let prevHead;
  headings.forEach(heading => {
    const tocItem = document.createElement('li');
    tocItem.className = 'toc-list-item';
    const itemLink = document.createElement('a');
    itemLink.className = 'toc-link';
    itemLink.id = 'toc-id-' + heading.textContent;
    itemLink.textContent = heading.textContent;
    itemLink.href = '#';
    tocItem.append(itemLink);
    itemLink.addEventListener('click', event => { event.preventDefault(); heading.scrollIntoView({ behavior: 'smooth' }); });
    if (heading.tagName === 'H1') {
      itemLink.classList.add('node-name--H1'); prevHead = tocItem; tocBoard.append(tocItem);
    } else {
      itemLink.classList.add('node-name--H2');
      if (!prevHead) { tocBoard.append(tocItem); return; }
      let subList = prevHead.querySelector('ol');
      if (!subList) { subList = document.createElement('ol'); subList.className = 'toc-list'; prevHead.append(subList); }
      subList.append(tocItem);
    }
  });
  let tick = false;
  const update = () => {
    tick = false;
    const scrollPos = window.scrollY;
    let currentIndex = -1;
    headings.forEach((heading, index) => { if (scrollPos >= heading.getBoundingClientRect().top + scrollPos - 512) currentIndex = index; });
    tocBoard.querySelectorAll('.toc-link').forEach((link, index) => link.classList.toggle('is-active-link', index === currentIndex));
  };
  window.addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
  update();
};

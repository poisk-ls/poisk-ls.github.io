(() => {
  'use strict';

  const VIEWER_ID = 'image-viewer';
  const SELECTOR = [
    '.inner-content img',
    '.article_content img',
    'main img'
  ].join(',');
  const EXCLUDED = [
    '.image-viewer-image',
    '.site-avatar img',
    '.sidebar img',
    '.thumbnail_post img',
    '#loading img',
    '.pagination img',
    '.related-item img',
    '[aria-hidden="true"]'
  ];

  let viewer;
  let dialog;
  let viewerImage;
  let closeButton;
  let lastFocused = null;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let pointerId = null;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let pinchDistance = 0;
  let pinchScale = 1;
  let lastTouchOpen = 0;

  const isExcluded = image => EXCLUDED.some(selector => image.matches(selector) || image.closest(selector));

  const resetTransform = () => {
    scale = 1;
    translateX = 0;
    translateY = 0;
    viewerImage.classList.remove('is-zoomed', 'is-dragging');
    viewerImage.style.transform = '';
  };

  const clampScale = value => Math.min(4, Math.max(1, value));

  const renderTransform = () => {
    viewerImage.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    viewerImage.classList.toggle('is-zoomed', scale > 1);
  };

  const close = ({ restoreFocus = true } = {}) => {
    if (!viewer?.classList.contains('is-open')) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('image-viewer-open');
    resetTransform();
    viewerImage.removeAttribute('src');
    viewerImage.removeAttribute('alt');
    if (restoreFocus && lastFocused?.isConnected) requestAnimationFrame(() => lastFocused.focus());
  };

  const open = image => {
    if (!image?.currentSrc && !image?.src) return;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    viewerImage.src = image.currentSrc || image.src;
    viewerImage.alt = image.alt || 'Expanded image';
    resetTransform();
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('image-viewer-open');
    requestAnimationFrame(() => closeButton.focus());
  };

  const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const init = () => {
    if (document.getElementById(VIEWER_ID)) return;

    viewer = document.createElement('div');
    viewer.id = VIEWER_ID;
    viewer.className = 'image-viewer';
    viewer.setAttribute('role', 'dialog');
    viewer.setAttribute('aria-modal', 'true');
    viewer.setAttribute('aria-hidden', 'true');
    viewer.setAttribute('aria-label', 'Image viewer');
    viewer.innerHTML = `
      <button class="image-viewer-backdrop" type="button" data-image-viewer-close aria-label="Close image viewer"></button>
      <div class="image-viewer-dialog" role="document" tabindex="-1">
        <button class="image-viewer-close" type="button" data-image-viewer-close aria-label="Close image viewer">
          <svg viewBox="0 0 384 512" aria-hidden="true"><path d="M342.6 182.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 242.7 86.6 137.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 288 41.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 333.3l105.4 105.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 288l105.3-105.4z"/></svg>
        </button>
        <img class="image-viewer-image" draggable="false" alt="">
      </div>`;
    document.body.appendChild(viewer);

    dialog = viewer.querySelector('.image-viewer-dialog');
    viewerImage = viewer.querySelector('.image-viewer-image');
    closeButton = viewer.querySelector('.image-viewer-close');

    viewer.addEventListener('click', event => {
      if (event.target.closest('[data-image-viewer-close]')) close();
    });

    const openFromImageEvent = (event, image) => {
      if (!image || isExcluded(image)) return false;
      if (!(image.currentSrc || image.src)) return false;
      if (event.defaultPrevented) return false;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
      // Keep the existing content-image behavior: the image opens in the viewer
      // while its surrounding article link is not followed.
      if (image.closest('a[href]')) event.preventDefault();
      image.classList.add('image-viewable');
      open(image);
      return true;
    };

    document.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch') return;
      const image = event.target.closest?.(SELECTOR);
      if (!openFromImageEvent(event, image)) return;
      lastTouchOpen = Date.now();
    }, { passive: false });

    document.addEventListener('click', event => {
      if (Date.now() - lastTouchOpen < 500) return;
      const image = event.target.closest?.(SELECTOR);
      if (!image || event.button !== 0) return;
      openFromImageEvent(event, image);
    });

    document.addEventListener('keydown', event => {
      if (!viewer.classList.contains('is-open')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.focus();
      }
    });

    viewerImage.addEventListener('dblclick', event => {
      event.preventDefault();
      if (scale > 1) {
        resetTransform();
      } else {
        scale = 2;
        translateX = 0;
        translateY = 0;
        renderTransform();
      }
    });

    viewerImage.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      if (event.pointerType === 'touch') {
        viewerImage.setPointerCapture?.(event.pointerId);
      }
      pointerId = event.pointerId;
      dragging = scale > 1;
      startX = event.clientX;
      startY = event.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      if (dragging) viewerImage.classList.add('is-dragging');
    });

    viewerImage.addEventListener('pointermove', event => {
      if (!dragging || event.pointerId !== pointerId || scale <= 1) return;
      translateX = startTranslateX + (event.clientX - startX);
      translateY = startTranslateY + (event.clientY - startY);
      renderTransform();
    });

    const endPointer = event => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      dragging = false;
      viewerImage.classList.remove('is-dragging');
    };
    viewerImage.addEventListener('pointerup', endPointer);
    viewerImage.addEventListener('pointercancel', endPointer);

    viewerImage.addEventListener('wheel', event => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 0.2 : -0.2;
      scale = clampScale(scale + direction);
      if (scale === 1) {
        translateX = 0;
        translateY = 0;
      }
      renderTransform();
    }, { passive: false });

    viewerImage.addEventListener('touchstart', event => {
      if (event.touches.length !== 2) return;
      pinchDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      pinchScale = scale;
    }, { passive: true });

    viewerImage.addEventListener('touchmove', event => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const currentDistance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      if (!pinchDistance) return;
      scale = clampScale(pinchScale * (currentDistance / pinchDistance));
      if (scale === 1) {
        translateX = 0;
        translateY = 0;
      }
      renderTransform();
    }, { passive: false });

    viewerImage.addEventListener('touchend', event => {
      if (event.touches.length < 2) pinchDistance = 0;
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

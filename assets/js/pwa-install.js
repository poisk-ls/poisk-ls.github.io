(() => {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    document.documentElement.classList.add('pwa-install-ready');
  });

  window.PWAInstall = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return true;
  };

  window.addEventListener('appinstalled', () => {
    document.documentElement.classList.remove('pwa-install-ready');
  });
})();

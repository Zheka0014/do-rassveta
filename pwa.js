// Installable web app (PWA): registers the service worker that keeps the game for offline play.
// Only on a real https site. On the local development server it stays off (add ?sw=1 to test it),
// so edits are never hidden behind a cache; the desktop (Steam) shell does not need it.
const query = new URLSearchParams(location.search);
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const wanted = location.protocol === 'https:' ? !query.has('nosw') : local && query.has('sw');

if ('serviceWorker' in navigator && wanted && !window.desktop) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(() => navigator.serviceWorker.ready).then(registration => {
      // The rest of the game is fetched only after the menu is ready, so it never slows the first start.
      const start = document.getElementById('start');
      const ask = () => registration.active && registration.active.postMessage({ type: 'warm' });
      if (start && start.disabled) {
        const watch = new MutationObserver(() => { if (!start.disabled) { watch.disconnect(); setTimeout(ask, 3000); } });
        watch.observe(start, { attributes: true, attributeFilter: ['disabled'] });
      } else setTimeout(ask, 3000);
    }).catch(() => {});
  });
}

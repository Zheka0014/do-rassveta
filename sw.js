// Service worker of the web version: the game opens and plays without a network
// after the first visit. Each build has its own cache; an old cache is removed when
// the new version takes over, which happens the next time the game is opened, so a
// running night is never interrupted by an update.
const BUILD = '20261113-forest48-r3';
const CACHE = 'do-rassveta-' + BUILD;
const CORE = ['./', './index.html', './manifest.json', './privacy.html', './icons/icon-192.png', './icons/icon-512.png'];

// Cache keys ignore the query string: inside one build ?v=… only repeats the build stamp.
const key = request => { const url = new URL(typeof request === 'string' ? request : request.url, self.registration.scope); url.search = ''; url.hash = ''; return url.href; };

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(CORE.map(path => fetch(path, { cache: 'no-cache' }).then(response => response.ok ? cache.put(key(path), response) : null)))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name.startsWith('do-rassveta-') && name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || request.headers.has('range')) return;
  if (request.mode === 'navigate') {
    // Pages: the network first, so an update arrives as soon as it is published; the cache when offline.
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) { const cache = await caches.open(CACHE); await cache.put(key(request), response.clone()); }
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(key(request))) || (await cache.match(key('./index.html'))) || Response.error();
      }
    })());
    return;
  }
  // Game files: from the cache when present, otherwise from the network and kept for next time.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key(request));
    if (cached) return cached;
    const response = await network(request);
    if (response.ok && response.type === 'basic') cache.put(key(request), response.clone()).catch(() => {});
    return response;
  })());
});

// A slow or unstable connection sometimes drops one of many downloads: try twice more before giving up.
async function network(request) {
  for (let attempt = 0; ; attempt++) {
    try { return await fetch(request); }
    catch (error) { if (attempt >= 2) throw error; await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); }
  }
}

// After the menu is ready the page asks for the rest of the game, so the whole night can be played offline.
let warming = null;
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'warm') event.waitUntil(warming ||= warm().finally(() => { warming = null; }));
});
async function warm() {
  let list;
  try { list = await (await fetch('./precache.json', { cache: 'no-cache' })).json(); } catch { return; }
  if (!list || list.build !== BUILD || !Array.isArray(list.files)) return;
  const cache = await caches.open(CACHE);
  for (const path of list.files) {
    if (await cache.match(key(path))) continue;
    try { const response = await network(new Request(path, { cache: 'no-cache' })); if (response.ok) await cache.put(key(path), response); } catch { return; }
  }
}

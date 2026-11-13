// Service worker of the web version: the game opens and plays without a network
// after the first visit. Each build has its own cache; an old cache is removed when
// the new version takes over, which happens the next time the game is opened, so a
// running night is never interrupted by an update.
const BUILD = '20261113-forest49';
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
    // Pages come from the cache of this version too, so the page always matches the game files it loads.
    // A newly published version is downloaded in the background and takes over at the next start.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key(request));
      if (cached) return cached;
      try {
        const response = await network(request);
        if (response.ok) await cache.put(key(request), response.clone());
        return response;
      } catch {
        return (await cache.match(key('./index.html'))) || Response.error();
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
  for (const [index, path] of list.files.entries()) {
    // Stop if a newer version has been published meanwhile: its files belong to its own cache.
    if (index && index % 25 === 0) { try { if ((await (await fetch('./precache.json', { cache: 'no-cache' })).json()).build !== BUILD) return; } catch { return; } }
    if (await cache.match(key(path))) continue;
    try { const response = await network(new Request(path, { cache: 'no-cache' })); if (response.ok) await cache.put(key(path), response); } catch { return; }
  }
}

// Offline support for the grocery list in the aisles (weak signal in stores).
// - Data files (flyers, recipes, prices): network first, so prices are fresh whenever online;
//   the last copy is used offline.
// - Pages: network first, falling back to the cached app shell.
// - Built assets (file names carry a content hash): cache first.
const CACHE = 'gm-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const networkFirst = async (req, fallback) => {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (fallback && (await cache.match(fallback))) || Response.error();
  }
};

const cacheFirst = async (req) => {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // recipe and flyer photos stay on their sites
  if (req.mode === 'navigate') return e.respondWith(networkFirst(req, './index.html'));
  if (url.pathname.includes('/data/')) return e.respondWith(networkFirst(req));
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) return e.respondWith(cacheFirst(req));
});

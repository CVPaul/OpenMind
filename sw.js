const CACHE = 'openmind-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
];

// Install: cache all static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for local assets, network-first for API calls
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for API calls (Claude / OpenAI)
  if (url.hostname.includes('anthropic.com') || url.hostname.includes('openai.com')) {
    return; // let browser handle normally
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Cache successful same-origin responses
        if (resp.ok && url.origin === self.location.origin) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html')); // offline fallback
    })
  );
});

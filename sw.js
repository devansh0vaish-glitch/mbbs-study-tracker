const CACHE_NAME = 'mbbs-v36-shell-8-cloudflare';
const CORE_ASSETS = [
  './', 'index.html', 'style.css', 'v36.css', 'app.js', 'v36.js', 'local-llm.js', 'ai-provider.js',
  'syllabus.js', 'manifest.json',
  'assets/icon-192.png', 'assets/icon-512.png',
  'assets/apple-touch-icon.png', 'assets/favicon-32.png', 'assets/favicon-16.png'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && url.hostname !== 'cdn.jsdelivr.net' && url.hostname !== 'esm.run') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch {
      const cached = await cache.match(request) || await cache.match('./index.html');
      return cached || new Response('Offline: this resource is not available in the saved app shell.', {status: 503, headers: {'Content-Type':'text/plain'}});
    }
  })());
});

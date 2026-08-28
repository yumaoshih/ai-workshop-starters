const CACHE_NAME = 'vocabulary-trainer-v16';
const KOKORO_RUNTIME_CACHE = 'vocabulary-trainer-kokoro-v1';
const KOKORO_LIBRARY_URL = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './assets/word-card-background.png',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './app.js',
  './kokoro-worker.js',
  './manifest.webmanifest',
  './icons/app-icon.svg',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './data/vocabulary-data.js',
  './data/LICENSES.md',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('vocabulary-trainer-v') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (event.request.url === KOKORO_LIBRARY_URL) {
    event.respondWith(
      caches.open(KOKORO_RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      }),
    );
    return;
  }
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      if (cached) {
        network.catch(() => undefined);
        return cached;
      }
      return network.catch(() => caches.match('./index.html'));
    }),
  );
});

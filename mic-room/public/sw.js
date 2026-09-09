const CACHE_NAME = 'mic-room-v4';
const SCOPE_URL = new URL(self.registration.scope);
const APP_SHELL_URL = new URL('./index.html', SCOPE_URL).toString();
const CORE_ASSETS = [
  new URL('./', SCOPE_URL).toString(),
  APP_SHELL_URL,
  new URL('./styles.css', SCOPE_URL).toString(),
  new URL('./app.js', SCOPE_URL).toString(),
  new URL('./manifest.webmanifest', SCOPE_URL).toString(),
  new URL('./vendor/bootstrap.min.css', SCOPE_URL).toString(),
  new URL('./vendor/bootstrap.bundle.min.js', SCOPE_URL).toString(),
  new URL('./vendor/qrcode.min.js', SCOPE_URL).toString(),
  new URL('./icons/icon-192.png', SCOPE_URL).toString(),
  new URL('./icons/icon-512.png', SCOPE_URL).toString(),
  new URL('./icons/apple-touch-icon.png', SCOPE_URL).toString(),
  new URL('./icons/favicon.svg', SCOPE_URL).toString(),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || /\/api\//.test(url.pathname)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_SHELL_URL, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(APP_SHELL_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkPromise = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);

      return cached || networkPromise;
    })
  );
});

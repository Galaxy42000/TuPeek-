// Service worker whose only job is to turn caching off: every request for this
// site goes straight to the network and skips the browser cache, so a new version
// shows up on the next load without a hard refresh.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    req.mode === 'navigate'
      ? fetch(new Request(req.url, { cache: 'no-store', redirect: 'manual', credentials: 'same-origin' }))
      : fetch(req, { cache: 'no-store' }),
  );
});

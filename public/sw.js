const CACHE_NAME = 'nuetify-offline-v2';
const PRECACHE_URLS = ['/', '/icon', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(request, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(request, 3500);
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, res.clone());
            if (url.pathname === '/') {
              cache.put('/', res.clone());
            }
          }
          return res;
        } catch {
          return (await caches.match(request)) || (await caches.match('/'));
        }
      })()
    );
    return;
  }

  if (url.pathname === '/api/maintenance') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(request, 2500);
          return res;
        } catch {
          return new Response(
            JSON.stringify({ maintenance: false, offline: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  if (url.pathname === '/api/music/home' || url.pathname === '/api/leaderboard') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(request, 4000);
          if (res && res.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/icon' ||
    url.pathname === '/manifest.webmanifest' ||
    /\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const networkPromise = fetch(request)
          .then(async (res) => {
            if (res && res.ok) {
              const cache = await caches.open(CACHE_NAME);
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }
        const netRes = await networkPromise;
        return netRes || Response.error();
      })()
    );
  }
});

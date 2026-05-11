/**
 * Macadam service worker — static shell only.
 * IndexedDB / app data never flows through fetch; this worker does not cache mutations,
 * cross-origin, query-string, or non-GET requests.
 */
import { CACHE_NAME, CACHE_FILES } from './sw-manifest.js';

/** Paths allowed for runtime cache updates (same as precache list). */
function shellPathnames() {
  return new Set(
    CACHE_FILES.map((rel) => {
      const u = new URL(rel, self.location.href);
      return u.pathname;
    }),
  );
}

function isWebManifestPath(pathname) {
  return pathname.endsWith('/manifest.json');
}

/** Network-first + cache fallback so manifest changes propagate without a full SW bump. */
async function handleManifestGet(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      await cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await cache.match(new Request(new URL('./manifest.json', self.location.href))));
    if (cached) return cached;
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CACHE_FILES);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') {
    event.respondWith(fetch(req));
    return;
  }
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }
  if (url.search !== '') {
    event.respondWith(fetch(req));
    return;
  }
  // IndexedDB does not use the fetch API; no URL branch needed.

  if (isWebManifestPath(url.pathname)) {
    event.respondWith(handleManifestGet(req));
    return;
  }

  event.respondWith(handleShellGet(req));
});

async function handleShellGet(request) {
  const allowedPaths = shellPathnames();
  const pathname = new URL(request.url).pathname;
  const inShell = allowedPaths.has(pathname);

  const cache = await caches.open(CACHE_NAME);

  // Cache-first shell: offline reads hit precache; network refreshes entries in CACHE_FILES.
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const networkRes = await fetch(request);
    if (networkRes.ok && inShell) {
      await cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch (err) {
    if (request.mode === 'navigate') {
      const indexReq = new Request(new URL('./index.html', self.location.href));
      const shell = await cache.match(indexReq);
      if (shell) return shell;
    }
    if (inShell) {
      const normalized = new Request(new URL(pathname, self.location.href));
      const fromCache = await cache.match(normalized);
      if (fromCache) return fromCache;
    }
    throw err;
  }
}

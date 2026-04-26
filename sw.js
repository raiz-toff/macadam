// sw.js - Macadam Private Vault Service Worker
const CACHE_NAME = 'macadam-vault-v2';

// The core assets required to run the Vault entirely offline.
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/weekly.html',
    '/expenses.html',
    '/settings.html',
    '/static/style.css',
    '/static/script.js',
    '/static/db.js',
    '/static/weekly_vault.js',
    '/static/expenses_vault.js',
    '/static/vault_aggregation.js',
    '/static/vault_backup.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.min.js'
];

// Install Event - Cache the assets
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Macadam SW: Caching core vault assets');
            // Try to cache all assets individually so a single failure doesn't halt the entire cache process
            return Promise.all(
                ASSETS_TO_CACHE.map(url => {
                    return cache.add(url).catch(err => {
                        console.warn('Macadam SW: Failed to cache asset:', url, err);
                    });
                })
            );
        })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('Macadam SW: Clearing old cache', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim(); // Take control of all open pages immediately
        })
    );
});

// Fetch Event - Network First, fallback to Cache Strategy
// This ensures the user gets the latest HTML/JS if they are online,
// but instantly falls back to the cached versions if they are offline (e.g. in an elevator).
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests. POST requests (like login) should bypass the SW.
    if (event.request.method !== 'GET') return;

    // Skip Chrome extension requests or similar
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If we got a valid response from the network, clone it and update the cache dynamically
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If the network request fails (user is offline), try to serve it from the cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // If the page isn't cached at all, we could theoretically return an offline.html
                    // but we'll let it fail naturally if it's completely missing.
                });
            })
    );
});

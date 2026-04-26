# Service Worker and Offline Behavior

Macadam ships a service worker (`sw.js`) that makes the app fully functional
without a network connection. Once the user visits the site for the first time
while online, every subsequent visit works offline.

## Cache Name

```
macadam-vault-v2
```

Bump the version suffix when you change any cached asset and want
existing users to pick up the update.

## Pre-cached Assets

On `install`, the service worker caches:

| Asset                              | Source   |
|------------------------------------|----------|
| `/`, `/index.html`                 | Local    |
| `/weekly.html`, `/expenses.html`   | Local    |
| `/settings.html`                   | Local    |
| `/static/style.css`                | Local    |
| `/static/script.js`                | Local    |
| `/static/db.js`                    | Local    |
| `/static/weekly_vault.js`          | Local    |
| `/static/expenses_vault.js`        | Local    |
| `/static/vault_aggregation.js`     | Local    |
| `/static/vault_backup.js`          | Local    |
| `/manifest.json`                   | Local    |
| Bootstrap CSS                      | CDN      |
| Bootstrap Icons CSS                | CDN      |
| Bootstrap JS Bundle               | CDN      |
| Dexie.js                           | CDN      |

Each asset is cached individually so that a single CDN failure does not
prevent the rest from being cached.

## Fetch Strategy

**Network-first with cache fallback.**

1. Every `GET` request is sent to the network.
2. If the response is `200` and `basic` type, it is cloned into the cache
   before being returned. This keeps the cache fresh.
3. If the network fails (offline, timeout), the cached version is served.
4. Non-GET requests (e.g. POST) bypass the service worker entirely.
5. Non-HTTP requests (e.g. `chrome-extension://`) are ignored.

## Lifecycle

- **Install**: `skipWaiting()` is called so the new worker activates
  immediately instead of waiting for all tabs to close.
- **Activate**: Old caches (any cache name that does not match the current
  `CACHE_NAME`) are deleted. `clients.claim()` is called to take control of
  open pages immediately.

## Updating the Cache

When you modify any file that the service worker caches:

1. Change the `CACHE_NAME` constant in `sw.js` (e.g. `macadam-vault-v3`).
2. Deploy. The browser will detect the byte difference in `sw.js` and trigger
   a new install cycle, which pre-caches the updated assets and purges the
   old cache on activation.

## Registration

Each HTML page registers the service worker in an inline `<script>` block
at the bottom of `<body>`:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

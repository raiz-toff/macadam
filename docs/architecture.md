# Architecture

Macadam is a zero-backend Progressive Web App.
There is no server, no build step, and no transpilation.
The browser _is_ the runtime.

## Runtime Model

```
Browser
  |
  +-- index.html / weekly.html / expenses.html / settings.html
  |     Static HTML shells. Each page loads the shared navbar,
  |     its own inline content, and the script bundle at the bottom.
  |
  +-- static/db.js                (Dexie schema + seed data)
  +-- static/script.js            (Dashboard logic, charts, theme, presets)
  +-- static/weekly_vault.js      (Weekly CRUD + table rendering)
  +-- static/expenses_vault.js    (Expense CRUD + category management + charts)
  +-- static/vault_aggregation.js (Read-only aggregation for the dashboard)
  +-- static/vault_backup.js      (Export / import JSON)
  +-- static/style.css            (Design tokens, dark mode, component styles)
  |
  +-- sw.js            (Service Worker -- offline cache)
  +-- manifest.json    (PWA metadata)
```

Every script attaches to `window`.
There are no ES modules, no bundler, and no framework.
Scripts are loaded in dependency order via `<script>` tags at the bottom of each HTML file:

1. Bootstrap Bundle (CDN)
2. Chart.js (vendored at `static/chart.min.js`)
3. Dexie.js (CDN)
4. `static/db.js` -- opens the IndexedDB database, attaches `window.db`
5. `static/script.js` -- shared logic (theme toggle, dashboard rendering)
6. Page-specific script (e.g. `static/weekly_vault.js`)

## Data Flow

All reads and writes go through Dexie.js, which wraps IndexedDB.
There are no network calls for data -- everything is local.

```
User action (form submit, button click)
  --> JS event handler (e.preventDefault())
    --> Dexie put/add/delete on window.db
      --> IndexedDB transaction
        --> Re-render the affected DOM
```

The dashboard page (`index.html`) calls `window.generateVaultSummary()` from
`vault_aggregation.js`, which reads all stores and returns a computed summary
object. That object drives every KPI, chart, and table on the page.

## Offline Strategy

The service worker (`sw.js`) uses a **network-first** strategy:

1. Try fetching from the network.
2. If the network responds with 200, clone the response into the cache and serve it.
3. If the network fails (offline), serve from the cache.

On install, the service worker pre-caches every HTML page, every JS/CSS file,
and the CDN dependencies (Bootstrap, Dexie, Bootstrap Icons).
Old caches are purged on activation.

## Theming

Two themes: light and dark.
The toggle button swaps `data-bs-theme` on `<html>` and persists the choice
to `localStorage` under the key `theme`.

CSS custom properties in `style.css` define two sets of design tokens:
- `:root` for light mode
- `[data-bs-theme="dark"]` for dark mode

Chart colors are also driven by CSS variables (`--chart-line-color-1`, etc.),
read at runtime via `getComputedStyle`. When the theme toggles, charts are
destroyed and re-initialized to pick up the new palette.

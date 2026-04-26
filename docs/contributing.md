# Contributing

## Prerequisites

A web browser and a text editor. That is it.
There is no build step, no Node.js dependency, and no package manager required
at development time.

For a better local development experience, serve the files over HTTP
so that the service worker and manifest can register properly:

```bash
# Python (built-in)
python3 -m http.server 8000

# Node (if you have it)
npx -y serve .
```

Then open `http://localhost:8000`.

Opening `index.html` directly via `file://` will work for basic testing,
but the service worker will not register and PWA install prompts will not fire.

## Project Layout

```
macadam/
  index.html              Dashboard
  weekly.html             Weekly earnings log
  expenses.html           Expense tracker
  settings.html           Vault management (backup/restore)
  sw.js                   Service worker
  manifest.json           PWA manifest
  static/
    db.js                 Dexie schema and seed data
    script.js             Shared logic (theme, dashboard charts, presets)
    weekly_vault.js       Weekly CRUD and table rendering
    expenses_vault.js     Expense CRUD, category management, charts
    vault_aggregation.js  Read-only aggregation for dashboard KPIs
    vault_backup.js       JSON export / import
    style.css             Design tokens, dark mode, components
    chart.min.js          Vendored Chart.js
  docs/
    ...                   You are here
```

## Conventions

- **No framework.** Vanilla JS, vanilla CSS. Keep it that way.
- **No build tools.** If a library is needed, vendor the minified file into
  `static/` or load it from a CDN and add it to the service worker cache list.
- **Global scope.** Scripts attach to `window` (e.g. `window.db`,
  `window.generateVaultSummary`). This is intentional -- the app is small
  enough that module boundaries add overhead without benefit.
- **Script load order matters.** `db.js` must load before any vault script.
  `script.js` must load after Chart.js and Dexie.
- **Dark mode parity.** Every UI change must look correct in both light and
  dark themes. Use CSS variables from `style.css`, not hardcoded colors.
- **Bump the cache.** If you change any file cached by the service worker,
  update `CACHE_NAME` in `sw.js` or users will not see the change until they
  manually clear site data.

## Adding a New Page

1. Create `newpage.html` using the same navbar/footer structure as the existing pages.
2. Add a `<li>` entry to the navbar in every HTML file.
3. Create `static/newpage_vault.js` for the page logic.
4. Add the new HTML and JS files to the `ASSETS_TO_CACHE` array in `sw.js`.
5. Bump `CACHE_NAME` in `sw.js`.

## Adding a New Database Store

1. Increment the version number in `db.js`:
   ```js
   db.version(2).stores({
     // repeat all existing stores unchanged
     weekly_earnings: '++id, week_no, start_date, end_date',
     expense_categories: '++id, &name',
     expenses: '++id, date, category_id',
     settings: 'key',
     // add new store
     mileage: '++id, date'
   });
   ```
2. Non-indexed fields do not need to be listed in the schema.
3. Update `vault_backup.js` to include the new store in exports and handle it on import.

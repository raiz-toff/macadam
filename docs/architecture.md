# Macadam: "The Private Vault" Architecture Plan

This document outlines the step-by-step plan to transition Macadam from a server-side Flask application to a true client-side offline-first Progressive Web App (PWA).

## The Goal
To create a fully local, privacy-first "Private Vault" where all data is stored securely in the browser's IndexedDB. The app will work seamlessly offline and can be installed on a mobile device just like a native app.

---

## Phase 1: Database Migration to Dexie.js (The Storage)
Currently, data is handled by SQLite and SQLAlchemy on the server. We will move this to the client-side.

1. **Include Dexie.js**: Add Dexie.js to our frontend stack.
2. **Define Schema (`static/db.js`)**: 
   Create an IndexedDB schema that mirrors our current models:
   - `deliveries`: id, date, platform, earnings, tips, duration, etc.
   - `expenses`: id, date, category, amount, description.
   - `settings`: key-value store for user preferences.
3. **Data Layer Rewiring**: 
   Instead of submitting forms to Flask, we will use JavaScript to intercept form submissions (`e.preventDefault()`) and save the data directly to Dexie.js.

## Phase 2: Decoupling the UI from the Server (The Frontend)
Since we are keeping the existing Bootstrap 5 UI, we need to shift from server-side rendering (Jinja2) to client-side rendering.

1. **Convert Templates to Static HTML**: Move our `.html` files from Jinja templates to pure HTML.
2. **Vanilla JS Rendering**: 
   - Write JavaScript functions to fetch data from Dexie.js and dynamically generate the HTML for the dashboard, tables, and charts.
   - Example: Instead of `{% for delivery in deliveries %}`, we will use `db.deliveries.toArray().then(renderTable)`.
3. **Authentication**: Since the vault is local, we can replace the Flask-Login system with a simple client-side PIN unlock screen that gates access to the UI.

## Phase 3: The PWA Engine (The "App" Feel)
This turns the website into an installable mobile application.

1. **Create `manifest.json`**: 
   Define the app name (Macadam), colors, icons, and display mode (`standalone`) so it hides the browser address bar.
2. **Implement Service Worker (`sw.js`)**:
   - Cache all core assets: `index.html`, `style.css`, `script.js`, Bootstrap, and Chart.js.
   - Intercept network requests and serve them from the cache when offline.
3. **Registration**: Add the registration script to our main JS file to prompt the user to "Add to Home Screen".

## Phase 4: Backup & Restore System (The "Save Game")
Since data lives on the device, the user needs a way to safeguard it.

1. **Export Functionality**:
   - Create a "Download Backup" button in Settings.
   - JS will fetch all tables from Dexie, bundle them into a single JSON object.
   - Create a Blob and trigger a download of `macadam_backup_YYYYMMDD.json`.
2. **Restore Functionality**:
   - Create an "Upload Backup" file input.
   - Read the selected JSON file using the FileReader API.
   - Clear existing IndexedDB data and bulk insert the imported JSON data via Dexie.

## Phase 5: Complete Static Deployment (Optional)
Once Phase 1-4 are complete, Macadam will no longer need Flask, Python, or SQLite. It can be hosted on any free static file server (like GitHub Pages, Netlify, or Vercel) or even loaded from a local file (`file:///.../index.html`).

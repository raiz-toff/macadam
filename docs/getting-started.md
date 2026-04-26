# Getting Started

Macadam is a serverless, offline-first financial tracker.
There is no backend to install and no database to configure.
Everything runs in the browser.

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/raiz-toff/macadam.git
   cd macadam
   ```

2. Serve the files over HTTP (required for service worker registration):
   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in a modern browser.

That is it. The IndexedDB database is created automatically on first load
with default expense categories and settings.

## Installing as a PWA

Because Macadam includes a `manifest.json` and a service worker, modern
browsers will offer to install it as a standalone app:

- **Desktop (Chrome/Edge)**: Click the install icon in the address bar.
- **Android (Chrome)**: Tap the browser menu, then "Add to Home Screen".
- **iOS (Safari)**: Tap the share button, then "Add to Home Screen".

Once installed, the app opens in its own window without a browser address bar
and works fully offline.

## Pages

| Page           | URL              | Purpose                                          |
|----------------|------------------|--------------------------------------------------|
| Dashboard      | `index.html`     | KPIs, charts, monthly breakdown, date filtering  |
| Weekly Log     | `weekly.html`    | Add/edit/delete weekly earnings records           |
| Expenses       | `expenses.html`  | Add/edit/delete expenses, category management     |
| Settings       | `settings.html`  | Vault status, backup export, backup restore       |

## First Things to Do

1. Go to **Weekly Log** and add your first week of earnings.
2. Go to **Expenses** and log any business costs.
3. Return to the **Dashboard** to see your data reflected in the charts and KPIs.
4. Go to **Settings** and export a backup. Store the JSON file somewhere safe.

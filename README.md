# Macadam

**The Private Vault for Independent Drivers.**

Named after John Loudon McAdam, the engineer who revolutionized road construction, Macadam is a robust, serious financial tracker for dashers and delivery drivers. It is designed to be **local-first, offline-ready, and privacy-respecting**.

Unlike corporate tools, Macadam stores 100% of your sensitive financial data directly in your browser's encrypted vault (IndexedDB). No cloud, no tracking, no subscription. Just you and your data.

## Key Features

- **Privacy First**: Your data never leaves your device. All logs are stored locally using IndexedDB via Dexie.js.
- **Offline-First PWA**: Fully functional without an internet connection. Install it on your mobile device as a standalone app.
- **Visual Analytics**: Dynamic, interactive charts powered by Chart.js to visualize your earnings and expenses over time.
- **Precision Tracking**: Log daily/weekly earnings across multiple platforms and manage business expenses (fuel, maintenance, etc.).
- **Data Portability**: Built-in backup and restore system. Export your entire vault to a JSON file at any time for safe keeping.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Styling**: Bootstrap 5 + Custom Modern UI
- **Database**: IndexedDB (managed by [Dexie.js](https://dexie.org/))
- **Charts**: [Chart.js](https://www.chartjs.org/)
- **PWA**: Service Workers & Web App Manifest

## Getting Started

Since Macadam is now fully serverless, you don't need to install Python or run a complex backend.

### Option 1: Local Development
1. Clone the repository.
2. Open `index.html` in any modern web browser.

### Option 2: Static Hosting
Deploy to any static hosting provider (GitHub Pages, Netlify, Vercel, etc.) by simply uploading the files in this directory.

## Documentation

See the [`docs/`](docs/) folder:

- [Getting Started](docs/getting-started.md) -- setup, installation, first steps
- [Architecture](docs/architecture.md) -- runtime model, data flow, theming
- [Data Model](docs/data-model.md) -- IndexedDB schema, stores, field reference
- [Backup and Restore](docs/backup-and-restore.md) -- export format, import behavior, merge semantics
- [Offline](docs/offline.md) -- service worker, caching strategy, cache updates
- [Contributing](docs/contributing.md) -- project layout, conventions, how to extend

## The Roadmap
Macadam has recently transitioned from a Flask/SQLite backend to a serverless PWA. We are currently in the final phases of polishing the offline-first experience and data portability features.

---
*Dashers live and die by the asphalt; Macadam ensures you keep track of every mile.*

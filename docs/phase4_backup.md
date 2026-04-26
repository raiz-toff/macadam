# Phase 4: The Backup/Restore System

## Overview
Because Macadam was decoupled from a server-side backend (Phase 2), all of the user's financial data exists strictly inside their device's browser (`IndexedDB`). While this guarantees privacy and offline access, it creates a massive risk: if the user drops their phone, clears their browser cache, or switches devices, their data is gone forever.

To mitigate this without introducing a cloud database, we built the "Save Game" model: a purely client-side Backup and Restore system.

## The Approach

### 1. The Export Mechanism (The "Save")
Implemented in `static/vault_backup.js`, the export function grabs the complete state of the Dexie database and downloads it to the user's phone as a standard JSON file.

```javascript
const backupData = {
    timestamp: new Date().toISOString(),
    app: "Macadam",
    version: 1,
    data: {
        weekly_earnings: await window.db.weekly_earnings.toArray(),
        expenses: await window.db.expenses.toArray(),
        expense_categories: await window.db.expense_categories.toArray(),
        settings: await window.db.settings.toArray()
    }
};
// Converts to Blob and triggers HTML5 download anchor
```

### 2. The Import Mechanism (The "Load")
Users can navigate to **Vault Settings**, select a previously exported `.json` file, and upload it.
The script reads the file via the HTML5 `FileReader` API (meaning the file is never sent to the Flask server—it's read directly by the browser).

```javascript
// Using Dexie's bulkPut
await window.db.weekly_earnings.bulkPut(parsedData.data.weekly_earnings);
```
`bulkPut` is critical here. Unlike `bulkAdd`, `bulkPut` will cleanly overwrite existing records if their Primary Key (`id`) matches, preventing duplicate rows if the user restores a vault that shares history with their current device.

### 3. The UI (`admin.html`)
The old `admin.html` page was completely stripped of its Flask-based SQLite backup commands. It has been repurposed as the **Vault Settings** page.
- It displays the active storage engine (IndexedDB).
- It runs a JavaScript check (`navigator.serviceWorker.controller`) to confirm whether the PWA Engine is actively protecting the app offline.
- It provides the UI buttons for exporting and importing the JSON vault.

## Conclusion of Phase 4
Macadam is now a completely decentralized application. Users have absolute ownership over their data, and it is fully portable via standard JSON files. The Flask server at this point is acting as a dumb static file server, setting the stage for the final phase: removing Python entirely.

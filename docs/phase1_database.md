# Phase 1: The Private Vault (IndexedDB + Dexie.js)

## Overview
This document outlines the implementation of the local database architecture for Macadam. By moving away from a server-side SQLite database, we embrace an "offline-first" model where the user's browser is the primary data repository.

## Technologies Used
- **IndexedDB**: The native browser database capable of storing large amounts of structured data.
- **Dexie.js**: A minimalist wrapper for IndexedDB that provides a clean, Promise-based API.

## File Implemented: `static/db.js`

### 1. Database Initialization
```javascript
const db = new Dexie('MacadamVault');
```
We initialize a Dexie instance named `MacadamVault`. This is the namespace where all data for the application will reside on the client's device.

### 2. Schema Definition
Unlike SQL databases, IndexedDB is a NoSQL object store. When defining a schema in Dexie, **we only declare the properties we want to index** (meaning properties we want to search, filter, or sort by). Non-indexed properties (like `notes` or `amount`) are still stored in the object; they just don't need to be declared upfront.

```javascript
db.version(1).stores({
    weekly_earnings: '++id, week_no, start_date, end_date', 
    expense_categories: '++id, &name',                     
    expenses: '++id, date, category_id',                   
    settings: 'key'                                        
});
```
- `++id`: Creates an auto-incrementing primary key.
- `&name`: Ensures the `name` field is strictly unique.

### 3. Data Seeding (The `populate` Hook)
Dexie provides an `on('populate')` event that fires exactly once: when the database is initially created on a new device.

We use this hook to seed critical default data:
- **Expense Categories**: Basic categories like 'Fuel', 'Maintenance', etc.
- **Settings**: Default preferences like the currency symbol (`$`).

### Next Developer Steps
Now that the database exists entirely on the client side, our next step (Phase 2) is to:
1. Include Dexie.js via CDN in our HTML headers.
2. Link `db.js` so the database initializes on page load.
3. Update the UI to read from `window.db` instead of relying on the Flask server to render templates.

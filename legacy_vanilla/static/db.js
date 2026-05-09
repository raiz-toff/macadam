// db.js - The Private Vault Storage (IndexedDB via Dexie.js)

// Initialize Dexie database
const db = new Dexie('MacadamVault');

// Define Database Schema
// Note: In Dexie, you only define properties that you want to index for querying.
// Non-indexed properties (like 'notes' or 'amount') are still saved, just not queryable via indexes.
// ++id denotes an auto-incrementing primary key.
// &name denotes a unique index.
db.version(1).stores({
    weekly_earnings: '++id, week_no, start_date, end_date', // Main earnings log
    expense_categories: '++id, &name',                     // Category list
    expenses: '++id, date, category_id',                   // Individual expenses
    settings: 'key'                                        // Key-value store for app settings
});

// Hook: Populate database with default data upon initial creation
db.on('populate', async () => {
    // Seed default expense categories
    await db.expense_categories.bulkAdd([
        { name: 'Fuel' },
        { name: 'Maintenance' },
        { name: 'Supplies' },
        { name: 'Insurance' },
        { name: 'Phone/Data' },
        { name: 'Taxes/Fees' }
    ]);
    
    // Seed default settings
    await db.settings.bulkAdd([
        { key: 'currency_symbol', value: '$' },
        { key: 'default_range', value: 'all' },
        { key: 'app_name', value: 'Macadam' }
    ]);
    
    console.log("Macadam Vault: Initial population complete.");
});

// Helper function to get a setting
async function getSetting(key) {
    const setting = await db.settings.get(key);
    return setting ? setting.value : null;
}

// Export for use in other modules if using modules, but since we are using plain scripts, it attaches to window.
window.db = db;
window.getSetting = getSetting;

# Backup and Restore

All vault data lives in IndexedDB inside the user's browser.
If the user clears site data, switches browsers, or loses their device,
the data is gone. Backups are the only safety net.

## Backup Format

The export produces a single `.json` file named
`macadam_vault_backup_YYYY-MM-DD.json` with this structure:

```json
{
  "timestamp": "2026-04-26T12:00:00.000Z",
  "app": "Macadam",
  "version": 1,
  "data": {
    "weekly_earnings": [ ... ],
    "expenses": [ ... ],
    "expense_categories": [ ... ],
    "settings": [ ... ]
  }
}
```

- `app` is always `"Macadam"`. Used for validation on import.
- `version` tracks the schema version at time of export.
- `data` contains the raw arrays from each Dexie store, including auto-generated `id` fields.

## Export Flow

1. User clicks **Generate & Download Backup** on the Settings page.
2. `vault_backup.js` reads all four stores via `toArray()`.
3. The result is serialized to a formatted JSON string.
4. A `Blob` is created and a temporary `<a>` element triggers the download.

No network requests are made. The entire operation is local.

## Import Flow

1. User selects a `.json` file via the file input on the Settings page.
2. The **Restore Vault Data** button becomes enabled.
3. On click, `FileReader.readAsText()` parses the file.
4. The `app` field is checked -- if it is not `"Macadam"`, the import is rejected.
5. A `confirm()` dialog warns the user that existing records with the same IDs will be overwritten.
6. Data is merged using `bulkPut()` (upsert semantics):
   - `weekly_earnings` -- bulk put by ID.
   - `expenses` -- bulk put by ID.
   - `expense_categories` -- IDs are stripped and each category is inserted individually. If a category name already exists (unique constraint), the error is silently caught.
   - `settings` -- bulk put by key.
7. The page reloads to reflect the imported data.

## What "Merge" Means

`bulkPut` performs an upsert: if a record with the same primary key exists,
it is overwritten. If it does not exist, it is inserted. This means:

- Importing a backup onto an empty vault restores everything.
- Importing onto an existing vault overwrites records that share the same `id` and adds new ones.
- Records in the current vault that are _not_ in the backup file are left untouched.

There is no "wipe and replace" option at this time.

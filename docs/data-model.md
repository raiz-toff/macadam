# Data Model

Macadam uses [Dexie.js](https://dexie.org/) (v4) over IndexedDB.
The database is called `MacadamVault` and is defined in `static/db.js`.

## Stores

### `weekly_earnings`

One row per work week.

| Field              | Type    | Indexed | Notes                                      |
|--------------------|---------|---------|---------------------------------------------|
| `id`               | Number  | PK, auto-increment | Dexie `++id`                    |
| `week_no`          | Number  | Yes     | Sequential week number (user-assigned)      |
| `start_date`       | String  | Yes     | ISO date `YYYY-MM-DD`                       |
| `end_date`         | String  | Yes     | ISO date `YYYY-MM-DD`                       |
| `hours_worked`     | Number  | No      | Decimal hours (e.g. `32.5`)                 |
| `active_hours`     | Number  | No      | Optional. Active (on-delivery) hours        |
| `deliveries`       | Number  | No      | Count of deliveries completed               |
| `doordash_pay`     | Number  | No      | Platform base pay                           |
| `tips`             | Number  | No      | Customer tips                               |
| `other_pay`        | Number  | No      | Bonuses, promos, other platform pay         |
| `paid_out_of_pocket`| Number | No      | Expenses paid directly during the week      |
| `notes`            | String  | No      | Free-text                                   |

Total earnings for a week = `doordash_pay + tips + other_pay`.

### `expenses`

Individual expense line items.

| Field         | Type    | Indexed | Notes                          |
|---------------|---------|---------|--------------------------------|
| `id`          | Number  | PK, auto-increment | Dexie `++id`         |
| `date`        | String  | Yes     | ISO date `YYYY-MM-DD`          |
| `category_id` | Number | Yes     | Legacy index (not actively used in queries -- category name is stored directly) |
| `category`    | String  | No      | Category name (e.g. `"Fuel"`)  |
| `amount`      | Number  | No      | Dollar amount                  |
| `description` | String  | No      | Merchant or short note         |
| `receipt`     | String  | No      | Where to find the receipt      |
| `notes`       | String  | No      | Free-text                      |

### `expense_categories`

Lookup table for category names. Seeded on first launch.

| Field  | Type   | Indexed | Notes                    |
|--------|--------|---------|--------------------------|
| `id`   | Number | PK, auto-increment | Dexie `++id`   |
| `name` | String | Unique  | e.g. `"Fuel"`, `"Taxes/Fees"` |

Default seed values: Fuel, Maintenance, Supplies, Insurance, Phone/Data, Taxes/Fees.

New categories are created on the fly when a user types a name that does not
exist in the datalist during expense entry (`ensureCategory()` in `expenses_vault.js`).

### `settings`

Key-value store for application preferences.

| Field  | Type   | Indexed | Notes            |
|--------|--------|---------|------------------|
| `key`  | String | PK      | Setting name     |
| `value`| any    | No      | Setting value    |

Default seed values:

| Key              | Default Value |
|------------------|---------------|
| `currency_symbol`| `$`           |
| `default_range`  | `all`         |
| `app_name`       | `Macadam`     |

## Schema Versioning

The database is currently at **version 1**.
Dexie handles schema migrations automatically via `db.version(N).stores(...)`.
When adding new indexed fields or stores in the future, increment the version
number and add a new `.version(2).stores(...)` block. Non-indexed fields can
be added freely without a version bump.

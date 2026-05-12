# Adding a province or territory

Provinces (and, by the same pattern, **states / regions**) are **static catalog data** in `src/registry/provinces/`. The app resolves `user.provinceId` through **`ProvinceRegistry`** and exposes the active row as **`store` → `provinceDef`** for tax hints, expense categories, and platform allow-lists.

For registry philosophy, see [`docs/Registry_arch.md`](Registry_arch.md). For plan-level intent (Ontario-first v3), see [`docs/planv3.md`](planv3.md).

---

## Checklist

1. Copy [`src/registry/provinces/_TEMPLATE.province.js`](../src/registry/provinces/_TEMPLATE.province.js) to `src/registry/provinces/{CODE}.province.js` (e.g. `BC.province.js`). Use a **short uppercase** `id` (Canadian province/territory codes, US state abbreviations, etc.).
2. Set **`countryId`** to a country that already exists in [`CountryRegistry`](../src/registry/countries/index.js) (`CA`, `US`, …).
3. Fill **`labelKey`** (e.g. `provinces.bc`) and add the same path under **`strings.en`** and **`strings.fr`** in [`src/utils/strings.js`](../src/utils/strings.js) — `t()` walks dot segments, so `provinces.bc` maps to nested `provinces → bc` string leaves (mirror every key in both locales).
4. Set **`availablePlatforms`** to an array of **`PlatformRegistry` ids** (same strings as `doordash.platform.js` `id`). Only listed platforms are treated as “available” for that market when building picker / province-driven UX.
5. Define **`expenseCategories`** (recommended): each row needs stable **`id`**, i18n **`labelKey`** (usually under `expenses.cat.*` — see [`ON.province.js`](../src/registry/provinces/ON.province.js)), and optional **`craLine`**, **`mixedUse`**, **`vehicleTypes`** for driver guidance. These feed [`getAllCategories()`](../src/modules/expenses/expenses.js) when `store.get('provinceDef')` is set.
6. Optional blocks: **`salesTax`**, **`incomeTax`**, **`pensionContribution`**, **`vehicleExpenseMethod`**, **`referenceUrl`**, **`vehicleNotes`**, **`onboardingExtras`** — mirror the shape used in [`ON.province.js`](../src/registry/provinces/ON.province.js) where applicable.
7. Register the module in [`src/registry/provinces/index.js`](../src/registry/provinces/index.js): `import` + push onto **`PROVINCES`**.
8. Run `node build.js --prod` and ensure startup validation passes (`assertProvinceRegistryValid` in [`main.js`](../src/main.js)).

---

## Registry rules (enforced)

[`validateProvinceDefinition`](../src/registry/provinces/index.js) requires:

| Field | Rule |
|--------|------|
| `id` | Present; looked up with **`.toUpperCase()`** — keep ids uppercase in the file. |
| `countryId` | Present; must match how you filter with `ProvinceRegistry.getByCountry('CA')`. |
| `availablePlatforms` | **Non-empty array** of platform id strings. |
| `expenseCategories` | Required key; use a **non-empty** list for real provinces (each entry: `id`, `labelKey`, optional `craLine`, `mixedUse`, `vehicleTypes`). An empty array `[]` is valid for the validator but useless for drivers. |

**Unknown ids:** `ProvinceRegistry.getById(x)` falls back to **`FALLBACK_ID` (`ON`)** when the id is missing from the map. If your primary market is no longer Ontario, consider changing that fallback in `index.js` deliberately (it affects every unresolved `provinceId`).

---

## Field reference (practical)

### `labelKey`

String passed to `t()`. Add nested keys in `strings.js` for both locales so UI does not show raw key paths.

### `availablePlatforms`

Subset of [`PlatformRegistry`](../src/registry/platforms/index.js) ids. If you add a **new** platform and want it in this province, add the platform file **first**, then include its `id` here.

### `expenseCategories`

Used when merging province-first categories in **`getAllCategories()`**: province rows come first; remaining global registry categories fill gaps. **`id`** values should align with expense **`category`** values saved in Dexie where possible.

### `salesTax` / `incomeTax`

Optional objects for HST/GST/PST-style metadata and rough marginal brackets (planning / UI — not legal advice). Copy structure from ON and adjust keys, rates, and `labelKey` / `infoKey` string ids.

### `onboardingExtras`

Small declarative hooks for onboarding (see ON: HST registration toggle). The orchestrator must know how to interpret each `type`; adding a new `type` requires **code changes** in onboarding, not only data.

### `vehicleNotes` / `referenceUrl`

Optional strings for province-specific copy keys and CRA/help links.

---

## Wiring outside the registry

| Area | What to do |
|------|------------|
| **User default** | [`DEFAULT_USER` / migrations](../src/core/db.js) — if a new province should be the default for new vaults, set `provinceId` (and `countryId` / `locale`) consistently. |
| **Store** | [`syncLocaleDefsFromUser`](../src/core/store.js) already loads `provinceDef` from `getProvinceDef(user.provinceId)` — no change needed if only catalog data was added. |
| **Onboarding** | Current v3 onboarding is **Ontario-oriented** in [`steps.js`](../src/modules/onboarding/steps.js) (fixed `taxRegion` / CA flow). Adding provinces for **multi-region** onboarding means new steps or selectors — not automatic from the def file alone. |
| **Tax module** | Province-aware summaries read country + user + expense data; heavy province logic may still need updates in [`tax.js`](../src/modules/tax/tax.js) for new regimes. |

---

## Minimal example skeleton

```js
// src/registry/provinces/BC.province.js
export default {
  id: 'BC',
  countryId: 'CA',
  labelKey: 'provinces.bc',
  availablePlatforms: ['doordash', 'ubereats', 'skip', 'instacart', 'other'],
  salesTax: { name: 'GST+PST', rate: 0.12, /* … */ },
  incomeTax: { suggestedSetAsidePct: 25, brackets: [/* … */] },
  expenseCategories: [
    { id: 'fuel', labelKey: 'expenses.cat.fuel', craLine: '…' },
    // …
  ],
  vehicleExpenseMethod: 'actual_costs',
  onboardingExtras: [],
};
```

Then in `index.js`:

```js
import BC from './BC.province.js';
const PROVINCES = [ON, BC];
```

---

## QA

- Set `user.provinceId` to the new code (Settings or Dexie) and reload: **`store.provinceDef.id`** should match.
- Open **Expenses → add**: category grid should prefer the province **`expenseCategories`** list.
- Grep for hardcoded `'ON'` outside migrations/fallbacks; replace with `provinceDef` or `user.provinceId` where appropriate when you truly support multiple provinces.

---

## Related files

| File | Role |
|------|------|
| [`src/registry/provinces/_TEMPLATE.province.js`](../src/registry/provinces/_TEMPLATE.province.js) | Empty-ish starter def. |
| [`src/registry/provinces/ON.province.js`](../src/registry/provinces/ON.province.js) | Full reference implementation. |
| [`src/registry/provinces/index.js`](../src/registry/provinces/index.js) | Registry + validation + fallback. |
| [`src/utils/locale.js`](../src/utils/locale.js) | `getProvinceDef` wrapper. |
| [`src/modules/expenses/expenses.js`](../src/modules/expenses/expenses.js) | `getAllCategories()` merges `provinceDef.expenseCategories`. |

---

## See also

- [`adding-a-platform.md`](adding-a-platform.md) — add a platform before listing it in `availablePlatforms`.
- [`adding-a-country.md`](adding-a-country.md) — add the country before provinces that reference `countryId`.

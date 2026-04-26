# Phase 2: Decoupling the UI (The Frontend)

## Overview
This phase transitions Macadam from Server-Side Rendering (via Flask/Jinja) to Client-Side Rendering (Vanilla JS). By removing Jinja loops, the HTML becomes static, and the browser handles fetching and drawing the data directly from the local IndexedDB using Dexie.js.

## The Approach

### 1. Removing Jinja Data Binding
Previously, the `weekly.html` template looked like this:
```html
<tbody>
    {% for week in weeks %}
    <tr>...</tr>
    {% endfor %}
</tbody>
```
This was entirely stripped out. The table body (`<tbody id="weeklyTableBody">`) is now delivered empty to the client, acting as a blank canvas for JavaScript.

### 2. Form Submission Hijacking
The `<form id="weekModalForm">` no longer has an `action` attribute pointing to a Python backend. Instead, we intercept the submit event via JavaScript:
```javascript
weekModalForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop network request
    const formData = new FormData(weekModalForm);
    // Parse inputs...
    await window.db.weekly_earnings.add(data); // Save locally!
});
```

### 3. The `weekly_vault.js` Implementation
To prevent breaking existing chart animations and UX logic in `script.js`, a dedicated module (`static/weekly_vault.js`) was introduced specifically for the Weekly page. 

**Workflow:**
1. **Load**: `loadWeeklyData()` queries `db.weekly_earnings.toArray()`.
2. **Render**: It loops through the results, dynamically creating `<tr>` elements and appending them to the DOM.
3. **Bind**: It attaches `click` event listeners to the dynamically generated "Edit" and "Delete" buttons.
4. **Update**: It calculates the totals for the footer and dashboard summary cards directly from the IndexedDB dataset.

### 4. The `expenses_vault.js` Implementation
Similar to the weekly page, `expenses.html` was stripped of its Jinja loops. A new module (`static/expenses_vault.js`) handles:
- Fetching categories dynamically into the filter dropdown and modal `<datalist>`.
- Loading expense records and re-drawing the DOM table.
- Providing native Chart.js rendering (Doughnut and Bar charts) powered purely by the client-side IndexedDB dataset.

### 5. The Dashboard Aggregation (`vault_aggregation.js`)
The `dashboard.html` page historically relied heavily on hitting the Flask backend endpoint `/api/summary` to crunch numbers.
To sever this tie completely:
- The `/api/summary` endpoint is no longer called.
- Instead, `static/vault_aggregation.js` exports a global function `window.generateVaultSummary(startDate, endDate)`.
- This function queries Dexie, performs all YTD and rolling average calculations entirely within the browser, and returns a JSON object mirroring the old API format.
- `script.js` was modified to simply call this function and paint the UI, completing the decoupling process.

## Conclusion of Phase 2
The application's data layer is now entirely client-side. The UI reads and writes to `MacadamVault` (IndexedDB). The Flask application now acts purely as a static file server.

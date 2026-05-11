export default {
  id: 'expenses',
  label: 'Expense list',
  defaultIncluded: true,
  /** @param {unknown} report @param {unknown} [_user] */
  renderHTML: async (report) => {
    const r = /** @type {{ expenses?: unknown[] }} */ (report);
    const n = Array.isArray(r.expenses) ? r.expenses.length : 0;
    return `<p style="color:var(--color-text-secondary);">${n} expense row${n === 1 ? '' : 's'} in range (detail export: expenses CSV).</p>`;
  },
  /** @param {unknown} report @param {unknown} [_user] */
  renderText: (report) => {
    const r = /** @type {{ expenses?: unknown[] }} */ (report);
    const n = Array.isArray(r.expenses) ? r.expenses.length : 0;
    return `Expense rows: ${n}`;
  },
  /** @param {unknown} report @param {unknown} [_user] */
  renderCSV: (report) => {
    const r = /** @type {{ expenses?: Array<Record<string, unknown>> }} */ (report);
    const rows = Array.isArray(r.expenses) ? r.expenses : [];
    const header = ['id', 'date', 'category', 'amount'];
    const body = rows.map((e) => [e.id, e.date, e.category, e.amount]);
    return [header, ...body];
  },
};

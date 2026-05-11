export default {
  id: 'shifts',
  label: 'Shift list',
  defaultIncluded: true,
  /** @param {unknown} report @param {unknown} [_user] */
  renderHTML: async (report) => {
    const r = /** @type {{ shifts?: unknown[] }} */ (report);
    const n = Array.isArray(r.shifts) ? r.shifts.length : 0;
    return `<p style="color:var(--color-text-secondary);">${n} shift${n === 1 ? '' : 's'} in this date range (detail export: shifts CSV).</p>`;
  },
  /** @param {unknown} report @param {unknown} [_user] */
  renderText: (report) => {
    const r = /** @type {{ shifts?: unknown[] }} */ (report);
    const n = Array.isArray(r.shifts) ? r.shifts.length : 0;
    return `Shift rows: ${n}`;
  },
  /** @param {unknown} report @param {unknown} [_user] */
  renderCSV: (report) => {
    const r = /** @type {{ shifts?: Array<Record<string, unknown>> }} */ (report);
    const rows = Array.isArray(r.shifts) ? r.shifts : [];
    const header = ['id', 'date', 'platformId', 'gross'];
    const body = rows.map((s) => [s.id, s.date, s.platformId, s.gross ?? s.grossEarnings]);
    return [header, ...body];
  },
};

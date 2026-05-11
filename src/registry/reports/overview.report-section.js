import { formatCurrency } from '../../utils/formatters.js';

/**
 * @param {unknown} report
 * @param {unknown} user
 * @returns {[string, string][]}
 */
function buildSummaryRows(report, user) {
  const r = /** @type {{ summary?: Record<string, number> } }} */ (report);
  const u = /** @type {{ locale?: { country?: string; currency?: string } }} */ (user);
  const s = r.summary || {};
  const locale = u?.locale?.country || 'US';
  const currency = u?.locale?.currency || 'USD';
  return [
    ['Gross', formatCurrency(s.gross, locale, { currency })],
    ['Expenses', formatCurrency(s.expenseTotal, locale, { currency })],
    ['Net', formatCurrency(s.net, locale, { currency })],
    ['Shifts', String(s.shiftCount)],
    ['Hours', (s.hours ?? 0).toFixed(1)],
    ['Orders', String(s.orders)],
    ['Hourly', formatCurrency(s.hourly, locale, { currency })],
    ['Net hourly', formatCurrency(s.netHourly, locale, { currency })],
  ];
}

export default {
  id: 'overview',
  label: 'Overview',
  defaultIncluded: true,
  /** @param {unknown} report @param {unknown} user */
  renderHTML: async (report, user) => {
    const rows = buildSummaryRows(report, user);
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-2);">
      ${rows
        .map(
          ([k, v]) =>
            `<article class="card"><p>${String(k).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p><strong>${String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</strong></article>`,
        )
        .join('')}
    </div>`;
  },
  /** @param {unknown} report @param {unknown} user */
  renderText: (report, user) => {
    const r = /** @type {{ startDate?: string; endDate?: string } }} */ (report);
    const rows = buildSummaryRows(report, user);
    return [`Report: ${r.startDate} to ${r.endDate}`, ...rows.map(([k, v]) => `${k}: ${v}`)].join('\n');
  },
  /** @param {unknown} report @param {unknown} user */
  renderCSV: (report, user) => {
    const rows = buildSummaryRows(report, user);
    return [['metric', 'value'], ...rows];
  },
  buildSummaryRows,
};

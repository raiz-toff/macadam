import { formatCurrency } from '../../utils/formatters.js';
import { t } from '../../utils/strings.js';
import { esc } from './esc.js';

export default {
  id: 'weeklyGoal',
  label: 'Weekly goal',
  defaultSize: '1x1',
  defaultVisible: true,
  category: 'stats',
  /** @param {unknown} ctx */
  render: async (ctx) => {
    const c = /** @type {{ data?: { weeklyProjection?: number; localeCountry?: string; currency?: string } }} */ (ctx);
    const v = Number(c?.data?.weeklyProjection) || 0;
    const country = String(c?.data?.localeCountry || 'US');
    const currency = String(c?.data?.currency || 'USD');
    return `<p>${esc(t('analytics.projection'))}</p><strong>${esc(formatCurrency(v, country, { currency }))}</strong>`;
  },
  afterRender: (_el, _ctx) => {},
  destroy: (_el) => {},
};

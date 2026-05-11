import { formatLargeNumber } from '../../utils/formatters.js';
import { t } from '../../utils/strings.js';
import { esc } from './esc.js';

export default {
  id: 'streak',
  label: 'Streak',
  defaultSize: '1x1',
  defaultVisible: false,
  category: 'stats',
  /** @param {unknown} ctx */
  render: async (ctx) => {
    const c = /** @type {{ data?: { streakCount?: number } } }} */ (ctx);
    const n = Number(c?.data?.streakCount) || 0;
    return `<p>${esc(t('analytics.streak'))}</p><strong>${esc(formatLargeNumber(n))}</strong>`;
  },
  afterRender: (_el, _ctx) => {},
  destroy: (_el) => {},
};

import { esc } from './esc.js';

export default {
  id: 'recentShifts',
  label: 'Recent shifts',
  defaultSize: '1x1',
  defaultVisible: false,
  category: 'misc',
  /** @param {unknown} _ctx */
  render: async (_ctx) => `<p>${esc('Recent shifts')}</p><strong class="text-secondary">—</strong>`,
  afterRender: (_el, _ctx) => {},
  destroy: (_el) => {},
};

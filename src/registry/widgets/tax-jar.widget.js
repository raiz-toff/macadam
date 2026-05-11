import { esc } from './esc.js';

export default {
  id: 'taxJar',
  label: 'Tax & mileage',
  defaultSize: '1x1',
  defaultVisible: false,
  category: 'misc',
  /** @param {unknown} _ctx */
  render: async (_ctx) => `<p>${esc('Tax & mileage')}</p><strong class="text-secondary">—</strong>`,
  afterRender: (_el, _ctx) => {},
  destroy: (_el) => {},
};

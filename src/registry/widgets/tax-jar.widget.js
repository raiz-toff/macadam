import { esc } from './esc.js';

export default {
  id: 'taxJar',
  label: 'Tax',
  defaultSize: '1x1',
  defaultVisible: false,
  category: 'misc',
  /** @param {unknown} _ctx */
  render: async (_ctx) => `<p>${esc('Tax')}</p><strong class="text-secondary">—</strong>`,
  afterRender: (_el, _ctx) => {},
  destroy: (_el) => {},
};

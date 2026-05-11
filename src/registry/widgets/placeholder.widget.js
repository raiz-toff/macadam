export default {
  id: 'placeholder',
  label: 'Placeholder',
  defaultSize: '1x1',
  defaultVisible: false,
  category: 'misc',
  /** @param {unknown} _ctx */
  render: async (_ctx) => '<div class="widget-card" data-registry-widget="placeholder"></div>',
  /** @param {HTMLElement} _el @param {unknown} _ctx */
  afterRender: (_el, _ctx) => {
    void _el;
    void _ctx;
  },
  /** @param {HTMLElement} _el */
  destroy: (_el) => {
    void _el;
  },
};

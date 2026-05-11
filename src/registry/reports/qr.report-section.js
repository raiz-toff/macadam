export default {
  id: 'qr',
  label: 'Weekly QR',
  defaultIncluded: true,
  renderHTML: async () =>
    '<p style="color:var(--color-text-secondary);">QR block is rendered in the QR panel when enabled.</p>',
  renderText: () => '',
  renderCSV: () => [],
};

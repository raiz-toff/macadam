import { renderViewPlaceholder } from './view-utils.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  const bits = [ctx.hash, ctx.analyticsPeriod === 'week' ? 'period=week' : ''].filter(Boolean);
  renderViewPlaceholder(root, 'views.analytics.title', 'views.analytics.placeholderBody', bits.join(' · '));
}

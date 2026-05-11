import { renderViewPlaceholder } from './view-utils.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  renderViewPlaceholder(root, 'views.vehicles.title', 'views.vehicles.placeholderBody', String(ctx.hash || ''));
}

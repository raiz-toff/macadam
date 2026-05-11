import { renderViewPlaceholder } from './view-utils.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  renderViewPlaceholder(root, 'views.schedule.title', 'views.schedule.placeholderBody', String(ctx.hash || ''));
}

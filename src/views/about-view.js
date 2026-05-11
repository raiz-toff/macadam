import { renderViewPlaceholder } from './view-utils.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  renderViewPlaceholder(root, 'views.about.title', 'views.about.placeholderBody', String(ctx.hash || ''));
}

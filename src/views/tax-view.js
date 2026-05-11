import { renderTaxDashboard } from '../modules/tax/tax.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  return renderTaxDashboard(root, ctx);
}

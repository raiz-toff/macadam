import { renderExpensesView } from '../modules/expenses/expenses.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  void ctx;
  return renderExpensesView(root);
}

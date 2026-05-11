export default {
  id: 'shift_gross',
  label: 'Gross',
  shortLabel: 'Gross',
  format: 'currency',
  showInAnalytics: false,
  showOnShiftCard: true,
  shiftCardOrder: 1,
  messageKey: 'shifts.gross',
  /** @param {unknown} shift @param {unknown} [_vehicle] */
  calcPerShift: (shift, _vehicle) => {
    const s = /** @type {{ gross?: unknown; grossEarnings?: unknown }} */ (shift);
    const n = Number(s?.gross ?? s?.grossEarnings ?? 0);
    return Number.isFinite(n) ? n : 0;
  },
};

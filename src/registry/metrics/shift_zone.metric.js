export default {
  id: 'shift_zone',
  label: 'Zone',
  shortLabel: 'Zn',
  format: 'text',
  showInAnalytics: false,
  showOnShiftCard: true,
  shiftCardOrder: 4,
  messageKey: 'shifts.zone',
  /** @param {unknown} shift @param {unknown} [_vehicle] */
  calcPerShift: (shift, _vehicle) => {
    const z = /** @type {{ zoneTag?: unknown }} */ (shift)?.zoneTag;
    return typeof z === 'string' && z.trim() ? z.trim() : '';
  },
};

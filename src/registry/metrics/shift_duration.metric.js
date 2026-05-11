function durationMinutes(shift) {
  const s = /** @type {Record<string, unknown>} */ (shift);
  if (Number.isFinite(Number(s.activeMinutes)) && Number(s.activeMinutes) > 0) return Number(s.activeMinutes);
  if (typeof s.date === 'string' && typeof s.startTime === 'string' && typeof s.endTime === 'string') {
    const start = new Date(`${s.date}T${s.startTime}:00`);
    const end = new Date(`${s.date}T${s.endTime}:00`);
    const ms = end.getTime() - start.getTime();
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000);
  }
  return Number(s.durationMinutes) || Number(s.onlineMinutes) || 0;
}

export default {
  id: 'shift_duration',
  label: 'Duration',
  shortLabel: 'Time',
  format: 'duration',
  showInAnalytics: false,
  showOnShiftCard: true,
  shiftCardOrder: 3,
  messageKey: 'shifts.duration',
  /** @param {unknown} shift @param {unknown} [_vehicle] */
  calcPerShift: (shift, _vehicle) => durationMinutes(shift),
};

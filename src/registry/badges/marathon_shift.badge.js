/** @param {unknown} _s */
function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default {
  id: 'marathon_shift',
  name: "Marathon",
  description: "Work a single shift over 8 hours.",
  icon: "⏱️",
  category: 'milestone',
  condition: () => false,
  checkFromShift: async (ctx) => {
    const shift = ctx.shift;
    const gross = num(shift?.gross ?? shift?.grossEarnings, 0);
    return ((s) => num(s.shift.activeMinutes ?? s.shift.durationMinutes, 0) >= 8 * 60)({ shift, gross, weekGross: ctx.weekGross, monthGross: ctx.monthGross });
  },
};

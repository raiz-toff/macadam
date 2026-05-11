import {
  NOTIFICATION_IDS,
  createNotification,
  num,
} from '../../modules/notifications/notification-internal.js';

export default {
  id: NOTIFICATION_IDS.personalBest,
  type: 'celebration',
  cooldown: '7d',
  message: () => '',
  priority: 12,
  userToggleable: true,
  condition: async () => false,
  /**
   * @param {{
   *   allShifts: Array<Record<string, unknown>>;
   *   weekShifts: Array<Record<string, unknown>>;
   * }} ctx
   */
  evaluate: async (ctx) => {
    const { allShifts, weekShifts } = ctx;
    if (allShifts.length < 2 || weekShifts.length === 0) return;
    const sorted = [...allShifts]
      .filter((s) => s.deletedAt == null)
      .sort(
        (a, b) =>
          new Date(String(b.createdAt || b.updatedAt || '')).getTime() -
          new Date(String(a.createdAt || a.updatedAt || '')).getTime(),
      );
    const latest = sorted[0];
    if (!latest) return;
    const latestGross = num(latest.gross ?? latest.grossEarnings);
    const historicMax = allShifts.reduce((max, s) => Math.max(max, num(s.gross ?? s.grossEarnings)), 0);
    if (latestGross > 0 && latestGross >= historicMax) {
      await createNotification(
        NOTIFICATION_IDS.personalBest,
        'New personal best',
        `New single-shift high: ${latestGross.toFixed(2)}. Keep this playbook for future sessions.`,
        { scope: 'week', tone: 'celebration' },
      );
    }
  },
};

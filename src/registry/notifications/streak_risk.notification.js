import {
  NOTIFICATION_IDS,
  createNotification,
  getAppState,
  num,
} from '../../modules/notifications/notification-internal.js';

export default {
  id: NOTIFICATION_IDS.streakRisk,
  type: 'toast',
  cooldown: '1d',
  message: () => '',
  priority: 30,
  userToggleable: true,
  condition: async () => false,
  /** @param {{ todayShifts: Array<Record<string, unknown>> }} ctx */
  evaluate: async (ctx) => {
    const streakCount = Math.max(0, num(await getAppState('streak_count')));
    if (streakCount > 0 && ctx.todayShifts.length === 0) {
      await createNotification(
        NOTIFICATION_IDS.streakRisk,
        'Streak at risk',
        `You are on a ${streakCount}-day streak. Logging even one short shift today keeps it alive.`,
        { scope: 'day', tone: 'warning' },
      );
    }
  },
};

import {
  NOTIFICATION_IDS,
  createNotification,
  num,
  sumGross,
  weekBounds,
  ymd,
  getWeeklyGoal,
} from '../../modules/notifications/notification-internal.js';
import { db } from '../../core/db.js';

export default {
  id: NOTIFICATION_IDS.weeklyGoalMiss,
  type: 'toast',
  cooldown: '7d',
  message: () => '',
  priority: 18,
  userToggleable: true,
  condition: async () => false,
  /** @param {{ user: Record<string, unknown>; now: Date; weekShifts: Array<Record<string, unknown>> }} ctx */
  evaluate: async (ctx) => {
    const user = ctx.user;
    const now = ctx.now;
    const weekStartDay = Math.max(0, Math.min(6, num(user?.locale?.weekStartDay, 0)));
    const week = weekBounds(now, weekStartDay);
    const goal = await getWeeklyGoal(user, ymd(week.start), ymd(week.end));
    if (goal <= 0) return;
    if (now.getDay() !== weekStartDay + 1) return;
    const prevStart = new Date(week.start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(week.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevRows = await db.shifts
      .filter((s) => s.deletedAt == null && s.date >= ymd(prevStart) && s.date <= ymd(prevEnd))
      .toArray();
    const prevGross = sumGross(prevRows);
    if (prevRows.length > 0 && prevGross < goal) {
      await createNotification(
        NOTIFICATION_IDS.weeklyGoalMiss,
        'Last week reflection',
        `Last week finished at ${((prevGross / goal) * 100).toFixed(0)}% of goal. You can reset and build this week.`,
        {
          scope: 'week',
          tone: 'info',
          dedupeKey: `notif:${NOTIFICATION_IDS.weeklyGoalMiss}:week:${ymd(prevStart)}`,
        },
      );
    }
  },
};

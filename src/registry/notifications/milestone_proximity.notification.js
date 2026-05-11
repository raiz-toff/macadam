import {
  NOTIFICATION_IDS,
  createNotification,
  sumGross,
} from '../../modules/notifications/notification-internal.js';

export default {
  id: NOTIFICATION_IDS.milestoneProximity,
  type: 'toast',
  cooldown: '7d',
  message: () => '',
  priority: 21,
  userToggleable: true,
  condition: async () => false,
  /** @param {{ allShifts: Array<Record<string, unknown>> }} ctx */
  evaluate: async (ctx) => {
    const lifetimeGross = sumGross(ctx.allShifts);
    const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
    const nextMilestone = milestones.find((m) => lifetimeGross < m);
    if (nextMilestone != null) {
      const gap = nextMilestone - lifetimeGross;
      if (gap > 0 && gap <= nextMilestone * 0.1) {
        await createNotification(
          NOTIFICATION_IDS.milestoneProximity,
          'Milestone nearby',
          `You are ${gap.toFixed(0)} away from ${nextMilestone.toLocaleString()} lifetime gross.`,
          { scope: 'week', tone: 'info' },
        );
      }
    }
  },
};

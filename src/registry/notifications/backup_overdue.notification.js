import {
  NOTIFICATION_IDS,
  createNotification,
  daysBetween,
  getAppState,
} from '../../modules/notifications/notification-internal.js';

export default {
  id: NOTIFICATION_IDS.backupOverdue,
  type: 'toast',
  cooldown: '7d',
  message: () => '',
  priority: 28,
  userToggleable: true,
  condition: async () => false,
  evaluate: async () => {
    const lastBackup = await getAppState('last_backup');
    if (typeof lastBackup === 'string' && lastBackup) {
      const d = new Date(lastBackup);
      if (!Number.isNaN(d.getTime()) && daysBetween(d, new Date()) >= 14) {
        await createNotification(
          NOTIFICATION_IDS.backupOverdue,
          'Backup recommended',
          'Your last backup is over 14 days old. A fresh export keeps your data safe.',
          { scope: 'week', tone: 'warning' },
        );
      }
    }
  },
};

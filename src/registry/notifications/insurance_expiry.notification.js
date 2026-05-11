import {
  NOTIFICATION_IDS,
  createNotification,
  daysBetween,
  nowIso,
} from '../../modules/notifications/notification-internal.js';
import { db } from '../../core/db.js';

export default {
  id: NOTIFICATION_IDS.insuranceExpiry,
  type: 'toast',
  cooldown: '7d',
  message: () => '',
  priority: 26,
  userToggleable: true,
  condition: async () => false,
  evaluate: async () => {
    const expenses = await db.expenses.filter((e) => e.deletedAt == null).toArray();
    const now = new Date();
    const insuranceRows = expenses.filter((e) => String(e.category || '') === 'insurance');
    if (insuranceRows.length === 0) return;
    const lastInsurance = insuranceRows
      .map((e) => new Date(String(e.date || e.createdAt || nowIso())))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (lastInsurance && daysBetween(lastInsurance, now) >= 330) {
      await createNotification(
        NOTIFICATION_IDS.insuranceExpiry,
        'Insurance renewal reminder',
        'Insurance appears to be nearing renewal based on your last logged insurance expense.',
        { scope: 'week', tone: 'warning' },
      );
    }
  },
};

/**
 * Notification type registry (Category B).
 * @see feature_modularity.md
 */

import backupOverdue from './backup_overdue.notification.js';
import crossPlatformArbitrage from './cross_platform_arbitrage.notification.js';
import dailySummary from './daily_summary.notification.js';
import highExpense from './high_expense.notification.js';
import insuranceExpiry from './insurance_expiry.notification.js';
import lowHourlyRate from './low_hourly_rate.notification.js';
import maintenanceDue from './maintenance_due.notification.js';
import milestoneProximity from './milestone_proximity.notification.js';
import midWeekGoal from './mid_week_goal.notification.js';
import personalBest from './personal_best.notification.js';
import placeholder from './placeholder.notification.js';
import streakRisk from './streak_risk.notification.js';
import taxInstallmentDue from './tax_installment_due.notification.js';
import weeklyGoalHit from './weekly_goal_hit.notification.js';
import weeklyGoalMiss from './weekly_goal_miss.notification.js';

/** @typedef {typeof placeholder} NotificationDefinition */

const TYPES = new Set(['toast', 'card', 'celebration']);

/** @type {NotificationDefinition[]} */
const NOTIFICATIONS = [
  dailySummary,
  weeklyGoalHit,
  midWeekGoal,
  weeklyGoalMiss,
  personalBest,
  maintenanceDue,
  insuranceExpiry,
  taxInstallmentDue,
  streakRisk,
  backupOverdue,
  lowHourlyRate,
  highExpense,
  milestoneProximity,
  crossPlatformArbitrage,
  placeholder,
];

/** @type {Map<string, NotificationDefinition>} */
const byId = new Map(NOTIFICATIONS.map((n) => [n.id, n]));

/**
 * @param {NotificationDefinition} def
 * @returns {boolean}
 */
function validateNotificationDefinition(def) {
  const required = ['id', 'type', 'cooldown', 'message', 'priority'];
  const missing = required.filter((k) => def[k] == null);
  if (missing.length) throw new Error(`Notification definition missing: ${missing.join(', ')}`);
  if (!TYPES.has(def.type)) throw new Error(`Notification ${def.id} has invalid type`);
  if (typeof def.evaluate !== 'function' && typeof def.condition !== 'function') {
    throw new Error(`Notification ${def.id} needs evaluate or condition`);
  }
  const msg = def.message;
  if (typeof msg !== 'function' && typeof msg !== 'string') throw new Error(`Notification ${def.id} missing message`);
  return true;
}

export const NotificationRegistry = {
  /** @returns {readonly NotificationDefinition[]} */
  getAll: () => NOTIFICATIONS,

  /**
   * @param {string | null | undefined} id
   * @returns {NotificationDefinition | undefined}
   */
  getById: (id) => {
    const key = String(id || '').toLowerCase();
    return byId.get(key);
  },

  /** @param {NotificationDefinition} def */
  validate: (def) => validateNotificationDefinition(def),
};

export function assertNotificationRegistryValid() {
  for (const n of NOTIFICATIONS) validateNotificationDefinition(n);
}

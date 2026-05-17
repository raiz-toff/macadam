/**
 * P8 — Notifications System.
 * On app-open checks with persistence in `notifications` table.
 * Per-type checks iterate NotificationRegistry.
 */

import { db, getUser } from '../../core/db.js';
import { isUserVaultActive } from '../../core/vault-gate.js';
import { store } from '../../core/store.js';
import { bus } from '../../core/events.js';
import { getDemoAnalyticsAnchorDate } from '../demo/sample-year.js';
import { NotificationRegistry } from '../../registry/notifications/index.js';
import {
  NOTIFICATION_IDS,
  num,
  nowIso,
  weekBounds,
  ymd,
} from './notification-internal.js';

export { NOTIFICATION_IDS as NOTIFICATION_TYPES } from './notification-internal.js';
export { createNotification, getPrefForType, normalizeTypePref } from './notification-internal.js';

/**
 * Full P8 notification sweep, intended for app-open.
 * @returns {Promise<void>}
 */
export async function checkAllNotifications() {
  const user = await getUser();
  if (!user || !isUserVaultActive(user)) return;
  const now = store.get('demoMode') ? getDemoAnalyticsAnchorDate() : new Date();
  const today = ymd(now);
  const weekStartDay = Math.max(0, Math.min(6, num(user?.locale?.weekStartDay, 0)));
  const week = weekBounds(now, weekStartDay);
  const weekStart = ymd(week.start);
  const weekEnd = ymd(week.end);

  const [allShifts, todayShifts, weekShifts, weekExpenses] = await Promise.all([
    db.shifts.filter((s) => s.deletedAt == null).toArray(),
    db.shifts.filter((s) => s.deletedAt == null && s.date === today).toArray(),
    db.shifts.filter((s) => s.deletedAt == null && s.date >= weekStart && s.date <= weekEnd).toArray(),
    db.expenses.filter((e) => e.deletedAt == null && e.date >= weekStart && e.date <= weekEnd).toArray(),
  ]);

  const ctx = {
    user,
    now,
    today,
    weekStartDay,
    week,
    weekStart,
    weekEnd,
    allShifts,
    todayShifts,
    weekShifts,
    weekExpenses,
  };

  const defs = [...NotificationRegistry.getAll()].sort((a, b) => num(a.priority, 99) - num(b.priority, 99));
  for (const def of defs) {
    if (def.id === 'placeholder' || typeof def.evaluate !== 'function') continue;
    await def.evaluate(ctx);
  }
}

/** @returns {Promise<void>} */
export async function runOnOpenNotificationCheck() {
  await checkAllNotifications();
}

/**
 * Mark a notification as read (Feature: read tracking).
 * @param {string} id
 */
export async function markNotificationRead(id) {
  if (!id) return;
  await db.notifications.update(id, { read: true, readAt: nowIso() });
  bus.emit('notification:unread-change');
}

/**
 * Mark a notification as dismissed (Feature: dismiss tracking).
 * @param {string} id
 */
export async function dismissNotification(id) {
  if (!id) return;
  await db.notifications.update(id, { dismissed: true, dismissedAt: nowIso(), read: true });
  bus.emit('notification:unread-change');
}

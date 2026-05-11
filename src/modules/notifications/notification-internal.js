/**
 * Shared notification helpers + persistence (used by registry defs and notifications.js).
 * Kept separate from notifications.js to avoid import cycles with registry/*.notification.js.
 */

import { db, getAppState, getUser } from '../../core/db.js';
import { isUserVaultActive } from '../../core/vault-gate.js';
import { showNotifyCard } from '../../ui/components.js';
import { getNextTaxDeadline } from '../../utils/locale.js';
import { getCountryTaxProfile } from '../../registry/countries/index.js';

export const NOTIFICATION_IDS = Object.freeze({
  dailySummary: 'daily_summary',
  midWeekGoal: 'mid_week_goal',
  weeklyGoalHit: 'weekly_goal_hit',
  weeklyGoalMiss: 'weekly_goal_miss',
  personalBest: 'personal_best',
  maintenanceDue: 'maintenance_due',
  insuranceExpiry: 'insurance_expiry',
  taxInstallment: 'tax_installment_due',
  streakRisk: 'streak_risk',
  backupOverdue: 'backup_overdue',
  lowHourlyRate: 'low_hourly_rate',
  highExpense: 'high_expense',
  milestoneProximity: 'milestone_proximity',
  crossPlatformArbitrage: 'cross_platform_arbitrage',
});

const DEFAULT_NOTIFICATION_SETTINGS = Object.freeze({
  frequency: 'immediate',
  enabled: true,
});

export function nowIso() {
  return new Date().toISOString();
}

export function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysBetween(a, b) {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime();
  return Math.floor(ms / 86400000);
}

/**
 * @param {Date} date
 * @param {number} weekStartDay
 */
export function weekBounds(date, weekStartDay) {
  const base = startOfDay(date);
  const dow = base.getDay();
  const diff = (dow - weekStartDay + 7) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

/**
 * @param {string} type
 * @param {Date} date
 * @param {'day'|'week'|'ever'} scope
 */
export function makeNotificationId(type, date, scope = 'day') {
  if (scope === 'ever') return `notif:${type}:ever`;
  if (scope === 'week') {
    const wk = weekBounds(date, 1);
    return `notif:${type}:week:${ymd(wk.start)}`;
  }
  return `notif:${type}:day:${ymd(date)}`;
}

/**
 * @param {unknown} raw
 * @returns {{ enabled: boolean, frequency: 'off'|'immediate'|'daily'|'weekly' }}
 */
export function normalizeTypePref(raw) {
  if (raw === false) return { enabled: false, frequency: 'off' };
  if (raw === true || raw == null) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  if (typeof raw !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  const obj = /** @type {{ enabled?: unknown, frequency?: unknown }} */ (raw);
  const enabled = obj.enabled == null ? true : Boolean(obj.enabled);
  const freqRaw = String(obj.frequency || 'immediate').toLowerCase();
  const frequency =
    freqRaw === 'off' || freqRaw === 'daily' || freqRaw === 'weekly'
      ? freqRaw
      : 'immediate';
  return { enabled, frequency };
}

/**
 * @param {Record<string, unknown> | null | undefined} prefs
 * @param {string} type
 */
export function getPrefForType(prefs, type) {
  if (!prefs || typeof prefs !== 'object') return { ...DEFAULT_NOTIFICATION_SETTINGS };
  return normalizeTypePref(prefs[type]);
}

/**
 * @param {string} type
 * @param {string} title
 * @param {string} message
 * @param {{ tone?: 'info'|'warning'|'success'|'celebration', scope?: 'day'|'week'|'ever', dedupeKey?: string }} [opts]
 */
export async function createNotification(type, title, message, opts = {}) {
  const user = await getUser();
  if (!isUserVaultActive(user)) return false;
  const pref = getPrefForType(user?.notificationPrefs, type);
  if (!pref.enabled || pref.frequency === 'off') return false;

  const createdAt = nowIso();
  const now = new Date(createdAt);
  const id = opts.dedupeKey || makeNotificationId(type, now, opts.scope || 'day');
  const existing = await db.notifications.get(id);
  if (existing) return false;

  await db.notifications.put({
    id,
    type,
    title,
    message,
    read: false,
    dismissed: false,
    createdAt,
    shownAt: null,
  });

  showNotifyCard({
    title,
    message,
    type: opts.tone || 'info',
    duration: 7000,
  });

  await db.notifications.update(id, {
    shownAt: nowIso(),
  });
  return true;
}

/**
 * @param {unknown} user
 * @param {string} weekStart
 * @param {string} weekEnd
 */
export async function getWeeklyGoal(user, weekStart, weekEnd) {
  const activeGoal = await db.goals
    .filter((g) => g.active === true && g.scope === 'weekly' && g.type === 'earnings')
    .first();
  if (activeGoal && num(activeGoal.target) > 0) return num(activeGoal.target);
  const platformTargets = await db.platforms.filter((p) => p.active === true).toArray();
  const platformSum = platformTargets.reduce((sum, p) => sum + Math.max(0, num(p.weeklyGoal)), 0);
  if (platformSum > 0) return platformSum;
  const fallback = num(user?.weeklyGoal);
  if (fallback > 0) return fallback;

  const history = await db.shifts
    .filter((s) => s.deletedAt == null && String(s.date) >= weekStart && String(s.date) <= weekEnd)
    .toArray();
  return history.reduce((sum, s) => sum + Math.max(0, num(s.gross)), 0);
}

/**
 * @param {Array<Record<string, unknown>>} shifts
 */
export function sumGross(shifts) {
  return shifts.reduce((sum, s) => sum + Math.max(0, num(s.gross ?? s.grossEarnings)), 0);
}

/**
 * @param {Array<Record<string, unknown>>} shifts
 */
export function sumActiveMinutes(shifts) {
  return shifts.reduce((sum, s) => {
    const active = num(s.activeMinutes);
    if (active > 0) return sum + active;
    const online = num(s.onlineMinutes);
    if (online > 0) return sum + online;
    return sum;
  }, 0);
}

export { getAppState, getCountryTaxProfile, getNextTaxDeadline };

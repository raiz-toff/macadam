/**
 * Macadam IndexedDB layer (Dexie). Single source of truth: export `db`.
 * Database: MacadamVault · Dexie schema v1 (+ v2 hook pattern for future IDB upgrades).
 */

import Dexie from '../libs/dexie.min.js';

/** Logical data schema version (appState.schema_version). Non-destructive migrations only. */
export const CURRENT_LOGICAL_SCHEMA_VERSION = 1;

const DB_NAME = 'MacadamVault';

/** IndexedDB object store definitions — must match plan F4 exactly. */
const STORES_V1 = {
  users: 'id',
  platforms: '&id, active',
  shifts: '++id, date, platformId, vehicleId, zoneTag, deletedAt',
  expenses: '++id, date, category, platformId, deletedAt',
  vehicles: '++id, active',
  vehicleMaintenanceLogs: '++id, vehicleId, date',
  fuelPrices: '++id, vehicleId, date',
  goals: '++id, scope, active',
  goalHistory: '++id, goalId, periodStart',
  badges: '&id',
  xpLog: '++id, createdAt',
  challenges: '&id, active',
  notifications: '&id, read, createdAt',
  backupLog: '++id, createdAt',
  appState: '&key, updatedAt',
};

const SOFT_DELETE_TABLES = new Set(['shifts', 'expenses']);

function nowIso() {
  return new Date().toISOString();
}

export const DEFAULT_USER = {
  id: 1,
  displayName: '',
  avatarType: 'initials',
  avatarData: null,
  platforms: [],
  primaryPlatform: null,
  locale: {
    country: null,
    currency: 'USD',
    currencySymbol: '$',
    distanceUnit: 'km',
    dateFormat: 'YYYY-MM-DD',
    weekStartDay: 0,
    timeFormat: '12h',
  },
  vehicleDefaults: {},
  weeklyGoal: 0,
  monthlyGoal: 0,
  annualGoal: 0,
  taxWithholdingPct: 0,
  hstRegistered: false,
  workSchedule: {},
  homeBase: { label: '' },
  notificationPrefs: {},
  theme: 'auto',
  accentColor: null,
  fontSize: 'medium',
  layoutDensity: 'comfortable',
  dashboardWidgets: [],
  heroStats: [],
  onboardingComplete: false,
  onboardingStep: 0,
  createdAt: null,
  updatedAt: null,
};

/** Keys documented in plan F4 appState table (values JSON-serialized). */
export const APP_STATE_KEY_DEFAULTS = {
  schema_version: null,
  last_backup: null,
  active_shift_start: null,
  onboarding_session: null,
  dismissed_banners: null,
  streak_last_day: null,
  streak_count: null,
  streak_frozen_count: null,
  xp_total: null,
  xp_level: null,
  personal_records: null,
  demo_mode: null,
  install_prompt_shown: null,
};

/**
 * Feature 139 — badge definitions (locked until unlock logic runs in P5).
 * Slugs are stable API surface for goals/badge modules.
 */
export const DEFAULT_BADGE_DEFINITIONS = [
  ['first_shift', 'First Shift', 'Log your first shift.', '🚗'],
  ['century_day', 'Century Day', 'Earn $100+ in a single day.', '💯'],
  ['five_hundred_week', 'Power Week', 'Earn $500+ in one week.', '💵'],
  ['thousand_month', 'Thousand Club', 'Earn $1,000+ in a month.', '🏆'],
  ['early_bird', 'Early Bird', 'Complete a shift starting before 7am.', '🌅'],
  ['night_owl', 'Night Owl', 'Complete a shift ending after midnight.', '🦉'],
  ['marathon_shift', 'Marathon', 'Work a single shift over 8 hours.', '⏱️'],
  ['multi_app_master', 'Multi-App', 'Log a multi-app shift.', '📱'],
  ['tip_champion', 'Tip Champion', 'Tip rate above 25% on a shift.', '💜'],
  ['bonus_hunter', 'Bonus Hunter', 'Bonus earnings over 15% of gross on a shift.', '🎯'],
  ['goal_week_hit', 'Weekly Goal', 'Hit your weekly earnings goal.', '✅'],
  ['goal_month_hit', 'Monthly Goal', 'Hit your monthly earnings goal.', '📅'],
  ['streak_7', '7-Day Streak', 'Work 7 days in a row.', '🔥'],
  ['streak_30', '30-Day Streak', 'Work 30 days in a row.', '🔥'],
  ['streak_100', 'Century Streak', '100-day work streak.', '🌋'],
  ['expense_savvy', 'Expense Savvy', 'Log 10 expenses.', '🧾'],
  ['vehicle_caretaker', 'Vehicle Care', 'Add a maintenance log entry.', '🔧'],
  ['data_archivist', 'Data Archivist', 'Export a backup.', '📦'],
  ['personal_best_earnings', 'Personal Best', 'Beat your best single-shift gross.', '📈'],
  ['personal_best_hours', 'Hour Hero', 'Beat your best net hourly rate.', '⚡'],
  ['weekend_warrior', 'Weekend Warrior', '10+ weekend shifts logged.', '🎉'],
  ['rain_rider', 'Rain Rider', 'Log shifts in tagged bad weather.', '🌧️'],
  ['peak_collector', 'Peak Pay', 'Log platform peak/surge bonus fields.', '📊'],
  ['perfect_week', 'Perfect Week', 'Hit goal every day of the week.', '⭐'],
];

const DEFAULT_PLATFORMS = [
  {
    id: 'doordash',
    name: 'DoorDash',
    color: '#FF3008',
    terminology: { driver: 'Dasher', delivery: 'Delivery', bonus: 'Peak Pay', surge: 'Peak Pay' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 1,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'ubereats',
    name: 'Uber Eats',
    color: '#06C167',
    terminology: { driver: 'Courier', delivery: 'Delivery', bonus: 'Quest', surge: 'Surge' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 2,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'foodora',
    name: 'Foodora',
    color: '#E21B70',
    terminology: { driver: 'Rider', delivery: 'Delivery', bonus: 'Bonus', surge: 'Busy pay' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 3,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'skip',
    name: 'SkipTheDishes',
    color: '#ED5A1F',
    terminology: { driver: 'Courier', delivery: 'Delivery', bonus: 'Promo', surge: 'Busy fee' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 4,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'instacart',
    name: 'Instacart',
    color: '#0AAD0A',
    terminology: { driver: 'Shopper', delivery: 'Batch', bonus: 'Boost', surge: 'Peak' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 5,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'amazonflex',
    name: 'Amazon Flex',
    color: '#232F3E',
    terminology: { driver: 'Flex driver', delivery: 'Block', bonus: 'Incentive', surge: 'Surge' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 6,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
  {
    id: 'other',
    name: 'Other',
    color: '#6B7280',
    terminology: { driver: 'Driver', delivery: 'Delivery', bonus: 'Bonus', surge: 'Surge' },
    weeklyGoal: 0,
    monthlyGoal: 0,
    taxRatePct: 0,
    notes: '',
    priority: 99,
    active: false,
    addedAt: null,
    deactivatedAt: null,
    platformSpecific: {},
  },
];

class MacadamDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores(STORES_V1);
    this.version(2)
      .stores(STORES_V1)
      .upgrade((tx) => {
        void tx;
        // Future IDB-level migrations: pure transforms, never silent wipes.
      });
  }
}

export const db = new MacadamDatabase();

/**
 * logicalMigrations[n] runs when upgrading appState `schema_version` from n → n+1.
 * Keep length ≥ CURRENT_LOGICAL_SCHEMA_VERSION; add async steps when bumping version.
 * @type {((() => void) | (() => Promise<void>))[]}
 */
const logicalMigrations = [
  async () => {
    // 0 → 1: placeholder (no destructive transforms).
  },
];

async function runLogicalMigrations() {
  let stored = await getAppState('schema_version');
  let from = stored == null ? 0 : Number(stored);
  if (Number.isNaN(from)) from = 0;
  while (from < CURRENT_LOGICAL_SCHEMA_VERSION) {
    const step = logicalMigrations[from];
    if (typeof step === 'function') await step();
    from += 1;
    await setAppState('schema_version', from);
  }
}

async function seedFirstRun() {
  const t = nowIso();
  const existing = await db.users.get(1);
  if (existing) return;

  await db.transaction('rw', db.tables.map((tbl) => tbl.name), async () => {
    await db.users.put({
      ...DEFAULT_USER,
      createdAt: t,
      updatedAt: t,
    });

    const platformRows = DEFAULT_PLATFORMS.map((p) => ({
      ...p,
      addedAt: p.addedAt ?? t,
    }));
    await db.platforms.bulkPut(platformRows);

    const badgeRows = DEFAULT_BADGE_DEFINITIONS.map(([id, name, description, icon]) => ({
      id,
      name,
      description,
      icon,
      unlockedAt: null,
      notified: false,
    }));
    await db.badges.bulkPut(badgeRows);

    await putMissingAppStateDefaults(t);

    await db.goals.add({
      type: 'earnings',
      scope: 'weekly',
      platformId: null,
      target: 0,
      active: false,
      createdAt: t,
    });
  });
}

/** Insert missing appState rows from APP_STATE_KEY_DEFAULTS (non-destructive). */
async function putMissingAppStateDefaults(updatedAt) {
  for (const [key, defaultVal] of Object.entries(APP_STATE_KEY_DEFAULTS)) {
    if (key === 'schema_version') continue;
    const row = await db.appState.get(key);
    if (!row) {
      await db.appState.put({
        key,
        value: JSON.stringify(defaultVal),
        updatedAt,
      });
    }
  }
}

/**
 * Open database, run logical migrations, seed first-run catalog rows.
 * Call once at app startup (before router/store).
 */
export async function initDatabase() {
  await db.open();
  await runLogicalMigrations();
  await seedFirstRun();
  await putMissingAppStateDefaults(nowIso());
}

export async function getUser() {
  return db.users.get(1);
}

export async function saveUser(patch) {
  const prev = (await db.users.get(1)) || { ...DEFAULT_USER };
  const t = nowIso();
  const next = {
    ...prev,
    ...patch,
    id: 1,
    updatedAt: t,
    createdAt: prev.createdAt || t,
  };
  await db.users.put(next);
  return next;
}

export async function getAppState(key) {
  const row = await db.appState.get(key);
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export async function setAppState(key, value) {
  const t = nowIso();
  await db.appState.put({
    key,
    value: JSON.stringify(value === undefined ? null : value),
    updatedAt: t,
  });
}

export async function softDelete(table, id) {
  if (!SOFT_DELETE_TABLES.has(table)) {
    throw new Error(`softDelete: unsupported table "${table}"`);
  }
  const ts = nowIso();
  await db[table].update(id, { deletedAt: ts, updatedAt: ts });
}

export async function restoreDeleted(table, id) {
  if (!SOFT_DELETE_TABLES.has(table)) {
    throw new Error(`restoreDeleted: unsupported table "${table}"`);
  }
  const ts = nowIso();
  await db[table].update(id, { deletedAt: null, updatedAt: ts });
}

export async function purgeOldDeleted(table, days = 30) {
  if (!SOFT_DELETE_TABLES.has(table)) {
    throw new Error(`purgeOldDeleted: unsupported table "${table}"`);
  }
  const cutoffMs = Date.now() - days * 86400000;
  await db[table]
    .filter((row) => {
      if (row.deletedAt == null) return false;
      const ts = new Date(row.deletedAt).getTime();
      return !Number.isNaN(ts) && ts < cutoffMs;
    })
    .delete();
}

export async function getActiveShifts() {
  return db.shifts.filter((s) => s.deletedAt == null).toArray();
}

export async function getActiveExpenses() {
  return db.expenses.filter((e) => e.deletedAt == null).toArray();
}

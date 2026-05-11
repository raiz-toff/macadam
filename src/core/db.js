/**
 * Macadam IndexedDB layer (Dexie). Single source of truth: export `db`.
 * Database: MacadamVault · Dexie schema v1 (+ v2 hook pattern for future IDB upgrades).
 */

import Dexie from '../libs/dexie.min.js';
import { BadgeRegistry } from '../registry/badges/index.js';
import { PlatformRegistry } from '../registry/platforms/index.js';

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
  /** @type {'tabs'|'dropdown'} */
  platformSwitcherMode: 'tabs',
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

/** Dexie seed rows for `platforms` — derived from catalog (Registry_arch / Category A). */
const DEFAULT_PLATFORMS = PlatformRegistry.getAll().map((def, idx) => ({
  id: def.id,
  name: def.name,
  color: def.color,
  terminology: { ...(def.terminology || {}) },
  weeklyGoal: 0,
  monthlyGoal: 0,
  taxRatePct: 0,
  notes: '',
  priority: def.id === 'other' ? 99 : idx + 1,
  active: false,
  addedAt: null,
  deactivatedAt: null,
  platformSpecific: {},
}));

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

    const badgeRows = BadgeRegistry.getAll()
      .filter((b) => b.id !== 'placeholder')
      .map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
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

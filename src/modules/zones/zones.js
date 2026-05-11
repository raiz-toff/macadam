/**
 * P12 — Zone management dashboard (Features 190–194).
 *
 * Plan coverage:
 *   - 190 Zone tag dictionary  — list/rename/merge/delete zone tags across all shifts.
 *   - 191 Zone performance ranking — earnings, hourly rate, count per zone.
 *   - 192 Zone-level expense allocation — sum of expenses bucketed to each zone
 *         (via the expense's `platformId` + zone-matching shifts on the same date).
 *   - 193 Zone earnings per km — gross / distance for each zone.
 *   - 194 Zone autocomplete suggestions — distinct list for inputs.
 *
 * Notes:
 *   - Shifts use the `zoneTag` field (F4 schema).
 *   - All operations soft-respect `deletedAt` (active rows only).
 *   - Rename is whole-shift `zoneTag` rewrite; merge = rename multiple → one.
 *   - No new tables added; pure Dexie reads + targeted updates.
 */

import { db } from '../../core/db.js';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normZone(z) {
  if (typeof z !== 'string') return '';
  return z.trim();
}

/** Feature 194 — sorted distinct list for autocomplete. */
export async function listAllZoneTags() {
  const set = new Set();
  await db.shifts
    .filter((s) => s && s.deletedAt == null && typeof s.zoneTag === 'string' && s.zoneTag.trim() !== '')
    .each((s) => set.add(s.zoneTag.trim()));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Feature 190+191+193 — aggregate per zone.
 *
 * Returns rows: { zone, shiftCount, gross, tips, bonus, orders, minutes, hours,
 *                 distanceKm, hourly, perOrder, perKm }.
 *
 * @param {{ startDate?: string, endDate?: string, platformId?: string }} [filter]
 */
export async function getZonePerformance(filter = {}) {
  const { startDate, endDate, platformId } = filter || {};
  let query = db.shifts.filter((s) => s && s.deletedAt == null);
  if (startDate && endDate) {
    query = db.shifts.where('date').between(startDate, endDate, true, true).filter((s) => s.deletedAt == null);
  } else if (startDate) {
    query = db.shifts.where('date').aboveOrEqual(startDate).filter((s) => s.deletedAt == null);
  } else if (endDate) {
    query = db.shifts.where('date').belowOrEqual(endDate).filter((s) => s.deletedAt == null);
  }
  const shifts = await query.toArray();

  const rowsByZone = new Map();
  for (const s of shifts) {
    if (platformId && platformId !== 'all' && String(s.platformId) !== String(platformId)) continue;
    const zone = normZone(s.zoneTag);
    if (!zone) continue;
    const row =
      rowsByZone.get(zone) ||
      {
        zone,
        shiftCount: 0,
        gross: 0,
        tips: 0,
        bonus: 0,
        orders: 0,
        minutes: 0,
        distanceKm: 0,
      };
    row.shiftCount += 1;
    row.gross += num(s.grossEarnings ?? s.gross);
    row.tips += num(s.tips);
    row.bonus += num(s.bonusEarnings ?? s.bonus);
    row.orders += num(s.deliveryCount ?? s.orders);
    row.minutes += num(s.durationMinutes ?? s.activeMinutes ?? s.onlineMinutes);
    row.distanceKm += num(s.distanceKm);
    rowsByZone.set(zone, row);
  }

  const out = [];
  for (const r of rowsByZone.values()) {
    const hours = r.minutes > 0 ? r.minutes / 60 : 0;
    out.push({
      ...r,
      hours,
      hourly: hours > 0 ? r.gross / hours : 0,
      perOrder: r.orders > 0 ? r.gross / r.orders : 0,
      perKm: r.distanceKm > 0 ? r.gross / r.distanceKm : 0,
    });
  }
  out.sort((a, b) => b.gross - a.gross);
  return out;
}

/**
 * Feature 192 — allocate expenses to zones using same-day shift presence.
 *
 * For each expense (active, in range, matching `platformId` if provided),
 * the amount × businessPct is divided evenly across the zones the user worked
 * that day. Expenses on days with no logged shift fall under `__unallocated__`.
 *
 * @param {{ startDate?: string, endDate?: string, platformId?: string }} [filter]
 */
export async function getZoneExpenseAllocation(filter = {}) {
  const { startDate, endDate, platformId } = filter || {};
  let expensesQ = db.expenses.filter((e) => e && e.deletedAt == null);
  if (startDate && endDate) {
    expensesQ = db.expenses
      .where('date')
      .between(startDate, endDate, true, true)
      .filter((e) => e.deletedAt == null);
  }
  const expenses = await expensesQ.toArray();

  /* Build a map: date → unique zones worked that day. */
  const zonesByDate = new Map();
  await db.shifts
    .filter((s) => s && s.deletedAt == null && typeof s.zoneTag === 'string' && s.zoneTag.trim() !== '')
    .each((s) => {
      if (platformId && platformId !== 'all' && String(s.platformId) !== String(platformId)) return;
      const set = zonesByDate.get(s.date) || new Set();
      set.add(s.zoneTag.trim());
      zonesByDate.set(s.date, set);
    });

  const totals = new Map();
  for (const e of expenses) {
    if (platformId && platformId !== 'all' && String(e.platformId || 'all') !== String(platformId)) {
      continue;
    }
    const amount = num(e.amount) * (num(e.businessPct, 100) / 100);
    if (amount <= 0) continue;
    const set = zonesByDate.get(e.date);
    if (!set || set.size === 0) {
      totals.set('__unallocated__', (totals.get('__unallocated__') || 0) + amount);
      continue;
    }
    const share = amount / set.size;
    for (const z of set) {
      totals.set(z, (totals.get(z) || 0) + share);
    }
  }
  return [...totals.entries()].map(([zone, allocated]) => ({ zone, allocated })).sort(
    (a, b) => b.allocated - a.allocated,
  );
}

/**
 * Feature 190 — rename a single zone across all matching shifts.
 * Returns the number of shifts updated.
 * @param {string} fromName
 * @param {string} toName
 */
export async function renameZone(fromName, toName) {
  const from = normZone(fromName);
  const to = normZone(toName);
  if (!from) throw new Error('zones:rename:from_required');
  if (!to) throw new Error('zones:rename:to_required');
  if (from === to) return 0;
  let updated = 0;
  await db.transaction('rw', db.shifts, async () => {
    const rows = await db.shifts.where('zoneTag').equals(from).toArray();
    for (const row of rows) {
      await db.shifts.update(row.id, { zoneTag: to, updatedAt: new Date().toISOString() });
      updated += 1;
    }
  });
  return updated;
}

/**
 * Feature 190 — merge multiple zones into one target.
 * @param {string[]} fromNames
 * @param {string} toName
 */
export async function mergeZones(fromNames, toName) {
  const to = normZone(toName);
  if (!to) throw new Error('zones:merge:target_required');
  const sources = Array.isArray(fromNames)
    ? fromNames.map(normZone).filter((s) => s && s !== to)
    : [];
  if (sources.length === 0) return 0;
  let updated = 0;
  for (const src of sources) {
    updated += await renameZone(src, to);
  }
  return updated;
}

/**
 * Feature 190 — clear a zone tag from every shift (does not delete the shift).
 * @param {string} zoneName
 */
export async function deleteZone(zoneName) {
  const z = normZone(zoneName);
  if (!z) throw new Error('zones:delete:required');
  let updated = 0;
  await db.transaction('rw', db.shifts, async () => {
    const rows = await db.shifts.where('zoneTag').equals(z).toArray();
    for (const row of rows) {
      await db.shifts.update(row.id, { zoneTag: null, updatedAt: new Date().toISOString() });
      updated += 1;
    }
  });
  return updated;
}

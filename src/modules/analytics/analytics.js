import { db } from '../../core/db.js';
import {
  calcBonusDependencyRatio,
  calcEarningsPerKm,
  calcEarningsPerOrder,
  calcHourlyRate,
  calcLinearRegression,
  calcNetHourlyRate,
  calcPersonalRecords,
  calcTipRate,
  projectWeekEarnings,
} from '../../utils/calculations.js';
import { getTotalExpensesForPeriod } from '../expenses/expenses.js';
import { platformAnalyticsEnabled } from '../platforms/platform-config.js';

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(now = new Date(), weekStartDay = 0) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - delta);
  return d;
}

function endOfWeek(now = new Date(), weekStartDay = 0) {
  const s = startOfWeek(now, weekStartDay);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function monthRange(month, year) {
  const s = new Date(year, month - 1, 1);
  const e = new Date(year, month, 0);
  return { start: ymd(s), end: ymd(e) };
}

function yearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

async function listShiftsBetween(startDate, endDate) {
  return db.shifts
    .where('date')
    .between(startDate, endDate, true, true)
    .filter((row) => row.deletedAt == null)
    .toArray();
}

function getDurationMinutes(shift) {
  return num(shift.durationMinutes || shift.activeMinutes || shift.onlineMinutes);
}

function parseDate(dateStr) {
  const d = new Date(`${String(dateStr || '')}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKeyFromDateStr(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function median(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function quarterBuckets(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return { q1: 0, q2: 0, q3: 0 };
  const at = (p) => {
    const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
  };
  return { q1: at(0.25), q2: at(0.5), q3: at(0.75) };
}

function shiftStartHour(shift) {
  const startTime = String(shift.startTime || '');
  const hour = Number(startTime.slice(0, 2));
  if (Number.isFinite(hour) && hour >= 0 && hour <= 23) return hour;
  return null;
}

function dayPartForHour(hour) {
  if (!Number.isFinite(hour)) return null;
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'midday';
  if (hour >= 16 && hour < 21) return 'evening';
  return 'night';
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return 0;
  const total = nums.reduce((sum, v) => sum + v, 0);
  return total / nums.length;
}

function stdDev(values, avg = mean(values)) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < 2) return 0;
  const variance = nums.reduce((sum, v) => sum + (v - avg) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

async function hydrateDerived(shifts) {
  if (!Array.isArray(shifts) || shifts.length === 0) return [];
  return Promise.all(
    shifts.map(async (shift) => {
      const gross = num(shift.grossEarnings ?? shift.gross);
      const durationMinutes = getDurationMinutes(shift);
      const tips = num(shift.tips);
      const bonus = num(shift.bonusEarnings ?? shift.bonus);
      const orders = num(shift.deliveryCount ?? shift.orders);
      const distanceKm = num(shift.distanceKm);
      const expense = await getTotalExpensesForPeriod(shift.date, shift.date, shift.platformId || undefined);
      return {
        ...shift,
        gross,
        durationMinutes,
        tips,
        bonus,
        orders,
        distanceKm,
        hourlyRate: calcHourlyRate(gross, durationMinutes),
        netHourlyRate: calcNetHourlyRate(gross, expense, durationMinutes),
        earningsPerOrder: calcEarningsPerOrder(gross, orders),
        tipRate: calcTipRate(tips, gross),
        bonusDependencyRatio: calcBonusDependencyRatio(bonus, gross),
      };
    }),
  );
}

function aggregateSummary(rows) {
  let gross = 0;
  let tips = 0;
  let bonus = 0;
  let orders = 0;
  let minutes = 0;
  let distanceKm = 0;
  for (const row of rows) {
    gross += num(row.gross);
    tips += num(row.tips);
    bonus += num(row.bonus);
    orders += num(row.orders);
    minutes += num(row.durationMinutes);
    distanceKm += num(row.distanceKm);
  }
  const hourlyRate = calcHourlyRate(gross, minutes);
  const tipRate = calcTipRate(tips, gross);
  const bonusRatio = calcBonusDependencyRatio(bonus, gross);
  return {
    count: rows.length,
    gross,
    tips,
    bonus,
    orders,
    minutes,
    distanceKm,
    hourlyRate,
    tipRate,
    bonusRatio,
    earningsPerKm: calcEarningsPerKm(gross, distanceKm),
  };
}

export async function getDailySummary(date) {
  const shifts = await listShiftsBetween(date, date);
  const rows = await hydrateDerived(shifts);
  return aggregateSummary(rows);
}

export async function getWeeklySummary(startDate) {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const shifts = await listShiftsBetween(startDate, ymd(e));
  const rows = await hydrateDerived(shifts);
  return aggregateSummary(rows);
}

export async function getMonthlySummary(month, year) {
  const { start, end } = monthRange(month, year);
  const shifts = await listShiftsBetween(start, end);
  const rows = await hydrateDerived(shifts);
  return aggregateSummary(rows);
}

export async function getAnnualSummary(year) {
  const { start, end } = yearRange(year);
  const shifts = await listShiftsBetween(start, end);
  const rows = await hydrateDerived(shifts);
  return aggregateSummary(rows);
}

export async function getRolling30DayTrend() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  const shifts = await listShiftsBetween(ymd(start), ymd(today));
  const byDay = new Map();
  for (const s of shifts) {
    byDay.set(s.date, (byDay.get(s.date) || 0) + num(s.grossEarnings ?? s.gross));
  }
  const points = [];
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const date = ymd(d);
    points.push({ x: i, y: num(byDay.get(date)) });
  }
  return { points, regression: calcLinearRegression(points) };
}

export async function getBestDayOfWeek() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const buckets = new Map();
  for (const s of shifts) {
    const d = new Date(`${s.date}T00:00:00`);
    const day = Number.isNaN(d.getTime()) ? 0 : d.getDay();
    const key = String(day);
    buckets.set(key, (buckets.get(key) || 0) + num(s.grossEarnings ?? s.gross));
  }
  let best = { day: 0, gross: 0 };
  for (const [key, gross] of buckets.entries()) {
    if (gross > best.gross) best = { day: Number(key), gross };
  }
  return best;
}

export async function getBestTimeOfDay() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const buckets = new Map();
  for (const s of shifts) {
    const startTime = String(s.startTime || '');
    const hour = Number(startTime.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    buckets.set(hour, (buckets.get(hour) || 0) + num(s.grossEarnings ?? s.gross));
  }
  let best = { hour: 0, gross: 0 };
  for (const [hour, gross] of buckets.entries()) {
    if (gross > best.gross) best = { hour, gross };
  }
  return best;
}

export async function getBestZone() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null && s.zoneTag).toArray();
  const buckets = new Map();
  for (const s of shifts) {
    const zone = String(s.zoneTag || '').trim() || 'Unknown';
    buckets.set(zone, (buckets.get(zone) || 0) + num(s.grossEarnings ?? s.gross));
  }
  let best = { zone: 'Unknown', gross: 0 };
  for (const [zone, gross] of buckets.entries()) {
    if (gross > best.gross) best = { zone, gross };
  }
  return best;
}

export async function getPlatformComparison() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const grouped = new Map();
  for (const s of shifts) {
    const id = String(s.platformId || 'other');
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(s);
  }
  const out = [];
  for (const [platformId, rows] of grouped.entries()) {
    const derived = await hydrateDerived(rows);
    const sum = aggregateSummary(derived);
    out.push({
      platformId,
      ...sum,
      analyticsModules: {
        bonusTracking: platformAnalyticsEnabled(platformId, 'bonusTracking'),
        surgeAnalysis: platformAnalyticsEnabled(platformId, 'surgeAnalysis'),
        blockEarnings: platformAnalyticsEnabled(platformId, 'blockEarnings'),
        batchTracking: platformAnalyticsEnabled(platformId, 'batchTracking'),
        orderTypeTracking: platformAnalyticsEnabled(platformId, 'orderTypeTracking'),
        questTracking: platformAnalyticsEnabled(platformId, 'questTracking'),
        promotionsTracking: platformAnalyticsEnabled(platformId, 'promotionsTracking'),
      },
    });
  }
  out.sort((a, b) => b.gross - a.gross);
  return out;
}

export async function getIncomeSourceBreakdown() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  let base = 0;
  let tips = 0;
  let bonus = 0;
  for (const s of shifts) {
    const g = num(s.grossEarnings ?? s.gross);
    const t = num(s.tips);
    const b = num(s.bonusEarnings ?? s.bonus);
    tips += t;
    bonus += b;
    base += Math.max(0, g - t - b);
  }
  return { base, tips, bonus };
}

export async function getPersonalRecords() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const normalized = shifts.map((s) => ({
    gross: num(s.grossEarnings ?? s.gross),
    durationMinutes: getDurationMinutes(s),
    orders: num(s.deliveryCount ?? s.orders),
  }));
  return calcPersonalRecords(normalized);
}

export async function getZerodays(month, year) {
  const { start, end } = monthRange(month, year);
  const shifts = await listShiftsBetween(start, end);
  const worked = new Set(shifts.map((s) => s.date));
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const zeroDays = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    if (!worked.has(key)) zeroDays.push(key);
  }
  return zeroDays;
}

export async function getEarningsPerKm(startDate, endDate) {
  const shifts = await listShiftsBetween(startDate, endDate);
  const gross = shifts.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
  const distance = shifts.reduce((sum, s) => sum + num(s.distanceKm), 0);
  return calcEarningsPerKm(gross, distance);
}

export async function getWeeklyProjection() {
  const today = new Date();
  const start = startOfWeek(today, 1);
  const end = endOfWeek(today, 1);
  const shifts = await listShiftsBetween(ymd(start), ymd(end));
  const points = shifts.map((s) => ({
    startAt: `${s.date}T${String(s.startTime || '00:00')}:00`,
    gross: num(s.grossEarnings ?? s.gross),
  }));
  return projectWeekEarnings(points, today);
}

export async function getTopEarningShifts(limit = 10) {
  const rows = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  return rows
    .map((s) => ({
      id: s.id,
      date: s.date,
      platformId: s.platformId,
      gross: num(s.grossEarnings ?? s.gross),
      durationMinutes: getDurationMinutes(s),
    }))
    .sort((a, b) => b.gross - a.gross)
    .slice(0, Math.max(1, limit));
}

export async function getCumulativeYtdSeries(year = new Date().getFullYear()) {
  const { start, end } = yearRange(year);
  const shifts = await listShiftsBetween(start, end);
  const byDay = new Map();
  for (const s of shifts) {
    byDay.set(s.date, (byDay.get(s.date) || 0) + num(s.grossEarnings ?? s.gross));
  }
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  let running = 0;
  const labels = [];
  const values = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = ymd(d);
    running += num(byDay.get(key));
    labels.push(key);
    values.push(running);
  }
  return { labels, values };
}

export async function getEarningsVsHoursScatter(startDate, endDate) {
  const shifts = await listShiftsBetween(startDate, endDate);
  return shifts.map((s) => ({
    x: getDurationMinutes(s) / 60,
    y: num(s.grossEarnings ?? s.gross),
  }));
}

export async function getWeekOverWeek() {
  const now = new Date();
  const thisWeekStart = startOfWeek(now, 1);
  const thisWeekEnd = endOfWeek(now, 1);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekEnd);
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
  const [thisWeek, lastWeek] = await Promise.all([
    listShiftsBetween(ymd(thisWeekStart), ymd(thisWeekEnd)),
    listShiftsBetween(ymd(lastWeekStart), ymd(lastWeekEnd)),
  ]);
  const thisGross = thisWeek.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
  const lastGross = lastWeek.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
  return { thisGross, lastGross, delta: thisGross - lastGross };
}

export async function getRecentActivity(limit = 8) {
  const rows = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  return rows
    .sort((a, b) => String(b.updatedAt || b.date).localeCompare(String(a.updatedAt || a.date)))
    .slice(0, Math.max(1, limit))
    .map((s) => ({
      id: s.id,
      date: s.date,
      platformId: s.platformId,
      gross: num(s.grossEarnings ?? s.gross),
      orders: num(s.deliveryCount ?? s.orders),
    }));
}

export async function getCohortFirstVsCurrentMonth() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  if (shifts.length === 0) {
    return {
      firstMonth: null,
      currentMonth: null,
      firstGross: 0,
      currentGross: 0,
      change: 0,
      changePct: 0,
    };
  }
  const keys = shifts
    .map((s) => monthKeyFromDateStr(s.date))
    .filter(Boolean)
    .sort();
  if (keys.length === 0) {
    return {
      firstMonth: null,
      currentMonth: null,
      firstGross: 0,
      currentGross: 0,
      change: 0,
      changePct: 0,
    };
  }
  const firstMonth = keys[0];
  const currentMonth = keys[keys.length - 1];
  let firstGross = 0;
  let currentGross = 0;
  for (const s of shifts) {
    const k = monthKeyFromDateStr(s.date);
    const gross = num(s.grossEarnings ?? s.gross);
    if (k === firstMonth) firstGross += gross;
    if (k === currentMonth) currentGross += gross;
  }
  const change = currentGross - firstGross;
  const changePct = firstGross > 0 ? (change / firstGross) * 100 : 0;
  return { firstMonth, currentMonth, firstGross, currentGross, change, changePct };
}

export async function getDiminishingReturnsByShiftPosition() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const byDate = new Map();
  for (const s of shifts) {
    const key = String(s.date || '');
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(s);
  }
  const buckets = new Map();
  for (const rows of byDate.values()) {
    rows.sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
    rows.forEach((s, idx) => {
      const position = idx + 1;
      const hourly = getDurationMinutes(s) > 0 ? calcHourlyRate(num(s.grossEarnings ?? s.gross), getDurationMinutes(s)) : 0;
      if (!buckets.has(position)) buckets.set(position, []);
      buckets.get(position).push(hourly);
    });
  }
  const positions = [...buckets.entries()]
    .map(([position, values]) => ({ position, hourlyRate: mean(values), sampleSize: values.length }))
    .sort((a, b) => a.position - b.position);
  let diminishingAtPosition = null;
  for (let i = 1; i < positions.length; i += 1) {
    if (positions[i].hourlyRate < positions[i - 1].hourlyRate) {
      diminishingAtPosition = positions[i].position;
      break;
    }
  }
  return { positions, diminishingAtPosition };
}

export async function getDayPartAnalysisMatrix() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const dayParts = ['morning', 'midday', 'evening', 'night'];
  const dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const matrix = {};
  for (const part of dayParts) {
    matrix[part] = Object.fromEntries(dayKeys.map((d) => [d, { gross: 0, minutes: 0, count: 0, hourlyRate: 0 }]));
  }
  for (const s of shifts) {
    const hour = shiftStartHour(s);
    const part = dayPartForHour(hour);
    if (!part) continue;
    const d = parseDate(s.date);
    if (!d) continue;
    const day = dayKeys[d.getDay()];
    const slot = matrix[part][day];
    slot.gross += num(s.grossEarnings ?? s.gross);
    slot.minutes += getDurationMinutes(s);
    slot.count += 1;
  }
  for (const part of dayParts) {
    for (const day of dayKeys) {
      const slot = matrix[part][day];
      slot.hourlyRate = slot.minutes > 0 ? calcHourlyRate(slot.gross, slot.minutes) : 0;
    }
  }
  return { dayParts, days: dayKeys, matrix };
}

export async function getHolidayVsRegularComparison(holidays = []) {
  const holidaySet = new Set((holidays || []).map((h) => String(h)));
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  let holidayGross = 0;
  let regularGross = 0;
  let holidayMinutes = 0;
  let regularMinutes = 0;
  let holidayCount = 0;
  let regularCount = 0;
  for (const s of shifts) {
    const gross = num(s.grossEarnings ?? s.gross);
    const mins = getDurationMinutes(s);
    if (holidaySet.has(String(s.date))) {
      holidayGross += gross;
      holidayMinutes += mins;
      holidayCount += 1;
    } else {
      regularGross += gross;
      regularMinutes += mins;
      regularCount += 1;
    }
  }
  const holidayHourly = calcHourlyRate(holidayGross, holidayMinutes);
  const regularHourly = calcHourlyRate(regularGross, regularMinutes);
  return {
    holiday: { gross: holidayGross, count: holidayCount, hourlyRate: holidayHourly },
    regular: { gross: regularGross, count: regularCount, hourlyRate: regularHourly },
    upliftPct: regularHourly > 0 ? ((holidayHourly - regularHourly) / regularHourly) * 100 : 0,
  };
}

export async function getWeatherCorrelation() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const grouped = new Map();
  for (const s of shifts) {
    const weather = String(s.weather || 'Unknown');
    if (!grouped.has(weather)) grouped.set(weather, []);
    grouped.get(weather).push(s);
  }
  const rows = [];
  for (const [weather, items] of grouped.entries()) {
    const gross = items.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
    const minutes = items.reduce((sum, s) => sum + getDurationMinutes(s), 0);
    rows.push({
      weather,
      count: items.length,
      gross,
      hourlyRate: calcHourlyRate(gross, minutes),
    });
  }
  rows.sort((a, b) => b.hourlyRate - a.hourlyRate);
  return rows;
}

export async function getOrdersPerHour(startDate, endDate) {
  const shifts = startDate && endDate
    ? await listShiftsBetween(startDate, endDate)
    : await db.shifts.filter((s) => s.deletedAt == null).toArray();
  let orders = 0;
  let minutes = 0;
  for (const s of shifts) {
    orders += num(s.deliveryCount ?? s.orders);
    minutes += getDurationMinutes(s);
  }
  const hours = minutes / 60;
  return {
    orders,
    hours,
    ordersPerHour: hours > 0 ? orders / hours : 0,
  };
}

export async function getSeasonalityHeatmap() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const now = new Date();
  const months = [];
  const monthTotals = new Map();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push(key);
    monthTotals.set(key, 0);
  }
  for (const s of shifts) {
    const key = monthKeyFromDateStr(s.date);
    if (!monthTotals.has(key)) continue;
    monthTotals.set(key, monthTotals.get(key) + num(s.grossEarnings ?? s.gross));
  }
  return months.map((month) => ({ month, gross: monthTotals.get(month) || 0 }));
}

export async function getCompoundGrowthRate() {
  const cohort = await getCohortFirstVsCurrentMonth();
  if (!cohort.firstMonth || !cohort.currentMonth) return { cagrPct: 0, periods: 0 };
  const [startYear, startMonth] = cohort.firstMonth.split('-').map((v) => Number(v));
  const [endYear, endMonth] = cohort.currentMonth.split('-').map((v) => Number(v));
  const periods = Math.max(0, (endYear - startYear) * 12 + (endMonth - startMonth));
  if (periods <= 0 || cohort.firstGross <= 0 || cohort.currentGross <= 0) return { cagrPct: 0, periods };
  const cagr = (cohort.currentGross / cohort.firstGross) ** (1 / periods) - 1;
  return { cagrPct: cagr * 100, periods };
}

export async function getBreakEvenAnalysis({ fixedCosts = 0, variableCostPct = 0 } = {}) {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const gross = shifts.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
  const inferredVariable = Math.max(0, num(variableCostPct)) / 100;
  const contributionMargin = 1 - inferredVariable;
  const breakEvenRevenue = contributionMargin > 0 ? num(fixedCosts) / contributionMargin : 0;
  return {
    fixedCosts: num(fixedCosts),
    variableCostPct: inferredVariable * 100,
    contributionMarginPct: contributionMargin * 100,
    breakEvenRevenue,
    currentRevenue: gross,
    marginToBreakEven: gross - breakEvenRevenue,
  };
}

export async function getNetWorthContribution(startDate, endDate) {
  const shifts = startDate && endDate
    ? await listShiftsBetween(startDate, endDate)
    : await db.shifts.filter((s) => s.deletedAt == null).toArray();
  if (shifts.length === 0) return { gross: 0, expenses: 0, net: 0, savingsRatePct: 0 };
  const dates = shifts.map((s) => String(s.date)).sort();
  const rangeStart = startDate || dates[0];
  const rangeEnd = endDate || dates[dates.length - 1];
  const gross = shifts.reduce((sum, s) => sum + num(s.grossEarnings ?? s.gross), 0);
  const expenses = await getTotalExpensesForPeriod(rangeStart, rangeEnd);
  const net = gross - expenses;
  return {
    gross,
    expenses,
    net,
    savingsRatePct: gross > 0 ? (net / gross) * 100 : 0,
  };
}

export async function getShiftEfficiencyQuartiles() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const scored = shifts
    .map((s) => ({
      id: s.id,
      date: s.date,
      platformId: s.platformId,
      efficiency: calcHourlyRate(num(s.grossEarnings ?? s.gross), getDurationMinutes(s)),
    }))
    .filter((row) => Number.isFinite(row.efficiency));
  const thresholds = quarterBuckets(scored.map((r) => r.efficiency));
  const buckets = { q1: [], q2: [], q3: [], q4: [] };
  for (const row of scored) {
    if (row.efficiency <= thresholds.q1) buckets.q1.push(row);
    else if (row.efficiency <= thresholds.q2) buckets.q2.push(row);
    else if (row.efficiency <= thresholds.q3) buckets.q3.push(row);
    else buckets.q4.push(row);
  }
  return { thresholds, buckets };
}

export async function getPredictiveWeeklyEarnings() {
  const projection = await getWeeklyProjection();
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const daily = new Map();
  for (const s of shifts) {
    daily.set(s.date, (daily.get(s.date) || 0) + num(s.grossEarnings ?? s.gross));
  }
  const series = [...daily.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map((entry, idx) => ({ x: idx, y: num(entry[1]) }));
  const regression = calcLinearRegression(series);
  return {
    projectedWeekGross: projection,
    trendSlope: regression.slope,
    trend: regression.trend,
  };
}

export async function getPlatformShiftOfActivity() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const monthSet = new Set(shifts.map((s) => monthKeyFromDateStr(s.date)).filter(Boolean));
  const months = [...monthSet].sort();
  const map = new Map();
  for (const s of shifts) {
    const m = monthKeyFromDateStr(s.date);
    if (!m) continue;
    const platformId = String(s.platformId || 'other');
    const key = `${m}::${platformId}`;
    map.set(key, (map.get(key) || 0) + num(s.grossEarnings ?? s.gross));
  }
  const byMonth = [];
  for (const month of months) {
    const platforms = [];
    for (const [key, gross] of map.entries()) {
      if (!key.startsWith(`${month}::`)) continue;
      platforms.push({ platformId: key.split('::')[1], gross });
    }
    platforms.sort((a, b) => b.gross - a.gross);
    byMonth.push({
      month,
      dominantPlatform: platforms[0]?.platformId || null,
      platforms,
    });
  }
  return byMonth;
}

export async function getFatigueAlert() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const flagged = shifts
    .map((s) => ({
      id: s.id,
      date: s.date,
      durationMinutes: getDurationMinutes(s),
      hourlyRate: calcHourlyRate(num(s.grossEarnings ?? s.gross), getDurationMinutes(s)),
    }))
    .filter((s) => s.durationMinutes >= 600 && s.hourlyRate < 15);
  return {
    threshold: { minMinutes: 600, lowHourlyRate: 15 },
    flagged,
    riskLevel: flagged.length >= 3 ? 'high' : flagged.length > 0 ? 'moderate' : 'low',
  };
}

export async function getEarningsAnxietyPattern() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const moodRows = shifts.filter((s) => s.mood);
  const out = {};
  for (const s of moodRows) {
    const mood = String(s.mood);
    if (!out[mood]) out[mood] = { count: 0, gross: 0, hourlyRates: [] };
    out[mood].count += 1;
    const gross = num(s.grossEarnings ?? s.gross);
    const hourly = calcHourlyRate(gross, getDurationMinutes(s));
    out[mood].gross += gross;
    out[mood].hourlyRates.push(hourly);
  }
  const patterns = Object.entries(out).map(([mood, value]) => ({
    mood,
    count: value.count,
    avgGross: value.count > 0 ? value.gross / value.count : 0,
    avgHourlyRate: mean(value.hourlyRates),
    medianHourlyRate: median(value.hourlyRates),
  }));
  patterns.sort((a, b) => a.avgHourlyRate - b.avgHourlyRate);
  return patterns;
}

export async function getIncomeStabilityScore() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const byWeek = new Map();
  for (const s of shifts) {
    const d = parseDate(s.date);
    if (!d) continue;
    const weekStart = startOfWeek(d, 1);
    const key = ymd(weekStart);
    byWeek.set(key, (byWeek.get(key) || 0) + num(s.grossEarnings ?? s.gross));
  }
  const weeklyGross = [...byWeek.values()];
  const avg = mean(weeklyGross);
  const sd = stdDev(weeklyGross, avg);
  const cv = avg > 0 ? sd / avg : 1;
  const stabilityScore = Math.max(0, Math.min(100, (1 - cv) * 100));
  return {
    weeklyGross,
    averageWeeklyGross: avg,
    stdDevWeeklyGross: sd,
    coefficientOfVariation: cv,
    stabilityScore,
  };
}

export async function getMoodTrend() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null && s.mood).toArray();
  const byDay = new Map();
  for (const s of shifts) {
    if (!byDay.has(s.date)) byDay.set(s.date, {});
    const day = byDay.get(s.date);
    const mood = String(s.mood);
    day[mood] = (day[mood] || 0) + 1;
  }
  const points = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, counts]) => ({
      date,
      counts,
      dominantMood: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
    }));
  return points;
}

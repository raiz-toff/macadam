import { db } from '../../core/db.js';
import { bus, DATA_IMPORTED } from '../../core/events.js';
import { ReportRegistry } from '../../registry/reports/index.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

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

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fileSafeDate(date = new Date()) {
  return ymd(date).replaceAll('-', '');
}

function toStartOfWeek(input, weekStartDay = 0) {
  const d = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const delta = (d.getDay() - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - delta);
  return d;
}

function toEndOfWeek(input, weekStartDay = 0) {
  const s = toStartOfWeek(input, weekStartDay);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function toMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: ymd(start), end: ymd(end) };
}

function toYearRange(year) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

async function listShifts(startDate, endDate) {
  return db.shifts
    .where('date')
    .between(startDate, endDate, true, true)
    .filter((row) => row.deletedAt == null)
    .toArray();
}

async function listExpenses(startDate, endDate) {
  return db.expenses
    .where('date')
    .between(startDate, endDate, true, true)
    .filter((row) => row.deletedAt == null)
    .toArray();
}

function summarize(shifts, expenses) {
  let gross = 0;
  let tips = 0;
  let bonus = 0;
  let orders = 0;
  let minutes = 0;
  let distanceKm = 0;
  for (const s of shifts) {
    gross += num(s.grossEarnings ?? s.gross);
    tips += num(s.tips);
    bonus += num(s.bonusEarnings ?? s.bonus);
    orders += num(s.deliveryCount ?? s.orders);
    minutes += num(s.durationMinutes ?? s.activeMinutes ?? s.onlineMinutes);
    distanceKm += num(s.distanceKm);
  }
  const expenseTotal = expenses.reduce((sum, e) => sum + num(e.amount) * (num(e.businessPct, 100) / 100), 0);
  const hours = minutes > 0 ? minutes / 60 : 0;
  return {
    shiftCount: shifts.length,
    expenseCount: expenses.length,
    gross,
    tips,
    bonus,
    orders,
    minutes,
    hours,
    distanceKm,
    expenseTotal,
    net: gross - expenseTotal,
    hourly: minutes > 0 ? gross / (minutes / 60) : 0,
    netHourly: minutes > 0 ? (gross - expenseTotal) / (minutes / 60) : 0,
  };
}

async function reportForRange(startDate, endDate, options = {}) {
  const [shifts, expenses] = await Promise.all([listShifts(startDate, endDate), listExpenses(startDate, endDate)]);
  let rows = shifts;
  if (options.platformId && options.platformId !== 'all') {
    rows = rows.filter((s) => String(s.platformId || '') === String(options.platformId));
  }
  const visibleExpenses =
    options.platformId && options.platformId !== 'all'
      ? expenses.filter((e) => String(e.platformId || '') === String(options.platformId))
      : expenses;
  return {
    startDate,
    endDate,
    platformId: options.platformId || 'all',
    shifts: rows,
    expenses: visibleExpenses,
    summary: summarize(rows, visibleExpenses),
  };
}

export async function getWeeklyReportCard(referenceDate = new Date(), weekStartDay = 0) {
  const start = toStartOfWeek(referenceDate, weekStartDay);
  const end = toEndOfWeek(referenceDate, weekStartDay);
  return reportForRange(ymd(start), ymd(end));
}

export async function getMonthlyReportCard(referenceDate = new Date()) {
  const { start, end } = toMonthRange(referenceDate);
  return reportForRange(start, end);
}

export async function getAnnualReport(year = new Date().getFullYear()) {
  const { start, end } = toYearRange(Math.floor(num(year, new Date().getFullYear())));
  return reportForRange(start, end);
}

export async function getPlatformReport(platformId, range = {}) {
  const startDate = range.startDate || `${new Date().getFullYear()}-01-01`;
  const endDate = range.endDate || ymd(new Date());
  return reportForRange(startDate, endDate, { platformId });
}

export async function getCustomDateRangeReport(startDate, endDate, options = {}) {
  return reportForRange(startDate, endDate, options);
}

export function buildSummaryText(report, user) {
  const lines = [];
  for (const sec of ReportRegistry.getAll()) {
    if (sec.id === 'placeholder') continue;
    const chunk = sec.renderText(report, user);
    if (chunk) lines.push(chunk);
  }
  return lines.join('\n\n');
}

function downloadTextFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function exportAllShiftsCsv() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const header = [
    'id',
    'date',
    'platformId',
    'startTime',
    'endTime',
    'gross',
    'tips',
    'bonus',
    'orders',
    'distanceKm',
    'notes',
  ];
  const rows = shifts.map((s) => [
    s.id,
    s.date,
    s.platformId,
    s.startTime || '',
    s.endTime || '',
    num(s.grossEarnings ?? s.gross),
    num(s.tips),
    num(s.bonusEarnings ?? s.bonus),
    num(s.deliveryCount ?? s.orders),
    num(s.distanceKm),
    s.notes || '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(`macadam-shifts-${fileSafeDate()}.csv`, csv, 'text/csv;charset=utf-8');
  return shifts.length;
}

export async function exportAllExpensesCsv() {
  const expenses = await db.expenses.filter((e) => e.deletedAt == null).toArray();
  const header = ['id', 'date', 'category', 'platformId', 'amount', 'businessPct', 'notes'];
  const rows = expenses.map((e) => [
    e.id,
    e.date,
    e.category || '',
    e.platformId || '',
    num(e.amount),
    num(e.businessPct, 100),
    e.notes || '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(`macadam-expenses-${fileSafeDate()}.csv`, csv, 'text/csv;charset=utf-8');
  return expenses.length;
}

export async function buildVaultBackup() {
  const tableNames = db.tables.map((t) => t.name);
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    tables: {},
  };
  for (const name of tableNames) {
    payload.tables[name] = await db.table(name).toArray();
  }
  return payload;
}

export async function exportVaultBackupJson() {
  const backup = await buildVaultBackup();
  downloadTextFile(`macadam-vault-backup-${fileSafeDate()}.json`, JSON.stringify(backup, null, 2), 'application/json');
  return Object.keys(backup.tables).length;
}

export function previewVaultImportDiff(rawText) {
  const parsed = JSON.parse(rawText);
  const incoming = parsed?.tables && typeof parsed.tables === 'object' ? parsed.tables : {};
  const diff = [];
  for (const table of db.tables) {
    const name = table.name;
    const incomingCount = Array.isArray(incoming[name]) ? incoming[name].length : 0;
    diff.push({ table: name, incomingCount });
  }
  return { backup: parsed, tableDiff: diff };
}

export async function restoreVaultBackup(backup) {
  const tables = backup?.tables && typeof backup.tables === 'object' ? backup.tables : null;
  if (!tables) throw new Error('backup:invalid');
  await db.transaction('rw', db.tables.map((t) => t.name), async () => {
    for (const table of db.tables) {
      const name = table.name;
      const rows = Array.isArray(tables[name]) ? tables[name] : [];
      await table.clear();
      if (rows.length > 0) await table.bulkPut(rows);
    }
  });
  bus.emit(DATA_IMPORTED, { source: 'reports_backup_restore' });
}

export function getDefaultReportTemplate() {
  /** @type {Record<string, boolean>} */
  const sections = {};
  for (const s of ReportRegistry.getAll()) {
    if (s.id === 'placeholder') continue;
    sections[s.id] = s.defaultIncluded !== false;
  }
  return { sections };
}

export async function copySummaryToClipboard(report, user) {
  const text = buildSummaryText(report, user);
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
  return true;
}

export function getWeeklyQrText(report, user) {
  const sum = report.summary;
  const currency = user?.locale?.currency || 'USD';
  return [
    'Macadam Weekly Stats',
    `${report.startDate} to ${report.endDate}`,
    `Gross ${currency} ${sum.gross.toFixed(2)}`,
    `Net ${currency} ${sum.net.toFixed(2)}`,
    `Shifts ${sum.shiftCount}`,
    `Hours ${sum.hours.toFixed(1)}`,
  ].join(' | ');
}

export function buildPrintDocument(report, template, user) {
  return {
    createdAt: new Date().toISOString(),
    report,
    template,
    summaryText: buildSummaryText(report, user),
  };
}

export function getYearInReviewModel(year, annualReport) {
  return {
    title: `Year in Review ${year}`,
    year,
    generatedAt: formatDate(new Date(), 'YYYY-MM-DD HH:mm'),
    summary: annualReport.summary,
  };
}

export function exportYearInReviewPng(dataUrl, year) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = `macadam-year-in-review-${year}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export async function exportTaxSummaryJson(year = new Date().getFullYear()) {
  const report = await getAnnualReport(year);
  const payload = {
    year,
    generatedAt: new Date().toISOString(),
    gross: report.summary.gross,
    expenses: report.summary.expenseTotal,
    net: report.summary.net,
    distanceKm: report.summary.distanceKm,
    notes: 'Planning-grade tax export. Verify with accountant.',
  };
  downloadTextFile(`macadam-tax-summary-${year}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export async function exportTaxSummaryCsv(year = new Date().getFullYear()) {
  const report = await getAnnualReport(year);
  const rows = [
    ['metric', 'value'],
    ['year', year],
    ['gross', report.summary.gross],
    ['expenses', report.summary.expenseTotal],
    ['net', report.summary.net],
    ['distance_km', report.summary.distanceKm],
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  downloadTextFile(`macadam-tax-summary-${year}.csv`, csv, 'text/csv;charset=utf-8');
}

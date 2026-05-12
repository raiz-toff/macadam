import { db, softDelete } from '../../core/db.js';
import { bus, EXPENSE_SAVED, SHIFT_SAVED, XP_EARNED } from '../../core/events.js';
import { store } from '../../core/store.js';
import { calcEVCost, calcFuelCost } from '../../utils/calculations.js';
import { t } from '../../utils/strings.js';
import { renderEmptyState, showModal, showToast } from '../../ui/components.js';
import { ExpenseCategoryRegistry } from '../../registry/expense-categories/index.js';
import { renderExpenseForm } from './expense-form.js';

const APP_STATE_CUSTOM_CATEGORIES_KEY = 'expense_custom_categories';
const AUTO_EXPENSE_SOURCES = new Set(['auto_fuel', 'auto_ev']);

function nowIso() {
  return new Date().toISOString();
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dollarsToCents(v) {
  if (v == null || v === '') return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function resolveExpenseProvinceId(input) {
  if (typeof input.provinceId === 'string' && input.provinceId.trim()) return input.provinceId.trim().toUpperCase();
  const user = /** @type {{ provinceId?: string } | null} */ (store.get('user'));
  if (user?.provinceId) return String(user.provinceId).toUpperCase();
  return 'ON';
}

function normalizeExpenseInput(input) {
  const now = nowIso();
  const date = typeof input.date === 'string' && input.date ? input.date : ymd(new Date());
  const category = String(input.category || 'other');
  const recurring = Boolean(input.isRecurring);
  const amountRaw = input.amount != null ? input.amount : input.amountCents;
  const amount =
    input.amountCents != null && Number.isFinite(Number(input.amountCents))
      ? Math.max(0, Math.round(Number(input.amountCents)))
      : dollarsToCents(amountRaw);
  const businessPct = Math.max(0, Math.min(100, num(input.businessPct, 100)));
  const provinceId = resolveExpenseProvinceId(input);
  const hstPaidRaw = input.hstPaid != null ? input.hstPaid : input.hstItcAmount;
  const hstPaid = Math.max(0, dollarsToCents(hstPaidRaw));
  const confirmedPaid =
    input.confirmedPaid != null ? Boolean(input.confirmedPaid) : !recurring;

  /** @type {Record<string, unknown>} */
  const row = {
    category,
    customCategory: String(input.customCategory || ''),
    amount,
    businessPct,
    date,
    provinceId,
    platformId: input.platformId == null || input.platformId === 'all' ? null : String(input.platformId),
    notes: String(input.notes || ''),
    receiptData: typeof input.receiptData === 'string' ? input.receiptData : null,
    isRecurring: recurring,
    recurringInterval: recurring ? String(input.recurringInterval || 'monthly') : null,
    recurringNextDate: recurring ? String(input.recurringNextDate || date) : null,
    hstPaid,
    confirmedPaid,
    deletedAt: null,
    createdAt: input.createdAt || now,
    updatedAt: now,
    source: typeof input.source === 'string' ? input.source : 'manual',
    shiftId: input.shiftId == null ? null : Number(input.shiftId),
  };
  return row;
}

function addInterval(dateStr, interval) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (interval === 'weekly') d.setDate(d.getDate() + 7);
  else if (interval === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return ymd(d);
}

function fmtMoney(v) {
  const user = store.get('user');
  const sym = user?.locale?.currencySymbol || '$';
  return `${sym}${(num(v) / 100).toFixed(2)}`;
}

function categoryLabel(row) {
  const id = String(row.category || '');
  const key = `expenses.categories.${id}`;
  const val = t(key);
  if (val !== key) return val;
  return id || t('expenses.uncategorized');
}

/**
 * @param {Record<string, unknown>} expenseData
 */
export async function saveExpense(expenseData) {
  const row = normalizeExpenseInput(expenseData);
  const id = await db.expenses.add(row);
  bus.emit(EXPENSE_SAVED, { id });
  bus.emit(XP_EARNED, { action: 'expense_saved', xp: 3 });
  return id;
}

/**
 * @param {number} id
 * @param {Record<string, unknown>} patch
 */
export async function updateExpense(id, patch) {
  const prev = await db.expenses.get(id);
  if (!prev) throw new Error('expense:not_found');
  const next = normalizeExpenseInput({ ...prev, ...patch, createdAt: prev.createdAt });
  await db.expenses.put({ ...next, id });
  bus.emit(EXPENSE_SAVED, { id });
  return id;
}

/** @param {number} id */
export async function deleteExpense(id) {
  await softDelete('expenses', id);
  bus.emit(EXPENSE_SAVED, { id, deleted: true });
}

export async function generateRecurringExpenses() {
  const today = ymd(new Date());
  const recurring = await db.expenses
    .filter((e) => e.deletedAt == null && e.isRecurring === true && typeof e.recurringNextDate === 'string')
    .toArray();
  let created = 0;
  for (const row of recurring) {
    if (String(row.recurringNextDate) > today) continue;
    const nextDate = String(row.recurringNextDate);
    // Non-destructive behavior: never mutate historical entries, generate next item only if missing.
    const existing = await db.expenses
      .filter(
        (e) =>
          e.deletedAt == null &&
          e.source === 'recurring' &&
          e.date === nextDate &&
          e.category === row.category &&
          e.amount === row.amount &&
          (e.platformId || null) === (row.platformId || null),
      )
      .first();
    if (!existing) {
      await db.expenses.add(
        normalizeExpenseInput({
          ...row,
          id: undefined,
          date: nextDate,
          recurringNextDate: null,
          isRecurring: false,
          source: 'recurring',
        }),
      );
      created += 1;
    }
    const updatedNext = addInterval(nextDate, String(row.recurringInterval || 'monthly'));
    await db.expenses.update(row.id, { recurringNextDate: updatedNext, updatedAt: nowIso() });
  }
  if (created > 0) bus.emit(EXPENSE_SAVED, { recurringGenerated: created });
  return created;
}

export async function calcAutoFuelCost(vehicleId, distanceKm) {
  const vehicle = await db.vehicles.get(Number(vehicleId));
  if (!vehicle) return 0;
  const dollars = calcFuelCost(distanceKm, vehicle.fuelEfficiency, vehicle.currentFuelPrice);
  return Math.round(num(dollars) * 100);
}

export async function calcAutoEVCost(vehicleId, distanceKm) {
  const vehicle = await db.vehicles.get(Number(vehicleId));
  if (!vehicle) return 0;
  const dollars = calcEVCost(distanceKm, vehicle.kwPer100km, vehicle.electricityRate);
  return Math.round(num(dollars) * 100);
}

export async function getMonthlyExpenseByCategory(month, year) {
  const mm = String(month).padStart(2, '0');
  const prefix = `${year}-${mm}-`;
  const rows = await db.expenses.filter((e) => e.deletedAt == null && String(e.date || '').startsWith(prefix)).toArray();
  /** @type {Record<string, number>} */
  const out = {};
  for (const row of rows) {
    const key = String(row.category || 'other');
    out[key] = (out[key] || 0) + num(row.amount) * (num(row.businessPct, 100) / 100);
  }
  return out;
}

export async function getTotalExpensesForPeriod(startDate, endDate, platformId) {
  const rows = await db.expenses
    .filter(
      (e) =>
        e.deletedAt == null &&
        String(e.date || '') >= startDate &&
        String(e.date || '') <= endDate &&
        (platformId ? String(e.platformId || '') === String(platformId) : true),
    )
    .toArray();
  return rows.reduce((sum, row) => sum + num(row.amount) * (num(row.businessPct, 100) / 100), 0);
}

export async function getExpenseRatio(startDate, endDate) {
  const expenseTotal = await getTotalExpensesForPeriod(startDate, endDate);
  const shifts = await db.shifts
    .filter((s) => s.deletedAt == null && String(s.date || '') >= startDate && String(s.date || '') <= endDate)
    .toArray();
  const gross = shifts.reduce((sum, s) => {
    const raw = s.grossEarnings ?? s.gross;
    return sum + (s.grossEarnings != null ? num(raw) : Math.round(num(raw) * 100));
  }, 0);
  if (gross <= 0) return 0;
  return (expenseTotal / gross) * 100;
}

export async function updateFuelPrice(vehicleId, price) {
  const row = {
    vehicleId: Number(vehicleId),
    price: Math.max(0, num(price)),
    date: nowIso(),
    notes: '',
  };
  await db.fuelPrices.add(row);
  await db.vehicles.update(Number(vehicleId), { currentFuelPrice: row.price, updatedAt: nowIso() });
}

export async function getAllCategories() {
  const prov = /** @type {{ expenseCategories?: Array<{ id: string; labelKey: string }> } | null} */ (
    store.get('provinceDef')
  );
  const preset = ExpenseCategoryRegistry.getAll().map((c) => ({
    id: c.id,
    emoji: c.emoji,
    name: t(`expenses.categories.${c.id}`),
    custom: false,
  }));
  let base = preset;
  if (Array.isArray(prov?.expenseCategories) && prov.expenseCategories.length) {
    const presetById = new Map(preset.map((c) => [c.id, c]));
    const seen = new Set();
    const fromProv = prov.expenseCategories.map((c) => {
      seen.add(c.id);
      const p = presetById.get(c.id);
      return {
        id: c.id,
        emoji: p?.emoji || '🧾',
        name: typeof c.labelKey === 'string' ? t(c.labelKey) : c.id,
        custom: false,
      };
    });
    base = [...fromProv, ...preset.filter((c) => !seen.has(c.id))];
  }
  const row = await db.appState.get(APP_STATE_CUSTOM_CATEGORIES_KEY);
  let custom = [];
  try {
    custom = row?.value ? JSON.parse(row.value) : [];
  } catch {
    custom = [];
  }
  if (!Array.isArray(custom)) custom = [];
  return [
    ...base,
    ...custom
      .filter((c) => c && typeof c.id === 'string')
      .map((c) => ({ id: c.id, name: c.name || c.id, emoji: c.emoji || '🧾', custom: true })),
  ];
}

export async function addCustomCategory(name, emoji) {
  const nm = String(name || '').trim();
  if (!nm) throw new Error('category:name_required');
  const id = `custom_${nm.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  const current = await getAllCategories();
  if (current.some((c) => c.id === id)) return id;
  const row = await db.appState.get(APP_STATE_CUSTOM_CATEGORIES_KEY);
  let arr = [];
  try {
    arr = row?.value ? JSON.parse(row.value) : [];
  } catch {
    arr = [];
  }
  if (!Array.isArray(arr)) arr = [];
  arr.push({ id, name: nm, emoji: emoji || '🧾' });
  await db.appState.put({ key: APP_STATE_CUSTOM_CATEGORIES_KEY, value: JSON.stringify(arr), updatedAt: nowIso() });
  return id;
}

async function maybeCreateAutoExpenseFromShift(shiftId) {
  const shift = await db.shifts.get(shiftId);
  if (!shift || shift.deletedAt != null) return;
  if (!shift.vehicleId || !num(shift.distanceKm)) return;

  const vehicle = await db.vehicles.get(Number(shift.vehicleId));
  if (!vehicle || vehicle.active === false) return;

  const prior = await db.expenses
    .filter((e) => e.deletedAt == null && Number(e.shiftId) === Number(shiftId) && AUTO_EXPENSE_SOURCES.has(String(e.source || '')))
    .first();
  if (prior) return;

  const isEv = String(vehicle.type || '').toLowerCase() === 'ev';
  const amountCents = isEv
    ? await calcAutoEVCost(vehicle.id, num(shift.distanceKm))
    : await calcAutoFuelCost(vehicle.id, num(shift.distanceKm));
  if (amountCents <= 0) return;

  const categories = await getAllCategories();
  const formApi = renderExpenseForm({
    initial: {
      category: 'fuel',
      amount: amountCents / 100,
      date: shift.date,
      platformId: shift.platformId,
      businessPct: 100,
      notes: t('expenses.autoExpenseNote').replace('{shiftId}', String(shiftId)),
    },
    categories,
    platforms: (store.get('platforms') || []).map((p) => ({ id: String(p.id), name: p.name || p.id })),
    isHstRegistered: Boolean(store.get('user')?.hstRegistered),
    currencySymbol: store.get('user')?.locale?.currencySymbol || '$',
    submitLabel: t('expenses.confirmAutoExpense'),
  });

  const handle = showModal({
    title: t('expenses.autoExpenseTitle'),
    content: formApi.el,
    actions: [],
  });
  const formEl = formApi.el.querySelector('form');
  if (!formEl) return;
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveExpense({
      ...formApi.getValue(),
      source: isEv ? 'auto_ev' : 'auto_fuel',
      shiftId,
    });
    showToast({ type: 'success', message: t('expenses.savedToast'), duration: 1800 });
    handle.close();
  });
}

let autoWired = false;
export function initExpensesModule() {
  if (autoWired) return;
  autoWired = true;
  bus.on(SHIFT_SAVED, (data) => {
    const id = Number(data?.id);
    if (!Number.isFinite(id) || id <= 0) return;
    void maybeCreateAutoExpenseFromShift(id);
  });
}

async function listExpenses(filters = {}, sort = { key: 'date', dir: 'desc' }) {
  const rows = await db.expenses.filter((e) => e.deletedAt == null).toArray();
  const filtered = rows.filter((e) => {
    if (filters.category && String(e.category) !== String(filters.category)) return false;
    if (filters.platformId && String(e.platformId || '') !== String(filters.platformId || '')) return false;
    if (filters.minAmount != null && num(e.amount) < num(filters.minAmount) * 100) return false;
    if (filters.maxAmount != null && num(e.amount) > num(filters.maxAmount) * 100) return false;
    if (filters.receiptOnly && !e.receiptData) return false;
    if (filters.startDate && String(e.date || '') < String(filters.startDate)) return false;
    if (filters.endDate && String(e.date || '') > String(filters.endDate)) return false;
    return true;
  });
  filtered.sort((a, b) => {
    const av = a[sort.key];
    const bv = b[sort.key];
    const cmp =
      typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
    return sort.dir === 'asc' ? cmp : -cmp;
  });
  return filtered;
}

export async function renderExpensesView(root) {
  const categories = await getAllCategories();
  const user = store.get('user');
  const platformRows = (store.get('platforms') || []).map((p) => ({ id: String(p.id), name: String(p.name || p.id) }));
  const catOptions = categories
    .map((c) => `<option value="${esc(c.id)}">${esc(c.emoji || '🧾')} ${esc(c.name)}</option>`)
    .join('');
  const platformOptions = platformRows
    .map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`)
    .join('');

  root.innerHTML = `
    <section class="expenses-view">
      <header class="expenses-view-header">
        <div>
          <h1 class="expenses-view-title">${esc(t('expenses.title'))}</h1>
          <p class="expenses-view-subtitle">${esc(t('expenses.subtitle'))}</p>
        </div>
        <div class="expenses-view-header-actions">
          <button type="button" class="btn btn-primary" data-action="new-expense">${esc(t('expenses.add'))}</button>
        </div>
      </header>

      <section class="expenses-filters card">
        <div class="expenses-filters-grid">
          <label class="field"><span class="field-label">${esc(t('expenses.filterStartDate'))}</span><input class="input" type="date" name="startDate" /></label>
          <label class="field"><span class="field-label">${esc(t('expenses.filterEndDate'))}</span><input class="input" type="date" name="endDate" /></label>
          <label class="field"><span class="field-label">${esc(t('expenses.category'))}</span><select class="select" name="category"><option value="">${esc(t('common.all'))}</option>${catOptions}</select></label>
          <label class="field"><span class="field-label">${esc(t('expenses.platformAssignment'))}</span><select class="select" name="platformId"><option value="">${esc(t('common.all'))}</option>${platformOptions}</select></label>
          <label class="field"><span class="field-label">${esc(t('expenses.minAmount'))}</span><input class="input" type="number" step="0.01" min="0" name="minAmount" /></label>
          <label class="field"><span class="field-label">${esc(t('expenses.maxAmount'))}</span><input class="input" type="number" step="0.01" min="0" name="maxAmount" /></label>
          <label class="toggle"><input type="checkbox" name="receiptOnly" /><span class="toggle-track"><span class="toggle-thumb"></span></span><span>${esc(
            t('expenses.receiptOnly'),
          )}</span></label>
          <label class="field"><span class="field-label">${esc(t('common.sort'))}</span><select class="select" name="sortKey">
            <option value="date_desc">${esc(t('expenses.sortDateDesc'))}</option>
            <option value="date_asc">${esc(t('expenses.sortDateAsc'))}</option>
            <option value="amount_desc">${esc(t('expenses.sortAmountDesc'))}</option>
            <option value="amount_asc">${esc(t('expenses.sortAmountAsc'))}</option>
            <option value="category_asc">${esc(t('expenses.sortCategory'))}</option>
            <option value="platform_asc">${esc(t('expenses.sortPlatform'))}</option>
          </select></label>
        </div>
      </section>
      <div class="expenses-list-wrap">
        <table class="expenses-table">
          <thead><tr>
            <th>${esc(t('expenses.date'))}</th>
            <th>${esc(t('expenses.category'))}</th>
            <th>${esc(t('expenses.platformAssignment'))}</th>
            <th>${esc(t('expenses.amount'))}</th>
            <th>${esc(t('expenses.receipt'))}</th>
            <th>${esc(t('common.edit'))}</th>
          </tr></thead>
          <tbody data-slot="rows"></tbody>
        </table>
      </div>
    </section>
  `;

  const rowsSlot = root.querySelector('[data-slot="rows"]');
  const controls = {
    startDate: root.querySelector('[name="startDate"]'),
    endDate: root.querySelector('[name="endDate"]'),
    category: root.querySelector('[name="category"]'),
    platformId: root.querySelector('[name="platformId"]'),
    minAmount: root.querySelector('[name="minAmount"]'),
    maxAmount: root.querySelector('[name="maxAmount"]'),
    receiptOnly: root.querySelector('[name="receiptOnly"]'),
    sortKey: root.querySelector('[name="sortKey"]'),
  };

  async function refreshRows() {
    const [sortField, sortDir] = String(controls.sortKey?.value || 'date_desc').split('_');
    const sortKey = sortField === 'amount' ? 'amount' : sortField === 'category' ? 'category' : sortField === 'platform' ? 'platformId' : 'date';
    const rows = await listExpenses(
      {
        startDate: controls.startDate?.value || '',
        endDate: controls.endDate?.value || '',
        category: controls.category?.value || '',
        platformId: controls.platformId?.value || '',
        minAmount: controls.minAmount?.value || null,
        maxAmount: controls.maxAmount?.value || null,
        receiptOnly: Boolean(controls.receiptOnly?.checked),
      },
      { key: sortKey, dir: sortDir === 'asc' ? 'asc' : 'desc' },
    );
    if (!rowsSlot) return;
    if (!rows.length) {
      rowsSlot.innerHTML = `<tr><td colspan="6">${renderEmptyState({
        title: t('expenses.emptyTitle'),
        message: t('expenses.emptyMessage'),
      })}</td></tr>`;
      return;
    }
    rowsSlot.innerHTML = rows
      .map((row) => {
        const platformLabel = row.platformId ? String(row.platformId) : t('app.platformAll');
        return `<tr data-expense-id="${esc(row.id)}">
          <td>${esc(row.date)}</td>
          <td>${esc(categoryLabel(row))}</td>
          <td>${esc(platformLabel)}</td>
          <td>${esc(fmtMoney(num(row.amount) * (num(row.businessPct, 100) / 100)))}</td>
          <td>${row.receiptData ? '📷' : '—'}</td>
          <td class="expenses-row-actions">
            <button type="button" class="btn btn-ghost btn-sm" data-action="edit">${esc(t('common.edit'))}</button>
            <button type="button" class="btn btn-ghost btn-sm btn-danger" data-action="delete">${esc(t('common.delete'))}</button>
          </td>
        </tr>`;
      })
      .join('');
  }

  root.addEventListener('input', () => {
    void refreshRows();
  });

  root.addEventListener('click', async (e) => {
    const target = e.target instanceof HTMLElement ? e.target.closest('[data-action],[data-expense-id]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'new-expense') {
      await openExpenseEditor({
        categories,
        platformRows,
        isHstRegistered: Boolean(user?.hstRegistered),
        currencySymbol: user?.locale?.currencySymbol || '$',
        onSave: saveExpense,
      });
      await refreshRows();
      return;
    }
    const rowEl = target.closest('[data-expense-id]');
    const id = Number(rowEl?.getAttribute('data-expense-id'));
    if (!Number.isFinite(id) || id <= 0) return;
    if (action === 'edit') {
      const row = await db.expenses.get(id);
      if (!row) return;
      await openExpenseEditor({
        initial: row,
        categories,
        platformRows,
        isHstRegistered: Boolean(user?.hstRegistered),
        currencySymbol: user?.locale?.currencySymbol || '$',
        onSave: async (payload) => updateExpense(id, payload),
      });
      await refreshRows();
    }
    if (action === 'delete') {
      await deleteExpense(id);
      showToast({ type: 'success', message: t('expenses.deletedToast'), duration: 1800 });
      await refreshRows();
    }
  });

  const off = bus.on(EXPENSE_SAVED, () => {
    void refreshRows();
  });
  root.addEventListener(
    'remove',
    () => {
      off();
    },
    { once: true },
  );

  await refreshRows();
}

async function openExpenseEditor({ initial = {}, categories, platformRows, isHstRegistered, currencySymbol, onSave }) {
  const formApi = renderExpenseForm({
    initial,
    categories,
    platforms: platformRows,
    isHstRegistered,
    currencySymbol,
    onCancel: () => handle.close(),
  });
  const handle = showModal({
    title: initial.id ? t('expenses.editTitle') : t('expenses.add'),
    content: formApi.el,
    actions: [],
  });
  const form = formApi.el.querySelector('form');
  if (!form) return;
  await new Promise((resolve) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await onSave(formApi.getValue());
      showToast({ type: 'success', message: t('expenses.savedToast'), duration: 1800 });
      handle.close();
      resolve(null);
    });
    form.addEventListener('reset', () => resolve(null), { once: true });
  });
}

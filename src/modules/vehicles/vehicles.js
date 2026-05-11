import { db } from '../../core/db.js';
import { bus, EXPENSE_SAVED } from '../../core/events.js';
import { store } from '../../core/store.js';
import { calcDepreciation, calcVehicleCostPerKm } from '../../utils/calculations.js';
import { t } from '../../utils/strings.js';
import { renderEmptyState, showModal, showToast } from '../../ui/components.js';

const APP_STATE_ODOMETER_KEY = 'vehicle_odometer_logs';

function nowIso() {
  return new Date().toISOString();
}

function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function money(v) {
  const sym = store.get('user')?.locale?.currencySymbol || '$';
  return `${sym}${num(v).toFixed(2)}`;
}

function fixed(v, decimals = 1) {
  return num(v).toFixed(decimals);
}

/**
 * @param {Record<string, unknown>} input
 */
function normalizeVehicleInput(input) {
  const ts = nowIso();
  const type = String(input.type || 'gas').toLowerCase();
  return {
    nickname: String(input.nickname || '').trim() || 'Vehicle',
    type,
    make: String(input.make || '').trim(),
    model: String(input.model || '').trim(),
    year: Number.isFinite(Number(input.year)) ? Number(input.year) : null,
    fuelEfficiency: Math.max(0, num(input.fuelEfficiency, 0)),
    currentFuelPrice: Math.max(0, num(input.currentFuelPrice, 0)),
    kwPer100km: Math.max(0, num(input.kwPer100km, 0)),
    electricityRate: Math.max(0, num(input.electricityRate, 0)),
    maintenanceCostPerKm: Math.max(0, num(input.maintenanceCostPerKm, 0)),
    purchasePrice: Math.max(0, num(input.purchasePrice, 0)),
    expectedLifespanKm: Math.max(0, num(input.expectedLifespanKm, 0)),
    estimatedAnnualKm: Math.max(1, num(input.estimatedAnnualKm, 20000)),
    active: input.active !== false,
    updatedAt: ts,
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : ts,
    insuranceRenewalDate: String(input.insuranceRenewalDate || ''),
    insuranceAmount: Math.max(0, num(input.insuranceAmount, 0)),
    registrationRenewalDate: String(input.registrationRenewalDate || ''),
    registrationAmount: Math.max(0, num(input.registrationAmount, 0)),
    oilChangeIntervalKm: Math.max(0, num(input.oilChangeIntervalKm, 8000)),
    lastOilChangeOdometerKm: Math.max(0, num(input.lastOilChangeOdometerKm, 0)),
    tireTreadMm: Math.max(0, num(input.tireTreadMm, 7)),
    tireTreadMinMm: Math.max(0, num(input.tireTreadMinMm, 3)),
    totalKmLogged: Math.max(0, num(input.totalKmLogged, 0)),
  };
}

/** @param {Record<string, unknown>} row */
function vehicleLabel(row) {
  const bits = [row.nickname || '', row.make || '', row.model || '', row.year || ''].filter(Boolean);
  return bits.join(' ').trim() || 'Vehicle';
}

async function getOdometerLog() {
  const row = await db.appState.get(APP_STATE_ODOMETER_KEY);
  try {
    const parsed = row?.value ? JSON.parse(row.value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function putOdometerLog(items) {
  await db.appState.put({
    key: APP_STATE_ODOMETER_KEY,
    value: JSON.stringify(items),
    updatedAt: nowIso(),
  });
}

function calcVehicleStats(vehicle, expenses, maintenanceRows, shifts) {
  const annualExpenses =
    expenses.reduce((sum, e) => sum + num(e.amount) * (num(e.businessPct, 100) / 100), 0) +
    maintenanceRows.reduce((sum, m) => sum + num(m.cost), 0);
  const costPerKm = calcVehicleCostPerKm(
    { estimatedAnnualKm: Math.max(1, num(vehicle.estimatedAnnualKm, vehicle.totalKmLogged || 1)) },
    { totalAnnual: annualExpenses },
  );
  const depreciation = calcDepreciation(vehicle.purchasePrice, vehicle.expectedLifespanKm, vehicle.totalKmLogged);
  const shiftKm = shifts.reduce((sum, s) => sum + num(s.distanceKm), 0);
  const shiftCount = shifts.length;
  return { annualExpenses, costPerKm, depreciation, shiftKm, shiftCount };
}

async function listVehicles() {
  const rows = await db.vehicles.toArray();
  return rows.filter((v) => v.active !== false).sort((a, b) => Number(a.id) - Number(b.id));
}

async function syncRecurringExpense(vehicleId, kind, date, amount) {
  if (!date || amount <= 0) return;
  const cat = kind === 'insurance' ? 'insurance' : 'registration';
  const existing = await db.expenses
    .filter(
      (e) =>
        e.deletedAt == null &&
        e.source === `vehicle_${kind}` &&
        String(e.date || '') === date &&
        String(e.category || '') === cat &&
        Number(e.vehicleId || 0) === Number(vehicleId),
    )
    .first();
  if (existing) return;
  await db.expenses.add({
    category: cat,
    customCategory: '',
    amount: Math.max(0, num(amount)),
    businessPct: 100,
    date,
    platformId: null,
    notes: `Auto-created from vehicle ${kind} renewal`,
    receiptData: null,
    isRecurring: true,
    recurringInterval: 'annual',
    recurringNextDate: date,
    hstItcAmount: 0,
    deletedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: `vehicle_${kind}`,
    shiftId: null,
    vehicleId: Number(vehicleId),
  });
  bus.emit(EXPENSE_SAVED, { source: `vehicle_${kind}` });
}

async function openVehicleEditor(initial = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <form class="vehicles-form">
      <label class="field"><span class="field-label">Nickname</span><input class="input" name="nickname" value="${esc(initial.nickname || '')}" required /></label>
      <label class="field"><span class="field-label">Type</span>
        <select class="select" name="type">
          <option value="gas" ${String(initial.type || 'gas') === 'gas' ? 'selected' : ''}>${esc(t('vehicles.fuel'))}</option>
          <option value="ev" ${String(initial.type || '') === 'ev' ? 'selected' : ''}>${esc(t('vehicles.ev'))}</option>
          <option value="hybrid" ${String(initial.type || '') === 'hybrid' ? 'selected' : ''}>Hybrid</option>
          <option value="bicycle" ${String(initial.type || '') === 'bicycle' ? 'selected' : ''}>Bicycle</option>
        </select>
      </label>
      <label class="field"><span class="field-label">Make</span><input class="input" name="make" value="${esc(initial.make || '')}" /></label>
      <label class="field"><span class="field-label">Model</span><input class="input" name="model" value="${esc(initial.model || '')}" /></label>
      <label class="field"><span class="field-label">Year</span><input class="input" type="number" min="1990" max="2100" name="year" value="${esc(initial.year || '')}" /></label>
      <label class="field"><span class="field-label">Fuel L/100km</span><input class="input" type="number" min="0" step="0.1" name="fuelEfficiency" value="${esc(initial.fuelEfficiency || '')}" /></label>
      <label class="field"><span class="field-label">kWh/100km</span><input class="input" type="number" min="0" step="0.1" name="kwPer100km" value="${esc(initial.kwPer100km || '')}" /></label>
      <label class="field"><span class="field-label">Fuel or charge price</span><input class="input" type="number" min="0" step="0.01" name="currentFuelPrice" value="${esc(initial.currentFuelPrice || '')}" /></label>
      <label class="field"><span class="field-label">Electricity rate</span><input class="input" type="number" min="0" step="0.01" name="electricityRate" value="${esc(initial.electricityRate || '')}" /></label>
      <label class="field"><span class="field-label">Estimated annual km</span><input class="input" type="number" min="1" step="1" name="estimatedAnnualKm" value="${esc(initial.estimatedAnnualKm || 20000)}" /></label>
      <label class="field"><span class="field-label">Purchase price</span><input class="input" type="number" min="0" step="0.01" name="purchasePrice" value="${esc(initial.purchasePrice || '')}" /></label>
      <label class="field"><span class="field-label">Expected lifespan (km)</span><input class="input" type="number" min="1" step="1" name="expectedLifespanKm" value="${esc(initial.expectedLifespanKm || '')}" /></label>
      <label class="field"><span class="field-label">Insurance renewal date</span><input class="input" type="date" name="insuranceRenewalDate" value="${esc(initial.insuranceRenewalDate || '')}" /></label>
      <label class="field"><span class="field-label">Insurance amount</span><input class="input" type="number" min="0" step="0.01" name="insuranceAmount" value="${esc(initial.insuranceAmount || '')}" /></label>
      <label class="field"><span class="field-label">Registration renewal date</span><input class="input" type="date" name="registrationRenewalDate" value="${esc(initial.registrationRenewalDate || '')}" /></label>
      <label class="field"><span class="field-label">Registration amount</span><input class="input" type="number" min="0" step="0.01" name="registrationAmount" value="${esc(initial.registrationAmount || '')}" /></label>
      <label class="field"><span class="field-label">Oil change interval (km)</span><input class="input" type="number" min="0" step="100" name="oilChangeIntervalKm" value="${esc(initial.oilChangeIntervalKm || 8000)}" /></label>
      <label class="field"><span class="field-label">Last oil change odometer (km)</span><input class="input" type="number" min="0" step="1" name="lastOilChangeOdometerKm" value="${esc(initial.lastOilChangeOdometerKm || 0)}" /></label>
      <label class="field"><span class="field-label">Current tire tread (mm)</span><input class="input" type="number" min="0" step="0.1" name="tireTreadMm" value="${esc(initial.tireTreadMm || 7)}" /></label>
      <label class="field"><span class="field-label">Minimum tire tread (mm)</span><input class="input" type="number" min="0" step="0.1" name="tireTreadMinMm" value="${esc(initial.tireTreadMinMm || 3)}" /></label>
    </form>
  `;
  const form = /** @type {HTMLFormElement | null} */ (wrap.querySelector('form'));
  if (!form) return null;
  return new Promise((resolve) => {
    const handle = showModal({
      title: initial.id ? t('vehicles.edit') : t('vehicles.add'),
      content: wrap,
      actions: [
        { label: t('common.cancel'), class: 'btn btn-ghost', onClick: () => resolve(null) },
        {
          label: t('common.save'),
          class: 'btn btn-primary',
          onClick: () => {
            const fd = new FormData(form);
            const raw = Object.fromEntries(fd.entries());
            resolve({ ...initial, ...raw, active: true });
          },
        },
      ],
      onClose: () => resolve(null),
    });
    void handle;
  });
}

async function addMaintenanceLog(vehicleId, defaults = {}) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <form>
      <label class="field"><span class="field-label">Date</span><input class="input" type="date" name="date" value="${esc(defaults.date || ymd())}" required /></label>
      <label class="field"><span class="field-label">Service</span><input class="input" name="serviceType" value="${esc(defaults.serviceType || '')}" required /></label>
      <label class="field"><span class="field-label">Cost</span><input class="input" type="number" min="0" step="0.01" name="cost" value="${esc(defaults.cost || '')}" /></label>
      <label class="field"><span class="field-label">Odometer (km)</span><input class="input" type="number" min="0" step="1" name="odometerKm" value="${esc(defaults.odometerKm || '')}" /></label>
      <label class="field"><span class="field-label">Notes</span><textarea class="input" name="notes">${esc(defaults.notes || '')}</textarea></label>
    </form>
  `;
  const form = /** @type {HTMLFormElement | null} */ (wrap.querySelector('form'));
  if (!form) return false;
  return new Promise((resolve) => {
    showModal({
      title: t('vehicles.maintenance'),
      content: wrap,
      actions: [
        { label: t('common.cancel'), class: 'btn btn-ghost', onClick: () => resolve(false) },
        {
          label: t('common.save'),
          class: 'btn btn-primary',
          onClick: async () => {
            const fd = new FormData(form);
            await db.vehicleMaintenanceLogs.add({
              vehicleId: Number(vehicleId),
              date: String(fd.get('date') || ymd()),
              serviceType: String(fd.get('serviceType') || ''),
              cost: Math.max(0, num(fd.get('cost'), 0)),
              odometerKm: Math.max(0, num(fd.get('odometerKm'), 0)),
              notes: String(fd.get('notes') || ''),
              createdAt: nowIso(),
              updatedAt: nowIso(),
            });
            resolve(true);
          },
        },
      ],
      onClose: () => resolve(false),
    });
  });
}

async function addOdometerEntry(vehicleId) {
  const val = window.prompt('Current odometer (km):', '');
  if (val == null) return false;
  const km = Math.max(0, num(val));
  const all = await getOdometerLog();
  all.push({ vehicleId: Number(vehicleId), km, date: ymd(), createdAt: nowIso() });
  await putOdometerLog(all.slice(-1000));
  await db.vehicles.update(Number(vehicleId), { totalKmLogged: km, updatedAt: nowIso() });
  return true;
}

/** @param {HTMLElement} root */
export async function renderVehiclesView(root) {
  root.innerHTML = `
    <section class="vehicles-view">
      <header class="expenses-view-header">
        <div>
          <h1 class="expenses-view-title">${esc(t('vehicles.title'))}</h1>
          <p class="expenses-view-subtitle">Vehicle profiles, mileage logs, upkeep reminders, and per-km economics.</p>
        </div>
        <div class="expenses-view-header-actions">
          <button type="button" class="btn btn-primary" data-action="add-vehicle">${esc(t('vehicles.add'))}</button>
        </div>
      </header>
      <div data-slot="cards"></div>
      <section class="card" data-slot="compare"></section>
    </section>
  `;

  const cards = /** @type {HTMLElement | null} */ (root.querySelector('[data-slot="cards"]'));
  const compare = /** @type {HTMLElement | null} */ (root.querySelector('[data-slot="compare"]'));

  const refresh = async () => {
    const vehicles = await listVehicles();
    const today = ymd();
    if (!cards) return;
    if (!vehicles.length) {
      cards.innerHTML = renderEmptyState({
        title: 'No vehicles yet',
        message: 'Add your first vehicle to unlock mileage and cost tracking.',
      });
      if (compare) compare.innerHTML = '';
      return;
    }

    const maintenance = await db.vehicleMaintenanceLogs.toArray();
    const expenses = await db.expenses.filter((e) => e.deletedAt == null).toArray();
    const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();

    const statsRows = [];

    cards.innerHTML = (
      await Promise.all(
        vehicles.map(async (v) => {
          const vMaintenance = maintenance.filter((m) => Number(m.vehicleId) === Number(v.id));
          const vExpenses = expenses.filter((e) => Number(e.vehicleId || 0) === Number(v.id));
          const vShifts = shifts.filter((s) => Number(s.vehicleId || 0) === Number(v.id));
          const stats = calcVehicleStats(v, vExpenses, vMaintenance, vShifts);
          statsRows.push({ id: v.id, label: vehicleLabel(v), ...stats });

          const oilDueAt = num(v.lastOilChangeOdometerKm) + Math.max(1, num(v.oilChangeIntervalKm, 8000));
          const oilRemaining = oilDueAt - num(v.totalKmLogged, 0);
          const treadAlert = num(v.tireTreadMm, 0) <= num(v.tireTreadMinMm, 3);
          const insuranceDue = v.insuranceRenewalDate && String(v.insuranceRenewalDate) <= today;
          const registrationDue = v.registrationRenewalDate && String(v.registrationRenewalDate) <= today;
          const reminders = [
            oilRemaining <= 0 ? 'Oil change due' : '',
            treadAlert ? 'Tire tread below threshold' : '',
            insuranceDue ? 'Insurance renewal due' : '',
            registrationDue ? 'Registration renewal due' : '',
          ].filter(Boolean);

          const maintenanceRecent = vMaintenance
            .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
            .slice(0, 3)
            .map((m) => `${esc(m.date)} · ${esc(m.serviceType || 'Service')} · ${esc(money(m.cost || 0))}`)
            .join('<br/>');

          return `
            <article class="card vehicle-card" data-vehicle-id="${esc(v.id)}">
              <div class="shift-card-top">
                <h3>${esc(vehicleLabel(v))}</h3>
                <span class="badge">${esc(String(v.type || 'vehicle').toUpperCase())}</span>
              </div>
              <p class="text-sm">Efficiency: ${esc(
                String(v.type) === 'ev' ? `${num(v.kwPer100km)} kWh/100km` : `${num(v.fuelEfficiency)} L/100km`,
              )}</p>
              <p class="text-sm">Odometer: ${esc(num(v.totalKmLogged))} km</p>
              <p class="text-sm">Cost per km: ${esc(money(stats.costPerKm))}</p>
              <p class="text-sm">Depreciation estimate: ${esc(money(stats.depreciation))}</p>
              <p class="text-sm">Maintenance (latest): ${maintenanceRecent || 'None yet'}</p>
              <p class="text-sm">Reminders: ${reminders.length ? esc(reminders.join(' · ')) : 'All clear'}</p>
              <div class="shift-card-actions">
                <button type="button" class="btn btn-ghost btn-sm" data-action="edit">${esc(t('common.edit'))}</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="odometer">${esc(t('vehicles.mileage'))}</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="maintenance">${esc(t('vehicles.maintenance'))}</button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="efficiency">${esc(t('vehicles.efficiency'))}</button>
                <button type="button" class="btn btn-ghost btn-sm btn-danger" data-action="archive">${esc(t('common.delete'))}</button>
              </div>
            </article>
          `;
        }),
      )
    ).join('');

    if (compare) {
      statsRows.sort((a, b) => a.costPerKm - b.costPerKm);
      compare.innerHTML = `
        <h3>Multi-vehicle comparison</h3>
        <div class="text-sm">${statsRows
          .map(
            (s, idx) =>
              `${idx + 1}. ${esc(s.label)} — ${esc(money(s.costPerKm))}/km · ${esc(
                money(s.annualExpenses),
              )} annual costs · ${esc(fixed(s.shiftCount ? s.shiftKm / Math.max(1, s.shiftCount) : 0, 1))} km/shift`,
          )
          .join('<br/>')}</div>
      `;
    }
  };

  root.addEventListener('click', async (e) => {
    const el = /** @type {HTMLElement | null} */ (e.target instanceof HTMLElement ? e.target.closest('[data-action],[data-vehicle-id]') : null);
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (action === 'add-vehicle') {
      const payload = await openVehicleEditor();
      if (!payload) return;
      const id = await db.vehicles.add(normalizeVehicleInput(payload));
      await syncRecurringExpense(id, 'insurance', String(payload.insuranceRenewalDate || ''), num(payload.insuranceAmount, 0));
      await syncRecurringExpense(
        id,
        'registration',
        String(payload.registrationRenewalDate || ''),
        num(payload.registrationAmount, 0),
      );
      showToast({ type: 'success', message: 'Vehicle saved', duration: 1800 });
      await refresh();
      return;
    }

    const card = el.closest('[data-vehicle-id]');
    const id = Number(card?.getAttribute('data-vehicle-id'));
    if (!Number.isFinite(id) || id <= 0) return;
    const row = await db.vehicles.get(id);
    if (!row) return;

    if (action === 'edit') {
      const payload = await openVehicleEditor(row);
      if (!payload) return;
      const normalized = normalizeVehicleInput({ ...row, ...payload, createdAt: row.createdAt });
      await db.vehicles.put({ ...normalized, id });
      await syncRecurringExpense(id, 'insurance', String(normalized.insuranceRenewalDate || ''), num(normalized.insuranceAmount, 0));
      await syncRecurringExpense(
        id,
        'registration',
        String(normalized.registrationRenewalDate || ''),
        num(normalized.registrationAmount, 0),
      );
      showToast({ type: 'success', message: 'Vehicle updated', duration: 1800 });
      await refresh();
      return;
    }

    if (action === 'maintenance') {
      const ok = await addMaintenanceLog(id);
      if (ok) {
        showToast({ type: 'success', message: 'Maintenance saved', duration: 1800 });
        await refresh();
      }
      return;
    }

    if (action === 'odometer') {
      const ok = await addOdometerEntry(id);
      if (ok) {
        showToast({ type: 'success', message: 'Odometer updated', duration: 1800 });
        await refresh();
      }
      return;
    }

    if (action === 'efficiency') {
      const nextVal = window.prompt('Enter updated efficiency (L/100km or kWh/100km):', '');
      if (nextVal == null) return;
      const n = Math.max(0, num(nextVal));
      if (String(row.type) === 'ev') await db.vehicles.update(id, { kwPer100km: n, updatedAt: nowIso() });
      else await db.vehicles.update(id, { fuelEfficiency: n, updatedAt: nowIso() });
      showToast({ type: 'success', message: 'Efficiency updated', duration: 1800 });
      await refresh();
      return;
    }

    if (action === 'archive') {
      await db.vehicles.update(id, { active: false, updatedAt: nowIso() });
      showToast({ type: 'success', message: 'Vehicle archived', duration: 1800 });
      await refresh();
    }
  });

  await refresh();
}

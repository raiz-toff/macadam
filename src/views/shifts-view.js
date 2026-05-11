import PapaMod from '../libs/papaparse.min.js';
import { db } from '../core/db.js';
import { bus, SHIFT_DELETED, SHIFT_SAVED } from '../core/events.js';
import { store } from '../core/store.js';
import { t } from '../utils/strings.js';
import { showDrawer, showModal, showToast, initFAB, renderEmptyState } from '../ui/components.js';
import { getPlatformConfig } from '../modules/platforms/platform-config.js';
import { renderShiftForm } from '../modules/shifts/shift-form.js';
import {
  applyTemplate,
  checkHoursWarning,
  deleteShift,
  duplicateShift,
  getTemplates,
  purgeShifts,
  restoreShift,
  restoreShiftTimerFromLocalStorage,
  saveAsTemplate,
  saveShift,
  startShiftTimer,
  stopShiftTimer,
  updateShift,
} from '../modules/shifts/shifts.js';
import { calcHourlyRate } from '../utils/calculations.js';

const Papa = /** @type {any} */ (PapaMod).default || PapaMod;

function escapeAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtMoney(v) {
  const user = store.get('user');
  const sym = user && user.locale && typeof user.locale.currencySymbol === 'string' ? user.locale.currencySymbol : '$';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${sym}${n.toFixed(2)}`;
}

function fmtDuration(mins) {
  const m = Math.max(0, Math.floor(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!m) return '—';
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

function minutesFromShift(s) {
  if (Number.isFinite(Number(s.activeMinutes)) && Number(s.activeMinutes) > 0) return Number(s.activeMinutes);
  if (typeof s.date === 'string' && typeof s.startTime === 'string' && typeof s.endTime === 'string') {
    const start = new Date(`${s.date}T${s.startTime}:00`);
    const end = new Date(`${s.date}T${s.endTime}:00`);
    const ms = end.getTime() - start.getTime();
    if (Number.isFinite(ms) && ms > 0) return Math.round(ms / 60000);
  }
  return 0;
}

/** @type {WeakMap<HTMLElement, () => void>} */
const teardownByRoot = new WeakMap();

async function loadShiftsForView() {
  const platform = String(store.get('activePlatformId') ?? 'all');
  const rows = await db.shifts.toArray();
  const list = rows
    .filter((s) => s.deletedAt == null)
    .filter((s) => platform === 'all' || String(s.platformId) === platform)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id || 0) - Number(a.id || 0));
  return list;
}

function shiftCardHtml(s) {
  const pid = String(s.platformId || 'other');
  const pl = getPlatformConfig(pid);
  const durationMin = minutesFromShift(s);
  const gross = Number(s.gross || 0);
  const hourly = durationMin > 0 ? calcHourlyRate(gross, durationMin) : 0;
  const zone = typeof s.zoneTag === 'string' && s.zoneTag ? s.zoneTag : '';
  const badge = `<span class="shift-badge" data-platform-id="${escapeAttr(pid)}">${escapeHtml(pl.name || pid)}</span>`;
  return `
    <article class="shift-card" data-shift-id="${escapeAttr(String(s.id))}">
      <div class="shift-card-top">
        <div class="shift-card-date">${escapeHtml(String(s.date || ''))}</div>
        <div class="shift-card-platform">${badge}</div>
      </div>
      <div class="shift-card-main">
        <div class="shift-card-metric">
          <div class="shift-card-metric-label">${escapeHtml(t('shifts.gross'))}</div>
          <div class="shift-card-metric-value">${escapeHtml(fmtMoney(gross))}</div>
        </div>
        <div class="shift-card-metric">
          <div class="shift-card-metric-label">${escapeHtml(t('analytics.hourlyRate'))}</div>
          <div class="shift-card-metric-value">${escapeHtml(durationMin ? fmtMoney(hourly) : '—')}</div>
        </div>
        <div class="shift-card-metric">
          <div class="shift-card-metric-label">${escapeHtml(t('shifts.duration'))}</div>
          <div class="shift-card-metric-value">${escapeHtml(fmtDuration(durationMin))}</div>
        </div>
        <div class="shift-card-metric">
          <div class="shift-card-metric-label">${escapeHtml(t('shifts.zone'))}</div>
          <div class="shift-card-metric-value">${escapeHtml(zone || '—')}</div>
        </div>
      </div>
      <div class="shift-card-actions">
        <button type="button" class="btn btn-ghost" data-action="edit">${escapeHtml(t('common.edit'))}</button>
        <button type="button" class="btn btn-ghost" data-action="duplicate">${escapeHtml(t('shifts.duplicateShift'))}</button>
        <button type="button" class="btn btn-ghost btn-danger" data-action="delete">${escapeHtml(t('common.delete'))}</button>
      </div>
    </article>
  `;
}

async function openShiftFormModal({ initial, onSaved, title, mode = 'full', submitLabel }) {
  const formApi = renderShiftForm({
    mode,
    initial,
    submitLabel: submitLabel || t('common.save'),
    onCancel: () => handle.close(),
  });

  const handle = showModal({
    title: title || t('shifts.addShift'),
    content: formApi.el,
    actions: [],
  });

  const formEl = formApi.el.querySelector('form');
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = formApi.getValue();
      try {
        const id = await onSaved(val);
        showToast({ type: 'success', message: t('shifts.savedToast'), duration: 1800 });
        handle.close();
        return id;
      } catch (err) {
        console.warn('[macadam shifts] save failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
    });
  }
}

function mountFabHandlers() {
  initFAB({
    onAdd: () => {
      const drawer = showDrawer({
        title: t('shifts.addShift'),
        content: '',
        snapPoints: [0.65, 0.95],
      });
      const formApi = renderShiftForm({
        mode: 'quick',
        initial: {},
        onCancel: () => drawer.close(),
      });
      drawer.body.textContent = '';
      drawer.body.appendChild(formApi.el);
      const formEl = formApi.el.querySelector('form');
      if (formEl) {
        formEl.addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await saveShift(formApi.getValue());
            showToast({ type: 'success', message: t('shifts.savedToast'), duration: 1800 });
            drawer.close();
          } catch (err) {
            console.warn('[macadam shifts] quick save failed', err);
            showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
          }
        });
      }
    },
    onEndShift: async () => {
      try {
        const prefill = await stopShiftTimer();
        if (!prefill) {
          showToast({ type: 'info', message: t('shifts.timerNotRunning'), duration: 1800 });
          return;
        }
        await openShiftFormModal({
          title: t('shifts.endShift'),
          initial: prefill,
          submitLabel: t('common.save'),
          onSaved: async (val) => saveShift(val),
        });
      } catch (err) {
        console.warn('[macadam shifts] stop timer failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
    },
  });
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  const prev = teardownByRoot.get(root);
  if (prev) prev();

  await restoreShiftTimerFromLocalStorage();
  mountFabHandlers();

  root.innerHTML = `
    <section class="shifts-view">
      <header class="shifts-view-header">
        <div>
          <h1 class="shifts-view-title">${escapeHtml(t('views.shifts.title'))}</h1>
          <p class="shifts-view-subtitle">${escapeHtml(t('views.shifts.subtitle'))}</p>
        </div>
        <div class="shifts-view-header-actions">
          <button type="button" class="btn btn-ghost" data-action="start-timer">${escapeHtml(t('shifts.startShift'))}</button>
          <button type="button" class="btn btn-ghost" data-action="templates">${escapeHtml(t('shifts.templates'))}</button>
          <button type="button" class="btn btn-ghost" data-action="import">${escapeHtml(t('shifts.bulkImport'))}</button>
        </div>
      </header>

      <div class="shifts-view-body">
        <div class="shifts-list" data-slot="list"></div>
      </div>
    </section>
  `;

  const listSlot = /** @type {HTMLElement | null} */ (root.querySelector('[data-slot="list"]'));

  const renderList = async () => {
    if (!listSlot) return;
    const shifts = await loadShiftsForView();
    if (!shifts.length) {
      listSlot.innerHTML = renderEmptyState({
        title: t('shifts.emptyTitle'),
        message: t('shifts.emptyMessage'),
      });
      return;
    }
    listSlot.innerHTML = shifts.map((s) => shiftCardHtml(s)).join('');
  };

  const onBus = () => void renderList();
  const offSaved = bus.on(SHIFT_SAVED, onBus);
  const offDel = bus.on(SHIFT_DELETED, onBus);

  const onClick = async (e) => {
    const tEl = /** @type {HTMLElement | null} */ (e.target && /** @type {HTMLElement} */ (e.target).closest('[data-action],[data-shift-id]'));
    if (!tEl) return;

    const action = tEl.getAttribute('data-action');
    if (action === 'start-timer') {
      const pid = String(store.get('activePlatformId') ?? 'all');
      const platformId = pid === 'all' ? String(store.get('platforms')?.[0]?.id || 'other') : pid;
      try {
        await startShiftTimer(platformId);
        showToast({ type: 'success', message: t('shifts.timerStarted'), duration: 1800 });
      } catch (err) {
        console.warn('[macadam shifts] start timer failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
      return;
    }

    if (action === 'templates') {
      await openTemplatesManager();
      return;
    }

    if (action === 'import') {
      await openCsvImport();
      return;
    }

    const card = /** @type {HTMLElement | null} */ (tEl.closest('[data-shift-id]'));
    const id = card ? Number(card.getAttribute('data-shift-id')) : null;
    if (!id) return;

    if (action === 'edit') {
      const row = await db.shifts.get(id);
      if (!row) return;
      await openShiftFormModal({
        title: t('shifts.editShift'),
        initial: row,
        submitLabel: t('common.save'),
        onSaved: async (val) => {
          await updateShift(id, val);
          return id;
        },
      });
      return;
    }

    if (action === 'duplicate') {
      try {
        const dup = await duplicateShift(id);
        await openShiftFormModal({
          title: t('shifts.duplicateShift'),
          initial: dup,
          submitLabel: t('common.save'),
          onSaved: async (val) => saveShift(val),
        });
      } catch (err) {
        console.warn('[macadam shifts] duplicate failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
      return;
    }

    if (action === 'delete') {
      const ok = await new Promise((resolve) => {
        const h = showModal({
          title: t('shifts.deleteShift'),
          content: `<p>${escapeHtml(t('shifts.deleteConfirm'))}</p>`,
          actions: [
            { label: t('common.cancel'), variant: 'ghost', onClick: () => resolve(false) },
            { label: t('common.delete'), variant: 'danger', onClick: () => resolve(true) },
          ],
          onClose: () => resolve(false),
        });
        void h;
      });
      if (!ok) return;
      try {
        await deleteShift(id);
        showToast({
          type: 'success',
          message: t('shifts.deletedToast'),
          duration: 2500,
          actionLabel: t('shifts.undo'),
          onAction: async () => {
            await restoreShift(id);
            showToast({ type: 'success', message: t('shifts.restoredToast'), duration: 1600 });
          },
        });
      } catch (err) {
        console.warn('[macadam shifts] delete failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
      return;
    }
  };

  root.addEventListener('click', onClick);

  teardownByRoot.set(root, () => {
    offSaved();
    offDel();
    root.removeEventListener('click', onClick);
  });

  await renderList();

  if (ctx && ctx.openNew) {
    await openShiftFormModal({
      title: t('shifts.addShift'),
      initial: {},
      submitLabel: t('common.save'),
      onSaved: async (val) => saveShift(val),
    });
  }
}

async function openTemplatesManager() {
  const list = await getTemplates();
  const body = document.createElement('div');
  body.className = 'shifts-templates';
  body.innerHTML = `
    <div class="shifts-templates-actions">
      <button type="button" class="btn btn-ghost" data-action="purge">${escapeHtml(t('shifts.purgeTrash'))}</button>
    </div>
    <div class="shifts-templates-list">
      ${
        list.length
          ? list
              .map(
                (tpl) => `
        <button type="button" class="template-row" data-template-id="${escapeAttr(tpl.id)}">
          <span class="template-row-name">${escapeHtml(tpl.name)}</span>
          <span class="template-row-meta">${escapeHtml(t('shifts.template'))}</span>
        </button>
      `,
              )
              .join('')
          : `<div class="text-sm shifts-muted">${escapeHtml(t('shifts.noTemplates'))}</div>`
      }
    </div>
    <div class="shifts-templates-save">
      <button type="button" class="btn btn-primary" data-action="save-template">${escapeHtml(t('shifts.saveAsTemplate'))}</button>
    </div>
  `;

  const handle = showModal({
    title: t('shifts.templates'),
    content: body,
    actions: [{ label: t('common.close'), variant: 'ghost', onClick: () => handle.close() }],
  });

  body.addEventListener('click', async (e) => {
    const el = /** @type {HTMLElement | null} */ (e.target && /** @type {HTMLElement} */ (e.target).closest('[data-action],[data-template-id]'));
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (action === 'purge') {
      await purgeShifts();
      showToast({ type: 'success', message: t('shifts.purgedToast'), duration: 1600 });
      return;
    }
    if (action === 'save-template') {
      // Save template from last entered values: prompt user for a name and open a fresh form to capture.
      const name = await new Promise((resolve) => {
        const wrap = document.createElement('div');
        wrap.innerHTML = `
          <label class="field">
            <span class="field-label">${escapeHtml(t('shifts.templateName'))}</span>
            <input class="input" name="name" placeholder="${escapeAttr(t('shifts.templateNamePlaceholder'))}" />
          </label>
        `;
        const h = showModal({
          title: t('shifts.saveAsTemplate'),
          content: wrap,
          actions: [
            { label: t('common.cancel'), variant: 'ghost', onClick: () => resolve('') },
            {
              label: t('common.confirm'),
              variant: 'primary',
              onClick: () => resolve(String(wrap.querySelector('input[name="name"]')?.value || '')),
            },
          ],
          onClose: () => resolve(''),
        });
        void h;
      });
      if (!String(name || '').trim()) return;

      await openShiftFormModal({
        title: t('shifts.saveAsTemplate'),
        initial: {},
        submitLabel: t('common.confirm'),
        onSaved: async (val) => {
          await saveAsTemplate(val, String(name));
          return 1;
        },
      });
      handle.close();
      return;
    }
    const tplId = el.getAttribute('data-template-id');
    if (tplId) {
      try {
        const data = await applyTemplate(tplId);
        await openShiftFormModal({
          title: t('shifts.addShift'),
          initial: data,
          submitLabel: t('common.save'),
          onSaved: async (val) => saveShift(val),
        });
      } catch (err) {
        console.warn('[macadam shifts] apply template failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
      }
    }
  });
}

async function openCsvImport() {
  const wrap = document.createElement('div');
  wrap.className = 'shifts-import';
  wrap.innerHTML = `
    <p class="text-sm shifts-secondary">${escapeHtml(t('shifts.importLead'))}</p>
    <input type="file" class="input" accept=".csv,text/csv" data-file />
    <div class="shifts-import-preview" data-preview></div>
    <div class="shifts-import-actions" data-actions hidden>
      <button type="button" class="btn btn-ghost" data-action="append">${escapeHtml(t('shifts.importAppend'))}</button>
      <button type="button" class="btn btn-danger" data-action="replace">${escapeHtml(t('shifts.importReplace'))}</button>
    </div>
  `;

  const handle = showModal({
    title: t('shifts.bulkImport'),
    content: wrap,
    actions: [{ label: t('common.close'), variant: 'ghost', onClick: () => handle.close() }],
  });

  /** @type {any[]} */
  let parsedRows = [];

  const fileEl = /** @type {HTMLInputElement | null} */ (wrap.querySelector('[data-file]'));
  const preview = /** @type {HTMLElement | null} */ (wrap.querySelector('[data-preview]'));
  const actions = /** @type {HTMLElement | null} */ (wrap.querySelector('[data-actions]'));

  fileEl?.addEventListener('change', async () => {
    const file = fileEl.files && fileEl.files[0];
    if (!file) return;
    const text = await file.text();
    const res = Papa.parse(text, { header: true, skipEmptyLines: true });
    if (!res || res.errors?.length) {
      showToast({ type: 'error', message: t('shifts.importParseError'), duration: 2200 });
      return;
    }
    parsedRows = (res.data || []).slice(0, 5000);
    const first = parsedRows.slice(0, 5);
    if (preview) {
      preview.innerHTML = `
        <div class="text-sm">${escapeHtml(t('shifts.importPreview'))}</div>
        <pre class="import-pre">${escapeHtml(JSON.stringify(first, null, 2))}</pre>
      `;
    }
    if (actions) actions.hidden = false;
  });

  wrap.addEventListener('click', async (e) => {
    const el = /** @type {HTMLElement | null} */ (e.target && /** @type {HTMLElement} */ (e.target).closest('[data-action]'));
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (!action || !parsedRows.length) return;

    try {
      if (action === 'replace') {
        await db.transaction('rw', db.shifts, async () => {
          await db.shifts.clear();
        });
      }
      let added = 0;
      for (const r of parsedRows) {
        const row = /** @type {Record<string, unknown>} */ (r || {});
        const shiftData = {
          platformId: row.platformId || row.platform || row.app || 'other',
          date: row.date,
          startTime: row.startTime,
          endTime: row.endTime,
          gross: row.gross,
          tips: row.tips,
          bonus: row.bonus,
          orders: row.orders,
          distanceKm: row.distanceKm || row.distance,
          notes: row.notes || '',
        };
        // eslint-disable-next-line no-await-in-loop
        await saveShift(shiftData);
        added += 1;
      }
      showToast({ type: 'success', message: t('shifts.importDone').replace('{count}', String(added)), duration: 2500 });
      handle.close();
    } catch (err) {
      console.warn('[macadam shifts] import failed', err);
      showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
    }
  });
}

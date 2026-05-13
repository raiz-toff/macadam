import PapaMod from '../libs/papaparse.min.js';
import { db } from '../core/db.js';
import { bus, PLATFORM_CHANGED, SHIFT_DELETED, SHIFT_SAVED } from '../core/events.js';
import { store } from '../core/store.js';
import { t } from '../utils/strings.js';
import { showDrawer, showModal, showToast, renderEmptyState } from '../ui/components.js';
import { getPlatformConfig } from '../registry/platforms/terminology.js';
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
import { formatRegisteredMetricValue } from '../modules/analytics/analytics.js';
import { MetricRegistry, getMetricValue } from '../registry/metrics/index.js';
import { defaultRangeForPreset } from '../utils/date-range-presets.js';
import { demoSampleRangeOverlaps, getDemoAnalyticsAnchorDate } from '../modules/demo/sample-year.js';

const Papa = /** @type {any} */ (PapaMod).default || PapaMod;

const SHIFTS_RANGE_KEY = 'macadam-shifts-list-range-v1';
const SHIFTS_PAGE_KEY = 'macadam-shifts-list-page-v1';
const SHIFTS_SORT_KEY = 'macadam-shifts-list-sort-v1';
const SHIFTS_PER_PAGE = 15;

function escapeAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @type {WeakMap<HTMLElement, () => void>} */
const teardownByRoot = new WeakMap();

function shiftsFilterAnchorDate() {
  return store.get('demoMode') ? getDemoAnalyticsAnchorDate() : new Date();
}

/** @param {number} weekStartDay */
function loadShiftsRange(weekStartDay) {
  try {
    const raw = sessionStorage.getItem(SHIFTS_RANGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.start === 'string' && typeof p.end === 'string' && typeof p.preset === 'string') {
        let start = p.start;
        let end = p.end;
        if (String(start) > String(end)) {
          const t0 = start;
          start = end;
          end = t0;
        }
        const normalized = { ...p, start, end };
        if (store.get('demoMode') && !demoSampleRangeOverlaps(start, end)) {
          /* Saved range (e.g. real-world week) misses 2025 demo data — ignore. */
        } else {
          return normalized;
        }
      }
    }
  } catch {
    /* ignore */
  }
  return defaultRangeForPreset('week', shiftsFilterAnchorDate(), weekStartDay);
}

/** @param {{ start: string; end: string; preset: string }} s */
function saveShiftsRange(s) {
  try {
    sessionStorage.setItem(SHIFTS_RANGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** @param {string} start @param {string} end @param {string} preset */
function loadShiftsPageIdx(start, end, preset) {
  try {
    const raw = sessionStorage.getItem(SHIFTS_PAGE_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw);
    if (
      p &&
      p.start === start &&
      p.end === end &&
      p.preset === preset &&
      typeof p.page === 'number' &&
      Number.isFinite(p.page) &&
      p.page >= 0
    ) {
      return Math.floor(p.page);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

/** @param {string} start @param {string} end @param {string} preset @param {number} page */
function saveShiftsPageIdx(start, end, preset, page) {
  try {
    sessionStorage.setItem(SHIFTS_PAGE_KEY, JSON.stringify({ start, end, preset, page }));
  } catch {
    /* ignore */
  }
}

function loadShiftsSortDir() {
  try {
    const v = sessionStorage.getItem(SHIFTS_SORT_KEY);
    if (v === 'asc' || v === 'desc') return v;
  } catch {
    /* ignore */
  }
  return 'desc';
}

/** @param {'asc'|'desc'} dir */
function saveShiftsSortDir(dir) {
  try {
    sessionStorage.setItem(SHIFTS_SORT_KEY, dir);
  } catch {
    /* ignore */
  }
}

/**
 * @param {Record<string, unknown>[]} list
 * @param {string} start
 * @param {string} end
 * @param {'asc'|'desc'} sortDir
 */
function filterAndSortShifts(list, start, end, sortDir) {
  const out = list.filter((s) => {
    const d = String(s.date || '');
    return d >= start && d <= end;
  });
  out.sort((a, b) => {
    let cmp = String(a.date).localeCompare(String(b.date));
    if (cmp === 0) cmp = Number(a.id || 0) - Number(b.id || 0);
    return sortDir === 'desc' ? -cmp : cmp;
  });
  return out;
}

async function loadAllShiftsForPlatform() {
  const platform = String(store.get('activePlatformId') ?? 'all');
  const rows = await db.shifts.toArray();
  return rows.filter((s) => s.deletedAt == null).filter((s) => platform === 'all' || String(s.platformId) === platform);
}

function shiftCardMetricsHtml(s) {
  const user = store.get('user');
  const localeCountry = user?.locale?.country || 'US';
  const currency = user?.locale?.currency || 'USD';
  return [...MetricRegistry.getAll()]
    .filter((m) => m.showOnShiftCard)
    .sort((a, b) => (a.shiftCardOrder || 0) - (b.shiftCardOrder || 0))
    .map((m) => {
      const raw = getMetricValue(m.id, { shift: s });
      const valueStr = formatRegisteredMetricValue(m, raw, localeCountry, currency);
      const label = m.messageKey ? t(String(m.messageKey)) : m.label;
      return `<div class="shift-card-metric">
          <div class="shift-card-metric-label">${escapeHtml(label)}</div>
          <div class="shift-card-metric-value">${escapeHtml(valueStr)}</div>
        </div>`;
    })
    .join('');
}

function shiftCardHtml(s) {
  const pid = String(s.platformId || 'other');
  const pl = getPlatformConfig(pid);
  const badge = `<span class="shift-badge" data-platform-id="${escapeAttr(pid)}">${escapeHtml(pl.name || pid)}</span>`;
  return `
    <article class="shift-card" data-shift-id="${escapeAttr(String(s.id))}">
      <div class="shift-card-top">
        <div class="shift-card-date">${escapeHtml(String(s.date || ''))}</div>
        <div class="shift-card-platform">${badge}</div>
      </div>
      <div class="shift-card-main">
        ${shiftCardMetricsHtml(s)}
      </div>
      <div class="shift-card-actions">
        <button type="button" class="btn btn-ghost" data-action="edit">${escapeHtml(t('common.edit'))}</button>
        <button type="button" class="btn btn-ghost" data-action="duplicate">${escapeHtml(t('shifts.duplicateShift'))}</button>
        <button type="button" class="btn btn-ghost btn-danger" data-action="delete">${escapeHtml(t('common.delete'))}</button>
      </div>
    </article>
  `;
}

/**
 * @param {{ getValue: () => Record<string, unknown>; getWeekSaveDates?: () => string[] | null }} formApi
 * @param {(val: Record<string, unknown>) => Promise<unknown>} onSaved
 */
async function submitShiftFromForm(formApi, onSaved) {
  const val = formApi.getValue();
  const weekDates = typeof formApi.getWeekSaveDates === 'function' ? formApi.getWeekSaveDates() : null;
  if (weekDates && weekDates.length === 0) {
    showToast({ type: 'error', message: t('shifts.weekNoDays'), duration: 2200 });
    return null;
  }
  if (weekDates && weekDates.length > 0) {
    let ok = 0;
    let skip = 0;
    for (const d of weekDates) {
      try {
        await onSaved({ ...val, date: d });
        ok += 1;
      } catch (err) {
        console.warn('[macadam shifts] weekly row save failed', err);
        skip += 1;
      }
    }
    if (skip === 0) {
      showToast({ type: 'success', message: t('shifts.savedManyToast').replace('{count}', String(ok)), duration: 2200 });
    } else if (ok === 0) {
      showToast({ type: 'error', message: t('errors.generic'), duration: 2600 });
      return null;
    } else {
      showToast({
        type: 'success',
        message: t('shifts.weekPartialToast').replace('{ok}', String(ok)).replace('{skip}', String(skip)),
        duration: 3600,
      });
    }
    return 1;
  }
  try {
    await onSaved(val);
    showToast({ type: 'success', message: t('shifts.savedToast'), duration: 1800 });
    return 1;
  } catch (err) {
    console.warn('[macadam shifts] save failed', err);
    showToast({ type: 'error', message: t('errors.generic'), duration: 2200 });
    return null;
  }
}

async function openShiftFormModal({ initial, onSaved, title, mode = 'full', submitLabel }) {
  const editingId =
    initial && typeof initial === 'object' && 'id' in initial ? Number(/** @type {{ id?: unknown }} */ (initial).id) : NaN;
  const formApi = renderShiftForm({
    mode,
    initial: initial || {},
    submitLabel: submitLabel || t('common.save'),
    onCancel: () => handle.close(),
    allowWeeklyEntry: !Number.isFinite(editingId),
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
      const id = await submitShiftFromForm(formApi, onSaved);
      if (id != null) handle.close();
    });
  }
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  const prev = teardownByRoot.get(root);
  if (prev) prev();

  await restoreShiftTimerFromLocalStorage();

  root.innerHTML = `
    <section class="shifts-view">
      <header class="shifts-view-header">
        <div class="shifts-view-header-main">
          <h1 class="shifts-view-title">${escapeHtml(t('views.shifts.title'))}</h1>
          <p class="shifts-view-subtitle">${escapeHtml(t('views.shifts.subtitle'))}</p>
        </div>
        <div class="shifts-view-header-tools" role="toolbar" aria-label="${escapeHtml(t('shifts.headerToolsAria'))}">
          <button type="button" class="btn btn-secondary btn-sm" data-action="start-timer">${escapeHtml(t('shifts.startShift'))}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="templates">${escapeHtml(t('shifts.templates'))}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-action="import">${escapeHtml(t('shifts.bulkImport'))}</button>
        </div>
      </header>

      <div class="shifts-view-body">
        <div class="shifts-toolbar card">
          <div class="shifts-toolbar-bar">
            <div class="shifts-toolbar-left">
              <div class="shifts-presets-group" role="group" aria-label="${escapeHtml(t('shifts.filterPresetsAria'))}">
                <button type="button" class="btn btn-ghost btn-sm shifts-toolbar-preset" data-shifts-preset="week">${escapeHtml(t('shifts.presetWeek'))}</button>
                <button type="button" class="btn btn-ghost btn-sm shifts-toolbar-preset" data-shifts-preset="ytd">${escapeHtml(t('shifts.presetYtd'))}</button>
                <button type="button" class="btn btn-ghost btn-sm shifts-toolbar-preset" data-shifts-preset="all">${escapeHtml(t('shifts.presetAll'))}</button>
              </div>
              <span class="shifts-toolbar-field-label">${escapeHtml(t('shifts.rangeLabel'))}</span>
              <div class="shifts-toolbar-dates">
                <input type="date" class="input shifts-toolbar-date" id="shifts-filter-start" aria-label="${escapeHtml(t('shifts.rangeStart'))}" />
                <span class="shifts-toolbar-dates-sep" aria-hidden="true">–</span>
                <input type="date" class="input shifts-toolbar-date" id="shifts-filter-end" aria-label="${escapeHtml(t('shifts.rangeEnd'))}" />
                <button type="button" class="btn btn-primary btn-sm shifts-toolbar-apply" data-shifts-action="apply">${escapeHtml(t('shifts.rangeApply'))}</button>
              </div>
            </div>
            <div class="shifts-toolbar-right">
              <label class="shifts-sort-inline">
                <span class="shifts-sort-inline-label">${escapeHtml(t('shifts.sortByDate'))}</span>
                <select class="input shifts-sort-select" data-shifts-sort aria-label="${escapeHtml(t('shifts.sortByDate'))}">
                  <option value="desc">${escapeHtml(t('shifts.sortNewest'))}</option>
                  <option value="asc">${escapeHtml(t('shifts.sortOldest'))}</option>
                </select>
              </label>
              <button type="button" class="btn btn-primary shifts-toolbar-add" data-shifts-action="new">${escapeHtml(t('shifts.addShift'))}</button>
            </div>
          </div>
        </div>
        <div class="shifts-list" data-slot="list"></div>
        <div class="shifts-pager-slot" data-slot="pager" hidden></div>
      </div>
    </section>
  `;

  const listSlot = /** @type {HTMLElement | null} */ (root.querySelector('[data-slot="list"]'));
  const pagerSlot = /** @type {HTMLElement | null} */ (root.querySelector('[data-slot="pager"]'));

  const paint = async () => {
    if (!listSlot || !pagerSlot) return;
    const user = store.get('user');
    const weekStartDay = Number(user?.locale?.weekStartDay ?? 0);
    const range = loadShiftsRange(weekStartDay);
    const sortDir = /** @type {'asc'|'desc'} */ (loadShiftsSortDir());
    const all = await loadAllShiftsForPlatform();
    const filtered = filterAndSortShifts(all, range.start, range.end, sortDir);
    const total = filtered.length;
    const totalPages = total > 0 ? Math.ceil(total / SHIFTS_PER_PAGE) : 1;
    let pageIdx = total > SHIFTS_PER_PAGE ? loadShiftsPageIdx(range.start, range.end, range.preset) : 0;
    if (pageIdx >= totalPages) pageIdx = Math.max(0, totalPages - 1);
    if (total > SHIFTS_PER_PAGE) saveShiftsPageIdx(range.start, range.end, range.preset, pageIdx);

    const sEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#shifts-filter-start'));
    const eEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#shifts-filter-end'));
    const sortEl = /** @type {HTMLSelectElement | null} */ (root.querySelector('select[data-shifts-sort]'));
    if (sEl) sEl.value = range.start;
    if (eEl) eEl.value = range.end;
    if (sortEl) sortEl.value = sortDir;

    root.querySelectorAll('[data-shifts-preset]').forEach((btn) => {
      const p = btn.getAttribute('data-shifts-preset');
      btn.classList.toggle('is-active', p === range.preset);
    });

    if (!total) {
      const emptyTitle = all.length === 0 ? t('shifts.emptyTitle') : t('shifts.emptyFilteredTitle');
      const emptyMsg = all.length === 0 ? t('shifts.emptyMessage') : t('shifts.emptyFilteredMessage');
      listSlot.innerHTML = renderEmptyState({ title: emptyTitle, message: emptyMsg });
      pagerSlot.innerHTML = '';
      pagerSlot.hidden = true;
      return;
    }

    const slice = filtered.slice(pageIdx * SHIFTS_PER_PAGE, pageIdx * SHIFTS_PER_PAGE + SHIFTS_PER_PAGE);
    listSlot.innerHTML = slice.map((s) => shiftCardHtml(s)).join('');

    if (total <= SHIFTS_PER_PAGE) {
      pagerSlot.innerHTML = '';
      pagerSlot.hidden = true;
    } else {
      pagerSlot.hidden = false;
      pagerSlot.innerHTML = `
        <nav class="shifts-pager" role="navigation" aria-label="${escapeHtml(t('shifts.pagerAria'))}">
          <button type="button" class="btn btn-secondary btn-sm" data-shifts-page="prev"${pageIdx === 0 ? ' disabled' : ''}>${escapeHtml(t('shifts.pagePrev'))}</button>
          <span class="shifts-pager-status">${escapeHtml(t('shifts.pageStatus').replace('{current}', String(pageIdx + 1)).replace('{total}', String(totalPages)))}</span>
          <button type="button" class="btn btn-secondary btn-sm" data-shifts-page="next"${pageIdx >= totalPages - 1 ? ' disabled' : ''}>${escapeHtml(t('shifts.pageNext'))}</button>
        </nav>`;
    }
  };

  const onBus = () => void paint();
  const offSaved = bus.on(SHIFT_SAVED, onBus);
  const offDel = bus.on(SHIFT_DELETED, onBus);
  const offPlatform = bus.on(PLATFORM_CHANGED, onBus);

  const onSortChange = (e) => {
    const t = /** @type {HTMLElement | null} */ (e.target);
    if (t && t.matches && t.matches('select[data-shifts-sort]')) {
      const v = /** @type {HTMLSelectElement} */ (t).value === 'asc' ? 'asc' : 'desc';
      saveShiftsSortDir(v);
      const user = store.get('user');
      const wsd = Number(user?.locale?.weekStartDay ?? 0);
      const r = loadShiftsRange(wsd);
      saveShiftsPageIdx(r.start, r.end, r.preset, 0);
      void paint();
    }
  };

  const onClick = async (e) => {
    const navEl = /** @type {HTMLElement | null} */ (
      e.target && /** @type {HTMLElement} */ (e.target).closest('[data-shifts-preset],[data-shifts-action],[data-shifts-page]')
    );
    if (navEl && root.contains(navEl)) {
      const preset = navEl.getAttribute('data-shifts-preset');
      if (preset === 'week' || preset === 'ytd' || preset === 'all') {
        const user = store.get('user');
        const wsd = Number(user?.locale?.weekStartDay ?? 0);
        const r = defaultRangeForPreset(preset, new Date(), wsd);
        saveShiftsRange(r);
        saveShiftsPageIdx(r.start, r.end, r.preset, 0);
        await paint();
        return;
      }
      if (navEl.getAttribute('data-shifts-action') === 'new') {
        e.preventDefault();
        const target = '#/shifts/new';
        const cur = (window.location.hash || '').split('?')[0];
        if (cur === target) {
          void import('../core/router.js').then((m) => m.Router.refresh());
        } else {
          window.location.hash = target;
        }
        return;
      }
      if (navEl.getAttribute('data-shifts-action') === 'apply') {
        const sEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#shifts-filter-start'));
        const eEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#shifts-filter-end'));
        let s = String(sEl?.value || '').trim();
        let e = String(eEl?.value || '').trim();
        if (!s || !e) return;
        if (s > e) {
          const t0 = s;
          s = e;
          e = t0;
          if (sEl) sEl.value = s;
          if (eEl) eEl.value = e;
        }
        saveShiftsRange({ start: s, end: e, preset: 'custom' });
        saveShiftsPageIdx(s, e, 'custom', 0);
        await paint();
        return;
      }
      const pageNav = navEl.getAttribute('data-shifts-page');
      if (pageNav === 'prev' || pageNav === 'next') {
        if (/** @type {HTMLButtonElement} */ (navEl).disabled) return;
        const user = store.get('user');
        const wsd = Number(user?.locale?.weekStartDay ?? 0);
        const range = loadShiftsRange(wsd);
        const all = await loadAllShiftsForPlatform();
        const sortDir = /** @type {'asc'|'desc'} */ (loadShiftsSortDir());
        const filtered = filterAndSortShifts(all, range.start, range.end, sortDir);
        const totalPages = Math.max(1, Math.ceil(filtered.length / SHIFTS_PER_PAGE));
        let page = filtered.length > SHIFTS_PER_PAGE ? loadShiftsPageIdx(range.start, range.end, range.preset) : 0;
        if (page >= totalPages) page = Math.max(0, totalPages - 1);
        if (pageNav === 'prev') page = Math.max(0, page - 1);
        else page = Math.min(totalPages - 1, page + 1);
        saveShiftsPageIdx(range.start, range.end, range.preset, page);
        await paint();
        return;
      }
    }

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
  root.addEventListener('change', onSortChange);

  teardownByRoot.set(root, () => {
    offSaved();
    offDel();
    offPlatform();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onSortChange);
  });

  await paint();

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

import {
  bus,
  DATA_IMPORTED,
  EXPENSE_SAVED,
  NAVIGATION,
  PLATFORM_CHANGED,
  SHIFT_DELETED,
  SHIFT_SAVED,
} from '../core/events.js';
import { store } from '../core/store.js';
import { getFinancialOverviewForRange, getFinancialMonthlyBreakdown } from '../modules/analytics/analytics.js';
import { getIcon } from '../ui/icons.js';
import { formatCurrency } from '../utils/formatters.js';
import { defaultRangeForPreset } from '../utils/date-range-presets.js';
import { t } from '../utils/strings.js';

const DASHBOARD_RANGE_KEY = 'macadam-dashboard-range-v1';
const MONTHLY_ROWS_PER_PAGE = 15;
const MONTHLY_PAGE_STORAGE_KEY = 'macadam-dashboard-monthly-page-v1';

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @returns {{ start: string; end: string; preset: string } | null} */
function loadDashboardRange() {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_RANGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.start === 'string' && typeof p.end === 'string' && typeof p.preset === 'string') {
        return p;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {{ start: string; end: string; preset: string }} s */
function saveDashboardRange(s) {
  try {
    sessionStorage.setItem(DASHBOARD_RANGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** @param {string} start @param {string} end */
function loadMonthlyTablePage(start, end) {
  try {
    const raw = sessionStorage.getItem(MONTHLY_PAGE_STORAGE_KEY);
    if (!raw) return 0;
    const p = JSON.parse(raw);
    if (p && p.start === start && p.end === end && typeof p.page === 'number' && Number.isFinite(p.page) && p.page >= 0) {
      return Math.floor(p.page);
    }
  } catch {
    /* ignore */
  }
  return 0;
}

/** @param {string} start @param {string} end @param {number} page */
function saveMonthlyTablePage(start, end, page) {
  try {
    sessionStorage.setItem(MONTHLY_PAGE_STORAGE_KEY, JSON.stringify({ start, end, page }));
  } catch {
    /* ignore */
  }
}

/** @type {WeakMap<HTMLElement, () => void>} */
const teardownByRoot = new WeakMap();

/**
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} ctx
 */
async function paintDashboard(root, ctx) {
  void ctx;

  const now = new Date();
  const user = store.get('user');
  const weekStartDay = Number(user?.locale?.weekStartDay ?? 0);
  const platformFilter = String(store.get('activePlatformId') ?? 'all');
  let range = loadDashboardRange();
  if (!range) range = defaultRangeForPreset('month', now, weekStartDay);
  if (String(range.start) > String(range.end)) {
    const t0 = range.start;
    range = { ...range, start: range.end, end: t0 };
  }

  const [fin, monthly] = await Promise.all([
    getFinancialOverviewForRange(range.start, range.end, platformFilter, weekStartDay),
    getFinancialMonthlyBreakdown(range.start, range.end, platformFilter),
  ]);
  const localeCountry = user?.locale?.country || 'US';
  const currency = user?.locale?.currency || 'USD';

  const fmt = (v) => esc(formatCurrency(Number(v) || 0, localeCountry, { currency }));
  const fmtNum = (v, frac = 2) => esc(Number(v || 0).toFixed(frac));
  const hoursStr = `${fmtNum(fin.hours, 2)} ${esc(t('views.dashboard.financial.hoursSuffix'))}`;

  const presetActive = (p) => (range.preset === p ? ' is-active' : '');

  const best = fin.bestWeek;
  const worst = fin.worstWeek;
  const bestLine = best
    ? `${esc(t('views.dashboard.financial.weekN').replace('{n}', String(best.index)))} (${fmt(best.net)}) ${esc(t('views.dashboard.financial.netProfit'))}`
    : esc(t('views.dashboard.financial.noWeekData'));
  const worstLine = worst
    ? `${esc(t('views.dashboard.financial.weekN').replace('{n}', String(worst.index)))} (${fmt(worst.net)}) ${esc(t('views.dashboard.financial.netProfit'))}`
    : esc(t('views.dashboard.financial.noWeekData'));

  const monthlyAllRows = monthly.rows;
  const monthlyRowCount = monthlyAllRows.length;
  const monthlyTotalPages = monthlyRowCount > 0 ? Math.ceil(monthlyRowCount / MONTHLY_ROWS_PER_PAGE) : 1;
  let monthlyPageIndex =
    monthlyRowCount > MONTHLY_ROWS_PER_PAGE ? loadMonthlyTablePage(range.start, range.end) : 0;
  if (monthlyPageIndex >= monthlyTotalPages) monthlyPageIndex = Math.max(0, monthlyTotalPages - 1);
  if (monthlyPageIndex < 0) monthlyPageIndex = 0;
  if (monthlyRowCount > MONTHLY_ROWS_PER_PAGE) {
    saveMonthlyTablePage(range.start, range.end, monthlyPageIndex);
  }

  const monthlyPageRows = monthlyRowCount
    ? monthlyAllRows.slice(
        monthlyPageIndex * MONTHLY_ROWS_PER_PAGE,
        monthlyPageIndex * MONTHLY_ROWS_PER_PAGE + MONTHLY_ROWS_PER_PAGE,
      )
    : [];

  const monthlyRowsHtml = monthlyRowCount
    ? monthlyPageRows
        .map(
          (r) => `
        <tr>
          <td>${esc(r.period)}</td>
          <td class="financial-monthly-num">${fmt(r.earnings)}</td>
          <td class="financial-monthly-num">${fmt(r.expenses)}</td>
          <td class="financial-monthly-num">${fmt(r.outOfPocket)}</td>
          <td class="financial-monthly-num financial-monthly-net${r.net >= 0 ? ' financial-monthly-net--pos' : ' financial-monthly-net--neg'}">${fmt(r.net)}</td>
          <td class="financial-monthly-num">${fmtNum(r.hours, 2)}</td>
          <td class="financial-monthly-num">${fmtNum(r.efficiency, 2)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="7" class="financial-monthly-empty">${esc(t('views.dashboard.financial.monthlyEmpty'))}</td></tr>`;

  const monthlyPagerPagesHtml =
    monthlyRowCount > MONTHLY_ROWS_PER_PAGE && monthlyTotalPages <= 20
      ? `<div class="financial-monthly-pager-pages">${Array.from({ length: monthlyTotalPages }, (_, i) => {
          const active = i === monthlyPageIndex;
          return `<button type="button" class="btn btn-ghost btn-sm financial-monthly-page-num${active ? ' is-active' : ''}" data-dashboard-monthly-goto="${i}"${active ? ' aria-current="page"' : ''}>${esc(String(i + 1))}</button>`;
        }).join('')}</div>`
      : '';

  const monthlyPagerHtml =
    monthlyRowCount > MONTHLY_ROWS_PER_PAGE
      ? `<nav class="financial-monthly-pager" role="navigation" aria-label="${esc(t('views.dashboard.financial.monthlyPagerAria'))}">
          <button type="button" class="btn btn-secondary btn-sm financial-monthly-pager-prev" data-dashboard-monthly-page="prev"${monthlyPageIndex === 0 ? ' disabled' : ''}>${esc(t('views.dashboard.financial.monthlyPagePrev'))}</button>
          <div class="financial-monthly-pager-mid">
            <span class="financial-monthly-pager-status">${esc(
              t('views.dashboard.financial.monthlyPageStatus')
                .replace('{current}', String(monthlyPageIndex + 1))
                .replace('{total}', String(monthlyTotalPages)),
            )}</span>
            ${monthlyPagerPagesHtml}
          </div>
          <button type="button" class="btn btn-secondary btn-sm financial-monthly-pager-next" data-dashboard-monthly-page="next"${monthlyPageIndex >= monthlyTotalPages - 1 ? ' disabled' : ''}>${esc(t('views.dashboard.financial.monthlyPageNext'))}</button>
        </nav>`
      : '';

  const mt = monthly.totals;
  const monthlyFootHtml = `
    <tr class="financial-monthly-foot-row">
      <td class="financial-monthly-foot-cell financial-monthly-foot-spacer" aria-hidden="true"></td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootYtdEarnings'))}</span>
        <span class="financial-monthly-foot-value">${fmt(mt.earnings)}</span>
      </td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootYtdExpenses'))}</span>
        <span class="financial-monthly-foot-value">${fmt(mt.expenses)}</span>
      </td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootOop'))}</span>
        <span class="financial-monthly-foot-value">${fmt(mt.outOfPocket)}</span>
      </td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootYtdNet'))}</span>
        <span class="financial-monthly-foot-value financial-monthly-net${mt.net >= 0 ? ' financial-monthly-net--pos' : ' financial-monthly-net--neg'}">${fmt(mt.net)}</span>
      </td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootAvgPerHr'))}</span>
        <span class="financial-monthly-foot-value">${fmtNum(mt.avgPerHr, 2)}</span>
      </td>
      <td class="financial-monthly-foot-cell">
        <span class="financial-monthly-foot-label">${esc(t('views.dashboard.financial.monthlyFootEffectivePerHr'))}</span>
        <span class="financial-monthly-foot-value financial-monthly-eff">${fmtNum(mt.effectivePerHr, 2)}</span>
      </td>
    </tr>`;

  root.innerHTML = `
    <section class="dashboard-view dashboard-view--financial">
      <header class="financial-dash-header">
        <div class="financial-dash-header-text">
          <h1 class="financial-dash-title">${esc(t('views.dashboard.financial.title'))}</h1>
          <p class="financial-dash-subtitle">${esc(t('views.dashboard.financial.subtitle'))}</p>
        </div>
        <div class="financial-dash-actions">
          <a class="btn btn-secondary" href="#/analytics/week">${esc(t('views.dashboard.financial.weeklyLog'))}</a>
          <a class="btn btn-secondary" href="#/expenses">${esc(t('views.dashboard.financial.expensesNav'))}</a>
          <a class="btn btn-primary financial-dash-export" href="#/reports">${getIcon('export', 18, 'financial-dash-export-icon')}${esc(
            t('views.dashboard.financial.export'),
          )}</a>
        </div>
      </header>

      <div class="financial-dash-filter card" data-dashboard-filter>
        <div class="financial-dash-filter-bar">
          <div class="financial-dash-filter-left">
            <span class="financial-dash-filter-label">${esc(t('views.dashboard.financial.dateRange'))}</span>
            <div class="financial-dash-dates">
              <input type="date" class="input financial-dash-date" id="dashboard-filter-start" value="${esc(range.start)}" aria-label="${esc(t('views.dashboard.financial.startDate'))}" />
              <input type="date" class="input financial-dash-date" id="dashboard-filter-end" value="${esc(range.end)}" aria-label="${esc(t('views.dashboard.financial.endDate'))}" />
            </div>
          </div>
          <div class="financial-dash-filter-right">
            <div class="financial-dash-presets" role="group" aria-label="${esc(t('views.dashboard.financial.presetsAria'))}">
              <button type="button" class="btn btn-ghost financial-dash-preset${presetActive('week')}" data-dashboard-preset="week">${esc(t('views.dashboard.financial.presetWeek'))}</button>
              <button type="button" class="btn btn-ghost financial-dash-preset${presetActive('month')}" data-dashboard-preset="month">${esc(t('views.dashboard.financial.presetMonth'))}</button>
              <button type="button" class="btn btn-ghost financial-dash-preset${presetActive('ytd')}" data-dashboard-preset="ytd">${esc(t('views.dashboard.financial.presetYtd'))}</button>
              <button type="button" class="btn btn-ghost financial-dash-preset${presetActive('all')}" data-dashboard-preset="all">${esc(t('views.dashboard.financial.presetAll'))}</button>
            </div>
            <button type="button" class="btn btn-primary financial-dash-apply" data-dashboard-apply>
              ${getIcon('filter', 18, 'financial-dash-apply-icon')}${esc(t('views.dashboard.financial.apply'))}
            </button>
          </div>
        </div>
      </div>

      <div class="financial-dash-primary">
        <article class="card financial-kpi financial-kpi--large">
          <div class="financial-kpi-icon" aria-hidden="true">${getIcon('dollar', 24)}</div>
          <div class="financial-kpi-body">
            <span class="financial-kpi-label">${esc(t('views.dashboard.financial.totalEarnings'))}</span>
            <span class="financial-kpi-value">${fmt(fin.gross)}</span>
            <span class="financial-kpi-trend" aria-hidden="true">—</span>
          </div>
        </article>
        <article class="card financial-kpi financial-kpi--large">
          <div class="financial-kpi-icon" aria-hidden="true">${getIcon('chart-line', 24)}</div>
          <div class="financial-kpi-body">
            <span class="financial-kpi-label">${esc(t('views.dashboard.financial.netIncome'))}</span>
            <span class="financial-kpi-value">${fmt(fin.netIncome)}</span>
            <span class="financial-kpi-trend" aria-hidden="true">—</span>
          </div>
        </article>
        <article class="card financial-kpi financial-kpi--large">
          <div class="financial-kpi-icon" aria-hidden="true">${getIcon('bolt', 24)}</div>
          <div class="financial-kpi-body">
            <span class="financial-kpi-label">${esc(t('views.dashboard.financial.avgRateHr'))}</span>
            <span class="financial-kpi-value">${fmt(fin.avgRateHr)}</span>
            <span class="financial-kpi-trend" aria-hidden="true">—</span>
          </div>
        </article>
        <article class="card financial-kpi financial-kpi--large">
          <div class="financial-kpi-icon" aria-hidden="true">${getIcon('clock', 24)}</div>
          <div class="financial-kpi-body">
            <span class="financial-kpi-label">${esc(t('views.dashboard.financial.totalHours'))}</span>
            <span class="financial-kpi-value">${hoursStr}</span>
            <span class="financial-kpi-trend" aria-hidden="true">—</span>
          </div>
        </article>
      </div>

      <div class="financial-dash-secondary">
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.deliveries'))}</span>
          <span class="financial-metric-value">${esc(String(Math.round(fin.orders || 0)))}</span>
        </article>
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.perDelivery'))}</span>
          <span class="financial-metric-value financial-metric-value--accent">${fmt(fin.perDelivery)}</span>
        </article>
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.tipsTotal'))}</span>
          <span class="financial-metric-value financial-metric-value--positive">${fmt(fin.tips)}</span>
        </article>
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.expensesMetric'))}</span>
          <span class="financial-metric-value financial-metric-value--negative">${fmt(fin.expense)}</span>
        </article>
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.outOfPocket'))}</span>
          <span class="financial-metric-value financial-metric-value--negative">${fmt(fin.outOfPocket)}</span>
        </article>
        <article class="card financial-metric">
          <span class="financial-metric-label">${esc(t('views.dashboard.financial.effectivePerHr'))}</span>
          <span class="financial-metric-value financial-metric-value--accent">${fmt(fin.effectivePerHr)}</span>
        </article>
      </div>

      <article class="card financial-monthly-card">
        <div class="financial-monthly-head">
          <h2 class="financial-monthly-title">${getIcon('calendar', 20, 'financial-monthly-title-icon')} ${esc(t('views.dashboard.financial.monthlyBreakdownTitle'))}</h2>
          <div class="financial-monthly-actions" role="group" aria-label="${esc(t('views.dashboard.financial.monthlyBreakdownTitle'))}">
            <a class="btn btn-secondary btn-sm financial-monthly-action" href="#/analytics/week">${getIcon('export', 16, 'financial-monthly-action-icon')}${esc(t('views.dashboard.financial.monthlyBtnWeekly'))}</a>
            <a class="btn btn-secondary btn-sm financial-monthly-action" href="#/expenses">${getIcon('export', 16, 'financial-monthly-action-icon')}${esc(t('views.dashboard.financial.monthlyBtnExpenses'))}</a>
            <a class="btn btn-secondary btn-sm financial-monthly-action" href="#/reports">${getIcon('export', 16, 'financial-monthly-action-icon')}${esc(t('views.dashboard.financial.monthlyBtnSummary'))}</a>
          </div>
        </div>
        <div class="financial-monthly-table-wrap">
          <table class="financial-monthly-table">
            <thead>
              <tr>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColPeriod'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColEarnings'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColExpenses'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColOop'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColNet'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColHours'))}</th>
                <th scope="col">${esc(t('views.dashboard.financial.monthlyColEfficiency'))}</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyRowsHtml}
            </tbody>
            <tfoot>
              ${monthlyFootHtml}
            </tfoot>
          </table>
        </div>
        ${monthlyPagerHtml}
      </article>

      <div class="financial-dash-highlights">
        <article class="financial-highlight financial-highlight--best">
          <div class="financial-highlight-icon" aria-hidden="true">${getIcon('trophy', 22)}</div>
          <div class="financial-highlight-body">
            <h2 class="financial-highlight-title">${esc(t('views.dashboard.financial.bestPerformance'))}</h2>
            <p class="financial-highlight-metric">${bestLine}</p>
            <p class="financial-highlight-hint">${esc(t('views.dashboard.financial.bestHint'))}</p>
          </div>
        </article>
        <article class="financial-highlight financial-highlight--worst">
          <div class="financial-highlight-icon" aria-hidden="true">${getIcon('warning', 22)}</div>
          <div class="financial-highlight-body">
            <h2 class="financial-highlight-title">${esc(t('views.dashboard.financial.needsImprovement'))}</h2>
            <p class="financial-highlight-metric">${worstLine}</p>
            <p class="financial-highlight-hint">${esc(t('views.dashboard.financial.worstHint'))}</p>
          </div>
        </article>
      </div>
    </section>
  `;

  /** @param {'week'|'month'|'ytd'|'all'} preset */
  const applyPreset = (preset) => {
    const r = defaultRangeForPreset(preset, new Date(), weekStartDay);
    saveDashboardRange(r);
    const sEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#dashboard-filter-start'));
    const eEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#dashboard-filter-end'));
    if (sEl) sEl.value = r.start;
    if (eEl) eEl.value = r.end;
    void paintDashboard(root, ctx);
  };

  root.onclick = (ev) => {
    const el = /** @type {HTMLElement | null} */ (
      ev.target &&
      /** @type {HTMLElement} */ (ev.target).closest(
        '[data-dashboard-preset],[data-dashboard-apply],[data-dashboard-monthly-page],[data-dashboard-monthly-goto]',
      )
    );
    if (!el || !root.contains(el)) return;

    const gotoStr = el.getAttribute('data-dashboard-monthly-goto');
    if (gotoStr != null && gotoStr !== '') {
      const idx = parseInt(gotoStr, 10);
      const rowCount = monthly.rows.length;
      const totalPages = rowCount > 0 ? Math.ceil(rowCount / MONTHLY_ROWS_PER_PAGE) : 1;
      if (Number.isFinite(idx) && idx >= 0 && idx < totalPages) {
        saveMonthlyTablePage(range.start, range.end, idx);
        void paintDashboard(root, ctx);
      }
      return;
    }

    const monthlyNav = el.getAttribute('data-dashboard-monthly-page');
    if (monthlyNav === 'prev' || monthlyNav === 'next') {
      if (/** @type {HTMLButtonElement} */ (el).disabled) return;
      const rowCount = monthly.rows.length;
      const totalPages = rowCount > 0 ? Math.ceil(rowCount / MONTHLY_ROWS_PER_PAGE) : 1;
      let page = rowCount > MONTHLY_ROWS_PER_PAGE ? loadMonthlyTablePage(range.start, range.end) : 0;
      if (page >= totalPages) page = Math.max(0, totalPages - 1);
      if (monthlyNav === 'prev') page = Math.max(0, page - 1);
      else page = Math.min(totalPages - 1, page + 1);
      saveMonthlyTablePage(range.start, range.end, page);
      void paintDashboard(root, ctx);
      return;
    }

    if (el.hasAttribute('data-dashboard-apply')) {
      const sEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#dashboard-filter-start'));
      const eEl = /** @type {HTMLInputElement | null} */ (root.querySelector('#dashboard-filter-end'));
      let s = String(sEl?.value || '').trim();
      let e = String(eEl?.value || '').trim();
      if (!s || !e) return;
      if (s > e) {
        const t1 = s;
        s = e;
        e = t1;
        if (sEl) sEl.value = s;
        if (eEl) eEl.value = e;
      }
      saveDashboardRange({ start: s, end: e, preset: 'custom' });
      void paintDashboard(root, ctx);
      return;
    }
    const preset = el.getAttribute('data-dashboard-preset');
    if (preset === 'week' || preset === 'month' || preset === 'ytd' || preset === 'all') {
      applyPreset(preset);
    }
  };
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  const prev = teardownByRoot.get(root);
  if (typeof prev === 'function') prev();

  let disposed = false;
  const rerender = () => {
    if (disposed) return;
    void paintDashboard(root, ctx);
  };

  /** @type {(() => void)[]} */
  const unsubs = [];

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    root.onclick = null;
    while (unsubs.length) {
      const u = unsubs.pop();
      try {
        if (typeof u === 'function') u();
      } catch {
        /* ignore */
      }
    }
    teardownByRoot.delete(root);
  };

  unsubs.push(bus.on(PLATFORM_CHANGED, rerender));
  unsubs.push(bus.on(SHIFT_SAVED, rerender));
  unsubs.push(bus.on(SHIFT_DELETED, rerender));
  unsubs.push(bus.on(EXPENSE_SAVED, rerender));
  unsubs.push(bus.on(DATA_IMPORTED, rerender));
  unsubs.push(
    bus.on(NAVIGATION, (payload) => {
      const h =
        payload && typeof payload === 'object' && payload && 'hash' in payload
          ? String(/** @type {{ hash?: string }} */ (payload).hash)
          : '';
      if (h === '#/dashboard') return;
      cleanup();
    }),
  );

  teardownByRoot.set(root, cleanup);

  await paintDashboard(root, ctx);
}

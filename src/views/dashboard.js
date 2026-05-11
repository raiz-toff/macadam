import { getAppState } from '../core/db.js';
import { store } from '../core/store.js';
import {
  DASHBOARD_STAT_STRIP_IDS,
  DASHBOARD_STRIP_SLOT_ID_SET,
  getOrderedDashboardWidgetIds,
  renderWidgetCellsInnerHtml,
  WidgetRegistry,
} from '../registry/widgets/index.js';
import {
  getAnnualSummary,
  getCumulativeYtdSeries,
  getIncomeSourceBreakdown,
  getRecentActivity,
  getTopEarningShifts,
  getWeekOverWeek,
  getWeeklyProjection,
} from '../modules/analytics/analytics.js';
import {
  renderIncomeSourceChart,
  renderWeekComparisonChart,
  renderYtdCumulativeChart,
} from '../modules/analytics/analytics-charts.js';
import { formatCurrency } from '../utils/formatters.js';
import { t } from '../utils/strings.js';

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  void ctx;
  const now = new Date();
  const [annual, weekCompare, incomeBreakdown, weeklyProjection, ytd, recent, topShifts, streakRaw] =
    await Promise.all([
      getAnnualSummary(now.getFullYear()),
      getWeekOverWeek(),
      getIncomeSourceBreakdown(),
      getWeeklyProjection(),
      getCumulativeYtdSeries(now.getFullYear()),
      getRecentActivity(8),
      getTopEarningShifts(10),
      getAppState('streak_count'),
    ]);

  const user = store.get('user');
  const localeCountry = user?.locale?.country || 'US';
  const currency = user?.locale?.currency || 'USD';
  const streakCount = Number(streakRaw) || 0;

  const widgetCtx = {
    user,
    store,
    data: {
      annual,
      weekCompare,
      weeklyProjection,
      streakCount,
      localeCountry,
      currency,
    },
  };

  const hasPrefs = Array.isArray(user?.dashboardWidgets) && user.dashboardWidgets.length > 0;
  const ordered = getOrderedDashboardWidgetIds(user, widgetCtx);
  let stripIds;
  if (hasPrefs) {
    const preferred = ordered.filter((id) => DASHBOARD_STRIP_SLOT_ID_SET.has(id));
    stripIds = preferred.length ? preferred.slice(0, 4) : ordered.slice(0, 4);
  } else {
    stripIds = [...DASHBOARD_STAT_STRIP_IDS];
  }
  const secondRowIds = hasPrefs ? ordered.filter((id) => !stripIds.includes(id)) : [];

  const statCells = await renderWidgetCellsInnerHtml(stripIds, widgetCtx);
  const row2Cells = secondRowIds.length ? await renderWidgetCellsInnerHtml(secondRowIds, widgetCtx) : [];

  const cellArticle = ({ id, html }) =>
    `<article class="card stat-card bento-cell-1x1" data-widget="${esc(id)}">${html}</article>`;
  const statRowHtml = statCells.map(cellArticle).join('');
  const row2Html = row2Cells.map(cellArticle).join('');

  root.innerHTML = `
    <section class="dashboard-view">
      <header class="card card-raised">
        <h1>${esc(t('views.dashboard.title'))}</h1>
        <p>${esc(t('views.dashboard.greeting'))}</p>
      </header>
      <section class="bento-grid" style="margin-top: var(--space-4);" data-dashboard-stats>
        ${statRowHtml}
      </section>
      ${
        secondRowIds.length
          ? `<section class="bento-grid" style="margin-top: var(--space-4);" data-dashboard-widgets-extra>${row2Html}</section>`
          : ''
      }
      <section class="bento-grid" style="margin-top: var(--space-4);">
        <article class="card bento-cell-2x1">
          <h2>${esc(t('analytics.compare'))}</h2>
          <div style="height: 220px;"><canvas data-chart="week-compare"></canvas></div>
        </article>
        <article class="card bento-cell-2x1">
          <h2>${esc(t('analytics.earnings'))}</h2>
          <div style="height: 220px;"><canvas data-chart="ytd-line"></canvas></div>
        </article>
        <article class="card bento-cell-1x1">
          <h2>${esc(t('analytics.tips'))}</h2>
          <div style="height: 220px;"><canvas data-chart="income-donut"></canvas></div>
        </article>
        <article class="card bento-cell-1x2">
          <h2>${esc(t('analytics.recentActivity'))}</h2>
          <ul style="margin: 0; padding-left: var(--space-4);">
            ${recent
              .map(
                (row) => `<li>
              ${esc(row.date)} · ${esc(row.platformId || '—')} · ${esc(formatCurrency(row.gross, localeCountry, { currency }))}
            </li>`,
              )
              .join('')}
          </ul>
        </article>
        <article class="card bento-cell-1x2">
          <h2>${esc(t('analytics.topShifts'))}</h2>
          <ol style="margin: 0; padding-left: var(--space-4);">
            ${topShifts
              .map(
                (row) => `<li>
              ${esc(row.date)} · ${esc(row.platformId || '—')} · ${esc(formatCurrency(row.gross, localeCountry, { currency }))}
            </li>`,
              )
              .join('')}
          </ol>
        </article>
      </section>
    </section>
  `;

  function wireWidgetRow(host) {
    if (!(host instanceof HTMLElement)) return;
    for (const article of host.querySelectorAll('[data-widget]')) {
      if (!(article instanceof HTMLElement)) continue;
      const wid = article.getAttribute('data-widget');
      const def = wid ? WidgetRegistry.getById(wid) : undefined;
      if (def) def.afterRender(article, widgetCtx);
    }
  }
  wireWidgetRow(root.querySelector('[data-dashboard-stats]'));
  wireWidgetRow(root.querySelector('[data-dashboard-widgets-extra]'));

  const weekCanvas = root.querySelector('canvas[data-chart="week-compare"]');
  if (weekCanvas instanceof HTMLCanvasElement) {
    renderWeekComparisonChart(weekCanvas, weekCompare.thisGross, weekCompare.lastGross);
  }
  const ytdCanvas = root.querySelector('canvas[data-chart="ytd-line"]');
  if (ytdCanvas instanceof HTMLCanvasElement) {
    renderYtdCumulativeChart(ytdCanvas, ytd.labels, ytd.values);
  }
  const donutCanvas = root.querySelector('canvas[data-chart="income-donut"]');
  if (donutCanvas instanceof HTMLCanvasElement) {
    renderIncomeSourceChart(donutCanvas, incomeBreakdown);
  }
}

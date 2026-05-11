import { store } from '../core/store.js';
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
import { formatCurrency, formatLargeNumber } from '../utils/formatters.js';
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
  const [annual, weekCompare, incomeBreakdown, weeklyProjection, ytd, recent, topShifts] = await Promise.all([
    getAnnualSummary(now.getFullYear()),
    getWeekOverWeek(),
    getIncomeSourceBreakdown(),
    getWeeklyProjection(),
    getCumulativeYtdSeries(now.getFullYear()),
    getRecentActivity(8),
    getTopEarningShifts(10),
  ]);

  const user = store.get('user');
  const localeCountry = user?.locale?.country || 'US';
  root.innerHTML = `
    <section class="dashboard-view">
      <header class="card card-raised">
        <h1>${esc(t('views.dashboard.title'))}</h1>
        <p>${esc(t('views.dashboard.greeting'))}</p>
      </header>
      <section class="bento-grid" style="margin-top: var(--space-4);">
        <article class="card stat-card bento-cell-1x1">
          <p>${esc(t('analytics.earnings'))} YTD</p>
          <strong>${esc(formatCurrency(annual.gross, localeCountry, { currency: user?.locale?.currency || 'USD' }))}</strong>
        </article>
        <article class="card stat-card bento-cell-1x1">
          <p>${esc(t('analytics.projection'))}</p>
          <strong>${esc(formatCurrency(weeklyProjection, localeCountry, { currency: user?.locale?.currency || 'USD' }))}</strong>
        </article>
        <article class="card stat-card bento-cell-1x1">
          <p>${esc(t('analytics.orders'))}</p>
          <strong>${esc(formatLargeNumber(annual.orders || 0))}</strong>
        </article>
        <article class="card stat-card bento-cell-1x1">
          <p>${esc(t('analytics.compare'))}</p>
          <strong class="${weekCompare.delta >= 0 ? 'trend-up' : 'trend-down'}">
            ${esc(formatCurrency(weekCompare.delta, localeCountry, { currency: user?.locale?.currency || 'USD' }))}
          </strong>
        </article>
      </section>
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
              ${esc(row.date)} · ${esc(row.platformId || '—')} · ${esc(formatCurrency(row.gross, localeCountry, { currency: user?.locale?.currency || 'USD' }))}
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
              ${esc(row.date)} · ${esc(row.platformId || '—')} · ${esc(formatCurrency(row.gross, localeCountry, { currency: user?.locale?.currency || 'USD' }))}
            </li>`,
              )
              .join('')}
          </ol>
        </article>
      </section>
    </section>
  `;

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

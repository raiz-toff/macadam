import {
  getBestDayOfWeek,
  getBestTimeOfDay,
  getBestZone,
  getEarningsVsHoursScatter,
  getMonthlySummary,
  getRegisteredMetricDisplay,
  getRolling30DayTrend,
  getZerodays,
  listAnalyticsDashboardMetricIds,
} from '../modules/analytics/analytics.js';
import {
  renderEarningsHeatmap,
  renderEarningsVsHoursChart,
  renderHourlyTrendChart,
} from '../modules/analytics/analytics-charts.js';
import { t } from '../utils/strings.js';
import { store } from '../core/store.js';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const user = store.get('user');
  const localeCountry = user?.locale?.country || 'US';
  const [monthSummary, rolling, bestDay, bestHour, bestZone, zeroDays, scatter] = await Promise.all([
    getMonthlySummary(now.getMonth() + 1, now.getFullYear()),
    getRolling30DayTrend(),
    getBestDayOfWeek(),
    getBestTimeOfDay(),
    getBestZone(),
    getZerodays(now.getMonth() + 1, now.getFullYear()),
    getEarningsVsHoursScatter(`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`),
  ]);

  const metricCtx = { summary: monthSummary, zeroDaysLength: zeroDays.length };
  const currency = user?.locale?.currency || 'USD';
  const statCardsHtml = listAnalyticsDashboardMetricIds()
    .map((id) => {
      const row = getRegisteredMetricDisplay(id, metricCtx, localeCountry, currency);
      if (!row) return '';
      const title = row.messageKey ? t(row.messageKey) : row.label;
      return `<article class="card stat-card bento-cell-1x1">
          <p>${esc(title)}</p>
          <strong>${esc(row.value)}</strong>
        </article>`;
    })
    .join('');

  root.innerHTML = `
    <section class="analytics-view">
      <header class="card card-raised">
        <h1>${esc(t('analytics.title'))}</h1>
        <p>${esc(t('analytics.subtitle'))}</p>
      </header>
      <section class="bento-grid" style="margin-top: var(--space-4);">
        ${statCardsHtml}
      </section>
      <section class="bento-grid" style="margin-top: var(--space-4);">
        <article class="card bento-cell-2x1">
          <h2>${esc(t('analytics.trends'))}</h2>
          <div style="height:220px"><canvas data-chart="rolling-trend"></canvas></div>
        </article>
        <article class="card bento-cell-2x1">
          <h2>${esc(t('analytics.scatter'))}</h2>
          <div style="height:220px"><canvas data-chart="scatter"></canvas></div>
        </article>
        <article class="card bento-cell-2x1">
          <h2>${esc(t('analytics.heatmap'))}</h2>
          <div data-chart="heatmap"></div>
        </article>
        <article class="card bento-cell-1x1">
          <h2>${esc(t('analytics.bestWindow'))}</h2>
          <p>${esc(t('analytics.bestDay'))}: ${esc(DOW[bestDay.day] || 'Sun')}</p>
          <p>${esc(t('analytics.bestHour'))}: ${esc(String(bestHour.hour).padStart(2, '0'))}:00</p>
          <p>${esc(t('analytics.bestZone'))}: ${esc(bestZone.zone)}</p>
        </article>
      </section>
    </section>
  `;

  const trendCanvas = root.querySelector('canvas[data-chart="rolling-trend"]');
  if (trendCanvas instanceof HTMLCanvasElement) {
    renderHourlyTrendChart(
      trendCanvas,
      rolling.points.map((p) => String(p.x + 1)),
      rolling.points.map((p) => p.y),
    );
  }
  const scatterCanvas = root.querySelector('canvas[data-chart="scatter"]');
  if (scatterCanvas instanceof HTMLCanvasElement) {
    renderEarningsVsHoursChart(scatterCanvas, scatter);
  }
  const heatmapContainer = root.querySelector('[data-chart="heatmap"]');
  if (heatmapContainer instanceof HTMLElement) {
    renderEarningsHeatmap(
      heatmapContainer,
      rolling.points.map((point, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (rolling.points.length - idx - 1));
        return { date: d.toISOString().slice(0, 10), value: point.y };
      }),
    );
  }
}

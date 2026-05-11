import html2canvasMod from '../libs/html2canvas.min.js';
import QRCodeMod from '../libs/qrcode.min.js';
import { store } from '../core/store.js';
import { showToast } from '../ui/components.js';
import {
  buildPrintDocument,
  copySummaryToClipboard,
  exportAllExpensesCsv,
  exportAllShiftsCsv,
  exportTaxSummaryCsv,
  exportTaxSummaryJson,
  exportVaultBackupJson,
  exportYearInReviewPng,
  getAnnualReport,
  getCustomDateRangeReport,
  getDefaultReportTemplate,
  getMonthlyReportCard,
  getPlatformReport,
  getWeeklyQrText,
  getWeeklyReportCard,
  getYearInReviewModel,
  previewVaultImportDiff,
  restoreVaultBackup,
} from '../modules/reports/reports.js';

const html2canvas = /** @type {any} */ (html2canvasMod).default || html2canvasMod;
const QRCode = /** @type {any} */ (QRCodeMod).default || QRCodeMod;

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(v) {
  const user = store.get('user');
  const sym = user?.locale?.currencySymbol || '$';
  return `${sym}${Number(v || 0).toFixed(2)}`;
}

function summaryRows(report) {
  const s = report.summary;
  return [
    ['Gross', formatMoney(s.gross)],
    ['Expenses', formatMoney(s.expenseTotal)],
    ['Net', formatMoney(s.net)],
    ['Shifts', String(s.shiftCount)],
    ['Hours', s.hours.toFixed(1)],
    ['Orders', String(s.orders)],
    ['Hourly', formatMoney(s.hourly)],
    ['Net hourly', formatMoney(s.netHourly)],
  ];
}

function periodPayload(period, form) {
  const now = new Date();
  if (period === 'monthly') return getMonthlyReportCard(now);
  if (period === 'annual') return getAnnualReport(now.getFullYear());
  if (period === 'platform') return getPlatformReport(form.platformId.value || 'all');
  if (period === 'custom') {
    return getCustomDateRangeReport(form.startDate.value || `${now.getFullYear()}-01-01`, form.endDate.value || `${now.getFullYear()}-12-31`, {
      platformId: form.platformId.value || 'all',
    });
  }
  return getWeeklyReportCard(now, Number(store.get('user')?.locale?.weekStartDay || 0));
}

function buildTemplateState(root) {
  const tpl = getDefaultReportTemplate();
  root.querySelectorAll('[data-template-section]').forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const key = input.getAttribute('data-template-section');
    if (!key) return;
    input.checked = Boolean(tpl.sections[key]);
  });
  return tpl;
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  void ctx;
  root.innerHTML = `
    <section class="reports-view">
      <header class="card card-raised">
        <h1>Reports & exports</h1>
        <p style="margin-top:var(--space-2);color:var(--color-text-secondary);">
          Weekly, monthly, annual, platform, and custom date reports with export and backup tools.
        </p>
      </header>

      <section class="card" style="margin-top:var(--space-4);">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
          <button class="btn btn-secondary" data-period="weekly" type="button">Weekly</button>
          <button class="btn btn-secondary" data-period="monthly" type="button">Monthly</button>
          <button class="btn btn-secondary" data-period="annual" type="button">Annual</button>
          <button class="btn btn-secondary" data-period="platform" type="button">Per platform</button>
          <button class="btn btn-secondary" data-period="custom" type="button">Custom range</button>
        </div>
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-3);">
          <label class="field">
            <span class="field-label">Platform</span>
            <input class="input" name="platformId" placeholder="e.g. doordash" />
          </label>
          <label class="field">
            <span class="field-label">Start date</span>
            <input class="input" type="date" name="startDate" />
          </label>
          <label class="field">
            <span class="field-label">End date</span>
            <input class="input" type="date" name="endDate" />
          </label>
        </div>
      </section>

      <section class="card" style="margin-top:var(--space-4);">
        <h2>Report template builder</h2>
        <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-2);">
          <label><input data-template-section="overview" type="checkbox" /> Overview</label>
          <label><input data-template-section="shifts" type="checkbox" /> Shift list</label>
          <label><input data-template-section="expenses" type="checkbox" /> Expense list</label>
          <label><input data-template-section="chart" type="checkbox" /> Year in review card</label>
          <label><input data-template-section="qr" type="checkbox" /> Weekly QR</label>
          <label><input data-template-section="notes" type="checkbox" /> Notes</label>
        </div>
      </section>

      <section class="card" style="margin-top:var(--space-4);">
        <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
          <button class="btn btn-primary" data-action="copy" type="button">Copy summary</button>
          <button class="btn btn-secondary" data-action="print" type="button">Open print view</button>
          <button class="btn btn-secondary" data-action="csv-shifts" type="button">Export shifts CSV</button>
          <button class="btn btn-secondary" data-action="csv-expenses" type="button">Export expenses CSV</button>
          <button class="btn btn-secondary" data-action="json-backup" type="button">Export vault JSON</button>
          <button class="btn btn-secondary" data-action="tax-json" type="button">Export tax JSON</button>
          <button class="btn btn-secondary" data-action="tax-csv" type="button">Export tax CSV</button>
        </div>
        <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2);align-items:center;flex-wrap:wrap;">
          <input class="input" type="file" accept="application/json" data-action="import-file" />
          <button class="btn btn-danger" data-action="import-json" type="button">Import vault JSON (with diff preview)</button>
        </div>
        <pre data-slot="import-diff" style="margin-top:var(--space-2);white-space:pre-wrap;color:var(--color-text-secondary);"></pre>
      </section>

      <section class="card" style="margin-top:var(--space-4);" data-slot="report-card"></section>
      <section class="card" style="margin-top:var(--space-4);" data-slot="qr"></section>
      <section class="card" style="margin-top:var(--space-4);" data-slot="yir"></section>
    </section>
  `;

  const form = {
    platformId: /** @type {HTMLInputElement} */ (root.querySelector('[name="platformId"]')),
    startDate: /** @type {HTMLInputElement} */ (root.querySelector('[name="startDate"]')),
    endDate: /** @type {HTMLInputElement} */ (root.querySelector('[name="endDate"]')),
  };
  const reportSlot = /** @type {HTMLElement} */ (root.querySelector('[data-slot="report-card"]'));
  const qrSlot = /** @type {HTMLElement} */ (root.querySelector('[data-slot="qr"]'));
  const yirSlot = /** @type {HTMLElement} */ (root.querySelector('[data-slot="yir"]'));
  const diffSlot = /** @type {HTMLElement} */ (root.querySelector('[data-slot="import-diff"]'));
  const template = buildTemplateState(root);

  let currentPeriod = 'weekly';
  let currentReport = await getWeeklyReportCard(new Date(), Number(store.get('user')?.locale?.weekStartDay || 0));

  async function refreshReport() {
    currentReport = await periodPayload(currentPeriod, form);
    const rows = summaryRows(currentReport);
    reportSlot.innerHTML = `
      <h2>Report card (${esc(currentReport.startDate)} to ${esc(currentReport.endDate)})</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-2);margin-top:var(--space-3);">
        ${rows.map(([k, v]) => `<article class="card"><p>${esc(k)}</p><strong>${esc(v)}</strong></article>`).join('')}
      </div>
    `;

    if (template.sections.qr) {
      qrSlot.innerHTML = '<h2>Weekly QR export</h2><canvas width="220" height="220" data-qr></canvas>';
      const canvas = qrSlot.querySelector('[data-qr]');
      if (canvas instanceof HTMLCanvasElement && QRCode && typeof QRCode.toCanvas === 'function') {
        QRCode.toCanvas(canvas, getWeeklyQrText(currentReport, store.get('user')), { width: 220 });
      }
    } else {
      qrSlot.innerHTML = '<h2>Weekly QR export</h2><p style="color:var(--color-text-secondary);">Disabled by template.</p>';
    }

    const year = new Date(currentReport.endDate).getFullYear();
    const annual = await getAnnualReport(year);
    const yir = getYearInReviewModel(year, annual);
    yirSlot.innerHTML = `
      <h2>Year in review</h2>
      <div data-yir-card style="padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);margin-top:var(--space-2);">
        <h3>${esc(yir.title)}</h3>
        <p>Generated ${esc(yir.generatedAt)}</p>
        <p>Gross ${esc(formatMoney(yir.summary.gross))} · Net ${esc(formatMoney(yir.summary.net))}</p>
        <p>Shifts ${esc(String(yir.summary.shiftCount))} · Hours ${esc(yir.summary.hours.toFixed(1))}</p>
      </div>
      <button class="btn btn-secondary" data-action="capture-yir" type="button" style="margin-top:var(--space-2);">
        Export year-in-review PNG
      </button>
    `;
  }

  await refreshReport();

  root.querySelectorAll('[data-period]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      currentPeriod = String(btn.getAttribute('data-period') || 'weekly');
      await refreshReport();
    });
  });

  root.querySelectorAll('[data-template-section]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!(input instanceof HTMLInputElement)) return;
      const key = input.getAttribute('data-template-section');
      if (!key) return;
      template.sections[key] = input.checked;
      await refreshReport();
    });
  });

  let importPreview = null;
  let importText = '';
  const importInput = /** @type {HTMLInputElement|null} */ (root.querySelector('[data-action="import-file"]'));
  importInput?.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    importText = await file.text();
    try {
      importPreview = previewVaultImportDiff(importText);
      diffSlot.textContent = importPreview.tableDiff.map((row) => `${row.table}: ${row.incomingCount} incoming rows`).join('\n');
    } catch {
      importPreview = null;
      diffSlot.textContent = 'Could not parse backup JSON.';
    }
  });

  root.addEventListener('click', async (e) => {
    const target = e.target instanceof HTMLElement ? e.target.closest('[data-action]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'copy') {
      await copySummaryToClipboard(currentReport, store.get('user'));
      showToast({ type: 'success', message: 'Summary copied.', duration: 1600 });
    }
    if (action === 'print') {
      const doc = buildPrintDocument(currentReport, template, store.get('user'));
      sessionStorage.setItem('macadam_print_payload', JSON.stringify(doc));
      window.location.hash = '#/print';
    }
    if (action === 'csv-shifts') {
      const count = await exportAllShiftsCsv();
      showToast({ type: 'success', message: `Exported ${count} shifts.`, duration: 1800 });
    }
    if (action === 'csv-expenses') {
      const count = await exportAllExpensesCsv();
      showToast({ type: 'success', message: `Exported ${count} expenses.`, duration: 1800 });
    }
    if (action === 'json-backup') {
      await exportVaultBackupJson();
      showToast({ type: 'success', message: 'Vault backup exported.', duration: 1800 });
    }
    if (action === 'tax-json') {
      await exportTaxSummaryJson(new Date(currentReport.endDate).getFullYear());
      showToast({ type: 'success', message: 'Tax JSON exported.', duration: 1800 });
    }
    if (action === 'tax-csv') {
      await exportTaxSummaryCsv(new Date(currentReport.endDate).getFullYear());
      showToast({ type: 'success', message: 'Tax CSV exported.', duration: 1800 });
    }
    if (action === 'import-json') {
      if (!importPreview) {
        showToast({ type: 'warning', message: 'Select a backup file first.', duration: 1800 });
        return;
      }
      await restoreVaultBackup(importPreview.backup);
      showToast({ type: 'success', message: 'Backup restored.', duration: 1800 });
      await refreshReport();
    }
    if (action === 'capture-yir') {
      const card = root.querySelector('[data-yir-card]');
      if (!(card instanceof HTMLElement)) return;
      const canvas = await html2canvas(card, { backgroundColor: '#ffffff', scale: 2 });
      exportYearInReviewPng(canvas.toDataURL('image/png'), new Date(currentReport.endDate).getFullYear());
      showToast({ type: 'success', message: 'Year in review exported.', duration: 1800 });
    }
  });
}

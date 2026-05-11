function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export function render(root, ctx) {
  void ctx;
  let payload = null;
  try {
    payload = JSON.parse(sessionStorage.getItem('macadam_print_payload') || 'null');
  } catch {
    payload = null;
  }

  if (!payload?.report) {
    root.innerHTML = `
      <section class="card card-raised">
        <h1>Print report</h1>
        <p style="margin-top:var(--space-2);color:var(--color-text-secondary);">
          No report payload found. Open reports and choose "Open print view".
        </p>
      </section>
    `;
    return;
  }

  const template = payload.template?.sections || {};
  const report = payload.report;
  const summary = report.summary || {};
  root.innerHTML = `
    <section class="print-view">
      <header class="card card-raised">
        <h1>Printable report</h1>
        <p>${esc(report.startDate)} to ${esc(report.endDate)}</p>
      </header>
      ${
        template.overview !== false
          ? `<section class="card" style="margin-top:var(--space-3);">
              <h2>Overview</h2>
              <p>Gross: <strong>${esc(Number(summary.gross || 0).toFixed(2))}</strong></p>
              <p>Expenses: <strong>${esc(Number(summary.expenseTotal || 0).toFixed(2))}</strong></p>
              <p>Net: <strong>${esc(Number(summary.net || 0).toFixed(2))}</strong></p>
              <p>Shifts: <strong>${esc(summary.shiftCount || 0)}</strong></p>
            </section>`
          : ''
      }
      ${
        template.notes
          ? `<section class="card" style="margin-top:var(--space-3);">
              <h2>Notes</h2>
              <pre style="white-space:pre-wrap;">${esc(payload.summaryText || '')}</pre>
            </section>`
          : ''
      }
      <section class="card" style="margin-top:var(--space-3);">
        <button class="btn btn-primary" type="button" data-action="print">Print now</button>
        <button class="btn btn-secondary" type="button" data-action="back">Back to reports</button>
      </section>
    </section>
  `;

  root.addEventListener('click', (e) => {
    const target = e.target instanceof HTMLElement ? e.target.closest('[data-action]') : null;
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'print') {
      window.print();
    }
    if (action === 'back') {
      window.location.hash = '#/reports';
    }
  });
}

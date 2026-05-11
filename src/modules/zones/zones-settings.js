/**
 * P12 — Settings panel exposing zone management (Features 190–194).
 * Renders the zone table with rename / merge / clear actions and a per-zone
 * expense allocation column.
 */

import { t } from '../../utils/strings.js';
import { formatCurrency } from '../../utils/formatters.js';
import { store } from '../../core/store.js';
import {
  showToast,
  showModal,
  showConfirm,
  renderEmptyState,
} from '../../ui/components.js';
import {
  getZonePerformance,
  getZoneExpenseAllocation,
  renameZone,
  mergeZones,
  deleteZone,
  listAllZoneTags,
} from './zones.js';

function userLocale() {
  const user = store.get('user');
  /** @type {any} */ const u = user;
  return {
    country: u?.locale?.country || 'US',
    currency: u?.locale?.currency || 'USD',
  };
}

function fmt(amount) {
  const { country, currency } = userLocale();
  return formatCurrency(amount, country, { currency });
}

/**
 * @param {string} template
 * @param {Record<string, string | number>} values
 */
function fillTemplate(template, values) {
  let out = String(template);
  for (const [k, v] of Object.entries(values)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}

function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/**
 * @param {HTMLElement} host
 */
export async function mountZonesSettings(host) {
  host.textContent = '';

  const section = document.createElement('section');
  section.className = 'settings-view-section zones-settings';
  section.setAttribute('aria-labelledby', 'zones-settings-title');

  const heading = document.createElement('h2');
  heading.id = 'zones-settings-title';
  heading.className = 'settings-section-title';
  heading.textContent = t('zones.sectionTitle');
  const lead = document.createElement('p');
  lead.className = 'settings-section-lead text-secondary';
  lead.textContent = t('zones.sectionLead');
  section.appendChild(heading);
  section.appendChild(lead);

  const body = document.createElement('div');
  body.className = 'zones-settings-body';
  section.appendChild(body);

  host.appendChild(section);

  await renderInto(body);
}

/** Re-fetch and re-render the zones table inside `body`. */
async function renderInto(body) {
  clearChildren(body);

  /** @type {Awaited<ReturnType<typeof getZonePerformance>>} */
  let rows;
  /** @type {Awaited<ReturnType<typeof getZoneExpenseAllocation>>} */
  let allocs;
  try {
    [rows, allocs] = await Promise.all([getZonePerformance(), getZoneExpenseAllocation()]);
  } catch (e) {
    console.warn('[macadam zones] read failed', e);
    body.innerHTML = renderEmptyState({
      icon: 'info',
      title: t('errors.viewRender'),
      message: t('errors.generic'),
    });
    return;
  }

  if (rows.length === 0) {
    body.innerHTML = renderEmptyState({
      icon: 'home',
      title: t('zones.emptyTitle'),
      message: t('zones.emptyMessage'),
    });
    return;
  }

  const allocByZone = new Map();
  for (const a of allocs) allocByZone.set(a.zone, a.allocated);
  const unallocated = allocByZone.get('__unallocated__') || 0;

  /* Feature 253 — accessible table with caption, scope, and ARIA. */
  const table = document.createElement('table');
  table.className = 'zones-table';
  table.setAttribute('role', 'table');

  const caption = document.createElement('caption');
  caption.className = 'sr-only';
  caption.textContent = t('zones.sectionTitle');
  table.appendChild(caption);

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th scope="col"><input type="checkbox" data-zone-select-all aria-label="${t('common.all')}"></th>
      <th scope="col">${t('zones.tableHeader.zone')}</th>
      <th scope="col">${t('zones.tableHeader.shifts')}</th>
      <th scope="col">${t('zones.tableHeader.gross')}</th>
      <th scope="col">${t('zones.tableHeader.hourly')}</th>
      <th scope="col">${t('zones.tableHeader.perKm')}</th>
      <th scope="col">${t('zones.tableHeader.expenses')}</th>
      <th scope="col">${t('zones.tableHeader.actions')}</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.dataset.zone = row.zone;
    const alloc = allocByZone.get(row.zone) || 0;
    tr.innerHTML = `
      <td><input type="checkbox" data-zone-select="${escapeAttr(row.zone)}" aria-label="${escapeAttr(row.zone)}"></td>
      <th scope="row">${escapeHtml(row.zone)}</th>
      <td>${row.shiftCount}</td>
      <td>${escapeHtml(fmt(row.gross))}</td>
      <td>${escapeHtml(fmt(row.hourly))}</td>
      <td>${escapeHtml(fmt(row.perKm))}</td>
      <td>${escapeHtml(fmt(alloc))}</td>
      <td class="zones-actions"></td>
    `;
    const actions = /** @type {HTMLElement} */ (tr.querySelector('.zones-actions'));

    const renameBtn = document.createElement('button');
    renameBtn.type = 'button';
    renameBtn.className = 'btn btn-ghost btn-sm';
    renameBtn.textContent = t('zones.rename');
    renameBtn.addEventListener('click', () => openRename(row.zone, body));
    actions.appendChild(renameBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-ghost btn-sm zones-delete';
    delBtn.textContent = t('zones.delete');
    delBtn.addEventListener('click', () => openDelete(row.zone, body));
    actions.appendChild(delBtn);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  body.appendChild(table);

  /* Bulk merge controls (Feature 190). */
  const mergeWrap = document.createElement('div');
  mergeWrap.className = 'zones-merge-bar';
  const help = document.createElement('p');
  help.className = 'text-secondary text-sm';
  help.textContent = t('zones.mergeHelp');
  mergeWrap.appendChild(help);

  const mergeForm = document.createElement('form');
  mergeForm.className = 'zones-merge-form';
  mergeForm.innerHTML = `
    <label class="input-group">
      <span class="input-label">${t('zones.mergeInto')}</span>
      <input type="text" class="input" name="target" autocomplete="off" required>
    </label>
    <button type="submit" class="btn btn-primary btn-sm">${t('zones.mergeAction')}</button>
  `;
  mergeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = String(
      /** @type {HTMLInputElement} */ (mergeForm.querySelector('input[name="target"]')).value || '',
    ).trim();
    if (!target) return;
    const checked = /** @type {NodeListOf<HTMLInputElement>} */ (
      body.querySelectorAll('[data-zone-select]:checked')
    );
    const sources = [...checked].map((el) => el.value || el.getAttribute('data-zone-select') || '').filter(Boolean);
    if (sources.length < 1) {
      showToast({ type: 'info', message: t('zones.mergeHelp'), duration: 1800 });
      return;
    }
    try {
      const count = await mergeZones(sources, target);
      showToast({
        type: 'success',
        message: fillTemplate(t('zones.mergedToast'), { count }),
        duration: 2000,
      });
      await renderInto(body);
    } catch (err) {
      console.warn('[macadam zones] merge failed', err);
      showToast({ type: 'error', message: t('errors.generic'), duration: 2000 });
    }
  });
  mergeWrap.appendChild(mergeForm);
  body.appendChild(mergeWrap);

  /* Wire select-all in header. */
  const selectAll = /** @type {HTMLInputElement | null} */ (body.querySelector('[data-zone-select-all]'));
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const all = /** @type {NodeListOf<HTMLInputElement>} */ (body.querySelectorAll('[data-zone-select]'));
      all.forEach((el) => {
        el.checked = selectAll.checked;
      });
    });
  }
  /* Override checkbox values to expose `value` attribute for selection. */
  body.querySelectorAll('[data-zone-select]').forEach((el) => {
    /** @type {HTMLInputElement} */ (el).value = String(el.getAttribute('data-zone-select') || '');
  });

  /* Unallocated note (Feature 192). */
  if (unallocated > 0) {
    const note = document.createElement('p');
    note.className = 'text-secondary text-sm zones-unallocated';
    note.textContent = `${t('zones.unallocated')}: ${fmt(unallocated)}`;
    body.appendChild(note);
  }
}

function openRename(zone, body) {
  const form = document.createElement('form');
  form.className = 'zones-rename-form';
  form.innerHTML = `
    <label class="input-group">
      <span class="input-label">${t('zones.renameLabel')}</span>
      <input type="text" name="newName" class="input" required autocomplete="off" value="${escapeAttr(zone)}">
    </label>
  `;
  const handle = showModal({
    title: `${t('zones.renameTitle')}: ${zone}`,
    content: form,
    size: 'sm',
    actions: [
      { label: t('common.cancel'), class: 'btn btn-secondary' },
      {
        label: t('common.save'),
        class: 'btn btn-primary',
        close: false,
        onClick: async () => {
          const next = String(
            /** @type {HTMLInputElement} */ (form.querySelector('input[name="newName"]')).value || '',
          ).trim();
          if (!next) return;
          try {
            const count = await renameZone(zone, next);
            showToast({
              type: 'success',
              message: fillTemplate(t('zones.renamedToast'), { count }),
              duration: 2000,
            });
            handle.close();
            await renderInto(body);
          } catch (err) {
            console.warn('[macadam zones] rename failed', err);
            showToast({ type: 'error', message: t('errors.generic'), duration: 2000 });
          }
        },
      },
    ],
  });
}

function openDelete(zone, body) {
  showConfirm({
    title: t('zones.deleteConfirmTitle'),
    message: fillTemplate(t('zones.deleteConfirmMessage'), { zone }),
    confirmLabel: t('zones.delete'),
    confirmClass: 'btn btn-danger',
    onConfirm: async () => {
      try {
        const count = await deleteZone(zone);
        showToast({
          type: 'success',
          message: fillTemplate(t('zones.clearedToast'), { count }),
          duration: 2000,
        });
        await renderInto(body);
      } catch (err) {
        console.warn('[macadam zones] delete failed', err);
        showToast({ type: 'error', message: t('errors.generic'), duration: 2000 });
      }
    },
  });
}

/** Feature 194 — exported autocomplete source for shift forms. */
export { listAllZoneTags };

function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;');
}

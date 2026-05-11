/**
 * F10 — Settings: active platform cards, add / deactivate / goals / tax / notes.
 */

import { db, saveUser, getUser } from '../../core/db.js';
import { store } from '../../core/store.js';
import { t } from '../../utils/strings.js';
import { showConfirm, showToast } from '../../ui/components.js';
import { getPlatformConfig } from '../platforms/platform-config.js';
import {
  addPlatform,
  deactivatePlatform,
  updatePlatformGoal,
  updatePlatformTaxRate,
  updatePlatformNotes,
} from '../platforms/platforms.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {HTMLElement} root
 */
export async function mountSettingsPlatforms(root) {
  root.textContent = '';
  root.className = 'settings-platforms';

  const title = document.createElement('h2');
  title.className = 'settings-section-title';
  title.textContent = t('platforms.settingsSectionTitle');
  root.appendChild(title);

  const lead = document.createElement('p');
  lead.className = 'text-secondary settings-section-lead';
  lead.textContent = t('platforms.settingsSectionLead');
  root.appendChild(lead);

  const switcherRow = document.createElement('div');
  switcherRow.className = 'settings-field-row';
  switcherRow.innerHTML = `
    <label class="input-group">
      <span class="input-label">${esc(t('platforms.switcherMode'))}</span>
      <select class="input" data-platform-switcher-mode>
        <option value="tabs">${esc(t('platforms.switcherTabs'))}</option>
        <option value="dropdown">${esc(t('platforms.switcherDropdown'))}</option>
      </select>
    </label>`;
  root.appendChild(switcherRow);

  const list = document.createElement('div');
  list.className = 'platform-settings-cards';
  root.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'settings-platform-actions';
  root.appendChild(actions);

  const disclaimer = document.createElement('p');
  disclaimer.className = 'text-xs text-secondary platform-api-disclaimer';
  disclaimer.textContent = t('platforms.apiDisclaimer');
  root.appendChild(disclaimer);

  const modeSelect = /** @type {HTMLSelectElement} */ (switcherRow.querySelector('[data-platform-switcher-mode]'));

  const paint = async () => {
    const user = await getUser();
    const mode = user?.platformSwitcherMode === 'dropdown' ? 'dropdown' : 'tabs';
    if (modeSelect) modeSelect.value = mode;

    const active = await db.platforms.filter((p) => p.active === true).toArray();
    active.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));
    const inactive = await db.platforms.filter((p) => p.active === false).toArray();
    inactive.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));

    list.textContent = '';
    for (const p of active) {
      const id = String(p.id);
      const cfg = getPlatformConfig(id);
      const help = cfg.helpUrl
        ? `<a href="${esc(cfg.helpUrl)}" target="_blank" rel="noopener noreferrer">${esc(t('platforms.helpLink'))}</a>`
        : '';
      const card = document.createElement('article');
      card.className = 'card card-raised platform-settings-card';
      card.dataset.platformId = id;
      card.style.setProperty('--platform-color', typeof p.color === 'string' ? p.color : cfg.color);
      card.innerHTML = `
        <header class="platform-settings-card-head">
          <div class="platform-settings-card-title">
            <span class="platform-settings-logo" aria-hidden="true">${cfg.logo}</span>
            <div>
              <h3 class="platform-settings-name">${esc(typeof p.name === 'string' ? p.name : cfg.name)}</h3>
              <p class="text-xs text-secondary">${esc(t('platforms.cardMeta'))}</p>
            </div>
          </div>
          <div class="platform-settings-card-actions">
            ${help}
            <button type="button" class="btn btn-secondary btn-sm" data-deactivate>${esc(t('platforms.deactivate'))}</button>
          </div>
        </header>
        <div class="platform-settings-grid">
          <label class="input-group">
            <span class="input-label">${esc(t('platforms.weeklyGoal'))}</span>
            <input type="number" class="input" min="0" step="1" data-weekly value="${Number(p.weeklyGoal) || 0}" />
          </label>
          <label class="input-group">
            <span class="input-label">${esc(t('platforms.monthlyGoal'))}</span>
            <input type="number" class="input" min="0" step="1" data-monthly value="${Number(p.monthlyGoal) || 0}" />
          </label>
          <label class="input-group">
            <span class="input-label">${esc(t('platforms.taxRate'))}</span>
            <input type="number" class="input" min="0" max="100" step="0.1" data-tax value="${Number(p.taxRatePct) || 0}" />
          </label>
        </div>
        <label class="input-group" style="margin-top:var(--space-3)">
          <span class="input-label">${esc(t('platforms.notes'))}</span>
          <textarea class="input" rows="3" data-notes></textarea>
        </label>
        <div class="platform-settings-save">
          <button type="button" class="btn btn-primary btn-sm" data-save-card>${esc(t('common.save'))}</button>
        </div>`;
      list.appendChild(card);
      const notesEl = /** @type {HTMLTextAreaElement | null} */ (card.querySelector('[data-notes]'));
      if (notesEl) notesEl.value = typeof p.notes === 'string' ? p.notes : '';

      card.querySelector('[data-save-card]')?.addEventListener('click', async () => {
        const w = /** @type {HTMLInputElement | null} */ (card.querySelector('[data-weekly]'));
        const m = /** @type {HTMLInputElement | null} */ (card.querySelector('[data-monthly]'));
        const tx = /** @type {HTMLInputElement | null} */ (card.querySelector('[data-tax]'));
        const n = /** @type {HTMLTextAreaElement | null} */ (card.querySelector('[data-notes]'));
        try {
          await updatePlatformGoal(id, Number(w?.value), Number(m?.value));
          await updatePlatformTaxRate(id, Number(tx?.value));
          await updatePlatformNotes(id, n?.value ?? '');
          showToast({ message: t('platforms.saved'), type: 'success' });
        } catch (e) {
          console.warn(e);
          showToast({ message: t('errors.generic'), type: 'error' });
        }
      });

      card.querySelector('[data-deactivate]')?.addEventListener('click', () => {
        showConfirm({
          title: t('platforms.deactivateTitle'),
          message: t('platforms.deactivateMessage').replace('{name}', typeof p.name === 'string' ? p.name : id),
          confirmLabel: t('platforms.deactivate'),
          confirmClass: 'btn btn-danger',
          onConfirm: async () => {
            try {
              await deactivatePlatform(id);
              showToast({ message: t('platforms.deactivated'), type: 'info' });
              await paint();
            } catch (err) {
              if (err instanceof Error && err.message === 'last_platform') {
                showToast({ message: t('platforms.lastActive'), type: 'warning' });
              } else {
                showToast({ message: t('errors.generic'), type: 'error' });
              }
            }
          },
        });
      });
    }

    actions.textContent = '';
    const addWrap = document.createElement('div');
    addWrap.className = 'platform-add-wrap';
    if (inactive.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-secondary';
      empty.textContent = t('platforms.noInactive');
      addWrap.appendChild(empty);
    } else {
      const lbl = document.createElement('label');
      lbl.className = 'input-group platform-add-row';
      lbl.innerHTML = `<span class="input-label">${esc(t('platforms.add'))}</span>`;
      const sel = document.createElement('select');
      sel.className = 'input';
      sel.innerHTML = `<option value="">${esc(t('platforms.pickPlatform'))}</option>${inactive
        .map((p) => {
          const pid = String(p.id);
          const name = typeof p.name === 'string' ? p.name : getPlatformConfig(pid).name;
          return `<option value="${esc(pid)}">${esc(name)}</option>`;
        })
        .join('')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary';
      btn.textContent = t('platforms.add');
      btn.addEventListener('click', async () => {
        const v = String(sel.value || '');
        if (!v) {
          showToast({ message: t('platforms.pickPlatform'), type: 'warning' });
          return;
        }
        try {
          await addPlatform(v);
          showToast({ message: t('platforms.added'), type: 'success' });
          sel.value = '';
          await paint();
        } catch (e) {
          console.warn(e);
          showToast({ message: t('errors.generic'), type: 'error' });
        }
      });
      lbl.appendChild(sel);
      addWrap.appendChild(lbl);
      addWrap.appendChild(btn);
    }
    actions.appendChild(addWrap);
  };

  modeSelect?.addEventListener('change', async () => {
    const v = modeSelect.value === 'dropdown' ? 'dropdown' : 'tabs';
    await saveUser({ platformSwitcherMode: v });
    await store.refresh('user');
    showToast({ message: t('platforms.switcherModeSaved'), type: 'info' });
  });

  await paint();
}

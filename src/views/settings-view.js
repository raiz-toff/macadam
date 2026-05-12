import { t } from '../utils/strings.js';
import { mountSettings } from '../modules/settings/settings.js';
import { mountPwaSettings } from '../modules/pwa/pwa-settings.js';

/** @param {HTMLElement} root @param {Record<string, unknown>} ctx */
export async function render(root, ctx) {
  root.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'settings-view';

  const header = document.createElement('header');
  header.className = 'settings-view-header';
  const h1 = document.createElement('h1');
  h1.className = 'app-header-title';
  h1.style.fontSize = 'var(--text-xl)';
  h1.textContent = t('settings.title');
  const sub = document.createElement('p');
  sub.className = 'text-secondary';
  sub.style.marginTop = 'var(--space-2)';
  sub.textContent = t('settings.subtitle');
  header.appendChild(h1);
  header.appendChild(sub);
  if (ctx?.settingsTab === 'about') {
    const hint = document.createElement('p');
    hint.className = 'text-xs';
    hint.style.marginTop = 'var(--space-2)';
    hint.textContent = `${t('settings.about')} · ${String(ctx.hash || '')}`;
    header.appendChild(hint);
  }
  wrap.appendChild(header);

  const settingsHost = document.createElement('section');
  settingsHost.className = 'settings-view-section';
  wrap.appendChild(settingsHost);

  /* P12 — PWA deep features (Features 241–249). */
  const pwaHost = document.createElement('section');
  pwaHost.className = 'settings-view-section card card-raised';
  wrap.appendChild(pwaHost);

  root.appendChild(wrap);

  try {
    await mountSettings(settingsHost, ctx);
  } catch (e) {
    console.error('[macadam] settings mount failed', e);
    const err = document.createElement('p');
    err.className = 'route-error';
    err.setAttribute('role', 'alert');
    err.textContent = t('errors.viewRender');
    settingsHost.appendChild(err);
  }

  try {
    mountPwaSettings(pwaHost);
  } catch (e) {
    console.error('[macadam] pwa settings mount failed', e);
    const err = document.createElement('p');
    err.className = 'route-error';
    err.setAttribute('role', 'alert');
    err.textContent = t('errors.viewRender');
    pwaHost.appendChild(err);
  }
}

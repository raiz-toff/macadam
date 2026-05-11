import { t } from '../utils/strings.js';
import { mountSettingsPlatforms } from '../modules/settings/platforms-settings.js';

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

  const platformsHost = document.createElement('section');
  platformsHost.className = 'settings-view-section';
  wrap.appendChild(platformsHost);

  root.appendChild(wrap);

  try {
    await mountSettingsPlatforms(platformsHost);
  } catch (e) {
    console.error('[macadam] settings platforms mount failed', e);
    const err = document.createElement('p');
    err.className = 'route-error';
    err.setAttribute('role', 'alert');
    err.textContent = t('errors.viewRender');
    platformsHost.appendChild(err);
  }
}

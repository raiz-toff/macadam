/**
 * P12 — Settings panel exposing PWA deep features (Features 241–249).
 * Mounted by `views/settings-view.js`. UI-only; all logic lives in `pwa.js`.
 *
 * No permissions are requested on render; every API is opt-in via a button.
 */

import { t } from '../../utils/strings.js';
import { showToast } from '../../ui/components.js';
import {
  pwaCapabilities,
  getNotificationPermission,
  requestNotificationPermission,
  vibrate,
  toggleFullscreen,
} from './pwa.js';

function row(labelText, valueEl, description) {
  const wrap = document.createElement('div');
  wrap.className = 'pwa-cap-row';
  const label = document.createElement('div');
  label.className = 'pwa-cap-label';
  label.textContent = labelText;
  const desc = document.createElement('p');
  desc.className = 'pwa-cap-desc text-secondary';
  desc.textContent = description || '';
  const value = document.createElement('div');
  value.className = 'pwa-cap-value';
  if (valueEl instanceof Node) value.appendChild(valueEl);
  else value.textContent = String(valueEl ?? '');
  wrap.appendChild(label);
  wrap.appendChild(value);
  if (description) wrap.appendChild(desc);
  return wrap;
}

function badge(textContent, ok) {
  const span = document.createElement('span');
  span.className = `pill pill-sm pwa-cap-pill ${ok ? 'is-supported' : 'is-unsupported'}`;
  span.textContent = textContent;
  return span;
}

/**
 * @param {HTMLElement} host
 */
export function mountPwaSettings(host) {
  host.textContent = '';
  const caps = pwaCapabilities();

  const section = document.createElement('section');
  section.className = 'settings-view-section pwa-settings';
  section.setAttribute('aria-labelledby', 'pwa-settings-title');

  const heading = document.createElement('h2');
  heading.id = 'pwa-settings-title';
  heading.className = 'settings-section-title';
  heading.textContent = t('pwa.sectionTitle');
  const lead = document.createElement('p');
  lead.className = 'settings-section-lead text-secondary';
  lead.textContent = t('pwa.sectionLead');
  section.appendChild(heading);
  section.appendChild(lead);

  const list = document.createElement('div');
  list.className = 'pwa-cap-list';

  /* Background Sync (241) */
  list.appendChild(
    row(
      t('pwa.backgroundSync'),
      badge(caps.backgroundSync ? t('pwa.supported') : t('pwa.unsupported'), caps.backgroundSync),
      caps.backgroundSync ? t('pwa.backgroundSyncOn') : t('pwa.backgroundSyncOff'),
    ),
  );

  /* Share Target (244) */
  list.appendChild(
    row(
      t('pwa.shareTarget'),
      badge(t('pwa.supported'), true),
      t('pwa.shareTargetOn'),
    ),
  );

  /* File System Access (245) */
  list.appendChild(
    row(
      t('pwa.fileSystem'),
      badge(caps.fileSystemAccess ? t('pwa.supported') : t('pwa.unsupported'), caps.fileSystemAccess),
      caps.fileSystemAccess ? t('pwa.fileSystemOn') : t('pwa.fileSystemOff'),
    ),
  );

  /* Wake Lock (248) */
  list.appendChild(
    row(
      t('pwa.wakeLock'),
      badge(caps.wakeLock ? t('pwa.supported') : t('pwa.unsupported'), caps.wakeLock),
      caps.wakeLock ? t('pwa.wakeLockOn') : t('pwa.wakeLockOff'),
    ),
  );

  /* Notifications (246) */
  {
    const perm = getNotificationPermission();
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn btn-secondary btn-sm';
    action.textContent = t('pwa.requestNotifications');
    if (perm === 'granted') {
      action.disabled = true;
      action.textContent = t('pwa.notificationsGranted');
    } else if (perm === 'denied') {
      action.disabled = true;
      action.textContent = t('pwa.notificationsDenied');
    } else if (perm === 'unsupported') {
      action.disabled = true;
      action.textContent = t('pwa.notificationsUnsupported');
    } else {
      action.addEventListener('click', async () => {
        action.disabled = true;
        const result = await requestNotificationPermission();
        if (result === 'granted') {
          action.textContent = t('pwa.notificationsGranted');
          showToast({ type: 'success', message: t('pwa.notificationsGranted'), duration: 1600 });
        } else if (result === 'denied') {
          action.textContent = t('pwa.notificationsDenied');
        } else if (result === 'unsupported') {
          action.textContent = t('pwa.notificationsUnsupported');
        } else {
          action.disabled = false;
        }
      });
    }
    list.appendChild(row(t('notifications.title'), action, ''));
  }

  /* Vibration (247) */
  {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn btn-secondary btn-sm';
    action.textContent = t('pwa.testVibrate');
    if (!caps.vibrate) {
      action.disabled = true;
      action.textContent = t('pwa.vibrationUnsupported');
    } else {
      action.addEventListener('click', () => {
        const ok = vibrate('success');
        showToast({
          type: ok ? 'success' : 'info',
          message: ok ? t('pwa.vibrationOk') : t('pwa.vibrationUnsupported'),
          duration: 1400,
        });
      });
    }
    list.appendChild(row(t('pwa.testVibrate'), action, ''));
  }

  /* Fullscreen (249) */
  {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'btn btn-secondary btn-sm';
    action.textContent = t('pwa.toggleFullscreen');
    if (!caps.fullscreen) {
      action.disabled = true;
      action.textContent = t('pwa.fullscreenUnsupported');
    } else {
      action.addEventListener('click', async () => {
        const entered = await toggleFullscreen();
        showToast({
          type: 'info',
          message: entered ? t('pwa.fullscreenOn') : t('pwa.fullscreenOff'),
          duration: 1400,
        });
      });
    }
    list.appendChild(row(t('pwa.toggleFullscreen'), action, ''));
  }

  section.appendChild(list);
  host.appendChild(section);
}

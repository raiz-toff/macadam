/*
 * Macadam — entry point.
 * F2: service worker (static shell), PWA manifest hooks, install prompt, standalone flag.
 * F4: Dexie / IndexedDB init (see src/core/db.js).
 */

import { db, initDatabase } from './core/db.js';
import './utils/formatters.js';
import './utils/calculations.js';
import './utils/locale.js';
import './utils/strings.js';
import './ui/icons.js';

/** @type {ServiceWorkerRegistration | null} */
let macadamSwRegistration = null;

let deferredInstallPrompt = null;

window.__macadam = window.__macadam || {
  version: '1.0.0',
  db: null,
  store: null,
  bus: null,
  router: null,
  triggerInstall: null,
  swRegistration: null,
};

function setStandaloneDataset() {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    /** @type {boolean | undefined} */ (window.navigator).standalone === true;
  if (standalone) {
    document.documentElement.dataset.installed = 'true';
  }
}

setStandaloneDataset();
window.matchMedia('(display-mode: standalone)').addEventListener('change', setStandaloneDataset);

function showSwUpdateBanner() {
  if (document.getElementById('macadam-sw-update-banner')) return;

  const bar = document.createElement('div');
  bar.id = 'macadam-sw-update-banner';
  bar.setAttribute('role', 'status');
  bar.style.cssText = [
    'position:fixed',
    'left:0',
    'right:0',
    'bottom:0',
    'z-index:400',
    'display:flex',
    'align-items:center',
    'justify-content:space-between',
    'gap:12px',
    'flex-wrap:wrap',
    'padding:12px 16px',
    'background:#1A1916',
    'color:#FAFAF8',
    'font:15px/1.4 system-ui,sans-serif',
    'box-shadow:0 -4px 24px rgba(0,0,0,0.2)',
  ].join(';');

  const msg = document.createElement('span');
  msg.textContent = 'App updated — reload for latest version';

  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Reload';
  reload.style.cssText = [
    'cursor:pointer',
    'border:none',
    'border-radius:8px',
    'padding:8px 16px',
    'font:inherit',
    'font-weight:600',
    'background:#F5A623',
    'color:#1A1916',
  ].join(';');
  reload.addEventListener('click', () => {
    window.location.reload();
  });

  bar.appendChild(msg);
  bar.appendChild(reload);
  document.body.appendChild(bar);
}

function watchForWaitingWorker(reg) {
  if (reg.waiting && navigator.serviceWorker.controller) {
    showSwUpdateBanner();
  }
  reg.addEventListener('updatefound', () => {
    const nw = reg.installing;
    if (!nw) return;
    nw.addEventListener('statechange', () => {
      if (nw.state === 'installed' && navigator.serviceWorker.controller) {
        showSwUpdateBanner();
      }
    });
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker
    .register('./sw.js', { type: 'module', scope: './' })
    .then((reg) => {
      macadamSwRegistration = reg;
      window.__macadam.swRegistration = reg;
      watchForWaitingWorker(reg);
      reg.update().catch(() => {});
    })
    .catch((err) => {
      console.warn('[macadam] service worker registration failed', err);
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

window.__macadam.triggerInstall = async () => {
  if (!deferredInstallPrompt) return false;
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  return choice.outcome === 'accepted';
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (macadamSwRegistration) {
    macadamSwRegistration.update().catch(() => {});
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  registerServiceWorker();

  const app = document.getElementById('app');
  if (!app) return;

  try {
    await initDatabase();
    window.__macadam.db = db;
    app.textContent = 'Macadam — IndexedDB ready (F4).';
  } catch (err) {
    console.error('[macadam] database init failed', err);
    app.textContent = 'Macadam — database init failed (see console).';
  }
});

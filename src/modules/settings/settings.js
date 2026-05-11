import SortableMod from '../../libs/sortable.min.js';
import { db, getUser, saveUser, getAppState, setAppState, purgeOldDeleted } from '../../core/db.js';
import { store } from '../../core/store.js';
import { bus, THEME_CHANGED, PLATFORM_CHANGED } from '../../core/events.js';
import { showConfirm, showToast } from '../../ui/components.js';
import { t } from '../../utils/strings.js';
import { resetVault } from '../onboarding/onboarding.js';
import { mountSettingsPlatforms } from './platforms-settings.js';

const Sortable = /** @type {any} */ (SortableMod).default || SortableMod;
const DEBUG_TAP_WINDOW_MS = 5500;
const PRESET_ACCENTS = [
  '#F5A623',
  '#FF4D4F',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#F97316',
  '#14B8A6',
  '#E11D48',
  '#22C55E',
  '#6366F1',
  '#D97706',
  '#6B7280',
];
const WIDGET_CHOICES = [
  'earnings',
  'weeklyGoal',
  'streak',
  'hourlyRate',
  'taxJar',
  'expenses',
  'schedule',
  'recentShifts',
];
const HERO_STAT_CHOICES = ['gross', 'net', 'hours', 'orders', 'tips', 'expenses', 'distance'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function estimateBytes(value) {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function defaultNotificationPrefs(prefs) {
  const base = prefs && typeof prefs === 'object' ? prefs : {};
  return {
    shiftReminders: Boolean(base.shiftReminders),
    goalAlerts: Boolean(base.goalAlerts),
    taxReminders: Boolean(base.taxReminders),
    weeklyDigest: Boolean(base.weeklyDigest),
    maintenanceDue: Boolean(base.maintenanceDue),
    insuranceExpiry: Boolean(base.insuranceExpiry),
    backupOverdue: Boolean(base.backupOverdue),
  };
}

function applyAccent(accent) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!accent) {
    root.style.removeProperty('--color-brand');
    root.style.removeProperty('--color-brand-dark');
    return;
  }
  root.style.setProperty('--color-brand', accent);
}

function applyFontSize(size) {
  if (typeof document === 'undefined') return;
  const map = { small: '14px', medium: '15px', large: '16px', xl: '17px' };
  document.documentElement.style.setProperty('--text-base', map[size] || map.medium);
}

function applyDensity(density) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.layoutDensity = density === 'compact' ? 'compact' : 'comfortable';
}

async function exportVaultSnapshot() {
  const tableNames = ['users', 'platforms', 'shifts', 'expenses', 'vehicles', 'goals', 'notifications', 'backupLog', 'appState'];
  const tables = {};
  for (const name of tableNames) {
    tables[name] = await db[name].toArray();
  }
  const payload = {
    app: 'Macadam',
    exportedAt: new Date().toISOString(),
    version: window.__macadam?.version || '1.0.0',
    tables,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `macadam-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  const ts = new Date().toISOString();
  await setAppState('last_backup', ts);
  await db.backupLog.add({ type: 'export', summary: 'Manual settings export', createdAt: ts });
}

async function runDataIntegrityCheck() {
  const issues = [];
  const shifts = await db.shifts.toArray();
  const expenses = await db.expenses.toArray();
  const platforms = await db.platforms.toArray();
  const platformIds = new Set(platforms.map((p) => String(p.id)));
  for (const s of shifts) {
    if (!s.date || Number.isNaN(new Date(`${s.date}T00:00:00`).getTime())) {
      issues.push(`Shift ${String(s.id ?? '?')} has invalid date.`);
    }
    if (s.platformId && !platformIds.has(String(s.platformId))) {
      issues.push(`Shift ${String(s.id ?? '?')} references missing platform "${String(s.platformId)}".`);
    }
  }
  for (const e of expenses) {
    if (!e.date || Number.isNaN(new Date(`${e.date}T00:00:00`).getTime())) {
      issues.push(`Expense ${String(e.id ?? '?')} has invalid date.`);
    }
    if (e.platformId && !platformIds.has(String(e.platformId))) {
      issues.push(`Expense ${String(e.id ?? '?')} references missing platform "${String(e.platformId)}".`);
    }
  }
  return issues;
}

async function dbStats() {
  const shifts = await db.shifts.filter((s) => s.deletedAt == null).toArray();
  const count = shifts.length;
  let minDate = null;
  let maxDate = null;
  let totalKm = 0;
  for (const s of shifts) {
    if (typeof s.date === 'string') {
      if (!minDate || s.date < minDate) minDate = s.date;
      if (!maxDate || s.date > maxDate) maxDate = s.date;
    }
    totalKm += Number(s.distanceKm) || 0;
  }
  return { count, minDate, maxDate, totalKm };
}

function mountKeyboardOverlay(host) {
  const existing = host.querySelector('[data-shortcuts-overlay]');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'settings-shortcuts-overlay';
  overlay.setAttribute('data-shortcuts-overlay', '1');
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="card card-raised settings-shortcuts-card" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <h3 class="settings-section-title">Keyboard shortcuts</h3>
      <ul class="settings-shortcuts-list">
        <li><kbd>g</kbd> then <kbd>d</kbd> — Dashboard</li>
        <li><kbd>g</kbd> then <kbd>s</kbd> — Shifts</li>
        <li><kbd>g</kbd> then <kbd>t</kbd> — Tax</li>
        <li><kbd>g</kbd> then <kbd>v</kbd> — Vehicles</li>
        <li><kbd>Esc</kbd> — Close overlays</li>
      </ul>
      <div class="settings-shortcuts-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-close-shortcuts>${esc(t('common.close'))}</button>
      </div>
    </div>
  `;
  host.appendChild(overlay);
  const close = () => {
    overlay.hidden = true;
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('[data-close-shortcuts]')?.addEventListener('click', close);
  return {
    open: () => {
      overlay.hidden = false;
    },
  };
}

/**
 * @param {HTMLElement} root
 * @param {Record<string, unknown>} ctx
 */
export async function mountSettings(root, ctx = {}) {
  root.textContent = '';
  const user = (await getUser()) || {};
  const notificationPrefs = defaultNotificationPrefs(user.notificationPrefs);
  const widgets = Array.isArray(user.dashboardWidgets) && user.dashboardWidgets.length ? [...user.dashboardWidgets] : [...WIDGET_CHOICES];
  const heroStats = Array.isArray(user.heroStats) && user.heroStats.length ? [...user.heroStats] : ['gross', 'hours', 'orders'];
  const aboutMode = ctx?.settingsTab === 'about';
  let debugTapCount = 0;
  let debugTapStartedAt = 0;
  let exportedThisSession = false;

  applyAccent(user.accentColor || null);
  applyFontSize(user.fontSize || 'medium');
  applyDensity(user.layoutDensity || 'comfortable');

  root.className = 'settings-root';
  root.innerHTML = `
    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">Profile</h2>
      <div class="settings-grid">
        <label class="input-group">
          <span class="input-label">Display name</span>
          <input class="input" type="text" data-setting-display-name value="${esc(user.displayName || '')}" />
        </label>
        <label class="input-group">
          <span class="input-label">Avatar emoji</span>
          <input class="input" type="text" maxlength="3" data-setting-avatar value="${esc(typeof user.avatarData === 'string' ? user.avatarData : '')}" placeholder="🙂" />
        </label>
      </div>
      <div class="settings-actions">
        <button type="button" class="btn btn-primary btn-sm" data-save-profile>${esc(t('common.save'))}</button>
      </div>
    </section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">Locale & appearance</h2>
      <div class="settings-grid">
        <label class="input-group">
          <span class="input-label">${esc(t('settings.currency'))}</span>
          <select class="input" data-setting-currency>
            ${['USD', 'CAD', 'EUR', 'GBP', 'AUD'].map((c) => `<option value="${c}" ${user?.locale?.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">${esc(t('settings.theme'))}</span>
          <select class="input" data-setting-theme>
            <option value="auto" ${user.theme === 'auto' ? 'selected' : ''}>Auto</option>
            <option value="light" ${user.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="dark" ${user.theme === 'dark' ? 'selected' : ''}>Dark</option>
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">Font size</span>
          <select class="input" data-setting-font>
            <option value="small" ${user.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${!user.fontSize || user.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${user.fontSize === 'large' ? 'selected' : ''}>Large</option>
            <option value="xl" ${user.fontSize === 'xl' ? 'selected' : ''}>XL</option>
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">Layout density</span>
          <select class="input" data-setting-density>
            <option value="comfortable" ${!user.layoutDensity || user.layoutDensity === 'comfortable' ? 'selected' : ''}>Comfortable</option>
            <option value="compact" ${user.layoutDensity === 'compact' ? 'selected' : ''}>Compact</option>
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">${esc(t('settings.dateFormat'))}</span>
          <select class="input" data-setting-date-format>
            <option value="YYYY-MM-DD" ${user?.locale?.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
            <option value="MM/DD/YYYY" ${user?.locale?.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
            <option value="DD/MM/YYYY" ${user?.locale?.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">Week starts on</span>
          <select class="input" data-setting-week-start>
            <option value="0" ${Number(user?.locale?.weekStartDay) === 0 ? 'selected' : ''}>Sunday</option>
            <option value="1" ${Number(user?.locale?.weekStartDay) === 1 ? 'selected' : ''}>Monday</option>
          </select>
        </label>
        <label class="input-group">
          <span class="input-label">Shift duration format</span>
          <select class="input" data-setting-time-format>
            <option value="12h" ${user?.locale?.timeFormat === '12h' ? 'selected' : ''}>12-hour</option>
            <option value="24h" ${user?.locale?.timeFormat === '24h' ? 'selected' : ''}>24-hour</option>
          </select>
        </label>
      </div>
      <div class="settings-accent">
        <p class="input-label">Accent color</p>
        <div class="settings-accent-swatches" data-setting-accent-swatches>
          ${PRESET_ACCENTS.map((hex) => `<button type="button" class="settings-accent-dot" data-accent="${hex}" style="--accent:${hex}" aria-label="Set accent ${hex}"></button>`).join('')}
        </div>
        <label class="input-group">
          <span class="input-label">Custom hex</span>
          <input class="input" data-setting-accent-hex value="${esc(user.accentColor || '')}" placeholder="#F5A623" />
        </label>
      </div>
      <div class="settings-actions">
        <button type="button" class="btn btn-primary btn-sm" data-save-display>${esc(t('common.save'))}</button>
      </div>
    </section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">Dashboard personalization</h2>
      <p class="text-secondary settings-section-lead">Drag to reorder widgets. Pick up to 3 hero stats.</p>
      <ul class="settings-sortable-list" data-widget-sort>
        ${widgets.map((w) => `<li class="settings-sortable-item" data-widget="${esc(w)}">${esc(w)}</li>`).join('')}
      </ul>
      <div class="settings-grid settings-tight-grid">
        ${HERO_STAT_CHOICES.map((s) => `<label class="settings-check"><input type="checkbox" data-hero-stat="${esc(s)}" ${heroStats.includes(s) ? 'checked' : ''} /> ${esc(s)}</label>`).join('')}
      </div>
      <label class="input-group">
        <span class="input-label">Bento layout preset</span>
        <select class="input" data-setting-bento>
          <option value="balanced" ${user.bentoLayout === 'balanced' ? 'selected' : ''}>Balanced</option>
          <option value="focus" ${user.bentoLayout === 'focus' ? 'selected' : ''}>Focus</option>
          <option value="dense" ${user.bentoLayout === 'dense' ? 'selected' : ''}>Dense</option>
        </select>
      </label>
      <div class="settings-actions">
        <button type="button" class="btn btn-primary btn-sm" data-save-dashboard>${esc(t('common.save'))}</button>
      </div>
    </section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">${esc(t('settings.notifications'))}</h2>
      <div class="settings-grid settings-tight-grid">
        ${Object.entries(notificationPrefs)
          .map(([k, v]) => `<label class="settings-check"><input type="checkbox" data-setting-notif="${esc(k)}" ${v ? 'checked' : ''} /> ${esc(k)}</label>`)
          .join('')}
      </div>
      <div class="settings-actions">
        <button type="button" class="btn btn-primary btn-sm" data-save-notifications>${esc(t('common.save'))}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-open-shortcuts>Keyboard shortcuts</button>
      </div>
    </section>

    <section class="settings-view-section card card-raised" data-platforms-host></section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">Data health</h2>
      <p class="text-secondary settings-section-lead">Vault usage, integrity checks, and archive helpers.</p>
      <div class="settings-data-health" data-data-health-output>Loading...</div>
      <div class="settings-row-inline">
        <label class="input-group">
          <span class="input-label">Auto-archive deleted records older than days</span>
          <input class="input" data-archive-days type="number" min="7" step="1" value="30" />
        </label>
        <button type="button" class="btn btn-secondary btn-sm" data-run-archive>Run archive</button>
      </div>
      <div class="settings-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-run-integrity>Run integrity check</button>
      </div>
      <pre class="settings-pre" data-integrity-output aria-live="polite"></pre>
    </section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">${esc(t('settings.dangerZone'))}</h2>
      <div class="settings-grid">
        <label class="input-group">
          <span class="input-label">Reset single platform</span>
          <select class="input" data-reset-platform-select>
            ${(await db.platforms.toArray()).map((p) => `<option value="${esc(String(p.id))}">${esc(String(p.name || p.id))}</option>`).join('')}
          </select>
        </label>
      </div>
      <div class="settings-actions">
        <button type="button" class="btn btn-danger btn-sm" data-reset-platform>Reset platform data</button>
      </div>
      <hr class="settings-divider" />
      <p class="text-secondary settings-section-lead">Export is required before full vault wipe.</p>
      <div class="settings-actions">
        <button type="button" class="btn btn-secondary btn-sm" data-export-backup>Export backup first</button>
        <button type="button" class="btn btn-danger btn-sm" data-reset-vault>Reset vault</button>
      </div>
    </section>

    <section class="settings-view-section card card-raised">
      <h2 class="settings-section-title">${esc(t('settings.about'))}</h2>
      <p class="text-secondary settings-section-lead">Version ${esc(window.__macadam?.version || '1.0.0')} · local-first data vault.</p>
      <div class="settings-actions settings-wrap">
        <button type="button" class="btn btn-secondary btn-sm" data-open-install>Install Macadam</button>
        <a class="btn btn-secondary btn-sm" href="#/about">Data Portability Manifesto</a>
        <a class="btn btn-secondary btn-sm" href="https://github.com/" target="_blank" rel="noopener noreferrer">Changelog</a>
        <a class="btn btn-secondary btn-sm" href="mailto:support@macadam.app">Support</a>
        <button type="button" class="btn btn-secondary btn-sm" data-share-macadam>Share Macadam</button>
        <a class="btn btn-secondary btn-sm" href="https://en.wikipedia.org/wiki/Glossary_of_economics" target="_blank" rel="noopener noreferrer">Driver Financial Glossary</a>
      </div>
      <div class="settings-help-links">
        <a href="https://help.doordash.com/" target="_blank" rel="noopener noreferrer">DoorDash help</a>
        <a href="https://help.uber.com/" target="_blank" rel="noopener noreferrer">Uber help</a>
        <a href="https://www.instacart.com/help" target="_blank" rel="noopener noreferrer">Instacart help</a>
      </div>
      <button type="button" class="btn btn-ghost btn-sm" data-debug-tap>${aboutMode ? 'About mode active' : 'Tap app version 5 times to unlock debug mode'}</button>
      <p class="text-xs text-secondary" data-debug-hint></p>
    </section>
  `;

  const shortcuts = mountKeyboardOverlay(root);
  const platformsHost = /** @type {HTMLElement | null} */ (root.querySelector('[data-platforms-host]'));
  if (platformsHost) await mountSettingsPlatforms(platformsHost);

  const widgetSort = /** @type {HTMLElement | null} */ (root.querySelector('[data-widget-sort]'));
  if (widgetSort) {
    Sortable.create(widgetSort, { animation: 150, ghostClass: 'sortable-ghost' });
  }

  async function refreshDataHealth() {
    const out = root.querySelector('[data-data-health-output]');
    if (!out) return;
    const [stats, backupRows, shiftCount, expenseCount, users] = await Promise.all([
      dbStats(),
      db.backupLog.orderBy('createdAt').reverse().limit(5).toArray(),
      db.shifts.count(),
      db.expenses.count(),
      db.users.count(),
    ]);
    const usage = estimateBytes({
      shifts: shiftCount,
      expenses: expenseCount,
      users,
      backupRows,
      stats,
    });
    out.innerHTML = `
      <p><strong>Estimated vault size:</strong> ${esc(formatBytes(usage))}</p>
      <p><strong>Shift count:</strong> ${esc(stats.count)} · <strong>Date range:</strong> ${esc(stats.minDate || 'n/a')} to ${esc(stats.maxDate || 'n/a')} · <strong>Total km:</strong> ${esc(stats.totalKm.toFixed(1))}</p>
      <p><strong>Recent backups:</strong> ${backupRows.length ? esc(backupRows.map((r) => r.createdAt).join(' | ')) : 'none yet'}</p>
    `;
  }

  root.querySelector('[data-save-profile]')?.addEventListener('click', async () => {
    const name = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-setting-display-name]'))?.value || '';
    const avatar = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-setting-avatar]'))?.value || '';
    await saveUser({ displayName: name.trim(), avatarType: avatar.trim() ? 'emoji' : 'initials', avatarData: avatar.trim() || null });
    await store.refresh('user');
    showToast({ type: 'success', message: 'Profile saved.' });
  });

  root.querySelector('[data-save-display]')?.addEventListener('click', async () => {
    const currency = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-currency]'))?.value || 'USD';
    const theme = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-theme]'))?.value || 'auto';
    const fontSize = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-font]'))?.value || 'medium';
    const layoutDensity = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-density]'))?.value || 'comfortable';
    const dateFormat = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-date-format]'))?.value || 'YYYY-MM-DD';
    const weekStartDay = Number(/** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-week-start]'))?.value || 0);
    const timeFormat = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-time-format]'))?.value || '12h';
    const accentRaw = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-setting-accent-hex]'))?.value || '';
    const accentColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(accentRaw.trim()) ? accentRaw.trim() : null;
    const prevLocale = user?.locale && typeof user.locale === 'object' ? user.locale : {};
    await saveUser({
      theme: theme === 'light' || theme === 'dark' || theme === 'auto' ? theme : 'auto',
      accentColor,
      fontSize,
      layoutDensity: layoutDensity === 'compact' ? 'compact' : 'comfortable',
      locale: {
        ...prevLocale,
        currency,
        dateFormat,
        weekStartDay: weekStartDay === 1 ? 1 : 0,
        timeFormat: timeFormat === '24h' ? '24h' : '12h',
      },
    });
    applyAccent(accentColor);
    applyFontSize(fontSize);
    applyDensity(layoutDensity);
    await store.refresh('user');
    bus.emit(THEME_CHANGED, { theme });
    showToast({ type: 'success', message: 'Display settings saved.' });
  });

  root.querySelectorAll('[data-accent]').forEach((el) => {
    el.addEventListener('click', () => {
      const hex = el.getAttribute('data-accent');
      const input = /** @type {HTMLInputElement | null} */ (root.querySelector('[data-setting-accent-hex]'));
      if (!hex || !input) return;
      input.value = hex;
      applyAccent(hex);
    });
  });

  root.querySelector('[data-save-dashboard]')?.addEventListener('click', async () => {
    const order = [...root.querySelectorAll('[data-widget-sort] [data-widget]')].map((el) => String(el.getAttribute('data-widget')));
    const selectedHero = [...root.querySelectorAll('[data-hero-stat]:checked')].map((el) => String(el.getAttribute('data-hero-stat'))).slice(0, 3);
    const bentoLayout = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-setting-bento]'))?.value || 'balanced';
    await saveUser({ dashboardWidgets: order, heroStats: selectedHero, bentoLayout });
    await store.refresh('user');
    showToast({ type: 'success', message: 'Dashboard personalization saved.' });
  });

  root.querySelector('[data-save-notifications]')?.addEventListener('click', async () => {
    const next = {};
    root.querySelectorAll('[data-setting-notif]').forEach((el) => {
      if (el instanceof HTMLInputElement) {
        const key = el.getAttribute('data-setting-notif');
        if (key) next[key] = el.checked;
      }
    });
    await saveUser({ notificationPrefs: next });
    await store.refresh('user');
    showToast({ type: 'success', message: 'Notification settings saved.' });
  });

  root.querySelector('[data-open-shortcuts]')?.addEventListener('click', () => shortcuts.open());

  root.querySelector('[data-run-integrity]')?.addEventListener('click', async () => {
    const out = root.querySelector('[data-integrity-output]');
    if (!out) return;
    const issues = await runDataIntegrityCheck();
    out.textContent = issues.length ? issues.join('\n') : 'Integrity check passed. No issues found.';
  });

  root.querySelector('[data-run-archive]')?.addEventListener('click', async () => {
    const days = Number(/** @type {HTMLInputElement | null} */ (root.querySelector('[data-archive-days]'))?.value || 30);
    const cleanDays = Number.isFinite(days) ? Math.max(7, Math.floor(days)) : 30;
    await purgeOldDeleted('shifts', cleanDays);
    await purgeOldDeleted('expenses', cleanDays);
    await db.backupLog.add({ type: 'archive', summary: `Purged deleted rows older than ${cleanDays}d`, createdAt: new Date().toISOString() });
    await refreshDataHealth();
    showToast({ type: 'info', message: 'Archive sweep complete.' });
  });

  root.querySelector('[data-reset-platform]')?.addEventListener('click', async () => {
    const platformId = /** @type {HTMLSelectElement | null} */ (root.querySelector('[data-reset-platform-select]'))?.value || '';
    if (!platformId) return;
    showConfirm({
      title: 'Reset platform data?',
      message: `This deactivates ${platformId} and detaches existing shifts/expenses from it.`,
      confirmLabel: 'Reset platform',
      confirmClass: 'btn btn-danger',
      onConfirm: async () => {
        await db.platforms.update(platformId, { active: false, deactivatedAt: new Date().toISOString() });
        await db.shifts.where('platformId').equals(platformId).modify({ platformId: null });
        await db.expenses.where('platformId').equals(platformId).modify({ platformId: null });
        const fresh = await getUser();
        const nextIds = Array.isArray(fresh?.platforms) ? fresh.platforms.filter((id) => id !== platformId) : [];
        await saveUser({
          platforms: nextIds,
          primaryPlatform: fresh?.primaryPlatform === platformId ? nextIds[0] || null : fresh?.primaryPlatform || null,
        });
        await store.refresh('user');
        await store.refresh('platforms');
        bus.emit(PLATFORM_CHANGED, { source: 'settings_reset_platform', platformId });
        showToast({ type: 'info', message: 'Platform reset complete.' });
      },
    });
  });

  root.querySelector('[data-export-backup]')?.addEventListener('click', async () => {
    try {
      await exportVaultSnapshot();
      exportedThisSession = true;
      await refreshDataHealth();
      showToast({ type: 'success', message: 'Backup exported.' });
    } catch (e) {
      console.error(e);
      showToast({ type: 'error', message: t('errors.exportFailed') });
    }
  });

  root.querySelector('[data-reset-vault]')?.addEventListener('click', async () => {
    if (!exportedThisSession) {
      showToast({ type: 'warning', message: 'Export a backup first.' });
      return;
    }
    await resetVault();
  });

  root.querySelector('[data-open-install]')?.addEventListener('click', async () => {
    const installed = document.documentElement.dataset.installed === 'true';
    if (installed) {
      showToast({ type: 'info', message: 'Macadam is already installed.' });
      return;
    }
    const accepted = await window.__macadam?.triggerInstall?.();
    if (accepted) showToast({ type: 'success', message: 'Install prompt accepted.' });
    else showToast({ type: 'info', message: 'Install prompt not available right now.' });
  });

  root.querySelector('[data-share-macadam]')?.addEventListener('click', async () => {
    const shareData = {
      title: 'Macadam',
      text: 'Track your gig work earnings with a local-first vault.',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast({ type: 'success', message: 'Link copied.' });
    } catch {
      showToast({ type: 'warning', message: 'Copy not available in this browser.' });
    }
  });

  root.querySelector('[data-debug-tap]')?.addEventListener('click', async () => {
    const now = Date.now();
    if (now - debugTapStartedAt > DEBUG_TAP_WINDOW_MS) {
      debugTapStartedAt = now;
      debugTapCount = 0;
    }
    debugTapCount += 1;
    const hint = root.querySelector('[data-debug-hint]');
    if (debugTapCount >= 5) {
      await setAppState('debug_mode_unlocked', true);
      if (hint) hint.textContent = 'Debug mode unlocked.';
      showToast({ type: 'success', message: 'Debug mode unlocked.' });
      debugTapCount = 0;
      debugTapStartedAt = now;
      return;
    }
    if (hint) hint.textContent = `${5 - debugTapCount} more taps to unlock debug mode.`;
  });

  const debugUnlocked = await getAppState('debug_mode_unlocked');
  if (debugUnlocked) {
    const hint = root.querySelector('[data-debug-hint]');
    if (hint) hint.textContent = 'Debug mode is already unlocked.';
  }

  await refreshDataHealth();
}

export { mountSettingsPlatforms };

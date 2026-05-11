/**
 * F9 — Onboarding orchestrator: session progress, steps, Dexie persistence, completion, vault reset.
 */

import { db, saveUser, getUser, getAppState, setAppState } from '../../core/db.js';
import { store } from '../../core/store.js';
import { Router } from '../../core/router.js';
import {
  bus,
  ONBOARDING_COMPLETE,
  PLATFORM_CHANGED,
  THEME_CHANGED,
  GOAL_UPDATED,
  VAULT_RESET,
} from '../../core/events.js';
import { t } from '../../utils/strings.js';
import { getLocaleConfig } from '../../utils/locale.js';
import { getCountryTaxProfile } from '../../registry/countries/index.js';
import { getDefaultSamplePlatformId } from '../../registry/platforms/index.js';
import { showConfirm, showToast } from '../../ui/components.js';
import {
  TOTAL_STEPS,
  defaultDraftFromUser,
  renderStepInner,
  validateStep,
  applyTaxPreset,
} from './steps.js';

/** @typedef {import('./steps.js').OnboardingDraft} OnboardingDraft */

export const ONBOARDING_SESSION_KEY = 'macadam_onboarding_session_v1';

const SAMPLE_NOTE = '[Macadam sample data]';

function nowIso() {
  return new Date().toISOString();
}

function interpolate(str, vars) {
  let out = String(str);
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

/**
 * @param {OnboardingDraft} draft
 */
function persistSession(draft) {
  try {
    sessionStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(ONBOARDING_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    return /** @type {OnboardingDraft} */ (o);
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(ONBOARDING_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Build JSON export of preferences only (Feature 265).
 * @param {OnboardingDraft} draft
 * @param {Record<string, unknown>} user
 */
export function buildOnboardingSetupExport(draft, user) {
  const u = user && typeof user === 'object' ? user : {};
  return {
    exportKind: 'macadam_setup',
    version: 1,
    exportedAt: nowIso(),
    displayName: draft.displayName,
    avatarType: draft.avatarType,
    avatarData: draft.avatarType === 'custom' ? (draft.avatarData ? '[base64 omitted]' : null) : draft.avatarData,
    platforms: draft.selectedPlatforms,
    locale: {
      ...(typeof u.locale === 'object' && u.locale ? u.locale : {}),
      country: draft.country,
      ...(() => {
        const c = getLocaleConfig(draft.country);
        return { currency: c.currency, currencySymbol: c.symbol, distanceUnit: draft.distanceUnit };
      })(),
    },
    vehicles: draft.vehicles.filter((_, i) => i === 0 || draft.addSecondVehicle),
    homeBase: { label: draft.homeBaseLabel },
    workSchedule: { preset: draft.workSchedulePreset },
    weeklyGoal: draft.weeklyGoal,
    monthlyGoal: draft.monthlyGoal,
    annualGoal: draft.annualGoal,
    taxWithholdingPct: draft.taxWithholdingPct,
    taxRegion: draft.taxRegion,
    hstRegistered: draft.hstRegistered,
    theme: draft.theme,
    notificationPrefs: draft.notificationPrefs,
  };
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Insert two weeks of sample shifts (Feature 262). Watermarked via `isPlaceholder` + notes.
 */
export async function loadSampleData() {
  const user = await getUser();
  const platformId =
    (Array.isArray(user?.platforms) && user.platforms[0]) ||
    (await db.platforms.filter((p) => p.active).first())?.id ||
    getDefaultSamplePlatformId();
  const t0 = nowIso();
  const rows = [];
  for (let d = 0; d < 14; d += 1) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    rows.push({
      platformId,
      date: dateStr,
      startTime: '11:00',
      endTime: '15:00',
      durationMinutes: 240,
      grossEarnings: 80 + d * 3,
      tips: 12,
      bonusEarnings: 5,
      deliveryCount: 8 + (d % 4),
      distanceKm: 40 + d,
      onlineMinutes: 250,
      activeMinutes: 200,
      vehicleId: null,
      weather: 'Clear',
      zoneTag: 'Downtown',
      moodTag: '🙂',
      notes: SAMPLE_NOTE,
      isTemplate: false,
      templateName: null,
      isPlaceholder: true,
      isMultiApp: false,
      multiAppSplit: {},
      deletedAt: null,
      createdAt: t0,
      updatedAt: t0,
    });
  }
  await db.shifts.bulkAdd(rows);
  await setAppState('demo_mode', true);
  bus.emit(GOAL_UPDATED, { source: 'sample' });
}

/** Remove sample shifts created by `loadSampleData`. */
export async function clearSampleData() {
  const all = await db.shifts.filter((s) => s.isPlaceholder === true || (typeof s.notes === 'string' && s.notes.includes(SAMPLE_NOTE))).toArray();
  for (const s of all) {
    if (s.id != null) await db.shifts.delete(s.id);
  }
  await setAppState('demo_mode', false);
  bus.emit(GOAL_UPDATED, { source: 'sample_clear' });
}

/**
 * Wipe vault after backup + typed RESET (Feature 20). Settings should call when export exists.
 * @param {{ skipExportCheck?: boolean }} [opts]
 */
export async function resetVault(opts = {}) {
  const skip = Boolean(opts?.skipExportCheck);
  if (!skip) {
    const last = await getAppState('last_backup');
    if (last == null || last === '') {
      showToast({ type: 'warning', message: t('onboarding.resetNeedExport'), duration: 5000 });
      return;
    }
  }
  showConfirm({
    title: t('onboarding.resetTitle'),
    message: t('onboarding.resetMessage'),
    confirmLabel: t('onboarding.resetConfirm'),
    confirmClass: 'btn btn-danger',
    requireType: 'RESET',
    onConfirm: async () => {
      await db.delete();
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch {
        /* ignore */
      }
      bus.emit(VAULT_RESET, {});
      window.location.hash = '#/onboarding';
      window.location.reload();
    },
  });
}

/**
 * @param {OnboardingDraft} draft
 */
async function applyPlatformsFromDraft(draft) {
  const ts = nowIso();
  const ids = new Set(draft.selectedPlatforms);
  const all = await db.platforms.toArray();
  for (const p of all) {
    const active = ids.has(p.id);
    await db.platforms.update(p.id, {
      active,
      deactivatedAt: active ? null : p.deactivatedAt || ts,
    });
  }
  const primary = draft.selectedPlatforms[0] || null;
  await saveUser({
    platforms: [...draft.selectedPlatforms],
    primaryPlatform: primary,
  });
  await store.refresh('platforms');
  bus.emit(PLATFORM_CHANGED, { source: 'onboarding' });
}

/**
 * @param {OnboardingDraft} draft
 */
async function persistVehicles(draft) {
  const ts = nowIso();
  const toSave = [draft.vehicles[0]].filter(Boolean);
  if (draft.addSecondVehicle && draft.vehicles[1]) toSave.push(draft.vehicles[1]);
  const existing = await db.vehicles.toArray();
  for (const e of existing) {
    if (e.id != null) await db.vehicles.delete(e.id);
  }
  for (const v of toSave) {
    const yearNum = v.year === '' || v.year == null ? null : Number(v.year);
    await db.vehicles.add({
      nickname: v.nickname.trim(),
      type: /** @type {'gas'} */ (v.type) || 'gas',
      make: v.make || '',
      model: v.model || '',
      year: Number.isFinite(yearNum) ? yearNum : null,
      color: '',
      fuelEfficiency: null,
      currentFuelPrice: null,
      kwPer100km: null,
      electricityRate: null,
      maintenanceCostPerKm: null,
      purchasePrice: null,
      expectedLifespanKm: null,
      totalKmLogged: 0,
      active: true,
      createdAt: ts,
      updatedAt: ts,
    });
  }
}

/**
 * @param {OnboardingDraft} draft
 */
async function persistWeeklyGoalRow(draft) {
  const row = await db.goals.filter((g) => g.scope === 'weekly' && g.type === 'earnings').first();
  if (row?.id != null) {
    await db.goals.update(row.id, {
      target: Number(draft.weeklyGoal) || 0,
      active: true,
    });
  }
  bus.emit(GOAL_UPDATED, { source: 'onboarding' });
}

/**
 * Merge session draft onto defaults.
 * @param {OnboardingDraft | null} saved
 * @param {OnboardingDraft} base
 */
function mergeDraft(saved, base) {
  if (!saved) return { ...base, step: 0 };
  const { step, vehicles: sv, notificationPrefs: np, ...rest } = saved;
  const vehicles = [
    { ...base.vehicles[0], ...(sv && sv[0] && typeof sv[0] === 'object' ? sv[0] : {}) },
    { ...base.vehicles[1], ...(sv && sv[1] && typeof sv[1] === 'object' ? sv[1] : {}) },
  ];
  return {
    ...base,
    ...rest,
    vehicles,
    notificationPrefs: { ...base.notificationPrefs, ...(np && typeof np === 'object' ? np : {}) },
    step: typeof step === 'number' && step >= 0 && step < TOTAL_STEPS ? step : 0,
  };
}

/**
 * Read draft from form into object (partial).
 * @param {HTMLElement} root
 * @param {OnboardingDraft} draft
 */
function readFormIntoDraft(root, draft) {
  root.querySelectorAll('[data-field]').forEach((el) => {
    const field = el.getAttribute('data-field');
    if (!field || !(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    if (el.type === 'checkbox') {
      /** @type {keyof OnboardingDraft} */ (draft)[field] = el.checked;
      return;
    }
    if (field === 'weeklyGoal' || field === 'monthlyGoal' || field === 'annualGoal' || field === 'taxWithholdingPct') {
      draft[field] = Number(el.value) || 0;
      return;
    }
    if (field === 'country') {
      draft.country = el.value;
      const cfg = getLocaleConfig(el.value);
      draft.distanceUnit = cfg.distanceUnit;
      return;
    }
    draft[field] = el.value;
  });

  root.querySelectorAll('[data-vehicle-idx]').forEach((el) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return;
    const idx = Number(el.getAttribute('data-vehicle-idx'));
    const vf = el.getAttribute('data-vehicle-field');
    if (!Number.isFinite(idx) || !vf || !draft.vehicles[idx]) return;
    draft.vehicles[idx][vf] = el.value;
  });

  root.querySelectorAll('[data-np]').forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    const k = el.getAttribute('data-np');
    if (k && draft.notificationPrefs) draft.notificationPrefs[k] = el.checked;
  });
}

/**
 * Mount onboarding UI into `root`.
 * @param {HTMLElement} root
 */
export async function mountOnboarding(root) {
  const user = await getUser();
  if (user?.onboardingComplete) {
    Router.navigate('#/dashboard');
    return;
  }

  const baseDraft = defaultDraftFromUser(user);
  const sessionSnap = readSession();
  let draft = mergeDraft(sessionSnap, baseDraft);

  const platformRows = await db.platforms.toArray();
  platformRows.sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));

  const render = () => {
    const step = draft.step;
    const inner = renderStepInner(step, draft, platformRows);
    const isFirst = step === 0;
    const isLast = step === TOTAL_STEPS - 1;
    const dots = Array.from({ length: TOTAL_STEPS }, (_, i) => `<span class="onboarding-dot${i === step ? ' is-active' : i < step ? ' is-done' : ''}" aria-hidden="true"></span>`).join('');
    const progressLabel = interpolate(t('onboarding.stepProgress'), { current: String(step + 1), total: String(TOTAL_STEPS) });

    root.innerHTML = `
      <div class="onboarding-flow" role="region" aria-label="${escAttr(t('views.onboarding.title'))}">
        <div class="onboarding-top">
          <div class="onboarding-progress" aria-label="${escAttr(progressLabel)}">${dots}</div>
          <p class="onboarding-progress-text">${escHtml(progressLabel)}</p>
          <button type="button" class="btn btn-ghost btn-sm onboarding-demo" data-demo>${escHtml(t('onboarding.tryDemo'))}</button>
        </div>
        <div class="onboarding-body card card-raised" data-step-body>${inner}</div>
        <div class="onboarding-nav" ${isLast ? 'hidden' : ''}>
          <button type="button" class="btn btn-secondary" data-back ${isFirst ? 'disabled' : ''}>${escHtml(t('common.back'))}</button>
          <button type="button" class="btn btn-primary" data-next>${escHtml(t('common.next'))}</button>
        </div>
      </div>`;

    bindStep(root);
  };

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  /** @param {HTMLElement} el */
  function bindStep(el) {
    const body = el.querySelector('[data-step-body]');
    if (!body) return;

    body.querySelectorAll('[data-platform-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-platform-id');
        if (!id) return;
        const set = new Set(draft.selectedPlatforms);
        if (set.has(id)) set.delete(id);
        else set.add(id);
        draft.selectedPlatforms = [...set];
        persistSession(draft);
        render();
      });
    });

    body.querySelectorAll('[data-avatar-emoji]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const em = btn.getAttribute('data-avatar-emoji');
        if (em) {
          draft.avatarType = 'emoji';
          draft.avatarData = em;
          persistSession(draft);
          render();
        }
      });
    });

    body.querySelectorAll('[data-avatar-type]').forEach((radio) => {
      radio.addEventListener('change', () => {
        if (radio instanceof HTMLInputElement && radio.checked) {
          draft.avatarType = /** @type {'initials'|'custom'} */ (radio.value);
          if (draft.avatarType === 'initials') draft.avatarData = null;
          persistSession(draft);
          render();
        }
      });
    });

    const file = body.querySelector('[data-avatar-file]');
    if (file instanceof HTMLInputElement) {
      file.addEventListener('change', () => {
        const f = file.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          draft.avatarType = 'custom';
          draft.avatarData = typeof reader.result === 'string' ? reader.result : null;
          persistSession(draft);
          render();
        };
        reader.readAsDataURL(f);
      });
    }

    body.querySelectorAll('[data-schedule]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-schedule');
        if (p) {
          draft.workSchedulePreset = p;
          persistSession(draft);
          render();
        }
      });
    });

    body.querySelectorAll('[data-distance]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const d = btn.getAttribute('data-distance');
        if (d === 'km' || d === 'mi') {
          draft.distanceUnit = d;
          persistSession(draft);
          render();
        }
      });
    });

    body.querySelectorAll('[data-theme]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const th = btn.getAttribute('data-theme');
        if (th === 'light' || th === 'dark' || th === 'auto') {
          draft.theme = th;
          persistSession(draft);
          await saveUser({ theme: th });
          await store.refresh('user');
          bus.emit(THEME_CHANGED, { theme: th });
          render();
        }
      });
    });

    const weeklyInput = body.querySelector('[data-field="weeklyGoal"]');
    if (weeklyInput instanceof HTMLInputElement) {
      const syncMotivation = () => {
        const w = Number(weeklyInput.value) || 0;
        const labelKey =
          w >= 800 ? 'onboarding.motivation.high' : w >= 400 ? 'onboarding.motivation.mid' : w >= 200 ? 'onboarding.motivation.low' : 'onboarding.motivation.start';
        const m = body.querySelector('[data-motivation]');
        if (m) m.textContent = t(labelKey);
      };
      weeklyInput.addEventListener('input', syncMotivation);
      syncMotivation();
    }

    const countrySel = body.querySelector('[data-field="country"]');
    if (countrySel instanceof HTMLSelectElement) {
      countrySel.addEventListener('change', () => {
        draft.country = countrySel.value;
        const cfg = getLocaleConfig(draft.country);
        draft.distanceUnit = cfg.distanceUnit;
        persistSession(draft);
      });
    }

    const taxPresetBtn = body.querySelector('[data-tax-preset]');
    if (taxPresetBtn) {
      taxPresetBtn.addEventListener('click', () => {
        readFormIntoDraft(el, draft);
        draft.taxWithholdingPct = applyTaxPreset(draft);
        persistSession(draft);
        render();
      });
    }

    const add2cb = body.querySelector('[data-field="addSecondVehicle"]');
    if (add2cb instanceof HTMLInputElement) {
      add2cb.addEventListener('change', () => {
        readFormIntoDraft(el, draft);
        persistSession(draft);
        render();
      });
    }

    const enter = body.querySelector('[data-enter-vault]');
    if (enter instanceof HTMLButtonElement) {
      enter.addEventListener('click', () => void finalizeOnboarding(el));
    }
    const exportBtn = body.querySelector('[data-export-setup]');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        readFormIntoDraft(el, draft);
        const u = await getUser();
        downloadJson('macadam-setup.json', buildOnboardingSetupExport(draft, u));
        showToast({ type: 'success', message: t('onboarding.exportDone') });
      });
    }
    const sampleBtn = body.querySelector('[data-load-sample]');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', async () => {
        try {
          await loadSampleData();
          showToast({ type: 'info', message: t('onboarding.sample.loaded') });
        } catch (e) {
          console.error(e);
          showToast({ type: 'error', message: t('errors.generic') });
        }
      });
    }

    el.querySelector('[data-demo]')?.addEventListener('click', async () => {
      await setAppState('demo_mode', true);
      showToast({ type: 'info', message: t('onboarding.demoEnabled') });
    });

    el.querySelector('[data-back]')?.addEventListener('click', () => {
      readFormIntoDraft(el, draft);
      if (draft.step <= 0) return;
      draft.step -= 1;
      persistSession(draft);
      void saveUser({ onboardingStep: draft.step });
      render();
    });

    el.querySelector('[data-next]')?.addEventListener('click', async () => {
      readFormIntoDraft(el, draft);
      if (draft.step === 7) {
        draft.monthlyGoal = Math.round(draft.weeklyGoal * 4.33);
        draft.annualGoal = Math.round(draft.weeklyGoal * 52);
      }
      const err = validateStep(draft.step, draft);
      if (err) {
        showToast({ type: 'warning', message: t(err) });
        return;
      }
      if (draft.step === 0) await applyPlatformsFromDraft(draft);
      if (draft.step < TOTAL_STEPS - 1) {
        draft.step += 1;
      }
      persistSession(draft);
      await saveUser({ onboardingStep: draft.step });
      render();
    });
  }

  async function finalizeOnboarding(container) {
    readFormIntoDraft(container, draft);
    const cfg = getLocaleConfig(draft.country);
    const workSchedule = { preset: draft.workSchedulePreset, label: t(`onboarding.schedule.${draft.workSchedulePreset}`) };

    await applyPlatformsFromDraft(draft);
    await persistVehicles(draft);
    await persistWeeklyGoalRow(draft);

    await saveUser({
      displayName: draft.displayName.trim(),
      avatarType: draft.avatarType,
      avatarData: draft.avatarData,
      locale: {
        country: draft.country,
        currency: cfg.currency,
        currencySymbol: cfg.symbol,
        distanceUnit: draft.distanceUnit,
        dateFormat: 'YYYY-MM-DD',
        weekStartDay: 0,
        timeFormat: '12h',
      },
      homeBase: { label: draft.homeBaseLabel.trim() },
      workSchedule,
      weeklyGoal: draft.weeklyGoal,
      monthlyGoal: draft.monthlyGoal,
      annualGoal: draft.annualGoal,
      taxWithholdingPct: draft.taxWithholdingPct,
      hstRegistered: getCountryTaxProfile(draft.country).hstOnboarding ? draft.hstRegistered : false,
      theme: draft.theme,
      notificationPrefs: { ...draft.notificationPrefs },
      onboardingComplete: true,
      onboardingStep: TOTAL_STEPS,
    });

    clearSession();
    await store.refresh('user');
    await store.refresh('platforms');
    bus.emit(ONBOARDING_COMPLETE, { displayName: draft.displayName });
    showToast({ type: 'celebration', message: t('onboarding.completeToast'), duration: 4500 });
    Router.navigate('#/dashboard');
  }

  render();

  if (sessionSnap && typeof sessionSnap.step === 'number' && sessionSnap.step > 0) {
    showConfirm({
      title: t('onboarding.resumeTitle'),
      message: t('onboarding.resumeMessage'),
      confirmLabel: t('onboarding.resumeContinue'),
      cancelLabel: t('onboarding.resumeStartOver'),
      onConfirm: () => {
        draft = mergeDraft(sessionSnap, baseDraft);
        persistSession(draft);
        render();
      },
      onCancel: () => {
        clearSession();
        draft = { ...baseDraft, step: 0 };
        persistSession(draft);
        render();
      },
    });
  }
}

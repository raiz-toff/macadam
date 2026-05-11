/**
 * F9 — Onboarding step bodies (plain HTML strings). Chrome lives in `onboarding.js`.
 * @see plan.md F9 — fifteen enumerated steps (platforms → completion).
 *
 * Category D (feature_modularity.md): a new **global** onboarding step still lands here —
 * bump `TOTAL_STEPS`, extend `renderStepInner` / `validateStep`, and persist fields via `onboarding.js`.
 */

/**
 * @typedef {Object} OnboardingDraft
 * @property {number} step
 * @property {string[]} selectedPlatforms
 * @property {string} displayName
 * @property {'emoji'|'initials'|'custom'} avatarType
 * @property {string|null} avatarData
 * @property {string} country
 * @property {{ nickname: string; type: string; make: string; model: string; year: string }[]} vehicles
 * @property {boolean} addSecondVehicle
 * @property {string} homeBaseLabel
 * @property {string} workSchedulePreset
 * @property {number} weeklyGoal
 * @property {number} monthlyGoal
 * @property {number} annualGoal
 * @property {string} taxRegion
 * @property {number} taxWithholdingPct
 * @property {boolean} hstRegistered
 * @property {'km'|'mi'} distanceUnit
 * @property {'light'|'dark'|'auto'} theme
 * @property {{ shiftReminders: boolean; goalAlerts: boolean; taxReminders: boolean; weeklyDigest: boolean }} notificationPrefs
 */

import { t } from '../../utils/strings.js';
import { getLocaleConfig } from '../../utils/locale.js';
import { CountryRegistry, getCountryTaxProfile } from '../../registry/countries/index.js';
import { getPlatformColor, renderPlatformBadge } from '../../ui/components.js';

export const TOTAL_STEPS = 15;

const VEHICLE_TYPES = ['gas', 'hybrid', 'ev', 'motorcycle', 'bicycle', 'ebike', 'scooter', 'walking'];

const TAX_PRESET_CA = {
  ON: 30,
  QC: 30,
  BC: 25,
  AB: 25,
  MB: 28,
  SK: 28,
  NS: 32,
  NB: 30,
  PE: 30,
  NL: 32,
  NT: 25,
  YT: 25,
  NU: 25,
};

const TAX_PRESET_US = {
  CA: 32,
  NY: 35,
  NJ: 33,
  TX: 25,
  FL: 25,
  default: 25,
};

/** @param {unknown} s */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Record<string, unknown>} user
 * @returns {OnboardingDraft}
 */
export function defaultDraftFromUser(user) {
  const u = user && typeof user === 'object' ? user : {};
  const loc = /** @type {Record<string, unknown>} */ (u.locale || {});
  return {
    step: 0,
    selectedPlatforms: Array.isArray(u.platforms) ? [.../** @type {string[]} */ (u.platforms)] : [],
    displayName: typeof u.displayName === 'string' ? u.displayName : '',
    avatarType: typeof u.avatarType === 'string' ? u.avatarType : 'emoji',
    avatarData: typeof u.avatarData === 'string' ? u.avatarData : '🚗',
    country: typeof loc.country === 'string' && loc.country ? loc.country : 'US',
    vehicles: [
      { nickname: '', type: 'gas', make: '', model: '', year: '' },
      { nickname: '', type: 'gas', make: '', model: '', year: '' },
    ],
    addSecondVehicle: false,
    homeBaseLabel: typeof u.homeBase === 'object' && u.homeBase && typeof /** @type {{ label?: unknown }} */ (u.homeBase).label === 'string'
      ? /** @type {{ label: string }} */ (u.homeBase).label
      : '',
    workSchedulePreset: 'flexible',
    weeklyGoal: Number(u.weeklyGoal) > 0 ? Number(u.weeklyGoal) : 500,
    monthlyGoal: Number(u.monthlyGoal) > 0 ? Number(u.monthlyGoal) : Math.round(Number(u.weeklyGoal || 500) * 4.33),
    annualGoal: Number(u.annualGoal) > 0 ? Number(u.annualGoal) : Math.round(Number(u.weeklyGoal || 500) * 52),
    taxRegion: '',
    taxWithholdingPct: Number(u.taxWithholdingPct) >= 0 ? Number(u.taxWithholdingPct) : 25,
    hstRegistered: Boolean(u.hstRegistered),
    distanceUnit: loc.distanceUnit === 'mi' || loc.distanceUnit === 'km' ? loc.distanceUnit : 'km',
    theme: u.theme === 'light' || u.theme === 'dark' || u.theme === 'auto' ? u.theme : 'auto',
    notificationPrefs: {
      shiftReminders: true,
      goalAlerts: true,
      taxReminders: true,
      weeklyDigest: false,
      ...(typeof u.notificationPrefs === 'object' && u.notificationPrefs ? /** @type {object} */ (u.notificationPrefs) : {}),
    },
  };
}

function whyBlock(summaryKey, bodyKey) {
  return `<details class="onboarding-why"><summary class="onboarding-why-summary">${esc(t(summaryKey))}</summary><p class="onboarding-why-body">${esc(t(bodyKey))}</p></details>`;
}

/**
 * @param {number} step 0..TOTAL_STEPS-1
 * @param {OnboardingDraft} draft
 * @param {Array<{ id: string; name: string; color?: string }>} platformRows
 */
export function renderStepInner(step, draft, platformRows) {
  switch (step) {
    case 0:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.platformsTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.platformsLead'))}</p>
        ${whyBlock('onboarding.why.platformsSummary', 'onboarding.why.platformsBody')}
        <div class="onboarding-platform-grid" role="group" aria-label="${esc(t('onboarding.steps.platformsTitle'))}">
          ${platformRows
            .map((p) => {
              const sel = draft.selectedPlatforms.includes(p.id);
              const col = getPlatformColor(p.id);
              return `<button type="button" class="onboarding-platform-card card card-interactive${sel ? ' is-selected' : ''}" data-platform-id="${esc(p.id)}" style="--platform-color:${esc(col)}">
                <span class="onboarding-platform-badge">${renderPlatformBadge(p.id, p.name)}</span>
                <span class="onboarding-platform-name">${esc(p.name)}</span>
              </button>`;
            })
            .join('')}
        </div>`;

    case 1:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.profileTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.profileLead'))}</p>
        ${whyBlock('onboarding.why.profileSummary', 'onboarding.why.profileBody')}
        <div class="input-group">
          <label class="input-label" for="ob-display-name">${esc(t('onboarding.steps.driverName'))}</label>
          <input id="ob-display-name" class="input" type="text" autocomplete="name" maxlength="80" value="${esc(draft.displayName)}" data-field="displayName" />
        </div>
        <fieldset class="onboarding-fieldset">
          <legend class="input-label">${esc(t('onboarding.steps.avatarPick'))}</legend>
          <div class="onboarding-avatar-grid">
            ${['🚗', '🛵', '🚲', '📦', '⭐', '🔥', '💼', '🤑']
              .map(
                (em) =>
                  `<button type="button" class="onboarding-avatar-btn${draft.avatarType === 'emoji' && draft.avatarData === em ? ' is-selected' : ''}" data-avatar-emoji="${esc(em)}">${em}</button>`,
              )
              .join('')}
          </div>
          <div class="input-group">
            <label class="input-label"><input type="radio" name="ob-avatar-type" value="initials" ${draft.avatarType === 'initials' ? 'checked' : ''} data-avatar-type /> ${esc(t('onboarding.steps.avatarInitials'))}</label>
            <label class="input-label"><input type="radio" name="ob-avatar-type" value="custom" ${draft.avatarType === 'custom' ? 'checked' : ''} data-avatar-type /> ${esc(t('onboarding.steps.avatarCustom'))}</label>
          </div>
          <div class="input-group" data-custom-avatar-wrap ${draft.avatarType === 'custom' ? '' : 'hidden'}>
            <label class="input-label" for="ob-avatar-file">${esc(t('onboarding.steps.avatarUpload'))}</label>
            <input id="ob-avatar-file" type="file" accept="image/*" class="input" data-avatar-file />
          </div>
        </fieldset>`;

    case 2: {
      const cfg = getLocaleConfig(draft.country);
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.regionTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.regionLead'))}</p>
        ${whyBlock('onboarding.why.regionSummary', 'onboarding.why.regionBody')}
        <div class="input-group">
          <label class="input-label" for="ob-country">${esc(t('onboarding.steps.country'))}</label>
          <select id="ob-country" class="input" data-field="country">
            ${CountryRegistry.getAll()
              .map((c) => {
                const label = typeof c.labelKey === 'string' ? t(c.labelKey) : c.id;
                const sel = draft.country === c.id ? 'selected' : '';
                return `<option value="${esc(c.id)}" ${sel}>${esc(label)}</option>`;
              })
              .join('')}
          </select>
        </div>
        <p class="onboarding-hint">${esc(t('onboarding.steps.currencyHint'))}: <strong>${esc(cfg.currency)}</strong> (${esc(cfg.symbol)})</p>`;
    }

    case 3: {
      const v = draft.vehicles[0] || { nickname: '', type: 'gas', make: '', model: '', year: '' };
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.vehicleTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.vehicleLead'))}</p>
        ${whyBlock('onboarding.why.vehicleSummary', 'onboarding.why.vehicleBody')}
        <div class="input-group">
          <label class="input-label" for="ob-v0-nick">${esc(t('onboarding.steps.vehicleNickname'))}</label>
          <input id="ob-v0-nick" class="input" type="text" data-vehicle-idx="0" data-vehicle-field="nickname" value="${esc(v.nickname)}" maxlength="60" />
        </div>
        <div class="input-group">
          <label class="input-label" for="ob-v0-type">${esc(t('onboarding.steps.vehicleType'))}</label>
          <select id="ob-v0-type" class="input" data-vehicle-idx="0" data-vehicle-field="type">
            ${VEHICLE_TYPES.map((ty) => `<option value="${ty}" ${v.type === ty ? 'selected' : ''}>${esc(t(`onboarding.vehicleTypes.${ty}`))}</option>`).join('')}
          </select>
        </div>
        <div class="onboarding-row-2">
          <div class="input-group">
            <label class="input-label" for="ob-v0-make">${esc(t('onboarding.steps.make'))}</label>
            <input id="ob-v0-make" class="input" type="text" data-vehicle-idx="0" data-vehicle-field="make" value="${esc(v.make)}" />
          </div>
          <div class="input-group">
            <label class="input-label" for="ob-v0-model">${esc(t('onboarding.steps.model'))}</label>
            <input id="ob-v0-model" class="input" type="text" data-vehicle-idx="0" data-vehicle-field="model" value="${esc(v.model)}" />
          </div>
        </div>
        <div class="input-group">
          <label class="input-label" for="ob-v0-year">${esc(t('onboarding.steps.year'))}</label>
          <input id="ob-v0-year" class="input" type="number" inputmode="numeric" min="1980" max="2035" data-vehicle-idx="0" data-vehicle-field="year" value="${esc(v.year)}" />
        </div>`;
    }

    case 4:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.secondVehicleTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.secondVehicleLead'))}</p>
        ${whyBlock('onboarding.why.secondVehicleSummary', 'onboarding.why.secondVehicleBody')}
        <label class="onboarding-check card card-raised">
          <input type="checkbox" data-field="addSecondVehicle" ${draft.addSecondVehicle ? 'checked' : ''} />
          <span>${esc(t('onboarding.steps.addAnotherVehicle'))}</span>
        </label>
        <div class="onboarding-second-vehicle" ${draft.addSecondVehicle ? '' : 'hidden'}>
          ${(() => {
            const v = draft.vehicles[1] || { nickname: '', type: 'gas', make: '', model: '', year: '' };
            return `
            <div class="input-group">
              <label class="input-label" for="ob-v1-nick">${esc(t('onboarding.steps.vehicleNickname'))}</label>
              <input id="ob-v1-nick" class="input" type="text" data-vehicle-idx="1" data-vehicle-field="nickname" value="${esc(v.nickname)}" maxlength="60" />
            </div>
            <div class="input-group">
              <label class="input-label" for="ob-v1-type">${esc(t('onboarding.steps.vehicleType'))}</label>
              <select id="ob-v1-type" class="input" data-vehicle-idx="1" data-vehicle-field="type">
                ${VEHICLE_TYPES.map((ty) => `<option value="${ty}" ${v.type === ty ? 'selected' : ''}>${esc(t(`onboarding.vehicleTypes.${ty}`))}</option>`).join('')}
              </select>
            </div>`;
          })()}
        </div>`;

    case 5:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.homeBaseTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.homeBaseLead'))}</p>
        ${whyBlock('onboarding.why.homeBaseSummary', 'onboarding.why.homeBaseBody')}
        <div class="input-group">
          <label class="input-label" for="ob-home">${esc(t('onboarding.steps.homeBaseLabel'))}</label>
          <input id="ob-home" class="input" type="text" data-field="homeBaseLabel" value="${esc(draft.homeBaseLabel)}" maxlength="120" placeholder="${esc(t('onboarding.steps.homeBasePlaceholder'))}" />
        </div>`;

    case 6:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.scheduleTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.scheduleLead'))}</p>
        ${whyBlock('onboarding.why.scheduleSummary', 'onboarding.why.scheduleBody')}
        <div class="onboarding-choice-grid" role="radiogroup" aria-label="${esc(t('onboarding.steps.scheduleTitle'))}">
          ${['flexible', 'weekdays', 'evenings', 'weekends']
            .map(
              (preset) =>
                `<button type="button" class="onboarding-choice card${draft.workSchedulePreset === preset ? ' is-selected' : ''}" data-schedule="${esc(preset)}">${esc(t(`onboarding.schedule.${preset}`))}</button>`,
            )
            .join('')}
        </div>`;

    case 7: {
      const w = draft.weeklyGoal || 0;
      const labelKey =
        w >= 800 ? 'onboarding.motivation.high' : w >= 400 ? 'onboarding.motivation.mid' : w >= 200 ? 'onboarding.motivation.low' : 'onboarding.motivation.start';
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.weeklyGoalTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.weeklyGoalLead'))}</p>
        ${whyBlock('onboarding.why.weeklyGoalSummary', 'onboarding.why.weeklyGoalBody')}
        <div class="input-group">
          <label class="input-label" for="ob-weekly-goal">${esc(t('onboarding.steps.weeklyGoalLabel'))}</label>
          <input id="ob-weekly-goal" class="input onboarding-input-number" type="number" inputmode="decimal" min="0" step="10" data-field="weeklyGoal" value="${esc(w)}" />
        </div>
        <p class="onboarding-motivation" data-motivation>${esc(t(labelKey))}</p>`;
    }

    case 8:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.longTermGoalsTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.longTermGoalsLead'))}</p>
        ${whyBlock('onboarding.why.longTermGoalsSummary', 'onboarding.why.longTermGoalsBody')}
        <div class="input-group">
          <label class="input-label" for="ob-monthly">${esc(t('onboarding.steps.monthlyGoal'))}</label>
          <input id="ob-monthly" class="input" type="number" min="0" step="50" data-field="monthlyGoal" value="${esc(draft.monthlyGoal)}" />
        </div>
        <div class="input-group">
          <label class="input-label" for="ob-annual">${esc(t('onboarding.steps.annualGoal'))}</label>
          <input id="ob-annual" class="input" type="number" min="0" step="100" data-field="annualGoal" value="${esc(draft.annualGoal)}" />
        </div>`;

    case 9: {
      const tax = getCountryTaxProfile(draft.country);
      const isCA = tax.regionPresetType === 'CA';
      const isUS = tax.regionPresetType === 'US';
      const regions = isCA
        ? Object.keys(TAX_PRESET_CA)
        : isUS
          ? [...new Set([...Object.keys(TAX_PRESET_US).filter((k) => k !== 'default'), 'WA', 'OR', 'OH', 'GA'])].sort()
          : ['—'];
      const regionLabel = tax.regionLabel === 'province' ? t('onboarding.steps.province') : t('onboarding.steps.state');
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.taxTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.taxLead'))}</p>
        ${whyBlock('onboarding.why.taxSummary', 'onboarding.why.taxBody')}
        <div class="input-group">
          <label class="input-label" for="ob-tax-region">${esc(regionLabel)}</label>
          <select id="ob-tax-region" class="input" data-field="taxRegion">
            <option value="">${esc(t('onboarding.steps.taxRegionPlaceholder'))}</option>
            ${regions
              .map((r) => `<option value="${esc(r)}" ${draft.taxRegion === r ? 'selected' : ''}>${esc(r)}</option>`)
              .join('')}
          </select>
        </div>
        <div class="input-group">
          <label class="input-label" for="ob-tax-pct">${esc(t('onboarding.steps.taxWithholding'))}</label>
          <input id="ob-tax-pct" class="input" type="number" min="0" max="60" step="0.5" data-field="taxWithholdingPct" value="${esc(draft.taxWithholdingPct)}" />
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-tax-preset>${esc(t('onboarding.steps.applyPreset'))}</button>`;
    }

    case 10:
      if (!getCountryTaxProfile(draft.country).hstOnboarding) {
        return `<p class="onboarding-step-lead">${esc(t('onboarding.steps.hstSkip'))}</p>`;
      }
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.hstTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.hstLead'))}</p>
        ${whyBlock('onboarding.why.hstSummary', 'onboarding.why.hstBody')}
        <label class="onboarding-check card card-raised">
          <input type="checkbox" data-field="hstRegistered" ${draft.hstRegistered ? 'checked' : ''} />
          <span>${esc(t('onboarding.steps.hstToggle'))}</span>
        </label>`;

    case 11:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.distanceTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.distanceLead'))}</p>
        ${whyBlock('onboarding.why.distanceSummary', 'onboarding.why.distanceBody')}
        <div class="onboarding-choice-grid" role="radiogroup">
          <button type="button" class="onboarding-choice card${draft.distanceUnit === 'km' ? ' is-selected' : ''}" data-distance="km">${esc(t('onboarding.steps.unitKm'))}</button>
          <button type="button" class="onboarding-choice card${draft.distanceUnit === 'mi' ? ' is-selected' : ''}" data-distance="mi">${esc(t('onboarding.steps.unitMi'))}</button>
        </div>`;

    case 12:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.themeTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.themeLead'))}</p>
        ${whyBlock('onboarding.why.themeSummary', 'onboarding.why.themeBody')}
        <div class="onboarding-choice-grid" role="radiogroup">
          ${['light', 'dark', 'auto']
            .map(
              (th) =>
                `<button type="button" class="onboarding-choice card${draft.theme === th ? ' is-selected' : ''}" data-theme="${esc(th)}">${esc(t(`onboarding.theme.${th}`))}</button>`,
            )
            .join('')}
        </div>`;

    case 13:
      return `
        <h1 class="onboarding-step-title">${esc(t('onboarding.steps.notifyTitle'))}</h1>
        <p class="onboarding-step-lead">${esc(t('onboarding.steps.notifyLead'))}</p>
        ${whyBlock('onboarding.why.notifySummary', 'onboarding.why.notifyBody')}
        <label class="onboarding-check card card-raised"><input type="checkbox" data-np="shiftReminders" ${draft.notificationPrefs.shiftReminders ? 'checked' : ''} /> ${esc(t('onboarding.notify.shiftReminders'))}</label>
        <label class="onboarding-check card card-raised"><input type="checkbox" data-np="goalAlerts" ${draft.notificationPrefs.goalAlerts ? 'checked' : ''} /> ${esc(t('onboarding.notify.goalAlerts'))}</label>
        <label class="onboarding-check card card-raised"><input type="checkbox" data-np="taxReminders" ${draft.notificationPrefs.taxReminders ? 'checked' : ''} /> ${esc(t('onboarding.notify.taxReminders'))}</label>
        <label class="onboarding-check card card-raised"><input type="checkbox" data-np="weeklyDigest" ${draft.notificationPrefs.weeklyDigest ? 'checked' : ''} /> ${esc(t('onboarding.notify.weeklyDigest'))}</label>`;

    case 14:
      return `
        <div class="onboarding-completion ${'onboarding-completion--celebrate'}">
          <div class="onboarding-confetti" aria-hidden="true"></div>
          <h1 class="onboarding-step-title onboarding-completion-title">${esc(t('onboarding.steps.completeTitle').replace('{name}', draft.displayName.trim() || t('onboarding.steps.completeFallbackName')))}</h1>
          <p class="onboarding-step-lead">${esc(t('onboarding.steps.completeLead'))}</p>
          <div class="onboarding-completion-actions">
            <button type="button" class="btn btn-primary btn-lg" data-enter-vault>${esc(t('onboarding.steps.enterVault'))}</button>
            <button type="button" class="btn btn-secondary" data-export-setup>${esc(t('onboarding.steps.exportSetup'))}</button>
            <button type="button" class="btn btn-ghost" data-load-sample>${esc(t('onboarding.sample.load'))}</button>
          </div>
        </div>`;

    default:
      return `<p>${esc(t('errors.generic'))}</p>`;
  }
}

/**
 * @param {number} step
 * @param {OnboardingDraft} draft
 * @returns {string | null} i18n key for validation message
 */
export function validateStep(step, draft) {
  switch (step) {
    case 0:
      return draft.selectedPlatforms.length ? null : 'onboarding.validation.platforms';
    case 1:
      return draft.displayName.trim() ? null : 'onboarding.validation.name';
    case 2:
      return draft.country ? null : 'onboarding.validation.country';
    case 3: {
      const v = draft.vehicles[0];
      return v && v.nickname.trim() && v.type ? null : 'onboarding.validation.vehicle';
    }
    case 4:
      if (draft.addSecondVehicle) {
        const v = draft.vehicles[1];
        return v && v.nickname.trim() && v.type ? null : 'onboarding.validation.secondVehicle';
      }
      return null;
    case 9: {
      const n = Number(draft.taxWithholdingPct);
      return Number.isFinite(n) && n >= 0 && n <= 80 ? null : 'onboarding.validation.tax';
    }
    default:
      return null;
  }
}

/**
 * @param {OnboardingDraft} draft
 */
export function applyTaxPreset(draft) {
  const r = draft.taxRegion;
  if (!r || r === '—') return draft.taxWithholdingPct;
  const tax = getCountryTaxProfile(draft.country);
  if (tax.regionPresetType === 'CA' && TAX_PRESET_CA[r] != null) return TAX_PRESET_CA[r];
  if (tax.regionPresetType === 'US') return TAX_PRESET_US[r] ?? TAX_PRESET_US.default;
  return draft.taxWithholdingPct;
}

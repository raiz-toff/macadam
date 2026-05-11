/**
 * F11 — shift form renderer (Feature 33–46 + basic/advanced toggle + live calc bar).
 */

import { t } from '../../utils/strings.js';
import { store } from '../../core/store.js';
import { showNumericKeypad } from '../../ui/components.js';
import { calcHourlyRate, calcCRAMileageDeduction, calcIRSMileageDeduction } from '../../utils/calculations.js';
import { getPlatformConfig } from '../platforms/platform-config.js';
import { getCountryTaxProfile } from '../../registry/countries/index.js';

function escapeAttr(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** @param {unknown} input */
function cloneJsonObject(input) {
  if (!input || typeof input !== 'object') return {};
  try {
    return JSON.parse(JSON.stringify(input));
  } catch {
    return { .../** @type {Record<string, unknown>} */ (input) };
  }
}

function ymdToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hmNow() {
  return new Date().toTimeString().slice(0, 5);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function minutesFromTimes(date, startHm, endHm) {
  if (!date || !startHm || !endHm) return 0;
  const start = new Date(`${date}T${startHm}:00`);
  const end = new Date(`${date}T${endHm}:00`);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / 60000));
}

function currencySymbol() {
  const user = store.get('user');
  const sym = user && user.locale && typeof user.locale.currencySymbol === 'string' ? user.locale.currencySymbol : '$';
  return sym || '$';
}

function distanceUnit() {
  const user = store.get('user');
  const u = user && user.locale && typeof user.locale.distanceUnit === 'string' ? user.locale.distanceUnit : 'km';
  return u === 'mi' ? 'mi' : 'km';
}

/**
 * @typedef {Object} ShiftFormOptions
 * @property {'full'|'quick'} [mode]
 * @property {Record<string, unknown>} [initial]
 * @property {string} [submitLabel]
 * @property {() => void} [onCancel]
 */

/**
 * @returns {{ el: HTMLElement, getValue: () => Record<string, unknown>, setValue: (patch: Record<string, unknown>) => void }}
 * */
export function renderShiftForm(opts = {}) {
  const { mode = 'full', initial = {}, submitLabel = t('common.save'), onCancel } = opts;

  const user = store.get('user');
  const activePlatforms = /** @type {Array<{ id: string, name?: string, active?: boolean }>} */ (store.get('platforms') || []);
  const primary = user && typeof user.primaryPlatform === 'string' ? user.primaryPlatform : null;
  const defaultPlatformId =
    typeof initial.platformId === 'string' && initial.platformId
      ? String(initial.platformId)
      : primary && activePlatforms.find((p) => p.id === primary)
        ? primary
        : activePlatforms[0]?.id || 'other';

  const dateVal = typeof initial.date === 'string' && initial.date ? String(initial.date) : ymdToday();
  const startTimeVal = typeof initial.startTime === 'string' ? String(initial.startTime) : '';
  const endTimeVal = typeof initial.endTime === 'string' ? String(initial.endTime) : '';

  const wrapper = document.createElement('div');
  wrapper.className = 'shifts-form';
  wrapper.innerHTML = `
    <form class="shifts-form-inner" autocomplete="off">
      <div class="shifts-form-header">
        <div class="shifts-form-title">${escapeHtml(mode === 'quick' ? t('shifts.addShift') : t('shifts.addShift'))}</div>
        <div class="shifts-form-actions">
          <button type="button" class="btn btn-ghost" data-action="cancel">${escapeHtml(t('common.cancel'))}</button>
          <button type="submit" class="btn btn-primary" data-action="submit">${escapeHtml(submitLabel)}</button>
        </div>
      </div>

      <div class="shifts-form-grid">
        <label class="field">
          <span class="field-label">${escapeHtml(t('shifts.platform'))}</span>
          <select class="input" name="platformId" required>
            ${activePlatforms
              .map((p) => {
                const id = String(p.id);
                const label = typeof p.name === 'string' && p.name ? p.name : id;
                const sel = id === defaultPlatformId ? ' selected' : '';
                return `<option value="${escapeAttr(id)}"${sel}>${escapeHtml(label)}</option>`;
              })
              .join('')}
          </select>
        </label>

        <label class="field">
          <span class="field-label">${escapeHtml(t('shifts.date'))}</span>
          <input class="input" name="date" type="date" value="${escapeAttr(dateVal)}" required />
        </label>

        <label class="field">
          <span class="field-label">${escapeHtml(t('shifts.startTime'))}</span>
          <input class="input" name="startTime" type="time" value="${escapeAttr(startTimeVal)}" />
        </label>

        <label class="field">
          <span class="field-label">${escapeHtml(t('shifts.endTime'))}</span>
          <input class="input" name="endTime" type="time" value="${escapeAttr(endTimeVal)}" />
        </label>

        <label class="field field--span2">
          <span class="field-label">${escapeHtml(t('shifts.gross'))}</span>
          <div class="field-inline">
            <input class="input" name="gross" inputmode="decimal" placeholder="0.00" />
            <button type="button" class="btn btn-ghost" data-keypad="gross">${escapeHtml(t('ui.keypad.open'))}</button>
          </div>
        </label>

        <div class="shifts-form-toggle ${mode === 'quick' ? '' : ''}">
          <button type="button" class="btn btn-ghost" data-action="toggle-advanced" aria-expanded="${
            mode === 'quick' ? 'false' : 'true'
          }">${escapeHtml(t('shifts.advancedToggle'))}</button>
        </div>

        <div class="shifts-advanced" data-advanced>
          <div class="shifts-advanced-grid">
            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.tips'))}</span>
              <div class="field-inline">
                <input class="input" name="tips" inputmode="decimal" placeholder="0.00" />
                <button type="button" class="btn btn-ghost" data-keypad="tips">${escapeHtml(t('ui.keypad.open'))}</button>
              </div>
            </label>

            <label class="field">
              <span class="field-label" data-bonus-label>${escapeHtml(t('shifts.bonus'))}</span>
              <div class="field-inline">
                <input class="input" name="bonus" inputmode="decimal" placeholder="0.00" />
                <button type="button" class="btn btn-ghost" data-keypad="bonus">${escapeHtml(t('ui.keypad.open'))}</button>
              </div>
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.orders'))}</span>
              <input class="input" name="orders" inputmode="numeric" placeholder="0" />
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.distance'))}</span>
              <input class="input" name="distance" inputmode="decimal" placeholder="0" />
              <span class="field-hint" data-distance-unit></span>
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.onlineMinutes'))}</span>
              <input class="input" name="onlineMinutes" inputmode="numeric" placeholder="0" />
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.activeMinutes'))}</span>
              <input class="input" name="activeMinutes" inputmode="numeric" placeholder="0" />
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.vehicle'))}</span>
              <select class="input" name="vehicleId">
                <option value="">${escapeHtml(t('shifts.vehicleNone'))}</option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.weather'))}</span>
              <select class="input" name="weather">
                <option value="">${escapeHtml(t('common.optional'))}</option>
                <option value="clear">${escapeHtml(t('shifts.weatherClear'))}</option>
                <option value="rain">${escapeHtml(t('shifts.weatherRain'))}</option>
                <option value="snow">${escapeHtml(t('shifts.weatherSnow'))}</option>
                <option value="fog">${escapeHtml(t('shifts.weatherFog'))}</option>
                <option value="heat">${escapeHtml(t('shifts.weatherHeat'))}</option>
              </select>
            </label>

            <label class="field">
              <span class="field-label">${escapeHtml(t('shifts.zone'))}</span>
              <input class="input" name="zoneTag" placeholder="${escapeAttr(t('shifts.zonePlaceholder'))}" list="macadam-zone-suggestions" />
              <datalist id="macadam-zone-suggestions"></datalist>
            </label>

            <div class="field field--span2 is-hidden" data-ps-wrap>
              <span class="field-label">${escapeHtml(t('shifts.platformExtras'))}</span>
              <div class="shifts-advanced-grid" data-ps-fields></div>
              <p class="field-hint is-hidden" data-ps-object-hint>${escapeHtml(t('shifts.psObjectHint'))}</p>
            </div>

            <div class="field">
              <span class="field-label">${escapeHtml(t('shifts.mood'))}</span>
              <div class="mood-row" role="group" aria-label="${escapeAttr(t('shifts.mood'))}">
                ${['😊', '🙂', '😐', '😤', '😩']
                  .map((m) => `<button type="button" class="mood-btn" data-mood="${escapeAttr(m)}">${escapeHtml(m)}</button>`)
                  .join('')}
              </div>
              <input type="hidden" name="mood" value="" />
            </div>

            <label class="field field--span2">
              <span class="field-label">${escapeHtml(t('shifts.notes'))}</span>
              <textarea class="input textarea" name="notes" rows="3" placeholder="${escapeAttr(t('shifts.notesPlaceholder'))}"></textarea>
            </label>
          </div>
        </div>
      </div>

      <div class="shifts-livebar" data-livebar>
        <div class="shifts-livebar-item">
          <span class="shifts-livebar-label">${escapeHtml(t('shifts.duration'))}</span>
          <span class="shifts-livebar-value" data-live-duration>—</span>
        </div>
        <div class="shifts-livebar-item">
          <span class="shifts-livebar-label">${escapeHtml(t('analytics.hourlyRate'))}</span>
          <span class="shifts-livebar-value" data-live-hourly>—</span>
        </div>
        <div class="shifts-livebar-item">
          <span class="shifts-livebar-label">${escapeHtml(t('shifts.vehicleEstimate'))}</span>
          <span class="shifts-livebar-value" data-live-vehicle>—</span>
        </div>
      </div>
    </form>
  `;

  const form = /** @type {HTMLFormElement | null} */ (wrapper.querySelector('form'));
  const adv = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-advanced]'));
  const advWrap = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-advanced]'));
  const toggleBtn = /** @type {HTMLButtonElement | null} */ (wrapper.querySelector('[data-action="toggle-advanced"]'));

  const platformSel = /** @type {HTMLSelectElement | null} */ (wrapper.querySelector('select[name="platformId"]'));
  const dateEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="date"]'));
  const startEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="startTime"]'));
  const endEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="endTime"]'));
  const grossEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="gross"]'));
  const tipsEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="tips"]'));
  const bonusEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="bonus"]'));
  const ordersEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="orders"]'));
  const distanceEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="distance"]'));
  const onlineEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="onlineMinutes"]'));
  const activeEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="activeMinutes"]'));
  const vehicleSel = /** @type {HTMLSelectElement | null} */ (wrapper.querySelector('select[name="vehicleId"]'));
  const weatherSel = /** @type {HTMLSelectElement | null} */ (wrapper.querySelector('select[name="weather"]'));
  const zoneEl = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="zoneTag"]'));
  const notesEl = /** @type {HTMLTextAreaElement | null} */ (wrapper.querySelector('textarea[name="notes"]'));
  const moodHidden = /** @type {HTMLInputElement | null} */ (wrapper.querySelector('input[name="mood"]'));
  const bonusLabel = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-bonus-label]'));
  const distanceHint = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-distance-unit]'));
  const psWrap = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-ps-wrap]'));
  const psFields = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-ps-fields]'));
  const psObjHint = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-ps-object-hint]'));

  let psDraft = cloneJsonObject(
    initial.platformSpecific && typeof initial.platformSpecific === 'object'
      ? /** @type {Record<string, unknown>} */ (initial.platformSpecific)
      : {},
  );

  const liveDuration = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-live-duration]'));
  const liveHourly = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-live-hourly]'));
  const liveVehicle = /** @type {HTMLElement | null} */ (wrapper.querySelector('[data-live-vehicle]'));

  const unit = distanceUnit();
  if (distanceHint) distanceHint.textContent = unit === 'mi' ? t('shifts.unitMiles') : t('shifts.unitKm');

  let advancedOpen = mode !== 'quick';
  const applyAdvanced = () => {
    if (!toggleBtn || !advWrap) return;
    toggleBtn.setAttribute('aria-expanded', advancedOpen ? 'true' : 'false');
    advWrap.classList.toggle('is-hidden', !advancedOpen);
  };
  applyAdvanced();

  function applyBonusLabel() {
    if (!platformSel || !bonusLabel) return;
    const pid = String(platformSel.value || 'other');
    const term = getPlatformConfig(pid)?.terminology?.bonus;
    bonusLabel.textContent = term ? term : t('shifts.bonus');
  }

  function setMood(m) {
    if (!moodHidden) return;
    moodHidden.value = m ? String(m) : '';
    wrapper.querySelectorAll('[data-mood]').forEach((btn) => {
      const b = /** @type {HTMLElement} */ (btn);
      b.classList.toggle('is-selected', b.getAttribute('data-mood') === moodHidden.value);
    });
  }

  function parseDistanceToKm(distanceVal) {
    const d = num(distanceVal);
    if (unit === 'mi') return d * 1.60934;
    return d;
  }

  function fmtMoney(v) {
    const sym = currencySymbol();
    const n = Number(v);
    if (!Number.isFinite(n)) return '—';
    return `${sym}${n.toFixed(2)}`;
  }

  function recomputeLive() {
    const date = dateEl?.value || ymdToday();
    const start = startEl?.value || '';
    const end = endEl?.value || '';
    const minutesFromFields = minutesFromTimes(date, start, end);
    const activeM = activeEl?.value ? Math.max(0, Math.floor(num(activeEl.value))) : 0;
    const durationM = activeM > 0 ? activeM : minutesFromFields;
    const gross = grossEl?.value ? num(grossEl.value) : 0;

    if (liveDuration) {
      if (!durationM) liveDuration.textContent = '—';
      else {
        const h = Math.floor(durationM / 60);
        const m = durationM % 60;
        liveDuration.textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
      }
    }

    if (liveHourly) {
      if (!durationM || !gross) liveHourly.textContent = '—';
      else liveHourly.textContent = fmtMoney(calcHourlyRate(gross, durationM));
    }

    if (liveVehicle) {
      const country = user && user.locale && typeof user.locale.country === 'string' ? user.locale.country : 'US';
      const tax = getCountryTaxProfile(country);
      const distanceKm = parseDistanceToKm(distanceEl?.value || 0);
      if (!distanceKm) liveVehicle.textContent = '—';
      else if (tax.stdMileageChoice === 'CRA') {
        liveVehicle.textContent = fmtMoney(calcCRAMileageDeduction(distanceKm, new Date().getFullYear()));
      } else if (tax.stdMileageChoice === 'IRS') {
        const miles = distanceKm / 1.60934;
        liveVehicle.textContent = fmtMoney(calcIRSMileageDeduction(miles, new Date().getFullYear()));
      } else {
        liveVehicle.textContent = fmtMoney(distanceKm * 0.6);
      }
    }
  }

  function wireKeypad(field, inputEl) {
    const btn = wrapper.querySelector(`[data-keypad="${field}"]`);
    if (!btn || !inputEl) return;
    btn.addEventListener('click', () => {
      showNumericKeypad({
        currency: currencySymbol(),
        initial: String(inputEl.value || ''),
        allowDecimal: true,
        onConfirm: (val) => {
          inputEl.value = String(val || '');
          recomputeLive();
        },
      });
    });
  }

  wireKeypad('gross', grossEl);
  wireKeypad('tips', tipsEl);
  wireKeypad('bonus', bonusEl);

  const onInput = () => recomputeLive();

  function renderPlatformSpecificFields(pid) {
    if (!psFields || !psWrap) return;
    const cfg = getPlatformConfig(pid);
    const schema = Array.isArray(cfg.specificSchema) ? cfg.specificSchema : [];
    const hasObject = schema.some((r) => r && r.kind === 'object');
    if (psObjHint) psObjHint.classList.toggle('is-hidden', !hasObject);
    if (schema.length === 0) {
      psFields.innerHTML = '';
      psWrap.classList.add('is-hidden');
      return;
    }
    psWrap.classList.remove('is-hidden');
    const rowsHtml = schema
      .map((row) => {
        if (!row || typeof row.key !== 'string' || !row.kind) return '';
        const lk = row.labelKey || `shifts.ps.${row.key}`;
        const label = escapeHtml(t(lk));
        const n = `ps_${row.key}`;
        if (row.kind === 'number') {
          const v = psDraft[row.key];
          const sv = v != null && Number.isFinite(Number(v)) ? String(v) : '';
          const maxAttr = typeof row.max === 'number' ? ` max="${row.max}"` : '';
          const minAttr = typeof row.min === 'number' ? ` min="${row.min}"` : '';
          return `<label class="field"><span class="field-label">${label}</span><input class="input" type="number" name="${escapeAttr(n)}" inputmode="decimal"${minAttr}${maxAttr} step="any" value="${escapeAttr(sv)}" /></label>`;
        }
        if (row.kind === 'string') {
          const sv = psDraft[row.key] != null ? String(psDraft[row.key]) : '';
          return `<label class="field"><span class="field-label">${label}</span><input class="input" type="text" name="${escapeAttr(n)}" value="${escapeAttr(sv)}" /></label>`;
        }
        if (row.kind === 'stringArray') {
          const arr = Array.isArray(psDraft[row.key]) ? psDraft[row.key] : [];
          const sv = /** @type {unknown[]} */ (arr)
            .map((x) => String(x))
            .join(', ');
          return `<label class="field field--span2"><span class="field-label">${label}</span><input class="input" type="text" name="${escapeAttr(
            n,
          )}" value="${escapeAttr(sv)}" placeholder="${escapeAttr(t('shifts.psCommaPlaceholder'))}" /></label>`;
        }
        if (row.kind === 'object') {
          let txt = '{}';
          try {
            txt = JSON.stringify(
              psDraft[row.key] && typeof psDraft[row.key] === 'object' ? psDraft[row.key] : {},
              null,
              2,
            );
          } catch {
            txt = '{}';
          }
          return `<label class="field field--span2"><span class="field-label">${label}</span><textarea class="input textarea" name="${escapeAttr(
            n,
          )}" rows="5">${escapeHtml(txt)}</textarea></label>`;
        }
        return '';
      })
      .filter(Boolean)
      .join('');
    psFields.innerHTML = rowsHtml;
    psFields.querySelectorAll('input,textarea,select').forEach((el) => el.addEventListener('input', onInput));
  }

  wrapper.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement | null} */ (e.target && /** @type {HTMLElement} */ (e.target).closest('[data-action],[data-mood]'));
    if (!target) return;
    const action = target.getAttribute('data-action');
    if (action === 'cancel') {
      e.preventDefault();
      onCancel?.();
      return;
    }
    if (action === 'toggle-advanced') {
      e.preventDefault();
      advancedOpen = !advancedOpen;
      applyAdvanced();
      return;
    }
    const mood = target.getAttribute('data-mood');
    if (mood != null) {
      e.preventDefault();
      setMood(moodHidden?.value === mood ? '' : mood);
    }
  });

  wrapper.querySelectorAll('input,select,textarea').forEach((el) => el.addEventListener('input', onInput));
  platformSel?.addEventListener('change', () => {
    psDraft = {};
    renderPlatformSpecificFields(String(platformSel?.value || 'other'));
    applyBonusLabel();
  });
  applyBonusLabel();

  // Seed initial values (beyond defaults)
  const seed = (name, val) => {
    const el = /** @type {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null} */ (
      wrapper.querySelector(`[name="${name}"]`)
    );
    if (!el) return;
    if (typeof val === 'string' || typeof val === 'number') el.value = String(val);
  };
  seed('gross', initial.gross ?? initial.grossEarnings ?? '');
  seed('tips', initial.tips ?? '');
  seed('bonus', initial.bonus ?? '');
  seed('orders', initial.orders ?? '');
  seed('distance', initial.distanceKm ?? initial.distance ?? '');
  seed('onlineMinutes', initial.onlineMinutes ?? '');
  seed('activeMinutes', initial.activeMinutes ?? '');
  seed('weather', initial.weather ?? '');
  seed('zoneTag', initial.zoneTag ?? '');
  seed('notes', initial.notes ?? '');
  if (typeof initial.mood === 'string') setMood(initial.mood);

  if (startEl && !startEl.value && mode === 'quick') startEl.value = hmNow();

  renderPlatformSpecificFields(String(platformSel?.value || defaultPlatformId));

  recomputeLive();

  const getValue = () => {
    const platformId = platformSel?.value || defaultPlatformId;
    const date = dateEl?.value || ymdToday();
    const startTime = startEl?.value || null;
    const endTime = endEl?.value || null;
    const gross = grossEl?.value ? Number(grossEl.value) : null;

    // Advanced fields
    const tips = tipsEl?.value ? Number(tipsEl.value) : null;
    const bonus = bonusEl?.value ? Number(bonusEl.value) : null;
    const orders = ordersEl?.value ? Math.floor(num(ordersEl.value)) : null;
    const distRaw = distanceEl?.value ? num(distanceEl.value) : 0;
    const distanceKm = distRaw ? parseDistanceToKm(distRaw) : null;
    const onlineMinutes = onlineEl?.value ? Math.floor(num(onlineEl.value)) : null;
    const activeMinutes = activeEl?.value ? Math.floor(num(activeEl.value)) : null;
    const vehicleId = vehicleSel?.value ? Number(vehicleSel.value) : null;
    const weather = weatherSel?.value ? String(weatherSel.value) : null;
    const zoneTag = zoneEl?.value ? String(zoneEl.value).trim() : null;
    const mood = moodHidden?.value ? String(moodHidden.value) : null;
    const notes = notesEl?.value ? String(notesEl.value) : '';

    /** @type {Record<string, unknown>} */
    const platformSpecific = {};
    const schema = getPlatformConfig(platformId).specificSchema || [];
    for (const row of schema) {
      if (!row || typeof row.key !== 'string') continue;
      const el = psFields?.querySelector(`[name="ps_${row.key}"]`);
      if (!el) continue;
      if (row.kind === 'number') {
        const raw = String(/** @type {HTMLInputElement} */ (el).value || '').trim();
        platformSpecific[row.key] = raw === '' ? null : num(raw);
      } else if (row.kind === 'string') {
        platformSpecific[row.key] = String(/** @type {HTMLInputElement} */ (el).value || '').trim();
      } else if (row.kind === 'stringArray') {
        platformSpecific[row.key] = String(/** @type {HTMLInputElement} */ (el).value || '')
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      } else if (row.kind === 'object' && el instanceof HTMLTextAreaElement) {
        try {
          platformSpecific[row.key] = JSON.parse(el.value || '{}');
        } catch {
          const prev = psDraft[row.key];
          platformSpecific[row.key] = prev && typeof prev === 'object' ? prev : {};
        }
      }
    }

    return {
      platformId,
      date,
      startTime,
      endTime,
      gross,
      tips,
      bonus,
      orders,
      distanceKm,
      onlineMinutes,
      activeMinutes,
      vehicleId,
      weather,
      zoneTag,
      mood,
      notes,
      platformSpecific,
    };
  };

  const setValue = (patch) => {
    if (patch?.platformSpecific && typeof patch.platformSpecific === 'object') {
      psDraft = { ...psDraft, ...cloneJsonObject(patch.platformSpecific) };
    }
    Object.entries(patch || {}).forEach(([k, v]) => {
      if (k === 'platformSpecific' || k === 'mood') return;
      seed(k, v);
    });
    if (patch && typeof patch.mood === 'string') setMood(patch.mood);
    if (patch && (patch.platformId != null || patch.platformSpecific)) {
      renderPlatformSpecificFields(String(platformSel?.value || defaultPlatformId));
    }
    applyBonusLabel();
    recomputeLive();
  };

  // Leave submit handling to parent (view) — it can attach listener on `form`.
  if (form) form.noValidate = false;

  return { el: wrapper, getValue, setValue };
}


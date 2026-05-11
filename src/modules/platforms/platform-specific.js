/**
 * P10 — platform-specific tracking helpers.
 * Pure utilities only: no UI coupling, safe to call from forms, shifts, and analytics.
 */

const SUPPORTED_PLATFORM_IDS = new Set(['doordash', 'ubereats', 'foodora', 'skip', 'instacart', 'amazonflex', 'other']);

const DEFAULT_OTHER_CONFIG = {
  customFields: [],
};

const DEFAULT_PAYOUT_DAY = {
  doordash: 1,
  ubereats: 5,
  foodora: 3,
  skip: 4,
  instacart: 3,
  amazonflex: 5,
  other: 5,
};

/**
 * @param {unknown} value
 * @param {{ min?: number, max?: number }} [opts]
 */
function toNumber(value, opts = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (typeof opts.min === 'number' && n < opts.min) return null;
  if (typeof opts.max === 'number' && n > opts.max) return null;
  return n;
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').toLowerCase().trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizePlatformId(value) {
  const id = String(value || '').toLowerCase();
  return SUPPORTED_PLATFORM_IDS.has(id) ? id : 'other';
}

/**
 * @param {string} platformId
 * @param {unknown} input
 */
export function normalizePlatformSpecific(platformId, input) {
  const id = normalizePlatformId(platformId);
  const raw = input && typeof input === 'object' ? /** @type {Record<string, unknown>} */ (input) : {};

  if (id === 'doordash') {
    return {
      peakPay: toNumber(raw.peakPay, { min: 0 }),
      dashZone: raw.dashZone ? String(raw.dashZone).trim() : '',
      acceptanceRate: toNumber(raw.acceptanceRate, { min: 0, max: 100 }),
      customerRating: toNumber(raw.customerRating, { min: 0, max: 5 }),
    };
  }
  if (id === 'ubereats') {
    return {
      surgeMultiplier: toNumber(raw.surgeMultiplier, { min: 0 }),
      proStatus: raw.proStatus ? String(raw.proStatus).trim() : '',
      completionRate: toNumber(raw.completionRate, { min: 0, max: 100 }),
      questOnlineMinutes: toNumber(raw.questOnlineMinutes, { min: 0 }),
    };
  }
  if (id === 'foodora') {
    return {
      orderTypeSplit: raw.orderTypeSplit && typeof raw.orderTypeSplit === 'object' ? raw.orderTypeSplit : {},
      attendanceScore: toNumber(raw.attendanceScore, { min: 0, max: 100 }),
    };
  }
  if (id === 'skip') {
    return {
      creditsPromos: toNumber(raw.creditsPromos, { min: 0 }),
      cityScore: toNumber(raw.cityScore, { min: 0, max: 100 }),
    };
  }
  if (id === 'instacart') {
    return {
      batchCount: toNumber(raw.batchCount, { min: 0 }),
      batchTypes: normalizeStringArray(raw.batchTypes),
    };
  }
  if (id === 'amazonflex') {
    return {
      blockDurationMinutes: toNumber(raw.blockDurationMinutes, { min: 0 }),
      blockType: raw.blockType ? String(raw.blockType).trim() : '',
    };
  }

  const fields = Array.isArray(raw.customFields)
    ? raw.customFields
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          key: String(/** @type {any} */ (x).key || '').trim(),
          label: String(/** @type {any} */ (x).label || '').trim(),
          type: String(/** @type {any} */ (x).type || 'text').trim() || 'text',
        }))
        .filter((x) => x.key && x.label)
    : [];
  return {
    ...DEFAULT_OTHER_CONFIG,
    customFields: fields,
  };
}

/**
 * Feature 208 + 218 shift-level payload normalization.
 * @param {Record<string, unknown>} shiftInput
 */
export function extractShiftPlatformSpecific(shiftInput) {
  const platformId = normalizePlatformId(shiftInput.platformId);
  const multiAppPlatformIds = normalizeStringArray(shiftInput.multiAppPlatformIds).filter((id) => id !== platformId);
  const isMultiApp = multiAppPlatformIds.length > 0 || shiftInput.isMultiApp === true;
  const rawSpecific =
    shiftInput.platformSpecific && typeof shiftInput.platformSpecific === 'object'
      ? /** @type {Record<string, unknown>} */ (shiftInput.platformSpecific)
      : {};
  const platformSpecific = normalizePlatformSpecific(platformId, rawSpecific);
  const peakPayRaw = toNumber(shiftInput.peakPay, { min: 0 });
  const peakPay = platformId === 'doordash' ? peakPayRaw ?? toNumber(/** @type {any} */ (platformSpecific).peakPay, { min: 0 }) : null;

  return {
    platformSpecific,
    peakPay,
    isMultiApp,
    multiAppPlatformIds,
  };
}

/**
 * Features 217/285/286.
 * @param {{
 *   netHourlyByPlatform?: Record<string, number | null | undefined>,
 *   thresholdPercent?: number,
 *   doordashCustomerRating?: number | null,
 *   uberCompletionRate?: number | null,
 * }} input
 */
export function evaluatePlatformAlerts(input = {}) {
  const alerts = [];
  const thresholdPercent = Number.isFinite(Number(input.thresholdPercent)) ? Number(input.thresholdPercent) : 20;
  const entries = Object.entries(input.netHourlyByPlatform || {}).filter(([, v]) => Number.isFinite(Number(v)));
  if (entries.length >= 2) {
    entries.sort((a, b) => Number(b[1]) - Number(a[1]));
    const [bestId, bestRateRaw] = entries[0];
    const [worstId, worstRateRaw] = entries[entries.length - 1];
    const bestRate = Number(bestRateRaw);
    const worstRate = Number(worstRateRaw);
    if (bestRate > 0 && worstRate >= 0) {
      const gapPercent = ((bestRate - worstRate) / bestRate) * 100;
      if (gapPercent >= thresholdPercent) {
        alerts.push({
          type: 'arbitrage',
          platformId: bestId,
          comparedTo: worstId,
          gapPercent: Math.round(gapPercent * 10) / 10,
        });
      }
    }
  }

  const ddRating = toNumber(input.doordashCustomerRating, { min: 0, max: 5 });
  if (ddRating != null && ddRating < 4.7) {
    alerts.push({ type: 'doordash_customer_rating_low', rating: ddRating });
  }

  const ueCompletion = toNumber(input.uberCompletionRate, { min: 0, max: 100 });
  if (ueCompletion != null && ueCompletion < 95) {
    alerts.push({ type: 'ubereats_completion_rate_low', completionRate: ueCompletion });
  }
  return alerts;
}

/**
 * Feature 290 payout-day countdown.
 * @param {string} platformId
 * @param {Date} [from]
 * @param {number} [weekday] 0=Sun..6=Sat
 */
export function getPayoutCountdown(platformId, from = new Date(), weekday) {
  const id = normalizePlatformId(platformId);
  const targetDay = Number.isInteger(weekday) ? Number(weekday) : DEFAULT_PAYOUT_DAY[id];
  const now = from instanceof Date ? from : new Date(from);
  const d = new Date(now);
  const current = d.getDay();
  let daysUntil = targetDay - current;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) {
    const cutoff = new Date(d);
    cutoff.setHours(23, 59, 59, 999);
    if (now.getTime() > cutoff.getTime()) daysUntil = 7;
  }
  const next = new Date(d);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(0, 0, 0, 0);
  return { daysUntil, nextPayoutDate: next.toISOString().slice(0, 10), weekday: targetDay };
}

/**
 * Feature 291 instant cashout fee helper.
 * @param {number} amount
 * @param {{ flatFee?: number, ratePct?: number }} [feeConfig]
 */
export function calculateInstantCashout(amount, feeConfig = {}) {
  const gross = Math.max(0, Number(amount) || 0);
  const flatFee = Math.max(0, Number(feeConfig.flatFee) || 0);
  const ratePct = Math.max(0, Number(feeConfig.ratePct) || 0);
  const fee = Math.round((flatFee + gross * (ratePct / 100)) * 100) / 100;
  const net = Math.max(0, Math.round((gross - fee) * 100) / 100);
  return { gross, fee, net };
}

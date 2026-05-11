/**
 * Static platform catalog + terminology helpers (F10).
 * `PLATFORM_TERMINOLOGY` is synced from Dexie active rows for F7 `platformLabel`.
 */

/** Minimal inline SVG monograms (20×20) for list/switcher chrome. */
const SVG_DD = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#FF3008"/><path fill="#fff" d="M5 6h6c2.5 0 4 1.4 4 3.5S13.5 13 11 13H8v3H5V6zm3 4.5h2.2c.9 0 1.4-.4 1.4-1.1 0-.7-.5-1.1-1.4-1.1H8v2.2z"/></svg>`;
const SVG_UE = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#06C167"/><path fill="#fff" d="M5 7h10v2H8v2h6v2H5V7zm0 6h6v2H5v-2z"/></svg>`;
const SVG_FD = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#E21B70"/><circle cx="10" cy="10" r="3" fill="#fff"/></svg>`;
const SVG_SK = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#ED5A1F"/><path fill="#fff" d="M6 6h8v2H9v2h4v2H9v4H6V6z"/></svg>`;
const SVG_IC = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#0AAD0A"/><path fill="#fff" d="M6 7h8v1.5H6V7zm0 3h5v1.5H6V10zm0 3h8v1.5H6V13z"/></svg>`;
const SVG_AF = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#232F3E"/><path fill="#FF9900" d="M5 14V6h2l2.5 5 2.5-5h2v8h-2V9.5L9 14H8L6 9.5V14H5z"/></svg>`;
const SVG_OT = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><rect width="20" height="20" rx="4" fill="#6B7280"/><text x="10" y="14" text-anchor="middle" fill="#fff" font-size="10" font-family="system-ui,sans-serif">?</text></svg>`;

/**
 * @typedef {{ driver?: string; delivery?: string; bonus?: string; surge?: string }} PlatformTerms
 * @typedef {{
 *   id: string;
 *   name: string;
 *   color: string;
 *   terminology: PlatformTerms;
 *   logo: string;
 *   relevantFields: string[];
 *   helpUrl: string;
 * }} PlatformCatalogEntry
 */

/** @type {Record<string, PlatformCatalogEntry>} */
export const PLATFORM_CONFIGS = {
  doordash: {
    id: 'doordash',
    name: 'DoorDash',
    color: '#FF3008',
    terminology: { driver: 'Dasher', delivery: 'order', bonus: 'Peak Pay', surge: 'Peak Pay' },
    logo: SVG_DD,
    relevantFields: ['peakPay', 'dashZone', 'acceptanceRate', 'customerRating'],
    helpUrl: 'https://help.doordash.com/dashers',
  },
  ubereats: {
    id: 'ubereats',
    name: 'Uber Eats',
    color: '#06C167',
    terminology: { driver: 'Courier', delivery: 'trip', bonus: 'Quest', surge: 'Surge' },
    logo: SVG_UE,
    relevantFields: ['quest', 'surge', 'boost', 'tripCount'],
    helpUrl: 'https://help.uber.com/riders/article/uber-eats-merchant-support',
  },
  foodora: {
    id: 'foodora',
    name: 'Foodora',
    color: '#E21B70',
    terminology: { driver: 'Rider', delivery: 'order', bonus: 'Bonus', surge: 'Busy pay' },
    logo: SVG_FD,
    relevantFields: ['busyPay', 'orderCount'],
    helpUrl: 'https://www.foodora.ca/',
  },
  skip: {
    id: 'skip',
    name: 'SkipTheDishes',
    color: '#ED5A1F',
    terminology: { driver: 'Courier', delivery: 'order', bonus: 'Promo', surge: 'Busy fee' },
    logo: SVG_SK,
    relevantFields: ['busyFee', 'transitPay'],
    helpUrl: 'https://help.skipthedishes.com/',
  },
  instacart: {
    id: 'instacart',
    name: 'Instacart',
    color: '#0AAD0A',
    terminology: { driver: 'Shopper', delivery: 'batch', bonus: 'Boost', surge: 'Peak' },
    logo: SVG_IC,
    relevantFields: ['batchSize', 'itemCount', 'boost'],
    helpUrl: 'https://shoppers.instacart.com/help',
  },
  amazonflex: {
    id: 'amazonflex',
    name: 'Amazon Flex',
    color: '#232F3E',
    terminology: { driver: 'Flex driver', delivery: 'block', bonus: 'Incentive', surge: 'Surge' },
    logo: SVG_AF,
    relevantFields: ['blockType', 'warehouseCode'],
    helpUrl: 'https://flex.amazon.com/',
  },
  other: {
    id: 'other',
    name: 'Other',
    color: '#6B7280',
    terminology: { driver: 'Driver', delivery: 'delivery', bonus: 'Bonus', surge: 'Surge' },
    logo: SVG_OT,
    relevantFields: [],
    helpUrl: '',
  },
};

/** Neutral copy when multiple gig apps are active (Feature 2). */
const NEUTRAL_TERMS = {
  driver: 'Driver',
  delivery: 'Delivery',
  bonus: 'Bonus',
  surge: 'Surge pay',
};

/** @type {Record<string, Record<string, string>>} */
export const PLATFORM_TERMINOLOGY = {};

/**
 * @param {string} term
 */
function titleishFallback(term) {
  const key = String(term ?? '');
  if (!key) return '';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s+/, '')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string} platformId
 * @returns {PlatformCatalogEntry}
 */
export function getPlatformConfig(platformId) {
  const id = String(platformId || '').toLowerCase();
  return PLATFORM_CONFIGS[id] || PLATFORM_CONFIGS.other;
}

/**
 * @param {unknown} rows Dexie `platforms` rows (active subset typical)
 */
export function syncPlatformTerminologyFromRows(rows) {
  for (const k of Object.keys(PLATFORM_TERMINOLOGY)) {
    delete PLATFORM_TERMINOLOGY[k];
  }
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    const id = row && typeof row.id === 'string' ? row.id : '';
    if (!id) continue;
    const base = getPlatformConfig(id).terminology || {};
    const rowTerms =
      row.terminology && typeof row.terminology === 'object' ? /** @type {Record<string, string>} */ (row.terminology) : {};
    PLATFORM_TERMINOLOGY[id] = { ...base, ...rowTerms };
  }
}

/**
 * @param {string | null | undefined} platformId
 * @param {string} term
 * @param {string[] | null | undefined} activePlatformIds ordered active ids
 * @returns {string}
 */
export function getTerminology(platformId, term, activePlatformIds) {
  const key = String(term ?? '');
  const ids = Array.isArray(activePlatformIds)
    ? activePlatformIds.map((x) => String(x || '').toLowerCase()).filter(Boolean)
    : [];

  if (ids.length > 1) {
    const n = NEUTRAL_TERMS[/** @type {keyof typeof NEUTRAL_TERMS} */ (key)];
    if (n) return n;
    return titleishFallback(key);
  }

  const effective =
    ids.length === 1 ? ids[0] : String(platformId || '').toLowerCase() || (ids[0] ?? 'other');
  const cfg = getPlatformConfig(effective);
  const v = cfg.terminology?.[/** @type {keyof PlatformTerms} */ (key)];
  if (typeof v === 'string' && v.length > 0) return v;
  const n = NEUTRAL_TERMS[/** @type {keyof typeof NEUTRAL_TERMS} */ (key)];
  if (n) return n;
  return titleishFallback(key);
}

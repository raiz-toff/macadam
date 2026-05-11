/** @typedef {{ month: number, day: number, label: string, followYear?: boolean }} TaxInstallment */

/** @typedef {TaxInstallment[]} TaxSchedule */

/**
 * @typedef {Object} LocaleConfig
 * @property {string} currency
 * @property {string} symbol
 * @property {'km'|'mi'} distanceUnit
 * @property {TaxSchedule} [taxInstallmentDates]
 * @property {boolean} [hasCPP]
 * @property {boolean} [hasHST]
 * @property {boolean} [hasSETax]
 * @property {'CRA'|'IRS'|''} [mileageRateSource]
 */

import { CountryRegistry, countryDefToLocaleConfig } from '../registry/countries/index.js';

/**
 * @param {string} country
 * @returns {LocaleConfig}
 */
export function getLocaleConfig(country) {
  const def = CountryRegistry.getById(country);
  return { ...countryDefToLocaleConfig(def) };
}

/**
 * @param {string} country
 * @returns {{ date: Date, daysUntil: number, label: string }}
 */
export function getNextTaxDeadline(country) {
  const cfg = getLocaleConfig(country);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const y = now.getFullYear();
  const entries = [];

  for (let yr = y; yr <= y + 1; yr += 1) {
    (cfg.taxInstallmentDates || []).forEach((row) => {
      const yy = yr + (row.followYear ? 1 : 0);
      const d = new Date(yy, row.month - 1, row.day);
      entries.push({ date: d, label: row.label });
    });
  }

  const upcoming = entries
    .filter((e) => e.date.getTime() >= startOfToday)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next = upcoming[0] || entries[0];
  if (!next) {
    const fallback = new Date(y, 11, 31);
    return { date: fallback, daysUntil: Math.ceil((fallback - now) / 86400000), label: 'Tax deadline' };
  }
  const daysUntil = Math.ceil((next.date.getTime() - Date.now()) / 86400000);
  return { date: next.date, daysUntil, label: next.label };
}

/**
 * @param {string} country
 * @param {number} year
 * @returns {Array<{ date: Date, label: string, daysUntil: number }>}
 */
export function getAllTaxDeadlines(country, year) {
  const cfg = getLocaleConfig(country);
  const now = Date.now();
  return (cfg.taxInstallmentDates || []).map((row) => {
    const yy = year + (row.followYear ? 1 : 0);
    const d = new Date(yy, row.month - 1, row.day);
    const daysUntil = Math.ceil((d.getTime() - now) / 86400000);
    return { date: d, label: row.label, daysUntil };
  });
}

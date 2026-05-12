/**
 * Report section registry (Category B).
 * @see docs/feature_modularity.md
 */

import chart from './chart.report-section.js';
import expenses from './expenses.report-section.js';
import notes from './notes.report-section.js';
import overview from './overview.report-section.js';
import placeholder from './placeholder.report-section.js';
import qr from './qr.report-section.js';
import shifts from './shifts.report-section.js';

/** @typedef {typeof placeholder} ReportSectionDefinition */

/** @type {ReportSectionDefinition[]} */
const SECTIONS = [overview, shifts, expenses, chart, qr, notes, placeholder];

/** @type {Map<string, ReportSectionDefinition>} */
const byId = new Map(SECTIONS.map((s) => [String(s.id).toLowerCase(), s]));

/**
 * @param {ReportSectionDefinition} def
 * @returns {boolean}
 */
function validateReportSectionDefinition(def) {
  const required = ['id', 'label', 'defaultIncluded', 'renderHTML', 'renderText', 'renderCSV'];
  const missing = required.filter((k) => def[k] == null);
  if (missing.length) throw new Error(`Report section definition missing: ${missing.join(', ')}`);
  if (typeof def.renderHTML !== 'function' || typeof def.renderText !== 'function' || typeof def.renderCSV !== 'function') {
    throw new Error(`Report section ${def.id} missing renderHTML/renderText/renderCSV`);
  }
  return true;
}

export const ReportRegistry = {
  /** @returns {readonly ReportSectionDefinition[]} */
  getAll: () => SECTIONS,

  /**
   * @param {string | null | undefined} id
   * @returns {ReportSectionDefinition | undefined}
   */
  getById: (id) => {
    const key = String(id || '').toLowerCase();
    return byId.get(key);
  },

  /** @param {ReportSectionDefinition} def */
  validate: (def) => validateReportSectionDefinition(def),
};

export function assertReportRegistryValid() {
  for (const s of SECTIONS) validateReportSectionDefinition(s);
}

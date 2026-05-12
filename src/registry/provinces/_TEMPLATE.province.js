/**
 * Template for a province/territory definition (plan F9).
 * Copy to `{CODE}.province.js` and register in `index.js`.
 */
export default {
  id: 'XX',
  countryId: 'CA',
  labelKey: 'provinces.template',
  /** @type {string[]} platform ids from PlatformRegistry */
  availablePlatforms: [],
  salesTax: null,
  incomeTax: null,
  expenseCategories: [],
  vehicleExpenseMethod: 'actual_costs',
  vehicleNotes: {},
  onboardingExtras: [],
};

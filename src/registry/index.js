/**
 * Registry entrypoints — platform & country definition modules.
 * @see Registry_arch.md
 */

export { PlatformRegistry, assertPlatformRegistryValid } from './platforms/index.js';
export {
  CountryRegistry,
  assertCountryRegistryValid,
  countryDefToLocaleConfig,
  getCountryTaxProfile,
} from './countries/index.js';

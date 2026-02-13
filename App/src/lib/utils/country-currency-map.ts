// ============================================================================
// COUNTRY TO CURRENCY MAPPING UTILITY
// ============================================================================
// Maps ISO 3166-1 alpha-2 country codes to their respective base currencies.
// Used during registration to assign the correct baseCurrency to new users.

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  CO: 'COP', // Colombia
  MX: 'MXN', // México
  US: 'USD', // United States
  GB: 'GBP', // United Kingdom
  DE: 'EUR', // Germany
  ES: 'EUR', // Spain
  FR: 'EUR', // France
  IT: 'EUR', // Italy
  NL: 'EUR', // Netherlands
  // Add more mappings as needed
};

/**
 * Returns the base currency for a given country code.
 * Defaults to 'COP' if no mapping is found, as requested.
 * 
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'CO', 'US')
 * @returns Three-letter currency code (e.g., 'COP', 'USD')
 */
export function getCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return 'COP';
  
  const formattedCode = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[formattedCode] || 'COP';
}

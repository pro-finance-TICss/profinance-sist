// ============================================================================
// MAPEO DE PAÍS A MONEDA - PRO-FINANCE
// ============================================================================
// Mapea códigos de país ISO 3166-1 alpha-2 a sus respectivas monedas base.
// Utilizado durante el registro para asignar la moneda base correcta al usuario.
// ============================================================================

export const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  CO: 'COP', // Colombia
  MX: 'MXN', // México
  US: 'USD', // Estados Unidos
  GB: 'GBP', // Reino Unido
  DE: 'EUR', // Alemania
  ES: 'EUR', // España
  FR: 'EUR', // Francia
  IT: 'EUR', // Italia
  NL: 'EUR', // Países Bajos
  // Agregar más mapeos según sea necesario
};

/**
 * Retorna la moneda base para un código de país dado.
 * Por defecto retorna 'COP' si no se encuentra el mapeo.
 * 
 * @param countryCode - Código de país ISO 3166-1 alpha-2 (ej. 'CO', 'US')
 * @returns Código de moneda de 3 letras (ej. 'COP', 'USD')
 */
export function getCurrencyForCountry(countryCode?: string | null): string {
  if (!countryCode) return 'COP';
  
  const formattedCode = countryCode.toUpperCase();
  return COUNTRY_CURRENCY_MAP[formattedCode] || 'COP';
}

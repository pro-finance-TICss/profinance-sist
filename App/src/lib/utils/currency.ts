// ============================================================================
// UTILIDADES DE FORMATO DE MONEDA - PRO-FINANCE
// ============================================================================
// Funciones helper para formatear y parsear valores monetarios.
// ============================================================================

/**
 * Formatea un número a formato de moneda USD.
 * @param amount - Monto a formatear
 * @param includeSymbol - Si debe incluir el símbolo $ (default: true)
 * @returns String formateado (ej: "$1,234.56")
 */
export function formatCurrency(
  amount: number,
  includeSymbol: boolean = true
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return includeSymbol ? `$${formatted}` : formatted;
}

/**
 * Parsea un string de moneda a número.
 * Elimina símbolos de moneda, comas y espacios.
 * @param value - String a parsear (ej: "$1,234.56" o "1234.56")
 * @returns Número parseado
 */
export function parseCurrency(value: string): number {
  // Eliminar símbolos de moneda, comas y espacios
  const cleaned = value.replace(/[$,\s]/g, "");
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Valida que un monto sea válido (positivo y con máximo 2 decimales).
 * @param amount - Monto a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidAmount(amount: number): boolean {
  if (amount <= 0) return false;

  // Verificar que no tenga más de 2 decimales
  const decimals = (amount.toString().split(".")[1] || "").length;
  return decimals <= 2;
}

/**
 * Convierte un Decimal de Prisma a número.
 * @param decimal - Valor Decimal de Prisma
 * @returns Número
 */
export function decimalToNumber(decimal: any): number {
  if (typeof decimal === "number") return decimal;
  if (typeof decimal === "string") return parseFloat(decimal);
  if (decimal && typeof decimal.toNumber === "function")
    return decimal.toNumber();
  return 0;
}

// ============================================================================
// DATOS DE BANCOS - PRO-FINANCE
// ============================================================================
// Lista de bancos para Colombia y México.
// Incluye tipos de documento y tipos de cuenta por país.
// ============================================================================

// ============================================================================
// TIPOS
// ============================================================================

export interface Bank {
  /** Código único del banco */
  code: string;
  /** Nombre completo del banco */
  name: string;
  /** Tipo de entidad (bank, neobank, wallet) */
  type: "bank" | "neobank" | "wallet";
}

export interface DocumentType {
  /** Código del tipo de documento */
  code: string;
  /** Nombre descriptivo */
  name: string;
}

export interface AccountType {
  /** Código del tipo de cuenta */
  code: string;
  /** Nombre descriptivo */
  name: string;
}

export interface CountryData {
  /** Código ISO del país */
  code: string;
  /** Nombre del país */
  name: string;
  /** Lista de bancos */
  banks: Bank[];
  /** Tipos de documento aceptados */
  documentTypes: DocumentType[];
  /** Tipos de cuenta */
  accountTypes: AccountType[];
  /** Expresión regular para validar número de cuenta */
  accountNumberPattern: RegExp;
  /** Descripción del formato de número de cuenta */
  accountNumberHint: string;
}

// ============================================================================
// DATOS DE COLOMBIA
// ============================================================================

const COLOMBIA_BANKS: Bank[] = [
  // Bancos Tradicionales
  { code: "BANCOLOMBIA", name: "Bancolombia", type: "bank" },
  { code: "DAVIVIENDA", name: "Davivienda", type: "bank" },
  { code: "BBVA", name: "BBVA Colombia", type: "bank" },
  { code: "BOGOTA", name: "Banco de Bogotá", type: "bank" },
  { code: "POPULAR", name: "Banco Popular", type: "bank" },
  { code: "OCCIDENTE", name: "Banco de Occidente", type: "bank" },
  { code: "SCOTIABANK", name: "Scotiabank Colpatria", type: "bank" },
  { code: "CAJA_SOCIAL", name: "Banco Caja Social", type: "bank" },
  { code: "AV_VILLAS", name: "Banco AV Villas", type: "bank" },
  { code: "ITAU", name: "Itaú", type: "bank" },
  { code: "PICHINCHA", name: "Banco Pichincha", type: "bank" },
  { code: "AGRARIO", name: "Banco Agrario", type: "bank" },
  { code: "GNBSUDAMERIS", name: "GNB Sudameris", type: "bank" },
  { code: "FALABELLA", name: "Banco Falabella", type: "bank" },
  { code: "SERFINANZA", name: "Serfinanza", type: "bank" },
  // Neobancos y Billeteras
  { code: "NEQUI", name: "Nequi", type: "neobank" },
  { code: "DAVIPLATA", name: "Daviplata", type: "wallet" },
  { code: "LULO", name: "Lulo Bank", type: "neobank" },
  { code: "NU", name: "Nu Colombia", type: "neobank" },
  { code: "RAPPIPAY", name: "RappiPay", type: "wallet" },
  { code: "MOVII", name: "MOVii", type: "wallet" },
  { code: "DALE", name: "Dale!", type: "wallet" },
];

const COLOMBIA_DOCUMENT_TYPES: DocumentType[] = [
  { code: "CC", name: "Cédula de Ciudadanía" },
  { code: "CE", name: "Cédula de Extranjería" },
  { code: "NIT", name: "NIT (Empresas)" },
  { code: "PASSPORT", name: "Pasaporte" },
  { code: "TI", name: "Tarjeta de Identidad" },
];

const COLOMBIA_ACCOUNT_TYPES: AccountType[] = [
  { code: "SAVINGS", name: "Cuenta de Ahorros" },
  { code: "CHECKING", name: "Cuenta Corriente" },
];

// ============================================================================
// DATOS DE MÉXICO
// ============================================================================

const MEXICO_BANKS: Bank[] = [
  // Bancos Tradicionales
  { code: "BBVA_MX", name: "BBVA México", type: "bank" },
  { code: "BANORTE", name: "Banorte", type: "bank" },
  { code: "SANTANDER_MX", name: "Santander México", type: "bank" },
  { code: "CITIBANAMEX", name: "Citibanamex", type: "bank" },
  { code: "HSBC_MX", name: "HSBC México", type: "bank" },
  { code: "SCOTIABANK_MX", name: "Scotiabank México", type: "bank" },
  { code: "INBURSA", name: "Banco Inbursa", type: "bank" },
  { code: "AZTECA", name: "Banco Azteca", type: "bank" },
  { code: "BAJIO", name: "Banco del Bajío", type: "bank" },
  { code: "AFIRME", name: "Afirme", type: "bank" },
  { code: "BANBAJIO", name: "BanBajío", type: "bank" },
  { code: "BANREGIO", name: "Banregio", type: "bank" },
  // Neobancos y Billeteras
  { code: "NU_MX", name: "Nu México", type: "neobank" },
  { code: "KLAR", name: "Klar", type: "neobank" },
  { code: "ALBO", name: "Albo", type: "neobank" },
  { code: "FONDEADORA", name: "Fondeadora", type: "neobank" },
  { code: "UALÁ", name: "Ualá", type: "neobank" },
  { code: "STORI", name: "Stori", type: "neobank" },
  { code: "MERCADOPAGO_MX", name: "Mercado Pago", type: "wallet" },
  { code: "SPIN", name: "Spin by Oxxo", type: "wallet" },
];

const MEXICO_DOCUMENT_TYPES: DocumentType[] = [
  { code: "CURP", name: "CURP" },
  { code: "RFC", name: "RFC" },
  { code: "INE", name: "INE/IFE" },
  { code: "PASSPORT", name: "Pasaporte" },
];

const MEXICO_ACCOUNT_TYPES: AccountType[] = [
  { code: "CLABE", name: "CLABE Interbancaria" },
  { code: "DEBIT", name: "Tarjeta de Débito" },
];

// ============================================================================
// DATOS POR PAÍS
// ============================================================================

export const COUNTRIES: Record<string, CountryData> = {
  CO: {
    code: "CO",
    name: "Colombia",
    banks: COLOMBIA_BANKS,
    documentTypes: COLOMBIA_DOCUMENT_TYPES,
    accountTypes: COLOMBIA_ACCOUNT_TYPES,
    // Cuentas en Colombia: 10-16 dígitos dependiendo del banco
    accountNumberPattern: /^\d{10,16}$/,
    accountNumberHint: "Ingresa de 10 a 16 dígitos",
  },
  MX: {
    code: "MX",
    name: "México",
    banks: MEXICO_BANKS,
    documentTypes: MEXICO_DOCUMENT_TYPES,
    accountTypes: MEXICO_ACCOUNT_TYPES,
    // CLABE en México: exactamente 18 dígitos
    accountNumberPattern: /^\d{16,18}$/,
    accountNumberHint: "Ingresa tu CLABE de 18 dígitos o número de cuenta",
  },
};

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Obtiene los datos de un país por su código.
 * @param countryCode - Código ISO del país (CO, MX)
 * @returns Datos del país o undefined si no existe
 */
export function getCountryData(countryCode: string): CountryData | undefined {
  return COUNTRIES[countryCode.toUpperCase()];
}

/**
 * Obtiene la lista de bancos de un país.
 * @param countryCode - Código ISO del país
 * @returns Array de bancos o array vacío
 */
export function getBanksByCountry(countryCode: string): Bank[] {
  return COUNTRIES[countryCode.toUpperCase()]?.banks || [];
}

/**
 * Busca un banco por su código.
 * @param bankCode - Código del banco
 * @param countryCode - Código del país (opcional, busca en todos si no se especifica)
 * @returns Banco encontrado o undefined
 */
export function getBankByCode(
  bankCode: string,
  countryCode?: string
): Bank | undefined {
  if (countryCode) {
    return COUNTRIES[countryCode.toUpperCase()]?.banks.find(
      (b) => b.code === bankCode
    );
  }

  // Buscar en todos los países
  for (const country of Object.values(COUNTRIES)) {
    const bank = country.banks.find((b) => b.code === bankCode);
    if (bank) return bank;
  }
  return undefined;
}

/**
 * Valida un número de cuenta según el formato del país.
 * @param accountNumber - Número de cuenta a validar
 * @param countryCode - Código del país
 * @returns true si el formato es válido
 */
export function validateAccountNumber(
  accountNumber: string,
  countryCode: string
): boolean {
  const country = COUNTRIES[countryCode.toUpperCase()];
  if (!country) return false;

  const cleanNumber = accountNumber.replace(/\D/g, "");
  return country.accountNumberPattern.test(cleanNumber);
}

/**
 * Obtiene la lista de países disponibles.
 * @returns Array con código y nombre de cada país
 */
export function getAvailableCountries(): { code: string; name: string }[] {
  return Object.values(COUNTRIES).map((c) => ({
    code: c.code,
    name: c.name,
  }));
}

// ============================================================================
// UTILIDADES TOTP - PRO-FINANCE
// ============================================================================
// Funciones para generación de secretos, QR codes y verificación de tokens.
// Basado en RFC 6238 (TOTP) y compatible con Google Authenticator.
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const otplib = require("otplib");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QRCode = require("qrcode");

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================================================

/** Nombre de la aplicación mostrado en apps de autenticación */
const APP_NAME = "Pro-Finance";

/** Configuración TOTP */
const TOTP_OPTIONS = {
  digits: 6,
  period: 30,
  window: 1,
};

// ============================================================================
// FUNCIONES DE GENERACIÓN
// ============================================================================

/**
 * Genera un nuevo secreto TOTP para un usuario.
 * @returns Secret en formato base32 (20-32 caracteres)
 */
export function generateTotpSecret(): string {
  return otplib.generateSecret() as string;
}

/**
 * Genera la URL otpauth:// para registrar en una app de autenticación.
 * @param email - Email del usuario (usado como identificador)
 * @param secret - Secreto TOTP base32
 * @returns URL compatible con Google Authenticator
 */
export function generateTotpUri(email: string, secret: string): string {
  return otplib.generateURI({
    secret,
    issuer: APP_NAME,
    accountName: email,
    type: "totp",
    digits: TOTP_OPTIONS.digits,
    period: TOTP_OPTIONS.period,
  }) as string;
}

/**
 * Genera un código QR como Data URL (base64 PNG).
 * @param uri - URL otpauth:// generada por generateTotpUri
 * @returns Promise con Data URL del QR
 */
export async function generateQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: { dark: "#000000", light: "#ffffff" },
  }) as Promise<string>;
}

// ============================================================================
// FUNCIONES DE VERIFICACIÓN
// ============================================================================

/**
 * Verifica si un código TOTP es válido para el secreto dado.
 * @param token - Código de 6 dígitos ingresado por el usuario
 * @param secret - Secreto TOTP almacenado
 * @returns true si el código es válido
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = otplib.verifySync({
      token,
      secret,
      digits: TOTP_OPTIONS.digits,
      period: TOTP_OPTIONS.period,
      window: TOTP_OPTIONS.window,
    });

    // Handle both boolean (true) and object ({ valid: true }) return types
    if (typeof result === "boolean") {
      return result;
    }
    if (typeof result === "object" && result !== null && "valid" in result) {
      return (result as { valid: boolean }).valid === true;
    }

    return false;
  } catch (e) {
    console.error("TOTP Verification error:", e);
    return false;
  }
}

/**
 * Genera el código TOTP actual para un secreto dado.
 * Útil para testing y debugging.
 * @param secret - Secreto TOTP base32
 * @returns Código de 6 dígitos actual
 */
export function generateCurrentToken(secret: string): string {
  return otplib.generateSync({
    secret,
    digits: TOTP_OPTIONS.digits,
    period: TOTP_OPTIONS.period,
  }) as string;
}

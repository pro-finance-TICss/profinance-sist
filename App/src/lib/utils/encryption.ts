// ============================================================================
// UTILIDADES DE ENCRIPTACIÓN - PRO-FINANCE
// ============================================================================
// Funciones para encriptar y desencriptar datos sensibles usando AES-256-GCM.
// Usado para proteger números de cuenta bancaria.
// ============================================================================

import crypto from "crypto";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/** Algoritmo de encriptación */
const ALGORITHM = "aes-256-gcm";

/** Longitud del IV (Initialization Vector) en bytes */
const IV_LENGTH = 12;

/** Longitud del Auth Tag en bytes */
const AUTH_TAG_LENGTH = 16;

/**
 * Obtiene la clave de encriptación del entorno.
 * Si no existe, genera una clave de fallback para desarrollo.
 * @returns Buffer con la clave de 32 bytes
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (!envKey) {
    // En producción, la clave debe estar configurada
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ENCRYPTION_KEY no está configurada en variables de entorno"
      );
    }
    // En desarrollo, usamos una clave fija (solo para testing)
    console.warn(
      "⚠️ Usando clave de encriptación de desarrollo. NO usar en producción."
    );
    return crypto.scryptSync("dev-key-profinance-2024", "salt", 32);
  }

  // La clave debe ser de 64 caracteres hex (32 bytes)
  if (envKey.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY debe ser de 64 caracteres hexadecimales (32 bytes)"
    );
  }

  return Buffer.from(envKey, "hex");
}

// ============================================================================
// FUNCIONES DE ENCRIPTACIÓN
// ============================================================================

/**
 * Encripta un texto plano usando AES-256-GCM.
 * @param plaintext - Texto a encriptar
 * @returns String encriptado en formato: iv:authTag:ciphertext (hex)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Formato: iv:authTag:ciphertext (todos en hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Desencripta un texto encriptado con AES-256-GCM.
 * @param encryptedText - Texto encriptado en formato: iv:authTag:ciphertext
 * @returns Texto plano original
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");

  if (parts.length !== 3) {
    throw new Error("Formato de texto encriptado inválido");
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// ============================================================================
// UTILIDADES PARA CUENTAS BANCARIAS
// ============================================================================

/**
 * Encripta un número de cuenta y retorna el texto encriptado
 * junto con los últimos 4 dígitos para visualización.
 * @param accountNumber - Número de cuenta en texto plano
 * @returns Objeto con el número encriptado y los últimos 4 dígitos
 */
export function encryptAccountNumber(accountNumber: string): {
  encrypted: string;
  last4: string;
} {
  // Limpiar el número de cuenta (solo dígitos)
  const cleanNumber = accountNumber.replace(/\D/g, "");

  if (cleanNumber.length < 4) {
    throw new Error("El número de cuenta debe tener al menos 4 dígitos");
  }

  return {
    encrypted: encrypt(cleanNumber),
    last4: cleanNumber.slice(-4),
  };
}

/**
 * Desencripta un número de cuenta.
 * @param encryptedNumber - Número de cuenta encriptado
 * @returns Número de cuenta en texto plano
 */
export function decryptAccountNumber(encryptedNumber: string): string {
  return decrypt(encryptedNumber);
}

/**
 * Genera una clave de encriptación aleatoria de 32 bytes en formato hexadecimal.
 * Útil para generar ENCRYPTION_KEY en producción.
 * @returns String de 64 caracteres hexadecimales
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

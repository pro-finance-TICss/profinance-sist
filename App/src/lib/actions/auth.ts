// ============================================================================
// SERVER ACTIONS DE AUTENTICACIÓN
// ============================================================================
// Acciones del servidor para registro de usuarios y configuración TOTP.
// Utiliza Prisma para persistencia y bcrypt para hashing seguro.
// ============================================================================

"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import {
  generateTotpSecret,
  generateTotpUri,
  generateQrDataUrl,
  verifyTotpToken,
} from "@/lib/totp";

// ============================================================================
// TIPOS DE RESPUESTA
// ============================================================================

/**
 * Respuesta estándar de las Server Actions.
 */
interface ActionResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Datos de configuración TOTP para el frontend.
 */
interface TotpSetupData {
  qrCode: string; // Data URL del QR
  secret: string; // Secreto para entrada manual
  userId: string; // ID del usuario para confirmar
}

/**
 * Respuesta del registro con datos TOTP.
 */
interface RegisterResponse extends ActionResponse {
  totpSetup?: TotpSetupData;
}

/**
 * Datos de usuario sanitizados (sin información sensible).
 */
interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

// ============================================================================
// CONSTANTES DE SEGURIDAD
// ============================================================================

/**
 * Número de rondas de salt para bcrypt.
 * 12 es un buen balance entre seguridad y rendimiento.
 */
const BCRYPT_SALT_ROUNDS = 12;

// ============================================================================
// ACCIÓN: REGISTRAR USUARIO
// ============================================================================

/**
 * Registra un nuevo usuario en el sistema.
 * Genera secreto TOTP pero NO lo habilita hasta que el usuario verifique.
 *
 * @param formData - Datos del formulario de registro
 * @returns Resultado con datos para configurar TOTP
 */
export async function registerUser(
  formData: RegisterFormData
): Promise<RegisterResponse> {
  try {
    // ================================================================
    // PASO 1: Validación con Zod
    // ================================================================
    const validatedFields = registerSchema.safeParse(formData);

    if (!validatedFields.success) {
      // Extraer errores de validación por campo
      const fieldErrors: Record<string, string[]> = {};
      validatedFields.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });

      return {
        success: false,
        message: "Por favor corrige los errores en el formulario.",
        errors: fieldErrors,
      };
    }

    const { email, password, firstName, paternalSurname, maternalSurname } =
      validatedFields.data;

    // ================================================================
    // PASO 2: Verificar si el email ya existe
    // ================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "El usuario ya está registrado con este correo electrónico.",
        errors: {
          email: ["Este correo ya está en uso. ¿Olvidaste tu contraseña?"],
        },
      };
    }

    // ================================================================
    // PASO 3: Hashear contraseña con bcrypt
    // ================================================================
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ================================================================
    // PASO 4: Generar secreto TOTP
    // ================================================================
    const totpSecret = generateTotpSecret();

    // ================================================================
    // PASO 5: Crear usuario en la base de datos
    // ================================================================
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        paternalSurname,
        maternalSurname,
        totpSecret, // Guardar secreto (aún no habilitado)
        totpEnabled: false, // Se habilitará al verificar primer código
      },
    });

    console.log("✅ Usuario registrado exitosamente:", email);
    console.log("🔐 Esperando configuración de TOTP...");

    // ================================================================
    // PASO 6: Generar QR para configuración de autenticador
    // ================================================================
    const uri = generateTotpUri(email, totpSecret);
    const qrCode = await generateQrDataUrl(uri);

    return {
      success: true,
      message: "Cuenta creada. Configura tu autenticador para continuar.",
      totpSetup: {
        qrCode,
        secret: totpSecret,
        userId: newUser.id,
      },
    };
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);

    return {
      success: false,
      message:
        "Ocurrió un error al crear la cuenta. Por favor intenta de nuevo.",
    };
  }
}

// ============================================================================
// ACCIÓN: CONFIRMAR CONFIGURACIÓN TOTP
// ============================================================================

/**
 * Verifica el código TOTP durante el registro y habilita 2FA para el usuario.
 *
 * @param userId - ID del usuario
 * @param code - Código TOTP de 6 dígitos
 * @returns Resultado de la verificación
 */
export async function confirmTotpSetup(
  userId: string,
  code: string
): Promise<ActionResponse & { recoveryCodes?: string[] }> {
  try {
    // Buscar usuario
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    if (!user.totpSecret) {
      return {
        success: false,
        message: "No hay configuración TOTP pendiente.",
      };
    }

    if (user.totpEnabled) {
      return { success: false, message: "TOTP ya está configurado." };
    }

    // Verificar código
    if (!verifyTotpToken(code, user.totpSecret)) {
      console.error("❌ Código TOTP inválido durante setup para:", user.email);
      return {
        success: false,
        message: "Código incorrecto. Intenta de nuevo.",
      };
    }

    // ========================================================================
    // GENERAR CÓDIGOS DE RECUPERACIÓN (8 códigos)
    // ========================================================================
    const RECOVERY_CODES_COUNT = 8;
    const CHAR_SET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const CODE_LENGTH = 10;
    const plainCodes: string[] = [];
    const hashedCodesData: { userId: string; codeHash: string }[] = [];

    // Import dinámico de crypto para asegurar entorno de node
    const crypto = await import("crypto");

    for (let i = 0; i < RECOVERY_CODES_COUNT; i++) {
      let codeStr = "";
      const randomBytes = crypto.randomBytes(CODE_LENGTH);
      for (let j = 0; j < CODE_LENGTH; j++) {
        const index = randomBytes[j] % CHAR_SET.length;
        codeStr += CHAR_SET[index];
      }
      // Formato XXXXX-XXXXX
      const formattedCode = `${codeStr.slice(0, 5)}-${codeStr.slice(5)}`;
      plainCodes.push(formattedCode);

      const hashCode = await bcrypt.hash(formattedCode, 10);
      hashedCodesData.push({ userId, codeHash: hashCode });
    }

    // ========================================================================
    // TRANSACCIÓN: Habilitar TOTP + Guardar Códigos
    // ========================================================================
    await prisma.$transaction(async (tx) => {
      // 1. Habilitar TOTP
      await tx.user.update({
        where: { id: userId },
        data: { totpEnabled: true },
      });

      // 2. Limpiar códigos anteriores (si hubieran, raro en registro pero posible)
      await tx.recoveryCode.deleteMany({ where: { userId } });

      // 3. Insertar nuevos códigos
      await tx.recoveryCode.createMany({ data: hashedCodesData });
    });

    console.log("✅ TOTP configurado y códigos generados para:", user.email);

    return {
      success: true,
      message: "¡Autenticador configurado correctamente!",
      recoveryCodes: plainCodes,
    };
  } catch (error) {
    console.error("❌ Error al confirmar TOTP:", error);
    return {
      success: false,
      message: "Error al verificar el código. Intenta de nuevo.",
    };
  }
}

// ============================================================================
// ACCIÓN: REGENERAR QR DE TOTP (para usuarios que perdieron acceso)
// ============================================================================

/**
 * Regenera el secreto TOTP y devuelve un nuevo QR.
 * Requiere que el usuario esté autenticado o tenga token de recuperación.
 *
 * @param userId - ID del usuario
 * @param email - Email del usuario (para el QR)
 * @returns Nuevo QR y secreto
 */
export async function regenerateTotpSetup(
  userId: string,
  email: string
): Promise<RegisterResponse> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Generar nuevo secreto
    const totpSecret = generateTotpSecret();

    // Actualizar usuario (deshabilitar TOTP hasta que verifique)
    await prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret,
        totpEnabled: false,
      },
    });

    // Generar nuevo QR
    const uri = generateTotpUri(email, totpSecret);
    const qrCode = await generateQrDataUrl(uri);

    console.log("🔄 TOTP regenerado para:", email);

    return {
      success: true,
      message: "Nuevo código QR generado. Configura tu autenticador.",
      totpSetup: {
        qrCode,
        secret: totpSecret,
        userId,
      },
    };
  } catch (error) {
    console.error("❌ Error al regenerar TOTP:", error);
    return {
      success: false,
      message: "Error al generar nuevo código. Intenta de nuevo.",
    };
  }
}

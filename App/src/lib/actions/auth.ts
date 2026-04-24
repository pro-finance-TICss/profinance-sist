// ============================================================================
// SERVER ACTIONS DE AUTENTICACIÓN
// ============================================================================
// Acciones del servidor para registro de usuarios y configuración TOTP.
// Utiliza Prisma para persistencia y bcrypt para hashing seguro.
//
// SEGURIDAD: El referralCode NUNCA se acepta desde el cliente.
// Se lee exclusivamente de la cookie HttpOnly pf_ref, establecida por
// el middleware tras validar el código en la base de datos.
// ============================================================================

"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";
import {
  generateTotpSecret,
  generateTotpUri,
  generateQrDataUrl,
  verifyTotpToken,
} from "@/lib/totp";
import { generateUniqueReferralCode } from "@/lib/services/referral.service";
import { getQuotaForRole } from "@/app/api/referrals/validate/route";
import { REFERRAL_COOKIE_NAME } from "@/proxy";
import { logger } from "@/lib/logger";


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

    const { email, password, firstName, paternalSurname, maternalSurname, country, baseCurrency } =
      validatedFields.data;

    // ================================================================
    // PASO 2: Leer el referral code EXCLUSIVAMENTE de la cookie segura
    // SECURITY: El código NUNCA se acepta desde el cliente.
    // El middleware valida el código y lo almacena en una cookie HttpOnly.
    // ================================================================
    const cookieStore = await cookies();
    const rawReferralCode = cookieStore.get(REFERRAL_COOKIE_NAME)?.value;

    if (!rawReferralCode) {
      logger.warn(`[registerUser] Attempt without valid pf_ref cookie from email: ${email}`);
      return {
        success: false,
        message: "Acceso denegado. Se requiere una invitación válida.",
      };
    }

    const normalizedCode = rawReferralCode.trim().toUpperCase();

    // ================================================================
    // PASO 3: Re-validar el código en DB (defense-in-depth)
    // La cookie puede haber sido forjada o el referrer puede haber
    // alcanzado su cuota entre el tiempo de visita y el registro.
    // ================================================================
    const referrer = await prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            referrals: {
              where: { status: { in: ["PENDING", "ACTIVE"] } },
            },
          },
        },
      },
    });

    if (!referrer) {
      logger.warn(`[registerUser] Invalid referral code from cookie: ${normalizedCode}`);
      return {
        success: false,
        message: "El código de invitación no es válido. Solicita un nuevo link.",
      };
    }

    // ── 3a. Anti-fraude: self-referral ────────────────────────────────────
    if (referrer.email.toLowerCase() === email.toLowerCase()) {
      logger.warn(`[registerUser] Self-referral attempt blocked for: ${email}`);
      return {
        success: false,
        message: "No puedes usar tu propio código de referido.",
      };
    }

    // ── 3b. Doble validación de cuota (defense-in-depth) ─────────────────
    const maxQuota = getQuotaForRole(referrer.role);
    if (referrer._count.referrals >= maxQuota) {
      logger.warn(
        `[registerUser] Quota exceeded for referrer ${referrer.id}: ${referrer._count.referrals}/${maxQuota}`
      );
      return {
        success: false,
        message: "El usuario que te invitó ha alcanzado su límite de referencias.",
      };
    }

    // ── 3c. Anti-fraude: detección de referencia circular (A → B → A) ────
    // Verificar si el referrer fue referido por el email que se intenta registrar.
    // (En este punto el usuario nuevo no existe aún, pero verificamos por email)
    const circularCheck = await prisma.referral.findFirst({
      where: {
        referrerId: referrer.id,
        referred: { email: email.toLowerCase() },
      },
      select: { id: true },
    });

    if (circularCheck) {
      logger.warn(`[registerUser] Circular referral detected: ${email} ↔ ${referrer.email}`);
      return {
        success: false,
        message: "No se permiten referencias circulares.",
      };
    }

    // ================================================================
    // PASO 4: Verificar si el email ya existe
    // ================================================================
    const existingUser = await prisma.user.findUnique({ where: { email } });

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
    // PASO 5: Hashear contraseña con bcrypt
    // ================================================================
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ================================================================
    // PASO 6: Generar secreto TOTP
    // ================================================================
    const totpSecret = generateTotpSecret();

    // ================================================================
    // PASO 6.5: Determinar moneda base
    // ================================================================
    let finalBaseCurrency = baseCurrency || "COP";

    if (!baseCurrency && country) {
      const { getCurrencyForCountry } = await import("@/lib/utils/country-currency-map");
      finalBaseCurrency = getCurrencyForCountry(country);
    }

    // ================================================================
    // PASO 7: Crear usuario + referido de forma atómica
    // ================================================================
    const newUser = await prisma.$transaction(async (tx) => {
      // Generar código de referido único para el nuevo usuario
      const newUserReferralCode = await generateUniqueReferralCode(tx);

      // Crear el usuario con su propio referralCode único
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          paternalSurname,
          maternalSurname,
          country: country || null,
          baseCurrency: finalBaseCurrency,
          totpSecret,
          totpEnabled: false,
          referralCode: newUserReferralCode,
          // Crear cuenta de Ahorro (SAVINGS) por defecto
          // FASE PRE-1: account.role sincronizado con user.role
          // Los usuarios que se registran por el flujo público siempre son USER,
          // pero usamos el campo explícito para mantener la invariante.
          accounts: {
            create: {
              name: "Mi Cuenta de Ahorro",
              type: "SAVINGS",
              role: "USER", // Los nuevos registros públicos siempre son USER por definición del schema
              investedCapital: 0,
            },
          },
        },
      });

      // Crear la relación de referido (obligatoria en invite-only)
      await tx.referral.create({
        data: {
          referrerId: referrer.id,
          referredId: user.id,
          referralCodeUsed: normalizedCode,
          status: "PENDING",
        },
      });

      logger.debug(`[registerUser] ✅ Referral created: ${referrer.id} → ${user.id}`);

      return user;
    });

    logger.debug(`[registerUser] ✅ User registered: ${email}`);

    // ================================================================
    // PASO 8: Eliminar la cookie pf_ref tras registro exitoso
    // ================================================================
    cookieStore.delete(REFERRAL_COOKIE_NAME);

    logger.debug("[registerUser] 🍪 pf_ref cookie deleted after successful registration");

    // ================================================================
    // PASO 9: Generar QR para configuración de autenticador
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
    logger.error("[registerUser] ❌ Error:", error);

    return {
      success: false,
      message: "Ocurrió un error al crear la cuenta. Por favor intenta de nuevo.",
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
      logger.error("❌ Código TOTP inválido durante setup para:", user.email);
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

    logger.debug("✅ TOTP configurado y códigos generados para:", user.email);

    return {
      success: true,
      message: "¡Autenticador configurado correctamente!",
      recoveryCodes: plainCodes,
    };
  } catch (error) {
    logger.error("❌ Error al confirmar TOTP:", error);
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

    logger.debug("🔄 TOTP regenerado para:", email);

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
    logger.error("❌ Error al regenerar TOTP:", error);
    return {
      success: false,
      message: "Error al generar nuevo código. Intenta de nuevo.",
    };
  }
}

// ============================================================================
// ACCIÓN: OBTENER SETUP TOTP PARA USUARIO ACTUAL
// ============================================================================

import { auth } from "@/lib/auth";


/**
 * Genera o recupera la configuración TOTP para el usuario autenticado.
 * Usado en el flujo de onboarding para ADMIN/SUPERADMIN.
 *
 * @returns QR code y secreto para configurar autenticador
 */
export async function getTotpSetupForCurrentUser(): Promise<RegisterResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "No autorizado." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        totpSecret: true,
        totpEnabled: true,
      },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Si ya tiene TOTP habilitado, no necesita configurar
    if (user.totpEnabled) {
      return { success: false, message: "TOTP ya está configurado." };
    }

    // Generar nuevo secreto si no tiene uno
    let totpSecret = user.totpSecret;
    if (!totpSecret) {
      totpSecret = generateTotpSecret();
      await prisma.user.update({
        where: { id: user.id },
        data: { totpSecret },
      });
    }

    // Generar QR
    const uri = generateTotpUri(user.email, totpSecret);
    const qrCode = await generateQrDataUrl(uri);

    logger.debug("📱 QR de TOTP generado para usuario existente:", user.email);

    return {
      success: true,
      message: "Escanea el código QR con tu aplicación autenticadora.",
      totpSetup: {
        qrCode,
        secret: totpSecret,
        userId: user.id,
      },
    };
  } catch (error) {
    logger.error("❌ Error al obtener setup TOTP:", error);
    return {
      success: false,
      message: "Error al generar código QR. Intenta de nuevo.",
    };
  }
}

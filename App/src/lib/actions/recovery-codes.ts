"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { verifyTotpToken } from "@/lib/totp";
import { logger } from "@/lib/logger";

// CONFIGURACIÓN DE SEGURIDAD
const RECOVERY_CODES_COUNT = 8;
const MAX_ATTEMPTS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hora

// Caracteres seguros para códigos (evitando ambigüedades como 0/O, 1/I/L)
const CHAR_SET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

/**
 * Genera un código aleatorio seguro con formato XXXXX-XXXXX
 */
function generateSecureCode(): string {
  let code = "";
  const randomBytes = crypto.randomBytes(CODE_LENGTH);

  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = randomBytes[i] % CHAR_SET.length;
    code += CHAR_SET[index];
  }

  // Insertar guión para legibilidad
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * Valida si el usuario está bajo rate limit
 */
async function checkRateLimit(
  userId: string
): Promise<{ blocked: boolean; remainingTime?: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedRecoveryAttempts: true, lastFailedRecoveryAt: true },
  });

  if (!user || !user.lastFailedRecoveryAt) return { blocked: false };

  // Si ha pasado más de 1 hora, resetear contador
  const now = new Date();
  const timeDiff = now.getTime() - user.lastFailedRecoveryAt.getTime();

  if (timeDiff > RATE_LIMIT_WINDOW_MS) {
    // Resetear contador silenciosamente
    await prisma.user.update({
      where: { id: userId },
      data: { failedRecoveryAttempts: 0 },
    });
    return { blocked: false };
  }

  if (user.failedRecoveryAttempts >= MAX_ATTEMPTS_PER_HOUR) {
    return {
      blocked: true,
      remainingTime: Math.ceil((RATE_LIMIT_WINDOW_MS - timeDiff) / (60 * 1000)),
    };
  }

  return { blocked: false };
}

/**
 * 1. Generar nuevos códigos de recuperación
 * Requiere autenticación fuerte (Password + TOTP)
 */
export async function generateRecoveryCodes(
  password: string,
  totpCode: string
) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, message: "Usuario no encontrado" };

    // Validar contraseña
    const isValidPass = await bcrypt.compare(password, user.password);
    if (!isValidPass)
      return { success: false, message: "Contraseña incorrecta" };

    // Validar TOTP
    if (user.totpEnabled && user.totpSecret) {
      const isValidTotp = verifyTotpToken(totpCode, user.totpSecret);
      if (!isValidTotp)
        return { success: false, message: "Código TOTP inválido" };
    } else {
      return { success: false, message: "Debes tener 2FA activado primero" };
    }

    // Iniciar transacción: Eliminar viejos, crear nuevos
    const plainCodes: string[] = [];
    const hashedCodesData: { userId: string; codeHash: string }[] = [];

    for (let i = 0; i < RECOVERY_CODES_COUNT; i++) {
      const plainCode = generateSecureCode();
      const hashCode = await bcrypt.hash(plainCode, 10);
      plainCodes.push(plainCode);
      hashedCodesData.push({ userId, codeHash: hashCode });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar códigos existentes
      await tx.recoveryCode.deleteMany({ where: { userId } });

      // 2. Insertar nuevos códigos
      await tx.recoveryCode.createMany({ data: hashedCodesData });

      // 3. Auditoría
      await tx.user.update({
        where: { id: userId },
        data: {
          recoveryCodesViewedAt: new Date(),
          failedRecoveryAttempts: 0,
        },
      });

      // 4. Notificación de seguridad
      await tx.notification.create({
        // Usando tx directo o llamar a función externa (si tx es soportada)
        data: {
          userId,
          title: "Códigos de Recuperación Regenerados",
          message:
            "Tus códigos de acceso de emergencia han sido actualizados. Si no fuiste tú, contacta a soporte inmediatamente.",
          type: "WARNING",
        },
      });
    });

    return {
      success: true,
      codes: plainCodes,
      message: "Códigos generados exitosamente. ¡Guárdalos ahora!",
    };
  } catch (error) {
    logger.error("Error generating recovery codes:", error);
    return { success: false, message: "Error interno al generar códigos" };
  }
}

/**
 * 2. Obtener estado de los códigos (cantidad restante)
 */
export async function getRecoveryCodeStatus() {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const count = await prisma.recoveryCode.count({
      where: {
        userId: session.user.id,
        usedAt: null,
      },
    });
    return { count };
  } catch {
    return null;
  }
}

/**
 * 3. Verificar y usar un código de recuperación para Login
 * Esta función es un "bypass" de 2FA, por lo tanto es crítica.
 */
export async function verifyRecoveryCode(userId: string, code: string) {
  // Nota: Esta función se llama DESPUÉS de validar email/password en el login flow

  try {
    // 1. Rate Limiting Check
    const rateLimit = await checkRateLimit(userId);
    if (rateLimit.blocked) {
      return {
        success: false,
        message: "Límite de intentos excedido. Por favor espera 1 hora.",
      };
    }

    // 2. Obtener todos los códigos no usados del usuario
    // Como están hasheados, debemos comparar uno por uno (o buscar por usuario y filtrar)
    // Para optimizar, traemos solo los del usuario y comparamos en memoria (son pocos, max 10)
    const availableCodes = await prisma.recoveryCode.findMany({
      where: { userId, usedAt: null },
    });

    if (availableCodes.length === 0) {
      return {
        success: false,
        message: "No tienes códigos de recuperación activos.",
      };
    }

    // 3. Comparar el código ingresado contra los hashes
    let validCodeId: string | null = null;

    for (const record of availableCodes) {
      const match = await bcrypt.compare(code, record.codeHash);
      if (match) {
        validCodeId = record.id;
        break;
      }
    }

    // 4. Manejo de resultado
    if (validCodeId) {
      // ÉXITO: Marcar como usado y resetear intentos fallidos
      await prisma.$transaction([
        prisma.recoveryCode.update({
          where: { id: validCodeId },
          data: { usedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            failedRecoveryAttempts: 0,
            tokenVersion: { increment: 1 }, // Invalida otras sesiones por seguridad
          },
        }),
      ]);

      return { success: true };
    } else {
      // FALLO: Incrementar contador y registrar auditoría
      await prisma.user.update({
        where: { id: userId },
        data: {
          failedRecoveryAttempts: { increment: 1 },
          lastFailedRecoveryAt: new Date(),
        },
      });

      return { success: false, message: "Código de recuperación inválido." };
    }
  } catch (error) {
    logger.error("Error verifying recovery code:", error);
    return { success: false, message: "Error al verificar código." };
  }
}

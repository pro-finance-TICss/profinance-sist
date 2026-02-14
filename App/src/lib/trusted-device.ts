// ============================================================================
// GESTIÓN DE DISPOSITIVOS DE CONFIANZA - PRO-FINANCE
// ============================================================================
// Sistema para marcar dispositivos como "confiables" después de verificar TOTP.
// Permite omitir TOTP por 30 días en dispositivos verificados.
// ============================================================================

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { logger } from "@/lib/logger";

// Nombre de la cookie para identificar dispositivos confiables
export const TRUSTED_DEVICE_COOKIE_NAME = "pf_trusted_device";

// Duración de confianza: 30 días en milisegundos
export const TRUSTED_DEVICE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const TRUSTED_DEVICE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// ============================================================================
// FUNCIONES DE GESTIÓN
// ============================================================================

/**
 * Genera un token único y criptográficamente seguro para el dispositivo.
 */
function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parsea el User-Agent para obtener un nombre descriptivo del dispositivo.
 * Ejemplo: "Chrome en Windows", "Safari en iPhone"
 */
export function parseUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Dispositivo desconocido";

  let browser = "Navegador";
  let os = "desconocido";

  // Detectar navegador
  if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";
  else if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Opera") || userAgent.includes("OPR"))
    browser = "Opera";

  // Detectar sistema operativo
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac OS")) os = "macOS";
  else if (userAgent.includes("iPhone")) os = "iPhone";
  else if (userAgent.includes("iPad")) os = "iPad";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";

  return `${browser} en ${os}`;
}

/**
 * Crea un dispositivo de confianza y establece la cookie.
 * Llamar después de verificación TOTP exitosa.
 */
export async function createTrustedDevice(
  userId: string,
  userAgent: string | null
): Promise<{ success: boolean; deviceToken?: string }> {
  try {
    const deviceToken = generateDeviceToken();
    const deviceName = parseUserAgent(userAgent);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TRUSTED_DEVICE_MAX_AGE_MS);

    // Crear registro en base de datos
    await prisma.trustedDevice.create({
      data: {
        userId,
        deviceToken,
        deviceName,
        lastUsedAt: now,
        expiresAt,
      },
    });

    // Establecer cookie
    const cookieStore = await cookies();
    cookieStore.set(TRUSTED_DEVICE_COOKIE_NAME, deviceToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: TRUSTED_DEVICE_MAX_AGE_SECONDS,
      path: "/",
    });

    logger.debug("✅ Dispositivo de confianza creado:", deviceName);
    return { success: true, deviceToken };
  } catch (error) {
    logger.error("❌ Error creando dispositivo de confianza:", error);
    return { success: false };
  }
}

/**
 * Verifica si el dispositivo actual es confiable para el usuario.
 * Retorna true si puede omitir TOTP.
 */
export async function verifyTrustedDevice(
  userId: string
): Promise<{ trusted: boolean; deviceId?: string }> {
  try {
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;

    if (!deviceToken) {
      return { trusted: false };
    }

    // Buscar dispositivo en base de datos
    const device = await prisma.trustedDevice.findFirst({
      where: {
        deviceToken,
        userId,
        expiresAt: { gt: new Date() }, // No expirado
      },
    });

    if (!device) {
      // Cookie inválida o expirada, eliminarla
      cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);
      return { trusted: false };
    }

    // Actualizar última actividad
    await prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });

    logger.debug("✅ Dispositivo confiable verificado:", device.deviceName);
    return { trusted: true, deviceId: device.id };
  } catch (error) {
    logger.error("❌ Error verificando dispositivo confiable:", error);
    return { trusted: false };
  }
}

/**
 * Revoca un dispositivo de confianza específico.
 */
export async function revokeTrustedDevice(
  deviceId: string,
  userId: string
): Promise<boolean> {
  try {
    const device = await prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      return false;
    }

    await prisma.trustedDevice.delete({
      where: { id: deviceId },
    });

    logger.debug("✅ Dispositivo revocado:", deviceId);
    return true;
  } catch (error) {
    logger.error("❌ Error revocando dispositivo:", error);
    return false;
  }
}

/**
 * Revoca todos los dispositivos de confianza de un usuario.
 * Útil para "cerrar sesión en todos los dispositivos".
 */
export async function revokeAllTrustedDevices(userId: string): Promise<number> {
  try {
    const result = await prisma.trustedDevice.deleteMany({
      where: { userId },
    });

    logger.debug(
      `✅ ${result.count} dispositivos revocados para usuario:`,
      userId
    );
    return result.count;
  } catch (error) {
    logger.error("❌ Error revocando todos los dispositivos:", error);
    return 0;
  }
}

/**
 * Lista todos los dispositivos de confianza de un usuario.
 */
export async function listTrustedDevices(userId: string) {
  try {
    const devices = await prisma.trustedDevice.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }, // Solo activos
      },
      select: {
        id: true,
        deviceName: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: "desc" },
    });

    return devices;
  } catch (error) {
    logger.error("❌ Error listando dispositivos:", error);
    return [];
  }
}

/**
 * Limpia dispositivos expirados de la base de datos.
 * Puede ejecutarse periódicamente.
 */
export async function cleanupExpiredDevices(): Promise<number> {
  try {
    const result = await prisma.trustedDevice.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (result.count > 0) {
      logger.debug(`🧹 ${result.count} dispositivos expirados eliminados`);
    }
    return result.count;
  } catch (error) {
    logger.error("❌ Error limpiando dispositivos expirados:", error);
    return 0;
  }
}

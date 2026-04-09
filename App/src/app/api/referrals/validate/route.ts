// ============================================================================
// API ROUTE: VALIDATE REFERRAL CODE - PRO-FINANCE
// ============================================================================
// Endpoint interno llamado por el Edge Middleware para validar un código
// de referido antes de permitir el acceso a /register.
//
// Este endpoint NO requiere autenticación del usuario porque es invocado
// por el middleware en Edge Runtime (antes de cualquier sesión).
// La protección contra abuso se delega al rate-limiting del middleware.
//
// GET /api/referrals/validate?code=XXXX
//
// Respuestas:
//   200: { valid: true, referrerRole: "SOCIO"|"USER", currentCount: N, maxQuota: N }
//   400: { valid: false, reason: "MISSING_CODE" }
//   404: { valid: false, reason: "CODE_NOT_FOUND" }
//   409: { valid: false, reason: "QUOTA_REACHED", currentCount: N, maxQuota: N }
//   500: { valid: false, reason: "SERVER_ERROR" }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ============================================================================
// CONSTANTES DE CUOTA
// ============================================================================

/**
 * Límite máximo de referidos por rol del anfitrión.
 * Se cuentan referidos en estado PENDING + ACTIVE (no solo activos).
 */
export const REFERRAL_QUOTA: Record<string, number> = {
  SOCIO: 10,
  USER: 5,
  ADMIN: 999,       // Sin límite efectivo para admins
  SUPER_ADMIN: 999, // Sin límite efectivo para superadmins
} as const;

/**
 * Cuota por defecto para roles no definidos explícitamente.
 */
const DEFAULT_QUOTA = 5;

/**
 * Obtiene la cuota máxima de referidos para un rol dado.
 */
export function getQuotaForRole(role: string): number {
  return REFERRAL_QUOTA[role] ?? DEFAULT_QUOTA;
}

// ============================================================================
// HANDLER
// ============================================================================



export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    // ── Validación de parámetro ──────────────────────────────────────────────
    if (!code || code.trim().length === 0) {

      return NextResponse.json(
        { valid: false, reason: "MISSING_CODE" },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // ── Buscar el referrer en la base de datos ───────────────────────────────
    const referrer = await prisma.user.findUnique({
      where: { referralCode: normalizedCode },
      select: {
        id: true,
        role: true,
        // Contar referidos activos o pendientes (cuota)
        _count: {
          select: {
            referrals: {
              where: {
                status: { in: ["PENDING", "ACTIVE"] },
              },
            },
          },
        },
      },
    });

    // ── 404: Código no encontrado ────────────────────────────────────────────
    if (!referrer) {
      logger.debug(
        `[validate-referral] Code not found: ${normalizedCode}`
      );
      return NextResponse.json(
        { valid: false, reason: "CODE_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Calcular cuota ────────────────────────────────────────────────────────
    const maxQuota = getQuotaForRole(referrer.role);
    const currentCount = referrer._count.referrals;

    if (currentCount >= maxQuota) {
      logger.debug(
        `[validate-referral] Quota reached for ${normalizedCode}: ${currentCount}/${maxQuota}`
      );
      return NextResponse.json(
        {
          valid: false,
          reason: "QUOTA_REACHED",
          currentCount,
          maxQuota,
        },
        { status: 409 }
      );
    }

    // ── 200: Código válido con cupo disponible ───────────────────────────────
    logger.debug(
      `[validate-referral] Valid code: ${normalizedCode} (${currentCount}/${maxQuota})`
    );
    return NextResponse.json({
      valid: true,
      referrerRole: referrer.role,
      currentCount,
      maxQuota,
    });
  } catch (error) {
    logger.error("[validate-referral] Unexpected error:", error);
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}

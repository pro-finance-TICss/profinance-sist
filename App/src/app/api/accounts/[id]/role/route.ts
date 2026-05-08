// ============================================================================
// API ROUTE: CAMBIAR ROL DE CUENTA - PRO-FINANCE (SOLO SUPER_ADMIN)
// ============================================================================
// Permite a un SUPER_ADMIN cambiar el rol de una cuenta entre USER y SOCIO.
// Los usuarios normales NO pueden modificar este campo.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/// Roles válidos para una cuenta
const VALID_ROLES = ["USER", "SOCIO"] as const;

/**
 * PATCH /api/accounts/[id]/role
 * Cambia el rol de una cuenta financiera (solo SUPER_ADMIN).
 *
 * Body esperado: { role: "USER" | "SOCIO" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Verificar rol SUPER_ADMIN (control de acceso estricto)
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Solo Super Admin puede cambiar el rol de una cuenta" },
        { status: 403 }
      );
    }

    // 3. Obtener ID de la cuenta desde los parámetros de ruta
    const { id: accountId } = await params;

    // 4. Parsear y validar body
    const body = await req.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Roles permitidos: ${VALID_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    // 5. Verificar que la cuenta exista
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, name: true, role: true },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // 6. No actualizar si el rol ya es el mismo
    if (account.role === role) {
      return NextResponse.json({
        message: `La cuenta ya tiene el rol ${role}`,
        account: { id: account.id, name: account.name, role: account.role },
      });
    }

    // 7. Actualizar rol de la cuenta solicitada
    const updated = await prisma.account.update({
      where: { id: accountId },
      data: { role },
      select: { id: true, name: true, role: true, userId: true },
    });

    // FASE PRE-1: Propagar el cambio a user.role y a TODAS las cuentas del usuario
    // para mantener la invariante: account.role === user.role
    await prisma.user.update({
      where: { id: updated.userId },
      data: { role },
    });
    const { count } = await prisma.account.updateMany({
      where: { userId: updated.userId, id: { not: accountId } }, // las demás cuentas
      data: { role },
    });
    console.log(`[ROLE SYNC] PATCH /api/accounts/${accountId}/role — user.role actualizado + ${count} cuentas adicionales sincronizadas a: ${role}`);

    logger.debug(
      `✅ SUPER_ADMIN cambió rol de cuenta "${updated.name}" (${updated.id}): ` +
      `${account.role} → ${updated.role}`
    );

    // 8. Crear log de auditoría
    await prisma.auditLog.create({
      data: {
        action: "ACCOUNT_ROLE_CHANGED",
        entityId: accountId,
        entityType: "Account",
        userId: session.user.id,
        details: JSON.stringify({
          accountName: updated.name,
          previousRole: account.role,
          newRole: updated.role,
          accountUserId: updated.userId,
          additionalAccountsSynced: count,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Rol actualizado a ${role}`,
      account: {
        id: updated.id,
        name: updated.name,
        role: updated.role,
      },
    });
  } catch (error) {
    logger.error("❌ Error cambiando rol de cuenta:", error);
    return NextResponse.json(
      { error: "Error al cambiar el rol" },
      { status: 500 }
    );
  }
}

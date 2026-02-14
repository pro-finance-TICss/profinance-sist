// ============================================================================
// API ROUTE: GET ALL WITHDRAWAL REQUESTS - PRO-FINANCE (ADMIN)
// ============================================================================
// Obtiene todas las solicitudes de retiro para administradores.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/withdrawals
 * Retorna todas las solicitudes de retiro (solo admin).
 * Query params: status (optional: PENDING | APPROVED | REJECTED)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación y rol de admin
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de administrador." },
        { status: 403 }
      );
    }

    // 2. Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // 3. Construir filtros
    const where: any = {};
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    // 4. Obtener solicitudes de retiro
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            paternalSurname: true,
          },
        },
      },
    });

    // 5. Formatear respuesta
    const formattedWithdrawals = withdrawals.map((w) => ({
      id: w.id,
      amount: decimalToNumber(w.amount),
      status: w.status,
      requestedAt: w.requestedAt,
      processedAt: w.processedAt,
      notes: w.notes,
      user: {
        id: w.user.id,
        email: w.user.email,
        name: `${w.user.firstName} ${w.user.paternalSurname}`,
      },
    }));

    return NextResponse.json({
      withdrawals: formattedWithdrawals,
    });
  } catch (error) {
    logger.error("❌ Error obteniendo solicitudes de retiro:", error);
    return NextResponse.json(
      { error: "Error al obtener solicitudes" },
      { status: 500 }
    );
  }
}

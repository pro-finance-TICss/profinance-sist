// ============================================================================
// API ROUTE: GET WITHDRAWAL REQUESTS - PRO-FINANCE
// ============================================================================
// Obtiene las solicitudes de retiro del usuario autenticado.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * GET /api/wallet/withdrawals
 * Retorna las solicitudes de retiro del usuario.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener solicitudes de retiro
    const withdrawals = await prisma.withdrawalRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { requestedAt: "desc" },
      select: {
        id: true,
        amount: true,
        status: true,
        requestedAt: true,
        processedAt: true,
        notes: true,
        bankAccountId: true,
        accountId: true,
      },
    });

    // 3. Convertir Decimals a números
    const formattedWithdrawals = withdrawals.map((w) => ({
      ...w,
      amount: decimalToNumber(w.amount),
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

// ============================================================================
// API ROUTE: RESUMEN FINANCIERO CONSOLIDADO — PRO-FINANCE
// ============================================================================
// GET /api/wallet/summary
//
// Devuelve el resumen financiero consolidado de TODAS las cuentas del usuario
// autenticado. Los cálculos se realizan íntegramente en backend.
//
// SEGURIDAD:
//   - userId siempre proviene de session.user.id. NUNCA del request body.
//   - No se acepta ningún parámetro de identificación desde el cliente.
// ============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    // ── 1. Autenticación ──────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id; // Fuente de verdad — NUNCA del query/body

    // ── 2. Capital total consolidado (SUM de todas las cuentas del usuario) ───
    // Prisma aggregate suma directamente en DB, sin cargar todos los registros.
    const capitalAggregate = await prisma.account.aggregate({
      where: { userId },
      _sum: { investedCapital: true },
    });

    const totalCapital = decimalToNumber(capitalAggregate._sum.investedCapital) ?? 0;

    // ── 3. Retiros pendientes (PENDING) ───────────────────────────────────────
    // Si el modelo WithdrawalRequest tiene solicitudes pendientes, las sumamos.
    const withdrawalAggregate = await prisma.withdrawalRequest.aggregate({
      where: {
        userId,
        status: "PENDING",
      },
      _sum: { amount: true },
    });

    const totalPendingWithdrawals =
      decimalToNumber(withdrawalAggregate._sum.amount) ?? 0;

    // ── 4. Número de cuentas por tipo (metadata útil para UI futura) ──────────
    const accountCounts = await prisma.account.groupBy({
      by: ["type"],
      where: { userId },
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const row of accountCounts) {
      counts[row.type] = row._count.id;
    }

    logger.debug(
      `[wallet/summary] ✅ userId: ${userId} — capital: ${totalCapital}, pendingWithdrawals: ${totalPendingWithdrawals}`
    );

    return NextResponse.json({
      totalCapital,
      totalPendingWithdrawals,
      accountCounts: {
        savings: counts["SAVINGS"] ?? 0,
        investment: counts["INVESTMENT"] ?? 0,
        total: (counts["SAVINGS"] ?? 0) + (counts["INVESTMENT"] ?? 0),
      },
    });
  } catch (error) {
    logger.error("[wallet/summary] ❌ Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el resumen financiero" },
      { status: 500 }
    );
  }
}

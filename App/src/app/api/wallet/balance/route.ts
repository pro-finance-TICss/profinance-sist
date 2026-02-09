// ============================================================================
// API ROUTE: GET WALLET BALANCE - PRO-FINANCE
// ============================================================================
// Obtiene el balance actual del usuario autenticado.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";

/**
 * GET /api/wallet/balance
 * Retorna el balance del usuario (investedCapital).
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener datos del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        investedCapital: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // 3. Obtener retiros pendientes (SUMA)
    const pendingWithdrawalsSum = await prisma.withdrawalRequest.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId: session.user.id,
        status: "PENDING",
      },
    });

    // 4. Obtener resumen de transacciones recientes (últimas 5)
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    const pendingWithdrawals = pendingWithdrawalsSum._sum.amount 
      ? decimalToNumber(pendingWithdrawalsSum._sum.amount) 
      : 0;

    // 5. Convertir Decimals a números
    const balance = {
      investedCapital: decimalToNumber(user.investedCapital),
      pendingWithdrawals,
    };

    const transactions = recentTransactions.map((tx) => ({
      ...tx,
      amount: decimalToNumber(tx.amount),
    }));

    return NextResponse.json({
      balance,
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error("❌ Error obteniendo balance:", error);
    return NextResponse.json(
      { error: "Error al obtener balance" },
      { status: 500 }
    );
  }
}

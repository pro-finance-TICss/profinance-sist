// ============================================================================
// API ROUTE: OBTENER BALANCE DE BILLETERA - PRO-FINANCE
// ============================================================================
// Obtiene el balance actual de una cuenta ("cajita") del usuario autenticado.
// Recibe accountId como query param para saber qué cuenta consultar.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * GET /api/wallet/balance?accountId=xxx
 * Retorna el balance de una cuenta específica del usuario.
 * Si no se proporciona accountId, usa la primera cuenta del usuario.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener accountId del query string
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    // 3. Buscar la cuenta (por id o la primera del usuario)
    let account;
    if (accountId) {
      account = await prisma.account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id, // Seguridad: solo cuentas propias
        },
        select: { id: true, investedCapital: true },
      });
    } else {
      // Fallback: primera cuenta del usuario
      account = await prisma.account.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true, investedCapital: true },
      });
    }

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // 4. Obtener retiros pendientes para esta cuenta
    const pendingWithdrawalsSum = await prisma.withdrawalRequest.aggregate({
      _sum: { amount: true },
      where: {
        userId: session.user.id,
        accountId: account.id,
        status: "PENDING",
      },
    });

    // 5. Obtener transacciones recientes de esta cuenta (últimas 5)
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        accountId: account.id,
      },
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

    // 6. Convertir Decimals a números para el frontend
    const balance = {
      investedCapital: decimalToNumber(account.investedCapital),
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
    logger.error("❌ Error obteniendo balance:", error);
    return NextResponse.json(
      { error: "Error al obtener balance" },
      { status: 500 }
    );
  }
}

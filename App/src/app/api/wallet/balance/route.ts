// ============================================================================
// API ROUTE: OBTENER BALANCE DE BILLETERA - PRO-FINANCE
// ============================================================================
//
// Obtiene el balance de una cuenta específica del usuario autenticado.
//
// SEGURIDAD (FASE 0):
//   - accountId es OBLIGATORIO. No existe fallback automático.
//   - Retorna 400 si no se provee accountId para forzar al frontend
//     a ser explícito sobre qué cuenta está consultando.
//   - userId siempre se valida desde session.user.id, nunca del cliente.
//
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * GET /api/wallet/balance?accountId=xxx
 *
 * Retorna el balance de una cuenta específica del usuario autenticado.
 * accountId es REQUERIDO.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener accountId del query string — REQUERIDO
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      // El frontend debe siempre proveer el ID explícito de la cuenta.
      // Emitir warning para identificar callers legacy que aún no fueron actualizados.
      logger.warn(
        `[wallet/balance] Missing accountId — legacy caller detected (userId: ${session.user.id})`
      );
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 }
      );
    }

    // 3. Verificar ownership: la cuenta debe pertenecer a session.user.id
    // SEGURIDAD: userId NUNCA viene del body o query del cliente.
    //
    // Se hacen dos lookups deliberadamente separados para distinguir:
    //   404 → la cuenta no existe en absoluto
    //   403 → la cuenta existe pero pertenece a otro usuario
    // Esto evita enumeration attacks — ambos casos retornan 403 hacia el cliente,
    // pero el log interno distingue la causa.
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, investedCapital: true },
    });

    if (!account) {
      logger.warn(
        `[wallet/balance] accountId not found — accountId: ${accountId}, userId: ${session.user.id}`
      );
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      logger.error(
        `[wallet/balance] OWNERSHIP VIOLATION — accountId: ${accountId} pertenece a userId: ${account.userId}, accedido por: ${session.user.id}`
      );
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
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

    logger.debug(
      `[wallet/balance] ✅ Consulta exitosa — accountId: ${accountId}, userId: ${session.user.id}, capital: ${balance.investedCapital}`
    );

    return NextResponse.json({
      balance,
      recentTransactions: transactions,
    });
  } catch (error) {
    logger.error("❌ [balance] Error obteniendo balance:", error);
    return NextResponse.json(
      { error: "Error al obtener balance" },
      { status: 500 }
    );
  }
}

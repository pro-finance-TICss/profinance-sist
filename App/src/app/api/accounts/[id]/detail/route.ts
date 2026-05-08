// ============================================================================
// API ROUTE: DETALLE DE CUENTA — PRO-FINANCE
// ============================================================================
// GET /api/accounts/[id]/detail
//
// Devuelve el detalle completo de una cuenta específica del usuario autenticado:
// información de la cuenta, balance actual y últimas transacciones.
//
// SEGURIDAD:
//   - userId siempre proviene de session.user.id. NUNCA del request.
//   - Se valida ownership: la cuenta DEBE pertenecer al usuario autenticado.
//   - 404 si la cuenta no existe.
//   - 403 si la cuenta existe pero no pertenece al usuario.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 1. Autenticación ──────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id;
    // Next.js 15: params es una Promise — debe awaitearse antes de acceder a .id
    const { id: accountId } = await params;

    if (!accountId) {
      return NextResponse.json(
        { error: "ID de cuenta requerido" },
        { status: 400 }
      );
    }

    // ── 2. Verificar existencia ───────────────────────────────────────────────
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        type: true,
        role: true,
        userId: true,
        investedCapital: true,
        withdrawalLimitByDate: true,
        isDefaultReward: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }

    // ── 3. Verificar ownership ────────────────────────────────────────────────
    // Separado del findUnique para distinguir 404 (no existe) de 403 (no autorizado)
    if (account.userId !== userId) {
      logger.warn(
        `[accounts/detail] 🚫 Acceso denegado — userId: ${userId} intentó acceder a cuenta: ${accountId} (propietario: ${account.userId})`
      );
      return NextResponse.json(
        { error: "No tienes permiso para ver esta cuenta" },
        { status: 403 }
      );
    }

    // ── 4. Últimas 20 transacciones de esta cuenta ────────────────────────────
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        paymentId: true,
        createdAt: true,
      },
    });

    // ── 5. Serializar Decimals → Number (Next.js no puede serializar Decimal) ─
    const serializedTransactions = transactions.map((tx) => ({
      ...tx,
      amount: decimalToNumber(tx.amount),
      createdAt: tx.createdAt.toISOString(),
    }));

    logger.debug(
      `[accounts/detail] ✅ accountId: ${accountId}, userId: ${userId}, ` +
      `type: ${account.type}, capital: ${decimalToNumber(account.investedCapital)}`
    );

    return NextResponse.json({
      id: account.id,
      name: account.name,
      type: account.type,
      role: account.role,
      userId: account.userId,
      investedCapital: decimalToNumber(account.investedCapital),
      withdrawalLimitByDate: account.withdrawalLimitByDate
        ? decimalToNumber(account.withdrawalLimitByDate)
        : null,
      isDefaultReward: account.isDefaultReward,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      recentTransactions: serializedTransactions,
    });
  } catch (error) {
    logger.error("[accounts/detail] ❌ Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el detalle de la cuenta" },
      { status: 500 }
    );
  }
}

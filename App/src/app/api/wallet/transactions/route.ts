// ============================================================================
// API ROUTE: GET TRANSACTION HISTORY - PRO-FINANCE
// ============================================================================
// Obtiene el historial de transacciones del usuario con paginación.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * GET /api/wallet/transactions
 * Retorna el historial de transacciones del usuario.
 * Query params: page (default: 1), limit (default: 10), type (optional)
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const type = searchParams.get("type"); // DEPOSIT | WITHDRAWAL | null

    // 3. Construir filtros
    const where: any = {
      userId: session.user.id,
    };

    if (type && (type === "DEPOSIT" || type === "WITHDRAWAL")) {
      where.type = type;
    }

    // 4. Obtener transacciones con paginación
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          status: true,
          createdAt: true,
          account: {
            select: {
              type: true
            }
          }
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    // 5. Convertir Decimals a números
    const formattedTransactions = transactions.map((tx) => ({
      ...tx,
      amount: decimalToNumber(tx.amount),
    }));

    // 6. Calcular metadata de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    logger.error("❌ Error obteniendo transacciones:", error);
    return NextResponse.json(
      { error: "Error al obtener transacciones" },
      { status: 500 }
    );
  }
}

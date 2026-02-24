// ============================================================================
// API ROUTE: CUENTAS FINANCIERAS ("CAJITAS") - PRO-FINANCE
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

// 🔥 Tipo fuerte basado en el select que estamos usando
type Account = Prisma.AccountGetPayload<{
  select: {
    id: true;
    name: true;
    userId: true;
    role: true;
    investedCapital: true;
    withdrawalLimitByDate: true;
    createdAt: true;
  };
}>;

// ============================================================================
// GET /api/accounts
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const accounts: Account[] = await prisma.account.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        userId: true,
        role: true,
        investedCapital: true,
        withdrawalLimitByDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const serialized = accounts.map((acc: Account) => ({
      id: acc.id,
      name: acc.name,
      userId: acc.userId,
      role: acc.role,
      investedCapital: decimalToNumber(acc.investedCapital),
      withdrawalLimitByDate: acc.withdrawalLimitByDate
        ? decimalToNumber(acc.withdrawalLimitByDate)
        : null,
      createdAt: acc.createdAt.toISOString(),
    }));

    return NextResponse.json(serialized);
  } catch (error) {
    logger.error("❌ Error obteniendo cuentas:", error);
    return NextResponse.json(
      { error: "Error al obtener cuentas" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/accounts
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "El nombre de la cuenta debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: "El nombre de la cuenta no puede exceder 50 caracteres" },
        { status: 400 }
      );
    }

    const existingCount = await prisma.account.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Has alcanzado el límite máximo de 10 cuentas" },
        { status: 400 }
      );
    }

    if (existingCount >= 1) {
      const hasValidInvestment = await prisma.transaction.findFirst({
        where: {
          userId: session.user.id,
          type: "DEPOSIT",
          status: "COMPLETED",
        },
        select: { id: true },
      });

      if (!hasValidInvestment) {
        return NextResponse.json(
          {
            error:
              "Debes realizar tu primera inversión antes de crear más cajitas",
            code: "FIRST_INVESTMENT_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const duplicate = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        name: name,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Ya tienes una cuenta con ese nombre" },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        userId: session.user.id,
        name,
        role: "USER",
        investedCapital: 0,
      },
    });

    logger.debug(
      `✅ Nueva cajita creada: "${account.name}" para usuario ${session.user.id}`
    );

    return NextResponse.json(
      {
        id: account.id,
        name: account.name,
        userId: account.userId,
        role: account.role,
        investedCapital: 0,
        withdrawalLimitByDate: null,
        createdAt: account.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("❌ Error creando cuenta:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}

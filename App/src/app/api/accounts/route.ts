// ============================================================================
// API ROUTE: CUENTAS FINANCIERAS ("CAJITAS") - PRO-FINANCE
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

// ============================================================================
// GET /api/accounts
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });

    const serialized = accounts.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      userId: acc.userId,
      type: acc.type ?? "SAVINGS",
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

    // ── FUENTE DE VERDAD: obtener user.role desde DB ──────────────────────────
    // NUNCA usar session.user.role para asignar account.role — puede estar
    // desactualizado si el SUPER_ADMIN cambió el rol sin que el usuario
    // cerrara sesión. Se consulta directamente la DB.
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Las cuentas solo tienen roles USER o SOCIO (los roles de backoffice no aplican)
    const accountRole = (dbUser.role === "SOCIO") ? "SOCIO" : "USER";

    // Verificar si ya existe una cuenta de Ahorros (solo puede haber 1 por usuario)
    const existingSavings = await prisma.account.findFirst({
      where: { userId: session.user.id, type: "SAVINGS" },
    });

    if (!existingSavings) {
      // Esta situación no debería ocurrir (el usuario nace con 1 cuenta de Ahorros),
      // pero por seguridad lo manejamos creando la cuenta de Ahorros.
      const account = await prisma.account.create({
        data: {
          userId: session.user.id,
          name,
          type: "SAVINGS",
          role: accountRole, // ← sincronizado con user.role
          investedCapital: 0,
        },
      });

      // Protección defensiva: garantizar que todas las cuentas del usuario
      // estén sincronizadas con user.role (por si quedaron desincronizadas)
      await prisma.account.updateMany({
        where: { userId: session.user.id },
        data: { role: accountRole },
      });

      logger.debug(
        `✅ Nueva cuenta de Ahorro creada: "${account.name}" para usuario ${session.user.id} con role: ${accountRole}`
      );

      return NextResponse.json(
        {
          id: account.id,
          name: account.name,
          userId: account.userId,
          type: account.type ?? "SAVINGS",
          role: account.role,
          investedCapital: 0,
          withdrawalLimitByDate: null,
          createdAt: account.createdAt.toISOString(),
        },
        { status: 201 }
      );
    }

    // El usuario ya tiene cuenta de Ahorros → la nueva cuenta es de INVERSIÓN
    const existingInvestmentCount = await prisma.account.count({
      where: { userId: session.user.id, type: "INVESTMENT" },
    });

    if (existingInvestmentCount >= 9) {
      return NextResponse.json(
        { error: "Has alcanzado el límite máximo de 9 cuentas de inversión" },
        { status: 400 }
      );
    }

    const duplicate = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        name,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Ya tienes una cuenta con ese nombre" },
        { status: 400 }
      );
    }

    // Nueva cuenta → siempre es de Inversión (INVESTMENT)
    const account = await prisma.account.create({
      data: {
        userId: session.user.id,
        name,
        type: "INVESTMENT",
        role: accountRole, // ← sincronizado con user.role
        investedCapital: 0,
      },
    });

    // Protección defensiva: sincronizar TODAS las cuentas del usuario al role correcto.
    // Esto corrige cualquier cuenta que pudiera haberse quedado con role incorrecto.
    await prisma.account.updateMany({
      where: { userId: session.user.id },
      data: { role: accountRole },
    });

    logger.debug(
      `✅ Nueva cuenta de Inversión creada: "${account.name}" para usuario ${session.user.id} con role: ${accountRole}`
    );

    return NextResponse.json(
      {
        id: account.id,
        name: account.name,
        userId: account.userId,
        type: account.type ?? "INVESTMENT",
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


// ============================================================================
// API ROUTE: CUENTAS FINANCIERAS ("CAJITAS") - PRO-FINANCE
// ============================================================================
// RESPONSABILIDAD:
// Gestionar las cuentas financieras del usuario autenticado.
// Cada usuario puede tener múltiples "cajitas" con su propio balance.
//
// ENDPOINTS:
// - GET  /api/accounts → Lista las cuentas del usuario
// - POST /api/accounts → Crea una nueva cuenta con nombre personalizado
//
// SEGURIDAD:
// - Requiere autenticación vía sesión
// - Cada usuario solo ve/crea sus propias cuentas
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

// ============================================================================
// GET /api/accounts — Listar cuentas del usuario autenticado
// ============================================================================

/**
 * Retorna las cuentas financieras ("cajitas") del usuario.
 * Cada cuenta incluye su balance real desde la DB.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Obtener cuentas reales desde la DB
    const accounts = await prisma.account.findMany({
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

    // 3. Transformar Decimal de Prisma a Number para el frontend
    const serialized = accounts.map((acc) => ({
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
// POST /api/accounts — Crear nueva cuenta ("cajita")
// ============================================================================

/**
 * Crea una nueva cuenta financiera para el usuario autenticado.
 * El nombre es definido por el usuario. El rol default es "USER".
 * Solo SUPER_ADMIN puede asignar roles diferentes (vía endpoint separado).
 *
 * Body esperado: { name: string }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // 2. Parsear y validar body
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

    // 3. Verificar límite de cuentas por usuario (máximo 10)
    const existingCount = await prisma.account.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Has alcanzado el límite máximo de 10 cuentas" },
        { status: 400 }
      );
    }

    // 4. Verificar nombre duplicado para el mismo usuario
    const duplicate = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        name: { equals: name },
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "Ya tienes una cuenta con ese nombre" },
        { status: 400 }
      );
    }

    // 5. Crear la cuenta con balance inicial de 0
    const account = await prisma.account.create({
      data: {
        userId: session.user.id,
        name,
        role: "USER", // Solo SUPER_ADMIN puede cambiar esto
        investedCapital: 0,
      },
    });

    logger.debug(
      `✅ Nueva cajita creada: "${account.name}" para usuario ${session.user.id}`
    );

    return NextResponse.json({
      id: account.id,
      name: account.name,
      userId: account.userId,
      role: account.role,
      investedCapital: 0,
      withdrawalLimitByDate: null,
      createdAt: account.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error) {
    logger.error("❌ Error creando cuenta:", error);
    return NextResponse.json(
      { error: "Error al crear la cuenta" },
      { status: 500 }
    );
  }
}
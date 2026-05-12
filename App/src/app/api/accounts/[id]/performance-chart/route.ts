// ============================================================================
// API ROUTE: GRÁFICO DE RENDIMIENTO POR CUENTA — PRO-FINANCE
// ============================================================================
// GET /api/accounts/[id]/performance-chart
//
// Query params:
//   timeframe: DAY | WEEK | MONTH  (default: MONTH)
//   mode:      PERCENTAGE | AMOUNT (default: PERCENTAGE)
//
// Estrategia de datos:
//   1. Prioridad: AccountPerformanceSnapshot (datos históricos exactos por cuenta)
//   2. Fallback:  Performance global (mientras no hay snapshots aún)
//
// REGLA DE ORO:
//   - percentageRaw NUNCA se envía al cliente.
//   - El usuario ve SIEMPRE: userPercentage = percentageRaw * 0.5
//   - TODO cálculo ocurre en backend.
//
// SEGURIDAD:
//   - userId siempre de session.user.id. NUNCA del request.
//   - Ownership validado antes de leer cualquier dato financiero.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

// ── Tipos de respuesta ────────────────────────────────────────────────────────

type TimeFrame = "DAY" | "WEEK" | "MONTH" | "ALL";
type ChartMode = "PERCENTAGE" | "AMOUNT";

interface ChartPoint {
  period: string;         // ISO date string "2026-01-01"
  percentage: number;     // userPercentage = raw * 0.5  (siempre reducido)
  amount: number;         // gainAmount en moneda de la cuenta
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

// ── Límite de tiempo según timeframe ────────────────────────────────────────────

function getCutoffDate(timeframe: TimeFrame): Date | null {
  const now = new Date();
  switch (timeframe) {
    case "ALL":   return null; // sin límite — retorna todo el historial
    case "DAY":   return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "WEEK":  return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "MONTH":
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(
  req: NextRequest,
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

    // ── 2. Parseo de query params ─────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const rawTimeframe = (searchParams.get("timeframe") ?? "MONTH").toUpperCase();
    const rawMode = (searchParams.get("mode") ?? "PERCENTAGE").toUpperCase();

    const timeframe: TimeFrame = ["DAY", "WEEK", "MONTH", "ALL"].includes(rawTimeframe)
      ? (rawTimeframe as TimeFrame)
      : "MONTH";
    const _mode: ChartMode = ["PERCENTAGE", "AMOUNT"].includes(rawMode)
      ? (rawMode as ChartMode)
      : "PERCENTAGE";

    const cutoff = getCutoffDate(timeframe); // null si ALL

    // ── 3. Verificar existencia y ownership de la cuenta ────────────────────────
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, userId: true, type: true, role: true, isHighRisk: true, investedCapital: true },
    });

    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    if (account.userId !== userId) {
      logger.warn(
        `[performance-chart] 🚫 Acceso denegado — userId: ${userId}, accountId: ${accountId}`
      );
      return NextResponse.json(
        { error: "No tienes permiso para ver esta cuenta" },
        { status: 403 }
      );
    }

    // Solo las cuentas INVESTMENT tienen rendimientos
    if (account.type !== "INVESTMENT") {
      return NextResponse.json({
        accountId,
        timeframe,
        source: "none",
        data: [],
        meta: { message: "Las cuentas de Ahorro no tienen rendimientos" },
      });
    }

    // ── 4. Intentar obtener datos desde AccountPerformanceSnapshot (Fase 1) ───
    const snapshots = await prisma.accountPerformanceSnapshot.findMany({
      where: {
        accountId,
        ...(cutoff ? { periodStart: { gte: cutoff } } : {}),
      },
      orderBy: { periodStart: "asc" },
      select: {
        periodStart: true,
        periodEnd: true,
        percentageRaw: true,
        capitalBase: true,
        gainAmount: true,
      },
    });

    /*
    if (snapshots.length > 0) {
      // ── Camino principal: snapshots exactos por cuenta ────────────────────
      const data: ChartPoint[] = snapshots.map((snap) => {
        const gainAmount = decimalToNumber(snap.gainAmount);
        // REGLA: userPercentage = percentageRaw * 0.5 — percentageRaw NO se expone
        const userPercentage = decimalToNumber(snap.percentageRaw) * 0.5;

        // Ajuste a zona horaria Colombia (UTC-5) para agrupar en el día correcto
        const localDate = new Date(snap.periodStart.getTime() - 5 * 60 * 60 * 1000);

        return {
          period: localDate.toISOString().split("T")[0],
          percentage: userPercentage,
          amount: gainAmount,
          type: gainAmount > 0 ? "GAIN" : gainAmount < 0 ? "LOSS" : "NEUTRAL",
        };
      });

      logger.debug(
        `[performance-chart] ✅ Snapshots — accountId: ${accountId}, puntos: ${data.length}, timeframe: ${timeframe}`
      );

      return NextResponse.json({
        accountId,
        timeframe,
        source: "snapshots",
        data,
        meta: { totalPoints: data.length, investedCapital: decimalToNumber(account?.investedCapital) },
      });
    }
    */

    // ── 5. Fallback: Performance global (mientras no hay snapshots) ───────────────
    // isHighRisk de la cuenta determina el targetRole exclusivo:
    //   isHighRisk=false → targetRole USER
    //   isHighRisk=true  → targetRole SOCIO
    const targetRoleFilter = account.isHighRisk ? "SOCIO" : "USER";

    const performances = await prisma.performance.findMany({
      where: {
        status: "COMPLETED",
        ...(cutoff ? { startDate: { gte: cutoff } } : {}),
        targetRole: targetRoleFilter,
      },
      orderBy: { startDate: "asc" },
      select: { id: true, startDate: true, endDate: true, percentage: true },
    });

    if (performances.length === 0) {
      return NextResponse.json({
        accountId,
        timeframe,
        source: "fallback",
        data: [],
        meta: { message: "Sin datos de rendimiento para este periodo" },
      });
    }

    const capitalBase = decimalToNumber(account.investedCapital);

    const data: ChartPoint[] = performances
      .filter((p) => p.percentage !== null)
      .map((p) => {
        const rawPercentage = decimalToNumber(p.percentage!);
        // REGLA: userPercentage = raw * 0.5 — el raw NO se expone al cliente
        const userPercentage = rawPercentage * 0.5;
        const estimatedGain = capitalBase * (userPercentage / 100);

        // Ajuste a zona horaria Colombia (UTC-5)
        const localDate = new Date(p.startDate.getTime() - 5 * 60 * 60 * 1000);

        return {
          period: localDate.toISOString().split("T")[0],
          percentage: userPercentage,
          amount: estimatedGain,
          type: estimatedGain > 0 ? "GAIN" : estimatedGain < 0 ? "LOSS" : "NEUTRAL",
        };
      });

    logger.debug(
      `[performance-chart] ✅ Fallback Performance — accountId: ${accountId}, puntos: ${data.length}, timeframe: ${timeframe}`
    );

    return NextResponse.json({
      accountId,
      timeframe,
      source: "fallback",
      data,
      meta: {
        totalPoints: data.length,
        investedCapital: capitalBase,
        note: "Datos estimados basados en Performance global. Se usarán snapshots exactos una vez aplicados.",
      },
    });
  } catch (error) {
    logger.error("[performance-chart] ❌ Error:", error);
    return NextResponse.json(
      { error: "Error al obtener datos de rendimiento" },
      { status: 500 }
    );
  }
}

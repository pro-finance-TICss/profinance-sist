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
  capitalBase: number;    // capital al inicio de este evento (para reconstruir la curva)
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
        source: true,
      },
    });

    // ── 4. Snapshots (Fase 1): solo si existen datos HISTORICAL cargados via Wizard ──
    // Los snapshots SYSTEM tienen datos mezclados de pruebas; solo confiamos en
    // los snapshots HISTORICAL que el superadmin ha cargado limpiamente.
    const historicalCount = snapshots.filter((s) => s.source === "HISTORICAL").length;

    if (historicalCount > 0) {
      // ── snapshotData: snapshots históricos agrupados por día (para gráfica $) ──
      const grouped = new Map<string, { percentage: number; amount: number; capitalBase: number }>();

      for (const snap of snapshots) {
        const gainAmount = decimalToNumber(snap.gainAmount);
        const capitalBase = decimalToNumber(snap.capitalBase);
        const userPercentage = decimalToNumber(snap.percentageRaw) * 0.5;
        const localDate = new Date(snap.periodStart.getTime() - 5 * 60 * 60 * 1000);
        const key = localDate.toISOString().split("T")[0];

        const prev = grouped.get(key) ?? { percentage: 0, amount: 0, capitalBase };
        grouped.set(key, {
          percentage: prev.percentage + userPercentage,
          amount: prev.amount + gainAmount,
          capitalBase: prev.amount === 0 && prev.percentage === 0 ? capitalBase : prev.capitalBase,
        });
      }

      const snapshotData: ChartPoint[] = Array.from(grouped.entries()).map(([period, v]) => ({
        period,
        percentage: v.percentage,
        amount: v.amount,
        capitalBase: v.capitalBase,
        type: v.amount > 0 ? "GAIN" : v.amount < 0 ? "LOSS" : "NEUTRAL",
      }));

      // ── data: performances individuales COMPLETED (para gráfica % — misma fuente que la tabla) ──
      const targetRoleFilter = account.isHighRisk ? "SOCIO" : "USER";
      const perfRecords = await prisma.performance.findMany({
        where: {
          status: { in: ["COMPLETED", "COMPLETED_HISTORICAL"] },
          targetRole: targetRoleFilter,
          ...(cutoff ? { startDate: { gte: cutoff } } : {}),
        },
        orderBy: { startDate: "asc" },
        select: { id: true, startDate: true, percentage: true },
      });

      const capitalBase = decimalToNumber(account.investedCapital);
      const data: ChartPoint[] = perfRecords
        .filter((p) => p.percentage !== null)
        .map((p) => {
          const userPercentage = decimalToNumber(p.percentage!) * 0.5;
          const localDate = new Date(p.startDate.getTime() - 5 * 60 * 60 * 1000);
          return {
            period: localDate.toISOString().split("T")[0],
            percentage: userPercentage,
            amount: capitalBase * (userPercentage / 100),
            capitalBase,
            type: userPercentage > 0 ? "GAIN" as const : userPercentage < 0 ? "LOSS" as const : "NEUTRAL" as const,
          };
        });

      logger.debug(
        `[performance-chart] ✅ Snapshots HISTORICAL — accountId: ${accountId}, snapshotPts: ${snapshotData.length}, perfPts: ${data.length}`
      );

      return NextResponse.json({
        accountId,
        timeframe,
        source: "snapshots",
        data,           // Performances individuales → gráfica %
        snapshotData,   // Snapshots históricos   → gráfica $
        meta: { totalPoints: snapshotData.length, investedCapital: decimalToNumber(account.investedCapital) },
      });
    }

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
          capitalBase,   // mismo capital base para todos (fallback sin historial)
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

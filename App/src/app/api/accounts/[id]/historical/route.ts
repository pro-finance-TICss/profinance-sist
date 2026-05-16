// ============================================================================
// API ROUTE: PREFILL DE CARGA HISTÓRICA — PRO-FINANCE
// ============================================================================
// GET /api/accounts/[id]/historical?from=YYYY-MM
//
// Exclusivo de SUPER_ADMIN. Genera el listado de meses desde la fecha de inicio
// indicada hasta el mes actual, pre-rellenando cada mes con:
//   - Los rendimientos globales (Performance COMPLETED) del targetRole de la cuenta
//   - El capital sugerido acumulado mes a mes (con los % aplicados)
//   - El monto ganado/perdido sugerido
//
// El frontend usa este prefill como punto de partida para el Wizard de
// Carga Histórica, donde el superadmin puede ajustar capital y % libremente.
//
// SEGURIDAD:
//   - Solo SUPER_ADMIN puede acceder.
//   - Se valida que la cuenta exista y sea de tipo INVESTMENT.
//   - percentageRaw NUNCA se expone — solo userPercentage = raw * 0.5.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";
import { UserRole } from "@/lib/enums";

// ── Tipos de respuesta ────────────────────────────────────────────────────────

interface PerformanceEntry {
  performanceId: string;
  label: string;          // "USD / EUR · COMPRA"
  userPercentage: number; // raw * 0.5 — lo que ve el usuario
  date: string;           // "YYYY-MM-DD"
}

interface MonthPrefill {
  month: string;                  // "YYYY-MM"
  periodStart: string;            // "YYYY-MM-01"
  periodEnd: string;              // "YYYY-MM-DD" (último día del mes)
  performances: PerformanceEntry[]; // rendimientos globales del mes
  totalUserPercentage: number;    // suma de userPercentage del mes
  suggestedCapitalBase: number;   // capital al inicio del mes
  suggestedGainAmount: number;    // capitalBase * totalPercentage / 100
  suggestedCapitalEnd: number;    // capital al final del mes (base + ganancia)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna el último día del mes como Date */
function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0); // month=1 → último día de enero, etc.
}

/** Formato YYYY-MM-DD ajustado a UTC (sin desfase) */
function toLocalDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Mes siguiente como { year, month } */
function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// ── Handler GET ───────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 1. Autenticación y autorización (solo SUPER_ADMIN) ──────────────────
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // ── 2. Parámetros ────────────────────────────────────────────────────────
    const { id: accountId } = await params;
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from"); // "YYYY-MM"

    if (!fromParam || !/^\d{4}-\d{2}$/.test(fromParam)) {
      return NextResponse.json(
        { error: "Parámetro 'from' requerido en formato YYYY-MM (ej: 2025-01)" },
        { status: 400 }
      );
    }

    // ── 3. Verificar cuenta ──────────────────────────────────────────────────
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        type: true,
        isHighRisk: true,
        investedCapital: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    if (account.type !== "INVESTMENT") {
      return NextResponse.json(
        { error: "Solo se puede cargar historial en cuentas de Inversión" },
        { status: 400 }
      );
    }

    // ── 4. Rango de meses: from → mes actual ─────────────────────────────────
    const [fromYear, fromMonthRaw] = fromParam.split("-").map(Number);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (
      fromYear > currentYear ||
      (fromYear === currentYear && fromMonthRaw > currentMonth)
    ) {
      return NextResponse.json(
        { error: "La fecha de inicio no puede ser futura" },
        { status: 400 }
      );
    }

    // ── 5. Cargar todos los Performance COMPLETED del rango ──────────────────
    // Filtramos por el targetRole que corresponde a la cuenta
    const targetRole = account.isHighRisk ? "SOCIO" : "USER";

    const rangeStart = new Date(fromYear, fromMonthRaw - 1, 1); // 1er día del mes inicio

    const allPerformances = await prisma.performance.findMany({
      where: {
        status: { in: ["COMPLETED", "COMPLETED_HISTORICAL"] },
        targetRole,
        startDate: { gte: rangeStart },
      },
      orderBy: { startDate: "asc" },
      select: {
        id: true,
        currency1: true,
        currency2: true,
        type: true,
        percentage: true,
        startDate: true,
      },
    });

    // ── 6. Agrupar Performance por mes "YYYY-MM" ─────────────────────────────
    const perfByMonth = new Map<string, PerformanceEntry[]>();

    for (const perf of allPerformances) {
      if (perf.percentage === null) continue;

      // Ajuste a Colombia UTC-5 para clasificar en el día correcto
      const localDate = new Date(perf.startDate.getTime() - 5 * 60 * 60 * 1000);
      const monthKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}`;

      const rawPct = decimalToNumber(perf.percentage);
      const userPct = rawPct * 0.5; // REGLA: usuario ve la mitad

      const entry: PerformanceEntry = {
        performanceId: perf.id,
        label: `${perf.currency1} / ${perf.currency2} · ${perf.type}`,
        userPercentage: userPct,
        date: toLocalDateStr(localDate),
      };

      if (!perfByMonth.has(monthKey)) {
        perfByMonth.set(monthKey, []);
      }
      perfByMonth.get(monthKey)!.push(entry);
    }

    // ── 7. Construir el array de meses con capital acumulado ─────────────────
    // El capital de inicio del primer mes es el capital actual de la cuenta.
    // Si el superadmin lo ajusta en el Wizard, se recalculará en frontend.
    let runningCapital = decimalToNumber(account.investedCapital);
    const months: MonthPrefill[] = [];

    let year = fromYear;
    let month = fromMonthRaw;

    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const periodStartDate = new Date(year, month - 1, 1);
      const periodEndDate = lastDayOfMonth(year, month);

      const performances = perfByMonth.get(monthKey) ?? [];
      const totalUserPercentage = performances.reduce(
        (sum, p) => sum + p.userPercentage,
        0
      );
      const suggestedGainAmount = runningCapital * (totalUserPercentage / 100);
      const suggestedCapitalEnd = runningCapital + suggestedGainAmount;

      months.push({
        month: monthKey,
        periodStart: toLocalDateStr(periodStartDate),
        periodEnd: toLocalDateStr(periodEndDate),
        performances,
        totalUserPercentage,
        suggestedCapitalBase: runningCapital,
        suggestedGainAmount,
        suggestedCapitalEnd,
      });

      // El capital del siguiente mes parte del final de este
      runningCapital = suggestedCapitalEnd;

      const n = nextMonth(year, month);
      year = n.year;
      month = n.month;
    }

    logger.debug(
      `[historical] ✅ Prefill generado — accountId: ${accountId}, meses: ${months.length}, targetRole: ${targetRole}`
    );

    return NextResponse.json({
      accountId,
      accountName: account.name,
      targetRole,
      fromMonth: fromParam,
      totalMonths: months.length,
      currentCapital: decimalToNumber(account.investedCapital),
      months,
    });
  } catch (error) {
    logger.error("[historical] ❌ Error al generar prefill:", error);
    return NextResponse.json(
      { error: "Error al generar los datos de prefill" },
      { status: 500 }
    );
  }
}

// ============================================================================
// API ROUTE: PREFILL DE CARGA HISTÓRICA — PRO-FINANCE (MODELO POR CICLOS)
// ============================================================================
// GET /api/accounts/[id]/historical?from=YYYY-MM
//
// Genera meses desde la fecha indicada hasta el mes actual, agrupados por
// CICLOS DE INVERSIÓN (no acumulación mes a mes).
//
// REGLAS DE CICLO:
//   Ciclo 1 : 6 enero  → 31 marzo
//   Ciclo 2 : 6 abril  → 30 junio
//   Ciclo 3 : 6 julio  → 30 septiembre
//   Ciclo 4 : 6 octubre → 30 noviembre
//   Sin ciclo: 1–5 abr, 1–5 jul, 1–5 oct, todo dic, 1–5 ene
//
// MODELO DE CÁLCULO:
//   - El capitalBase de todos los meses de un ciclo = capital al INICIO del ciclo
//   - El % del mes se acumula (interés simple por ciclo)
//   - La ganancia final del ciclo = capitalBase × (suma de %) / 100
//   - El capitalBase del siguiente ciclo = capitalBase + ganancia acumulada del ciclo anterior
//
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
  label: string;
  userPercentage: number;
  date: string;
}

interface MonthPrefill {
  month: string;
  periodStart: string;
  periodEnd: string;
  performances: PerformanceEntry[];
  totalUserPercentage: number;
  suggestedCapitalBase: number; // Capital al INICIO del ciclo (fijo para todos los meses del ciclo)
  suggestedGainAmount: number;  // Ganancia acumulada del ciclo hasta este mes
  suggestedCapitalEnd: number;  // Capital al final del ciclo (si cerrara aquí)
  /** Número del ciclo al que pertenece este mes (null = periodo libre) */
  cycleNumber: number | null;
  /** Etiqueta del ciclo */
  cycleLabel: string | null;
  /** true si es el primer mes del ciclo (resetea el capitalBase) */
  isCycleStart: boolean;
  /** true si es el último mes del ciclo */
  isCycleEnd: boolean;
}

// ── Definición de ciclos ──────────────────────────────────────────────────────

interface CycleDef {
  number: number;
  label: string;
  startMonth: number; // 1-indexed
  startDay: number;
  endMonth: number;
  endDay: number;
}

const CYCLES: CycleDef[] = [
  { number: 1, label: "Ciclo 1 · Ene–Mar", startMonth: 1,  startDay: 6, endMonth: 3,  endDay: 31 },
  { number: 2, label: "Ciclo 2 · Abr–Jun", startMonth: 4,  startDay: 6, endMonth: 6,  endDay: 30 },
  { number: 3, label: "Ciclo 3 · Jul–Sep", startMonth: 7,  startDay: 6, endMonth: 9,  endDay: 30 },
  { number: 4, label: "Ciclo 4 · Oct–Nov", startMonth: 10, startDay: 6, endMonth: 11, endDay: 30 },
];

/** Retorna el ciclo al que pertenece un mes (1-indexed). null = periodo libre. */
function getCycleForMonth(month: number): CycleDef | null {
  return CYCLES.find((c) => month >= c.startMonth && month <= c.endMonth) ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

function toLocalDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// ── Handler GET ───────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── 1. Auth (solo SUPER_ADMIN) ───────────────────────────────────────────
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
    const fromParam = searchParams.get("from");

    if (!fromParam || !/^\d{4}-\d{2}$/.test(fromParam)) {
      return NextResponse.json(
        { error: "Parámetro 'from' requerido en formato YYYY-MM (ej: 2025-01)" },
        { status: 400 }
      );
    }

    // ── 3. Verificar cuenta ──────────────────────────────────────────────────
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, type: true, isHighRisk: true, investedCapital: true },
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

    // ── 4. Rango ─────────────────────────────────────────────────────────────
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

    // ── 5. Cargar todos los Performance del rango ────────────────────────────
    const targetRole = account.isHighRisk ? "SOCIO" : "USER";
    const rangeStart = new Date(fromYear, fromMonthRaw - 1, 1);

    const allPerformances = await prisma.performance.findMany({
      where: {
        status: { in: ["COMPLETED", "COMPLETED_HISTORICAL"] },
        targetRole,
        startDate: { gte: rangeStart },
      },
      orderBy: { startDate: "asc" },
      select: { id: true, currency1: true, currency2: true, type: true, percentage: true, startDate: true },
    });

    // ── 6. Agrupar Performance por mes ───────────────────────────────────────
    const perfByMonth = new Map<string, PerformanceEntry[]>();

    for (const perf of allPerformances) {
      if (perf.percentage === null) continue;
      const localDate = new Date(perf.startDate.getTime() - 5 * 60 * 60 * 1000);
      const monthKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}`;
      const rawPct = decimalToNumber(perf.percentage);
      const userPct = rawPct * 0.5;

      const entry: PerformanceEntry = {
        performanceId: perf.id,
        label: `${perf.currency1} / ${perf.currency2} · ${perf.type}`,
        userPercentage: userPct,
        date: toLocalDateStr(localDate),
      };

      if (!perfByMonth.has(monthKey)) perfByMonth.set(monthKey, []);
      perfByMonth.get(monthKey)!.push(entry);
    }

    // ── 7. Construir meses con modelo de ciclos ───────────────────────────────
    //
    // LÓGICA:
    //   - Llevamos runningCapital = capital que se pasa de ciclo a ciclo
    //   - Dentro de un ciclo, capitalBase NO cambia mes a mes
    //   - acumulatedPct acumula los % del ciclo actual
    //   - Al cambiar de ciclo → runningCapital += runningCapital * acumulatedPct / 100
    //
    let runningCapital = decimalToNumber(account.investedCapital);
    const months: MonthPrefill[] = [];

    let year = fromYear;
    let month = fromMonthRaw;

    // Estado del ciclo actual en el recorrido
    let currentCycle: CycleDef | null = null;
    let cycleCapitalBase = runningCapital;
    let cycleAccumulatedPct = 0;

    while (year < currentYear || (year === currentYear && month <= currentMonth)) {
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const cycle = getCycleForMonth(month);

      const isCycleStart =
        cycle !== null &&
        (currentCycle === null || currentCycle.number !== cycle.number);

      const isCycleEnd =
        currentCycle !== null &&
        cycle !== null &&
        month === currentCycle.endMonth;

      // ── Detectar cambio de ciclo ──────────────────────────────────────────
      if (isCycleStart) {
        // Cerrar el ciclo anterior si lo había: aplicar ganancia acumulada
        if (currentCycle !== null) {
          const cycleGain = cycleCapitalBase * (cycleAccumulatedPct / 100);
          runningCapital = Math.round((cycleCapitalBase + cycleGain) * 100) / 100;
        }
        // Iniciar el nuevo ciclo
        currentCycle = cycle;
        cycleCapitalBase = runningCapital;
        cycleAccumulatedPct = 0;
      } else if (cycle === null && currentCycle !== null) {
        // Salimos de un ciclo → cerrarlo
        const cycleGain = cycleCapitalBase * (cycleAccumulatedPct / 100);
        runningCapital = Math.round((cycleCapitalBase + cycleGain) * 100) / 100;
        currentCycle = null;
        cycleCapitalBase = runningCapital;
        cycleAccumulatedPct = 0;
      }

      const periodStartDate = new Date(year, month - 1, 1);
      const periodEndDate = lastDayOfMonth(year, month);

      const performances = perfByMonth.get(monthKey) ?? [];
      const monthPct = performances.reduce((sum, p) => sum + p.userPercentage, 0);

      // Acumular % dentro del ciclo
      if (cycle !== null) {
        cycleAccumulatedPct = Math.round((cycleAccumulatedPct + monthPct) * 10000) / 10000;
      }

      // Capital base de este mes = capital al inicio del ciclo (no cambia)
      const capitalBase = cycle !== null ? cycleCapitalBase : runningCapital;

      // Ganancia acumulada del ciclo hasta este mes (interés simple)
      const cumulativeGain = Math.round(capitalBase * (cycleAccumulatedPct / 100) * 100) / 100;

      months.push({
        month: monthKey,
        periodStart: toLocalDateStr(periodStartDate),
        periodEnd: toLocalDateStr(periodEndDate),
        performances,
        totalUserPercentage: Math.round(monthPct * 10000) / 10000,
        suggestedCapitalBase: capitalBase,
        suggestedGainAmount: cumulativeGain,
        suggestedCapitalEnd: Math.round((capitalBase + cumulativeGain) * 100) / 100,
        cycleNumber: cycle?.number ?? null,
        cycleLabel: cycle?.label ?? null,
        isCycleStart,
        isCycleEnd: cycle !== null && month === (currentCycle?.endMonth ?? -1),
      });

      const n = nextMonth(year, month);
      year = n.year;
      month = n.month;
    }

    logger.debug(
      `[historical] ✅ Prefill (ciclos) generado — accountId: ${accountId}, meses: ${months.length}, targetRole: ${targetRole}`
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

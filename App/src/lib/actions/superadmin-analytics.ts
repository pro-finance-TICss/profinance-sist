"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { logger } from "@/lib/logger";

// ============================================================================
// ANÁLISIS DE INVERSIONES PARA SUPER ADMIN - PRO-FINANCE
// ============================================================================
// Proporciona datos analíticos de capital invertido por rol (USER/SOCIO)
// con gráficos temporales, resúmenes mensuales y variación diaria %.
// ============================================================================

/** Punto de datos para el gráfico de capital absoluto */
interface ChartDataPoint {
  /** Fecha en formato ISO */
  date: string;
  /** Capital invertido total acumulado en este punto */
  total: number;
}

/** Punto de datos para el gráfico de variación diaria % */
export interface DailyChangePoint {
  /** Fecha del día en ISO (solo fecha) */
  date: string;
  /** Capital total al cierre de ese día */
  total: number;
  /** Variación % respecto al día anterior (null si no hay referencia) */
  changePercent: number | null;
  /** Variación absoluta respecto al día anterior */
  changeAmount: number | null;
  /** GAIN | LOSS | NEUTRAL */
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

/** Resumen mensual de capital invertido */
interface MonthlyTotal {
  /** Mes en formato "2026-01" */
  month: string;
  /** Mes legible: "Enero 2026" */
  displayMonth: string;
  /** Total del capital en el mes */
  total: number;
  /** Cambio porcentual respecto al mes anterior */
  changeFromPrevious: number;
  /** Indica si hubo incremento respecto al mes anterior */
  isIncrease: boolean;
}

/** Datos completos de análisis de inversión */
interface AnalyticsData {
  /** Total actual de capital invertido */
  currentTotal: number;
  /** Datos para el gráfico temporal (capital absoluto) */
  chartData: ChartDataPoint[];
  /** Datos para el gráfico de variación diaria % */
  dailyChanges: DailyChangePoint[];
  /** Resúmenes mensuales con comparación */
  monthlyTotals: MonthlyTotal[];
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene el nombre del mes en español por su índice (0-11).
 */
function getMonthName(monthIndex: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[monthIndex];
}

/**
 * Filtra datos del gráfico según el rango de tiempo seleccionado.
 */
function filterByTimeRange(
  data: ChartDataPoint[],
  timeRange: "1D" | "1W" | "1M" | "ALL"
): ChartDataPoint[] {
  const now = new Date();
  let cutoffDate: Date;

  switch (timeRange) {
    case "1D":
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "1W":
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "1M":
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "ALL":
    default:
      return data;
  }

  return data.filter((point) => new Date(point.date) >= cutoffDate);
}

/**
 * Calcula resúmenes mensuales a partir de los datos del gráfico.
 * Incluye el cambio porcentual respecto al mes anterior.
 */
function calculateMonthlyTotals(data: ChartDataPoint[]): MonthlyTotal[] {
  if (data.length === 0) return [];

  // Group data by month
  const monthlyMap = new Map<string, number>();

  data.forEach((point) => {
    const date = new Date(point.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    
    // Use the latest total for each month (or max if multiple points)
    const existing = monthlyMap.get(monthKey) || 0;
    monthlyMap.set(monthKey, Math.max(existing, point.total));
  });

  // Sort by month (descending - most recent first)
  const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));

  // Calculate month-over-month changes
  const monthlyTotals: MonthlyTotal[] = [];

  sortedMonths.forEach(([monthKey, total], index) => {
    const [year, month] = monthKey.split("-");
    const monthIndex = parseInt(month) - 1;
    const displayMonth = `${getMonthName(monthIndex)} ${year}`;

    let changeFromPrevious = 0;
    let isIncrease = false;

    if (index < sortedMonths.length - 1) {
      const previousTotal = sortedMonths[index + 1][1];
      if (previousTotal > 0) {
        changeFromPrevious = ((total - previousTotal) / previousTotal) * 100;
        isIncrease = changeFromPrevious > 0;
      }
    }

    monthlyTotals.push({
      month: monthKey,
      displayMonth,
      total,
      changeFromPrevious,
      isIncrease,
    });
  });

  return monthlyTotals;
}

function getLocalDayKey(dateString: string): string {
  // Ajuste a GMT-6 para la agrupación diaria y evitar que transacciones de noche pasen a UTC "mañana"
  const date = new Date(dateString);
  const localDate = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

/**
 * Construye una serie de variación diaria % a partir del timeline absoluto.
 * Lógica:
 *   - Se agrupa el timeline en días calendario (usando la última lectura del día)
 *   - Por cada día N, el % de cambio se calcula contra el día N-1
 *   - Si no hay dato del día anterior, changePercent = null
 */
function buildDailyChangeSeries(
  timeline: ChartDataPoint[],
  timeRange: "1D" | "1W" | "1M" | "ALL"
): DailyChangePoint[] {
  if (timeline.length === 0) return [];

  // Agrupar por fecha calendario → tomar la última lectura del día
  const dailyMap = new Map<string, number>();
  timeline.forEach((point) => {
    const dayKey = getLocalDayKey(point.date);
    dailyMap.set(dayKey, point.total); // sobrescribimos → queda la última del día
  });

  // Ordenar días cronológicamente
  const sortedDays = Array.from(dailyMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  // Construir serie de cambio diario
  const result: DailyChangePoint[] = [];

  for (let i = 0; i < sortedDays.length; i++) {
    const [day, total] = sortedDays[i];
    const prevTotal = i > 0 ? sortedDays[i - 1][1] : null;

    let changePercent: number | null = null;
    let changeAmount: number | null = null;
    let type: "GAIN" | "LOSS" | "NEUTRAL" = "NEUTRAL";

    if (prevTotal !== null && prevTotal !== 0) {
      changeAmount = total - prevTotal;
      changePercent = ((total - prevTotal) / prevTotal) * 100;
      type = changePercent > 0 ? "GAIN" : changePercent < 0 ? "LOSS" : "NEUTRAL";
    } else if (prevTotal !== null) {
      // prevTotal === 0
      changeAmount = total - prevTotal;
      changePercent = 0;
    }

    // Usamos el mismo día para no mostrar fechas en el futuro
    result.push({
      date: day,
      total,
      changePercent,
      changeAmount,
      type,
    });
  }

  // Filtrar por rango de tiempo
  const now = new Date();
  let cutoffDate: Date | null = null;
  switch (timeRange) {
    case "1D": cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    case "1W": cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case "1M": cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
  }

  const filtered = cutoffDate
    ? result.filter((p) => new Date(p.date) >= cutoffDate!)
    : result;

  // Solo incluir puntos que tienen referencia (i.e. changePercent !== null)
  return filtered.filter((p) => p.changePercent !== null);
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE ANÁLISIS
// ============================================================================

/**
 * Obtiene análisis de inversiones para un rol de CUENTA específico (USER/SOCIO).
 * Agrega el capital invertido de todas las cuentas con ese rol a lo largo del tiempo.
 * Solo accesible por SUPER_ADMIN.
 */
export async function getInvestmentAnalytics(
  role: "USER" | "SOCIO",
  timeRange: "1D" | "1W" | "1M" | "ALL" = "1M",
  baseCurrency?: string // Filtra por la moneda base del usuario propietario
): Promise<{ success: boolean; data?: AnalyticsData; message?: string }> {
  try {
    // Requiere rol SUPER_ADMIN
    await requireRole(UserRole.SUPER_ADMIN);

    // 1. Obtener todas las cuentas (cajitas) con el rol especificado,
    //    opcionalmente filtradas por la moneda base del usuario propietario.
    const accounts = await prisma.account.findMany({
      where: {
        role,
        ...(baseCurrency
          ? { user: { baseCurrency: baseCurrency.toUpperCase() } }
          : {}),
      },
      select: {
        id: true,
        investedCapital: true,
        createdAt: true,
      },
    });

    // 2. Calcular total actual de capital invertido en estas cuentas
    const currentTotal = accounts.reduce(
      (sum, acc) => sum + Number(acc.investedCapital),
      0
    );

    // 3. Obtener transacciones filtradas por fecha + límite de seguridad
    const accountIds = accounts.map((acc) => acc.id);

    // [M-4] Calcular cutoff de fecha según el rango solicitado para evitar carga masiva en memoria.
    // Para "ALL" usamos 1 año como límite de seguridad razonable.
    const now = new Date();
    let queryCutoffDate: Date;
    switch (timeRange) {
      case "1D": queryCutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case "1W": queryCutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "1M": queryCutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case "ALL":
      default:   queryCutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        accountId: { in: accountIds },
        status: "COMPLETED",
        createdAt: { gte: queryCutoffDate }, // [M-4] Filtro de fecha — evita carga masiva
      },
      select: {
        accountId: true,
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 5000, // [M-4] Límite de seguridad — nunca cargar toda la tabla en memoria
    });

    // 4. Construir línea temporal agregada
    const aggregatedTimeline: ChartDataPoint[] = [];
    const accountBalances = new Map<string, number>();

    // Inicializar todas las cuentas con balance 0
    accounts.forEach((acc) => {
      accountBalances.set(acc.id, 0);
    });

    // Procesar transacciones cronológicamente
    let runningTotal = 0;

    transactions.forEach((tx) => {
      if (!tx.accountId) return;

      const currentBalance = accountBalances.get(tx.accountId) || 0;
      let newBalance = currentBalance;
      const amount = Number(tx.amount);

      // Actualizar balance de la cuenta individual
      if (tx.type === "DEPOSIT" || tx.type === "REFUND") {
        newBalance = currentBalance + amount;
        runningTotal += amount;
      } else if (tx.type === "WITHDRAWAL") {
        newBalance = currentBalance - amount;
        runningTotal -= amount;
      }

      accountBalances.set(tx.accountId, newBalance);

      // Registrar punto en la línea de tiempo global
      aggregatedTimeline.push({
        date: tx.createdAt.toISOString(),
        total: runningTotal,
      });
    });

    // Si no hay transacciones pero hay capital actual, crear línea plana.
    if (aggregatedTimeline.length === 0) {
      const now = new Date();
      if (currentTotal > 0) {
        aggregatedTimeline.push({
          date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          total: currentTotal,
        });
      }
      aggregatedTimeline.push({
        date: now.toISOString(),
        total: currentTotal,
      });
    } else {
      aggregatedTimeline.push({
        date: new Date().toISOString(),
        total: currentTotal,
      });
    }

    // 5. Filtrar datos del gráfico de capital por rango de tiempo
    const filteredData = filterByTimeRange(aggregatedTimeline, timeRange);

    // 6. Calcular resúmenes mensuales (usando la línea completa)
    const monthlyTotals = calculateMonthlyTotals(aggregatedTimeline);

    // 7. Calcular serie de variación diaria %
    const dailyChanges = buildDailyChangeSeries(aggregatedTimeline, timeRange);

    return {
      success: true,
      data: {
        currentTotal,
        chartData: filteredData,
        dailyChanges,
        monthlyTotals: monthlyTotals.slice(0, 6), // Últimos 6 meses
      },
    };
  } catch (error) {
    logger.error("Error fetching investment analytics:", error);
    return {
      success: false,
      message: "Error al obtener datos de análisis",
    };
  }
}

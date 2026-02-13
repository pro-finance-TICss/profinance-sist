"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";

// ============================================================================
// ANÁLISIS DE INVERSIONES PARA SUPER ADMIN - PRO-FINANCE
// ============================================================================
// Proporciona datos analíticos de capital invertido por rol (USER/SOCIO)
// con gráficos temporales y resúmenes mensuales comparativos.
// ============================================================================

/** Punto de datos para el gráfico temporal */
interface ChartDataPoint {
  /** Fecha en formato ISO */
  date: string;
  /** Capital invertido total acumulado en este punto */
  total: number;
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
  /** Datos para el gráfico temporal */
  chartData: ChartDataPoint[];
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
 * @param data - Datos completos del gráfico
 * @param timeRange - Rango: 1 día, 1 semana, 1 mes o todos
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

// ============================================================================
// FUNCIÓN PRINCIPAL DE ANÁLISIS
// ============================================================================

/**
 * Obtiene análisis de inversiones para un rol específico.
 * Agrega el capital invertido de todos los usuarios del rol a lo largo del tiempo.
 * Solo accesible por SUPER_ADMIN.
 */
export async function getInvestmentAnalytics(
  role: "USER" | "SOCIO",
  timeRange: "1D" | "1W" | "1M" | "ALL" = "1M"
): Promise<{ success: boolean; data?: AnalyticsData; message?: string }> {
  try {
    // Requiere rol SUPER_ADMIN
    await requireRole(UserRole.SUPER_ADMIN);

    // Obtener todos los usuarios con el rol especificado
    const users = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        investedCapital: true,
        createdAt: true,
      },
    });

    // Obtener todas las transacciones de estos usuarios
    const userIds = users.map((u) => u.id);
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        status: "COMPLETED",
      },
      select: {
        userId: true,
        type: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Calcular total actual de capital invertido
    const currentTotal = users.reduce(
      (sum, user) => sum + Number(user.investedCapital),
      0
    );

    // Construir línea temporal agregada
    const aggregatedTimeline: ChartDataPoint[] = [];
    const userBalances = new Map<string, number>();

    // Inicializar todos los usuarios con balance 0
    users.forEach((user) => {
      userBalances.set(user.id, 0);
    });

    // Procesar transacciones cronológicamente
    transactions.forEach((tx) => {
      const currentBalance = userBalances.get(tx.userId) || 0;
      let newBalance = currentBalance;

      if (tx.type === "DEPOSIT" || tx.type === "REFUND") {
        newBalance = currentBalance + Number(tx.amount);
      } else if (tx.type === "WITHDRAWAL") {
        newBalance = currentBalance - Number(tx.amount);
      }

      userBalances.set(tx.userId, newBalance);

      // Calcular total agregado en este punto temporal
      const aggregateTotal = Array.from(userBalances.values()).reduce(
        (sum, balance) => sum + balance,
        0
      );

      aggregatedTimeline.push({
        date: tx.createdAt.toISOString(),
        total: aggregateTotal,
      });
    });

    // Si no hay transacciones, crear línea plana al total actual
    if (aggregatedTimeline.length === 0) {
      const now = new Date();
      aggregatedTimeline.push({
        date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        total: currentTotal,
      });
      aggregatedTimeline.push({
        date: now.toISOString(),
        total: currentTotal,
      });
    } else {
      // Agregar punto actual al final de la línea temporal
      aggregatedTimeline.push({
        date: new Date().toISOString(),
        total: currentTotal,
      });
    }

    // Filtrar por rango de tiempo seleccionado
    const filteredData = filterByTimeRange(aggregatedTimeline, timeRange);

    // Calcular resúmenes mensuales (usar datos completos, no filtrados)
    const monthlyTotals = calculateMonthlyTotals(aggregatedTimeline);

    return {
      success: true,
      data: {
        currentTotal,
        chartData: filteredData,
        monthlyTotals: monthlyTotals.slice(0, 6), // Últimos 6 meses
      },
    };
  } catch (error) {
    console.error("Error fetching investment analytics:", error);
    return {
      success: false,
      message: "Error al obtener datos de análisis",
    };
  }
}

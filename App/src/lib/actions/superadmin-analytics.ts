"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/security";
import { UserRole } from "@/lib/enums";

// ============================================================================
// TYPES
// ============================================================================

interface ChartDataPoint {
  date: string; // ISO string
  total: number; // Aggregated investedCapital at this point
}

interface MonthlyTotal {
  month: string; // "2026-01" format
  displayMonth: string; // "Enero 2026"
  total: number;
  changeFromPrevious: number; // percentage
  isIncrease: boolean;
}

interface AnalyticsData {
  currentTotal: number;
  chartData: ChartDataPoint[];
  monthlyTotals: MonthlyTotal[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get month name in Spanish
 */
function getMonthName(monthIndex: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[monthIndex];
}

/**
 * Filter data by time range
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
 * Calculate monthly summaries from chart data
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
// MAIN ANALYTICS FUNCTION
// ============================================================================

/**
 * Get investment analytics for a specific role
 * Aggregates all users' invested capital over time
 */
export async function getInvestmentAnalytics(
  role: "USER" | "SOCIO",
  timeRange: "1D" | "1W" | "1M" | "ALL" = "1M"
): Promise<{ success: boolean; data?: AnalyticsData; message?: string }> {
  try {
    // Require SUPER_ADMIN role
    await requireRole(UserRole.SUPER_ADMIN);

    // Get all users with the specified role
    const users = await prisma.user.findMany({
      where: { role },
      select: {
        id: true,
        investedCapital: true,
        createdAt: true,
      },
    });

    // Get all transactions for these users
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

    // Calculate current total
    const currentTotal = users.reduce(
      (sum, user) => sum + Number(user.investedCapital),
      0
    );

    // Build aggregated timeline
    const aggregatedTimeline: ChartDataPoint[] = [];
    const userBalances = new Map<string, number>();

    // Initialize all users with 0
    users.forEach((user) => {
      userBalances.set(user.id, 0);
    });

    // Process transactions chronologically
    transactions.forEach((tx) => {
      const currentBalance = userBalances.get(tx.userId) || 0;
      let newBalance = currentBalance;

      if (tx.type === "DEPOSIT" || tx.type === "REFUND") {
        newBalance = currentBalance + Number(tx.amount);
      } else if (tx.type === "WITHDRAWAL") {
        newBalance = currentBalance - Number(tx.amount);
      }

      userBalances.set(tx.userId, newBalance);

      // Calculate aggregate total at this point
      const aggregateTotal = Array.from(userBalances.values()).reduce(
        (sum, balance) => sum + balance,
        0
      );

      aggregatedTimeline.push({
        date: tx.createdAt.toISOString(),
        total: aggregateTotal,
      });
    });

    // If no transactions, create flat line at current total
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
      // Add current point
      aggregatedTimeline.push({
        date: new Date().toISOString(),
        total: currentTotal,
      });
    }

    // Filter by time range
    const filteredData = filterByTimeRange(aggregatedTimeline, timeRange);

    // Calculate monthly totals (use full data, not filtered)
    const monthlyTotals = calculateMonthlyTotals(aggregatedTimeline);

    return {
      success: true,
      data: {
        currentTotal,
        chartData: filteredData,
        monthlyTotals: monthlyTotals.slice(0, 6), // Last 6 months
      },
    };
  } catch (error) {
    console.error("Error fetching investment analytics:", error);
    return {
      success: false,
      message: "Failed to fetch analytics data",
    };
  }
}

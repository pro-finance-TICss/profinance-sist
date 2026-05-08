// ============================================================================
// TIPOS — FASE 4: SECCIÓN CUENTAS
// ============================================================================
// Contratos exactos alineados con las respuestas de los endpoints:
//   GET /api/accounts/[id]/detail
//   GET /api/accounts/[id]/performance-chart
//
// NO recalcular nada aquí. Los datos vienen del backend.
// ============================================================================

export interface AccountTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  paymentId?: string | null;
  createdAt: string;
}

export interface AccountDetailData {
  id: string;
  name: string;
  type: "SAVINGS" | "INVESTMENT";
  role: string;
  userId: string;
  investedCapital: number;
  withdrawalLimitByDate: number | null;
  isDefaultReward: boolean;
  createdAt: string;
  updatedAt: string;
  recentTransactions: AccountTransaction[];
}

export interface ChartPoint {
  period: string;       // ISO date "2026-01-15"
  percentage: number;   // userPercentage = raw * 0.5
  amount: number;       // gainAmount en moneda
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

export interface PerformanceChartData {
  accountId: string;
  timeframe: "DAY" | "WEEK" | "MONTH";
  source: "snapshots" | "fallback" | "none";
  data: ChartPoint[];
  meta?: {
    totalPoints?: number;
    message?: string;
    note?: string;
  };
}

export type ChartMode = "amount" | "percentage";
export type TimeframeOption = "DAY" | "WEEK" | "MONTH";

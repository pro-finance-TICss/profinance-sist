"use client";
import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface InvestmentChartProps {
  role: "USER" | "SOCIO";
  title: string;
  /** Filtra el capital por la moneda base de los usuarios (ej. "COP", "USD") */
  currency?: string;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  total: number;
}

interface MonthlyTotal {
  month: string;
  displayMonth: string;
  total: number;
  changeFromPrevious: number;
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
 * Formatea un valor como moneda de forma determinista, usando la divisa recibida.
 */
const formatCurrency = (value: number, currency = "COP"): string => {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$ ${formatted} ${currency}`;
};

/**
 * Formatea valores del eje Y con sufijos K/M para mayor legibilidad.
 * Siempre muestra "COP" como sufijo para dejar claro la divisa.
 */
const formatAxisTick = (value: number): string => {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString("es-CO");
};

const formatDate = (dateStr: string, range: string): string => {
  const date = new Date(dateStr);
  if (range === "1D") {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (range === "1W" || "1M") {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  } else {
    return date.toLocaleDateString("es-ES", {
      month: "short",
      year: "2-digit",
    });
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export function InvestmentChart({ role, title, currency }: InvestmentChartProps) {
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M">("1M");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [role, timeRange, currency]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Construir URL: si hay currency la pasamos como filtro de baseCurrency
      const params = new URLSearchParams({
        role,
        timeRange,
        ...(currency ? { currency } : {}),
      });
      const response = await fetch(`/api/superadmin/analytics?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Format display dates for chart
          const formattedChartData = result.data.chartData.map((point: any) => ({
            ...point,
            displayDate: formatDate(point.date, timeRange),
          }));
          setData({
            ...result.data,
            chartData: formattedChartData,
          });
        }
      }
    } catch (error) {
      logger.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ChartDataPoint;
      return (
        <div
          style={{
            backgroundColor: "#000",
            border: "1px solid #bd8e48",
            borderRadius: "8px",
            padding: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.75rem",
              margin: "0 0 5px 0",
            }}
          >
            {label}
          </p>
          <p
            style={{
              color: "#bd8e48",
              fontSize: "1rem",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            {formatCurrency(point.total, currency)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ position: "relative" }}>
      <style>
        {`
          @keyframes floatParticles {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          .analytics-glass-container {
            position: relative;
            background: #080808;
            border-radius: 24px;
            border: 1px solid rgba(189, 142, 72, 0.3);
            overflow: hidden;
            padding: 30px;
            display: flex;
            flex-direction: column;
          }
          .analytics-particles-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
            opacity: 0.15;
            pointer-events: none;
            animation: floatParticles 60s linear infinite;
            z-index: 0;
          }
          .analytics-time-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(189, 142, 72, 0.2);
            color: rgba(255, 255, 255, 0.5);
            padding: 6px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.7rem;
            font-weight: 700;
            transition: all 0.3s;
            text-transform: uppercase;
          }
          .analytics-time-btn.active {
            background: #bd8e48;
            color: #000;
            border-color: #bd8e48;
            box-shadow: 0 0 15px rgba(189, 142, 72, 0.4);
          }
        `}
      </style>

      <div className="analytics-glass-container">
        <div className="analytics-particles-overlay" />

        {/* Header */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h3
              style={{
                color: "rgba(189, 142, 72, 0.8)",
                margin: 0,
                fontSize: "0.9rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                color: "#fff",
                margin: 0,
                fontSize: "2.4rem",
                fontWeight: "800",
              }}
            >
              {isLoading ? "..." : formatCurrency(data?.currentTotal || 0, currency)}
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
            {(["1D", "1W", "1M"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`analytics-time-btn ${
                  timeRange === range ? "active" : ""
                }`}
              >
                {range === "1D" ? "Días" : range === "1W" ? "Semanas" : "Meses"}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: "300px",
            width: "100%",
            marginBottom: "20px",
          }}
        >
          {mounted && data && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id={`colorBalance-${role}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bd8e48" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#bd8e48" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0"
                  stroke="rgba(189, 142, 72, 0.08)"
                  vertical={true}
                />

                <XAxis
                  dataKey="displayDate"
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  dy={10}
                  interval="preserveStartEnd"
                />

                <YAxis
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  domain={["auto", "auto"]}
                  tickFormatter={formatAxisTick}
                />

                <Tooltip
                  cursor={{ stroke: "#bd8e48", strokeWidth: 1 }}
                  content={<CustomTooltip />}
                />

                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#bd8e48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#colorBalance-${role})`}
                  activeDot={{
                    r: 6,
                    fill: "#fff",
                    stroke: "#bd8e48",
                    strokeWidth: 2,
                  }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p style={{ color: "rgba(255,255,255,0.2)" }}>
                {isLoading ? "Cargando..." : "No hay datos para mostrar"}
              </p>
            </div>
          )}
        </div>

        {/* Monthly Summary */}
        {data && data.monthlyTotals && data.monthlyTotals.length > 0 && (
          <div
            style={{
              position: "relative",
              zIndex: 2,
              borderTop: "1px solid rgba(189, 142, 72, 0.2)",
              paddingTop: "20px",
            }}
          >
            <h4
              style={{
                color: "rgba(189, 142, 72, 0.8)",
                margin: "0 0 12px 0",
                fontSize: "0.75rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Resumen Mensual
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {data.monthlyTotals.map((month) => (
                <div
                  key={month.month}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: "0.85rem",
                        fontWeight: "500",
                      }}
                    >
                      {month.displayMonth}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {formatCurrency(month.total, currency)}
                    </span>
                    {month.changeFromPrevious !== 0 && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          color: month.isIncrease ? "#4caf50" : "#f44336",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                        }}
                      >
                        {month.isIncrease ? (
                          <TrendingUp size={14} />
                        ) : (
                          <TrendingDown size={14} />
                        )}
                        <span>
                          {month.isIncrease ? "+" : ""}
                          {month.changeFromPrevious.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

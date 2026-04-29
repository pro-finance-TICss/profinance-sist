"use client";

// ============================================================================
// PERFORMANCE CHART — GRÁFICO DE RENDIMIENTO POR CUENTA FINANCIERA
// ============================================================================
// Fase 4.3 — Client Component
//
// Props:
//   accountId    — ID de la cuenta a graficar
//   accountType  — SAVINGS | INVESTMENT
//
// Lógica:
//   INVESTMENT → consume GET /api/accounts/[accountId]/performance-chart
//   SAVINGS    → crea serie acumulada desde transacciones (detail endpoint)
//
// Diseño:
//   - AreaChart (Recharts) con gradiente dinámico según tendencia
//   - Toggle $/% con estado local
//   - Tooltip personalizado con signo dinámico
//   - Skeleton de altura fija (sin layout shift)
//   - Empty state limpio (nunca pantalla en blanco)
// ============================================================================

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps,
} from "recharts";

// ============================================================================
// TIPOS — CONTRATO DEL ENDPOINT
// ============================================================================

interface ChartPoint {
  period: string;       // "2026-01-01"
  percentage: number;   // userPercentage (raw * 0.5)
  amount: number;       // gainAmount en COP
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

interface PerformanceApiResponse {
  accountId: string;
  timeframe: string;
  source: "snapshots" | "fallback" | "none";
  data: ChartPoint[];
  meta?: {
    message?: string;
    note?: string;
    totalPoints?: number;
  };
}

// Punto normalizado para Recharts (agrega label y valor de display)
interface ChartDisplayPoint {
  label: string;        // fecha formateada para el eje X
  value: number;        // valor según mode ($  o %)
  rawAmount: number;
  rawPercentage: number;
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

// ============================================================================
// TIPOS DE TRANSACCIÓN (para SAVINGS)
// ============================================================================

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface DetailApiResponse {
  recentTransactions: RecentTransaction[];
  investedCapital: number;
}

// ============================================================================
// PROPS
// ============================================================================

export interface PerformanceChartProps {
  accountId: string;
  accountType: "SAVINGS" | "INVESTMENT";
}

// ============================================================================
// CONSTANTES DE DISEÑO
// ============================================================================

const COLOR_GAIN    = "#10b981";
const COLOR_LOSS    = "#ef4444";
const COLOR_NEUTRAL = "rgba(255,255,255,0.25)";
const GRADIENT_ID   = "perfGradient";

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/** Formatea un valor para el eje Y según el modo actual */
function formatYAxisTick(value: number, mode: "amount" | "percentage"): string {
  if (mode === "percentage") {
    return `${value.toFixed(1)}%`;
  }
  // Abreviar valores grandes
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return `${value.toFixed(0)}`;
}

/** Formatea una fecha ISO a etiqueta corta legible */
function formatPeriodLabel(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/** Determina el color de tendencia según primer y último punto */
function getTrendColor(points: ChartDisplayPoint[]): string {
  if (points.length < 2) return COLOR_NEUTRAL;
  const first = points[0].rawAmount;
  const last  = points[points.length - 1].rawAmount;
  if (last > first) return COLOR_GAIN;
  if (last < first) return COLOR_LOSS;
  return COLOR_NEUTRAL;
}

// ============================================================================
// TOOLTIP PERSONALIZADO
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  mode: "amount" | "percentage";
}

function CustomTooltip({ active, payload, mode }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0];
  if (!entry?.payload) return null;

  const point = entry.payload as ChartDisplayPoint;
  const value  = mode === "percentage" ? point.rawPercentage : point.rawAmount;
  const isGain = value > 0;
  const isLoss = value < 0;

  const sign   = isGain ? "+" : isLoss ? "−" : "";
  const absVal = Math.abs(value);
  const formatted = mode === "percentage"
    ? `${sign}${absVal.toFixed(2)}%`
    : `${sign}${absVal.toLocaleString("es-CO", { maximumFractionDigits: 0 })} COP`;

  const color = isGain ? COLOR_GAIN : isLoss ? COLOR_LOSS : COLOR_NEUTRAL;

  return (
    <div
      style={{
        background: "rgba(10,10,10,0.92)",
        border: `1px solid ${color}40`,
        borderRadius: "10px",
        padding: "10px 14px",
        boxShadow: `0 0 12px ${color}20`,
        backdropFilter: "blur(8px)",
        minWidth: "140px",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
        {point.label}
      </p>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>
        {formatted}
      </p>
    </div>
  );
}

// ============================================================================
// ESTADO: SKELETON (altura fija — sin layout shift)
// ============================================================================

function ChartSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "300px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Línea base simulada */}
      <div style={{
        position: "absolute",
        bottom: "40px",
        left: "60px",
        right: "20px",
        height: "1px",
        background: "rgba(255,255,255,0.05)",
      }} />
      {/* Barras de pulso */}
      {[35, 55, 42, 68, 50, 75, 60, 80, 65, 90].map((h, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            bottom: "41px",
            left: `${60 + i * ((100 - 8) / 10) * 0.9}px`,
            width: "6px",
            height: `${h}px`,
            background: "rgba(255,255,255,0.06)",
            borderRadius: "3px 3px 0 0",
            animation: `pulse 1.8s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// ESTADO: EMPTY / SIN DATOS
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        height: "300px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: "rgba(255,255,255,0.25)",
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <polyline
          points="22 12 18 12 15 21 9 3 6 12 2 12"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, textAlign: "center", maxWidth: "260px" }}>
        {message}
      </p>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PerformanceChart({ accountId, accountType }: PerformanceChartProps) {
  const [mode, setMode] = useState<"amount" | "percentage">("amount");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [points, setPoints] = useState<ChartDisplayPoint[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">("loading");
  const [emptyMessage, setEmptyMessage] = useState("Sin datos de rendimiento");

  // ── Fetch para INVESTMENT ──────────────────────────────────────────────────
  const fetchInvestmentChart = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/accounts/${accountId}/performance-chart`);

      // 404 / 403 → no mostrar chart (UX limpia)
      if (res.status === 404 || res.status === 403) {
        setStatus("empty");
        setEmptyMessage("Sin datos de rendimiento disponibles");
        return;
      }

      if (!res.ok) {
        setStatus("empty");
        setEmptyMessage("No se pudo cargar el gráfico");
        return;
      }

      const json: PerformanceApiResponse = await res.json();

      if (!json.data || json.data.length === 0) {
        setStatus("empty");
        setEmptyMessage(
          json.meta?.message ?? "Sin datos de rendimiento para este período"
        );
        return;
      }

      const normalized: ChartDisplayPoint[] = json.data.map((p) => ({
        label: formatPeriodLabel(p.period),
        value: mode === "percentage" ? p.percentage : p.amount,
        rawAmount: p.amount,
        rawPercentage: p.percentage,
        type: p.type,
      }));

      setPoints(normalized);
      setStatus("success");
    } catch {
      setStatus("empty");
      setEmptyMessage("No se pudo conectar con el servidor");
    }
  }, [accountId, mode]);

  // ── Fetch para SAVINGS (acumulado desde transacciones) ────────────────────
  const fetchSavingsChart = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/accounts/${accountId}/detail`);

      if (!res.ok) {
        setStatus("empty");
        setEmptyMessage("No hay suficiente actividad para mostrar gráfica");
        return;
      }

      const json: DetailApiResponse = await res.json();
      const txs = json.recentTransactions ?? [];

      // Solo transacciones COMPLETED, en orden cronológico
      const completed = txs
        .filter((tx) => tx.status === "COMPLETED")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (completed.length < 2) {
        setStatus("empty");
        setEmptyMessage("No hay suficiente actividad para mostrar gráfica");
        return;
      }

      // Construir serie acumulada
      let running = 0;
      const normalized: ChartDisplayPoint[] = completed.map((tx) => {
        const isCredit = ["DEPOSIT", "TRANSFER_IN", "REWARD"].includes(tx.type);
        const delta = isCredit ? tx.amount : -tx.amount;
        running += delta;
        const date = new Date(tx.createdAt);
        return {
          label: date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
          value: running,
          rawAmount: running,
          rawPercentage: 0,
          type: running >= 0 ? "GAIN" : "LOSS",
        };
      });

      setPoints(normalized);
      setStatus("success");
    } catch {
      setStatus("empty");
      setEmptyMessage("No hay suficiente actividad para mostrar gráfica");
    }
  }, [accountId]);

  // ── Efecto principal ──────────────────────────────────────────────────────
  useEffect(() => {
    if (accountType === "INVESTMENT") {
      fetchInvestmentChart();
    } else {
      fetchSavingsChart();
    }
  }, [accountType, fetchInvestmentChart, fetchSavingsChart]);

  // ── Recalcular `value` cuando cambia el mode (solo INVESTMENT) ────────────
  const displayPoints = useMemo(() => {
    if (accountType !== "INVESTMENT") return points;
    return points.map((p) => ({
      ...p,
      value: mode === "percentage" ? p.rawPercentage : p.rawAmount,
    }));
  }, [points, mode, accountType]);

  // ── Color de gradiente dinámico según tendencia ───────────────────────────
  const trendColor = useMemo(() => getTrendColor(displayPoints), [displayPoints]);

  // ── Render: loading ───────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <section aria-label="Cargando gráfico de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <HeaderBar
          accountType={accountType}
          mode={mode} onToggle={setMode}
          chartType={chartType} onChartTypeToggle={setChartType}
          disabled
        />
        <ChartSkeleton />
      </section>
    );
  }

  // ── Render: empty / error ─────────────────────────────────────────────────
  if (status === "empty" || status === "error") {
    return (
      <section aria-label="Sin datos de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <HeaderBar
          accountType={accountType}
          mode={mode} onToggle={setMode}
          chartType={chartType} onChartTypeToggle={setChartType}
          disabled
        />
        <EmptyState message={emptyMessage} />
      </section>
    );
  }

  // ── Render: gráfico ───────────────────────────────────────────────────────
  return (
    <section aria-label="Gráfico de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <HeaderBar
        accountType={accountType}
        mode={mode}
        onToggle={setMode}
        chartType={chartType}
        onChartTypeToggle={setChartType}
        disabled={false}
      />

      <div
        style={{
          height: "300px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${trendColor}25`,
          overflow: "hidden",
          padding: "16px 4px 8px 4px",
          position: "relative",
        }}
      >
        {/* Glow ambiental sutil según tendencia */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at top center, ${trendColor}08 0%, transparent 65%)`,
            pointerEvents: "none",
          }}
        />

        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            /* ── AREA CHART ── */
            <AreaChart
              data={displayPoints}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={trendColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              <YAxis
                tickFormatter={(v) => formatYAxisTick(v, mode)}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={52}
              />

              <Tooltip
                content={<CustomTooltip mode={mode} />}
                cursor={{ stroke: `${trendColor}30`, strokeWidth: 1, strokeDasharray: "4 4" }}
              />

              <Area
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={2}
                fill={`url(#${GRADIENT_ID})`}
                dot={false}
                activeDot={{ r: 5, fill: trendColor, stroke: "rgba(0,0,0,0.6)", strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            /* ── BAR CHART — eventos diarios con baseline en 0 ── */
            <BarChart
              data={displayPoints}
              margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
              barSize={Math.max(6, Math.min(22, Math.floor(280 / Math.max(displayPoints.length, 1))))}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />

              {/* baseline=0 hace que barras positivas suban y negativas bajen desde cero */}
              <YAxis
                tickFormatter={(v) => formatYAxisTick(v, mode)}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={52}
                allowDataOverflow={false}
              />

              {/* Línea de referencia en 0 — visual baseline */}
              <CartesianGrid
                strokeDasharray="0"
                stroke="rgba(255,255,255,0.12)"
                vertical={false}
                horizontalCoordinatesGenerator={(props) => {
                  // Dibuja solo la línea del cero
                  const { yAxis } = props as { yAxis?: { scale?: (v: number) => number } };
                  if (!yAxis?.scale) return [];
                  const y0 = yAxis.scale(0);
                  return isFinite(y0) ? [y0] : [];
                }}
              />

              <Tooltip
                content={<CustomTooltip mode={mode} />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />

              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {displayPoints.map((entry, index) => {
                  const color =
                    entry.value > 0
                      ? COLOR_GAIN
                      : entry.value < 0
                      ? COLOR_LOSS
                      : COLOR_NEUTRAL;
                  return (
                    <Cell
                      key={`bar-cell-${index}`}
                      fill={color}
                      fillOpacity={0.85}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Nota de fuente */}
      {accountType === "INVESTMENT" && (
        <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.18)", fontWeight: 400, textAlign: "right" }}>
          {chartType === "bar" ? "Eventos diarios · barras individuales" : "Tendencia acumulada"} · Fase 4.3
        </p>
      )}
    </section>
  );
}

// ============================================================================
// SUBCOMPONENTE: BARRA DE HEADER CON TÍTULO + TOGGLE
// ============================================================================

interface HeaderBarProps {
  accountType: "SAVINGS" | "INVESTMENT";
  mode: "amount" | "percentage";
  onToggle: (m: "amount" | "percentage") => void;
  chartType: "area" | "bar";
  onChartTypeToggle: (t: "area" | "bar") => void;
  disabled: boolean;
}

function HeaderBar({
  accountType,
  mode,
  onToggle,
  chartType,
  onChartTypeToggle,
  disabled,
}: HeaderBarProps) {
  const title = accountType === "INVESTMENT"
    ? "Evolución de rendimiento"
    : "Actividad acumulada";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        flexWrap: "wrap",
      }}
    >
      {/* Título */}
      <p
        style={{
          margin: 0,
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "1.1px",
          color: "rgba(255,255,255,0.25)",
          flex: 1,
          minWidth: "max-content",
        }}
      >
        {title}
      </p>

      {/* Controles — solo INVESTMENT */}
      {accountType === "INVESTMENT" && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center", opacity: disabled ? 0.5 : 1 }}>

          {/* Toggle tipo de gráfico: Área / Barras */}
          <div
            role="group"
            aria-label="Tipo de gráfico"
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {(["area", "bar"] as const).map((t) => {
              const isActive = chartType === t;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChartTypeToggle(t)}
                  aria-pressed={isActive}
                  title={t === "area" ? "Tendencia (área)" : "Eventos diarios (barras)"}
                  style={{
                    padding: "5px 10px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 0,
                    cursor: disabled ? "default" : "pointer",
                    transition: "background 0.15s ease, color 0.15s ease",
                    background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {t === "area" ? (
                    /* Ícono inline SVG: línea de área */
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                      <polyline
                        points="1,9 4,5 7,7 10,2 13,4"
                        stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  ) : (
                    /* Ícono inline SVG: barras */
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                      <rect x="1"  y="4" width="2.5" height="6" rx="0.8" fill="currentColor" opacity="0.6"/>
                      <rect x="5"  y="1" width="2.5" height="9" rx="0.8" fill="currentColor"/>
                      <rect x="9"  y="3" width="2.5" height="7" rx="0.8" fill="currentColor" opacity="0.8"/>
                      <rect x="13" y="5" width="1"   height="5" rx="0.5" fill="currentColor" opacity="0.5"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Separador visual */}
          <div style={{ width: "1px", height: "18px", background: "rgba(255,255,255,0.08)" }} />

          {/* Toggle valor: $ / % */}
          <div
            role="group"
            aria-label="Modo de valor"
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {(["amount", "percentage"] as const).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(m)}
                  aria-pressed={isActive}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    border: "none",
                    borderRadius: 0,
                    cursor: disabled ? "default" : "pointer",
                    transition: "background 0.15s ease, color 0.15s ease",
                    background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {m === "amount" ? "$" : "%"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

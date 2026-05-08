"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer, TooltipProps,
} from "recharts";
import { logger } from "@/lib/logger";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ChartDataPoint  { date: string; total: number; }
interface DailyChangePoint {
  date: string; total: number;
  changePercent: number | null; changeAmount: number | null;
  type: "GAIN" | "LOSS" | "NEUTRAL";
}
interface MonthlyTotal {
  month: string; displayMonth: string; total: number;
  changeFromPrevious: number; isIncrease: boolean;
}
interface AnalyticsData {
  currentTotal: number;
  chartData: ChartDataPoint[];
  dailyChanges: DailyChangePoint[];
  monthlyTotals: MonthlyTotal[];
}

// Punto normalizado para Recharts
interface DisplayPoint {
  label: string;
  value: number;
  rawTotal: number;
  rawPercent: number | null;
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

export interface InvestmentChartProps {
  role: "USER" | "SOCIO";
  title: string;
  currency?: string;
}

// ── Colores ──────────────────────────────────────────────────────────────────
const C_GOLD    = "#bd8e48";
const C_GAIN    = "#10b981";
const C_LOSS    = "#ef4444";
const C_NEUTRAL = "rgba(255,255,255,0.25)";

// ── Utilidades ───────────────────────────────────────────────────────────────
function fmtCurrency(v: number, currency = "COP") {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M ${currency}`;
  if (abs >= 1_000)     return `${(v / 1_000).toFixed(1)}K ${currency}`;
  return `${v.toLocaleString("es-CO", { maximumFractionDigits: 0 })} ${currency}`;
}

function fmtAxisAmount(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return `${v.toFixed(0)}`;
}

function fmtDate(iso: string) {
  // Si es solo "YYYY-MM-DD", agregamos T00:00:00 para que se parsee en zona horaria local
  const parseable = iso.length === 10 ? `${iso}T00:00:00` : iso;
  return new Date(parseable).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function ChartTooltip({
  active, payload, mode, currency,
}: { active?: boolean; payload?: any[]; mode: "amount" | "percentage"; currency?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DisplayPoint;
  const isPercent = mode === "percentage";
  const val   = isPercent ? (p.rawPercent ?? 0) : p.rawTotal;
  const isPos = val > 0; const isNeg = val < 0;
  const sign  = isPos ? "+" : isNeg ? "−" : "";
  const color = isPos ? C_GAIN : isNeg ? C_LOSS : C_NEUTRAL;
  const text  = isPercent
    ? `${sign}${Math.abs(val).toFixed(2)}%`
    : `${sign}${fmtCurrency(Math.abs(val), currency)}`;
  return (
    <div style={{
      background: "rgba(8,8,8,0.95)", border: `1px solid ${color}40`,
      borderRadius: 10, padding: "10px 14px",
      boxShadow: `0 0 12px ${color}20`, minWidth: 150,
    }}>
      <p style={{ margin: "0 0 5px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{p.label}</p>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>{text}</p>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{
      height: 300, borderRadius: 16,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>Cargando...</p>
    </div>
  );
}

// ── Empty ─────────────────────────────────────────────────────────────────────
function Empty({ msg }: { msg: string }) {
  return (
    <div style={{
      height: 300, borderRadius: 16,
      background: "rgba(255,255,255,0.02)",
      border: "1px dashed rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.85rem", textAlign: "center", maxWidth: 240 }}>{msg}</p>
    </div>
  );
}

// ── Controles de cabecera ────────────────────────────────────────────────────
function HeaderControls({
  timeRange, setTimeRange,
  mode, setMode,
  disabled,
}: {
  timeRange: "1D" | "1W" | "1M";
  setTimeRange: (r: "1D" | "1W" | "1M") => void;
  mode: "amount" | "percentage";
  setMode: (m: "amount" | "percentage") => void;
  disabled: boolean;
}) {
  const btnBase: React.CSSProperties = {
    border: "none", borderRadius: 0, cursor: disabled ? "default" : "pointer",
    transition: "background 0.15s, color 0.15s",
    padding: "5px 11px", fontSize: "0.72rem", fontWeight: 700,
  };
  const groupStyle: React.CSSProperties = {
    display: "flex", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, overflow: "hidden",
  };
  const active = (on: boolean): React.CSSProperties => ({
    background: on ? "rgba(255,255,255,0.1)" : "transparent",
    color: on ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
  });

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", opacity: disabled ? 0.5 : 1, flexWrap: "wrap" }}>
      {/* Rango de tiempo */}
      <div style={groupStyle}>
        {(["1D","1W","1M"] as const).map(r => (
          <button key={r} type="button" disabled={disabled}
            onClick={() => setTimeRange(r)}
            style={{ ...btnBase, ...active(timeRange === r), letterSpacing: "0.3px" }}>
            {r === "1D" ? "1D" : r === "1W" ? "1S" : "1M"}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)" }} />

      {/* Modo $ / % — el tipo de gráfico se deriva automáticamente */}
      <div style={groupStyle}>
        {(["amount","percentage"] as const).map(m => (
          <button key={m} type="button" disabled={disabled}
            onClick={() => setMode(m)}
            title={m === "amount" ? "Capital total (tendencia)" : "Variación % diaria (barras)"}
            style={{ ...btnBase, ...active(mode === m), padding: "5px 13px" }}>
            {m === "amount" ? "$" : "%"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function InvestmentChart({ role, title, currency }: InvestmentChartProps) {
  const [timeRange, setTimeRange] = useState<"1D" | "1W" | "1M">("1M");
  const [mode, setMode]           = useState<"amount" | "percentage">("amount");
  const [data, setData]           = useState<AnalyticsData | null>(null);
  const [status, setStatus]       = useState<"loading" | "success" | "empty">("loading");

  // $ → área (tendencia acumulada), % → barras (variación diaria)
  const chartType: "area" | "bar" = mode === "amount" ? "area" : "bar";

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      try {
        const params = new URLSearchParams({ role, timeRange, ...(currency ? { currency } : {}) });
        const res = await fetch(`/api/superadmin/analytics?${params}`);
        if (!res.ok) { setStatus("empty"); return; }
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
          setStatus("success");
        } else {
          setStatus("empty");
        }
      } catch (e) {
        logger.error("InvestmentChart fetch error:", e);
        setStatus("empty");
      }
    };
    load();
  }, [role, timeRange, currency]);

  // Construir puntos de display según modo
  const displayPoints = useMemo<DisplayPoint[]>(() => {
    if (!data) return [];
    if (mode === "amount") {
      return data.chartData.map(p => ({
        label: fmtDate(p.date),
        value: p.total,
        rawTotal: p.total,
        rawPercent: null,
        type: "GAIN" as const,
      }));
    }
    // modo % → serie de cambio diario
    return data.dailyChanges.map(p => ({
      label: fmtDate(p.date),
      value: p.changePercent ?? 0,
      rawTotal: p.total,
      rawPercent: p.changePercent,
      type: p.type,
    }));
  }, [data, mode]);

  // Color de tendencia (para modo $) o neutral palette (para modo %)
  const trendColor = useMemo(() => {
    if (mode === "percentage") return C_GOLD;
    if (displayPoints.length < 2) return C_NEUTRAL;
    return displayPoints[displayPoints.length - 1].rawTotal > displayPoints[0].rawTotal ? C_GAIN : C_LOSS;
  }, [displayPoints, mode]);

  const gradId = `grad-${role}`;

  const renderChart = () => {
    if (chartType === "area") {
      return (
        <AreaChart data={displayPoints} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={trendColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={trendColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={v => mode === "percentage" ? `${v.toFixed(1)}%` : fmtAxisAmount(v)}
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<ChartTooltip mode={mode} currency={currency} />}
            cursor={{ stroke: `${trendColor}30`, strokeWidth: 1, strokeDasharray: "4 4" }} />
          <Area type="monotone" dataKey="value" stroke={trendColor} strokeWidth={2}
            fill={`url(#${gradId})`} dot={false}
            activeDot={{ r: 5, fill: trendColor, stroke: "rgba(0,0,0,0.6)", strokeWidth: 2 }} />
        </AreaChart>
      );
    }
    // Bar chart
    const barSize = Math.max(6, Math.min(22, Math.floor(280 / Math.max(displayPoints.length, 1))));
    return (
      <BarChart data={displayPoints} margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barSize={barSize} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={v => mode === "percentage" ? `${v.toFixed(1)}%` : fmtAxisAmount(v)}
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} width={52} />
        <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.12)" vertical={false}
          horizontalCoordinatesGenerator={(props: any) => {
            const y0 = props?.yAxis?.scale?.(0);
            return isFinite(y0) ? [y0] : [];
          }} />
        <Tooltip content={<ChartTooltip mode={mode} currency={currency} />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
          {displayPoints.map((p, i) => {
            const color = mode === "percentage"
              ? (p.value > 0 ? C_GAIN : p.value < 0 ? C_LOSS : C_NEUTRAL)
              : trendColor;
            return <Cell key={i} fill={color} fillOpacity={0.85} />;
          })}
        </Bar>
      </BarChart>
    );
  };

  return (
    <div style={{
      background: "#080808", borderRadius: 24,
      border: "1px solid rgba(189,142,72,0.3)",
      padding: 30, display: "flex", flexDirection: "column", gap: 16, position: "relative", overflow: "hidden",
    }}>
      {/* Partículas decorativas */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
        opacity: 0.12, pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "rgba(189,142,72,0.85)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
            {title}
          </h3>
          <p style={{ margin: "4px 0 0", color: "#fff", fontSize: "2rem", fontWeight: 800, lineHeight: 1 }}>
            {status === "loading" ? "…" : fmtCurrency(data?.currentTotal ?? 0, currency)}
          </p>
          {mode === "percentage" && (
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
              Variación % diaria · el cambio del día anterior
            </p>
          )}
        </div>
        <HeaderControls
          timeRange={timeRange} setTimeRange={setTimeRange}
          mode={mode} setMode={setMode}
          disabled={status === "loading"}
        />
      </div>

      {/* Chart area */}
      <div style={{ position: "relative", zIndex: 1, height: 300 }}>
        {status === "loading" && <Skeleton />}
        {status === "empty"   && <Empty msg="Sin datos para mostrar en este período" />}
        {status === "success" && (
          displayPoints.length === 0
            ? <Empty msg={mode === "percentage" ? "Sin variaciones registradas en este período" : "Sin datos de capital"} />
            : (
              <div style={{
                height: "100%", borderRadius: 16,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${trendColor}25`,
                padding: "16px 4px 8px 4px", position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", inset: 0,
                  background: `radial-gradient(ellipse at top center, ${trendColor}08 0%, transparent 65%)`,
                  pointerEvents: "none",
                }} />
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </div>
            )
        )}
      </div>

      {/* Resumen mensual */}
      {status === "success" && data && data.monthlyTotals.length > 0 && (
        <div style={{ position: "relative", zIndex: 2, borderTop: "1px solid rgba(189,142,72,0.2)", paddingTop: 16 }}>
          <p style={{ margin: "0 0 10px", color: "rgba(189,142,72,0.8)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
            Resumen Mensual
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.monthlyTotals.map(m => (
              <div key={m.month} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8,
              }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{m.displayMonth}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "#fff", fontSize: "0.9rem", fontWeight: 600 }}>
                    {fmtCurrency(m.total, currency)}
                  </span>
                  {m.changeFromPrevious !== 0 && (
                    <span style={{
                      fontSize: "0.75rem", fontWeight: 700,
                      color: m.isIncrease ? C_GAIN : C_LOSS,
                    }}>
                      {m.isIncrease ? "▲" : "▼"} {Math.abs(m.changeFromPrevious).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

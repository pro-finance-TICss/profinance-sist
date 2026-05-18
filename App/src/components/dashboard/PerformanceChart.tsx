"use client";

// ============================================================================
// PERFORMANCE CHART — GRÁFICO DE RENDIMIENTO POR CUENTA FINANCIERA
// ============================================================================
// Fase 4.5 — Client Component
//
// Lógica alineada con el panel de Superadmin:
//   $ → AreaChart dorado  — capital acumulado en COP (suma running)
//   % → BarChart verde/rojo — porcentaje diario agrupado por día (sum),
//         rellenando todos los días del mes con 0 si no hay dato
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
} from "recharts";
import { getDashboardPerformances } from "@/lib/actions/performance";

// ============================================================================
// TIPOS
// ============================================================================

interface RawPerformancePoint {
  period: string;       // "YYYY-MM-DD"
  percentage: number;
  amount: number;
  capitalBase: number;  // capital al inicio de este evento
  type: "GAIN" | "LOSS" | "NEUTRAL";
}

interface PerformanceApiResponse {
  accountId: string;
  timeframe: string;
  source: "snapshots" | "fallback" | "none";
  data: RawPerformancePoint[];        // Performance individuales → para gráfica %
  snapshotData?: RawPerformancePoint[]; // Snapshots históricos → para tendencia $
  meta?: { message?: string; note?: string; totalPoints?: number; investedCapital?: number };
}

// Punto para gráfica de TENDENCIA ($): capital acumulado día a día
interface TrendPoint {
  day: number;         // 1-31 (igual que DayPoint, para consistencia visual)
  label: string;       // "1", "5", "10"...
  total: number;       // capital base + suma corrida de ganancias
}

// Punto para gráfica de PORCENTAJE (%): porcentaje diario agrupado
interface DayPoint {
  day: number;   // 1-31
  value: number; // suma de porcentajes del día
}

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
  isHighRisk?: boolean;
  /** ISO string o "YYYY-MM-DD" — para bloquear meses anteriores a la creación */
  accountCreatedAt?: string;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const COLOR_GOLD    = "#bd8e48";
const COLOR_GAIN    = "#10b981";
const COLOR_LOSS    = "#ef4444";
const COLOR_NEUTRAL = "rgba(255,255,255,0.2)";
const GRADIENT_ID   = "perfGradientGold";

// ============================================================================
// UTILIDADES
// ============================================================================

function formatPeriodLabel(iso: string): string {
  const date = new Date(iso + "T00:00:00");
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatAmountTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1)         return `${value.toFixed(1)}`;
  if (abs > 0)          return `${value.toFixed(2)}`;
  return "0";
}

// ============================================================================
// TOOLTIP — Tendencia acumulada (%)
// ============================================================================

function TrendTooltip({ active, payload, selectedMonth }: { active?: boolean; payload?: any[]; selectedMonth?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  const val   = point.total;   // % acumulado hasta este día
  const color = val >= 0 ? COLOR_GOLD : COLOR_LOSS;

  // Label: "15 de abril de 2026"
  let dateLabel = point.label;
  if (selectedMonth) {
    const [y, m] = selectedMonth.split("-").map(Number);
    dateLabel = new Date(y, m - 1, point.day)
      .toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  }

  return (
    <div style={{
      background: "rgba(8,8,8,0.96)",
      border: `1px solid ${color}40`,
      borderRadius: 10,
      padding: "10px 14px",
      minWidth: 160,
      boxShadow: `0 0 12px ${color}20`,
    }}>
      <p style={{ margin: "0 0 5px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
        {dateLabel}
      </p>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>
        {val > 0 ? "+" : val < 0 ? "−" : ""}{Math.abs(val).toFixed(2)}%
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>
        acumulado del período
      </p>
    </div>
  );
}

// ============================================================================
// TOOLTIP — Porcentaje (%) — mismo patrón que superadmin
// ============================================================================

function PctTooltip({
  active, payload, selectedMonth,
}: {
  active?: boolean;
  payload?: any[];
  selectedMonth: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as DayPoint;
  const val   = point.value;
  const color = val > 0 ? COLOR_GAIN : val < 0 ? COLOR_LOSS : COLOR_NEUTRAL;
  const [y, m] = selectedMonth.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, point.day)
    .toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{
      background: "rgba(8,8,8,0.96)",
      border: `1px solid ${color}40`,
      borderRadius: 10,
      padding: "10px 14px",
      minWidth: 160,
      boxShadow: `0 0 12px ${color}20`,
    }}>
      <p style={{ margin: "0 0 5px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
        {dateLabel}
      </p>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>
        {val > 0 ? "+" : val < 0 ? "−" : ""}
        {Math.abs(val).toFixed(2)}%
      </p>
    </div>
  );
}

// ============================================================================
// SKELETON
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
      <div style={{ position: "absolute", bottom: "40px", left: "60px", right: "20px", height: "1px", background: "rgba(255,255,255,0.05)" }} />
      {[35, 55, 42, 68, 50, 75, 60, 80, 65, 90].map((h, i) => (
        <div key={i} style={{
          position: "absolute",
          bottom: "41px",
          left: `${60 + i * ((100 - 8) / 10) * 0.9}px`,
          width: "6px",
          height: `${h}px`,
          background: "rgba(255,255,255,0.06)",
          borderRadius: "3px 3px 0 0",
          animation: `pulse 1.8s ease-in-out ${i * 0.12}s infinite`,
        }} />
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
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
    }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"
          stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, textAlign: "center", maxWidth: "260px" }}>
        {message}
      </p>
    </div>
  );
}

// ============================================================================
// ============================================================================
// HEADER BAR
// ============================================================================

interface HeaderBarProps {
  accountType: "SAVINGS" | "INVESTMENT";
  mode: "amount" | "percentage";
  onToggle: (m: "amount" | "percentage") => void;
  selectedMonth?: string; // "YYYY-MM"
  onMonthChange?: (m: string) => void;
  disabled: boolean;
}

function HeaderBar({ accountType, mode, onToggle, selectedMonth, onMonthChange, disabled }: HeaderBarProps) {
  const title = accountType === "INVESTMENT" ? "Evolución de rendimiento" : "Actividad acumulada";

  const { selectedY, selectedM } = React.useMemo(() => {
    if (!selectedMonth) return { selectedY: new Date().getFullYear().toString(), selectedM: String(new Date().getMonth() + 1).padStart(2, "0") };
    const [y, m] = selectedMonth.split("-");
    return { selectedY: y, selectedM: m };
  }, [selectedMonth]);

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const opts: string[] = [];
    for (let y = currentYear; y >= 2010; y--) {
      opts.push(y.toString());
    }
    return opts;
  }, []);

  const monthOptions = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const value = String(i + 1).padStart(2, "0");
      const label = new Date(2000, i, 1).toLocaleDateString("es-ES", { month: "long" });
      return { value, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, []);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onMonthChange) onMonthChange(`${e.target.value}-${selectedM}`);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onMonthChange) onMonthChange(`${selectedY}-${e.target.value}`);
  };

  const selectStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: "8px",
    backgroundColor: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.85)",
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    colorScheme: "dark",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
      <p style={{
        margin: 0, fontSize: "0.72rem", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "1.1px",
        color: "rgba(255,255,255,0.25)", flex: 1, minWidth: "max-content",
      }}>
        {title}
      </p>

      {accountType === "INVESTMENT" && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center", opacity: disabled ? 0.5 : 1 }}>

          {/* Selectores de Mes y Año */}
          {selectedMonth && onMonthChange && (
            <div style={{ display: "flex", gap: "4px" }}>
              <select
                value={selectedM}
                onChange={handleMonthChange}
                disabled={disabled}
                style={selectStyle}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ background: "#111" }}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedY}
                onChange={handleYearChange}
                disabled={disabled}
                style={selectStyle}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} style={{ background: "#111" }}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle único: $ | % */}
          <div
            role="group"
            aria-label="Modo de visualización"
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
              const activeColor = m === "amount" ? COLOR_GOLD : COLOR_GAIN;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => onToggle(m)}
                  aria-pressed={isActive}
                  title={m === "amount" ? "Tendencia · % acumulado del período" : "Barras · % por día"}
                  style={{
                    padding: "5px 12px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.3px",
                    border: "none",
                    borderRadius: 0,
                    cursor: disabled ? "default" : "pointer",
                    transition: "background 0.15s ease, color 0.15s ease",
                    background: isActive ? `${activeColor}22` : "transparent",
                    color: isActive ? activeColor : "rgba(255,255,255,0.3)",
                  }}
                >
                  {m === "amount" ? "≈" : "%"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PerformanceChart({ accountId, accountType, isHighRisk, accountCreatedAt, selectedMonth, onMonthChange }: PerformanceChartProps) {
  const [mode, setMode] = useState<"amount" | "percentage">("amount");

  // Datos para la gráfica de TENDENCIA ($) — del API del chart
  const [rawData, setRawData] = useState<RawPerformancePoint[]>([]); // Performances individuales (para %)
  const [snapshotData, setSnapshotData] = useState<RawPerformancePoint[]>([]); // Snapshots históricos (para $)
  const [investedCapital, setInvestedCapital] = useState<number>(0);

  // Datos para la gráfica de PORCENTAJE (%) — misma fuente que la tabla
  const [perfData, setPerfData] = useState<Array<{ startDate: string; percentage: number }>>([]);

  // Para cuentas SAVINGS: puntos de tendencia directo
  const [savingsTrend, setSavingsTrend] = useState<TrendPoint[]>([]);

  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">("loading");
  const [emptyMessage, setEmptyMessage] = useState("Sin datos de rendimiento");

  // ── Fetch para INVESTMENT ──────────────────────────────────────────────────
  const fetchInvestmentChart = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/accounts/${accountId}/performance-chart?timeframe=ALL`);
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
        setEmptyMessage(json.meta?.message ?? "Sin datos de rendimiento para este período");
        return;
      }
      // Guardar capital base para el cálculo de tendencia
      setInvestedCapital(json.meta?.investedCapital ?? 0);
      setRawData(json.data);  // Performances individuales → gráfica %
      setSnapshotData(json.snapshotData ?? json.data); // Snapshots → gráfica $
      setStatus("success");
    } catch {
      setStatus("empty");
      setEmptyMessage("No se pudo conectar con el servidor");
    }
  }, [accountId]);

  // ── Fetch para SAVINGS ────────────────────────────────────────────────────
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

      const completed = txs
        .filter((tx) => tx.status === "COMPLETED")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (completed.length < 2) {
        setStatus("empty");
        setEmptyMessage("No hay suficiente actividad para mostrar gráfica");
        return;
      }

      let running = 0;
      const points: TrendPoint[] = completed.map((tx) => {
        const isCredit = ["DEPOSIT", "TRANSFER_IN", "REWARD"].includes(tx.type);
        running += isCredit ? tx.amount : -tx.amount;
        const date = new Date(tx.createdAt);
        const day = date.getDate();
        return {
          day,
          label: date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
          total: running,
        };
      });

      setSavingsTrend(points);
      setStatus("success");
    } catch {
      setStatus("empty");
      setEmptyMessage("No hay suficiente actividad para mostrar gráfica");
    }
  }, [accountId]);

  // Fetch performances para gráfica de % (misma fuente que la tabla)
  const fetchPerfData = useCallback(async () => {
    if (accountType !== "INVESTMENT") return;
    try {
      const res = await getDashboardPerformances(isHighRisk ?? false);
      setPerfData(res.map((r: any) => ({
        startDate: r.startDate instanceof Date ? r.startDate.toISOString() : String(r.startDate),
        percentage: r.percentage as number, // ya es userPercentage (raw/2)
      })));
    } catch {
      // silenciar; la gráfica $ sigue funcionando
    }
  }, [accountType, isHighRisk]);

  useEffect(() => {
    if (accountType === "INVESTMENT") {
      fetchInvestmentChart();
      fetchPerfData();
    } else {
      fetchSavingsChart();
    }
  }, [accountType, fetchInvestmentChart, fetchSavingsChart, fetchPerfData]);

  // ── Puntos para gráfica de TENDENCIA (% acumulado) ───────────────────────
  // Usa la misma fuente que dayPoints (perfData) pero acumula el % día a día
  const trendPoints = useMemo((): TrendPoint[] => {
    if (accountType !== "INVESTMENT") {
      return savingsTrend.map((p, i) => ({ day: p.day ?? i + 1, label: p.label, total: p.total }));
    }

    if (!selectedMonth) return [];

    // Si el mes seleccionado es ANTERIOR al mes de creación de la cuenta → no hay datos
    if (accountCreatedAt) {
      const createdYM = accountCreatedAt.substring(0, 7);
      if (selectedMonth < createdYM) return [];
    }

    const [y, m] = selectedMonth.split("-").map(Number);

    // Mapa día → suma de porcentajes de ese día (igual que dayPoints)
    const dayMap = new Map<number, number>();
    perfData
      .filter((p) => {
        const d = new Date(p.startDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === selectedMonth;
      })
      .forEach((p) => {
        const day = new Date(p.startDate).getDate();
        dayMap.set(day, (dayMap.get(day) ?? 0) + p.percentage);
      });

    // Sin datos de rendimiento en este mes → no dibujar línea falsa
    if (dayMap.size === 0) return [];

    const daysInMonth = new Date(y, m, 0).getDate();
    let cumulative = 0;
    const result: TrendPoint[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      cumulative += dayMap.get(day) ?? 0;
      result.push({ day, label: String(day), total: cumulative });
    }
    return result;
  }, [perfData, selectedMonth, accountType, savingsTrend, accountCreatedAt]);


  // ── Puntos para gráfica de PORCENTAJE (%) ────────────────────────────────
  // Usa EXACTAMENTE la misma fuente y lógica de fecha que PerformanceTable
  const dayPoints = useMemo((): DayPoint[] => {
    if (!selectedMonth) return [];

    // Si el mes es anterior a la creación de la cuenta → nada que mostrar
    if (accountCreatedAt) {
      const createdYM = accountCreatedAt.substring(0, 7);
      if (selectedMonth < createdYM) return [];
    }

    const [y, m] = selectedMonth.split("-").map(Number);
    const dayMap = new Map<number, number>();

    perfData
      .filter((p) => {
        const d = new Date(p.startDate);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === selectedMonth;
      })
      .forEach((p) => {
        const day = new Date(p.startDate).getDate();
        dayMap.set(day, (dayMap.get(day) ?? 0) + p.percentage);
      });

    const daysInMonth = new Date(y, m, 0).getDate();
    const result: DayPoint[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      result.push({ day, value: dayMap.get(day) ?? 0 });
    }
    return result;
  }, [perfData, selectedMonth, accountCreatedAt]);

  const hasPctData = dayPoints.some((p) => p.value !== 0);

  // ── Curried tooltip para % (necesita selectedMonth) ───────────────────────
  const renderPctTooltip = useCallback(
    (props: any) => <PctTooltip {...props} selectedMonth={selectedMonth ?? ""} />,
    [selectedMonth]
  );

  // ── Render: loading ───────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <section aria-label="Cargando gráfico de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <HeaderBar accountType={accountType} mode={mode} onToggle={setMode}
          selectedMonth={selectedMonth} onMonthChange={onMonthChange} disabled />
        <ChartSkeleton />
      </section>
    );
  }

  // ── Render: empty / error ─────────────────────────────────────────────────
  if (status === "empty" || status === "error") {
    return (
      <section aria-label="Sin datos de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <HeaderBar accountType={accountType} mode={mode} onToggle={setMode}
          selectedMonth={selectedMonth} onMonthChange={onMonthChange} disabled />
        <EmptyState message={emptyMessage} />
      </section>
    );
  }

  // ── Render: gráfico ───────────────────────────────────────────────────────
  return (
    <section aria-label="Gráfico de rendimiento" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <HeaderBar accountType={accountType} mode={mode} onToggle={setMode}
        selectedMonth={selectedMonth} onMonthChange={onMonthChange} disabled={false} />

      <div style={{
        height: "300px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.015)",
        border: `1px solid ${mode === "amount" ? COLOR_GOLD : "rgba(255,255,255,0.06)"}25`,
        overflow: "hidden",
        padding: "16px 4px 8px 4px",
        position: "relative",
      }}>
        {/* Glow ambiental */}
        <div aria-hidden="true" style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at top center, ${mode === "amount" ? COLOR_GOLD : "rgba(255,255,255,0.05)"}08 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />

        <ResponsiveContainer width="100%" height="100%">
          {mode === "amount" ? (
            /* ── AREA CHART DORADO — tendencia acumulada ── */
            <AreaChart data={trendPoints} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLOR_GOLD} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLOR_GOLD} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day"
                tickFormatter={(day) => day === 1 || day % 5 === 0 || day >= 28 ? String(day) : ""}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 500 }}
                axisLine={false} tickLine={false} width={52} />
              <Tooltip content={(props: any) => <TrendTooltip {...props} selectedMonth={selectedMonth} />}
                cursor={{ stroke: `${COLOR_GOLD}40`, strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="total"
                stroke={COLOR_GOLD} strokeWidth={2}
                fill={`url(#${GRADIENT_ID})`}
                dot={false}
                activeDot={{ r: 5, fill: COLOR_GOLD, stroke: "rgba(0,0,0,0.6)", strokeWidth: 2 }} />
            </AreaChart>
          ) : (
            /* ── BAR CHART VERDE/ROJO — porcentaje diario agrupado ── */
            <BarChart
              data={dayPoints}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              barSize={8}
              barCategoryGap="8%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              {/* Línea en 0 */}
              <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.1)" vertical={false}
                horizontalCoordinatesGenerator={(props: any) => {
                  const y0 = props?.yAxis?.scale?.(0);
                  return isFinite(y0) ? [y0] : [];
                }} />
              <XAxis dataKey="day"
                tickFormatter={(day) => day === 1 || day % 5 === 0 || day >= 28 ? String(day) : ""}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false} tickLine={false} width={48} />
              <Tooltip content={renderPctTooltip} cursor={false} isAnimationActive={false} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {dayPoints.map((p, i) => (
                  <Cell key={i}
                    fill={p.value > 0 ? COLOR_GAIN : p.value < 0 ? COLOR_LOSS : COLOR_NEUTRAL}
                    fillOpacity={p.value === 0 ? 0 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Nota de fuente */}
      {accountType === "INVESTMENT" && (
        <p style={{ margin: 0, fontSize: "0.7rem", color: "rgba(255,255,255,0.18)", fontWeight: 400, textAlign: "right" }}>
          {mode === "percentage" ? "Porcentaje diario · agrupado por día" : "Tendencia acumulada de rendimiento · %"} · Fase 4.5
        </p>
      )}
    </section>
  );
}

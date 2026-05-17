"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import type { HistoricalEntry } from "@/lib/actions/historical-recalculation";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RowState extends HistoricalEntry {
  isManualCapital: boolean;
  suggestedCapital: number;
  /** Número del ciclo al que pertenece (null = periodo libre) */
  cycleNumber: number | null;
  /** Etiqueta del ciclo, ej. "Ciclo 1 · Ene–Mar" */
  cycleLabel: string | null;
  /** true si es el primer mes del ciclo (nuevo capitalBase) */
  isCycleStart: boolean;
  /** true si es el último mes del ciclo */
  isCycleEnd: boolean;
  /**
   * % acumulado del ciclo hasta este mes (read-only, calculado por el Wizard).
   * Solo informativo para el usuario.
   */
  cycleAccumulatedPct?: number;
}

interface Props {
  row: RowState;
  index: number;
  onChange: (index: number, updated: Partial<RowState>) => void;
}

// ── Colores ───────────────────────────────────────────────────────────────────
const GOLD  = "#bd8e48";
const GREEN = "#00c97a";
const RED   = "#e05c5c";
const AMBER = "rgba(255,190,50,0.8)";
const BLUE  = "rgba(100,160,255,0.8)";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const round2 = (v: number) => Math.round(v * 100) / 100;

const MONTH_LABELS: Record<string, string> = {
  "01": "Enero",   "02": "Febrero",  "03": "Marzo",    "04": "Abril",
  "05": "Mayo",    "06": "Junio",    "07": "Julio",    "08": "Agosto",
  "09": "Sep",     "10": "Octubre",  "11": "Noviembre","12": "Diciembre",
};

// ── Componente ─────────────────────────────────────────────────────────────────

export const HistoricalMonthRow = memo(function HistoricalMonthRow({ row, index, onChange }: Props) {
  const [, mm] = row.month.split("-");
  const [year]  = row.month.split("-");
  const monthLabel = `${MONTH_LABELS[mm]} ${year}`;

  const [localCapital, setLocalCapital] = useState(String(row.capitalBase));
  const [localPct,     setLocalPct]     = useState(String(row.userPercentage));

  // Sincronizar si el padre propaga cambios
  useEffect(() => { setLocalCapital(String(row.capitalBase)); }, [row.capitalBase]);
  useEffect(() => { setLocalPct(String(row.userPercentage)); }, [row.userPercentage]);

  const commitCapital = useCallback(() => {
    const val = round2(parseFloat(localCapital) || 0);
    setLocalCapital(String(val));
    onChange(index, { capitalBase: val, isManualCapital: val !== row.suggestedCapital });
  }, [localCapital, index, onChange, row.suggestedCapital]);

  const commitPct = useCallback(() => {
    const val = round2(parseFloat(localPct) || 0);
    setLocalPct(String(val));
    onChange(index, { userPercentage: val });
  }, [localPct, index, onChange]);

  const handleCapitalKeyDown = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") commitCapital(); }, [commitCapital]);
  const handlePctKeyDown     = useCallback((e: React.KeyboardEvent) => { if (e.key === "Enter") commitPct(); },     [commitPct]);

  // En el modelo de ciclos, gainAmount = capitalBase × % acumulado del ciclo hasta este mes
  const cycleAccPct = row.cycleAccumulatedPct ?? row.userPercentage;
  const gainAmount  = row.cycleNumber !== null
    ? round2(row.capitalBase * (cycleAccPct / 100))
    : round2(row.capitalBase * (row.userPercentage / 100));
  const capitalEnd = round2(row.capitalBase + gainAmount);

  const isManual = row.isManualCapital;
  const isDecember = mm === "12"; // Diciembre = mes de descanso, sin rendimiento
  const hasGain  = gainAmount > 0;
  const hasLoss  = gainAmount < 0;

  const rowBg = row.isCycleStart
    ? "rgba(189,142,72,0.06)"
    : isManual
    ? "rgba(255,190,50,0.04)"
    : "rgba(255,255,255,0.012)";

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "6px 10px",
    width: "100%",
    outline: "none",
    textAlign: "right",
  };

  return (
    <>
      {/* Fila divisor: inicio de ciclo */}
      {row.isCycleStart && row.cycleLabel && (
        <tr>
          <td colSpan={5} style={{ padding: "6px 14px 4px", background: "rgba(189,142,72,0.04)", borderTop: "1px solid rgba(189,142,72,0.2)", borderBottom: "none" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🔒 {row.cycleLabel} — Capital base: ${fmt(row.suggestedCapital)}
            </span>
          </td>
        </tr>
      )}

      <tr className="historical-row" style={{ background: rowBg, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Mes */}
        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isManual ? AMBER : "rgba(255,255,255,0.8)" }}>
            {monthLabel}
          </span>
          {isManual && (
            <span style={{ marginLeft: 6, fontSize: "0.68rem", color: AMBER }}>● manual</span>
          )}
          {row.isCycleEnd && (
            <span style={{ marginLeft: 6, fontSize: "0.65rem", color: GREEN, fontWeight: 700 }}>✓ fin ciclo</span>
          )}
          {row.cycleNumber === null && !isDecember && (
            <span style={{ marginLeft: 6, fontSize: "0.65rem", color: BLUE }}>↔ libre</span>
          )}
          {isDecember && (
            <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>🏖 descanso</span>
          )}
        </td>

        {/* Capital base */}
        <td style={{ padding: "8px 10px" }}>
          {!isDecember && row.isCycleStart ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number" min={0} step={0.01}
                value={localCapital}
                style={{ ...inputStyle, borderColor: isManual ? "rgba(255,190,50,0.4)" : "rgba(255,255,255,0.1)" }}
                onChange={(e) => setLocalCapital(e.target.value)}
                onBlur={commitCapital}
                onKeyDown={handleCapitalKeyDown}
              />
              {isManual && (
                <button
                  title={`Restaurar recomendado: $${fmt(row.suggestedCapital)}`}
                  onClick={() => {
                    setLocalCapital(String(row.suggestedCapital));
                    onChange(index, { capitalBase: row.suggestedCapital, isManualCapital: false });
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: AMBER, fontSize: "0.75rem", whiteSpace: "nowrap" }}
                >↺</button>
              )}
            </div>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.35)", paddingLeft: 10 }}>
              ${fmt(row.capitalBase)}
            </span>
          )}
          {isManual && row.isCycleStart && !isDecember && (
            <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "rgba(255,190,50,0.6)" }}>
              Rec: ${fmt(row.suggestedCapital)}
            </p>
          )}
        </td>

        {/* % del mes — bloqueado en Diciembre */}
        <td style={{ padding: "8px 10px" }}>
          {isDecember ? (
            <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.2)", paddingLeft: 10, fontStyle: "italic" }}>—</span>
          ) : (
            <>
              <input
                type="number" step={0.01}
                value={localPct}
                style={inputStyle}
                onChange={(e) => setLocalPct(e.target.value)}
                onBlur={commitPct}
                onKeyDown={handlePctKeyDown}
              />
              {row.performances && row.performances.length > 0 && (
                <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>
                  Rec: {round2(row.performances.reduce((s, p) => s + p.userPercentage, 0)).toFixed(2)}%
                </p>
              )}
            </>
          )}
        </td>

        {/* $ ganado acumulado en el ciclo hasta este mes */}
        <td style={{ padding: "10px 14px", textAlign: "right" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: hasGain ? GREEN : hasLoss ? RED : "rgba(255,255,255,0.4)" }}>
            {hasGain ? "+" : ""}{fmt(gainAmount)}
          </span>
          {row.cycleNumber !== null && (
            <p style={{ margin: "2px 0 0", fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>
              acum. {round2(cycleAccPct).toFixed(2)}%
            </p>
          )}
        </td>

        {/* Capital final proyectado del ciclo */}
        <td style={{ padding: "10px 14px", textAlign: "right" }}>
          <span style={{ fontSize: "0.9rem", fontWeight: 700, color: row.isCycleEnd ? GOLD : "#fff" }}>
            ${fmt(capitalEnd)}
          </span>
        </td>

      </tr>
    </>
  );
});

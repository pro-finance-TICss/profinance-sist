"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import type { HistoricalEntry } from "@/lib/actions/historical-recalculation";

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface RowState extends HistoricalEntry {
  isManualCapital: boolean; // true si el superadmin editó el capital
  suggestedCapital: number; // capital recomendado calculado automáticamente
}

interface Props {
  row: RowState;
  index: number;
  onChange: (index: number, updated: Partial<RowState>) => void;
}

// ── Colores constantes ────────────────────────────────────────────────────────
const GOLD   = "#bd8e48";
const GREEN  = "#00c97a";
const RED    = "#e05c5c";
const AMBER  = "rgba(255,190,50,0.8)";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Redondea a 2 decimales */
const round2 = (v: number) => Math.round(v * 100) / 100;

const MONTH_LABELS: Record<string, string> = {
  "01": "Enero","02": "Febrero","03": "Marzo","04": "Abril",
  "05": "Mayo","06": "Junio","07": "Julio","08": "Agosto",
  "09": "Septiembre","10": "Octubre","11": "Noviembre","12": "Diciembre",
};

// ── Componente (memoizado para evitar re-renders en cascada) ──────────────────
//
// CLAVE DE RENDIMIENTO:
//   Cada fila mantiene su propio estado local de los inputs (localCapital,
//   localPct). Los cambios se aplican al estado global del Wizard SOLO al
//   hacer blur o presionar Enter, no en cada tecla.
//   React.memo evita re-renders si las props no cambiaron.

export const HistoricalMonthRow = memo(function HistoricalMonthRow({ row, index, onChange }: Props) {
  const [, mm] = row.month.split("-");
  const [year] = row.month.split("-");
  const monthLabel = `${MONTH_LABELS[mm]} ${year}`;

  // Estado local: permite escritura libre sin disparar re-renders del padre
  const [localCapital, setLocalCapital] = useState(String(row.capitalBase));
  const [localPct,     setLocalPct]     = useState(String(row.userPercentage));
  const [localNote,    setLocalNote]    = useState(row.note ?? "");

  // Sincronizar si el padre actualiza el capital (propagación automática)
  useEffect(() => {
    setLocalCapital(String(row.capitalBase));
  }, [row.capitalBase]);

  useEffect(() => {
    setLocalPct(String(row.userPercentage));
  }, [row.userPercentage]);

  useEffect(() => {
    setLocalNote(row.note ?? "");
  }, [row.note]);

  // Commit al perder el foco → redondeamos a 2 decimales
  const commitCapital = useCallback(() => {
    const val = round2(parseFloat(localCapital) || 0);
    setLocalCapital(String(val));
    onChange(index, {
      capitalBase: val,
      isManualCapital: val !== row.suggestedCapital,
    });
  }, [localCapital, index, onChange, row.suggestedCapital]);

  const commitPct = useCallback(() => {
    const val = round2(parseFloat(localPct) || 0);
    setLocalPct(String(val));
    onChange(index, { userPercentage: val });
  }, [localPct, index, onChange]);

  const commitNote = useCallback(() => {
    if (localNote !== (row.note ?? "")) {
      onChange(index, { note: localNote });
    }
  }, [localNote, index, onChange, row.note]);

  const handleCapitalKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") commitCapital(); },
    [commitCapital]
  );
  const handlePctKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") commitPct(); },
    [commitPct]
  );
  const handleNoteKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") commitNote(); },
    [commitNote]
  );

  const gainAmount = row.capitalBase * (row.userPercentage / 100);
  const capitalEnd = row.capitalBase + gainAmount;
  const isManual   = row.isManualCapital;
  const hasGain    = gainAmount > 0;
  const hasLoss    = gainAmount < 0;

  const rowBg = isManual
    ? "rgba(255,190,50,0.05)"
    : "rgba(255,255,255,0.015)";

  const rowBorder = isManual
    ? "1px solid rgba(255,190,50,0.2)"
    : "1px solid transparent";

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
    <tr className="historical-row" style={{ background: rowBg, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      {/* Mes */}
      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isManual ? AMBER : "rgba(255,255,255,0.8)" }}>
          {monthLabel}
        </span>
        {isManual && (
          <span style={{ marginLeft: 6, fontSize: "0.68rem", color: AMBER }}>● manual</span>
        )}
      </td>

      {/* Capital base (editable) */}
      <td style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number"
            min={0}
            step={0.01}
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
            >
              ↺
            </button>
          )}
        </div>
        {isManual && (
          <p style={{ margin: "3px 0 0", fontSize: "0.68rem", color: "rgba(255,190,50,0.6)" }}>
            Rec: ${fmt(row.suggestedCapital)}
          </p>
        )}
      </td>

      {/* % usuario (editable) */}
      <td style={{ padding: "8px 10px" }}>
        <input
          type="number"
          step={0.01}
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
      </td>

      {/* $ ganado (calculado) */}
      <td style={{ padding: "10px 14px", textAlign: "right" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: hasGain ? GREEN : hasLoss ? RED : "rgba(255,255,255,0.4)" }}>
          {hasGain ? "+" : ""}{fmt(gainAmount)}
        </span>
      </td>

      {/* Capital final (calculado) */}
      <td style={{ padding: "10px 14px", textAlign: "right" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
          ${fmt(capitalEnd)}
        </span>
      </td>

      {/* Nota (editable) */}
      <td style={{ padding: "8px 10px" }}>
        <input
          type="text"
          placeholder="Nota opcional..."
          value={localNote}
          maxLength={120}
          style={{ ...inputStyle, textAlign: "left", fontSize: "0.78rem", fontWeight: 400, color: "rgba(255,255,255,0.6)" }}
          onChange={(e) => setLocalNote(e.target.value)}
          onBlur={commitNote}
          onKeyDown={handleNoteKeyDown}
        />
      </td>
    </tr>
  );
});

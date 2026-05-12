"use client";

// ============================================================================
// TABLA DE RENDIMIENTOS — PRO-FINANCE
// ============================================================================
// Muestra los movimientos de rendimiento de una cuenta de inversión.
//
// Props:
//   isHighRisk   — determina qué targetRole se consulta (USER | SOCIO)
//   selectedMonth — "YYYY-MM" — filtra los movimientos por mes
//
// Diseño:
//   - Columnas: Par, Divisas, Tipo, Fecha, %
//   - Filtrado por mes en frontend (datos cargados una vez)
//   - Totalizador del mes filtrado
// ============================================================================

import React, { useEffect, useState, useMemo } from "react";
import { getDashboardPerformances } from "@/lib/actions/performance";
import * as Flags from "country-flag-icons/react/3x2";
import { TrendingUp } from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface Performance {
  id: string;
  currency1: string;
  currency2: string;
  type: string;
  percentage: number;
  startDate: string; // ISO string serializado
  endDate?: string | null;
  status: string;
  targetRole: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CAD: "CA",
  AUD: "AU", CHF: "CH", CNY: "CN", NZD: "NZ", MXN: "MX",
  COP: "CO", BRL: "BR", ARS: "AR", CLP: "CL", PEN: "PE",
};

// ============================================================================
// HELPERS
// ============================================================================

function getFlag(currency: string) {
  const countryCode = CURRENCY_TO_COUNTRY[currency];
  if (!countryCode) return null;
  const FlagComponent = (Flags as any)[countryCode];
  return FlagComponent ? (
    <FlagComponent style={{ width: 22, borderRadius: 2, flexShrink: 0 }} />
  ) : null;
}

function formatDate(isoStr: string): string {
  const date = new Date(isoStr);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


// ============================================================================
// PROPS
// ============================================================================

interface PerformanceTableProps {
  /** Flag de la cuenta activa: true = AR (targetRole SOCIO), false = Normal (targetRole USER) */
  isHighRisk: boolean;
  /** Mes seleccionado "YYYY-MM" — controlado por el padre para que afecte la gráfica también */
  selectedMonth: string;
  /** Callback cuando el usuario cambia el mes */
  onMonthChange: (month: string) => void;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function PerformanceTable({ isHighRisk, selectedMonth, onMonthChange }: PerformanceTableProps) {
  const [allData, setAllData] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar todos los rendimientos (sin filtrar — lo hacemos en JS)
  useEffect(() => {
    setLoading(true);
    getDashboardPerformances(isHighRisk).then((res: any[]) => {
      setAllData(
        res.map((r) => ({
          ...r,
          startDate: r.startDate instanceof Date ? r.startDate.toISOString() : String(r.startDate),
          endDate: r.endDate
            ? r.endDate instanceof Date
              ? r.endDate.toISOString()
              : String(r.endDate)
            : null,
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isHighRisk]);

  // Filtrar por mes seleccionado
  const filteredData = useMemo(() => {
    return allData.filter((item) => {
      const d = new Date(item.startDate);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return ym === selectedMonth;
    });
  }, [allData, selectedMonth]);

  // Total del mes
  const totalPercentage = filteredData.reduce((sum, item) => sum + (item.percentage || 0), 0);
  const isPositive = totalPercentage >= 0;

  return (
    <div
      style={{
        background: "#080808",
        borderRadius: "20px",
        border: "1px solid rgba(189,142,72,0.2)",
        overflow: "hidden",
      }}
    >
      {/* ── Encabezado ── */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Título + total */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <TrendingUp size={16} color="rgba(189,142,72,0.8)" />
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "1.1px",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            Movimientos de Rendimiento
          </span>
          {!loading && (
            <span
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                color: isPositive ? "#10b981" : "#ef4444",
                marginLeft: "4px",
              }}
            >
              {totalPercentage > 0 ? "+" : ""}
              {totalPercentage.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* ── Tabla ── */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: "0.875rem" }}>
          Cargando rendimientos…
        </div>
      ) : filteredData.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.875rem" }}>
          Sin movimientos de rendimiento en este mes.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "separate",
              borderSpacing: "0",
            }}
          >
            <thead>
              <tr>
                {["Par", "Divisas", "Tipo", "Fecha", "%"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 16px",
                      textAlign: i >= 3 ? "center" : "left",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.8px",
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => {
                const pct = item.percentage;
                const isGain = pct > 0;
                const isLoss = pct < 0;
                const pctColor = isGain ? "#10b981" : isLoss ? "#ef4444" : "rgba(255,255,255,0.4)";
                const isLast = idx === filteredData.length - 1;

                return (
                  <tr
                    key={item.id}
                    style={{
                      transition: "background 0.12s ease",
                    }}
                    className="perf-row"
                  >
                    {/* Par (banderas) */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {getFlag(item.currency1)}
                        {getFlag(item.currency2)}
                      </div>
                    </td>

                    {/* Divisas */}
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#fff",
                        fontWeight: 500,
                        fontSize: "0.875rem",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.currency1}
                      <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 5px" }}>/</span>
                      {item.currency2}
                    </td>

                    {/* Tipo */}
                    <td
                      style={{
                        padding: "12px 16px",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "5px",
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.7)",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                        }}
                      >
                        {item.type}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "0.8rem",
                        textAlign: "center",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(item.startDate)}
                    </td>

                    {/* Porcentaje */}
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "center",
                        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: pctColor,
                        }}
                      >
                        {isGain ? "+" : isLoss ? "−" : ""}
                        {Math.abs(pct).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .perf-row:hover td { background: rgba(255,255,255,0.025); }
      `}</style>
    </div>
  );
}

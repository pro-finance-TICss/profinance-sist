"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  BarChart, Bar, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  getPerformancesByTarget,
  createPerformance,
  deletePerformance,
  finalizePerformance,
} from "@/lib/actions/performance";
import * as Flags from "country-flag-icons/react/3x2";
import { logger } from "@/lib/logger";

// ── Tooltip extraído fuera del componente (evita re-creación en cada render) ─

const C_GAIN    = "#10b981";
const C_LOSS    = "#ef4444";
const C_NEUTRAL = "rgba(255,255,255,0.2)";

interface BarPoint {
  day: number;
  value: number;
}

function PerfTooltip({
  active, payload, selectedMonth,
}: {
  active?: boolean;
  payload?: any[];
  selectedMonth: string;
}) {
  if (!active || !payload?.length) return null;
  const point: BarPoint = payload[0].payload;
  const val = point.value;
  const color = val > 0 ? C_GAIN : val < 0 ? C_LOSS : C_NEUTRAL;
  const [y, m] = selectedMonth.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, point.day)
    .toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div style={{
      background: "rgba(8,8,8,0.96)", border: `1px solid ${color}40`,
      borderRadius: 10, padding: "10px 14px", minWidth: 160,
      boxShadow: `0 0 12px ${color}20`,
    }}>
      <p style={{ margin: "0 0 5px", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>{dateLabel}</p>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>
        {val > 0 ? "+" : val < 0 ? "−" : ""}{Math.abs(val).toFixed(2)}%
      </p>
    </div>
  );
}

function PerformanceBarChart({
  performances, selectedMonth,
}: {
  performances: Performance[];
  selectedMonth: string;
}) {
  // Filtrar COMPLETED con % y agrupar por día sumando
  const points = useMemo<BarPoint[]>(() => {
    const dayMap = new Map<string, number>();

    performances
      .filter(p => p.status === "COMPLETED" && p.percentage != null)
      .forEach(p => {
        const d = p.startDate;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        dayMap.set(key, (dayMap.get(key) ?? 0) + (p.percentage ?? 0));
      });

    // Rellenar todos los días del mes seleccionado
    const [y, m] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const result: BarPoint[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const value = dayMap.get(key) ?? 0;
      result.push({ day, value });
    }
    return result;
  }, [performances, selectedMonth]);

  const hasData = points.some(p => p.value !== 0);

  // Curried para pasar selectedMonth sin violar reglas de hooks
  const renderTooltip = (props: any) => (
    <PerfTooltip {...props} selectedMonth={selectedMonth} />
  );

  return (
    <div style={{
      background: "#080808", borderRadius: 20,
      border: "1px solid rgba(189,142,72,0.25)",
      padding: "24px 24px 16px", marginBottom: 24,
      position: "relative", overflow: "hidden",
    }}>
      {/* Decoración de fondo */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
        opacity: 0.1, pointerEvents: "none",
      }} />

      {/* Cabecera */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, position: "relative", zIndex: 1 }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.1px", color: "rgba(189,142,72,0.85)" }}>
            Evolución de Rendimiento
          </p>
        </div>
      </div>

      {/* Gráfica */}
      <div style={{ height: 220, position: "relative", zIndex: 1 }}>
        {!hasData ? (
          <div style={{
            height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px dashed rgba(255,255,255,0.07)", borderRadius: 12,
          }}>
            <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.85rem" }}>
              Sin operaciones concretadas en este mes
            </p>
          </div>
        ) : (
          <div style={{
            height: "100%", borderRadius: 12,
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "12px 4px 4px", position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at top center, rgba(189,142,72,0.04) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />
            <ResponsiveContainer width="100%" height="100%" style={{ outline: "none" }}>
              <BarChart data={points} margin={{ top: 2, right: 8, left: 0, bottom: 0 }} barSize={8} barCategoryGap="8%" style={{ outline: "none" }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <CartesianGrid strokeDasharray="0" stroke="rgba(255,255,255,0.1)" vertical={false}
                  horizontalCoordinatesGenerator={(props: any) => {
                    const y0 = props?.yAxis?.scale?.(0);
                    return isFinite(y0) ? [y0] : [];
                  }} />
                <XAxis 
                  dataKey="day"
                  tickFormatter={(day) => {
                    // Solo mostrar el día 1, múltiplos de 5, y el último día aproximado
                    return day === 1 || day % 5 === 0 || day >= 28 ? String(day) : "";
                  }}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  axisLine={false} tickLine={false} width={48} />
                <Tooltip content={renderTooltip} cursor={false} isAnimationActive={false} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {points.map((p, i) => (
                    <Cell key={i}
                      fill={p.value > 0 ? C_GAIN : p.value < 0 ? C_LOSS : C_NEUTRAL}
                      fillOpacity={p.value === 0 ? 0.15 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}


interface Performance {
  id: string;
  currency1: string;
  currency2: string;
  type: string;
  percentage?: number | null;
  startDate: Date;
  endDate?: Date | null;
  status: string;
  targetRole: string;
}

const CURRENCY_OPTIONS = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY",
  "NZD", "MXN", "COP", "BRL", "ARS", "CLP", "PEN"
];

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US", EUR: "EU", GBP: "GB", JPY: "JP", CAD: "CA",
  AUD: "AU", CHF: "CH", CNY: "CN", NZD: "NZ", MXN: "MX",
  COP: "CO", BRL: "BR", ARS: "AR", CLP: "CL", PEN: "PE",
};

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<"USER" | "SOCIO">("USER");
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [finalizeId, setFinalizeId] = useState<string | null>(null);
  const [finalizeData, setFinalizeData] = useState({
    endDate: new Date().toISOString().split("T")[0],
    percentage: 0,
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Form state
  const [formData, setFormData] = useState({
    currency1: "USD",
    currency2: "EUR",
    type: "COMPRA",
    startDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    loadPerformances();
  }, [activeTab]);

  const loadPerformances = async () => {
    setLoading(true);
    try {
      const data = await getPerformancesByTarget(activeTab);
      setPerformances(
        data.map((p: any) => ({
          ...p,
          startDate: new Date(p.startDate),
          endDate: p.endDate ? new Date(p.endDate) : null,
        }))
      );
    } catch (error) {
      logger.error("Error loading performances:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // split the string to avoid UTC-parsing which shifts the date in local timezone
      const [year, month, day] = formData.startDate.split("-").map(Number);
      const dateVal = new Date(year, month - 1, day, 12, 0, 0, 0);

      await createPerformance({
        currency1: formData.currency1,
        currency2: formData.currency2,
        type: formData.type,
        startDate: dateVal,
        targetRole: activeTab,
      });
      setShowForm(false);
      setFormData({
        currency1: "USD",
        currency2: "EUR",
        type: "COMPRA",
        startDate: new Date().toISOString().split("T")[0],
      });
      loadPerformances();
    } catch (error) {
      logger.error("Error creating performance:", error);
      alert("Error al crear el registro de rendimiento");
    }
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizeId) return;
    try {
      // split the string to avoid UTC-parsing which shifts the date in local timezone
      const [year, month, day] = finalizeData.endDate.split("-").map(Number);
      const dateVal = new Date(year, month - 1, day, 12, 0, 0, 0);

      const result = await finalizePerformance(finalizeId, dateVal, finalizeData.percentage);
      if (result.success) {
        setFinalizeId(null);
        loadPerformances();
      } else {
        alert(result.message);
      }
    } catch (error) {
      logger.error("Error finalizing:", error);
      alert("Error al finalizar rendimiento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await deletePerformance(id);
      loadPerformances();
    } catch (error) {
      logger.error("Error deleting performance:", error);
      alert("Error al eliminar el registro");
    }
  };

  const getFlag = (currency: string) => {
    const countryCode = CURRENCY_TO_COUNTRY[currency];
    if (!countryCode) return null;
    const FlagComponent = (Flags as any)[countryCode];
    return FlagComponent ? (
      <FlagComponent style={{ width: 24, borderRadius: 2 }} />
    ) : null;
  };

  const filteredPerformances = performances.filter((item) => {
    // Filter by the selected month using startDate
    const yyyyMm = `${item.startDate.getFullYear()}-${String(item.startDate.getMonth() + 1).padStart(2, '0')}`;
    return yyyyMm === selectedMonth;
  });

  // Calculate total percentage for current filtered items
  const totalPercentage = filteredPerformances.reduce(
    (sum, item) => sum + (item.percentage || 0),
    0
  );

  // Month options (last 12 months for example)
  const monthOptions: { value: string; label: string }[] = [];
  const currD = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(currD.getFullYear(), currD.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase();
    monthOptions.push({ value: val, label });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", color: "#fff", margin: 0 }}>
            Gestión de Rendimiento
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem" }}>
            Administra los rendimientos visibles para usuarios y socios
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 24px",
            backgroundColor: "#bd8e48",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#d4a356";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#bd8e48";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <Plus size={20} />
          Nuevo Registro
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "30px",
          borderBottom: "1px solid rgba(189, 142, 72, 0.2)",
        }}
      >
        <button
          onClick={() => setActiveTab("USER")}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            color: activeTab === "USER" ? "#bd8e48" : "rgba(255,255,255,0.5)",
            border: "none",
            borderBottom:
              activeTab === "USER" ? "2px solid #bd8e48" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s",
          }}
        >
          Rendimiento Normal
        </button>
        <button
          onClick={() => setActiveTab("SOCIO")}
          style={{
            padding: "12px 24px",
            backgroundColor: "transparent",
            color: activeTab === "SOCIO" ? "#bd8e48" : "rgba(255,255,255,0.5)",
            border: "none",
            borderBottom:
              activeTab === "SOCIO" ? "2px solid #bd8e48" : "2px solid transparent",
            cursor: "pointer",
            fontWeight: "600",
            transition: "all 0.3s",
          }}
        >
          Rendimiento Alto Riesgo (AR)
        </button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "10px",
              backgroundColor: "#111",
              border: "1px solid rgba(189, 142, 72, 0.3)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.9rem",
            }}
          >
            <option value="all">Ver Todos</option>
            {monthOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div
          style={{
            background: "#080808",
            borderRadius: "16px",
            border: "1px solid rgba(189, 142, 72, 0.3)",
            padding: "30px",
            marginBottom: "30px",
          }}
        >
          <h3
            style={{
              color: "#bd8e48",
              fontSize: "1.2rem",
              marginBottom: "20px",
            }}
          >
            Nuevo Registro - {activeTab === "USER" ? "Usuarios" : "Alto Riesgo (AR)"}
          </h3>
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  Divisa 1
                </label>
                <style jsx>{`
                    select option {
                      background-color: #111;
                      color: #fff;
                    }
                  `}</style>
                <select
                  value={formData.currency1}
                  onChange={(e) =>
                    setFormData({ ...formData, currency1: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#111", // Changed from transparent to solid
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                  }}
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  Divisa 2
                </label>
                <select
                  value={formData.currency2}
                  onChange={(e) =>
                    setFormData({ ...formData, currency2: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#111", // Solid dark background
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                  }}
                >
                  {CURRENCY_OPTIONS.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "#111", // Solid dark background
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                  }}
                >
                  <option value="COMPRA">COMPRA</option>
                  <option value="VENTA">VENTA</option>
                </select>
              </div>



              <div>
                <label
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "8px",
                    fontSize: "0.9rem",
                  }}
                >
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "1rem",
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#bd8e48",
                  border: "none",
                  borderRadius: "8px",
                  color: "#000",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gráfica de rendimiento del mes */}
      <PerformanceBarChart performances={filteredPerformances} selectedMonth={selectedMonth} />

      {/* Table */}
      <div
        style={{
          background: "#080808",
          borderRadius: "16px",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          padding: "30px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h3
            style={{
              color: "rgba(189, 142, 72, 0.8)",
              fontSize: "0.9rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "8px",
            }}
          >
            Historial de Operaciones
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <span
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "0.85rem",
              }}
            >
              Rendimiento Total:
            </span>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                color: totalPercentage >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {totalPercentage > 0 ? "+" : ""}
              {totalPercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            Cargando...
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
              }}
            >
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "8px" }}>Par</th>
                  <th style={{ padding: "8px" }}>Divisa 1</th>
                  <th style={{ padding: "8px" }}>Divisa 2</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Tipo</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Inicio</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Término</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Estado</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>%</th>
                  <th style={{ padding: "8px", textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPerformances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                      }}
                    >
                      No hay registros en este periodo. Crea uno nuevo para comenzar.
                    </td>
                  </tr>
                ) : (
                  filteredPerformances.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "8px",
                      }}
                    >
                      <td
                        style={{
                          padding: "12px",
                          display: "flex",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        {getFlag(item.currency1)}
                        {getFlag(item.currency2)}
                      </td>
                      <td style={{ padding: "12px", color: "white" }}>
                        {item.currency1}
                      </td>
                      <td style={{ padding: "12px", color: "white" }}>
                        {item.currency2}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            background: "rgba(255, 255, 255, 0.1)",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                          }}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.startDate.toLocaleDateString("es-ES")}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.endDate ? item.endDate.toLocaleDateString("es-ES") : "—"}
                      </td>
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {item.status === 'PENDING' ? (
                          <span style={{
                            color: '#eab308', background: 'rgba(234, 179, 8, 0.15)',
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'
                          }}>En Espera</span>
                        ) : (
                          <span style={{
                            color: '#10b981', background: 'rgba(16, 185, 129, 0.15)',
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold'
                          }}>Concretado</span>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          fontWeight: "bold",
                          color: item.status === 'COMPLETED' ? (item.percentage! >= 0 ? "#10b981" : "#ef4444") : "rgba(255,255,255,0.3)",
                        }}
                      >
                        {item.status === 'COMPLETED' ? (
                          <>{item.percentage! > 0 ? "+" : ""}{item.percentage}%</>
                        ) : "-"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {item.status === 'PENDING' && (
                            <button
                              onClick={() => setFinalizeId(item.id)}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                borderRadius: "6px",
                                color: "#10b981",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                                transition: "all 0.3s",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.2)"}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(16, 185, 129, 0.1)"}
                            >
                              Finalizar
                            </button>
                          )}
                          <button
                            title={item.status === 'COMPLETED' ? "Eliminar registro concretado (los saldos NO se revierten automáticamente)" : "Eliminar registro"}
                            onClick={() => {
                              const msg = item.status === 'COMPLETED'
                                ? `⚠️ ATENCIÓN: Este registro ya fue CONCRETADO.\n\nEl rendimiento ya fue aplicado a los balances de las cuentas y NO se revertirá automáticamente.\n\nDeberás quitar el dinero manualmente desde Gestión de Usuarios.\n\n¿Confirmas eliminar el registro?`
                                : `¿Confirmas eliminar este registro de rendimiento?`;
                              if (window.confirm(msg)) handleDelete(item.id);
                            }}
                            style={{
                              padding: "6px 8px",
                              backgroundColor: item.status === 'COMPLETED' ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
                              border: `1px solid ${item.status === 'COMPLETED' ? "rgba(239, 68, 68, 0.5)" : "rgba(239, 68, 68, 0.3)"}`,
                              borderRadius: "6px",
                              color: "#ef4444",
                              cursor: "pointer",
                              transition: "all 0.3s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = item.status === 'COMPLETED' ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {finalizeId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#0d0d0d", borderRadius: "16px", padding: "30px", width: "100%", maxWidth: "420px",
            border: "1px solid rgba(189, 142, 72, 0.3)"
          }}>
            <h3 style={{ color: "#bd8e48", margin: "0 0 20px 0" }}>Finalizar Rendimiento</h3>

            <div style={{ padding: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", marginBottom: "20px" }}>
              <p style={{ margin: 0, color: "#ef4444", fontSize: "0.85rem", lineHeight: 1.5 }}>
                <strong>ATENCIÓN:</strong> Al concretar se calculará capital compuesto directo sobre las cuentas afectadas. Su uso es sumamente cuidadoso e irreversible.
              </p>
            </div>

            <form onSubmit={handleFinalize}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>Fecha de Término</label>
                <input
                  type="date"
                  value={finalizeData.endDate}
                  onChange={e => setFinalizeData({ ...finalizeData, endDate: e.target.value })}
                  style={{ width: "100%", padding: "10px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(189,142,72,0.3)", borderRadius: "8px", color: "#fff" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", color: "rgba(255,255,255,0.7)", marginBottom: "8px" }}>Porcentaje Compuesto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  value={finalizeData.percentage || ""}
                  onChange={e => setFinalizeData({ ...finalizeData, percentage: e.target.value === "" ? 0 : parseFloat(e.target.value) })}
                  style={{ width: "100%", padding: "10px", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(189,142,72,0.3)", borderRadius: "8px", color: "#fff" }}
                  required
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setFinalizeId(null)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "#fff", cursor: "pointer" }}>Cancelar</button>
                <button type="submit" style={{ padding: "10px 20px", background: "#10b981", border: "none", borderRadius: "8px", color: "#fff", fontWeight: "bold", cursor: "pointer" }}>Concretar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

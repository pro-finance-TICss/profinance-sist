"use client";

import React, { useState, useEffect } from "react";
import { TrendingUp, Plus, Trash2 } from "lucide-react";
import {
  getPerformancesByTarget,
  createPerformance,
  deletePerformance,
} from "@/lib/actions/performance";
import * as Flags from "country-flag-icons/react/3x2";

interface Performance {
  id: string;
  currency1: string;
  currency2: string;
  type: string;
  percentage: number;
  date: Date;
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

  // Form state
  const [formData, setFormData] = useState({
    currency1: "USD",
    currency2: "EUR",
    type: "COMPRA",
    percentage: 0,
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
          date: new Date(p.date),
        }))
      );
    } catch (error) {
      console.error("Error loading performances:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPerformance({
        ...formData,
        targetRole: activeTab,
      });
      setShowForm(false);
      setFormData({
        currency1: "USD",
        currency2: "EUR",
        type: "COMPRA",
        percentage: 0,
      });
      loadPerformances();
    } catch (error) {
      console.error("Error creating performance:", error);
      alert("Error al crear el registro de rendimiento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este registro?")) return;
    try {
      await deletePerformance(id);
      loadPerformances();
    } catch (error) {
      console.error("Error deleting performance:", error);
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

  // Calculate total percentage for current tab
  const totalPercentage = performances.reduce(
    (sum, item) => sum + item.percentage,
    0
  );

  // Get current month date range (15th to 15th)
  const getMonthRange = () => {
    const now = new Date();
    const currentDay = now.getDate();

    let startDate, endDate;

    if (currentDay >= 15) {
      // From 15th of current month to 15th of next month
      startDate = new Date(now.getFullYear(), now.getMonth(), 15);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    } else {
      // From 15th of previous month to 15th of current month
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      endDate = new Date(now.getFullYear(), now.getMonth(), 15);
    }

    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

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
          Tabla USER
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
          Tabla SOCIO
        </button>
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
            Nuevo Registro de Rendimiento - {activeTab}
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
                  Porcentaje (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.percentage || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData({
                      ...formData,
                      percentage: value === "" ? 0 : parseFloat(value),
                    });
                  }}
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
            Rendimiento del mes ({getMonthRange()}) - {activeTab}
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
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>%</th>
                  <th style={{ padding: "8px" }}>Fecha</th>
                  <th style={{ padding: "8px" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {performances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#666",
                      }}
                    >
                      No hay registros. Crea uno nuevo para comenzar.
                    </td>
                  </tr>
                ) : (
                  performances.map((item) => (
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
                      <td style={{ padding: "12px" }}>
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
                          fontWeight: "bold",
                          color: item.percentage >= 0 ? "#10b981" : "#ef4444",
                        }}
                      >
                        {item.percentage > 0 ? "+" : ""}
                        {item.percentage}%
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {item.date.toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            padding: "8px",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "6px",
                            color: "#ef4444",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.3s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(239, 68, 68, 0.1)";
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

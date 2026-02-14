"use client";

import React, { useEffect, useState } from "react";
import { getDashboardPerformances } from "@/lib/actions/performance";
import { useAccount } from "@/contexts/AccountContext";
import * as Flags from "country-flag-icons/react/3x2";

interface Performance {
  id: string;
  currency1: string;
  currency2: string;
  type: string;
  percentage: number;
  date: Date;
}

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CAD: "CA",
  AUD: "AU",
  CHF: "CH",
  CNY: "CN",
  NZD: "NZ",
  MXN: "MX",
  COP: "CO",
  BRL: "BR",
  ARS: "AR",
  CLP: "CL",
  PEN: "PE",
};

export function PerformanceTable() {
  const [data, setData] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeAccount } = useAccount();

  // Re-fetch cuando cambie la cuenta activa (puede tener distinto rol)
  useEffect(() => {
    setLoading(true);
    const accountRole = activeAccount?.role;
    getDashboardPerformances(accountRole).then((res) => {
      const parsed = res.map((r: any) => ({
        ...r,
        date: new Date(r.date),
      }));
      setData(parsed);
      setLoading(false);
    });
  }, [activeAccount]);

  const getFlag = (currency: string) => {
    const countryCode = CURRENCY_TO_COUNTRY[currency];
    if (!countryCode) return null;
    const FlagComponent = (Flags as any)[countryCode];
    return FlagComponent ? (
      <FlagComponent style={{ width: 24, borderRadius: 2 }} />
    ) : null;
  };

  // Calculate total percentage
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0);

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
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  if (loading)
    return (
      <div
        style={{
          background: "#080808",
          borderRadius: "24px",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          padding: "30px",
          marginTop: "24px",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        Cargando rendimientos...
      </div>
    );

  return (
    <div
      style={{
        background: "#080808",
        borderRadius: "24px",
        border: "1px solid rgba(189, 142, 72, 0.3)",
        padding: "30px",
        marginTop: "24px",
        position: "relative",
        overflow: "hidden",
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
          Rendimiento del mes ({getMonthRange()})
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
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                  }}
                >
                  No hay registros recientes.
                </td>
              </tr>
            ) : (
              data.map((item) => (
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

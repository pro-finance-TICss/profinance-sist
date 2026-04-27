"use client";
import React from "react";
import { Wallet, BarChart3, PieChart } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyDisclaimer } from "@/components/dashboard/CurrencyDisclaimer";
import { useAccount } from "@/contexts/AccountContext";

// ============================================================================
// SUMMARY CARDS — FASE 3
// ============================================================================
// Fuente de datos: AccountContext (totalCapital, totalPendingWithdrawals).
// NO hace fetch propio. NO recalcula totales.
// ============================================================================

export function SummaryCards() {
  const { formatAmount } = useCurrency();
  const { totalCapital, totalPendingWithdrawals, isLoading } = useAccount();

  const metrics = [
    {
      label: "Capital Total",
      value: formatAmount(totalCapital),
      icon: <PieChart size={18} color="#bd8e48" />,
      trend: "Consolidado",
      trendColor: "rgba(189, 142, 72, 0.7)",
    },
    {
      label: "Monto solicitado para retiro",
      value: formatAmount(totalPendingWithdrawals),
      icon: <Wallet size={18} color="#00ff88" />,
      trend: "Pendientes",
      trendColor: "#00ff88",
    },
    {
      label: "Capital Disponible",
      value: formatAmount(Math.max(0, totalCapital - totalPendingWithdrawals)),
      icon: <BarChart3 size={18} color="#FFFFFF" />,
      trend: "Neto",
      trendColor: "rgba(189, 142, 72, 0.7)",
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        padding: "25px 0",
        backgroundColor: "transparent",
        borderBottom: "1px solid rgba(189, 142, 72, 0.1)",
        borderTop: "1px solid rgba(189, 142, 72, 0.1)",
        marginBottom: "15px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {metrics.map((item, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "18px",
              flex: "1 1 280px",
              padding: "10px",
            }}
          >
            {/* Icono discreto */}
            <div
              style={{
                minWidth: "45px",
                height: "45px",
                borderRadius: "12px",
                backgroundColor: "rgba(255,255,255,0.03)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {item.icon}
            </div>

            {/* Textos Informativos */}
            <div>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.85rem",
                  margin: "0 0 4px 0",
                  fontWeight: "400",
                }}
              >
                {item.label}
              </p>
              <div
                style={{ display: "flex", alignItems: "baseline", gap: "10px" }}
              >
                <span
                  style={{
                    color: "#FFFFFF",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {isLoading ? "..." : item.value}
                </span>
                <span
                  style={{
                    color: item.trendColor,
                    fontSize: "0.7rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {item.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Disclaimer Global */}
      <div style={{ maxWidth: "1200px", margin: "10px auto 0", padding: "0 10px" }}>
        <CurrencyDisclaimer className="bg-opacity-5 bg-white border-white/10 text-white/70 text-[10px] py-1" />
      </div>
    </div>
  );
}
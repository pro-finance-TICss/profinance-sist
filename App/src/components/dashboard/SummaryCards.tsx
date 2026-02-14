"use client";
import React, { useEffect, useState } from "react";
import { Wallet, BarChart3, PieChart } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { CurrencyDisclaimer } from "@/components/dashboard/CurrencyDisclaimer";
import { getDashboardPerformances } from "@/lib/actions/performance";
import { logger } from "@/lib/logger";

export function SummaryCards() {
  const { formatAmount } = useCurrency();
  const [data, setData] = useState({
    totalCapital: 0,
    pendingWithdrawals: 0,
    performancePercentage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch balance info
        const balanceRes = await fetch("/api/wallet/balance");
        const balanceData = await balanceRes.json();
        
        // 2. Fetch performance info
        const perfData = await getDashboardPerformances();
        const totalPerf = perfData.reduce((sum: number, item: any) => sum + item.percentage, 0);

        if (balanceData.balance) {
          setData({
            // Capital Total = investedCapital (balance único)
            totalCapital: balanceData.balance.investedCapital || 0,
            pendingWithdrawals: balanceData.balance.pendingWithdrawals || 0,
            performancePercentage: totalPerf,
          });
        }
      } catch (error) {
        logger.error("Error fetching summary data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = [
    {
      label: "Capital en Inversión",
      value: formatAmount(data.totalCapital),
      icon: <PieChart size={18} color="#bd8e48" />,
      trend: "Total Cuenta",
      color: "#bd8e48", // Dorado
      isCurrency: true
    },
    {
      label: "Monto solicitado para retiro",
      value: formatAmount(data.pendingWithdrawals),
      icon: <Wallet size={18} color="#00ff88" />,
      trend: "Pendientes",
      color: "#00ff88", // Verde
      isCurrency: true
    },
    {
      label: "Rendimiento Total",
      value: `${data.performancePercentage > 0 ? "+" : ""}${data.performancePercentage.toFixed(2)}%`,
      icon: <BarChart3 size={18} color="#FFFFFF" />,
      trend: "Histórico",
      color: "#FFFFFF", // Blanco
      isCurrency: false
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
                  {loading ? "..." : item.value}
                </span>
                <span
                  style={{
                    color: item.label.includes("retiro")
                      ? "#00ff88"
                      : "rgba(189, 142, 72, 0.7)",
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
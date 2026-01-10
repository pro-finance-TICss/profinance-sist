"use client";
import React, { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils/currency";

interface BalanceCardProps {
  investedCapital: number;
  availableBalance: number;
}

// Datos simulados para el gráfico (en producción vendría de la API)
const mockChartData = [
  { name: "Ene", balance: 0 },
  { name: "Feb", balance: 1200 },
  { name: "Mar", balance: 2800 },
  { name: "Abr", balance: 4100 },
  { name: "May", balance: 5600 },
  { name: "Jun", balance: 7200 },
];

export function BalanceCard({
  investedCapital,
  availableBalance,
}: BalanceCardProps) {
  const [timeRange, setTimeRange] = useState("6M");
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <style>
        {`
          @keyframes floatParticles {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          .balance-glass-container {
            position: relative;
            background: #080808;
            border-radius: 24px;
            border: 1px solid rgba(189, 142, 72, 0.3);
            overflow: hidden;
            padding: 30px;
            min-height: 450px;
            display: flex;
            flex-direction: column;
          }
          .balance-particles-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
            opacity: 0.15;
            pointer-events: none;
            animation: floatParticles 60s linear infinite;
            z-index: 0;
          }
          .balance-time-btn {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(189, 142, 72, 0.2);
            color: rgba(255, 255, 255, 0.5);
            padding: 6px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.7rem;
            font-weight: 700;
            transition: all 0.3s;
            text-transform: uppercase;
          }
          .balance-time-btn.active {
            background: #bd8e48;
            color: #000;
            border-color: #bd8e48;
            box-shadow: 0 0 15px rgba(189, 142, 72, 0.4);
          }
        `}
      </style>

      <div className="balance-glass-container">
        <div className="balance-particles-overlay" />

        {/* Header con balance */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: "20px",
          }}
        >
          <h3
            style={{
              color: "rgba(189, 142, 72, 0.8)",
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Balance Total
          </h3>
          <p
            style={{
              color: "#fff",
              margin: "8px 0 0 0",
              fontSize: "2.4rem",
              fontWeight: "800",
            }}
          >
            {formatCurrency(investedCapital)}
          </p>

          {/* Balance disponible */}
          <div
            style={{
              marginTop: "16px",
              padding: "12px 16px",
              background: "rgba(189, 142, 72, 0.05)",
              border: "1px solid rgba(189, 142, 72, 0.2)",
              borderRadius: "12px",
              display: "inline-block",
            }}
          >
            <p
              style={{
                color: "rgba(255, 255, 255, 0.6)",
                margin: 0,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Disponible para retiro
            </p>
            <p
              style={{
                color: "#bd8e48",
                margin: "4px 0 0 0",
                fontSize: "1.3rem",
                fontWeight: "700",
              }}
            >
              {formatCurrency(availableBalance)}
            </p>
          </div>
        </div>

        {/* Gráfico */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            width: "100%",
            marginTop: "20px",
            minHeight: "200px", // Fallback height
          }}
        >
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ left: -20 }}>
                <defs>
                  <linearGradient
                    id="colorBalanceWallet"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#bd8e48" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#bd8e48" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="0"
                  stroke="rgba(189, 142, 72, 0.08)"
                  vertical={true}
                />

                <XAxis
                  dataKey="name"
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  dy={10}
                />

                <YAxis
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `$${value}`}
                />

                <Tooltip
                  cursor={{ stroke: "#bd8e48", strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: "#000",
                    border: "1px solid #bd8e48",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#bd8e48" }}
                />

                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#bd8e48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBalanceWallet)"
                  dot={{ r: 4, fill: "#bd8e48", strokeWidth: 0 }}
                  activeDot={{
                    r: 6,
                    fill: "#fff",
                    stroke: "#bd8e48",
                    strokeWidth: 2,
                  }}
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: "100%", height: "100%" }} />
          )}
        </div>
      </div>
    </div>
  );
}

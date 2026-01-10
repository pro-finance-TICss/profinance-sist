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

// Datos simulados (los mismos que ya teníamos)
const dataSources: any = {
  "1D": [
    { name: "08:00", balance: 8000 },
    { name: "12:00", balance: 8150 },
    { name: "16:00", balance: 8050 },
    { name: "20:00", balance: 8200 },
  ],
  "1W": [
    { name: "Lun", balance: 4000 },
    { name: "Mar", balance: 3000 },
    { name: "Mie", balance: 5000 },
    { name: "Jue", balance: 4700 },
    { name: "Vie", balance: 6500 },
    { name: "Sab", balance: 5800 },
    { name: "Dom", balance: 8200 },
  ],
  "1M": [
    { name: "Sem 1", balance: 3500 },
    { name: "Sem 2", balance: 5200 },
    { name: "Sem 3", balance: 4800 },
    { name: "Sem 4", balance: 8200 },
  ],
  ALL: [
    { name: "2023", balance: 1000 },
    { name: "2024", balance: 4500 },
    { name: "2025", balance: 8200 },
  ],
};

export const BalanceSection = () => {
  const [timeRange, setTimeRange] = useState("1W");
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
                    .glass-container {
                        position: relative;
                        background: #080808;
                        border-radius: 24px;
                        border: 1px solid rgba(189, 142, 72, 0.3);
                        overflow: hidden;
                        padding: 30px;
                        height: 400px;
                        display: flex;
                        flex-direction: column;
                    }
                    .particles-overlay {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
                        opacity: 0.15;
                        pointer-events: none;
                        animation: floatParticles 60s linear infinite;
                        z-index: 0;
                    }
                    .time-btn {
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
                    .time-btn.active {
                        background: #bd8e48;
                        color: #000;
                        border-color: #bd8e48;
                        box-shadow: 0 0 15px rgba(189, 142, 72, 0.4);
                    }
                `}
      </style>

      <div className="glass-container">
        <div className="particles-overlay" />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
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
              Evolución del Capital
            </h3>
            <p
              style={{
                color: "#fff",
                margin: 0,
                fontSize: "2.4rem",
                fontWeight: "800",
              }}
            >
              $8,200.00
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "5px" }}>
            {["1D", "1W", "1M", "ALL"].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`time-btn ${timeRange === range ? "active" : ""}`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            width: "100%",
            minHeight: "200px",
          }}
        >
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataSources[timeRange]} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#colorBalance)"
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
};

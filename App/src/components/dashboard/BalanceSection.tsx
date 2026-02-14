"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";
import { logger } from "@/lib/logger";

// --- TIPOS ---
interface Transaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "REFUND";
  amount: number;
  status: string;
  createdAt: string;
}

interface BalanceData {
  investedCapital: number;
}

interface ChartDataPoint {
  date: string; // ISO string for sorting/filtering
  displayDate: string; // Formatted for axis
  balance: number;
  // Transaction info (optional, if this point maps to a specific tx)
  txType?: string;
  txAmount?: number;
}

// --- HELPER DATE FORMATS ---
const formatDate = (dateStr: string, range: string) => {
  const date = new Date(dateStr);
  if (range === "1D") {
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } else if (range === "1W" || range === "1M") {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  } else {
    // ALL
    return date.toLocaleDateString("es-ES", {
      month: "short",
      year: "2-digit",
    });
  }
};

export const BalanceSection = () => {
  const { formatAmount, convertAmount } = useCurrency();
  const [timeRange, setTimeRange] = useState("1W");
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<BalanceData>({
    investedCapital: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- EFECTOS ---
  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/transactions"),
      ]);

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data.balance);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        const txs = data.transactions || [];
        // Ordenar por fecha descendente (más reciente primero)
        setTransactions(
          txs.sort(
            (a: Transaction, b: Transaction) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      }
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- PROCESAMIENTO DE DATOS PARA EL GRÁFICO ---
  const chartData = useMemo(() => {
    if (transactions.length === 0 && balance.investedCapital === 0) return [];

    // 1. Reconstruir historia de balances (Backwards)
    // Empezamos con el balance actual
    let currentCapital = balance.investedCapital;

    // Puntos del gráfico. Empezamos con "Ahora"
    const history: ChartDataPoint[] = [];

    // Agregar punto final (actualidad) solo si no hay transacciones recientes que coincidan exactamente con "ahora"
    // Pero para simplificar, iteramos las transacciones.
    // Ojo: Si el usuario tiene balance pero 0 transacciones (ej. migración manual), mostramos línea plana.
    if (transactions.length === 0) {
      return [
        {
          date: new Date().toISOString(),
          displayDate: "Hoy",
          balance: convertAmount(currentCapital),
        },
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          displayDate: "Ayer",
          balance: convertAmount(currentCapital),
        },
      ];
    }

    // Iterar transacciones (necesitamos ir de más reciente a más antigua para restar)
    // Transactions ya está ordenado DESC.
    transactions.forEach((tx) => {
      // El balance EN este momento (después de la tx) es currentCapital.
      history.push({
        date: tx.createdAt,
        displayDate: formatDate(tx.createdAt, "ALL"), // Se ajustará luego en el map final
        balance: convertAmount(currentCapital),
        txType: tx.type,
        txAmount: convertAmount(tx.amount),
      });

      // Calcular balance ANTERIOR a esta tx
      if (tx.type === "DEPOSIT" || tx.type === "REFUND") {
        currentCapital -= Number(tx.amount);
      } else if (tx.type === "WITHDRAWAL") {
        currentCapital += Number(tx.amount);
      }
      // Evitar negativos por errores de redondeo o datos incompletos
      if (currentCapital < 0) currentCapital = 0;
    });

    // Agregar el punto inicial (el "cero" o el remanente antes de la primera tx registrada)
    const oldestTxDate = transactions[transactions.length - 1].createdAt;
    const initialDate = new Date(
      new Date(oldestTxDate).getTime() - 1000 * 60 * 60
    ).toISOString(); // 1 hora antes
    history.push({
      date: initialDate,
      displayDate: "",
      balance: convertAmount(currentCapital),
    });

    // 2. Ordenar cronológicamente (Ascendente) para el gráfico
    history.reverse();

    // 3. Filtrar por rango de tiempo
    const now = new Date();
    let cutoffDate = new Date(0); // Default ALL

    if (timeRange === "1D") {
      cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === "1W") {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "1M") {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let filtered = history.filter((p) => new Date(p.date) >= cutoffDate);

    // Si el filtro deja vacío (ej. no hube actividad en 1D),
    // mostramos al menos el último estado conocido dentro del rango (línea plana)
    if (filtered.length === 0 && history.length > 0) {
      // Buscar el último punto ANTES del cutoff
      const lastPointBeforeCutoff = [...history]
        .reverse()
        .find((p) => new Date(p.date) < cutoffDate);
      const val = lastPointBeforeCutoff
        ? lastPointBeforeCutoff.balance
        : convertAmount(balance.investedCapital);
      return [
        {
          date: cutoffDate.toISOString(),
          displayDate: "Inicio",
          balance: val,
        },
        {
          date: now.toISOString(),
          displayDate: "Ahora",
          balance: val,
        },
      ];
    }
    
    // Si solo hay un punto, agregar uno artificial para hacer una línea
    if (filtered.length === 1) {
       const p = filtered[0];
       const prevDate = new Date(new Date(p.date).getTime() - 1000 * 60 * 60); // 1h antes
       filtered.unshift({
           date: prevDate.toISOString(),
           displayDate: "",
           balance: p.balance // Asumimos mismo balance si no hubo tx
       });
    }

    // 4. Formatear fechas para el eje X según el rango seleccionado
    return filtered.map((p) => ({
      ...p,
      displayDate: formatDate(p.date, timeRange),
    }));
  }, [transactions, balance.investedCapital, timeRange, convertAmount]);

  // --- RENDER TOOLTIP ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as ChartDataPoint;
      return (
        <div
          style={{
            backgroundColor: "#000",
            border: "1px solid #bd8e48",
            borderRadius: "8px",
            padding: "10px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.75rem",
              margin: "0 0 5px 0",
            }}
          >
            {label}
            {/* Mostrar hora completa si es necesario */}
          </p>
          <p
            style={{
              color: "#bd8e48",
              fontSize: "1rem",
              fontWeight: "bold",
              margin: 0,
            }}
          >
            {formatAmount(point.balance, true)}
          </p>
          {point.txType && (
            <div style={{ marginTop: "8px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "5px" }}>
              <p
                style={{
                  color: point.txType === "WITHDRAWAL" ? "#f44336" : "#4caf50",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  margin: 0
                }}
              >
                {point.txType === "DEPOSIT" ? "Depósito" : point.txType === "WITHDRAWAL" ? "Retiro" : "Reembolso"}
              </p>
              <p style={{ color: "#fff", fontSize: "0.8rem", margin: 0 }}>
                 {point.txType === "WITHDRAWAL" ? "-" : "+"}{formatAmount(point.txAmount || 0, true)}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

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
              {isLoading ? "..." : formatAmount(balance.investedCapital)}
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
          {mounted && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 10 }}>
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
                  dataKey="displayDate"
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  dy={10}
                  interval="preserveStartEnd"
                />

                <YAxis
                  axisLine={{ stroke: "rgba(189, 142, 72, 0.2)" }}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => formatAmount(value, false)}
                />

                <Tooltip
                  cursor={{ stroke: "#bd8e48", strokeWidth: 1 }}
                  content={<CustomTooltip />}
                />

                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#bd8e48"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorBalance)"
                  dot={(props: any) => {
                      // Solo dibujar puntos si es una transacción real
                      const { cx, cy, payload } = props;
                      if (!payload.txType) return null;
                      return (
                          <circle cx={cx} cy={cy} r={4} fill="#bd8e48" stroke="none" />
                      );
                  }}
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
            <div style={{ width: "100%", height: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.2)' }}>
                    {isLoading ? "Cargando..." : "No hay datos para mostrar"}
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

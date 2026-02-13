"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/contexts/CurrencyContext";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

export function ActivitySection() {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch("/api/wallet/transactions");
        if (res.ok) {
          const data = await res.json();
          const sorted = (data.transactions || []).sort(
            (a: Transaction, b: Transaction) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setTransactions(sorted.slice(0, 5)); // Mostrar solo las 5 más recientes
        }
      } catch (error) {
        console.error("Error fetching activity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getTypeText = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "Depósito";
      case "WITHDRAWAL":
        return "Retiro";
      case "REFUND":
        return "Reembolso";
      default:
        return type;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Completado";
      case "PENDING":
        return "Pendiente";
      case "FAILED":
        return "Fallido";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return `Hoy, ${date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }

    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  };

  const getAmountColor = (type: string) => {
    return type === "DEPOSIT" || type === "REFUND" ? "#4caf50" : "#fff";
  };

  return (
    <div style={{ position: "relative" }}>
      <style>
        {`
                    @keyframes floatParticlesActivity {
                        0% { background-position: 0% 0%; }
                        100% { background-position: 100% 100%; }
                    }
                    .glass-container-activity {
                        position: relative;
                        background: #080808;
                        border-radius: 24px;
                        border: 1px solid rgba(189, 142, 72, 0.3);
                        overflow: hidden;
                        padding: 30px;
                        height: 400px;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    }
                    .particles-overlay-activity {
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
                        opacity: 0.15;
                        pointer-events: none;
                        animation: floatParticlesActivity 60s linear infinite;
                        z-index: 0;
                    }
                    .custom-scroll::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scroll::-webkit-scrollbar-thumb {
                        background: rgba(189, 142, 72, 0.2);
                        border-radius: 10px;
                    }
                    .custom-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(189, 142, 72, 0.2) transparent;
                    }
                `}
      </style>

      <div className="glass-container-activity">
        <div className="particles-overlay-activity" />

        <div style={{ position: "relative", zIndex: 2, marginBottom: "20px" }}>
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
            Actividad Reciente
          </h3>
        </div>

        <div
          className="custom-scroll"
          style={{
            position: "relative",
            zIndex: 1,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            overflowY: "auto",
            paddingRight: "8px",
          }}
        >
          {isLoading ? (
            <p
              style={{
                color: "rgba(255,255,255,0.3)",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              Cargando actividad...
            </p>
          ) : transactions.length === 0 ? (
            <p
              style={{
                color: "rgba(255,255,255,0.3)",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              No hay actividad reciente.
            </p>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 8px",
                  borderBottom: "1px solid rgba(189, 142, 72, 0.08)",
                  transition: "background 0.3s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "rgba(189, 142, 72, 0.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: "500",
                    }}
                  >
                    {getTypeText(tx.type)}
                  </span>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.75rem",
                    }}
                  >
                    {formatDate(tx.createdAt)}
                  </span>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      color: getAmountColor(tx.type),
                      fontSize: "0.95rem",
                      fontWeight: "700",
                    }}
                  >
                    {tx.type === "DEPOSIT" || tx.type === "REFUND"
                      ? "+"
                      : "-"}
                    {formatAmount(tx.amount, false)}
                  </span>
                  <span
                    style={{
                      color:
                        tx.status === "PENDING"
                          ? "#bd8e48"
                          : "rgba(255,255,255,0.2)",
                      fontSize: "0.65rem",
                      textTransform: "uppercase",
                      fontWeight: "700",
                    }}
                  >
                    {getStatusText(tx.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* BOTÓN RESTAURADO A TU ESTILO ORIGINAL */}
        <button
          className="btn-primary"
          onClick={() => router.push("/dashboard/transacciones")}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "0.8rem",
            cursor: "pointer",
          }}
        >
          Ver Historial completo
        </button>
      </div>
    </div>
  );
}
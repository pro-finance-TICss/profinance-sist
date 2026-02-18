"use client";
import React from "react";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function TransactionHistory({
  transactions,
  isLoading,
}: TransactionHistoryProps) {
  if (isLoading) {
    return (
      <div
        style={{
          background: "#080808",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "24px",
          padding: "30px",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          Cargando transacciones...
        </p>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle size={18} color="#4caf50" />;
      case "PENDING":
        return <Clock size={18} color="#ff9800" />;
      case "FAILED":
        return <XCircle size={18} color="#f44336" />;
      default:
        return <Clock size={18} color="#999" />;
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

  const getTypeIcon = (type: string) => {
    return type === "DEPOSIT" || type === "REFUND" || type === "COMMISSION" ? (
      <ArrowDownLeft size={20} color="#4caf50" />
    ) : (
      <ArrowUpRight size={20} color="#f44336" />
    );
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "DEPOSIT":
        return "Depósito";
      case "REFUND":
        return "Reembolso";
      case "COMMISSION":
        return "Comisión de Referido";
      default:
        return "Retiro";
    }
  };

  return (
    <div
      style={{
        background: "#080808",
        border: "1px solid rgba(189, 142, 72, 0.3)",
        borderRadius: "24px",
        padding: "30px",
        minHeight: "400px",
      }}
    >
      <h3
        style={{
          color: "rgba(189, 142, 72, 0.8)",
          fontSize: "0.9rem",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 24px 0",
        }}
      >
        Historial de Transacciones
      </h3>

      {transactions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          <p style={{ fontSize: "1rem", margin: 0 }}>
            No hay transacciones aún
          </p>
          <p style={{ fontSize: "0.85rem", margin: "8px 0 0 0" }}>
            Realiza tu primer depósito para comenzar
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                padding: "16px 20px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(189, 142, 72, 0.15)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(189, 142, 72, 0.05)";
                e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                e.currentTarget.style.borderColor = "rgba(189, 142, 72, 0.15)";
              }}
            >
              {/* Icono y tipo */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background:
                      tx.type === "DEPOSIT" || tx.type === "REFUND" || tx.type === "COMMISSION"
                        ? "rgba(76, 175, 80, 0.1)"
                        : "rgba(244, 67, 54, 0.1)",
                    border:
                      tx.type === "DEPOSIT" || tx.type === "REFUND" || tx.type === "COMMISSION"
                        ? "1px solid rgba(76, 175, 80, 0.3)"
                        : "1px solid rgba(244, 67, 54, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getTypeIcon(tx.type)}
                </div>

                <div>
                  <p
                    style={{
                      color: "#fff",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      margin: 0,
                    }}
                  >
                    {getTypeText(tx.type)}
                  </p>
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.75rem",
                      margin: "4px 0 0 0",
                    }}
                  >
                    {new Date(tx.createdAt).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Monto */}
              <div style={{ textAlign: "right", marginRight: "16px" }}>
                <p
                  style={{
                    color:
                      tx.type === "DEPOSIT" || tx.type === "REFUND" || tx.type === "COMMISSION"
                        ? "#4caf50"
                        : "#f44336",
                    fontSize: "1.1rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  {tx.type === "DEPOSIT" || tx.type === "REFUND" || tx.type === "COMMISSION" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </p>
              </div>

              {/* Estado */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background:
                    tx.status === "COMPLETED"
                      ? "rgba(76, 175, 80, 0.1)"
                      : tx.status === "PENDING"
                        ? "rgba(255, 152, 0, 0.1)"
                        : "rgba(244, 67, 54, 0.1)",
                  borderRadius: "8px",
                }}
              >
                {getStatusIcon(tx.status)}
                <span
                  style={{
                    color:
                      tx.status === "COMPLETED"
                        ? "#4caf50"
                        : tx.status === "PENDING"
                          ? "#ff9800"
                          : "#f44336",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  {getStatusText(tx.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

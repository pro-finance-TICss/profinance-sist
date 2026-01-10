"use client";
import React from "react";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string | null;
  notes?: string | null;
}

interface WithdrawalStatusProps {
  withdrawals: WithdrawalRequest[];
  isLoading?: boolean;
}

export function WithdrawalStatus({
  withdrawals,
  isLoading,
}: WithdrawalStatusProps) {
  if (isLoading) {
    return (
      <div
        style={{
          background: "#080808",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "24px",
          padding: "30px",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "rgba(255, 255, 255, 0.5)" }}>
          Cargando solicitudes...
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: {
        icon: <Clock size={16} />,
        text: "Pendiente",
        bg: "rgba(255, 152, 0, 0.1)",
        border: "rgba(255, 152, 0, 0.3)",
        color: "#ff9800",
      },
      APPROVED: {
        icon: <CheckCircle size={16} />,
        text: "Aprobado",
        bg: "rgba(76, 175, 80, 0.1)",
        border: "rgba(76, 175, 80, 0.3)",
        color: "#4caf50",
      },
      PAID: {
        icon: <CheckCircle size={16} />, // Doble check o similar
        text: "Pagado",
        bg: "rgba(189, 142, 72, 0.2)",
        border: "rgb(189, 142, 72)",
        color: "#bd8e48",
      },
      REJECTED: {
        icon: <XCircle size={16} />,
        text: "Rechazado",
        bg: "rgba(244, 67, 54, 0.1)",
        border: "rgba(244, 67, 54, 0.3)",
        color: "#f44336",
      },
    };

    const statusConfig =
      config[status as keyof typeof config] || config.PENDING;

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: statusConfig.bg,
          border: `1px solid ${statusConfig.border}`,
          borderRadius: "8px",
          color: statusConfig.color,
          fontSize: "0.75rem",
          fontWeight: "600",
        }}
      >
        {statusConfig.icon}
        {statusConfig.text}
      </div>
    );
  };

  return (
    <div
      style={{
        background: "#080808",
        border: "1px solid rgba(189, 142, 72, 0.3)",
        borderRadius: "24px",
        padding: "30px",
        minHeight: "300px",
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
        Solicitudes de Retiro
      </h3>

      {withdrawals.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          <p style={{ fontSize: "1rem", margin: 0 }}>
            No hay solicitudes de retiro
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {withdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              style={{
                padding: "20px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(189, 142, 72, 0.15)",
                borderRadius: "16px",
                transition: "all 0.3s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <p
                    style={{
                      color: "#fff",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      margin: "0 0 4px 0",
                    }}
                  >
                    {formatCurrency(withdrawal.amount)}
                  </p>
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.75rem",
                      margin: 0,
                    }}
                  >
                    Solicitado el{" "}
                    {new Date(withdrawal.requestedAt).toLocaleDateString(
                      "es-ES",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>

                {getStatusBadge(withdrawal.status)}
              </div>

              {withdrawal.processedAt && (
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontSize: "0.75rem",
                    margin: "8px 0 0 0",
                  }}
                >
                  Procesado el{" "}
                  {new Date(withdrawal.processedAt).toLocaleDateString(
                    "es-ES",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }
                  )}
                </p>
              )}

              {withdrawal.notes && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "rgba(189, 142, 72, 0.05)",
                    border: "1px solid rgba(189, 142, 72, 0.2)",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: "0.8rem",
                      margin: 0,
                      lineHeight: "1.5",
                    }}
                  >
                    <strong style={{ color: "#bd8e48" }}>Nota:</strong>{" "}
                    {withdrawal.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

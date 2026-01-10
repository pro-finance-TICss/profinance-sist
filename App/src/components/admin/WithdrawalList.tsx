"use client";
import React, { useState } from "react";
import { processWithdrawal } from "@/lib/actions/admin";
import { WithdrawalStatus } from "@/lib/enums";
import { Check, X, Clock, AlertTriangle } from "lucide-react";

export function WithdrawalList({ withdrawals }: { withdrawals: any[] }) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (id: string, status: WithdrawalStatus) => {
    if (!confirm(`¿Estás seguro de marcar esto como ${status}?`)) return;
    setProcessing(id);
    const res = await processWithdrawal(id, status);
    if (!res.success) {
      alert(res.message);
    }
    setProcessing(null);
  };

  console.log("Rendering WithdrawalList with:", withdrawals);
  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "20px" }}>
        Solicitudes de Retiro
      </h1>

      <div style={{ display: "grid", gap: "16px" }}>
        {withdrawals.length === 0 ? (
          <p style={{ color: "#666" }}>No hay solicitudes pendientes.</p>
        ) : null}

        {withdrawals.map((req) => (
          <div
            key={req.id}
            style={{
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff" }}
              >
                ${parseFloat(req.amount).toLocaleString()}{" "}
                <span style={{ fontSize: "0.9rem", color: "#666" }}>USD</span>
              </div>
              <div style={{ marginTop: "8px", color: "#888" }}>
                Solicitado por:{" "}
                <span style={{ color: "#bd8e48" }}>{req.user.email}</span>
              </div>
              <div
                style={{ marginTop: "4px", fontSize: "0.8rem", color: "#555" }}
              >
                {new Date(req.requestedAt).toLocaleString()} • P. Balance: $
                {parseFloat(req.user.availableBalance).toLocaleString()}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  backgroundColor:
                    req.status === "PENDING"
                      ? "#333"
                      : req.status === "APPROVED"
                      ? "#064e3b"
                      : "#450a0a",
                  color:
                    req.status === "PENDING"
                      ? "#fff"
                      : req.status === "APPROVED"
                      ? "#34d399"
                      : "#f87171",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                {req.status}
              </div>

              {/* Actions */}
              {(req.status === "PENDING" || req.status === "REVIEWED") && (
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() =>
                      handleAction(req.id, WithdrawalStatus.APPROVED)
                    }
                    disabled={processing === req.id}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#059669",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      gap: "5px",
                    }}
                  >
                    <Check size={18} /> Aprobar
                  </button>
                  <button
                    onClick={() =>
                      handleAction(req.id, WithdrawalStatus.REJECTED)
                    }
                    disabled={processing === req.id}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      background: "#dc2626",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      gap: "5px",
                    }}
                  >
                    <X size={18} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

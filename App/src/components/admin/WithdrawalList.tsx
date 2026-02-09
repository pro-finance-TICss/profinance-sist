"use client";
// ============================================================================
// COMPONENTE: LISTA DE SOLICITUDES DE RETIRO - PRO-FINANCE (SUPERADMIN)
// ============================================================================
// Muestra las solicitudes de retiro con información de cuenta bancaria.
// ============================================================================

import React, { useState } from "react";
import { processWithdrawal } from "@/lib/actions/admin";
import { WithdrawalStatus } from "@/lib/enums";
import { Check, X, CreditCard, User, Building2 } from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

interface BankAccountInfo {
  id: string;
  holderName: string;
  documentType: string;
  documentNumber: string;
  bankName: string;
  accountNumberLast4: string;
  fullAccountNumber?: string; // Decrypted number for SuperAdmin
  accountType: string;
  country: string;
}

interface WithdrawalRequestData {
  id: string;
  amount: string | number;
  status: string;
  requestedAt: string;
  user: {
    email: string;
    investedCapital: string | number;
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
  };
  bankAccount?: BankAccountInfo | null;
}

// ... helper functions ...
const getAccountTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    SAVINGS: "Ahorros",
    CHECKING: "Corriente",
    CLABE: "CLABE",
    DEBIT: "Débito",
  };
  return labels[type] || type;
};

const getCountryName = (code: string): string => {
  const names: Record<string, string> = {
    CO: "Colombia",
    MX: "México",
  };
  return names[code] || code;
};

export function WithdrawalList({
  withdrawals,
}: {
  withdrawals: WithdrawalRequestData[];
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAction = async (id: string, status: WithdrawalStatus) => {
    if (confirm(`¿Estás seguro de marcar esto como ${status}?`)) {
      setProcessing(id);
      const res = await processWithdrawal(id, status);
      if (!res.success) {
        alert(res.message);
      }
      setProcessing(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // 1. Logic hooks
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  const filteredWithdrawals = withdrawals.filter((req) => {
    // 1. Filter by Status
    if (statusFilter !== "ALL" && req.status !== statusFilter) return false;

    // 2. Filter by Date
    if (dateFilter) {
      // Create a date object from the request time
      const reqDate = new Date(req.requestedAt);

      // Get the YYYY-MM-DD part in the local timezone
      // Note: This relies on the browser's timezone, which matches the user's input
      const year = reqDate.getFullYear();
      const month = String(reqDate.getMonth() + 1).padStart(2, "0");
      const day = String(reqDate.getDate()).padStart(2, "0");
      const localDateString = `${year}-${month}-${day}`;

      if (localDateString !== dateFilter) return false;
    }

    return true;
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Solicitudes de Retiro</h1>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
              cursor: "pointer",
              colorScheme: "dark",
            }}
          />

          {(statusFilter !== "ALL" || dateFilter) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setDateFilter("");
              }}
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                backgroundColor: "rgba(255,255,255,0.1)",
                border: "none",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: "16px" }}>
        {filteredWithdrawals.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#666",
              backgroundColor: "#111",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p>No se encontraron solicitudes con los filtros actuales.</p>
          </div>
        ) : null}

        {filteredWithdrawals.map((req) => (
          <div
            key={req.id}
            style={{
              backgroundColor: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {/* Cabecera de la solicitud */}
            <div
              style={{
                padding: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => toggleExpand(req.id)}
            >
              <div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "bold",
                    color: "#fff",
                  }}
                  suppressHydrationWarning
                >
                  ${parseFloat(String(req.amount)).toLocaleString()}{" "}
                  <span style={{ fontSize: "0.9rem", color: "#666" }}>USD</span>
                </div>
                <div style={{ marginTop: "8px", color: "#888" }}>
                  Solicitado por:{" "}
                  <span style={{ color: "#fff", fontWeight: "600", display: "block" }}>
                    {req.user.firstName} {req.user.paternalSurname}{" "}
                    {req.user.maternalSurname}
                  </span>
                  <span style={{ color: "#bd8e48", fontSize: "0.85rem" }}>
                    {req.user.email}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: "4px",
                    fontSize: "0.8rem",
                    color: "#555",
                  }}
                  suppressHydrationWarning
                >
                  {new Date(req.requestedAt).toLocaleString()} • P. Balance: $
                  {parseFloat(
                    String(req.user.investedCapital)
                  ).toLocaleString()}
                </div>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: "20px" }}
              >
                {/* Indicador de cuenta bancaria */}
                {req.bankAccount && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(189, 142, 72, 0.1)",
                      border: "1px solid rgba(189, 142, 72, 0.2)",
                    }}
                  >
                    <CreditCard size={16} color="#bd8e48" />
                    <span style={{ color: "#bd8e48", fontSize: "0.85rem" }}>
                      ****{req.bankAccount.accountNumberLast4}
                    </span>
                  </div>
                )}

                {/* Estado */}
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

                {/* Acciones */}
                {(req.status === "PENDING" || req.status === "REVIEWED") && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(req.id, WithdrawalStatus.APPROVED);
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(req.id, WithdrawalStatus.REJECTED);
                      }}
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

            {/* Detalles expandibles de la cuenta bancaria */}
            {expandedId === req.id && req.bankAccount && (
              <div
                style={{
                  padding: "20px 24px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)",
                }}
              >
                <h4
                  style={{
                    color: "#bd8e48",
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    marginBottom: "16px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Datos de la Cuenta Bancaria
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {/* Titular */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <User size={14} color="#888" />
                      <span
                        style={{
                          color: "#888",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Titular
                      </span>
                    </div>
                    <p
                      style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}
                    >
                      {req.bankAccount.holderName}
                    </p>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.8rem",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {req.bankAccount.documentType}:{" "}
                      {req.bankAccount.documentNumber}
                    </p>
                  </div>

                  {/* Banco */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <Building2 size={14} color="#888" />
                      <span
                        style={{
                          color: "#888",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Banco
                      </span>
                    </div>
                    <p
                      style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}
                    >
                      {req.bankAccount.bankName}
                    </p>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.8rem",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {getCountryName(req.bankAccount.country)}
                    </p>
                  </div>

                  {/* Cuenta */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <CreditCard size={14} color="#888" />
                      <span
                        style={{
                          color: "#888",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Número de Cuenta
                      </span>
                    </div>
                    <p
                      style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}
                    >
                      {/* Show Full Number if available, else last 4 */}
                      {req.bankAccount.fullAccountNumber ? (
                        <span style={{ color: "#34d399", fontWeight: "bold" }}>
                          {req.bankAccount.fullAccountNumber}
                        </span>
                      ) : (
                        `****${req.bankAccount.accountNumberLast4}`
                      )}
                    </p>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.8rem",
                        margin: "4px 0 0 0",
                      }}
                    >
                      {getAccountTypeLabel(req.bankAccount.accountType)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje si no hay cuenta bancaria */}
            {expandedId === req.id && !req.bankAccount && (
              <div
                style={{
                  padding: "20px 24px",
                  borderTop: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#888",
                  fontSize: "0.9rem",
                }}
              >
                <em>Esta solicitud no tiene cuenta bancaria asociada.</em>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

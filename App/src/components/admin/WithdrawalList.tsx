"use client";
// ============================================================================
// COMPONENTE: LISTA DE SOLICITUDES DE RETIRO - PRO-FINANCE (SUPERADMIN)
// ============================================================================
// Muestra las solicitudes de retiro en 2 pestañas:
//   1. Retiros de Ahorros: solicitudes con cuenta bancaria (se aprueban/rechazan manualmente).
//   2. Dinero Congelado: solicitudes de inversión en cola (se procesan automáticamente al abrir periodo).
// ============================================================================

import React, { useState } from "react";
import { processWithdrawal } from "@/lib/actions/admin";
import { WithdrawalStatus } from "@/lib/enums";
import { Check, X, CreditCard, User, Building2, Clock, Snowflake, Banknote } from "lucide-react";

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
  fullAccountNumber?: string;
  accountType: string;
  country: string;
}

interface WithdrawalRequestData {
  id: string;
  amount: string | number;
  status: string;
  requestedAt: string;
  accountType?: string | null;
  user: {
    email: string;
    investedCapital: string | number;
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
  };
  bankAccount?: BankAccountInfo | null;
}

// ============================================================================
// HELPERS
// ============================================================================

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

// ============================================================================
// ESTILOS CONSTANTES
// ============================================================================

const TAB_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 24px",
  borderRadius: "12px 12px 0 0",
  border: "none",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s",
};

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: "#111",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  overflow: "hidden",
};

// ============================================================================
// SUB-COMPONENTE: TARJETA DE RETIRO (reutilizable)
// ============================================================================

function WithdrawalCard({
  req,
  processing,
  expandedId,
  onToggleExpand,
  onAction,
  showActions,
}: {
  req: WithdrawalRequestData;
  processing: string | null;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onAction: (id: string, status: WithdrawalStatus) => void;
  showActions: boolean;
}) {
  const isFrozen = req.accountType === "INVESTMENT" && !req.bankAccount;

  return (
    <div style={CARD_STYLE}>
      {/* Cabecera */}
      <div
        style={{
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          gap: "12px",
          flexWrap: "wrap",
        }}
        onClick={() => onToggleExpand(req.id)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff" }}
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
            style={{ marginTop: "4px", fontSize: "0.8rem", color: "#555" }}
            suppressHydrationWarning
          >
            {new Date(req.requestedAt).toLocaleString("es-ES")} • P. Balance: $
            {parseFloat(String(req.user.investedCapital)).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
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

          {/* Badge de dinero congelado */}
          {isFrozen && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
              }}
            >
              <Snowflake size={14} color="#60a5fa" />
              <span style={{ color: "#60a5fa", fontSize: "0.8rem", fontWeight: 600 }}>
                En cola — periodo cerrado
              </span>
            </div>
          )}

          {/* Estado badge */}
          {req.status !== "PENDING" || req.bankAccount ? (
            <div
              style={{
                padding: "6px 12px",
                borderRadius: "20px",
                backgroundColor:
                  req.status === "PENDING"
                    ? "#333"
                    : req.status === "APPROVED" || req.status === "COMPLETED"
                    ? "#064e3b"
                    : "#450a0a",
                color:
                  req.status === "PENDING"
                    ? "#fff"
                    : req.status === "APPROVED" || req.status === "COMPLETED"
                    ? "#34d399"
                    : "#f87171",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              {req.status === "COMPLETED" ? "COMPLETADO" :
               req.status === "PENDING" ? "PENDIENTE" :
               req.status === "APPROVED" ? "APROBADO" :
               req.status === "REJECTED" ? "RECHAZADO" :
               req.status === "REVIEWED" ? "REVISADO" :
               req.status}
            </div>
          ) : null}

          {/* Acciones */}
          {showActions && (req.status === "PENDING" || req.status === "REVIEWED") && (
            <div style={{ display: "flex", gap: "10px" }}>
              {req.bankAccount && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(req.id, WithdrawalStatus.APPROVED);
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
                    alignItems: "center",
                  }}
                >
                  <Check size={18} /> Aprobar
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(req.id, WithdrawalStatus.REJECTED);
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
                  alignItems: "center",
                }}
              >
                <X size={18} /> Rechazar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detalles expandibles */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <User size={14} color="#888" />
                <span style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase" }}>Titular</span>
              </div>
              <p style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}>
                {req.bankAccount.holderName}
              </p>
              <p style={{ color: "#888", fontSize: "0.8rem", margin: "4px 0 0 0" }}>
                {req.bankAccount.documentType}: {req.bankAccount.documentNumber}
              </p>
            </div>

            {/* Banco */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <Building2 size={14} color="#888" />
                <span style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase" }}>Banco</span>
              </div>
              <p style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}>
                {req.bankAccount.bankName}
              </p>
              <p style={{ color: "#888", fontSize: "0.8rem", margin: "4px 0 0 0" }}>
                {getCountryName(req.bankAccount.country)}
              </p>
            </div>

            {/* Número de cuenta */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <CreditCard size={14} color="#888" />
                <span style={{ color: "#888", fontSize: "0.75rem", textTransform: "uppercase" }}>Número de Cuenta</span>
              </div>
              <p style={{ color: "#fff", fontSize: "0.95rem", margin: 0 }}>
                {req.bankAccount.fullAccountNumber ? (
                  <span style={{ color: "#34d399", fontWeight: "bold" }}>
                    {req.bankAccount.fullAccountNumber}
                  </span>
                ) : (
                  `****${req.bankAccount.accountNumberLast4}`
                )}
              </p>
              <p style={{ color: "#888", fontSize: "0.8rem", margin: "4px 0 0 0" }}>
                {getAccountTypeLabel(req.bankAccount.accountType)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje si es dinero congelado y se expande */}
      {expandedId === req.id && isFrozen && (
        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(59,130,246,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <Snowflake size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ color: "#60a5fa", fontWeight: 600, margin: "0 0 6px 0", fontSize: "0.9rem" }}>
                Fondos en espera de apertura de periodo
              </p>
              <p style={{ color: "#888", fontSize: "0.85rem", margin: 0, lineHeight: 1.6 }}>
                El usuario solicitó mover <strong style={{ color: "#fff" }}>${parseFloat(String(req.amount)).toLocaleString()} USD</strong> de su cuenta de inversión a su cuenta de ahorros.
                El movimiento se procesará automáticamente cuando el Superadmin abra el próximo periodo de retiros.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje sin cuenta bancaria (retiro normal sin datos bancarios) */}
      {expandedId === req.id && !req.bankAccount && !isFrozen && (
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
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function WithdrawalList({
  withdrawals,
}: {
  withdrawals: WithdrawalRequestData[];
}) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"savings" | "frozen">("savings");

  // Filtros compartidos
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Separar solicitudes por tipo
  // Retiros de Ahorros: cuenta bancaria presente (independientemente del tipo de cuenta origen)
  const savingsWithdrawals = withdrawals.filter((w) => !!w.bankAccount);
  // Dinero Congelado: cuentas de inversión SIN cuenta bancaria (queued)
  const frozenWithdrawals = withdrawals.filter(
    (w) => !w.bankAccount && w.accountType === "INVESTMENT"
  );

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

  const applyFilters = (list: WithdrawalRequestData[]) =>
    list.filter((req) => {
      if (statusFilter !== "ALL" && req.status !== statusFilter) return false;
      if (dateFilter) {
        const reqDate = new Date(req.requestedAt);
        const year = reqDate.getFullYear();
        const month = String(reqDate.getMonth() + 1).padStart(2, "0");
        const day = String(reqDate.getDate()).padStart(2, "0");
        if (`${year}-${month}-${day}` !== dateFilter) return false;
      }
      return true;
    });

  const filteredSavings = applyFilters(savingsWithdrawals);
  const filteredFrozen = applyFilters(frozenWithdrawals);
  const currentList = activeTab === "savings" ? filteredSavings : filteredFrozen;

  return (
    <div>
      {/* Encabezado */}
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
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Gestión de Retiros</h1>

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
            <option value="COMPLETED">Completados</option>
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
              onClick={() => { setStatusFilter("ALL"); setDateFilter(""); }}
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

      {/* ── PESTAÑAS ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "0" }}>
        {/* Pestaña 1: Retiros de Ahorros */}
        <button
          onClick={() => setActiveTab("savings")}
          style={{
            ...TAB_BASE,
            background: activeTab === "savings"
              ? "rgba(189,142,72,0.15)"
              : "rgba(255,255,255,0.04)",
            border: activeTab === "savings"
              ? "1px solid rgba(189,142,72,0.35)"
              : "1px solid rgba(255,255,255,0.08)",
            borderBottom: activeTab === "savings"
              ? "1px solid rgba(189,142,72,0.15)"
              : "1px solid rgba(255,255,255,0.08)",
            color: activeTab === "savings" ? "#bd8e48" : "#888",
          }}
        >
          <Banknote size={18} />
          Retiros de Ahorros
          <span
            style={{
              background: activeTab === "savings" ? "#bd8e48" : "#333",
              color: activeTab === "savings" ? "#000" : "#888",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            {savingsWithdrawals.length}
          </span>
        </button>

        {/* Pestaña 2: Dinero Congelado */}
        <button
          onClick={() => setActiveTab("frozen")}
          style={{
            ...TAB_BASE,
            background: activeTab === "frozen"
              ? "rgba(59,130,246,0.12)"
              : "rgba(255,255,255,0.04)",
            border: activeTab === "frozen"
              ? "1px solid rgba(59,130,246,0.3)"
              : "1px solid rgba(255,255,255,0.08)",
            borderBottom: activeTab === "frozen"
              ? "1px solid rgba(59,130,246,0.12)"
              : "1px solid rgba(255,255,255,0.08)",
            color: activeTab === "frozen" ? "#60a5fa" : "#888",
          }}
        >
          <Snowflake size={18} />
          Dinero Congelado
          <span
            style={{
              background: activeTab === "frozen" ? "#3b82f6" : "#333",
              color: activeTab === "frozen" ? "#fff" : "#888",
              borderRadius: "20px",
              padding: "2px 10px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            {frozenWithdrawals.length}
          </span>
        </button>
      </div>

      {/* Línea separadora de pestañas */}
      <div
        style={{
          height: "1px",
          background: activeTab === "savings"
            ? "rgba(189,142,72,0.2)"
            : "rgba(59,130,246,0.2)",
          marginBottom: "24px",
        }}
      />

      {/* Descripción contextual */}
      {activeTab === "savings" ? (
        <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 20px 0" }}>
          Solicitudes de retiro desde cuentas de ahorros hacia una cuenta bancaria externa.
          Requieren <strong style={{ color: "#bd8e48" }}>revisión y aprobación manual</strong>.
        </p>
      ) : (
        <p style={{ color: "#666", fontSize: "0.85rem", margin: "0 0 20px 0" }}>
          Fondos que los usuarios desean sacar de sus cuentas de inversión en periodo cerrado.
          Se procesan <strong style={{ color: "#60a5fa" }}>automáticamente al abrir el próximo periodo</strong>,
          moviéndose a su cuenta de ahorros.
        </p>
      )}

      {/* Lista de solicitudes */}
      <div style={{ display: "grid", gap: "16px" }}>
        {currentList.length === 0 ? (
          <div
            style={{
              padding: "60px 40px",
              textAlign: "center",
              color: "#555",
              backgroundColor: "#111",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {activeTab === "savings" ? (
              <>
                <Banknote size={40} color="#333" style={{ margin: "0 auto 16px" }} />
                <p style={{ margin: 0 }}>No hay solicitudes de retiro de ahorros con los filtros actuales.</p>
              </>
            ) : (
              <>
                <Snowflake size={40} color="#1d3f6e" style={{ margin: "0 auto 16px" }} />
                <p style={{ margin: 0 }}>No hay fondos congelados en cola.</p>
              </>
            )}
          </div>
        ) : (
          currentList.map((req) => (
            <WithdrawalCard
              key={req.id}
              req={req}
              processing={processing}
              expandedId={expandedId}
              onToggleExpand={toggleExpand}
              onAction={handleAction}
              showActions={activeTab === "savings"}
            />
          ))
        )}
      </div>

      {/* Contador total */}
      {currentList.length > 0 && (
        <p
          style={{
            color: "#555",
            fontSize: "0.8rem",
            textAlign: "right",
            margin: "16px 0 0 0",
          }}
        >
          Mostrando {currentList.length} de{" "}
          {activeTab === "savings" ? savingsWithdrawals.length : frozenWithdrawals.length} solicitud(es)
        </p>
      )}
    </div>
  );
}

"use client";
// ============================================================================
// COMPONENTE: LISTA DE CUENTAS BANCARIAS - PRO-FINANCE
// ============================================================================
// Muestra las cuentas bancarias del usuario para retiros.
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { Plus, CreditCard, Star, Trash2, Loader2 } from "lucide-react";
import { BankAccountModal } from "@/components/dashboard/billetera/BankAccountModal";
import { logger } from "@/lib/logger";

// ============================================================================
// TIPOS
// ============================================================================

interface BankAccount {
  id: string;
  holderName: string;
  documentType: string;
  documentNumber: string;
  country: string;
  bankCode: string;
  bankName: string;
  accountNumberLast4: string;
  accountType: string;
  isDefault: boolean;
  createdAt: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function BankAccountList() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar cuentas
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/wallet/bank-accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      logger.error("Error cargando cuentas bancarias:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Eliminar cuenta
  const handleDelete = async (account: BankAccount) => {
    if (
      !confirm(
        `¿Estás seguro de eliminar la cuenta ${account.bankName} terminada en ****${account.accountNumberLast4}?`
      )
    ) {
      return;
    }

    setDeletingId(account.id);
    try {
      const response = await fetch(`/api/wallet/bank-accounts/${account.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || "Error al eliminar la cuenta");
      }
    } catch (error) {
      logger.error("Error eliminando cuenta:", error);
      alert("Error al eliminar la cuenta");
    } finally {
      setDeletingId(null);
    }
  };

  // Establecer como predeterminada
  const handleSetDefault = async (accountId: string) => {
    try {
      const response = await fetch(`/api/wallet/bank-accounts/${accountId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      if (response.ok) {
        await fetchAccounts();
      }
    } catch (error) {
      logger.error("Error estableciendo predeterminada:", error);
    }
  };

  // Obtener tipo de cuenta legible
  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SAVINGS: "Ahorros",
      CHECKING: "Corriente",
      CLABE: "CLABE",
      DEBIT: "Débito",
    };
    return labels[type] || type;
  };

  return (
    <div
      style={{
        background: "#0a0a0a",
        border: "1px solid rgba(189, 142, 72, 0.2)",
        borderRadius: "20px",
        padding: "24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h3
            style={{
              color: "#fff",
              fontSize: "1.2rem",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Cuentas para Retiros
          </h3>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.85rem",
              margin: "4px 0 0 0",
            }}
          >
            Administra tus cuentas bancarias para recibir retiros
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: "rgba(189, 142, 72, 0.1)",
            border: "1px solid rgba(189, 142, 72, 0.3)",
            borderRadius: "10px",
            color: "#bd8e48",
            fontSize: "0.9rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.3s",
          }}
        >
          <Plus size={18} />
          Agregar Cuenta
        </button>
      </div>

      {/* Lista de cuentas */}
      {isLoading ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ marginLeft: "10px" }}>Cargando cuentas...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <CreditCard
            size={48}
            style={{ marginBottom: "16px", opacity: 0.3 }}
          />
          <p style={{ margin: 0, fontSize: "0.95rem" }}>
            No tienes cuentas bancarias registradas
          </p>
          <p style={{ margin: "8px 0 0 0", fontSize: "0.85rem" }}>
            Agrega una cuenta para poder solicitar retiros
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {accounts.map((account) => (
            <div
              key={account.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                background: "rgba(255, 255, 255, 0.02)",
                border: account.isDefault
                  ? "1px solid rgba(189, 142, 72, 0.4)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                transition: "all 0.3s",
              }}
            >
              {/* Info de la cuenta */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: account.isDefault
                      ? "rgba(189, 142, 72, 0.15)"
                      : "rgba(255, 255, 255, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CreditCard
                    size={24}
                    color={
                      account.isDefault ? "#bd8e48" : "rgba(255, 255, 255, 0.4)"
                    }
                  />
                </div>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: "1rem",
                        fontWeight: "600",
                      }}
                    >
                      {account.bankName}
                    </span>
                    {account.isDefault && (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 8px",
                          background: "rgba(189, 142, 72, 0.2)",
                          borderRadius: "20px",
                          color: "#bd8e48",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                        }}
                      >
                        <Star size={10} />
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: "0.85rem",
                      margin: "4px 0 0 0",
                    }}
                  >
                    ****{account.accountNumberLast4} •{" "}
                    {getAccountTypeLabel(account.accountType)}
                  </p>
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.75rem",
                      margin: "2px 0 0 0",
                    }}
                  >
                    {account.holderName} • {account.documentType}{" "}
                    {account.documentNumber}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {!account.isDefault && (
                  <button
                    onClick={() => handleSetDefault(account.id)}
                    title="Establecer como predeterminada"
                    style={{
                      padding: "8px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "rgba(255, 255, 255, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    <Star size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(account)}
                  disabled={deletingId === account.id}
                  title="Eliminar cuenta"
                  style={{
                    padding: "8px",
                    background: "transparent",
                    border: "1px solid rgba(255, 77, 77, 0.2)",
                    borderRadius: "8px",
                    color:
                      deletingId === account.id
                        ? "rgba(255, 77, 77, 0.3)"
                        : "#ff4d4d",
                    cursor:
                      deletingId === account.id ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                  }}
                >
                  {deletingId === account.id ? (
                    <Loader2
                      size={16}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para agregar cuenta */}
      <BankAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchAccounts();
        }}
      />

      {/* Estilos para animación */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

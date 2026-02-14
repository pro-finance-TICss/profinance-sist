"use client";
// ============================================================================
// COMPONENTE: MODAL DE RETIRO - PRO-FINANCE (OPTIMIZADO)
// ============================================================================
// Modal para solicitar retiro de fondos con selección de cuenta bancaria.
// Optimizado: sin backdropFilter blur, estilos estáticos extraídos.
// ============================================================================

import React, { useState, useEffect, useCallback, memo } from "react";
import { X, AlertCircle, CheckCircle, Plus, CreditCard } from "lucide-react";
import { parseCurrency } from "@/lib/utils/currency";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BankAccountModal } from "@/components/dashboard/billetera/BankAccountModal";

// ============================================================================
// TIPOS
// ============================================================================

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  accountId: string;
  onSuccess?: () => void;
}

interface BankAccount {
  id: string;
  holderName: string;
  bankName: string;
  accountNumberLast4: string;
  accountType: string;
  isDefault: boolean;
}

// ============================================================================
// ESTILOS ESTÁTICOS (fuera del componente para evitar recreación en cada render)
// ============================================================================

const WITHDRAW_OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const WITHDRAW_CARD: React.CSSProperties = {
  background: "#0a0a0a",
  border: "1px solid rgba(189, 142, 72, 0.3)",
  borderRadius: "24px",
  padding: "32px",
  maxWidth: "550px",
  width: "100%",
  maxHeight: "90vh",
  overflowY: "auto",
  position: "relative",
};

const WITHDRAW_CLOSE_BTN: React.CSSProperties = {
  position: "absolute",
  top: "16px",
  right: "16px",
  background: "transparent",
  border: "none",
  color: "rgba(255, 255, 255, 0.5)",
  cursor: "pointer",
  padding: "8px",
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

function WithdrawModalInner({
  isOpen,
  onClose,
  availableBalance,
  accountId,
  onSuccess,
}: WithdrawModalProps) {
  const { formatAmount } = useCurrency();
  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  );
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // Cargar cuentas bancarias
  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoadingAccounts(true);
      const response = await fetch("/api/wallet/bank-accounts");
      if (response.ok) {
        const data = await response.json();
        const accountsList = data.accounts || [];
        setAccounts(accountsList);
        // Seleccionar la cuenta predeterminada
        const defaultAccount = accountsList.find(
          (a: BankAccount) => a.isDefault
        );
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id);
        } else if (accountsList.length > 0) {
          setSelectedAccountId(accountsList[0].id);
        }
      }
    } catch (error) {
      console.error("Error cargando cuentas bancarias:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      setAmount("");
      setError("");
      setSuccess(false);
    }
  }, [isOpen, fetchAccounts]);

  if (!isOpen) return null;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const numericAmount = parseCurrency(amount);

      // Validación básica
      if (numericAmount < 10) {
        setError("El monto mínimo de retiro es $10");
        setIsLoading(false);
        return;
      }

      if (numericAmount > availableBalance) {
        setError(
          `No puedes retirar más de tu balance total (${formatAmount(
            availableBalance
          )})`
        );
        setIsLoading(false);
        return;
      }

      if (!selectedAccountId) {
        setError("Selecciona una cuenta bancaria para recibir el retiro");
        setIsLoading(false);
        return;
      }

      // Llamar a la API para crear solicitud de retiro
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          bankAccountId: selectedAccountId,
          accountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar la solicitud");
      }

      // Mostrar éxito
      setSuccess(true);
      setAmount("");

      // Llamar callback de éxito
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      console.error("Error en retiro:", err);
      setError(
        err instanceof Error ? err.message : "Error al procesar la solicitud"
      );
      setIsLoading(false);
    }
  };

  // Manejar nueva cuenta agregada
  const handleAccountAdded = () => {
    setShowAddAccountModal(false);
    fetchAccounts();
  };

  return (
    <>
      <div style={WITHDRAW_OVERLAY} onClick={onClose}>
        <div style={WITHDRAW_CARD} onClick={(e) => e.stopPropagation()}>
          {/* Botón cerrar */}
          <button onClick={onClose} style={WITHDRAW_CLOSE_BTN}>
            <X size={24} />
          </button>

          {success ? (
            // Vista de éxito
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "rgba(76, 175, 80, 0.1)",
                  border: "2px solid rgba(76, 175, 80, 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <CheckCircle size={40} color="#4caf50" />
              </div>
              <h2
                style={{
                  color: "#fff",
                  fontSize: "1.6rem",
                  fontWeight: "700",
                  margin: "0 0 12px 0",
                }}
              >
                ¡Solicitud Enviada!
              </h2>
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.6)",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                }}
              >
                Tu solicitud de retiro ha sido enviada al departamento de
                finanzas. Te notificaremos cuando sea procesada.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "rgba(189, 142, 72, 0.1)",
                    border: "1px solid rgba(189, 142, 72, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  <AlertCircle size={28} color="#bd8e48" />
                </div>
                <h2
                  style={{
                    color: "#fff",
                    fontSize: "1.8rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  Solicitar Retiro
                </h2>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.9rem",
                    margin: "8px 0 0 0",
                  }}
                >
                  Las solicitudes de retiro son revisadas por nuestro equipo. El
                  proceso puede tomar de 1 a 3 días hábiles.
                </p>
              </div>

              {/* Balance total */}
              <div
                style={{
                  padding: "16px",
                  background: "rgba(189, 142, 72, 0.05)",
                  border: "1px solid rgba(189, 142, 72, 0.2)",
                  borderRadius: "12px",
                  marginBottom: "24px",
                }}
              >
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "0.75rem",
                    margin: "0 0 4px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Balance Total
                </p>
                <p
                  style={{
                    color: "#bd8e48",
                    fontSize: "1.4rem",
                    fontWeight: "700",
                    margin: 0,
                  }}
                >
                  {formatAmount(availableBalance)}
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit}>
                {/* Selección de cuenta bancaria */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(189, 142, 72, 0.8)",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Cuenta para Recibir
                  </label>

                  {isLoadingAccounts ? (
                    <div
                      style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "rgba(255, 255, 255, 0.5)",
                      }}
                    >
                      Cargando cuentas...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px dashed rgba(255, 255, 255, 0.15)",
                        borderRadius: "12px",
                        textAlign: "center",
                      }}
                    >
                      <CreditCard
                        size={32}
                        color="rgba(255, 255, 255, 0.3)"
                        style={{ marginBottom: "12px" }}
                      />
                      <p
                        style={{
                          color: "rgba(255, 255, 255, 0.6)",
                          fontSize: "0.9rem",
                          margin: "0 0 16px 0",
                        }}
                      >
                        No tienes cuentas bancarias registradas
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowAddAccountModal(true)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "10px 20px",
                          background: "#bd8e48",
                          border: "none",
                          borderRadius: "10px",
                          color: "#000",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={18} />
                        Agregar Cuenta
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {accounts.map((account) => (
                        <label
                          key={account.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "14px",
                            background:
                              selectedAccountId === account.id
                                ? "rgba(189, 142, 72, 0.1)"
                                : "rgba(255, 255, 255, 0.02)",
                            border:
                              selectedAccountId === account.id
                                ? "1px solid rgba(189, 142, 72, 0.4)"
                                : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            cursor: "pointer",
                            transition: "all 0.3s",
                          }}
                        >
                          <input
                            type="radio"
                            name="bankAccount"
                            value={account.id}
                            checked={selectedAccountId === account.id}
                            onChange={() => setSelectedAccountId(account.id)}
                            style={{
                              accentColor: "#bd8e48",
                              width: "18px",
                              height: "18px",
                            }}
                          />
                          <CreditCard
                            size={24}
                            color={
                              selectedAccountId === account.id
                                ? "#bd8e48"
                                : "rgba(255, 255, 255, 0.4)"
                            }
                          />
                          <div style={{ flex: 1 }}>
                            <p
                              style={{
                                color: "#fff",
                                fontSize: "0.95rem",
                                fontWeight: "600",
                                margin: 0,
                              }}
                            >
                              {account.bankName}
                            </p>
                            <p
                              style={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: "0.8rem",
                                margin: "2px 0 0 0",
                              }}
                            >
                              ****{account.accountNumberLast4} •{" "}
                              {getAccountTypeLabel(account.accountType)}
                            </p>
                          </div>
                        </label>
                      ))}
                      {/* Botón para agregar nueva cuenta */}
                      <button
                        type="button"
                        onClick={() => setShowAddAccountModal(true)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "12px",
                          background: "transparent",
                          border: "1px dashed rgba(189, 142, 72, 0.3)",
                          borderRadius: "12px",
                          color: "#bd8e48",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.3s",
                        }}
                      >
                        <Plus size={16} />
                        Agregar otra cuenta
                      </button>
                    </div>
                  )}
                </div>

                {/* Monto */}
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(189, 142, 72, 0.8)",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Monto a Retirar
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, "");
                      setAmount(value);
                    }}
                    placeholder="0.00"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(189, 142, 72, 0.2)",
                      borderRadius: "12px",
                      color: "#fff",
                      fontSize: "1.2rem",
                      fontWeight: "600",
                      outline: "none",
                    }}
                    disabled={isLoading}
                  />
                  <p
                    style={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "0.75rem",
                      margin: "8px 0 0 0",
                    }}
                  >
                    Mínimo: $10
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(255, 77, 77, 0.1)",
                      border: "1px solid rgba(255, 77, 77, 0.3)",
                      borderRadius: "12px",
                      color: "#ff4d4d",
                      fontSize: "0.85rem",
                      marginBottom: "24px",
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Botones */}
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "12px",
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: "0.95rem",
                      fontWeight: "600",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      !amount ||
                      availableBalance === 0 ||
                      !selectedAccountId
                    }
                    style={{
                      flex: 1,
                      padding: "14px",
                      background:
                        isLoading ||
                        !amount ||
                        availableBalance === 0 ||
                        !selectedAccountId
                          ? "rgba(189, 142, 72, 0.3)"
                          : "#bd8e48",
                      border: "none",
                      borderRadius: "12px",
                      color: "#000",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor:
                        isLoading ||
                        !amount ||
                        availableBalance === 0 ||
                        !selectedAccountId
                          ? "not-allowed"
                          : "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    {isLoading ? "Procesando..." : "Enviar Solicitud"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Modal para agregar cuenta bancaria */}
      <BankAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onSuccess={handleAccountAdded}
      />
    </>
  );
}

// Memo previene re-renders innecesarios del componente padre
export const WithdrawModal = memo(WithdrawModalInner);
WithdrawModal.displayName = "WithdrawModal";

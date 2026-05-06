"use client";
import React, { useState, useEffect, useCallback } from "react";
import { X, ArrowRight, Wallet, ArrowDownToLine, AlertTriangle, ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAccount } from "@/contexts/AccountContext";
import type { Account } from "@/contexts/AccountContext";

// ============================================================================
// INTERNAL TRANSFER MODAL — PRO-FINANCE
// ============================================================================
// FASE 0: Usa sourceAccountId + destinationAccountId explícitos.
// Elimina el uso de direction y accountId en el payload del backend.
// Soporta múltiples cuentas de inversión con selector dinámico.
// ============================================================================

interface InternalTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Indica la dirección de la transferencia (solo para UX/texto, no se envía al backend) */
  direction: "TO_INVESTMENT" | "TO_SAVINGS";
  isBlocked: boolean;
  onSuccess: () => void;
  /**
   * ID de la cuenta de inversión a preseleccionar al abrir el modal.
   * Si no se provee, se usa investmentAccounts[0].
   * Útil cuando se abre desde el detalle de una cuenta específica.
   */
  defaultInvestmentAccountId?: string;
}

export function InternalTransferModal({
  isOpen,
  onClose,
  direction,
  isBlocked,
  onSuccess,
  defaultInvestmentAccountId,
}: InternalTransferModalProps) {
  const { accounts } = useAccount();

  // ── Derivar cuentas disponibles del contexto ────────────────────────────
  const savingsAccount: Account | undefined = accounts.find(
    (a) => a.type === "SAVINGS"
  );
  const investmentAccounts: Account[] = accounts.filter(
    (a) => a.type === "INVESTMENT"
  );

  // ── Estado local ────────────────────────────────────────────────────────
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string>("");
  const [sourceBalance, setSourceBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isInvesting = direction === "TO_INVESTMENT";

  // ── Inicializar selectedInvestmentId cuando cambian las cuentas ─────────
  // Prioridad: defaultInvestmentAccountId (si existe en la lista) → investmentAccounts[0]
  useEffect(() => {
    if (investmentAccounts.length > 0 && !selectedInvestmentId) {
      const preferred = defaultInvestmentAccountId
        ? investmentAccounts.find((a) => a.id === defaultInvestmentAccountId)
        : undefined;
      setSelectedInvestmentId(preferred?.id ?? investmentAccounts[0].id);
    }
  }, [investmentAccounts, selectedInvestmentId, defaultInvestmentAccountId]);

  // ── Resolver cuentas origen/destino según dirección ─────────────────────
  // Esto es la única fuente de verdad para el payload — nunca el backend decide.
  const sourceAccount: Account | undefined = isInvesting
    ? savingsAccount
    : investmentAccounts.find((a) => a.id === selectedInvestmentId);

  const destinationAccount: Account | undefined = isInvesting
    ? investmentAccounts.find((a) => a.id === selectedInvestmentId)
    : savingsAccount;

  // ── Fetch de balance del origen cuando se abre el modal ─────────────────
  const fetchSourceBalance = useCallback(async (accountId: string) => {
    try {
      const res = await fetch(`/api/wallet/balance?accountId=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        setSourceBalance(data.balance?.investedCapital || 0);
      }
    } catch {
      // silencioso — el usuario verá balance 0
    }
  }, []);

  useEffect(() => {
    if (isOpen && sourceAccount) {
      fetchSourceBalance(sourceAccount.id);
    }
    if (!isOpen) {
      setAmount("");
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen, sourceAccount?.id, fetchSourceBalance]);

  // Refetch si el usuario cambia la cuenta de inversión seleccionada
  useEffect(() => {
    if (isOpen && sourceAccount) {
      fetchSourceBalance(sourceAccount.id);
    }
  }, [selectedInvestmentId, isOpen, sourceAccount?.id, fetchSourceBalance]);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isOverBalance = numAmount > sourceBalance;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) return;
    if (isOverBalance) return;
    if (isInvesting && isBlocked) return;

    // Validaciones pre-envío
    if (!sourceAccount || !destinationAccount) {
      setError("No se encontraron las cuentas necesarias. Recarga la página.");
      return;
    }

    if (sourceAccount.id === destinationAccount.id) {
      setError("La cuenta de origen y destino no pueden ser la misma.");
      return;
    }

    const sourceAccountId = sourceAccount.id;
    const destinationAccountId = destinationAccount.id;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/wallet/transfer-internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Payload limpio: IDs explícitos, sin direction, sin accountId legacy
          amount: numAmount,
          sourceAccountId,
          destinationAccountId,
          // direction sigue siendo necesario para la lógica de ventana de inversión
          // en el backend (isInvestmentWindowOpen). Se mantiene solo por eso.
          direction,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.queued) {
          setSuccessMsg("Puesto en Cola (Periodo cerrado)");
        } else {
          setSuccessMsg("¡Transferencia Exitosa!");
        }
        setTimeout(() => {
          onSuccess();
          onClose();
          setAmount("");
          setSuccessMsg(null);
        }, 1500);
      } else {
        setError(data.error || "Hubo un error al procesar.");
      }
    } catch {
      setError("Error de red. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  const hasMultipleInvestments = investmentAccounts.length > 1;

  return (
    <div
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          background: "#111",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "400px",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
            {isInvesting ? <Wallet size={20} color="#bd8e48" /> : <ArrowDownToLine size={20} color="#bd8e48" />}
            {isInvesting ? "Aportar a Inversión" : "Mover a Ahorros"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {/* Alertas de bloqueo */}
          {isInvesting && isBlocked && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "12px", borderRadius: "8px", marginBottom: "20px", color: "#f87171", display: "flex", gap: "10px", alignItems: "center" }}>
              <AlertTriangle size={20} />
              <span style={{ fontSize: "0.85rem" }}>No se admiten nuevos fondos. El periodo de inversión está actualmente cerrado.</span>
            </div>
          )}

          {!isInvesting && isBlocked && (
            <div style={{ background: "rgba(255, 152, 0, 0.1)", border: "1px solid rgba(255, 152, 0, 0.2)", padding: "12px", borderRadius: "8px", marginBottom: "20px", color: "#ff9800", display: "flex", gap: "10px", alignItems: "top" }}>
              <AlertTriangle size={28} />
              <span style={{ fontSize: "0.80rem" }}>El periodo está cerrado, pero puedes poner tu retiro en cola asegurando salir cuando se abra.</span>
            </div>
          )}

          {/* Selector de cuenta de inversión (solo si hay múltiples) */}
          {hasMultipleInvestments && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.8rem", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                {isInvesting ? "Cajita de destino" : "Cajita de origen"}
              </p>
              <div style={{ position: "relative" }}>
                <select
                  value={selectedInvestmentId}
                  onChange={(e) => setSelectedInvestmentId(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(189,142,72,0.3)",
                    padding: "12px 40px 12px 14px",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    outline: "none",
                    appearance: "none",
                    cursor: "pointer",
                  }}
                >
                  {investmentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id} style={{ background: "#111" }}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  color="rgba(189,142,72,0.7)"
                  style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
              </div>
            </div>
          )}

          {/* Balance de origen */}
          <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>
              Balance de origen ({isInvesting ? "Ahorros" : "Inversión"})
            </span>
            <span style={{ color: "#bd8e48", fontWeight: "700", fontSize: "1.2rem" }}>
              {formatCurrency(sourceBalance)}
            </span>
          </div>

          {/* Mensajes de error / éxito */}
          {error && <div style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>{error}</div>}
          {successMsg && <div style={{ color: "#34d399", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", fontWeight: "bold" }}>{successMsg}</div>}

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", fontSize: "1.2rem", fontWeight: "500" }}>$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    if (Number(e.target.value) >= 0) {
                      setAmount(e.target.value);
                    }
                  }}
                  placeholder="0.00"
                  step="0.01"
                  min="1"
                  disabled={isLoading || (isInvesting && isBlocked)}
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(189,142,72,0.2)", padding: "16px 16px 16px 40px", borderRadius: "12px", color: "#fff", fontSize: "1.2rem", fontWeight: "600", outline: "none", transition: "all 0.2s" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) <= 0 || isOverBalance || (isInvesting && isBlocked)}
              style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "none", background: (isInvesting && isBlocked) ? "rgba(189,142,72,0.1)" : "#bd8e48", color: (isInvesting && isBlocked) ? "rgba(255,255,255,0.5)" : "#000", fontWeight: "700", fontSize: "1.05rem", cursor: (isLoading || isOverBalance || (isInvesting && isBlocked)) ? "not-allowed" : "pointer", opacity: isLoading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.2s" }}
            >
              {isLoading ? "Procesando..." : isOverBalance ? "Saldo Insuficiente" : (isInvesting && isBlocked) ? "Operación Bloqueada" : "Confirmar Transferencia"}
              {(!isLoading && !isOverBalance && !(isInvesting && isBlocked)) && <ArrowRight size={20} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

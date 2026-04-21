"use client";
import React, { useState, useEffect } from "react";
import { X, ArrowRight, Wallet, ArrowDownToLine, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { useAccount } from "@/contexts/AccountContext";

interface InternalTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  direction: "TO_INVESTMENT" | "TO_SAVINGS";
  isBlocked: boolean;
  onSuccess: () => void;
}

export function InternalTransferModal({
  isOpen,
  onClose,
  direction,
  isBlocked,
  onSuccess,
}: InternalTransferModalProps) {
  const { accounts, activeAccount } = useAccount();
  const [sourceBalance, setSourceBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Obtener la cuenta de inversión correcta:
  // Si el activeAccount es INVESTMENT, usarla para la transferencia.
  // Si no, tomar la primera INVESTMENT del listado (fallback).
  const investmentAcc = activeAccount?.type === "INVESTMENT"
    ? activeAccount
    : accounts.find(a => a.type === "INVESTMENT");

  // Fetch true balance on open
  useEffect(() => {
    if (isOpen) {
      const sourceAccType = direction === "TO_INVESTMENT" ? "SAVINGS" : "INVESTMENT";
      let sourceAcc;
      if (sourceAccType === "INVESTMENT") {
        // Usar la cuenta de inversión activa
        sourceAcc = investmentAcc;
      } else {
        sourceAcc = accounts.find(a => a.type === "SAVINGS");
      }
      if (sourceAcc) {
          fetch(`/api/wallet/balance?accountId=${sourceAcc.id}`)
             .then(res => res.json())
             .then(data => setSourceBalance(data.balance?.investedCapital || 0))
             .catch(console.error);
      }
    } else {
      setAmount("");
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen, direction, accounts, investmentAcc]);

  if (!isOpen) return null;

  // Si direction es TO_INVESTMENT, el origen es SAVINGS y viceversa
  const isInvesting = direction === "TO_INVESTMENT";
  const numAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const isOverBalance = numAmount > sourceBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAmount || numAmount <= 0) return;
    if (isOverBalance) return;
    if (isInvesting && isBlocked) return;

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Enviar el ID de la cuenta de inversión activa para soportar múltiples cajitas
    const investmentAccId = investmentAcc?.id;

    try {
      const res = await fetch("/api/wallet/transfer-internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          direction,
          // ID de la cuenta de inversión activa (soporta múltiples cajitas de inversión)
          accountId: investmentAccId,
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
    } catch (err) {
      setError("Error de red. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

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

          <div style={{ background: "rgba(255,255,255,0.02)", padding: "16px", borderRadius: "12px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Balance de origen ({isInvesting ? "Ahorros" : "Inversión"})</span>
            <span style={{ color: "#bd8e48", fontWeight: "700", fontSize: "1.2rem" }}>{formatCurrency(sourceBalance)}</span>
          </div>

          {error && <div style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>{error}</div>}
          {successMsg && <div style={{ color: "#34d399", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center", fontWeight: "bold" }}>{successMsg}</div>}

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

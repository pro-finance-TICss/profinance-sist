"use client";
import React, { useState } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/utils/currency";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onSuccess?: () => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  availableBalance,
  onSuccess,
}: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

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
          `No puedes retirar más de tu balance disponible (${formatCurrency(
            availableBalance
          )})`
        );
        setIsLoading(false);
        return;
      }

      // Llamar a la API para crear solicitud de retiro
      const response = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
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
    } catch (err: any) {
      console.error("Error en retiro:", err);
      setError(err.message || "Error al procesar la solicitud");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0a0a0a",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "24px",
          padding: "32px",
          maxWidth: "500px",
          width: "100%",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "transparent",
            border: "none",
            color: "rgba(255, 255, 255, 0.5)",
            cursor: "pointer",
            padding: "8px",
          }}
        >
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

            {/* Balance disponible */}
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
                Balance Disponible
              </p>
              <p
                style={{
                  color: "#bd8e48",
                  fontSize: "1.4rem",
                  fontWeight: "700",
                  margin: 0,
                }}
              >
                {formatCurrency(availableBalance)}
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
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
                  Monto a Retirar (USD)
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
                  disabled={isLoading || !amount || availableBalance === 0}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background:
                      isLoading || !amount || availableBalance === 0
                        ? "rgba(189, 142, 72, 0.3)"
                        : "#bd8e48",
                    border: "none",
                    borderRadius: "12px",
                    color: "#000",
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    cursor:
                      isLoading || !amount || availableBalance === 0
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
  );
}

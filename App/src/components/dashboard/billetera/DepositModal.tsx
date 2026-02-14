"use client";
import React, { useState } from "react";
import { X, CreditCard, ExternalLink } from "lucide-react";
import { formatCurrency, parseCurrency } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DepositModal({
  isOpen,
  onClose,
  onSuccess,
}: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const numericAmount = parseCurrency(amount);

      // Validación básica
      if (numericAmount < 10) {
        setError("El monto mínimo de depósito es $10");
        setIsLoading(false);
        return;
      }

      if (numericAmount > 100000) {
        setError("El monto máximo de depósito es $100,000");
        setIsLoading(false);
        return;
      }

      // Llamar a la API para crear preferencia de Mercado Pago
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al procesar con Mercado Pago");
      }

      if (data.url) {
        // Redirigir a Mercado Pago
        window.location.href = data.url;
      } else {
        throw new Error("No se recibió URL de pago");
      }
    } catch (err: any) {
      logger.error("Error en depósito:", err);
      setError(err.message || "Error al iniciar el pago");
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
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

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(0, 158, 227, 0.1)", // Color MP
              border: "1px solid rgba(0, 158, 227, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <CreditCard size={28} color="#009ee3" />
          </div>
          <h2
            style={{
              color: "#fff",
              fontSize: "1.8rem",
              fontWeight: "700",
              margin: 0,
            }}
          >
            Depositar con Mercado Pago
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.9rem",
              margin: "8px 0 0 0",
            }}
          >
            Ingresa el monto. Serás redirigido a Mercado Pago para completar tu
            depósito de forma segura.
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
              Monto a depositar
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
              disabled={isLoading || !amount}
              style={{
                flex: 1,
                padding: "14px",
                background:
                  isLoading || !amount ? "rgba(0, 158, 227, 0.3)" : "#009ee3", // Color Mercado Pago
                border: "none",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: "700",
                cursor: isLoading || !amount ? "not-allowed" : "pointer",
                transition: "all 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {isLoading ? (
                "Procesando..."
              ) : (
                <>
                  Pagar con Mercado Pago
                  <ExternalLink size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import React, { useState } from "react";
import { DollarSign, CreditCard, ArrowRight } from "lucide-react";
import { logger } from "@/lib/logger";

export function DepositForm() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    if (!amount || isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Error al iniciar pago");
        setIsLoading(false);
      }
    } catch (error) {
      logger.error(error);
      setIsLoading(false);
      alert("Error al conectar con el servidor de pagos");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
      {/* Campo de Monto */}
      <div>
        <label
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.85rem",
            marginBottom: "10px",
            display: "block",
          }}
        >
          Monto a depositar (COP)
        </label>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#bd8e48",
            }}
          >
            <DollarSign size={20} />
          </div>
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            style={{
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(189, 142, 72, 0.3)",
              borderRadius: "16px",
              padding: "18px 20px 18px 50px",
              color: "#fff",
              fontSize: "1.2rem",
              outline: "none",
              transition: "all 0.3s",
            }}
          />
        </div>
      </div>

      {/* Selección de Método (Visual) */}
      <div
        style={{
          padding: "20px",
          borderRadius: "16px",
          backgroundColor: "rgba(189, 142, 72, 0.05)",
          border: "1px solid rgba(189, 142, 72, 0.1)",
          display: "flex",
          alignItems: "center",
          gap: "15px",
        }}
      >
        <div style={{ color: "#009ee3" }}>
          <CreditCard size={24} />
        </div>
        <div>
          <p style={{ color: "#fff", fontSize: "0.9rem", margin: 0 }}>
            Método de pago
          </p>
          <p
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: "0.8rem",
              margin: 0,
            }}
          >
            Mercado Pago
          </p>
        </div>
      </div>

      {/* Botón de Acción */}
      <button
        onClick={handleDeposit}
        disabled={isLoading || !amount}
        style={{
          width: "100%",
          padding: "18px",
          borderRadius: "16px",
          backgroundColor: isLoading ? "rgba(189, 142, 72, 0.5)" : "#bd8e48",
          color: "#000",
          border: "none",
          fontWeight: "700",
          fontSize: "1rem",
          cursor: isLoading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          transition: "transform 0.2s",
        }}
      >
        {isLoading ? "PROCESANDO..." : "CONTINUAR AL PAGO"}{" "}
        <ArrowRight size={18} />
      </button>

      <p
        style={{
          textAlign: "center",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.3)",
        }}
      >
        Procesamiento seguro encriptado por SSL.
      </p>
    </div>
  );
}

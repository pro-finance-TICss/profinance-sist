"use client";
import React from "react";
import { formatCurrency } from "@/lib/utils/currency";

interface BalanceCardProps {
  investedCapital: number;
  availableBalance: number;
  pendingWithdrawal: number;
}

export function BalanceCard({
  investedCapital,
  availableBalance,
  pendingWithdrawal,
}: BalanceCardProps) {
  return (
    <div style={{ height: "100%" }}>
      <style>
        {`
          @keyframes floatParticles {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          .balance-glass-container {
            position: relative;
            background: #080808;
            border-radius: 24px;
            border: 1px solid rgba(189, 142, 72, 0.3);
            overflow: hidden;
            padding: 30px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .balance-particles-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image: url("https://www.transparenttextures.com/patterns/stardust.png");
            opacity: 0.15;
            pointer-events: none;
            animation: floatParticles 60s linear infinite;
            z-index: 0;
          }
        `}
      </style>

      <div className="balance-glass-container">
        <div className="balance-particles-overlay" />

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Balance Total */}
          <div style={{ marginBottom: "24px" }}>
            <h3
              style={{
                color: "rgba(189, 142, 72, 0.8)",
                margin: 0,
                fontSize: "0.85rem",
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Balance Total
            </h3>
            <p
              style={{
                color: "#fff",
                margin: "8px 0 0 0",
                fontSize: "2.5rem",
                fontWeight: "800",
                letterSpacing: "-0.5px",
              }}
            >
              {formatCurrency(investedCapital)}
            </p>
          </div>

          {/* Cajas de Balance (Disponible y Solicitado) */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {/* Disponible para retiro */}
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(189, 142, 72, 0.05)",
                border: "1px solid rgba(189, 142, 72, 0.2)",
                borderRadius: "10px",
                minWidth: "140px",
              }}
            >
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  margin: 0,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Disponible para retiro
              </p>
              <p
                style={{
                  color: "#bd8e48",
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: "700",
                }}
              >
                {formatCurrency(availableBalance)}
              </p>
            </div>

            {/* Solicitado para retiro */}
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                minWidth: "140px",
              }}
            >
              <p
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  margin: 0,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "4px",
                }}
              >
                Solicitado para retiro
              </p>
              <p
                style={{
                  color: "#fff",
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: "700",
                }}
              >
                {formatCurrency(pendingWithdrawal)}
              </p>
            </div>
          </div>
          {/* Aviso de Fecha Límite */}
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              background: "rgba(189, 142, 72, 0.1)",
              border: "1px solid rgba(189, 142, 72, 0.2)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#bd8e48",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.9rem",
                margin: 0,
                fontWeight: "500",
              }}
            >
              Solicitud de retiros habilitada hasta el{" "}
              <strong>16 de cada mes</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

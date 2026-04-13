"use client";

import React, { useState } from "react";
import { InvestmentChart } from "@/components/superadmin/InvestmentChart";

// ============================================================================
// TIPOS Y CONSTANTES
// ============================================================================

type SupportedCurrency = "COP" | "USD" | "EUR" | "MXN";

const CURRENCY_OPTIONS: { value: SupportedCurrency; label: string; symbol: string; countryCode: string }[] = [
  { value: "COP", label: "Peso Colombiano", symbol: "$", countryCode: "CO" },
  { value: "USD", label: "Dólar Americano", symbol: "$", countryCode: "US" },
  { value: "EUR", label: "Euro",            symbol: "€", countryCode: "EU" },
  { value: "MXN", label: "Peso Mexicano",   symbol: "$", countryCode: "MX" },
];

// ============================================================================
// PAGE
// ============================================================================

export default function SuperAdminPage() {
  const [currency, setCurrency] = useState<SupportedCurrency>("COP");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* ── Currency Filter ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          padding: "14px 20px",
          background: "rgba(189,142,72,0.04)",
          border: "1px solid rgba(189,142,72,0.15)",
          borderRadius: "12px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "rgba(189,142,72,0.9)",
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Moneda base del usuario
          </p>
          <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
            Filtra las gráficas por la divisa que cada usuario opera
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {CURRENCY_OPTIONS.map((opt) => {
            const isActive = currency === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setCurrency(opt.value)}
                title={opt.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 16px",
                  borderRadius: "10px",
                  border: isActive
                    ? "1px solid #bd8e48"
                    : "1px solid rgba(189,142,72,0.2)",
                  background: isActive
                    ? "#bd8e48"
                    : "rgba(255,255,255,0.03)",
                  color: isActive ? "#000" : "rgba(255,255,255,0.55)",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: isActive
                    ? "0 0 14px rgba(189,142,72,0.35)"
                    : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "rgba(189,142,72,0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
              >
                {/* Visual badge similar to the screenshot */}
                <span
                  style={{
                    backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.08)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "0.65rem",
                    fontWeight: 900,
                    marginRight: "4px",
                    color: isActive ? "#000" : "rgba(255,255,255,0.4)",
                    textTransform: "uppercase",
                  }}
                >
                  {opt.countryCode}
                </span>
                <span style={{ fontSize: "0.95rem" }}>{opt.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        <InvestmentChart
          role="USER"
          title="Inversión Total - Usuarios"
          currency={currency}
        />
        <InvestmentChart
          role="SOCIO"
          title="Inversión Total - Socios"
          currency={currency}
        />
      </div>
    </div>
  );
}

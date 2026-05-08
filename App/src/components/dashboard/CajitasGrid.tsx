"use client";

// ============================================================================
// CAJITAS GRID — ORQUESTADOR DE CUENTAS
// ============================================================================
// Responsabilidad exclusiva: obtener cuentas del contexto y renderizarlas
// en jerarquía visual (large / medium / small).
//
// NO hace fetch. NO calcula datos. La lógica vive en AccountContext.
//
// Jerarquía:
//  1. savingsAccount          → CajitaCard size="large"  (cuenta de ahorro)
//  2. primaryInvestmentAccount → CajitaCard size="medium" (inversión principal)
//  3. resto de investmentAccounts → CajitaCard size="small" (otras inversiones)
//
// FASE 3 — MULTI-ACCOUNT DASHBOARD
// ============================================================================

import React, { useMemo } from "react";
import { useAccount } from "@/contexts/AccountContext";
import { CajitaCard } from "@/components/dashboard/CajitaCard";
import { LayoutGrid } from "lucide-react";

// ============================================================================
// SUBCOMPONENTES
// ============================================================================

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "40px 20px",
        borderRadius: "20px",
        border: "1px dashed rgba(189, 142, 72, 0.2)",
        background: "rgba(189, 142, 72, 0.02)",
        color: "rgba(255,255,255,0.3)",
      }}
    >
      <LayoutGrid size={32} color="rgba(189,142,72,0.3)" />
      <p
        style={{
          fontSize: "0.9rem",
          fontWeight: 500,
          margin: 0,
          textAlign: "center",
        }}
      >
        No hay cuentas de inversión configuradas.
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "1.2px",
        color: "rgba(255,255,255,0.25)",
        margin: "0 0 10px 4px",
      }}
    >
      {children}
    </p>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function CajitasGrid() {
  const {
    savingsAccount,
    investmentAccounts,
    primaryInvestmentAccount,
    setViewedAccount,
  } = useAccount();

  // Inversiones secundarias: todas menos la principal
  const secondaryInvestments = useMemo(() => {
    if (!primaryInvestmentAccount) return investmentAccounts;
    return investmentAccounts.filter(
      (acc) => acc.id !== primaryInvestmentAccount.id
    );
  }, [investmentAccounts, primaryInvestmentAccount]);

  const hasAnyInvestment = investmentAccounts.length > 0;

  return (
    <div
      style={{
        position: "relative",
        padding: "20px 24px 24px",
        borderRadius: "24px",
        background: "#080808",
        border: "1px solid rgba(189, 142, 72, 0.3)",
        boxShadow:
          "0 10px 30px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,0,0,0.35) inset",
        overflow: "hidden",
      }}
    >
      {/* ── Escarcha: noise grain ─────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('https://www.transparenttextures.com/patterns/stardust.png')",
          opacity: 0.13,
          pointerEvents: "none",
          borderRadius: "24px",
          zIndex: 0,
        }}
      />

      {/* ── Escarcha: shimmer diagonal ────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.025) 0%, transparent 45%, rgba(189,142,72,0.04) 100%)",
          pointerEvents: "none",
          borderRadius: "24px",
          zIndex: 0,
        }}
      />

      {/* ── Glow dorado esquina superior izquierda ────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "60%",
          height: "100%",
          background:
            "radial-gradient(ellipse at top left, rgba(189,142,72,0.09) 0%, transparent 68%)",
          pointerEvents: "none",
          borderRadius: "24px",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          width: "100%",
        }}
      >
        {/* — FILA SUPERIOR: Ahorro (large) + Inversión principal (medium) — */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: savingsAccount
              ? primaryInvestmentAccount
                ? "1fr 1fr"
                : "1fr"
              : primaryInvestmentAccount
                ? "1fr"
                : "1fr",
            gap: "20px",
            alignItems: "stretch",
          }}
        >
          {/* Cuenta de Ahorro — fallback defensivo (no crash si no existe) */}
          {savingsAccount && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SectionLabel>Cuenta Principal</SectionLabel>
              <CajitaCard
                account={savingsAccount}
                size="large"
              //onClick={() => setViewedAccount(savingsAccount.id)}
              />
            </div>
          )}

          {/* Inversión Principal */}
          {primaryInvestmentAccount && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <SectionLabel>Inversión Principal</SectionLabel>
              <CajitaCard
                account={primaryInvestmentAccount}
                size="medium"
              //onClick={() => setViewedAccount(primaryInvestmentAccount.id)} ///////////////////////////////////
              />
            </div>
          )}

          {/* Fallback: ninguna cuenta existe */}
          {!savingsAccount && !primaryInvestmentAccount && <EmptyState />}
        </div>

        {/* — FILA INFERIOR: Otras inversiones (small) — */}
        {hasAnyInvestment && secondaryInvestments.length > 0 && (
          <div>
            <SectionLabel>Otras Inversiones</SectionLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              {secondaryInvestments.map((acc) => (
                <CajitaCard
                  key={acc.id}
                  account={acc}
                  size="small"
                //onClick={() => setViewedAccount(acc.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Estado vacío: hay savingsAccount pero cero inversiones */}
        {savingsAccount && !hasAnyInvestment && (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

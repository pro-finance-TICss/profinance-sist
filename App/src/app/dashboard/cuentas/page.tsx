// ============================================================================
// /dashboard/cuentas — PÁGINA PRINCIPAL DE CUENTAS
// ============================================================================
// Server Component: no requiere "use client".
// Delega toda la lógica de datos y navegación a <AccountsList />.
//
// FASE 4.1 — ESTRUCTURA BASE DE CUENTAS
// ============================================================================

import React from "react";
import { AccountsList } from "@/components/dashboard/AccountsList";

export const metadata = {
  title: "Mis Cuentas | Pro-Finance",
  description: "Visualiza y administra todas tus cuentas financieras.",
};

export default function CuentasPage() {
  return (
    <div
      style={{
        maxWidth: "720px",
        margin: "0 auto",
        padding: "32px 20px 48px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      {/* — Encabezado — */}
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: "1.6rem",
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: "-0.5px",
          }}
        >
          Mis Cuentas
        </h1>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.4)",
            fontWeight: 400,
          }}
        >
          Selecciona una cuenta para ver su detalle completo.
        </p>
      </div>

      {/* — Lista de cuentas (Client Component) — */}
      <AccountsList />
    </div>
  );
}

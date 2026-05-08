"use client";

// ============================================================================
// ACCOUNTS LIST — LISTADO DE TODAS LAS CUENTAS DEL USUARIO
// ============================================================================
// Muestra todas las cajitas (savings + investments) en un listado navegable.
// Cada item redirige a /dashboard/cuentas/[id].
//
// FASE 4.1 — ESTRUCTURA BASE DE CUENTAS
// ============================================================================

import React from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/contexts/AccountContext";
import { Account } from "@/contexts/AccountContext";
import { Landmark, TrendingUp, ChevronRight, Loader2 } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

// ============================================================================
// HELPERS DE TIPO
// ============================================================================

const TYPE_META: Record<
  Account["type"],
  { label: string; color: string; dimColor: string; Icon: React.ElementType }
> = {
  SAVINGS: {
    label: "Ahorro",
    color: "#00c97a",
    dimColor: "rgba(0, 201, 122, 0.12)",
    Icon: Landmark,
  },
  INVESTMENT: {
    label: "Inversión",
    color: "#bd8e48",
    dimColor: "rgba(189, 142, 72, 0.12)",
    Icon: TrendingUp,
  },
};

// ============================================================================
// SUBCOMPONENTE: FILA DE CUENTA
// ============================================================================

function AccountRow({ account }: { account: Account }) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const meta = TYPE_META[account.type];
  const { Icon } = meta;

  const [pressed, setPressed] = React.useState(false);

  const handleClick = () => {
    // Feedback visual — no bloquea la navegación
    setPressed(true);
    router.push(`/dashboard/cuentas/${account.id}`);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Ver detalle de ${account.name}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "18px 22px",
        borderRadius: "16px",
        background: pressed
          ? "rgba(255,255,255,0.05)"
          : "rgba(255,255,255,0.025)",
        border: `1px solid rgba(255,255,255,${pressed ? "0.12" : "0.07"})`,
        cursor: "pointer",
        transition:
          "background 0.12s ease, border-color 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease",
        transform: pressed ? "scale(0.985)" : "scale(1)",
        boxShadow: pressed
          ? "none"
          : "0 2px 12px rgba(0,0,0,0.2)",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
      className="account-row"
    >
      {/* Icono */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "12px",
          background: meta.dimColor,
          border: `1px solid ${meta.color}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} color={meta.color} />
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "#FFFFFF",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {account.name}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: meta.color,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
          }}
        >
          {meta.label}
        </p>
      </div>

      {/* Capital */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: "-0.3px",
          }}
        >
          {formatAmount(account.investedCapital)}
        </p>
        <p
          style={{
            margin: "3px 0 0",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.35)",
            fontWeight: 500,
          }}
        >
          Capital invertido
        </p>
      </div>

      {/* Flecha */}
      <ChevronRight
        size={18}
        color="rgba(255,255,255,0.25)"
        style={{ flexShrink: 0, marginLeft: 4 }}
      />

      {/* Hover style global — inyectado una sola vez */}
      <style>{`
        .account-row:hover {
          background: rgba(255,255,255,0.055) !important;
          border-color: rgba(255,255,255,0.14) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 20px rgba(0,0,0,0.35) !important;
        }
        .account-row:focus-visible {
          outline: 2px solid #bd8e48;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AccountsList() {
  const { savingsAccount, investmentAccounts, isLoading } = useAccount();

  const allAccounts = React.useMemo(() => {
    const list: Account[] = [];
    if (savingsAccount) list.push(savingsAccount);
    list.push(...investmentAccounts);
    return list;
  }, [savingsAccount, investmentAccounts]);

  // — Estado: cargando —
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "48px 0",
          color: "rgba(255,255,255,0.3)",
          fontSize: "0.9rem",
        }}
      >
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span>Cargando cuentas…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // — Estado: sin cuentas —
  if (allAccounts.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          padding: "48px 24px",
          borderRadius: "16px",
          border: "1px dashed rgba(189, 142, 72, 0.2)",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
        }}
      >
        <Landmark size={36} color="rgba(189,142,72,0.3)" />
        <p style={{ margin: 0, fontWeight: 500 }}>No tienes cuentas configuradas.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      {allAccounts.map((account) => (
        <AccountRow key={account.id} account={account} />
      ))}
    </div>
  );
}

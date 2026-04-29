"use client";

// ============================================================================
// CAJITA CARD — COMPONENTE PRESENTACIONAL PURO
// ============================================================================
// Muestra una cuenta financiera (cajita) con su nombre, capital y tipo.
// NO contiene lógica de negocio ni fetch de datos.
// Reutilizable en dashboard principal y futuras páginas (/cuentas).
//
// FASE 3 — MULTI-ACCOUNT DASHBOARD
// ============================================================================

import React from "react";
import { useRouter } from "next/navigation";
import { Landmark, TrendingUp } from "lucide-react";
import { Account } from "@/contexts/AccountContext";
import { useCurrency } from "@/contexts/CurrencyContext";

// ============================================================================
// TIPOS
// ============================================================================

export type CajitaCardSize = "large" | "medium" | "small";

export interface CajitaCardProps {
  account: Account;
  size?: CajitaCardSize;
  onClick?: () => void;
}

// ============================================================================
// CONSTANTES DE DISEÑO — CONSISTENTES CON EL SISTEMA EXISTENTE
// ============================================================================

const SIZE_CONFIG: Record<
  CajitaCardSize,
  {
    padding: string;
    nameSize: string;
    capitalSize: string;
    iconSize: number;
    labelSize: string;
    minHeight: string;
  }
> = {
  large: {
    padding: "28px 32px",
    nameSize: "1rem",
    capitalSize: "2.2rem",
    iconSize: 22,
    labelSize: "0.72rem",
    minHeight: "160px",
  },
  medium: {
    padding: "22px 26px",
    nameSize: "0.9rem",
    capitalSize: "1.7rem",
    iconSize: 18,
    labelSize: "0.68rem",
    minHeight: "140px",
  },
  small: {
    padding: "18px 22px",
    nameSize: "0.85rem",
    capitalSize: "1.3rem",
    iconSize: 16,
    labelSize: "0.65rem",
    minHeight: "120px",
  },
};

// Colores por tipo de cuenta — consistentes con el design system dorado/oscuro
const TYPE_CONFIG: Record<
  Account["type"],
  {
    accentColor: string;
    accentColorDim: string;
    borderColor: string;
    badgeLabel: string;
    badgeBg: string;
    iconBg: string;
    Icon: React.ElementType;
  }
> = {
  SAVINGS: {
    accentColor: "#00c97a",
    accentColorDim: "rgba(0, 201, 122, 0.15)",
    borderColor: "rgba(0, 201, 122, 0.35)",
    badgeLabel: "Ahorro",
    badgeBg: "rgba(0, 201, 122, 0.12)",
    iconBg: "rgba(0, 201, 122, 0.1)",
    Icon: Landmark,
  },
  INVESTMENT: {
    accentColor: "#bd8e48",
    accentColorDim: "rgba(189, 142, 72, 0.15)",
    borderColor: "rgba(189, 142, 72, 0.35)",
    badgeLabel: "Inversión",
    badgeBg: "rgba(189, 142, 72, 0.12)",
    iconBg: "rgba(189, 142, 72, 0.1)",
    Icon: TrendingUp,
  },
};

// ============================================================================
// COMPONENTE
// ============================================================================

export function CajitaCard({
  account,
  size = "medium",
  onClick,
}: CajitaCardProps) {
  const router = useRouter();
  const { formatAmount } = useCurrency();
  const sizeConf = SIZE_CONFIG[size];
  const typeConf = TYPE_CONFIG[account.type];
  const { Icon } = typeConf;

  // Efecto visual de clic — feedback inmediato antes de navegar
  const [pressed, setPressed] = React.useState(false);

  // Manejador unificado: onClick externo tiene prioridad;
  // si no se pasa, navega a /dashboard/cuentas/[id] por defecto.
  const handleClick = React.useCallback(() => {
    setPressed(true);
    setTimeout(() => setPressed(false), 200);
    if (onClick) {
      onClick();
    } else if (account.id) {
      router.push(`/dashboard/cuentas/${account.id}`);
    }
  }, [onClick, router, account.id]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Cuenta ${account.name}: ${formatAmount(account.investedCapital)}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{
        position: "relative",
        minHeight: sizeConf.minHeight,
        padding: sizeConf.padding,
        borderRadius: "20px",
        background: pressed ? "rgba(255,255,255,0.03)" : "#080808",
        border: `1px solid ${pressed ? typeConf.accentColor + "88" : typeConf.borderColor}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "16px",
        cursor: "pointer",
        transition: "transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease",
        transform: pressed ? "scale(0.975)" : "scale(1)",
        overflow: "hidden",
        width: "100%",
      }}
      className="cajita-card"
    >
      {/* Glow de fondo sutil */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at top left, ${typeConf.accentColorDim} 0%, transparent 65%)`,
          pointerEvents: "none",
          borderRadius: "20px",
        }}
      />

      {/* — CABECERA: icono + badge de tipo — */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Icono */}
        <div
          style={{
            width: sizeConf.iconSize * 2.2,
            height: sizeConf.iconSize * 2.2,
            borderRadius: "12px",
            background: typeConf.iconBg,
            border: `1px solid ${typeConf.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={sizeConf.iconSize} color={typeConf.accentColor} />
        </div>

        {/* Badge de tipo */}
        <span
          style={{
            fontSize: sizeConf.labelSize,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            color: typeConf.accentColor,
            background: typeConf.badgeBg,
            border: `1px solid ${typeConf.borderColor}`,
            borderRadius: "6px",
            padding: "3px 10px",
          }}
        >
          {typeConf.badgeLabel}
        </span>
      </div>

      {/* — CUERPO: nombre + capital — */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <p
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: sizeConf.nameSize,
            fontWeight: 500,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {account.name}
        </p>

        <p
          style={{
            color: "#FFFFFF",
            fontSize: sizeConf.capitalSize,
            fontWeight: 800,
            letterSpacing: "-0.5px",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {formatAmount(account.investedCapital)}
        </p>
      </div>

      {/* Estilos de hover — inyectados una sola vez */}
      <style>{`
        .cajita-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        }
        .cajita-card:focus-visible {
          outline: 2px solid ${TYPE_CONFIG.SAVINGS.accentColor};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

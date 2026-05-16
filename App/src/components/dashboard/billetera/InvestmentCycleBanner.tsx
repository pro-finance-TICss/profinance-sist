"use client";
import React from "react";
import { Lock, Unlock, Clock, Info } from "lucide-react";

// ── Tipos (espejo del InvestmentCycleInfo sin importar del server) ─────────────
export interface CycleBannerInfo {
  isLocked: boolean;
  cycleLabel: string | null;
  statusLabel: string;
  daysUntilNextOpen: number;
  daysUntilClose: number;
  lockEnd: string | null; // ISO string (serializable desde server)
  nextOpenWindowStart: string | null;
}

interface Props {
  info: CycleBannerInfo;
  /** Si es null/undefined → no mostrar nada (cuenta de ahorros, etc.) */
  visible?: boolean;
}

// Colores del sistema
const GOLD   = "#bd8e48";
const GREEN  = "#00c97a";
const RED    = "#e05c5c";
const AMBER  = "#f59e0b";

export function InvestmentCycleBanner({ info, visible = true }: Props) {
  if (!visible) return null;

  const isLocked = info.isLocked;

  // ── Paleta según estado ─────────────────────────────────────────────────
  const palette = isLocked
    ? { bg: "rgba(224,92,92,0.07)", border: "rgba(224,92,92,0.25)", icon: RED,   Icon: Lock   }
    : { bg: "rgba(0,201,122,0.07)", border: "rgba(0,201,122,0.25)", icon: GREEN, Icon: Unlock };

  // ── Texto secundario ────────────────────────────────────────────────────
  let sub: React.ReactNode = null;

  if (isLocked && info.daysUntilNextOpen > 0) {
    const lockEndLabel = info.lockEnd
      ? new Date(info.lockEnd).toLocaleDateString("es-CO", { day: "numeric", month: "long" })
      : null;

    sub = (
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
        {lockEndLabel && `Bloqueo hasta el ${lockEndLabel}.`}
        {" "}La próxima ventana abre en{" "}
        <strong style={{ color: AMBER }}>
          {info.daysUntilNextOpen === 1
            ? "1 día"
            : `${info.daysUntilNextOpen} días`}
        </strong>.
      </span>
    );
  }

  if (!isLocked && info.daysUntilClose > 0) {
    sub = (
      <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
        Esta ventana cierra en{" "}
        <strong style={{ color: info.daysUntilClose <= 2 ? AMBER : GREEN }}>
          {info.daysUntilClose === 1 ? "1 día" : `${info.daysUntilClose} días`}
        </strong>.
        {" "}Aprovecha para realizar movimientos.
      </span>
    );
  }

  if (!isLocked && info.daysUntilClose === 0) {
    // Diciembre largo, sin restricción
    sub = (
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
        Puedes realizar retiros y aportes libremente.
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 14,
        padding: "14px 18px",
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 14,
        marginBottom: 4,
      }}
    >
      {/* Icono */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: isLocked ? "rgba(224,92,92,0.12)" : "rgba(0,201,122,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <palette.Icon size={18} color={palette.icon} />
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>
          {isLocked
            ? info.cycleLabel ?? "Ciclo de Inversión Activo"
            : "Ventana de Movimiento Libre"}
        </p>
        {sub && <div style={{ marginTop: 3 }}>{sub}</div>}
      </div>

      {/* Chip de estado */}
      <span
        style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "4px 10px",
          borderRadius: 999,
          background: isLocked ? "rgba(224,92,92,0.15)" : "rgba(0,201,122,0.15)",
          color: palette.icon,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {isLocked ? "Bloqueado" : "Abierto"}
      </span>
    </div>
  );
}

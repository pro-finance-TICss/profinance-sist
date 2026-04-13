// ============================================================================
// PÁGINA: ACCESS DENIED - PRO-FINANCE
// ============================================================================
// Server Component — recibe searchParams como prop (Next.js App Router).
//
// Query params:
//   ?reason=no-invite      → Sin link de invitación
//   ?reason=invalid-invite → Código inválido o expirado
//   ?reason=quota-reached  → El anfitrión alcanzó su límite
// ============================================================================

import Link from "next/link";
import { ShieldAlert, Lock, BarChart2, ShieldOff, Info } from "lucide-react";

// ============================================================================
// TIPOS
// ============================================================================

type DenialReason = "no-invite" | "invalid-invite" | "quota-reached" | "unknown";

interface ReasonConfig {
  Icon: React.ElementType;
  title: string;
  description: string;
  hint: string;
}

// ============================================================================
// CONFIGURACIÓN DE MENSAJES
// ============================================================================

const REASON_CONFIG: Record<DenialReason, ReasonConfig> = {
  "no-invite": {
    Icon: Lock,
    title: "Acceso Solo por Invitación",
    description:
      "Pro-Finance opera de forma exclusiva. Para crear una cuenta necesitas un link de invitación personal de un miembro activo.",
    hint: "Si conoces a alguien en la plataforma, pídele que comparta su link de invitación contigo.",
  },
  "invalid-invite": {
    Icon: ShieldAlert,
    title: "Invitación No Válida",
    description:
      "El link de invitación que usaste no es válido, o bien ya fue usado anteriormente.",
    hint: "Solicita un nuevo link directamente a la persona que te invitó. Los links son de un solo uso por sesión.",
  },
  "quota-reached": {
    Icon: BarChart2,
    title: "Cupo Agotado",
    description:
      "El usuario que te invitó ha alcanzado su límite máximo de referencias por el momento.",
    hint: "Contacta a tu anfitrión o busca otro miembro activo que pueda invitarte.",
  },
  unknown: {
    Icon: ShieldOff,
    title: "Acceso Restringido",
    description:
      "No tienes permiso para acceder a esta página en este momento.",
    hint: "Los Accesos Son Restringidos Por Seguridad Actualmente.",
  },
};

// ============================================================================
// PÁGINA PRINCIPAL (Server Component)
// ============================================================================

interface PageProps {
  searchParams: { reason?: string };
}

export default function AccessDeniedPage({ searchParams }: PageProps) {
  const rawReason = searchParams?.reason as DenialReason | undefined;
  const reason: DenialReason =
    rawReason && rawReason in REASON_CONFIG ? rawReason : "unknown";

  const { Icon, title, description, hint } = REASON_CONFIG[reason];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ── CARD PRINCIPAL ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#080808",
          border: "1px solid rgba(189, 142, 72, 0.3)",
          borderRadius: "24px",
          padding: "48px 40px",
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          boxShadow:
            "0 0 0 1px rgba(189,142,72,0.04), 0 32px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── BRANDING ───────────────────────────────────────────────────── */}
        <p
          style={{
            color: "rgba(189, 142, 72, 0.8)",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px",
            margin: "0 0 32px 0",
          }}
        >
          PRO-FINANCE
        </p>

        {/* ── ICONO ──────────────────────────────────────────────────────── */}
        <div
          style={{
            width: "72px",
            height: "72px",
            background: "rgba(189, 142, 72, 0.08)",
            border: "1px solid rgba(189, 142, 72, 0.25)",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 28px",
          }}
        >
          <Icon size={34} color="#bd8e48" />
        </div>

        {/* ── LABEL DE SECCIÓN ───────────────────────────────────────────── */}
        <p
          style={{
            color: "rgba(189, 142, 72, 0.8)",
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "1px",
            margin: "0 0 10px 0",
          }}
        >
          Control de Seguridad
        </p>

        {/* ── TÍTULO ─────────────────────────────────────────────────────── */}
        <h1
          style={{
            color: "#ffffff",
            fontSize: "1.65rem",
            fontWeight: 800,
            lineHeight: 1.3,
            margin: "0 0 14px 0",
          }}
        >
          {title}
        </h1>

        {/* ── DESCRIPCIÓN ────────────────────────────────────────────────── */}
        <p
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: "0.95rem",
            lineHeight: 1.7,
            margin: "0 0 24px 0",
          }}
        >
          {description}
        </p>

        {/* ── HINT CONTEXTUAL ────────────────────────────────────────────── */}
        <div
          style={{
            background: "rgba(189, 142, 72, 0.06)",
            border: "1px solid rgba(189, 142, 72, 0.2)",
            borderRadius: "12px",
            padding: "16px 18px",
            marginBottom: "32px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
            textAlign: "left",
          }}
        >
          <Info
            size={16}
            color="#bd8e48"
            style={{ flexShrink: 0, marginTop: "2px" }}
          />
          <p
            style={{
              color: "rgba(255, 255, 255, 0.5)",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {hint}
          </p>
        </div>

        {/* ── SEPARADOR ──────────────────────────────────────────────────── */}
        <div
          style={{
            height: "1px",
            background: "rgba(189, 142, 72, 0.15)",
            marginBottom: "28px",
          }}
        />

        {/* ── ACCIONES ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Botón principal — mismo estilo que botón copy del dashboard */}
          <Link
            href="/"
            id="access-denied-home-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "14px 22px",
              background: "rgba(189, 142, 72, 0.12)",
              border: "1px solid rgba(189, 142, 72, 0.4)",
              borderRadius: "12px",
              color: "#bd8e48",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              transition: "all 0.3s",
              letterSpacing: "0.01em",
            }}
          >
            Volver al Inicio
          </Link>

          {/* Botón secundario — outline sutil */}
          <Link
            href="/login"
            id="access-denied-login-btn"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "14px 22px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(189, 142, 72, 0.2)",
              borderRadius: "12px",
              color: "rgba(255, 255, 255, 0.5)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              transition: "all 0.3s",
            }}
          >
            Saber Más
          </Link>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <p
          style={{
            marginTop: "32px",
            fontSize: "0.72rem",
            color: "rgba(255, 255, 255, 0.2)",
            letterSpacing: "0.5px",
            lineHeight: 1.5,
            margin: "32px 0 0 0",
          }}
        >
          Pro-Finance Security Protocol v1.5
        </p>
      </div>
    </div>
  );
}

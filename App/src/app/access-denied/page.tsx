"use client";

// ============================================================================
// PÁGINA: ACCESS DENIED - PRO-FINANCE
// ============================================================================
// Muestra mensajes de error contextuales según el motivo de rechazo
// al intentar acceder a /register sin invitación válida.
//
// Query params:
//   ?reason=no-invite      → Sin link de invitación
//   ?reason=invalid-invite → Código inválido o expirado
//   ?reason=quota-reached  → El anfitrión alcanzó su límite
// ============================================================================

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

// ============================================================================
// TIPOS
// ============================================================================

type DenialReason = "no-invite" | "invalid-invite" | "quota-reached" | "unknown";

interface ReasonConfig {
  icon: string;
  title: string;
  description: string;
  hint: string;
  accentColor: string;
}

// ============================================================================
// CONFIGURACIÓN DE MENSAJES
// ============================================================================

const REASON_CONFIG: Record<DenialReason, ReasonConfig> = {
  "no-invite": {
    icon: "🔒",
    title: "Acceso Solo por Invitación",
    description:
      "Pro-Finance opera de forma exclusiva. Para crear una cuenta necesitas un link de invitación personal de un miembro activo.",
    hint: "Si conoces a alguien en la plataforma, pídele que comparta su link de invitación contigo.",
    accentColor: "#8B6914",
  },
  "invalid-invite": {
    icon: "🔗",
    title: "Invitación No Válida",
    description:
      "El link de invitación que usaste no es válido, o bien ya fue usado anteriormente.",
    hint: "Solicita un nuevo link directamente a la persona que te invitó. Los links son de un solo uso por sesión.",
    accentColor: "#c0392b",
  },
  "quota-reached": {
    icon: "📊",
    title: "Cupo Agotado",
    description:
      "El usuario que te invitó ha alcanzado su límite máximo de referencias por el momento.",
    hint: "Contacta a tu anfitrión o busca otro miembro activo que pueda invitarte.",
    accentColor: "#8B6914",
  },
  unknown: {
    icon: "⛔",
    title: "Acceso Denegado",
    description:
      "No tienes permiso para acceder a esta página en este momento.",
    hint: "Si crees que esto es un error, contacta al soporte.",
    accentColor: "#555",
  },
};

// ============================================================================
// COMPONENTE INTERNO (requiere useSearchParams — dentro de Suspense)
// ============================================================================

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const rawReason = searchParams.get("reason") as DenialReason | null;
  const reason: DenialReason =
    rawReason && rawReason in REASON_CONFIG ? rawReason : "unknown";

  const config = REASON_CONFIG[reason];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Card principal */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "3rem 2.5rem",
          maxWidth: "520px",
          width: "100%",
          textAlign: "center",
          boxShadow: "0 32px 64px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Branding */}
        <div
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.15em",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "rgba(189, 142, 72, 0.8)",
            marginBottom: "2rem",
          }}
        >
          PRO-FINANCE
        </div>

        {/* Icono */}
        <div
          style={{
            fontSize: "4.5rem",
            lineHeight: 1,
            marginBottom: "1.5rem",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
          }}
        >
          {config.icon}
        </div>

        {/* Título */}
        <h1
          style={{
            fontSize: "1.65rem",
            fontWeight: 800,
            color: "#ffffff",
            marginBottom: "1rem",
            lineHeight: 1.3,
          }}
        >
          {config.title}
        </h1>

        {/* Descripción */}
        <p
          style={{
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "1rem",
            lineHeight: 1.7,
            marginBottom: "1.5rem",
          }}
        >
          {config.description}
        </p>

        {/* Hint contextual */}
        <div
          style={{
            background: `rgba(189, 142, 72, 0.1)`,
            border: `1px solid rgba(189, 142, 72, 0.25)`,
            borderRadius: "12px",
            padding: "1rem 1.25rem",
            marginBottom: "2.5rem",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "0.1rem" }}>
            💡
          </span>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.65)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {config.hint}
          </p>
        </div>

        {/* Separador */}
        <div
          style={{
            height: "1px",
            background: "rgba(255, 255, 255, 0.08)",
            marginBottom: "2rem",
          }}
        />

        {/* Acciones */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <Link
            href="/login"
            style={{
              display: "block",
              padding: "0.9rem 1.5rem",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #bd8e48, #a07030)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              letterSpacing: "0.02em",
              transition: "opacity 0.2s",
            }}
            id="access-denied-login-btn"
          >
            Iniciar Sesión
          </Link>

          <Link
            href="/"
            style={{
              display: "block",
              padding: "0.9rem 1.5rem",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.7)",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              transition: "background 0.2s",
            }}
            id="access-denied-home-btn"
          >
            Volver al Inicio
          </Link>
        </div>

        {/* Footer legal */}
        <p
          style={{
            marginTop: "2rem",
            fontSize: "0.75rem",
            color: "rgba(255, 255, 255, 0.3)",
            lineHeight: 1.5,
          }}
        >
          Pro-Finance es una plataforma de inversión de acceso cerrado.
          <br />
          El registro solo está disponible por invitación directa.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL (exportada)
// ============================================================================

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid rgba(189,142,72,0.3)",
              borderTopColor: "#bd8e48",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      }
    >
      <AccessDeniedContent />
    </Suspense>
  );
}

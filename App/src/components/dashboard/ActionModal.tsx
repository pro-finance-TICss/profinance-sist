"use client";
// ============================================================================
// COMPONENTE: MODAL DE ACCIONES - PRO-FINANCE (OPTIMIZADO)
// ============================================================================
// Modal reutilizable para formularios de acciones.
// Optimizado: sin backdropFilter blur para evitar ralentización.
// ============================================================================

import React, { memo } from "react";
import { X } from "lucide-react";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Estilos estáticos fuera del componente para evitar recrearlos en cada render
const STYLES = {
  wrapper: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
  },
  overlay: {
    position: "absolute" as const,
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    animation: "actionModalFadeIn 0.2s ease",
  },
  card: {
    position: "relative" as const,
    width: "100%",
    maxWidth: "420px",
    backgroundColor: "rgba(10, 10, 10, 0.98)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "24px",
    padding: "40px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
    animation: "actionModalFadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  headerWrapper: {
    textAlign: "center" as const,
    marginBottom: "32px",
    position: "relative" as const,
  },
  title: {
    color: "#fff",
    fontSize: "1.4rem",
    fontWeight: "500" as const,
    margin: 0,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
  },
  closeButton: {
    position: "absolute" as const,
    right: "-10px",
    top: "-10px",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    padding: "5px",
  },
  content: { width: "100%" },
} as const;

// CSS de keyframes inyectado una sola vez
const KEYFRAMES_CSS = `
@keyframes actionModalFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes actionModalFadeUp { 
  from { opacity: 0; transform: translateY(10px) scale(0.98); } 
  to { opacity: 1; transform: translateY(0) scale(1); } 
}`;

function ActionModalInner({ isOpen, onClose, title, children }: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <div style={STYLES.wrapper}>
      <style>{KEYFRAMES_CSS}</style>

      {/* Overlay oscuro sin blur — mucho más rápido */}
      <div onClick={onClose} style={STYLES.overlay} />

      {/* Ventana del Modal */}
      <div style={STYLES.card}>
        {/* Header estilizado */}
        <div style={STYLES.headerWrapper}>
          <h2 style={STYLES.title}>{title}</h2>
          <button onClick={onClose} style={STYLES.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Contenido del Formulario */}
        <div style={STYLES.content}>{children}</div>
      </div>
    </div>
  );
}

// Memo previene re-renders innecesarios cuando el padre cambia pero las props no
export const ActionModal = memo(ActionModalInner);
ActionModal.displayName = "ActionModal";
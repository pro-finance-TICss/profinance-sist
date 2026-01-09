// ============================================================================
// MODAL DE ADVERTENCIA DE INACTIVIDAD - PRO-FINANCE
// ============================================================================
// Modal que se muestra cuando el usuario está a punto de ser desconectado
// por inactividad. Incluye countdown y opciones de continuar o cerrar sesión.
// ============================================================================

"use client";

import { useState, useEffect } from "react";
import styles from "./InactivityModal.module.css";

interface InactivityModalProps {
  /** Si el modal está visible */
  isOpen: boolean;
  /** Segundos restantes antes del logout automático */
  secondsRemaining: number;
  /** Callback para cuando el usuario decide continuar la sesión */
  onContinue: () => void;
  /** Callback para cerrar sesión manualmente */
  onLogout: () => void;
}

/**
 * Modal de advertencia de inactividad.
 * Muestra un countdown visual y permite al usuario extender su sesión.
 */
export function InactivityModal({
  isOpen,
  secondsRemaining,
  onContinue,
  onLogout,
}: InactivityModalProps) {
  if (!isOpen) return null;

  // Formatear segundos como MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Icono de advertencia */}
        <div className={styles.iconContainer}>
          <span className={styles.icon}>⚠️</span>
        </div>

        {/* Título */}
        <h2 className={styles.title}>Sesión por expirar</h2>

        {/* Mensaje */}
        <p className={styles.message}>Tu sesión expirará por inactividad en:</p>

        {/* Countdown */}
        <div className={styles.countdown}>
          <span className={styles.countdownTime}>{formattedTime}</span>
        </div>

        {/* Mensaje adicional */}
        <p className={styles.submessage}>¿Deseas continuar trabajando?</p>

        {/* Botones */}
        <div className={styles.actions}>
          <button className={styles.continueButton} onClick={onContinue}>
            Continuar sesión
          </button>
          <button className={styles.logoutButton} onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

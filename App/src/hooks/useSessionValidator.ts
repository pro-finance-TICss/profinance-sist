"use client";

import { useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";

/**
 * Hook para verificar la validez de la sesión periódicamente.
 * Si la sesión ha sido revocada, cierra sesión automáticamente.
 *
 * @param intervalMs - Intervalo de verificación en milisegundos (default: 30 segundos)
 */
export function useSessionValidator(intervalMs: number = 30000) {
  const validateSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/verify-session");
      const data = await response.json();

      if (!data.valid) {
        console.log("❌ Sesión inválida:", data.reason);

        // Mostrar mensaje antes de cerrar sesión
        if (data.reason === "session_revoked") {
          alert("Tu sesión ha sido cerrada desde otro dispositivo.");
        } else if (data.reason === "session_expired") {
          alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        }

        // Cerrar sesión
        await signOut({ callbackUrl: "/login" });
      }
    } catch (error) {
      // Error de red - no hacer nada, reintentar en el próximo intervalo
      console.error("Error verificando sesión:", error);
    }
  }, []);

  useEffect(() => {
    // Verificar inmediatamente al montar
    validateSession();

    // Configurar verificación periódica
    const interval = setInterval(validateSession, intervalMs);

    // También verificar cuando la ventana recupera el foco
    const handleFocus = () => validateSession();
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [validateSession, intervalMs]);
}

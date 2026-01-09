// ============================================================================
// VALIDADOR DE SESIÓN CON DETECCIÓN DE INACTIVIDAD - PRO-FINANCE
// ============================================================================
// Componente cliente que:
// - Detecta inactividad del usuario (mouse, teclado, scroll, touch)
// - Muestra modal de advertencia 2 minutos antes de expirar
// - Ejecuta logout automático al alcanzar el timeout
// - Extiende la sesión automáticamente con actividad
// ============================================================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { InactivityModal } from "./InactivityModal";

// ============================================================================
// CONFIGURACIÓN DE TIMEOUTS (en segundos)
// ============================================================================

/** Tiempo máximo de sesión sin actividad (30 minutos) */
const SESSION_TIMEOUT = 30 * 60;

/** Tiempo antes de mostrar advertencia (28 minutos) */
const WARNING_THRESHOLD = 28 * 60;

/** Intervalo de actualización del contador (1 segundo) */
const TICK_INTERVAL = 1000;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente que valida la sesión y detecta inactividad.
 * Debe incluirse en el layout principal de la aplicación.
 */
export function SessionValidator() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Estado del timer de inactividad
  const [secondsIdle, setSecondsIdle] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ================================================================
  // RUTAS DONDE NO SE APLICA EL VALIDATOR
  // ================================================================
  const isAuthPage = ["/login", "/login2", "/register", "/register2"].some(
    (route) => pathname?.startsWith(route)
  );

  // ================================================================
  // RESETEAR TIMER DE INACTIVIDAD
  // ================================================================
  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsIdle(0);
    setShowWarning(false);
  }, []);

  // ================================================================
  // MANEJAR EVENTOS DE ACTIVIDAD DEL USUARIO
  // ================================================================
  useEffect(() => {
    // No aplicar en páginas de auth o si no hay sesión
    if (isAuthPage || status !== "authenticated") {
      return;
    }

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Throttle para evitar demasiadas actualizaciones
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleActivity = () => {
      if (throttleTimeout) return;

      throttleTimeout = setTimeout(() => {
        resetIdleTimer();
        throttleTimeout = null;
      }, 1000); // Solo procesar una vez por segundo
    };

    // Registrar listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [isAuthPage, status, resetIdleTimer]);

  // ================================================================
  // TIMER DE INACTIVIDAD
  // ================================================================
  useEffect(() => {
    // No aplicar en páginas de auth o si no hay sesión
    if (isAuthPage || status !== "authenticated") {
      return;
    }

    // Iniciar timer
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const idleSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      setSecondsIdle(idleSeconds);

      // Mostrar advertencia si se alcanza el threshold
      if (idleSeconds >= WARNING_THRESHOLD && !showWarning) {
        setShowWarning(true);
        console.log("⚠️ Sesión por expirar - Mostrando advertencia");
      }

      // Logout automático si se alcanza el timeout
      if (idleSeconds >= SESSION_TIMEOUT) {
        console.log("🔒 Sesión expirada por inactividad - Cerrando sesión");
        handleLogout();
      }
    }, TICK_INTERVAL);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAuthPage, status, showWarning]);

  // ================================================================
  // HANDLERS
  // ================================================================
  const handleContinue = useCallback(() => {
    console.log("✅ Usuario decidió continuar la sesión");
    resetIdleTimer();
  }, [resetIdleTimer]);

  const handleLogout = useCallback(async () => {
    console.log("🚪 Cerrando sesión...");
    await signOut({ callbackUrl: "/login2" });
  }, []);

  // ================================================================
  // RENDER
  // ================================================================

  // No renderizar nada si no hay sesión o es página de auth
  if (isAuthPage || status !== "authenticated") {
    return null;
  }

  // Calcular segundos restantes para el countdown
  const secondsRemaining = SESSION_TIMEOUT - secondsIdle;

  return (
    <InactivityModal
      isOpen={showWarning}
      secondsRemaining={Math.max(0, secondsRemaining)}
      onContinue={handleContinue}
      onLogout={handleLogout}
    />
  );
}

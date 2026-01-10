// ============================================================================
// PROVEEDOR DE SESIÓN - PRO-FINANCE
// ============================================================================
// Wrapper para SessionProvider de NextAuth que incluye el SessionValidator.
// Debe usarse en el layout principal para habilitar useSession en toda la app.
// ============================================================================

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { SessionValidator } from "./SessionValidator";
import type { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Proveedor de autenticación que envuelve la aplicación.
 * Incluye:
 * - SessionProvider de NextAuth para habilitar useSession
 * - SessionValidator para detección de inactividad
 */
export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <NextAuthSessionProvider
      // Refetch session cada 5 minutos para mantener sincronización
      refetchInterval={5 * 60}
      // Refetch al enfocar la ventana (usuario vuelve a la pestaña)
      refetchOnWindowFocus={true}
    >
      {/* Validador de sesión con detección de inactividad */}
      <SessionValidator />
      {children}
    </NextAuthSessionProvider>
  );
}

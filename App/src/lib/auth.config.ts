// ============================================================================
// CONFIGURACIÓN EDGE-COMPATIBLE DE NEXTAUTH - PRO-FINANCE
// ============================================================================
// Configuración separada para ser usada en middleware (Edge Runtime).
// NO debe contener dependencias de Node.js nativas ni Prisma.
// ============================================================================

import type { NextAuthConfig } from "next-auth";

/**
 * Configuración base de NextAuth compatible con Edge Runtime.
 * Se usa en middleware.ts para validación ligera de autenticación.
 */
export const authConfig: NextAuthConfig = {
  // ================================================================
  // PÁGINAS PERSONALIZADAS
  // ================================================================
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ================================================================
  // CONFIGURACIÓN DE SESIÓN
  // ================================================================
  session: {
    strategy: "jwt",
    // 30 minutos de sesión máxima (estándar bancario)
    maxAge: 30 * 60,
    // Actualizar sesión cada 5 minutos si hay actividad (sesión rodante)
    updateAge: 5 * 60,
  },

  // ================================================================
  // CONFIGURACIÓN DE COOKIES SEGURAS
  // ================================================================
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        // HttpOnly: JavaScript del cliente NO puede leer esta cookie (previene XSS)
        httpOnly: true,
        // SameSite: Previene envío de cookie en requests cross-site (previene CSRF)
        sameSite: "lax",
        // Path: Cookie disponible en toda la aplicación
        path: "/",
        // Secure: Solo enviar cookie por HTTPS (en producción)
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  // ================================================================
  // CALLBACKS DE AUTORIZACIÓN
  // ================================================================
  callbacks: {
    /**
     * Callback authorized: Determina si el usuario puede acceder a una ruta.
     * Se ejecuta en Edge Runtime (middleware).
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      // Ruta de configuración de seguridad obligatoria
      const isSetupSecurityRoute = pathname === "/setup-security";

      // Rutas protegidas que requieren autenticación
      const protectedRoutes = [
        "/dashboard",
        "/home",
        "/settings",
        "/profile",
        "/admin",
        "/superadmin",
        "/select-account", // NUEVO: Pantalla de selección de cuenta
      ];
      const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // Rutas de invitado (solo para usuarios no autenticados)
      const guestRoutes = ["/login", "/register"];
      const isGuestRoute = guestRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // Si intenta acceder a ruta protegida sin autenticación
      if (isProtectedRoute && !isLoggedIn) {
        return false; // Redirige a signIn page
      }

      // Si está autenticado e intenta acceder a ruta de invitado
      if (isGuestRoute && isLoggedIn) {
        // Verificar si el usuario necesita completar configuración de seguridad
        // @ts-ignore - El campo existe en el token pero TypeScript no lo reconoce aquí
        if (auth?.user?.requiresSecuritySetup) {
          return Response.redirect(new URL("/setup-security", nextUrl));
        }
        // CAMBIO: Redirigir a /select-account en lugar de /dashboard/fondos
        return Response.redirect(new URL("/select-account", nextUrl));
      }

      // Si el usuario necesita configuración de seguridad y NO está en esa página
      if (isLoggedIn && !isSetupSecurityRoute) {
        // @ts-ignore - El campo existe en el token pero TypeScript no lo reconoce aquí
        if (auth?.user?.requiresSecuritySetup) {
          // Permitir acceso a rutas API (para que funcione el flujo de configuración)
          if (pathname.startsWith("/api/")) {
            return true;
          }
          // Redirigir a configuración de seguridad
          return Response.redirect(new URL("/setup-security", nextUrl));
        }
      }

      // NOTA: No redirigimos desde /setup-security al dashboard aquí.
      // La página /setup-security maneja su propia lógica de verificación
      // y hace signOut para forzar re-login con un token actualizado.

      return true;
    },
  },

  // Providers se definen en auth.ts (no aquí por compatibilidad Edge)
  providers: [],
};

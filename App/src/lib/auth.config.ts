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
    signIn: "/login2",
    error: "/login2",
  },

  // ================================================================
  // CONFIGURACIÓN DE SESIÓN
  // ================================================================
  session: {
    strategy: "jwt",
    // 30 minutos de sesión máxima (estándar bancario)
    maxAge: 30 * 60,
    // Actualizar sesión cada 5 minutos si hay actividad (rolling session)
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

      // Rutas protegidas que requieren autenticación
      const protectedRoutes = ["/dashboard", "/home", "/settings", "/profile"];
      const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // Rutas de invitado (solo para usuarios no autenticados)
      const guestRoutes = ["/login", "/login2", "/register", "/register2"];
      const isGuestRoute = guestRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // Si intenta acceder a ruta protegida sin autenticación
      if (isProtectedRoute && !isLoggedIn) {
        return false; // Redirige a signIn page
      }

      // Si está autenticado e intenta acceder a ruta de invitado
      if (isGuestRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard/fondos", nextUrl));
      }

      return true;
    },
  },

  // Providers se definen en auth.ts (no aquí por compatibilidad Edge)
  providers: [],
};

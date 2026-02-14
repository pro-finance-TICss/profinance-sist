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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isSetupSecurityRoute = pathname === "/setup-security";

      // Rutas protegidas (Rama 10 incluye select-account)
      const protectedRoutes = [
        "/dashboard",
        "/home",
        "/settings",
        "/profile",
        "/admin",
        "/superadmin",
        "/select-account",
      ];

      const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      const guestRoutes = ["/login", "/register"];
      const isGuestRoute = guestRoutes.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      );

      // 1. Bloqueo de no autenticados
      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      // 2. Lógica para usuarios autenticados en rutas de invitados (Login/Register)
      if (isGuestRoute && isLoggedIn) {
        if (auth?.user?.requiresSecuritySetup) {
          return Response.redirect(new URL("/setup-security", nextUrl));
        }

        // 🛡️ DECISIÓN ARQUITECTÓNICA RAMA 10: 
        // Obligamos a pasar por el selector de cuenta para inicializar el contexto financiero
        return Response.redirect(new URL("/select-account", nextUrl));
      }

      // 3. Verificación de seguridad obligatoria
      if (isLoggedIn && !isSetupSecurityRoute) {
        if (auth?.user?.requiresSecuritySetup) {
          if (pathname.startsWith("/api/")) return true;
          return Response.redirect(new URL("/setup-security", nextUrl));
        }
      }

      return true;
    },
  },

  // Providers se definen en auth.ts (no aquí por compatibilidad Edge)
  providers: [],
};

// ============================================================================
// MIDDLEWARE DE PROTECCIÓN DE RUTAS
// ============================================================================
// Intercepta todas las requests para verificar autenticación.
// Protege rutas privadas y redirige usuarios autenticados desde rutas de guest.
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

/**
 * Rutas que requieren autenticación.
 * Si el usuario no tiene sesión, será redirigido a /login.
 */
const PROTECTED_ROUTES = ["/dashboard", "/home", "/settings"];

/**
 * Rutas exclusivas para usuarios no autenticados.
 * Si el usuario YA tiene sesión, será redirigido a /dashboard.
 */
const GUEST_ROUTES = ["/login", "/register"];

/**
 * Rutas públicas que no requieren autenticación.
 * Accesibles para todos los usuarios.
 */
const PUBLIC_ROUTES = ["/", "/api"];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Verifica si una ruta comienza con alguno de los prefijos dados.
 * @param pathname - Ruta actual
 * @param routes - Lista de prefijos de rutas
 * @returns true si la ruta coincide con algún prefijo
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

/**
 * Middleware de NextAuth que intercepta todas las requests.
 * Maneja autenticación, protección de rutas y headers de caché.
 */
export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener sesión del usuario
  // @ts-expect-error - NextAuth v5 beta types
  const session = request.auth;

  // ================================================================
  // HEADERS DE SEGURIDAD (Anti back-button)
  // ================================================================
  const response = NextResponse.next();

  // Prevenir que el navegador cachee páginas protegidas
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // ================================================================
  // LÓGICA DE REDIRECCIÓN
  // ================================================================

  // Si la ruta es pública o de API, permitir acceso
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // Si el usuario NO tiene sesión y trata de acceder a ruta protegida
  if (!session && matchesRoute(pathname, PROTECTED_ROUTES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si el usuario SÍ tiene sesión y trata de acceder a ruta de guest
  if (session && matchesRoute(pathname, GUEST_ROUTES)) {
    return NextResponse.redirect(new URL("/dashboard/fondos", request.url));
  }

  return response;
});

// ============================================================================
// CONFIGURACIÓN DEL MATCHER
// ============================================================================

/**
 * Rutas que el middleware debe interceptar.
 * Excluye archivos estáticos y assets.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};

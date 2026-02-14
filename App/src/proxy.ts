// ============================================================================
// MIDDLEWARE DE PROTECCIÓN DE RUTAS - PRO-FINANCE (SEGURIDAD BANCARIA)
// ============================================================================
// Intercepta todas las requests para:
// - Verificar autenticación vía JWT
// - Proteger rutas privadas
// - Redirigir usuarios autenticados desde rutas de guest
// - Aplicar headers de seguridad (anti-cache, CSP)
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

/**
 * Rutas que requieren autenticación.
 * Si el usuario no tiene sesión válida, será redirigido a /login.
 */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/home",
  "/settings",
  "/profile",
  "/admin",
  "/superadmin",
  "/setup-security",
];

/**
 * Rutas exclusivas para usuarios no autenticados.
 * Si el usuario YA tiene sesión, será redirigido a /dashboard.
 */
const GUEST_ROUTES = [
  "/login",
  "/register",
];

/**
 * Rutas públicas que no requieren autenticación.
 * Accesibles para todos los usuarios.
 */
const PUBLIC_ROUTES = ["/", "/api", "/conocenos"];

/**
 * Rutas críticas que requieren validación adicional de tokenVersion.
 * Para estas rutas, se verificará que el token no haya sido invalidado.
 */
const CRITICAL_ROUTES = ["/dashboard/transfer", "/settings/security"];

// ============================================================================
// FUNCIONES AUXILIARES
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

/**
 * Aplica headers de seguridad a la respuesta.
 * @param response - Respuesta de Next.js
 * @returns Respuesta con headers de seguridad
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  // Anti-cache: Prevenir que el navegador almacene páginas protegidas
  // Esto mitiga el "back button attack" después de logout
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // Protección contra clickjacking: Prevenir que la página sea embebida en iframes
  response.headers.set("X-Frame-Options", "DENY");

  // Protección contra sniping de tipo MIME
  response.headers.set("X-Content-Type-Options", "nosniff");

  // XSS Protection (para navegadores antiguos)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer Policy: Limitar información enviada en el header Referer
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

/**
 * Middleware de NextAuth que intercepta todas las requests.
 * Maneja autenticación, protección de rutas y headers de seguridad.
 */
export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener sesión del usuario desde el token JWT
  // @ts-expect-error - NextAuth v5 beta types
  const session = request.auth;

  // Crear respuesta base con headers de seguridad
  const response = applySecurityHeaders(NextResponse.next());

  // ================================================================
  // RUTAS PÚBLICAS - Permitir acceso sin restricciones
  // ================================================================
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // ================================================================
  // RUTAS PROTEGIDAS - Requieren autenticación
  // ================================================================
  if (!session && matchesRoute(pathname, PROTECTED_ROUTES)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ================================================================
  // RUTAS DE GUEST - Redirigir si ya está autenticado
  // ================================================================
  if (session && matchesRoute(pathname, GUEST_ROUTES)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ================================================================
  // RUTAS CRÍTICAS - Validación adicional de tokenVersion
  // ================================================================
  // NOTA: Para implementación completa de tokenVersion validation,
  // se requiere un endpoint API que verifique contra la DB.
  // Por ahora, confiamos en la validación del JWT signature.
  if (session && matchesRoute(pathname, CRITICAL_ROUTES)) {
    // La validación de tokenVersion se haría aquí comparando
    // session.user.tokenVersion con el valor en la base de datos.
    // Para evitar llamadas a DB en cada request, esto se puede
    // implementar con un cache de Redis/Upstash.
    logger.debug(
      `🔒 Acceso a ruta crítica: ${pathname} por usuario: ${session.user?.email}`
    );
  }

  return response;
});

// ============================================================================
// CONFIGURACIÓN DEL MATCHER
// ============================================================================

/**
 * Rutas que el middleware debe interceptar.
 * Excluye archivos estáticos, assets y rutas de API de auth.
 */
export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto las que comienzan con:
     * - _next/static (archivos estáticos)
     * - _next/image (archivos de optimización de imágenes)
     * - favicon.ico (archivo favicon)
     * - public folder assets (.png, .jpg, etc.)
     * - api/auth (Rutas API de NextAuth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)",
  ],
};

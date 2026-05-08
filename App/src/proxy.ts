// ============================================================================
// MIDDLEWARE DE PROTECCIÓN DE RUTAS - PRO-FINANCE (SEGURIDAD BANCARIA)
// ============================================================================
// Intercepta todas las requests para:
// - Verificar autenticación vía JWT
// - Proteger rutas privadas
// - Redirigir usuarios autenticados desde rutas de guest
// - Aplicar headers de seguridad (anti-cache, CSP)
// - Guard Invite-Only para /register (cookie pf_ref, rate-limit, cuota)
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
 * NOTA: /register es manejado antes por el guard invite-only.
 */
const GUEST_ROUTES = [
  "/login",
  "/register",
];

/**
 * Rutas públicas que no requieren autenticación.
 * Accesibles para todos los usuarios.
 */
const PUBLIC_ROUTES = ["/", "/api", "/conocenos", "/access-denied"];

/**
 * Rutas críticas que requieren validación adicional de tokenVersion.
 * Para estas rutas, se verificará que el token no haya sido invalidado.
 */
const CRITICAL_ROUTES = ["/dashboard/transfer", "/settings/security"];

// ============================================================================
// CONSTANTES — INVITE-ONLY
// ============================================================================

/** Nombre de la cookie segura que almacena el referral code validado. */
export const REFERRAL_COOKIE_NAME = "pf_ref";

/** Tiempo de vida de la cookie de referido: 60 minutos en segundos. */
const REFERRAL_COOKIE_TTL_SECONDS = 60 * 60;

// ============================================================================
// RATE LIMITING — IN-MEMORY (Edge Runtime)
// ============================================================================
// Implementación MVP con Map en memoria para Edge Runtime.
// ARQUITECTURA EXTENSIBLE: para migrar a Redis/Upstash, reemplazar
// únicamente el cuerpo de checkRateLimit() — el resto del código no cambia.

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

const RATE_LIMIT_CONFIG = {
  /** Máximos intentos permitidos por ventana de tiempo. */
  maxRequests: 10,
  /** Ventana de tiempo en milisegundos (1 minuto). */
  windowMs: 60 * 1000,
} as const;

/**
 * Verifica si un identificador supera el límite de requests.
 * Interfaz diseñada para ser reemplazada por Upstash Redis sin cambios externos.
 *
 * @param identifier - Clave única (ej: "register:<IP>")
 */
function checkRateLimit(identifier: string): {
  limited: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const bucket = rateLimitStore.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    const newBucket: RateLimitBucket = {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
    };
    rateLimitStore.set(identifier, newBucket);
    return {
      limited: false,
      remaining: RATE_LIMIT_CONFIG.maxRequests - 1,
      resetAt: newBucket.resetAt,
    };
  }

  bucket.count++;

  if (bucket.count > RATE_LIMIT_CONFIG.maxRequests) {
    return { limited: true, remaining: 0, resetAt: bucket.resetAt };
  }

  return {
    limited: false,
    remaining: RATE_LIMIT_CONFIG.maxRequests - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Limpieza probabilística del store (~5% de las veces) para evitar
 * memory leaks en Edge Runtime sin impactar el rendimiento.
 */
function maybeCleanupRateLimitStore(): void {
  if (Math.random() > 0.05) return;
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now > bucket.resetAt) rateLimitStore.delete(key);
  }
}

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

/**
 * Extrae la IP del cliente de forma robusta desde los headers del request.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

/**
 * Middleware de NextAuth que intercepta todas las requests.
 * Maneja autenticación, guard invite-only de /register,
 * protección de rutas y headers de seguridad.
 */
export default auth(async function middleware(request: NextRequest) {
  maybeCleanupRateLimitStore();

  const { pathname } = request.nextUrl;

  // Obtener sesión del usuario desde el token JWT
  // @ts-expect-error - NextAuth v5 beta types
  const session = request.auth;

  // Crear respuesta base con headers de seguridad (única instancia)
  const response = applySecurityHeaders(NextResponse.next());

  // ================================================================
  // RUTAS PÚBLICAS - Permitir acceso sin restricciones
  // ================================================================
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return response;
  }

  // ================================================================
  // GUARD INVITE-ONLY: /register
  // Se ejecuta ANTES que GUEST_ROUTES para poder manejar el caso
  // de usuario autenticado y el flujo de invitación de forma específica.
  // ================================================================
  if (pathname.startsWith("/register")) {
    const { searchParams, origin } = request.nextUrl;

    // ── 1. Usuario autenticado → redirigir a /dashboard ──────────────────
    if (session) {
      logger.debug("[proxy] Usuario autenticado en /register → /dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ── 2. Sin ?ref → acceso denegado ────────────────────────────────────
    const refParam = searchParams.get("ref");
    if (!refParam || refParam.trim().length === 0) {
      logger.debug("[proxy] /register sin ?ref → access-denied");
      return NextResponse.redirect(
        new URL("/access-denied?reason=no-invite", request.url)
      );
    }

    const normalizedCode = refParam.trim().toUpperCase();

    // ── 3. Rate limiting por IP (anti brute-force) ────────────────────────
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`register:${clientIp}`);

    if (rateCheck.limited) {
      logger.warn(`[proxy] Rate limit superado — IP: ${clientIp}`);
      const tooManyResponse = new NextResponse(
        JSON.stringify({ error: "Too Many Requests" }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
      applySecurityHeaders(tooManyResponse);
      tooManyResponse.headers.set(
        "Retry-After",
        String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000))
      );
      return tooManyResponse;
    }

    // ── 4. Validar código via endpoint interno ────────────────────────────
    const validateUrl = `${origin}/api/referrals/validate?code=${encodeURIComponent(normalizedCode)}`;
    let validateResponse: Response;

    try {
      validateResponse = await fetch(validateUrl);
    } catch (error) {
      logger.error("[proxy] Error al llamar al endpoint de validación:", error);
      return NextResponse.redirect(
        new URL("/access-denied?reason=invalid-invite", request.url)
      );
    }

    // 404 → código no encontrado
    if (validateResponse.status === 404) {
      logger.debug(`[proxy] Código inválido: ${normalizedCode}`);
      return NextResponse.redirect(
        new URL("/access-denied?reason=invalid-invite", request.url)
      );
    }

    // 409 → cupo alcanzado
    if (validateResponse.status === 409) {
      logger.debug(`[proxy] Cupo alcanzado para código: ${normalizedCode}`);
      return NextResponse.redirect(
        new URL("/access-denied?reason=quota-reached", request.url)
      );
    }

    // Cualquier otro error → denegar por seguridad (fail-closed)
    if (!validateResponse.ok) {
      logger.error(`[proxy] Endpoint de validación retornó ${validateResponse.status}`);
      return NextResponse.redirect(
        new URL("/access-denied?reason=invalid-invite", request.url)
      );
    }

    // ── 5. Código válido → set cookie pf_ref y continuar ─────────────────
    // Reutilizamos la respuesta base (applySecurityHeaders ya aplicado).
    // NO se crea una nueva instancia de NextResponse.
    logger.debug(`[proxy] ✅ Código válido: ${normalizedCode} — set cookie pf_ref`);
    const isProduction = process.env.NODE_ENV === "production";

    response.cookies.set(REFERRAL_COOKIE_NAME, normalizedCode, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: REFERRAL_COOKIE_TTL_SECONDS,
    });

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
  // (/register ya fue manejado arriba; aquí solo aplica a /login)
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

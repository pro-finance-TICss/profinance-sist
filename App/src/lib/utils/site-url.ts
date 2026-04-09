// ============================================================================
// SITE URL HELPER - PRO-FINANCE
// ============================================================================
// Única fuente de verdad para la URL base de la aplicación.
//
// Usa NEXT_PUBLIC_SITE_URL en todos los entornos.
// Compatible con: Server Components, Edge Runtime, Client Components.
//
// CONFIGURACIÓN OBLIGATORIA EN PRODUCCIÓN:
//   NEXT_PUBLIC_SITE_URL="https://tu-dominio.com"
//
// NUNCA usar NEXTAUTH_URL ni NEXT_PUBLIC_APP_URL para generar links públicos,
// porque en producción pueden contener "localhost".
// ============================================================================

/**
 * Retorna la URL base del sitio, sin trailing slash.
 *
 * Orden de prioridad:
 *   1. NEXT_PUBLIC_SITE_URL  (obligatorio en producción)
 *   2. Fallback a localhost:3000 (solo desarrollo local)
 *
 * @example
 *   getSiteUrl()
 *   // Producción: "https://profinance.com"
 *   // Desarrollo: "http://localhost:3000"
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      // En producción esto siempre debe estar configurado.
      // Logueamos el error sin lanzar excepción para no romper el runtime.
      console.error(
        "[site-url] CRITICAL: NEXT_PUBLIC_SITE_URL is not set in production. " +
          "Referral links will be broken. Set it in your deployment environment."
      );
    }
    return "http://localhost:3000";
  }

  // Normalizar: eliminar trailing slash si existe
  return url.replace(/\/$/, "");
}

/**
 * Construye la URL completa de un referral link dado un código.
 *
 * @param referralCode - Código de referido del usuario (ej: "ABCD1234")
 * @returns URL completa del link de invitación
 *
 * @example
 *   buildReferralLink("ABCD1234")
 *   // "https://profinance.com/register?ref=ABCD1234"
 */
export function buildReferralLink(referralCode: string): string {
  return `${getSiteUrl()}/register?ref=${encodeURIComponent(referralCode)}`;
}

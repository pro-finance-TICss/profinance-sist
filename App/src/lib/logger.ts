// ============================================================================
// LOGGER CENTRALIZADO - PRO-FINANCE
// ============================================================================
// Utilidad de logging que respeta el entorno de ejecución:
// - En DESARROLLO: muestra todos los niveles (debug, info, warn, error)
// - En PRODUCCIÓN: solo muestra warn y error (para evitar exposición de datos)
//
// Uso:
//   import { logger } from "@/lib/logger";
//   logger.debug("Mensaje de depuración", datos);
//   logger.info("Operación completada");
//   logger.warn("Advertencia importante");
//   logger.error("Error crítico", error);
// ============================================================================

const isDev = process.env.NODE_ENV !== "production";

/**
 * Logger centralizado con niveles de severidad.
 * En producción, los métodos `debug` e `info` son silenciados
 * para evitar exponer datos sensibles en los logs del servidor.
 */
export const logger = {
  /**
   * Mensajes de depuración (solo visible en desarrollo).
   * Usar para trazabilidad detallada: emails, IDs de sesión, estados internos.
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Información operativa (solo visible en desarrollo).
   * Usar para confirmaciones de operaciones exitosas.
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Advertencias (visible en todos los entornos).
   * Usar para situaciones inesperadas que no son errores fatales.
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * Errores (visible en todos los entornos).
   * Usar para fallos que requieren atención.
   * IMPORTANTE: No incluir datos sensibles (contraseñas, tokens) en el mensaje.
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};

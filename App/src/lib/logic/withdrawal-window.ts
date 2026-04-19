import { getSystemSettingBoolean } from "@/lib/config";

// Constantes de configuración
export const WITHDRAWAL_START_DAY = 1;
export const WITHDRAWAL_END_DAY = 16;
export const WITHDRAWAL_GLOBAL_SETTING_KEY = "withdrawals_enabled";

/**
 * Verifica si las cuentas de inversión están bloqueadas.
 * 1. La configuración global "withdrawals_enabled" es true (o no existe, defaulting to true).
 */
export async function isInvestmentWindowOpen(): Promise<{
  isOpen: boolean;
  reason?: string;
}> {
  // 1. Verificar configuración global (Superadmin override)
  // Por defecto permitimos retiros si no está configurado explícitamente a false
  const globalEnabled = await getSystemSettingBoolean(
    WITHDRAWAL_GLOBAL_SETTING_KEY,
    true
  );

  if (!globalEnabled) {
    return {
      isOpen: false,
      reason:
        "Las cuentas de inversión están actualmente en su periodo de bloqueo.",
    };
  }

  // Si está habilitado (ON), significa que el periodo está abierto y se puede interactuar con Inversión.
  return { isOpen: true };
}

/**
 * Obtiene la fecha límite para retiros del mes actual.
 */
export function getWithdrawalDeadline(): Date {
  const now = new Date();
  // Crear fecha para el día 16 del mes actual
  // Al final del día (23:59:59)
  const deadline = new Date(
    now.getFullYear(),
    now.getMonth(),
    WITHDRAWAL_END_DAY,
    23,
    59,
    59
  );
  return deadline;
}

/**
 * Obtiene el nombre del mes actual en español
 */
export function getCurrentMonthName(): string {
  return new Date().toLocaleString("es-ES", { month: "long" });
}

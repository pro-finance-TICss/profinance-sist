import { getSystemSettingBoolean } from "@/lib/config";

// Constantes de configuración
export const WITHDRAWAL_START_DAY = 1;
export const WITHDRAWAL_END_DAY = 16;
export const WITHDRAWAL_GLOBAL_SETTING_KEY = "withdrawals_enabled";

/**
 * Verifica si la ventana de retiros está abierta actualmente.
 * Cumple dos condiciones:
 * 1. La fecha actual está dentro del rango permitido (1-16).
 * 2. La configuración global "withdrawals_enabled" es true (o no existe, defaulting to true).
 */
export async function isWithdrawalWindowOpen(): Promise<{
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
        "Los retiros están temporalmente deshabilitados por administración.",
    };
  }

  // 2. Verificar fecha actual
  // Usamos fecha del servidor para evitar manipulación del cliente
  const now = new Date();
  const day = now.getDate(); // 1-31

  if (day >= WITHDRAWAL_START_DAY && day <= WITHDRAWAL_END_DAY) {
    return { isOpen: true };
  }

  return {
    isOpen: false,
    reason: `Los retiros solo están habilitados del día ${WITHDRAWAL_START_DAY} al ${WITHDRAWAL_END_DAY} de cada mes.`,
  };
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

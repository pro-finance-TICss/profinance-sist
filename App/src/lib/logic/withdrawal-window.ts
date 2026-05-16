/**
 * COMPATIBILIDAD: Este archivo reexporta desde investment-cycles.ts
 * para no romper imports existentes en el proyecto.
 *
 * Usar preferentemente @/lib/logic/investment-cycles directamente.
 */
export {
  isInvestmentWindowOpen,
  getInvestmentCycleInfo,
  WITHDRAWAL_GLOBAL_SETTING_KEY,
} from "./investment-cycles";

// Compat: constantes antiguas (ya no se usan en lógica nueva)
export const WITHDRAWAL_START_DAY = 1;
export const WITHDRAWAL_END_DAY   = 5; // ventanas libres duran 5 días

/** Retorna el nombre del mes actual en español */
export function getCurrentMonthName(): string {
  return new Date().toLocaleString("es-ES", { month: "long" });
}

/**
 * @deprecated Usar getInvestmentCycleInfo().nextOpenWindow.end en su lugar.
 * Mantenido sólo para no romper wallet-checks.ts durante la transición.
 */
export function getWithdrawalDeadline(): Date {
  const { getInvestmentCycleInfo } = require("./investment-cycles");
  const info = getInvestmentCycleInfo();
  // Si estamos en periodo libre, la "deadline" es cuando cierra la ventana
  // (inicio del próximo ciclo menos 1 día)
  if (!info.isLocked && info.daysUntilClose > 0) {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() + info.daysUntilClose);
    return d;
  }
  // Si estamos bloqueados, devolver la próxima apertura
  return info.nextOpenWindow?.start ?? new Date();
}

/**
 * ============================================================================
 * LÓGICA DE CICLOS DE INVERSIÓN — PRO-FINANCE
 * ============================================================================
 *
 * Reglas del calendario de ciclos:
 *
 *   Ciclo 1 : 6 enero  → 31 marzo
 *   Ciclo 2 : 6 abril  → 30 junio
 *   Ciclo 3 : 6 julio  → 30 septiembre
 *   Ciclo 4 : 6 octubre → 30 noviembre
 *
 * Periodos de movimiento libre (retiros/aportes habilitados):
 *   - 1–5 de abril   (ventana entre ciclo 1 y 2)
 *   - 1–5 de julio   (ventana entre ciclo 2 y 3)
 *   - 1–5 de octubre (ventana entre ciclo 3 y 4)
 *   - Todo diciembre (sin ciclo activo)
 *   - 1 enero de cada año (los primeros 5 días de enero son "ventana" antes del ciclo 1)
 *     → Nota: enero 1–5 se tratan como ventana libre también.
 *
 * ============================================================================
 */

export type CycleNumber = 1 | 2 | 3 | 4;

export interface InvestmentCycleInfo {
  /** ¿Están los retiros/aportes bloqueados? */
  isLocked: boolean;

  /** Número del ciclo activo (null si estamos en periodo libre) */
  cycleNumber: CycleNumber | null;

  /** Etiqueta legible del ciclo (ej. "Ciclo 1 · Ene–Mar") */
  cycleLabel: string | null;

  /** Fecha de inicio del bloqueo actual (null si estamos en periodo libre) */
  lockStart: Date | null;

  /** Fecha de fin del bloqueo actual (null si estamos en periodo libre) */
  lockEnd: Date | null;

  /**
   * Próxima ventana de movimiento libre:
   * - fecha de inicio y fin de la siguiente ventana abierta
   */
  nextOpenWindow: { start: Date; end: Date } | null;

  /** Días que faltan para que abra la próxima ventana libre (0 = ya está abierta) */
  daysUntilNextOpen: number;

  /** Días que quedan hasta que cierre la ventana actual (0 = no estamos en ventana) */
  daysUntilClose: number;

  /** Nombre descriptivo del estado actual */
  statusLabel: string;
}

// ── Definición de ciclos ─────────────────────────────────────────────────────

interface CycleDef {
  number: CycleNumber;
  label: string;
  /** mes de inicio (0-indexed) */
  startMonth: number;
  startDay: number;
  /** mes de fin (0-indexed) */
  endMonth: number;
  endDay: number;
}

const CYCLES: CycleDef[] = [
  { number: 1, label: "Ciclo 1 · Ene–Mar", startMonth: 0, startDay: 6, endMonth: 2,  endDay: 31 },
  { number: 2, label: "Ciclo 2 · Abr–Jun", startMonth: 3, startDay: 6, endMonth: 5,  endDay: 30 },
  { number: 3, label: "Ciclo 3 · Jul–Sep", startMonth: 6, startDay: 6, endMonth: 8,  endDay: 30 },
  { number: 4, label: "Ciclo 4 · Oct–Nov", startMonth: 9, startDay: 6, endMonth: 10, endDay: 30 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna la fecha como medianoche local (00:00:00) */
function localMidnight(year: number, month: number, day: number): Date {
  return new Date(year, month, day, 0, 0, 0, 0);
}

/** Diferencia en días (redondeando hacia arriba) */
function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / 86_400_000);
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Calcula el estado completo del ciclo de inversión para la fecha dada.
 * Usar `new Date()` como argumento para el estado actual.
 */
export function getInvestmentCycleInfo(now: Date = new Date()): InvestmentCycleInfo {
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const day   = now.getDate();

  // Comparar sólo fecha (no hora) para evitar problemas de zona horaria
  const today = localMidnight(year, month, day);

  // ── 1. ¿Estamos dentro de algún ciclo? ───────────────────────────────────
  for (const cycle of CYCLES) {
    const lockStart = localMidnight(year, cycle.startMonth, cycle.startDay);
    const lockEnd   = localMidnight(year, cycle.endMonth,   cycle.endDay);

    if (today >= lockStart && today <= lockEnd) {
      // Estamos bloqueados dentro de este ciclo
      const lockEndIncl = new Date(lockEnd.getTime() + 86_400_000 - 1); // fin del día
      const nextOpen = getNextOpenWindowAfter(lockEnd, year, cycle.number);
      return {
        isLocked:         true,
        cycleNumber:      cycle.number,
        cycleLabel:       cycle.label,
        lockStart,
        lockEnd:          lockEndIncl,
        nextOpenWindow:   nextOpen,
        daysUntilNextOpen: diffDays(today, nextOpen.start),
        daysUntilClose:   0,
        statusLabel:      `🔒 Periodo de inversión activo — ${cycle.label}`,
      };
    }
  }

  // ── 2. Estamos en un periodo libre ───────────────────────────────────────
  // Calcular cuándo cierra la próxima ventana (inicio del siguiente ciclo)
  const nextCycleStart = getNextCycleStart(today, year);

  const daysUntilClose = nextCycleStart ? diffDays(today, nextCycleStart) : Infinity as any;

  // La ventana actual va de hoy hasta el día antes del próximo ciclo
  const windowEnd = nextCycleStart
    ? new Date(nextCycleStart.getTime() - 86_400_000)
    : localMidnight(year, 11, 31); // fin de diciembre

  return {
    isLocked:         false,
    cycleNumber:      null,
    cycleLabel:       null,
    lockStart:        null,
    lockEnd:          null,
    nextOpenWindow:   null,
    daysUntilNextOpen: 0,
    daysUntilClose:   typeof daysUntilClose === "number" ? daysUntilClose : 0,
    statusLabel:      "✅ Periodo libre — Retiros y aportes habilitados",
  };
}

// ── Helpers internos ─────────────────────────────────────────────────────────

/** Dado un día posterior al fin de un ciclo, calcula la siguiente ventana libre. */
function getNextOpenWindowAfter(
  lockEnd: Date,
  year: number,
  completedCycle: CycleNumber
): { start: Date; end: Date } {
  // La ventana abre el día SIGUIENTE al fin del ciclo
  const windowStart = new Date(lockEnd.getTime() + 86_400_000);

  switch (completedCycle) {
    case 1: // Ciclo 1 termina 31-mar → ventana 1-5 abril
      return {
        start: localMidnight(year, 3, 1),
        end:   localMidnight(year, 3, 5),
      };
    case 2: // Ciclo 2 termina 30-jun → ventana 1-5 julio
      return {
        start: localMidnight(year, 6, 1),
        end:   localMidnight(year, 6, 5),
      };
    case 3: // Ciclo 3 termina 30-sep → ventana 1-5 octubre
      return {
        start: localMidnight(year, 9, 1),
        end:   localMidnight(year, 9, 5),
      };
    case 4: // Ciclo 4 termina 30-nov → todo diciembre + ene 1-5
      return {
        start: localMidnight(year, 11, 1),
        end:   localMidnight(year + 1, 0, 5),
      };
  }
}

/** Calcula el inicio del próximo ciclo dado un día libre. */
function getNextCycleStart(today: Date, year: number): Date | null {
  const candidates: Date[] = [
    localMidnight(year,     0, 6),  // Ciclo 1
    localMidnight(year,     3, 6),  // Ciclo 2
    localMidnight(year,     6, 6),  // Ciclo 3
    localMidnight(year,     9, 6),  // Ciclo 4
    localMidnight(year + 1, 0, 6),  // Ciclo 1 del año siguiente
  ];

  for (const candidate of candidates) {
    if (candidate > today) return candidate;
  }
  return null;
}

// ── Compat: reexportar para wallet-checks.ts (mantener API pública) ──────────
export const WITHDRAWAL_GLOBAL_SETTING_KEY = "withdrawals_enabled";

export async function isInvestmentWindowOpen(): Promise<{
  isOpen: boolean;
  reason?: string;
  cycleInfo?: InvestmentCycleInfo;
}> {
  // Importación dinámica para evitar dependencia circular con server actions
  const { getSystemSettingBoolean } = await import("@/lib/config");

  // El superadmin puede forzar apertura manual (override de emergencia)
  const globalEnabled = await getSystemSettingBoolean(
    WITHDRAWAL_GLOBAL_SETTING_KEY,
    true
  );

  const cycleInfo = getInvestmentCycleInfo();

  if (!globalEnabled) {
    return {
      isOpen: false,
      reason: "Las cuentas de inversión están actualmente en periodo de bloqueo por ciclo activo.",
      cycleInfo,
    };
  }

  if (cycleInfo.isLocked) {
    return {
      isOpen: false,
      reason: `${cycleInfo.statusLabel}. Los movimientos de capital se reanudan en el siguiente periodo libre.`,
      cycleInfo,
    };
  }

  return { isOpen: true, cycleInfo };
}

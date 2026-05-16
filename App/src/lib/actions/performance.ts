// ============================================================================
// ACCIONES DE RENDIMIENTO - PRO-FINANCE
// ============================================================================
// Gestión de registros de rendimiento para usuarios y socios.
// ============================================================================

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserRole } from "@/lib/enums";
import { revalidatePath } from "next/cache";

/** Datos de entrada para crear un registro de rendimiento */
export interface CreatePerformanceInput {
  /** Par de monedas: moneda origen */
  currency1: string;
  /** Par de monedas: moneda destino */
  currency2: string;
  /** Tipo de operación: "COMPRA" o "VENTA" */
  type: string;
  /** Porcentaje de rendimiento (ya no se usa al crear, pero mantenemos por compatibilidad de tipos o lo quitamos de creación) */
  percentage?: number | null;
  /** Rol objetivo: USER o SOCIO */
  targetRole: "USER" | "SOCIO";
  /** Fecha del registro (opcional, por defecto fecha actual) */
  startDate?: Date;
}

/**
 * Obtiene los registros de rendimiento para el dashboard del usuario actual.
 *
 * La cuenta activa determina qué rendimientos se muestran:
 *   - Cuenta Normal (isHighRisk = false) → solo Performance con targetRole="USER"
 *   - Cuenta AR     (isHighRisk = true)  → solo Performance con targetRole="SOCIO"
 *
 * Son tipos completamente separados: las cuentas AR ya NO acumulan rendimientos USER.
 *
 * @param isHighRisk - Si la cuenta activa es de Alto Riesgo (AR)
 */
// ── Helpers de ciclo ───────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Determina si una fecha de rendimiento pertenece a un ciclo YA CERRADO.
 *
 * REGLAS (modelo de 4 ciclos anuales):
 *   Ciclo 1 : 6-ene → 31-mar
 *   Ciclo 2 : 6-abr → 30-jun
 *   Ciclo 3 : 6-jul → 30-sep
 *   Ciclo 4 : 6-oct → 30-nov
 *   Libre   : 1-5 abr/jul/oct, todo dic, 1-5 ene
 *
 * Un rendimiento es HISTÓRICO solo si:
 *   - Pertenece a un ciclo diferente al ciclo actual, Y ese ciclo ya terminó.
 *
 * Ejemplos:
 *   - Hoy es 16-may (Ciclo 2). Performance del 10-abr: mismo ciclo → NO histórico.
 *   - Hoy es 16-may (Ciclo 2). Performance del 15-mar: Ciclo 1 ya cerró → histórico.
 *   - Hoy es 3-abr (periodo libre). Performance del 1-abr: periodo libre actual → NO histórico.
 */

// Definición interna de ciclos (0-indexed month, igual que investment-cycles.ts)
const CYCLE_DEFS = [
  { number: 1, startMonth: 0, startDay: 6, endMonth: 2,  endDay: 31 },
  { number: 2, startMonth: 3, startDay: 6, endMonth: 5,  endDay: 30 },
  { number: 3, startMonth: 6, startDay: 6, endMonth: 8,  endDay: 30 },
  { number: 4, startMonth: 9, startDay: 6, endMonth: 10, endDay: 30 },
] as const;

/** Retorna el número de ciclo al que pertenece una fecha, o null si es periodo libre. */
function getCycleNumber(date: Date): number | null {
  const year  = date.getFullYear();
  const month = date.getMonth();
  const day   = date.getDate();

  for (const c of CYCLE_DEFS) {
    const start = new Date(year, c.startMonth, c.startDay);
    const end   = new Date(year, c.endMonth,   c.endDay);
    if (date >= start && date <= end) return c.number;
  }
  return null;
}

/**
 * Retorna true si la fecha de un rendimiento pertenece a un ciclo ya cerrado.
 * Un rendimiento del ciclo actual (aunque sea de un mes anterior) NO es histórico.
 */
function isPastCycle(date: Date): boolean {
  const now = new Date();

  const dateYear  = date.getFullYear();
  const nowYear   = now.getFullYear();

  // Año anterior siempre es histórico
  if (dateYear < nowYear) return true;
  // Año futuro nunca es histórico
  if (dateYear > nowYear) return false;

  const dateCycle = getCycleNumber(date);
  const nowCycle  = getCycleNumber(now);

  // Si la fecha está en el mismo ciclo que hoy → NO histórico
  if (dateCycle !== null && dateCycle === nowCycle) return false;

  // Si hoy es periodo libre y la fecha también es periodo libre → NO histórico
  if (dateCycle === null && nowCycle === null) return false;

  // Si la fecha es periodo libre pero hoy estamos en un ciclo, verificar si es
  // el periodo libre ANTERIOR al ciclo actual → histórico
  // (ej. 2-abr con hoy 16-may en Ciclo 2: la ventana del 1-5 abr ya pasó)
  // Simplificación: si la fecha es anterior a hoy en el mismo año y no comparten ciclo → histórico
  return date < now;
}

export async function getDashboardPerformances(isHighRisk?: boolean) {
  const session = await auth();
  if (!session?.user) return [];

  const targetRole = isHighRisk ? "SOCIO" : "USER";

  const perfs = await prisma.performance.findMany({
    where: {
      targetRole,
      // Incluir tanto registros normales como históricos concretados
      status: { in: ["COMPLETED", "COMPLETED_HISTORICAL"] },
    },
    orderBy: { startDate: "desc" },
    take: 50,
  });

  return perfs.map(p => ({
    ...p,
    percentage: p.percentage ? p.percentage.toNumber() / 2 : 0,
  }));
}

/**
 * Obtiene todos los registros de rendimiento para un rol específico.
 * Solo accesible por SUPER_ADMIN.
 * @param targetRole - Rol objetivo: "USER" o "SOCIO"
 */
export async function getPerformancesByTarget(targetRole: "USER" | "SOCIO") {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("No autorizado");
  }

  const perfs = await prisma.performance.findMany({
    where: { targetRole },
    orderBy: { startDate: "desc" },
  });

  return perfs.map(p => ({
    ...p,
    percentage: p.percentage ? p.percentage.toNumber() : 0,
  }));
}

/**
 * Crea un nuevo registro de rendimiento.
 * Solo accesible por SUPER_ADMIN.
 */
export async function createPerformance(data: CreatePerformanceInput) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("No autorizado");
  }

  const startDate = data.startDate || new Date();

  // Clasificación por CICLO (no por mes):
  //   - Si la fecha pertenece al CICLO ACTUAL (aunque sea un mes anterior del mismo ciclo)
  //     → PENDING: se aplica al cerrar el ciclo normalmente.
  //   - Si la fecha pertenece a un CICLO YA CERRADO
  //     → PENDING_HISTORICAL: requiere recalculo manual via Wizard de Carga Histórica.
  //
  // Ejemplo con hoy = 16-may (Ciclo 2 Abr-Jun):
  //   startDate = 10-abr → mismo ciclo → PENDING
  //   startDate = 15-mar → Ciclo 1 ya cerrado → PENDING_HISTORICAL
  const status = isPastCycle(startDate) ? "PENDING_HISTORICAL" : "PENDING";

  await prisma.performance.create({
    data: {
      currency1: data.currency1,
      currency2: data.currency2,
      type: data.type,
      percentage: null,
      targetRole: data.targetRole,
      startDate,
      status,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

/**
 * Concreta (finaliza) un registro de rendimiento en estado de espera.
 * Solo accesible por SUPER_ADMIN.
 *
 * MODELO DIFERIDO (interés simple):
 * Este paso SOLO registra el % en la tabla Performance.
 * Los balances de las cuentas NO se modifican aquí.
 * El dinero se aplica al descongelar el periodo (updateGlobalWithdrawalSettings → isEnabled=true),
 * sumando todos los % acumulados y aplicándolos UNA VEZ sobre el capital base congelado.
 */
export async function finalizePerformance(id: string, endDate: Date, percentage: number) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("No autorizado");
  }

  const performance = await prisma.performance.findUnique({
    where: { id },
  });

  if (!performance) {
    return { success: false, message: "Registro no encontrado" };
  }

  if (performance.status === "COMPLETED" || performance.status === "COMPLETED_HISTORICAL") {
    return { success: false, message: "Este registro ya ha sido concretado" };
  }

  // PENDING_HISTORICAL → COMPLETED_HISTORICAL (NO se aplica automáticamente al abrir periodo)
  // PENDING            → COMPLETED            (se aplica al abrir periodo normalmente)
  const nextStatus =
    performance.status === "PENDING_HISTORICAL"
      ? "COMPLETED_HISTORICAL"
      : "COMPLETED";

  try {
    await prisma.performance.update({
      where: { id },
      data: {
        status: nextStatus,
        endDate,
        percentage,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/superadmin");

    const msg =
      nextStatus === "COMPLETED_HISTORICAL"
        ? "Rendimiento histórico registrado. Usa el Wizard de Carga Histórica para aplicarlo a las cuentas."
        : "Rendimiento registrado. Se aplicará a las cuentas al descongelar el periodo.";

    return { success: true, message: msg };
  } catch (error) {
    console.error("Error finalizePerformance:", error);
    return { success: false, message: "Ocurrió un error al concretar el rendimiento." };
  }
}


/**
 * Elimina un registro de rendimiento.
 * Solo accesible por SUPER_ADMIN.
 * ADVERTENCIA: Si el registro ya fue CONCRETADO, los balances de las cuentas
 * NO se revierten automáticamente. El superadmin debe ajustar los saldos manualmente.
 */
export async function deletePerformance(id: string) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("No autorizado");
  }

  const performance = await prisma.performance.findUnique({
    where: { id },
  });

  if (!performance) {
    throw new Error("Registro no encontrado");
  }

  const wasCompleted = performance.status === "COMPLETED";

  await prisma.performance.delete({
    where: { id },
  });

  if (wasCompleted) {
    console.warn(
      `[SUPERADMIN] deletePerformance — Registro CONCRETADO eliminado manualmente. id: ${id}, targetRole: ${performance.targetRole}, percentage: ${performance.percentage}. Los saldos de las cuentas afectadas NO fueron revertidos.`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

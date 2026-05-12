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
export async function getDashboardPerformances(isHighRisk?: boolean) {
  const session = await auth();
  if (!session?.user) return [];

  // isHighRisk define exclusivamente qué rendimientos ve esta cuenta:
  // false / undefined → targetRole USER (cuenta normal)
  // true              → targetRole SOCIO (cuenta AR)
  const targetRole = isHighRisk ? "SOCIO" : "USER";

  const perfs = await prisma.performance.findMany({
    where: {
      targetRole,
      status: "COMPLETED"
    },
    orderBy: { startDate: "desc" },
    take: 50,
  });

  // Convertir Prisma Decimal a número para serialización segura en el cliente
  // El porcentaje se divide entre 2 (el usuario ve la mitad del rendimiento real del admin)
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

  await prisma.performance.create({
    data: {
      currency1: data.currency1,
      currency2: data.currency2,
      type: data.type,
      percentage: null,
      targetRole: data.targetRole,
      startDate: data.startDate || new Date(),
      status: "PENDING",
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

  if (performance.status === "COMPLETED") {
    return { success: false, message: "Este registro ya ha sido concretado" };
  }

  try {
    // Solo actualizar el registro: guardar % y marcar como COMPLETED.
    // No se toca ningún balance — el dinero se aplica al descongelar el periodo.
    await prisma.performance.update({
      where: { id },
      data: {
        status: "COMPLETED",
        endDate,
        percentage,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/superadmin");
    return { success: true, message: "Rendimiento registrado. Se aplicará a las cuentas al descongelar el periodo." };
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

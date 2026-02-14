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
  /** Porcentaje de rendimiento */
  percentage: number;
  /** Rol objetivo: USER o SOCIO */
  targetRole: "USER" | "SOCIO";
  /** Fecha del registro (opcional, por defecto fecha actual) */
  date?: Date;
}

/**
 * Obtiene los registros de rendimiento para el dashboard del usuario actual.
 * Si se pasa accountRole, se usa ese rol; si no, se usa el rol global del usuario.
 * Los usuarios/cuentas USER ven registros USER; los SOCIO ven registros SOCIO.
 */
export async function getDashboardPerformances(accountRole?: string) {
  const session = await auth();
  if (!session?.user) return [];

  // Priorizar el rol de la cajita activa sobre el rol global del usuario
  let targetRole = "USER";

  if (accountRole === "SOCIO" || (!accountRole && session.user.role === UserRole.SOCIO)) {
    targetRole = "SOCIO";
  }

  const perfs = await prisma.performance.findMany({
    where: { targetRole },
    orderBy: { date: "desc" },
    take: 50,
  });

  // Convertir Prisma Decimal a número para serialización segura en el cliente
  return perfs.map(p => ({
    ...p,
    percentage: p.percentage.toNumber(),
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
    orderBy: { date: "desc" },
  });

  return perfs.map(p => ({
    ...p,
    percentage: p.percentage.toNumber(),
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
      percentage: data.percentage,
      targetRole: data.targetRole,
      date: data.date || new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

/**
 * Elimina un registro de rendimiento.
 * Solo accesible por SUPER_ADMIN.
 */
export async function deletePerformance(id: string) {
  const session = await auth();
  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    throw new Error("No autorizado");
  }

  await prisma.performance.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

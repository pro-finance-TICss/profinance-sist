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
 * FASE PRE-1 — Unificación de roles:
 * `accountRole` se mantiene en la firma por compatibilidad con callers existentes
 * (PerformanceTable.tsx lo pasa) pero se IGNORA deliberadamente.
 * La fuente de verdad es SIEMPRE `session.user.role` (user.role en DB).
 *
 * Los usuarios USER ven registros USER.
 * Los usuarios SOCIO ven registros USER + SOCIO (acumulativo).
 */
export async function getDashboardPerformances(accountRole?: string) {
  const session = await auth();
  if (!session?.user) return [];

  // ── FUENTE ÚNICA DE VERDAD: session.user.role ──────────────────────────────
  // accountRole se recibe pero no se usa para decisiones financieras.
  // Si hay discrepancia entre accountRole y user.role, logueamos una advertencia
  // para detectar cuentas desincronizadas sin interrumpir el flujo.
  if (accountRole && accountRole !== session.user.role) {
    console.warn(
      `[ROLE SYNC WARNING] getDashboardPerformances — accountRole ("${accountRole}") !== user.role ("${session.user.role}") para userId: ${session.user.id}. Usando user.role como fuente de verdad.`
    );
  }

  const userRole = session.user.role; // única fuente de verdad
  let targetRoles = ["USER"];

  if (userRole === UserRole.SOCIO) {
    targetRoles = ["USER", "SOCIO"];
  }

  const perfs = await prisma.performance.findMany({
    where: {
      targetRole: { in: targetRoles },
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
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar el registro de performance a COMPLETED
      await tx.performance.update({
        where: { id },
        data: {
          status: "COMPLETED",
          endDate,
          percentage,
        },
      });

      // 2. Obtener todas las cuentas INVESTMENT afectadas.
      // FASE PRE-1 — Unificación de roles:
      // La selección se hace por user.role (fuente de verdad), NO por account.role.
      // Si el target es USER → afecta a USER y SOCIO.
      // Si el target es SOCIO → afecta solo a SOCIO.
      const rolesToAffect = performance.targetRole === "USER" ? ["USER", "SOCIO"] : ["SOCIO"];

      const accounts = await tx.account.findMany({
        where: {
          type: "INVESTMENT",
          // Filtrar por el rol del USUARIO propietario, no por el rol de la cuenta
          user: {
            role: { in: rolesToAffect },
          },
        },
        include: {
          // Incluir user para poder detectar desincronizaciones en logs
          user: { select: { id: true, role: true } },
        },
      });

      // Detectar y loguear cuentas con account.role desincronizado respecto a user.role
      // (NO lanza error — solo advierte para monitoreo)
      for (const account of accounts) {
        if (account.role !== account.user.role) {
          console.warn(
            `[ROLE SYNC WARNING] finalizePerformance — account.role ("${account.role}") !== user.role ("${account.user.role}") | accountId: ${account.id}, userId: ${account.userId}. Se usa user.role para el cálculo.`
          );
        }
      }

      // 3. Iterar y aplicar el rendimiento a cada cuenta
      // Los usuarios (y socios) reciben y se les refleja solo la MITAD del porcentaje total
      const userPercentage = percentage / 2;

      for (const account of accounts) {
        const currentBalance = Number(account.investedCapital);
        // Profit calculation: 
        const profit = currentBalance * (userPercentage / 100);
        
        await tx.account.update({
          where: { id: account.id },
          data: {
            investedCapital: {
              increment: profit,
            },
          },
        });

        // 4. Crear registro transaccional
        await tx.transaction.create({
          data: {
            userId: account.userId,
            accountId: account.id,
            type: "PROFIT", // Custom type for UI tracking
            amount: profit,
            status: "COMPLETED",
            paymentId: `PERF-${id}-${account.id}-${Date.now()}`,
          },
        });
      }
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    revalidatePath("/dashboard");
    revalidatePath("/superadmin");
    return { success: true, message: "Rendimiento concretado masivamente con éxito." };
  } catch (error) {
    console.error("Error finalizePerformance:", error);
    return { success: false, message: "Ocurrió un error al concretar el rendimiento." };
  }
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

  const performance = await prisma.performance.findUnique({
    where: { id },
  });

  // Proteccion
  if (performance?.status === "COMPLETED") {
    throw new Error("No se puede eliminar un rendimiento concretado. Acción prohibida de forma reversible.");
  }

  await prisma.performance.delete({
    where: { id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/superadmin");
}

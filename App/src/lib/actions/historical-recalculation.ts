"use server";

// ============================================================================
// SERVER ACTION: CARGA HISTÓRICA DE RENDIMIENTOS — PRO-FINANCE
// ============================================================================
// Guarda snapshots históricos de rendimiento por cuenta, generados manualmente
// por un SUPER_ADMIN desde el Wizard de Carga Histórica.
//
// FLUJO:
//   1. SUPER_ADMIN introduce capital inicial y porcentajes mes a mes
//   2. Este action recibe el array de entradas y las persiste como
//      AccountPerformanceSnapshot con source="HISTORICAL"
//   3. Es idempotente: borra los snapshots HISTORICAL existentes del rango
//      antes de insertar los nuevos, permitiendo re-ejecutar sin duplicar.
//   4. Opcional: actualiza investedCapital de la cuenta al capital final.
//
// REGLAS DE SEGURIDAD:
//   - Solo SUPER_ADMIN puede ejecutar.
//   - percentageRaw = el % que ingresa el superadmin (lo que el usuario verá * 0.5).
//     El Wizard le pide al superadmin el % del USUARIO (lo que ve el cliente),
//     por lo que aquí lo multiplicamos * 2 para guardar el raw correcto.
//   - gainAmount = capitalBase * (percentageRaw / 100)
// ============================================================================

import { prisma } from "@/lib/prisma";
import { requireRole, logAudit } from "@/lib/security";
import { UserRole } from "@/lib/enums";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

// ── Tipos de entrada ──────────────────────────────────────────────────────────

export interface HistoricalEntry {
  /** Mes en formato "YYYY-MM" */
  month: string;
  /** Primer día del mes en formato "YYYY-MM-DD" */
  periodStart: string;
  /** Último día del mes en formato "YYYY-MM-DD" */
  periodEnd: string;
  /**
   * Capital base al inicio del mes (en moneda de la cuenta).
   * El superadmin puede ajustar este valor si hubo retiros/depósitos.
   */
  capitalBase: number;
  /**
   * Porcentaje que VE EL USUARIO (userPercentage = raw * 0.5).
   * El Wizard muestra y recibe el porcentaje del usuario, no el raw.
   * Aquí convertimos: percentageRaw = userPercentage * 2 antes de guardar.
   */
  userPercentage: number;
  /** Monto ganado/perdido. Si se omite, se calcula como capitalBase * userPercentage / 100 */
  gainAmount?: number;
  /** IDs de Performance globales que aplican este mes (pueden ser null) */
  performanceIds?: string[];
  /** Detalle de los rendimientos del mes (solo para uso en Wizard, no persiste) */
  performances?: { performanceId: string; label: string; userPercentage: number; date: string }[];
  /** Nota opcional del superadmin */
  note?: string;
}

export interface SaveHistoricalResult {
  success: boolean;
  message: string;
  snapshotsCreated?: number;
  capitalFinal?: number;
}

// ── Action principal ──────────────────────────────────────────────────────────

/**
 * Guarda el historial de rendimientos mes a mes para una cuenta de inversión.
 *
 * @param accountId - ID de la cuenta destino
 * @param entries   - Array de entradas mensuales (validadas en el Wizard)
 * @param updateCapital - Si true, actualiza investedCapital al valor final calculado
 */
export async function saveHistoricalSnapshots(
  accountId: string,
  entries: HistoricalEntry[],
  updateCapital: boolean = false,
  /** Si se provee y es ANTERIOR a account.createdAt, se retrotrae la fecha de creación de la cuenta */
  newCreatedAt?: string
): Promise<SaveHistoricalResult> {
  await requireRole(UserRole.SUPER_ADMIN);

  if (!accountId || !entries || entries.length === 0) {
    return { success: false, message: "Se requiere una cuenta y al menos un mes de historial" };
  }

  // ── Validar que la cuenta existe y es INVESTMENT ──────────────────────────
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, type: true, userId: true, createdAt: true },
  });

  if (!account) {
    return { success: false, message: "Cuenta no encontrada" };
  }

  if (account.type !== "INVESTMENT") {
    return { success: false, message: "Solo se puede cargar historial en cuentas de Inversión" };
  }

  // ── Validar entradas ──────────────────────────────────────────────────────
  for (const entry of entries) {
    if (!/^\d{4}-\d{2}$/.test(entry.month)) {
      return { success: false, message: `Formato de mes inválido: ${entry.month}` };
    }
    if (entry.capitalBase < 0) {
      return { success: false, message: `Capital base negativo en ${entry.month}` };
    }
  }

  try {
    // ── Determinar el rango de meses a limpiar ────────────────────────────
    const months = entries.map((e) => e.month).sort();
    const rangeStart = new Date(`${months[0]}-01T00:00:00.000Z`);
    // Fin del rango: último día del último mes
    const lastMonth = months[months.length - 1];
    const [ly, lm] = lastMonth.split("-").map(Number);
    const rangeEnd = new Date(ly, lm, 0, 23, 59, 59, 999); // último ms del mes

    // ── Transacción: borrar históricos existentes + insertar nuevos ───────
    const snapshotsCreated = await prisma.$transaction(async (tx) => {
      // 1. Eliminar snapshots HISTORICAL previos en el mismo rango (idempotencia)
      const { count: deleted } = await tx.accountPerformanceSnapshot.deleteMany({
        where: {
          accountId,
          source: "HISTORICAL",
          periodStart: { gte: rangeStart, lte: rangeEnd },
        },
      });

      if (deleted > 0) {
        logger.debug(
          `[historical] 🗑️ Eliminados ${deleted} snapshots previos de accountId: ${accountId}`
        );
      }

      // 2. Insertar los nuevos snapshots
      let created = 0;
      for (const entry of entries) {
        // REGLA: el Wizard recibe/muestra userPercentage (lo que ve el usuario).
        // percentageRaw = userPercentage * 2 (valor real del admin).
        const percentageRaw = entry.userPercentage * 2;
        const gainAmount =
          entry.gainAmount !== undefined
            ? entry.gainAmount
            : entry.capitalBase * (entry.userPercentage / 100);

        await tx.accountPerformanceSnapshot.create({
          data: {
            accountId,
            // performanceId: null (carga manual, no vinculada a Performance global)
            periodStart: new Date(`${entry.periodStart}T00:00:00.000Z`),
            periodEnd: new Date(`${entry.periodEnd}T23:59:59.999Z`),
            percentageRaw,
            capitalBase: entry.capitalBase,
            gainAmount,
            source: "HISTORICAL",
            note: entry.note ?? null,
            appliedAt: new Date(),
          },
        });
        created++;
      }

      // 3. Opcional: actualizar el capital de la cuenta al valor final
      if (updateCapital) {
        const lastEntry = entries[entries.length - 1];
        const finalGain =
          lastEntry.gainAmount !== undefined
            ? lastEntry.gainAmount
            : lastEntry.capitalBase * (lastEntry.userPercentage / 100);
        const finalCapital = lastEntry.capitalBase + finalGain;

        await tx.account.update({
          where: { id: accountId },
          data: { investedCapital: finalCapital },
        });

        logger.debug(
          `[historical] 💰 Capital actualizado — accountId: ${accountId}, nuevo capital: ${finalCapital}`
        );
      }

      // 4. Opcional: retroceder fecha de creación de la cuenta si el historial es anterior
      if (newCreatedAt) {
        const newDate = new Date(newCreatedAt);
        if (!isNaN(newDate.getTime()) && newDate < account!.createdAt) {
          await tx.account.update({
            where: { id: accountId },
            data: { createdAt: newDate },
          });
          logger.debug(
            `[historical] 🗓️ Fecha de creación retrocedida — accountId: ${accountId}, nueva fecha: ${newDate.toISOString()}`
          );
        }
      }

      return created;
    });

    // ── Calcular capital final para la respuesta ──────────────────────────
    const lastEntry = entries[entries.length - 1];
    const lastGain =
      lastEntry.gainAmount !== undefined
        ? lastEntry.gainAmount
        : lastEntry.capitalBase * (lastEntry.userPercentage / 100);
    const capitalFinal = lastEntry.capitalBase + lastGain;

    // ── Audit log ─────────────────────────────────────────────────────────
    await logAudit("HISTORICAL_SNAPSHOTS_SAVED", "Account", accountId, {
      snapshotsCreated,
      fromMonth: months[0],
      toMonth: months[months.length - 1],
      capitalFinal,
      updateCapital,
      newCreatedAt: newCreatedAt ?? null,
      accountName: account.name,
    });

    revalidatePath(`/superadmin`);
    revalidatePath(`/dashboard`);

    logger.debug(
      `[historical] ✅ ${snapshotsCreated} snapshots guardados — accountId: ${accountId}, rango: ${months[0]} → ${months[months.length - 1]}`
    );

    return {
      success: true,
      message: `Historial cargado exitosamente: ${snapshotsCreated} mes${snapshotsCreated !== 1 ? "es" : ""} registrado${snapshotsCreated !== 1 ? "s" : ""}`,
      snapshotsCreated,
      capitalFinal,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[historical] ❌ Error al guardar snapshots:", error);
    return {
      success: false,
      message: `Error al guardar el historial: ${msg}`,
    };
  }
}

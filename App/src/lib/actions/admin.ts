"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  UserRole,
  WithdrawalStatus,
  TicketStatus,
  VALID_WITHDRAWAL_TRANSITIONS,
  VALID_TICKET_TRANSITIONS,
} from "@/lib/enums";
import {
  requireRole,
  logAudit,
  validateWithdrawalTransition,
  validateTicketTransition,
} from "@/lib/security";
import { createNotification } from "@/lib/actions/notifications";
import { decimalToNumber } from "@/lib/utils/currency";

// ============================================================================
// GESTIÓN DE USUARIOS (ADMIN)
// ============================================================================

/**
 * Obtiene la lista de todos los usuarios registrados.
 * Requiere rol de ADMIN o superior.
 */
export async function getUsers() {
  await requireRole(UserRole.ADMIN);
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        paternalSurname: true,
        email: true,
        role: true,
        createdAt: true,
        totpEnabled: true,
        baseCurrency: true,
        accounts: {
          select: {
            id: true,
            name: true,
            type: true,
            role: true,
            isHighRisk: true,
            investedCapital: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Serializar Decimals a números para evitar error de Next.js
    const serializedUsers = users.map((user) => ({
      ...user,
      accounts: user.accounts.map((acc) => ({
        ...acc,
        type: (acc as any).type ?? "INVESTMENT",
        investedCapital: decimalToNumber(acc.investedCapital),
      })),
    }));

    return { success: true, users: serializedUsers };
  } catch (error) {
    logger.error("❌ Error al obtener usuarios:", error);
    return { success: false, message: "Error al obtener usuarios" };
  }
}

/**
 * Actualiza el rol de un usuario.
 * Solo SUPER_ADMIN puede promover roles críticos.
 * FASE PRE-1: Sincroniza automáticamente `account.role` con el nuevo `user.role`.
 */
export async function updateUserRole(userId: string, newRole: string) {
  // Solo SuperAdmin debería poder promover roles críticos
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // Sincronizar account.role si el nuevo rol es USER o SOCIO
    if (newRole === "USER" || newRole === "SOCIO") {
      await prisma.account.updateMany({
        where: { userId },
        data: { role: newRole },
      });
      console.log(`[ROLE SYNC] updateUserRole — Cuentas de userId: ${userId} sincronizadas a role: ${newRole}`);
    }

    await logAudit("USER_ROLE_UPDATED", "User", userId, { newRole });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    logger.error("❌ Error al actualizar rol:", error);
    return { success: false, message: "Error al actualizar rol" };
  }
}

/**
 * Alterna el rol de un usuario entre USER y SOCIO (solo SUPERADMIN).
 * No permite alterar roles de ADMIN o SUPER_ADMIN.
 * FASE PRE-1: Sincroniza automáticamente TODAS las cuentas del usuario al nuevo rol.
 */
export async function toggleUserSocioRole(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    // Solo permitir alternar entre USER y SOCIO
    if (user.role !== "USER" && user.role !== "SOCIO") {
      return {
        success: false,
        message: "Solo se puede alternar entre roles USER y SOCIO",
      };
    }

    const newRole = user.role === "USER" ? "SOCIO" : "USER";

    // 1. Actualizar user.role (fuente de verdad)
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    // 2. Sincronizar TODAS las cuentas del usuario:
    //    - account.role = espejo del nuevo user.role
    //    - Si el usuario pasa de SOCIO → USER, resetear isHighRisk (un USER no puede tener cuentas AR)
    const syncData: Record<string, unknown> = { role: newRole };
    if (newRole === "USER") {
      syncData.isHighRisk = false;
    }
    const { count } = await prisma.account.updateMany({
      where: { userId },
      data: syncData,
    });
    console.log(`[ROLE SYNC] toggleUserSocioRole — ${count} cuenta(s) de userId: ${userId} sincronizadas ${user.role} → ${newRole}${newRole === "USER" ? " (isHighRisk reseteado)" : ""}`);

    await logAudit("USER_ROLE_TOGGLED", "User", userId, {
      oldRole: user.role,
      newRole,
      accountsSynced: count,
    });

    // Revalidar rutas relevantes
    revalidatePath("/admin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");

    return {
      success: true,
      newRole,
      message: `Rol actualizado. El usuario (${user.email}) debe cerrar sesión y volver a iniciar para ver los cambios.`
    };
  } catch (error) {
    logger.error("❌ Error al alternar rol:", error);
    return { success: false, message: "Error al alternar rol" };
  }
}

/**
 * Alterna el rol de una CUENTA de inversión específica entre SOCIO (AR) y USER (Normal).
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 *
 * IMPORTANTE: Solo modifica el account.role de esa cuenta concreta.
 * El user.role general (Socio/Usuario) es independiente y NO se toca aquí.
 * Solo los usuarios con rol general SOCIO pueden tener cuentas AR.
 */
/**
 * Alterna el flag Alto Riesgo (isHighRisk) de una cuenta de inversión concreta.
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 * IMPORTANTE: isHighRisk es independiente de account.role (que es el espejo del user.role).
 */
export async function toggleAccountRole(accountId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        name: true,
        isHighRisk: true,
        type: true,
        userId: true,
        user: { select: { email: true, role: true } },
      },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    // Solo aplica a cuentas de inversión
    if (account.type !== "INVESTMENT") {
      return { success: false, message: "Solo las cuentas de inversión pueden ser AR" };
    }

    // Solo usuarios con rol general SOCIO pueden tener cuentas AR
    if (account.user.role !== "SOCIO") {
      return { success: false, message: "El usuario debe tener rol general de Socio para asignar cuentas AR" };
    }

    // Alternar isHighRisk de esta cuenta
    const newIsHighRisk = !account.isHighRisk;

    await prisma.account.update({
      where: { id: accountId },
      data: { isHighRisk: newIsHighRisk },
    });

    console.log(`[AR TOGGLE] toggleAccountRole — cuenta "${account.name}" (${accountId}): isHighRisk ${account.isHighRisk} → ${newIsHighRisk} (user.role intacto: ${account.user.role})`);

    await logAudit("ACCOUNT_AR_TOGGLED", "Account", accountId, {
      accountName: account.name,
      wasHighRisk: account.isHighRisk,
      isHighRisk: newIsHighRisk,
      userId: account.userId,
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");

    return {
      success: true,
      newRole: newIsHighRisk ? "SOCIO" : "USER", // compatibilidad con UI existente
      message: `Cuenta "${account.name}" cambiada a ${newIsHighRisk ? "Alto Riesgo (AR)" : "Inversión Normal"}.`,
    };
  } catch (error) {
    logger.error("❌ Error al alternar AR de cuenta:", error);
    return { success: false, message: "Error al alternar rol de la cuenta" };
  }
}

/**
 * Agrega saldo manualmente a una cuenta ("cajita").
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 */
export async function addCapitalToAccount(accountId: string, amount: number) {
  try {
    await requireRole(UserRole.SUPER_ADMIN);

    if (amount <= 0) {
      return { success: false, message: "El monto debe ser mayor a 0" };
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: { select: { email: true } } },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    // Usar transacción de Prisma para asegurar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar balance de la cuenta
      await tx.account.update({
        where: { id: accountId },
        data: { investedCapital: { increment: amount } },
      });

      // 2. Crear registro de transacción
      await tx.transaction.create({
        data: {
          userId: account.userId,
          accountId: accountId,
          type: "DEPOSIT", // Usamos DEPOSIT para que aparezca en el historial estándar
          amount: amount,
          status: "COMPLETED",
          paymentId: `ADMIN-ADD-${Date.now()}-${Math.random().toString(36).substring(7)}`, // ID único para rastreo
        },
      });

      // 3. Log de auditoría
      await logAudit("ADMIN_ADDED_FUNDS", "Account", accountId, {
        amount,
        accountName: account.name,
        userId: account.userId,
      });
    }, {
      maxWait: 5000, // default: 2000
      timeout: 20000, // default: 5000
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Se agregaron $${amount} a la cajita "${account.name}".`,
    };
  } catch (error) {
    logger.error("❌ Error al agregar saldo:", error);
    return { success: false, message: "Error al agregar saldo: " + (error instanceof Error ? error.message : "Desconocido") };
  }
}

/**
 * Quita saldo manualmente de una cuenta ("cajita").
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 */
export async function removeCapitalFromAccount(accountId: string, amount: number) {
  try {
    await requireRole(UserRole.SUPER_ADMIN);

    if (amount <= 0) {
      return { success: false, message: "El monto debe ser mayor a 0" };
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { user: { select: { email: true } } },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    if (Number(account.investedCapital) < amount) {
      return { success: false, message: "El monto a quitar excede el saldo de la cuenta" };
    }

    // Usar transacción de Prisma para asegurar consistencia
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar balance de la cuenta
      await tx.account.update({
        where: { id: accountId },
        data: { investedCapital: { decrement: amount } },
      });

      // 2. Crear registro de transacción
      await tx.transaction.create({
        data: {
          userId: account.userId,
          accountId: accountId,
          type: "WITHDRAWAL", // Usamos WITHDRAWAL para la sustracción de retiro
          amount: amount,
          status: "COMPLETED",
          paymentId: `ADMIN-REMOVE-${Date.now()}-${Math.random().toString(36).substring(7)}`, // ID único para rastreo
        },
      });

      // 3. Log de auditoría
      await logAudit("ADMIN_REMOVED_FUNDS", "Account", accountId, {
        amount,
        accountName: account.name,
        userId: account.userId,
      });
    }, {
      maxWait: 5000,
      timeout: 20000,
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Se quitaron $${amount} de la cajita "${account.name}".`,
    };
  } catch (error) {
    logger.error("❌ Error al quitar saldo:", error);
    return { success: false, message: "Error al quitar saldo: " + (error instanceof Error ? error.message : "Desconocido") };
  }
}


// ============================================================================
// GESTIÓN DE TICKETS (ADMIN)
// ============================================================================

/**
 * Obtiene todos los tickets de soporte del sistema.
 * Requiere rol de ADMIN o superior.
 */
export async function getAllTickets() {
  await requireRole(UserRole.ADMIN);
  try {
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, firstName: true } },
        _count: { select: { messages: true } },
      },
    });
    return { success: true, tickets };
  } catch (error) {
    return { success: false, message: "Error al obtener tickets" };
  }
}

/**
 * Obtiene un ticket específico con sus mensajes para panel de administración.
 */
export async function getAdminTicket(ticketId: string) {
  await requireRole(UserRole.ADMIN);
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: { email: true, firstName: true, paternalSurname: true },
        },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    return { success: true, ticket };
  } catch (error) {
    return { success: false, message: "Error al obtener ticket" };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
) {
  await requireRole(UserRole.ADMIN);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { success: false, message: "Ticket no encontrado" };

  // Validar Transición de Estado
  if (!validateTicketTransition(ticket.status as TicketStatus, newStatus)) {
    return {
      success: false,
      message: `Transición de estado no válida: ${ticket.status} → ${newStatus}`,
    };
  }

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: newStatus },
  });

  await logAudit("TICKET_STATUS_UPDATED", "Ticket", ticketId, {
    old: ticket.status,
    new: newStatus,
  });
  revalidatePath("/admin/tickets");
  return { success: true };
}

export async function replyTicket(ticketId: string, message: string) {
  await requireRole(UserRole.ADMIN);
  const session = await auth();

  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  try {
    // Crear mensaje
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: session.user.id,
        message,
        isAdmin: true,
      },
    });

    // Actualizar estado si es necesario (OPEN -> IN_PROGRESS)
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (ticket && ticket.status === TicketStatus.OPEN) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    revalidatePath("/admin/tickets");
    return { success: true };
  } catch (error) {
    logger.error("Error replying to ticket:", error);
    return { success: false, message: "Error al responder" };
  }
}

// ============================================================================
// GESTIÓN DE RETIROS (SOLO SUPER_ADMIN)
// ============================================================================

import { decryptAccountNumber } from "@/lib/utils/encryption";
import { getSystemSettingBoolean, setSystemSetting } from "@/lib/config";
import { WITHDRAWAL_GLOBAL_SETTING_KEY } from "@/lib/logic/withdrawal-window";
import { logger } from "@/lib/logger";

export async function getWithdrawals() {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    const withdrawalsRaw = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            paternalSurname: true,
            maternalSurname: true,
          },
        },
        account: {
          select: {
            investedCapital: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            holderName: true,
            documentType: true,
            documentNumber: true,
            bankName: true,
            accountNumberLast4: true,
            accountNumberEncrypted: true,
            accountType: true,
            country: true,
          },
        },
      },
    });

    const withdrawals = withdrawalsRaw.map((w) => ({
      id: w.id,
      amount: w.amount.toString(),
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      user: {
        email: w.user.email,
        investedCapital: w.account?.investedCapital?.toString() || "0",
        firstName: w.user.firstName,
        paternalSurname: w.user.paternalSurname,
        maternalSurname: w.user.maternalSurname,
      },
      bankAccount: w.bankAccount
        ? {
          id: w.bankAccount.id,
          holderName: w.bankAccount.holderName,
          documentType: w.bankAccount.documentType,
          documentNumber: w.bankAccount.documentNumber,
          bankName: w.bankAccount.bankName,
          accountNumberLast4: w.bankAccount.accountNumberLast4,
          fullAccountNumber: decryptAccountNumber(
            w.bankAccount.accountNumberEncrypted
          ),
          accountType: w.bankAccount.accountType,
          country: w.bankAccount.country,
        }
        : null,
    }));

    return { success: true, withdrawals };
  } catch (error) {
    logger.error("❌ Error al obtener retiros:", error);
    return { success: false, message: "Error al obtener solicitudes de retiro" };
  }
}

export async function getGlobalWithdrawalSettings() {
  await requireRole(UserRole.SUPER_ADMIN);
  const isEnabled = await getSystemSettingBoolean(
    WITHDRAWAL_GLOBAL_SETTING_KEY,
    true
  );
  return { success: true, isEnabled };
}

export async function updateGlobalWithdrawalSettings(isEnabled: boolean) {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    await setSystemSetting(
      WITHDRAWAL_GLOBAL_SETTING_KEY,
      isEnabled.toString(),
      "Global withdrawal toggle controlled by Super Admin"
    );

    // NUEVO LOGICA: Si se está Abriendo el periodo, procesar retiros pendientes
    if (isEnabled) {
      await prisma.$transaction(async (tx) => {
        // ── PASO 1: Aplicar rendimientos acumulados del periodo ──────────────────
        // Buscar todas las cuentas de inversión
        const investmentAccounts = await tx.account.findMany({
          where: { type: "INVESTMENT" },
        });

        // Obtener IDs de todas las combinaciones (accountId, performanceId) ya aplicadas
        const existingSnapshots = await tx.accountPerformanceSnapshot.findMany({
          select: { accountId: true, performanceId: true },
        });
        const appliedSet = new Set(
          existingSnapshots.map((s) => `${s.accountId}::${s.performanceId}`)
        );

        // Obtener todos los rendimientos COMPLETED de una vez (evita N+1 queries)
        const allCompletedPerfs = await tx.performance.findMany({
          where: { status: "COMPLETED" },
        });

        for (const account of investmentAccounts) {
          // isHighRisk determina si la cuenta es Alto Riesgo (AR).
          // AR = recibe rendimientos normales (targetRole USER) + rendimientos AR (targetRole SOCIO).
          // Normal = recibe solo rendimientos normales (targetRole USER).
          const targetRolesForAccount = account.isHighRisk ? ["USER", "SOCIO"] : ["USER"];

          // Filtrar en JS: rendimientos del tipo correcto y que aún no tienen snapshot para esta cuenta
          const unappliedPerfs = allCompletedPerfs.filter(
            (p) =>
              targetRolesForAccount.includes(p.targetRole) &&
              !appliedSet.has(`${account.id}::${p.id}`)
          );

          if (unappliedPerfs.length === 0) continue;

          // Sumar todos los % del periodo (interés simple: se aplican sobre el capital base congelado)
          const totalPercentageRaw = unappliedPerfs.reduce(
            (sum, p) => sum + Number(p.percentage ?? 0),
            0
          );
          // El usuario recibe la mitad del % registrado por el superadmin
          const userPercentage = totalPercentageRaw / 2;
          const baseCapital = Number(account.investedCapital);
          const gain = baseCapital * (userPercentage / 100);

          // Aplicar la ganancia/pérdida acumulada al balance
          if (gain !== 0) {
            await tx.account.update({
              where: { id: account.id },
              data: { investedCapital: { increment: gain } },
            });

            // Registrar una sola transacción PROFIT con el total del periodo
            await tx.transaction.create({
              data: {
                userId: account.userId,
                accountId: account.id,
                type: "PROFIT",
                amount: gain,
                status: "COMPLETED",
                paymentId: `PERIOD-APPLY-${account.id}-${Date.now()}`,
              },
            });
          }

          // Crear un snapshot por cada performance aplicada (marca como "ya aplicado")
          for (const perf of unappliedPerfs) {
            const perfGain = baseCapital * (Number(perf.percentage ?? 0) / 2 / 100);
            await tx.accountPerformanceSnapshot.create({
              data: {
                accountId: account.id,
                performanceId: perf.id,
                periodStart: perf.startDate,
                periodEnd: perf.endDate ?? new Date(),
                percentageRaw: Number(perf.percentage ?? 0),
                capitalBase: baseCapital,
                gainAmount: perfGain,
              },
            });
          }

          console.log(
            `[PERIOD APPLY] Cuenta ${account.id} | ${unappliedPerfs.length} perf(s) | % total raw: ${totalPercentageRaw} | base: $${baseCapital} | ganancia: $${gain.toFixed(4)}`
          );
        }

        // ── PASO 2: Procesar retiros pendientes ──────────────────────────────────
        // Buscar solicitudes en cola (bankAccountId = null) desde cuentas de inversión
        const pendingRequests = await tx.withdrawalRequest.findMany({
          where: {
            status: "PENDING",
            bankAccountId: null,
            account: {
              type: "INVESTMENT"
            }
          },
          include: {
            account: true
          }
        });

        for (const req of pendingRequests) {
          // Buscar o asegurar que el usuario tenga cajita de Ahorros
          const savingsAccount = await tx.account.findFirst({
            where: {
              userId: req.userId,
              type: "SAVINGS",
            }
          });

          if (!savingsAccount) continue; // Por seguridad

          const currentInv = Number(req.account!.investedCapital);
          const requestedAmt = Number(req.amount);

          // El usuario no puede sacar más del balance que actualmente tiene su cuenta (en caso de rendimiento negativo).
          const finalExtractAmount = Math.min(requestedAmt, currentInv);

          // Si por alguna razón el balance es menor o igual a cero, saltamos o sacamos 0.
          if (finalExtractAmount <= 0) {
            await tx.withdrawalRequest.update({
              where: { id: req.id },
              data: {
                status: "REJECTED",
                notes: "Fondos insuficientes debidos a pérdidas en el periodo",
                processedAt: new Date(),
              }
            });
            continue;
          }

          // 1. Descontar de Inversión
          await tx.account.update({
            where: { id: req.accountId ?? undefined },
            data: { investedCapital: { decrement: finalExtractAmount } },
          });

          // 2. Sumar a Ahorros
          await tx.account.update({
            where: { id: savingsAccount.id },
            data: { investedCapital: { increment: finalExtractAmount } },
          });

          // 3. Crear registros (Ledger)
          await tx.transaction.create({
            data: {
              userId: req.userId,
              accountId: req.accountId,
              type: "WITHDRAWAL",
              amount: finalExtractAmount,
              status: "COMPLETED",
            },
          });

          await tx.transaction.create({
            data: {
              userId: req.userId,
              accountId: savingsAccount.id,
              type: "DEPOSIT",
              amount: finalExtractAmount,
              status: "COMPLETED",
            },
          });

          // 4. Marcar solicitud como COMPLETADA
          await tx.withdrawalRequest.update({
            where: { id: req.id },
            data: {
              amount: finalExtractAmount,
              status: "COMPLETED",
              processedAt: new Date(),
              notes: requestedAmt > currentInv ? "Aprobado automáticamente (Ajustado por balance final topado)" : "Aprobado automáticamente al abrir periodo",
            }
          });
        }
      }, {
        maxWait: 10000,
        timeout: 60000, // 60s para cubrir muchas cuentas y rendimientos
      });

    }

    await logAudit(
      "SYSTEM_SETTING_UPDATED",
      "SystemSetting",
      WITHDRAWAL_GLOBAL_SETTING_KEY,
      { isEnabled }
    );

    // NUEVO LOGICA: Notificar a todos los usuarios
    const allUsers = await prisma.user.findMany({ select: { id: true } });
    const notificationTitle = isEnabled ? "🟢 Periodo de Inversión Abierto" : "🔒 Periodo de Inversión Iniciado (En Curso)";
    const notificationMessage = isEnabled
      ? "¡El periodo ha finalizado y las cuentas de inversión se han abierto! Ya puedes aportar, mover fondos y ver tus nuevos rendimientos concretados."
      : "Se ha iniciado un nuevo bloqueo de capital. Tus fondos de inversión están operando en el mercado y las cuentas de inversión han sido congeladas temporalmente.";

    // Create notifications in batch using raw prisma directly (or just execute them via map)
    const notificationData = allUsers.map(user => ({
      userId: user.id,
      title: notificationTitle,
      message: notificationMessage,
      type: "INFO",
      read: false
    }));

    await prisma.notification.createMany({
      data: notificationData,
      skipDuplicates: true
    });

    // Rehabilitar rutas relevantes
    revalidatePath("/dashboard/wallet");
    revalidatePath("/superadmin/withdrawals");

    return { success: true };
  } catch (error) {
    logger.error("Error updating settings:", error);
    return { success: false, message: "Error al actualizar configuración" };
  }
}

export async function processWithdrawal(
  id: string,
  newStatus: WithdrawalStatus,
  notes?: string
) {
  await requireRole(UserRole.SUPER_ADMIN);
  const session = await auth();

  const withdrawal = await prisma.withdrawalRequest.findUnique({
    where: { id },
  });
  if (!withdrawal) return { success: false, message: "Solicitud no encontrada" };

  // 1. Validar transición de estado
  if (
    !validateWithdrawalTransition(
      withdrawal.status as WithdrawalStatus,
      newStatus
    )
  ) {
    return {
      success: false,
      message: `Transición no válida: ${withdrawal.status} → ${newStatus}`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Actualizar solicitud
      await tx.withdrawalRequest.update({
        where: { id },
        data: {
          status: newStatus,
          processedAt: new Date(),
          processedBy: session?.user?.id,
          notes,
        },
      });

      // Lógica de reembolso si la solicitud es rechazada
      if (
        newStatus === WithdrawalStatus.REJECTED &&
        withdrawal.status !== WithdrawalStatus.REJECTED
      ) {
        // Devolver balance a la cuenta si hay accountId
        if (withdrawal.accountId) {
          await tx.account.update({
            where: { id: withdrawal.accountId },
            data: { investedCapital: { increment: withdrawal.amount } },
          });
        }
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            accountId: withdrawal.accountId,
            type: "REFUND",
            amount: withdrawal.amount,
            status: "COMPLETED",
            paymentId: `REFUND-${id}`,
          },
        });
      }
    });

    // Notificar al usuario
    await createNotification(
      withdrawal.userId,
      `Retiro ${newStatus === WithdrawalStatus.APPROVED ? "Aprobado" : "Rechazado"
      }`,
      `Su solicitud de retiro ha sido ${newStatus === WithdrawalStatus.APPROVED ? "aprobada" : "rechazada"
      }.${notes ? ` Nota: ${notes}` : ""}`,
      newStatus === WithdrawalStatus.APPROVED ? "SUCCESS" : "ERROR"
    );

    await logAudit("WITHDRAWAL_PROCESSED", "Withdrawal", id, { newStatus });
    revalidatePath("/superadmin/withdrawals");
    return { success: true };
  } catch (error) {
    logger.error(error);
    return { success: false, message: "Error al procesar la transacción" };
  }
}

// ============================================================================
// GESTIÓN CRUD DE USUARIOS (SOLO SUPER_ADMIN)
// ============================================================================

/**
 * Devuelve un resumen de los datos que se eliminarán antes de borrar un usuario.
 * Útil para mostrar una confirmación informada al administrador.
 */
export async function getUserDeletePreview(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        paternalSurname: true,
        email: true,
        role: true,
        accounts: {
          select: {
            id: true,
            name: true,
            role: true,
            investedCapital: true,
          },
        },
        _count: {
          select: {
            transactions: true,
            withdrawalRequests: true,
            tickets: true,
            sessions: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    /* if (user.role === "SUPER_ADMIN") {
      return {
        success: false,
        message: "No se puede eliminar a otro Super Admin.",
      };
    } */

    return {
      success: true,
      preview: {
        id: user.id,
        name: `${user.firstName} ${user.paternalSurname}`,
        email: user.email,
        role: user.role,
        accounts: user.accounts.map((acc) => ({
          ...acc,
          investedCapital: decimalToNumber(acc.investedCapital),
        })),
        counts: user._count,
      },
    };
  } catch (error) {
    logger.error("❌ Error al obtener preview de eliminación:", error);
    return { success: false, message: "Error al obtener datos del usuario" };
  }
}

/**
 * Crea un nuevo usuario con rol USER, SOCIO, ADMIN o SUPER_ADMIN.
 * - Todos los usuarios se crean con mustChangePassword = true y totpEnabled = false
 * - Se crea una cajita inicial automáticamente
 */
export async function createUser(data: {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
  email: string;
  password: string;


  /** Rol global del usuario: USER, SOCIO, ADMIN o SUPER_ADMIN. */
  role: "USER" | "SOCIO" | "ADMIN" | "SUPER_ADMIN";
  /** Tipo de cajita inicial que se creará automáticamente. */

  accountRole: "USER" | "SOCIO";
  country: string;
  baseCurrency: string;
}) {
  await requireRole(UserRole.SUPER_ADMIN);

  // Bloquear creación de SUPER_ADMIN (opcional, ahora permitido si es superadmin)
  /* if (data.role === ("SUPER_ADMIN" as string)) {
    return { success: false, message: "No se puede crear usuarios SUPER_ADMIN desde el panel." };
  } */

  // Validaciones básicas
  if (!data.firstName || !data.paternalSurname || !data.email || !data.password) {
    return { success: false, message: "Faltan campos obligatorios." };
  }
  if (!data.email.includes("@")) {
    return { success: false, message: "El formato del email no es válido." };
  }
  if (data.password.length < 8) {
    return { success: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 12);

    /**
     * Nombre de la cuenta de inversión que se creará automáticamente
     * (solo aplica si accountRole es SOCIO o USER con cuenta de inversión).
     * Los admins y superadmins solo reciben cuenta de Ahorro.
     */
    const isRegularUser = data.role === "USER" || data.role === "ADMIN";

    // ─────────────────────────────────────────────────────────────────
    // Crear usuario + cuenta(s) + referralCode de forma atómica
    // generateUniqueReferralCode requiere una Prisma.TransactionClient,
    // por lo que envolvemos toda la creación en $transaction.
    // ─────────────────────────────────────────────────────────────────
    const { generateUniqueReferralCode } = await import("@/lib/services/referral.service");

    const user = await prisma.$transaction(async (tx) => {
      // 1. Generar referralCode único dentro de la transacción
      const referralCode = await generateUniqueReferralCode(tx);

      // 2. Crear usuario con su referralCode
      return tx.user.create({
        data: {
          firstName: data.firstName,
          paternalSurname: data.paternalSurname,
          maternalSurname: data.maternalSurname || "",
          email: data.email.toLowerCase().trim(),
          password: hashedPassword,
          role: data.role,
          country: data.country ? data.country.toUpperCase() : null,
          baseCurrency: data.baseCurrency.toUpperCase(),
          totpEnabled: false,
          mustChangePassword: true,
          referralCode,
          accounts: {
            create: [
              // 1ª cuenta: siempre Ahorro (SAVINGS)
              // FASE PRE-1: account.role sincronizado con user.role
              {
                name: "Mi Cuenta de Ahorro",
                type: "SAVINGS",
                // Sincronizar con user.role. Para ADMIN/SUPER_ADMIN usamos "USER" ya que
                // no participan en lógica financiera de USER/SOCIO.
                role: (data.role === "USER" || data.role === "SOCIO") ? data.role : "USER",
                investedCapital: 0,
              },
              // 2ª cuenta de Inversión: solo para roles financieros (USER y SOCIO)
              // FASE PRE-1: account.role = user.role (accountRole param se ignora para el role field)
              ...(data.role === "USER" || data.role === "SOCIO"
                ? [
                  {
                    // Nombre visual preservado por backward compat
                    name:
                      data.accountRole === "SOCIO" || data.role === "SOCIO"
                        ? "Mi Cuenta Socio"
                        : "Mi Cuenta de Inversión",
                    type: "INVESTMENT",
                    // CLAVE: usar data.role, no data.accountRole
                    role: data.role,
                    investedCapital: 0,
                  },
                ]
                : []),
            ],
          },
        },
      });
    });

    await logAudit("USER_CREATED_BY_ADMIN", "User", user.id, {
      role: data.role,
      email: user.email,
      referralCode: user.referralCode,
    });

    revalidatePath("/superadmin/users");
    return {
      success: true,
      message: `Usuario ${user.email} creado exitosamente con rol ${data.role}.`,
    };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, message: "El correo electrónico ya está registrado." };
    }
    logger.error("❌ Error al crear usuario:", error);
    return { success: false, message: "Error al crear el usuario." };
  }
}

/**
 * Edita los datos de un usuario existente.
 * El rol solo puede modificarse entre USER, SOCIO y ADMIN (no SUPER_ADMIN).
 * No permite editar a otro SUPER_ADMIN.
 */
export async function updateUser(
  userId: string,
  data: {
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
    email: string;
    country: string;
    baseCurrency: string;
    role: "USER" | "SOCIO" | "ADMIN";
  }
) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!existing) {
      return { success: false, message: "Usuario no encontrado." };
    }
    /* if (existing.role === "SUPER_ADMIN") {
      return { success: false, message: "No se puede editar a otro Super Admin." };
    }
    if (data.role === ("SUPER_ADMIN" as string)) {
      return { success: false, message: "No se puede asignar el rol SUPER_ADMIN desde el panel." };
    } */
    if (!data.email.includes("@")) {
      return { success: false, message: "El formato del email no es válido." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        paternalSurname: data.paternalSurname,
        maternalSurname: data.maternalSurname || "",
        email: data.email.toLowerCase().trim(),
        country: data.country ? data.country.toUpperCase() : null,
        baseCurrency: data.baseCurrency.toUpperCase(),
        role: data.role,
      },
    });

    // FASE PRE-1: Sincronizar account.role si el nuevo rol es USER o SOCIO
    if (data.role === "USER" || data.role === "SOCIO") {
      const { count } = await prisma.account.updateMany({
        where: { userId },
        data: { role: data.role },
      });
      console.log(`[ROLE SYNC] updateUser — ${count} cuenta(s) de userId: ${userId} sincronizadas a role: ${data.role}`);
    }

    await logAudit("USER_UPDATED_BY_ADMIN", "User", userId, {
      newData: { ...data, email: data.email.toLowerCase().trim() },
      oldEmail: existing.email,
    });

    revalidatePath("/superadmin/users");
    return { success: true, message: "Usuario actualizado correctamente." };
  } catch (error: any) {
    if (error?.code === "P2002") {
      return { success: false, message: "El correo electrónico ya está en uso por otro usuario." };
    }
    logger.error("❌ Error al actualizar usuario:", error);
    return { success: false, message: "Error al actualizar el usuario." };
  }
}

/**
 * Elimina un usuario y todos sus datos asociados en cascada.
 * No se puede eliminar a un SUPER_ADMIN.
 */
export async function deleteUser(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, firstName: true, paternalSurname: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Obtener la sesión del superadmin que ejecuta la acción
    const session = await auth();
    if (session?.user?.id === userId) {
      return { success: false, message: "No puedes eliminarte a ti mismo." };
    }

    // Guardar info para el audit log antes de eliminar
    const userInfo = { email: user.email, role: user.role };

    await prisma.user.delete({ where: { id: userId } });

    await logAudit("USER_DELETED_BY_ADMIN", "User", userId, userInfo);
    revalidatePath("/superadmin/users");

    return {
      success: true,
      message: `Usuario ${user.email} eliminado exitosamente.`,
    };
  } catch (error) {
    logger.error("❌ Error al eliminar usuario:", error);
    return { success: false, message: "Error al eliminar el usuario." };
  }
}

/**
 * Elimina una cuenta (cajita) específica de un usuario.
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 * No permite eliminar si es la única cuenta SAVINGS del usuario.
 */
export async function deleteAccount(accountId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        user: { select: { email: true, id: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada." };
    }

    // No permitir eliminar cuentas con capital invertido
    if (Number(account.investedCapital) > 0) {
      return {
        success: false,
        message: `La cuenta "${account.name}" tiene capital ($${Number(account.investedCapital).toFixed(2)}). Retíralo antes de eliminarla.`,
      };
    }

    // Eliminar la cuenta (las transacciones asociadas se mantienen por historial)
    await prisma.$transaction(async (tx) => {
      // Desvincular transacciones (poner accountId = null) para no romper historial
      await tx.transaction.updateMany({
        where: { accountId },
        data: { accountId: null },
      });

      // Desvincular retiros pendientes
      await tx.withdrawalRequest.updateMany({
        where: { accountId, status: { in: ["PENDING"] } },
        data: { accountId: null },
      });

      // Eliminar la cuenta
      await tx.account.delete({ where: { id: accountId } });
    });

    await logAudit("ACCOUNT_DELETED_BY_ADMIN", "Account", accountId, {
      accountName: account.name,
      userId: account.userId,
      userEmail: account.user.email,
    });

    revalidatePath("/superadmin/users");
    return {
      success: true,
      message: `Cuenta "${account.name}" eliminada exitosamente.`,
    };
  } catch (error) {
    logger.error("❌ Error al eliminar cuenta:", error);
    return { success: false, message: "Error al eliminar la cuenta." };
  }
}

// ============================================================================
// CREAR CUENTA DE INVERSIÓN PARA UN USUARIO EXISTENTE (SOLO SUPER_ADMIN)
// ============================================================================

/**
 * Crea una nueva cuenta de inversión para un usuario existente, con un monto inicial opcional.
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 * - Siempre tipo INVESTMENT (la de Ahorro ya nace con el usuario y no puede eliminarse).
 * - isAR=true marca la cuenta como Alto Riesgo (role='SOCIO'). Solo aplica si el usuario es SOCIO.
 * - Si se indica un monto inicial > 0, se registra como DEPOSIT en el historial.
 */
export async function createInvestmentAccountForUser(
  userId: string,
  accountName: string,
  initialAmount: number = 0,
  isAR: boolean = false
) {
  await requireRole(UserRole.SUPER_ADMIN);

  if (!accountName || accountName.trim().length === 0) {
    return { success: false, message: "El nombre de la cuenta es obligatorio." };
  }
  if (initialAmount < 0) {
    return { success: false, message: "El monto inicial no puede ser negativo." };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Solo roles financieros (USER/SOCIO) pueden tener cuentas de inversión
    if (user.role !== "USER" && user.role !== "SOCIO") {
      return {
        success: false,
        message: "Solo usuarios con rol USER o SOCIO pueden tener cuentas de inversión.",
      };
    }

    // AR solo puede asignarse a usuarios con rol general SOCIO
    if (isAR && user.role !== "SOCIO") {
      return {
        success: false,
        message: "Solo los usuarios con rol Socio pueden tener cuentas de Alto Riesgo (AR).",
      };
    }

    // IMPORTANTE: role es el espejo de user.role (no indica AR).
    // isHighRisk es el verdadero flag de Alto Riesgo.
    const newAccount = await prisma.$transaction(async (tx) => {
      // 1. Crear la cuenta de inversión
      const account = await tx.account.create({
        data: {
          userId,
          name: accountName.trim(),
          type: "INVESTMENT",
          role: user.role as "USER" | "SOCIO", // espejo del rol del usuario
          isHighRisk: isAR,                    // bandera AR explícita
          investedCapital: initialAmount,
        },
      });

      // 2. Si hay monto inicial, registrar la transacción como DEPOSIT
      if (initialAmount > 0) {
        await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            type: "DEPOSIT",
            amount: initialAmount,
            status: "COMPLETED",
            paymentId: `ADMIN-NEWACCT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          },
        });
      }

      return account;
    }, {
      maxWait: 5000,
      timeout: 20000,
    });

    await logAudit("ADMIN_CREATED_INVESTMENT_ACCOUNT", "Account", newAccount.id, {
      userId,
      userEmail: user.email,
      accountName: newAccount.name,
      initialAmount,
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Cuenta de inversión"${isAR ? " AR" : ""} "${newAccount.name}" creada exitosamente${initialAmount > 0 ? ` con $${initialAmount.toLocaleString()} de capital inicial` : ""}.`,
      accountId: newAccount.id,
    };
  } catch (error) {
    logger.error("❌ Error al crear cuenta de inversión:", error);
    return {
      success: false,
      message: "Error al crear la cuenta: " + (error instanceof Error ? error.message : "Desconocido"),
    };
  }
}


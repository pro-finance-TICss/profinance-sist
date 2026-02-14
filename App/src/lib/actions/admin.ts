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
            role: true,
            investedCapital: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return { success: true, users };
  } catch (error) {
    logger.error("❌ Error al obtener usuarios:", error);
    return { success: false, message: "Error al obtener usuarios" };
  }
}

/**
 * Actualiza el rol de un usuario.
 * Solo SUPER_ADMIN puede promover roles críticos.
 */
export async function updateUserRole(userId: string, newRole: string) {
  // Solo SuperAdmin debería poder promover roles críticos
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

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

    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    await logAudit("USER_ROLE_TOGGLED", "User", userId, {
      oldRole: user.role,
      newRole,
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
 * Alterna el rol de una CUENTA (cajita) específica entre USER y SOCIO.
 * Solo SUPER_ADMIN puede ejecutar esta acción.
 */
export async function toggleAccountRole(accountId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, role: true, userId: true, user: { select: { email: true } } },
    });

    if (!account) {
      return { success: false, message: "Cuenta no encontrada" };
    }

    const newRole = account.role === "USER" ? "SOCIO" : "USER";

    await prisma.account.update({
      where: { id: accountId },
      data: { role: newRole },
    });

    await logAudit("ACCOUNT_ROLE_TOGGLED", "Account", accountId, {
      accountName: account.name,
      oldRole: account.role,
      newRole,
      userId: account.userId,
    });

    revalidatePath("/superadmin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");

    return {
      success: true,
      newRole,
      message: `Cajita "${account.name}" actualizada a ${newRole}. El usuario (${account.user.email}) verá los cambios al recargar.`,
    };
  } catch (error) {
    logger.error("❌ Error al alternar rol de cuenta:", error);
    return { success: false, message: "Error al alternar rol de la cuenta" };
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
    await logAudit(
      "SYSTEM_SETTING_UPDATED",
      "SystemSetting",
      WITHDRAWAL_GLOBAL_SETTING_KEY,
      { isEnabled }
    );

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
      `Retiro ${
        newStatus === WithdrawalStatus.APPROVED ? "Aprobado" : "Rechazado"
      }`,
      `Su solicitud de retiro ha sido ${
        newStatus === WithdrawalStatus.APPROVED ? "aprobada" : "rechazada"
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

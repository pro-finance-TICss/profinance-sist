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
      },
    });
    return { success: true, users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { success: false, message: "Failed to fetch users" };
  }
}

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
    console.error("Error updating role:", error);
    return { success: false, message: "Error updating role" };
  }
}

/**
 * Toggle user role between USER and SOCIO (SUPERADMIN only)
 */
export async function toggleUserSocioRole(userId: string) {
  await requireRole(UserRole.SUPER_ADMIN);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Only allow toggling between USER and SOCIO
    if (user.role !== "USER" && user.role !== "SOCIO") {
      return {
        success: false,
        message: "Can only toggle between USER and SOCIO roles",
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
    
    // Revalidate paths
    revalidatePath("/admin/users");
    revalidatePath("/superadmin");
    revalidatePath("/dashboard");
    
    return { 
      success: true, 
      newRole,
      message: `Rol actualizado. El usuario (${user.email}) debe cerrar sesión y volver a iniciar para ver los cambios.`
    };
  } catch (error) {
    console.error("Error toggling role:", error);
    return { success: false, message: "Error toggling role" };
  }
}


// ============================================================================
// GESTIÓN DE TICKETS (ADMIN)
// ============================================================================

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
    return { success: false, message: "Failed to fetch tickets" };
  }
}

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
    return { success: false, message: "Error fetching ticket" };
  }
}

export async function updateTicketStatus(
  ticketId: string,
  newStatus: TicketStatus
) {
  await requireRole(UserRole.ADMIN);

  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { success: false, message: "Ticket not found" };

  // Validar Transición de Estado
  if (!validateTicketTransition(ticket.status as TicketStatus, newStatus)) {
    return {
      success: false,
      message: `Invalid transition from ${ticket.status} to ${newStatus}`,
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
    console.error("Error replying to ticket:", error);
    return { success: false, message: "Error al responder" };
  }
}

// ============================================================================
// GESTIÓN DE RETIROS (SOLO SUPER_ADMIN)
// ============================================================================

import { decryptAccountNumber } from "@/lib/utils/encryption";
import { getSystemSettingBoolean, setSystemSetting } from "@/lib/config";
import { WITHDRAWAL_GLOBAL_SETTING_KEY } from "@/lib/logic/withdrawal-window";

export async function getWithdrawals() {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    const withdrawalsRaw = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        user: {
          select: {
            email: true,
            investedCapital: true,
            firstName: true,
            paternalSurname: true,
            maternalSurname: true,
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
        investedCapital: w.user.investedCapital.toString(),
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
    console.error("Error fetching withdrawals:", error);
    return { success: false, message: "Failed to fetch withdrawals" };
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
    console.error("Error updating settings:", error);
    return { success: false, message: "Failed to update settings" };
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
  if (!withdrawal) return { success: false, message: "Request not found" };

  // 1. Validate Transition
  if (
    !validateWithdrawalTransition(
      withdrawal.status as WithdrawalStatus,
      newStatus
    )
  ) {
    return {
      success: false,
      message: `Invalid transition: ${withdrawal.status} -> ${newStatus}`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Update Request
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
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { investedCapital: { increment: withdrawal.amount } },
        });
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            type: "REFUND",
            amount: withdrawal.amount,
            status: "COMPLETED",
            paymentId: `REFUND-${id}`,
          },
        });
      }
    });

    // Notify user
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
    console.error(error);
    return { success: false, message: "Transaction failed" };
  }
}

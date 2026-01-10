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

// ============================================================================
// USER MANAGEMENT (ADMIN)
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

// ============================================================================
// TICKET MANAGEMENT (ADMIN)
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

  // Validate Transition
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
// WITHDRAWAL MANAGEMENT (SUPER_ADMIN ONLY)
// ============================================================================

export async function getWithdrawals() {
  await requireRole(UserRole.SUPER_ADMIN);
  try {
    const withdrawals = await prisma.withdrawalRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        user: { select: { email: true, availableBalance: true } },
      },
    });
    return { success: true, withdrawals };
  } catch (error) {
    return { success: false, message: "Failed to fetch withdrawals" };
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

      // Refund Logic if Rejected
      if (
        newStatus === WithdrawalStatus.REJECTED &&
        withdrawal.status !== WithdrawalStatus.REJECTED
      ) {
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { availableBalance: { increment: withdrawal.amount } },
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

    await logAudit("WITHDRAWAL_PROCESSED", "Withdrawal", id, { newStatus });
    revalidatePath("/superadmin/withdrawals");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Transaction failed" };
  }
}

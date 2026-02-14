"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TicketStatus, TicketPriority } from "@/lib/enums";
import { logAudit } from "@/lib/security";
import { logger } from "@/lib/logger";

/**
 * Obtiene los tickets del usuario actual.
 */
export async function getUserTickets() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return { success: true, tickets };
  } catch (error) {
    logger.error("Error fetching tickets:", error);
    return { success: false, message: "Error al obtener tickets" };
  }
}

/**
 * Obtiene un ticket específico con sus mensajes.
 */
export async function getTicket(ticketId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) return { success: false, message: "Ticket no encontrado" };
    if (ticket.userId !== session.user.id)
      return { success: false, message: "No autorizado" };

    return { success: true, ticket };
  } catch (error) {
    logger.error("Error fetching ticket:", error);
    return { success: false, message: "Error al obtener el ticket" };
  }
}

/**
 * Crea un nuevo ticket de soporte.
 */
export async function createTicket(formData: {
  subject: string;
  priority: TicketPriority;
  message: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  const { subject, priority, message } = formData;

  if (!subject || !message) {
    return { success: false, message: "Faltan campos requeridos" };
  }

  try {
    const ticket = await prisma.ticket.create({
      data: {
        userId: session.user.id,
        subject,
        priority,
        status: TicketStatus.OPEN,
        messages: {
          create: {
            userId: session.user.id,
            message,
            isAdmin: false,
          },
        },
      },
    });

    await logAudit("TICKET_CREATED", "Ticket", ticket.id, {
      subject,
      priority,
    });

    revalidatePath("/dashboard");
    return { success: true, ticket };
  } catch (error) {
    logger.error("Error creating ticket:", error);
    return { success: false, message: "Error al crear el ticket" };
  }
}

/**
 * Agrega una respuesta a un ticket existente (Usuario).
 */
export async function replyTicket(ticketId: string, message: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, message: "No autorizado" };

  if (!message.trim())
    return { success: false, message: "El mensaje no puede estar vacío" };

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return { success: false, message: "Ticket no encontrado" };
    if (ticket.userId !== session.user.id)
      return { success: false, message: "No autorizado" };

    await prisma.ticketMessage.create({
      data: {
        ticketId,
        userId: session.user.id,
        message,
        isAdmin: false,
      },
    });

    // Si el usuario responde a un ticket resuelto, lo movemos a IN_PROGRESS para continuar la conversación.
    if (ticket.status === TicketStatus.RESOLVED) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    logger.error("Error replying to ticket:", error);
    return { success: false, message: "Error al responder al ticket" };
  }
}

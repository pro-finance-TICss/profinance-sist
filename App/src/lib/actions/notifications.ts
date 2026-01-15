/**
 * SISTEMA: GESTIÓN DE NOTIFICACIONES
 *
 * DESCRIPCIÓN:
 * Acciones de servidor para crear, listar y marcar notificaciones como leídas.
 */

"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Crea una nueva notificación para un usuario específico.
 * @param type - INFO (default), WARNING, SUCCESS, ERROR
 */
export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" = "INFO"
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Obtiene todas las notificaciones no leídas del usuario actual.
 */
export async function getUnreadNotifications() {
  const session = await auth();
  if (!session?.user?.id) return { notifications: [], count: 0 };

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      orderBy: { createdAt: "desc" },
    });

    return { notifications, count: notifications.length };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], count: 0 };
  }
}

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await prisma.notification.update({
      where: { id: notificationId, userId: session.user.id },
      data: { read: true },
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}

export async function markAllAsRead() {
  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}

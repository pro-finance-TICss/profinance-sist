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
 * Obtiene las notificaciones recientes (leídas y no leídas).
 */
export async function getRecentNotifications(limit = 20) {
  const session = await auth();
  if (!session?.user?.id) return { notifications: [], unreadCount: 0 };

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return { notifications, unreadCount };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

/**
 * @deprecated Use getRecentNotifications instead
 */
export async function getUnreadNotifications() {
  return getRecentNotifications();
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

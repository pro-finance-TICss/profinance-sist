/**
 * SISTEMA: CHEQUEOS DE BILLETERA
 *
 * DESCRIPCIÓN:
 * Funciones para verificar el estado de la ventana de retiros y gestionar
 * notificaciones de proximidad de fecha límite.
 */

"use server";

import { auth } from "@/lib/auth";
import {
  isWithdrawalWindowOpen,
  WITHDRAWAL_END_DAY,
} from "@/lib/logic/withdrawal-window";
import {
  createNotification,
} from "@/lib/actions/notifications";
import { prisma } from "@/lib/prisma";

export async function checkWithdrawalWindowStatus() {
  return await isWithdrawalWindowOpen();
}

/**
 * Verifica si es necesario enviar una notificación de fecha límite al usuario.
 * Se basa en un chequeo "lazy" cuando el usuario visita el dashboard.
 * - Se activa si hoy está dentro de los 3 días previos a la fecha límite (ej. 13, 14, 15, 16).
 * - Envía solo una notificación por mes para este propósito.
 */
export async function checkAndSendWithdrawalNotification() {
  const session = await auth();
  if (!session?.user?.id) return;

  const now = new Date();
  const day = now.getDate();
  const deadlineDay = WITHDRAWAL_END_DAY; // 16

  // Verificar si estamos dentro de la ventana de notificación (3 días antes + día límite)
  // ej. si el límite es el 16, notificar los días 13, 14, 15, 16
  const startNotifyDay = deadlineDay - 3;

  if (day < startNotifyDay || day > deadlineDay) {
    return; // Fuera del rango de notificación
  }

  // Verificar si ya enviamos una notificación ESTE MES para este usuario
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Buscamos una notificación con un patrón de título específico creada este mes
  // Heurística simple para evitar duplicados sin una tabla de seguimiento separada
  const notificationTitle = "📅 Recordatorio de Retiros";

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: session.user.id,
      title: notificationTitle,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  if (existingNotification) {
    return; // Ya fue notificado este mes, evitamos duplicados
  }

  // Determinar la urgencia del mensaje según el día actual
  let message = "";
  if (day === deadlineDay) {
    message = `¡Hoy es el último día para solicitar retiros! Tienes hasta la medianoche.`;
  } else {
    const daysLeft = deadlineDay - day;
    message = `Recuerda que tienes hasta el día ${deadlineDay} para solicitar tus retiros. Quedan ${daysLeft} días.`;
  }

  await createNotification(session.user.id, notificationTitle, message, "INFO");
}

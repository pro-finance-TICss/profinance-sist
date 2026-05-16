/**
 * SISTEMA: CHEQUEOS DE BILLETERA
 *
 * DESCRIPCIÓN:
 * Funciones para verificar el estado del ciclo de inversión y gestionar
 * notificaciones de apertura/cierre de periodos.
 */

"use server";

import { auth } from "@/lib/auth";
import { getInvestmentCycleInfo } from "@/lib/logic/investment-cycles";
import { isInvestmentWindowOpen } from "@/lib/logic/withdrawal-window";
import { createNotification } from "@/lib/actions/notifications";
import { prisma } from "@/lib/prisma";

export async function checkWithdrawalWindowStatus() {
  return await isInvestmentWindowOpen();
}

/**
 * Verifica si debe enviarse una notificación al usuario sobre el periodo
 * activo/próximo de inversión. Reglas:
 *
 *   — Si estamos en periodo libre y quedan ≤ 3 días para que cierre → aviso de cierre
 *   — Si estamos en ciclo activo y mañana abre una ventana libre     → aviso de apertura
 *
 * Se envía máximo UNA notificación por tipo por ciclo (evita spam).
 */
export async function checkAndSendWithdrawalNotification() {
  const session = await auth();
  if (!session?.user?.id) return;

  const userId = session.user.id;
  const info   = getInvestmentCycleInfo();
  const now    = new Date();

  // ── Caso A: Periodo libre, ventana a punto de cerrarse ───────────────────
  if (!info.isLocked && info.daysUntilClose > 0 && info.daysUntilClose <= 3) {
    const titleClose = "⏳ Cierre de Ventana de Inversión";

    // Evitar duplicado en los últimos 7 días
    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const dup = await prisma.notification.findFirst({
      where: { userId, title: titleClose, createdAt: { gte: since } },
    });

    if (!dup) {
      const msg =
        info.daysUntilClose === 1
          ? `¡Mañana comienza el periodo de inversión! A partir de ese día los retiros y aportes quedarán bloqueados hasta el siguiente periodo libre.`
          : `El periodo de inversión comienza en ${info.daysUntilClose} días. Aprovecha para realizar retiros o aportes antes de que se cierre la ventana.`;

      await createNotification(userId, titleClose, msg, "INFO");
    }
  }

  // ── Caso B: Ciclo activo, la ventana libre abre mañana ───────────────────
  if (info.isLocked && info.daysUntilNextOpen === 1) {
    const titleOpen = "🟢 Ventana de Inversión Abriendo Mañana";

    const since = new Date(now);
    since.setDate(since.getDate() - 7);

    const dup = await prisma.notification.findFirst({
      where: { userId, title: titleOpen, createdAt: { gte: since } },
    });

    if (!dup) {
      await createNotification(
        userId,
        titleOpen,
        `¡Mañana abre el periodo libre! Podrás realizar retiros o aportes a tu cuenta de inversión durante los próximos días.`,
        "SUCCESS"
      );
    }
  }

  // ── Caso C: Inicio de ciclo (día 6) → recordatorio de bloqueo ────────────
  if (info.isLocked) {
    const day = now.getDate();
    if (day === 6) {
      const titleLock = `🔒 Inicio de ${info.cycleLabel ?? "Ciclo de Inversión"}`;

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const dup = await prisma.notification.findFirst({
        where: { userId, title: titleLock, createdAt: { gte: startOfMonth } },
      });

      if (!dup) {
        await createNotification(
          userId,
          titleLock,
          `El ciclo de inversión ha comenzado. Los retiros y aportes a tu cuenta de inversión estarán bloqueados hasta el ${
            info.lockEnd
              ? info.lockEnd.toLocaleDateString("es-CO", { day: "numeric", month: "long" })
              : "fin del ciclo"
          }.`,
          "WARNING"
        );
      }
    }
  }
}

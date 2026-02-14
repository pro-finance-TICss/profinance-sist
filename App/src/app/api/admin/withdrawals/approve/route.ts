// ============================================================================
// API ROUTE: APROBAR/RECHAZAR RETIRO - PRO-FINANCE (ADMIN)
// ============================================================================
// Permite a administradores aprobar o rechazar solicitudes de retiro.
// Cuando aprueba, ya NO descuenta del balance (el descuento se hizo al
// crear la solicitud en wallet/withdraw). Si rechaza, devuelve el balance.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveWithdrawalSchema } from "@/lib/validations/wallet";
import { decimalToNumber } from "@/lib/utils/currency";
import { createNotification } from "@/lib/actions/notifications";

/**
 * POST /api/admin/withdrawals/approve
 * Aprueba o rechaza una solicitud de retiro (solo admin).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación y rol de admin
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "No autorizado. Se requiere rol de administrador." },
        { status: 403 }
      );
    }

    // 2. Parsear y validar el body
    const body = await req.json();
    const validation = approveWithdrawalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { withdrawalId, action, notes } = validation.data;

    // 3. Obtener la solicitud de retiro con datos de la cuenta
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: { id: true, email: true },
        },
        account: {
          select: { id: true, name: true, investedCapital: true },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { error: "Solicitud de retiro no encontrada" },
        { status: 404 }
      );
    }

    if (withdrawal.status !== "PENDING") {
      return NextResponse.json(
        { error: "Esta solicitud ya fue procesada" },
        { status: 400 }
      );
    }

    const withdrawalAmount = decimalToNumber(withdrawal.amount);

    // 4. Procesar según la acción
    if (action === "APPROVE") {
      // Aprobar: El balance ya fue descontado al crear la solicitud.
      // Solo actualizar el estado de la solicitud.
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: "APPROVED",
          processedAt: new Date(),
          processedBy: session.user.id,
          notes,
        },
      });

      // Notificar al usuario
      await createNotification(
        withdrawal.userId,
        "Retiro Aprobado",
        `Su solicitud de retiro por $${withdrawalAmount} ha sido aprobada.${
          notes ? ` Nota: ${notes}` : ""
        }`,
        "SUCCESS"
      );

      console.log(
        `✅ Retiro aprobado: $${withdrawalAmount} para ${withdrawal.user.email}`
      );

      return NextResponse.json({
        success: true,
        message: "Retiro aprobado exitosamente",
      });
    } else {
      // Rechazar: Devolver el balance a la cuenta
      await prisma.$transaction(async (tx) => {
        // a. Actualizar estado del retiro
        await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: "REJECTED",
            processedAt: new Date(),
            processedBy: session.user.id,
            notes,
          },
        });

        // b. Devolver balance a la cuenta si existe accountId
        if (withdrawal.accountId) {
          await tx.account.update({
            where: { id: withdrawal.accountId },
            data: {
              investedCapital: { increment: withdrawalAmount },
            },
          });
        }
      });

      // Notificar al usuario
      await createNotification(
        withdrawal.userId,
        "Retiro Rechazado",
        `Su solicitud de retiro ha sido rechazada.${
          notes ? ` Nota: ${notes}` : ""
        }`,
        "ERROR"
      );

      console.log(`❌ Retiro rechazado para ${withdrawal.user.email}`);

      return NextResponse.json({
        success: true,
        message: "Retiro rechazado",
      });
    }
  } catch (error) {
    console.error("❌ Error procesando retiro:", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

// ============================================================================
// API ROUTE: APPROVE/REJECT WITHDRAWAL - PRO-FINANCE (ADMIN)
// ============================================================================
// Permite a administradores aprobar o rechazar solicitudes de retiro.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { approveWithdrawalSchema } from "@/lib/validations/wallet";
import { decimalToNumber } from "@/lib/utils/currency";

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

    if (session.user.role !== "ADMIN") {
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

    // 3. Obtener la solicitud de retiro
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            availableBalance: true,
          },
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

    // 4. Procesar según la acción
    if (action === "APPROVE") {
      // Verificar que el usuario aún tenga balance suficiente
      const availableBalance = decimalToNumber(
        withdrawal.user.availableBalance
      );
      const withdrawalAmount = decimalToNumber(withdrawal.amount);

      if (withdrawalAmount > availableBalance) {
        return NextResponse.json(
          {
            error: "El usuario ya no tiene balance suficiente",
            message: `Balance actual: $${availableBalance.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      // Aprobar: Descontar del balance y crear transacción
      await prisma.$transaction(async (tx) => {
        // Actualizar solicitud de retiro
        await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: "APPROVED",
            processedAt: new Date(),
            processedBy: session.user.id,
            notes,
          },
        });

        // Descontar del balance disponible
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: {
            availableBalance: { decrement: withdrawalAmount },
          },
        });

        // Crear transacción de retiro
        await tx.transaction.create({
          data: {
            userId: withdrawal.userId,
            type: "WITHDRAWAL",
            amount: withdrawalAmount,
            status: "COMPLETED",
          },
        });
      });

      console.log(
        `✅ Retiro aprobado: $${withdrawalAmount} para ${withdrawal.user.email}`
      );

      return NextResponse.json({
        success: true,
        message: "Retiro aprobado exitosamente",
      });
    } else {
      // Rechazar: Solo actualizar el estado
      await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: "REJECTED",
          processedAt: new Date(),
          processedBy: session.user.id,
          notes,
        },
      });

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

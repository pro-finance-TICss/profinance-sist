// ============================================================================
// RUTA API: CUENTA BANCARIA INDIVIDUAL - PRO-FINANCE
// ============================================================================
// Operaciones sobre una cuenta bancaria específica.
// PUT: Actualiza una cuenta bancaria.
// DELETE: Desactiva una cuenta bancaria (soft delete).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ============================================================================
// DELETE - DESACTIVAR CUENTA BANCARIA
// ============================================================================

/**
 * DELETE /api/wallet/bank-accounts/[id]
 * Desactiva (soft delete) una cuenta bancaria del usuario.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    // 2. Verificar que la cuenta existe y pertenece al usuario
    const account = await prisma.bankAccount.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        bankName: true,
        accountNumberLast4: true,
        isActive: true,
        isDefault: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta bancaria no encontrada" },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para eliminar esta cuenta" },
        { status: 403 }
      );
    }

    if (!account.isActive) {
      return NextResponse.json(
        { error: "Esta cuenta ya fue eliminada" },
        { status: 400 }
      );
    }

    // 3. Verificar que no hay retiros pendientes con esta cuenta
    const pendingWithdrawals = await prisma.withdrawalRequest.count({
      where: {
        bankAccountId: id,
        status: { in: ["PENDING", "REVIEWED"] },
      },
    });

    if (pendingWithdrawals > 0) {
      return NextResponse.json(
        {
          error:
            "No puedes eliminar esta cuenta mientras tengas retiros pendientes asociados",
        },
        { status: 400 }
      );
    }

    // 4. Desactivar cuenta (soft delete)
    await prisma.bankAccount.update({
      where: { id },
      data: {
        isActive: false,
        isDefault: false,
      },
    });

    // 5. Si era la predeterminada, asignar otra como predeterminada
    if (account.isDefault) {
      const nextDefault = await prisma.bankAccount.findFirst({
        where: {
          userId: session.user.id,
          isActive: true,
          id: { not: id },
        },
        orderBy: { createdAt: "desc" },
      });

      if (nextDefault) {
        await prisma.bankAccount.update({
          where: { id: nextDefault.id },
          data: { isDefault: true },
        });
      }
    }

    // 6. Crear notificación al usuario
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Cuenta bancaria eliminada",
        message: `Se eliminó la cuenta ${account.bankName} terminada en ****${account.accountNumberLast4}.`,
        type: "WARNING",
      },
    });

    logger.debug(
      `🗑️ Cuenta bancaria desactivada: ${account.bankName} ****${account.accountNumberLast4} del usuario ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      message: "Cuenta bancaria eliminada exitosamente",
    });
  } catch (error) {
    logger.error("❌ Error eliminando cuenta bancaria:", error);
    return NextResponse.json(
      { error: "Error al eliminar cuenta bancaria" },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - ESTABLECER COMO PREDETERMINADA
// ============================================================================

/**
 * PUT /api/wallet/bank-accounts/[id]
 * Actualiza una cuenta bancaria (actualmente solo isDefault).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // 2. Verificar que la cuenta existe y pertenece al usuario
    const account = await prisma.bankAccount.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        isActive: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Cuenta bancaria no encontrada" },
        { status: 404 }
      );
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json(
        { error: "No tienes permiso para modificar esta cuenta" },
        { status: 403 }
      );
    }

    if (!account.isActive) {
      return NextResponse.json(
        { error: "Esta cuenta ya fue eliminada" },
        { status: 400 }
      );
    }

    // 3. Si se está estableciendo como predeterminada
    if (body.isDefault === true) {
      // Quitar predeterminado de otras cuentas
      await prisma.bankAccount.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });

      // Establecer esta como predeterminada
      await prisma.bankAccount.update({
        where: { id },
        data: { isDefault: true },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta bancaria actualizada",
    });
  } catch (error) {
    logger.error("❌ Error actualizando cuenta bancaria:", error);
    return NextResponse.json(
      { error: "Error al actualizar cuenta bancaria" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { withdrawalRequestId } = body;

    if (!withdrawalRequestId) {
      return NextResponse.json({ error: "ID de solicitud no proporcionado" }, { status: 400 });
    }

    // Checking block status - Just cancel if pending and user owns it
    return await prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findFirst({
        where: { id: withdrawalRequestId, userId: session.user.id }
      });

      if (!withdrawal) {
        throw new Error("REQUEST_NOT_FOUND");
      }

      if (withdrawal.status !== "PENDING") {
        throw new Error("REQUEST_NOT_PENDING");
      }

      // Since internal transfers in queue DO NOT decrement balance, we just delete or mark as CANCELLED.
      if (withdrawal.bankAccountId === null) {
        // Internal transfer: Mark as cancelled/rejected
        await tx.withdrawalRequest.update({
          where: { id: withdrawalRequestId },
          data: {
            status: "REJECTED", // Or CANCELLED if you have it in your enum. Let's stick to REJECTED or delete it.
            notes: "Cancelado por el usuario",
            processedAt: new Date()
          }
        });
        
        return NextResponse.json({
          success: true,
          message: "Transferencia en cola cancelada exitosamente",
        });
      } else {
        throw new Error("NOT_INTERNAL_QUEUE"); // Should only be used to cancel internal transfer
      }
    });

  } catch (error: any) {
    logger.error("❌ Error en cancelación interna:", error);
    const message = error.message;
    if (message === "REQUEST_NOT_FOUND") return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (message === "REQUEST_NOT_PENDING") return NextResponse.json({ error: "La solicitud ya ha sido procesada" }, { status: 400 });
    if (message === "NOT_INTERNAL_QUEUE") return NextResponse.json({ error: "Esta ruta solo cancela colas internas" }, { status: 400 });
    
    return NextResponse.json({ error: "Error al cancelar solicitud" }, { status: 500 });
  }
}

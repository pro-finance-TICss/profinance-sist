// ============================================================================
// RUTA API: CREAR SOLICITUD DE RETIRO - PRO-FINANCE
// ============================================================================
// Crea una solicitud de retiro que requiere aprobación administrativa.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalSchema } from "@/lib/validations/wallet";
import { decimalToNumber } from "@/lib/utils/currency";

/**
 * POST /api/wallet/withdraw
 * Crea una solicitud de retiro.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Parsear y validar el body
    const body = await req.json();
    const validation = withdrawalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount } = validation.data;
    const { bankAccountId } = body;

    // 3. Crear solicitud y descontar balance en una transacción atómica
    const withdrawalResult = await prisma.$transaction(async (tx) => {
      // a. Leer balance dentro de la transacción (para bloqueo/consistencia si fuera Postgres con FOR UPDATE, pero en SQLite serializa)
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { investedCapital: true, email: true },
      });

      if (!user) throw new Error("USER_NOT_FOUND");

      const currentBalance = decimalToNumber(user.investedCapital);

      if (amount > currentBalance) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // b. Validar cuenta bancaria si se proporcionó
      if (bankAccountId) {
        const bankAccount = await tx.bankAccount.findUnique({
          where: { id: bankAccountId },
          select: { userId: true, isActive: true },
        });

        if (
          !bankAccount ||
          bankAccount.userId !== session.user.id ||
          !bankAccount.isActive
        ) {
          throw new Error("INVALID_BANK_ACCOUNT");
        }
      }

      // c. Descontar balance
      await tx.user.update({
        where: { id: session.user.id },
        data: { investedCapital: { decrement: amount } },
      });

      // d. Crear solicitud con cuenta bancaria
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: session.user.id,
          amount,
          status: "PENDING",
          bankAccountId: bankAccountId || null,
        },
      });

      // e. Crear registro de transacción (Ledger)
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: "WITHDRAWAL",
          amount,
          status: "COMPLETED", // El descuento de balance ha sido completado
        },
      });

      return { request, user };
    });

    const { request, user } = withdrawalResult;

    console.log(
      `📤 Solicitud de retiro creada y balance bloqueado: $${amount} para ${user.email}`
    );

    // LOG DE AUDITORÍA
    // Nota: Importamos dynamicamente o usamos fetch interno si logAudit es server-only.
    // Pero logAudit usa auth(), que funciona aqui.
    // Sin embargo, logAudit escribe en DB. Podemos llamarlo despues de la tx.

    // 5. TODO: Enviar notificación por email al departamento de finanzas
    const financeEmail = process.env.FINANCE_DEPARTMENT_EMAIL;
    console.log(
      `📧 [SIMULADO] Email enviado a ${financeEmail}:`,
      `Usuario ${user.email} solicita retiro de $${amount}`
    );

    // 6. Retornar confirmación
    return NextResponse.json({
      success: true,
      message: "Solicitud de retiro enviada exitosamente",
      withdrawal: {
        id: request.id,
        amount: decimalToNumber(request.amount),
        status: request.status,
        requestedAt: request.requestedAt,
      },
    });
  } catch (error: any) {
    if (error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Balance insuficiente" },
        { status: 400 }
      );
    }
    console.error("❌ Error creando solicitud de retiro:", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

// ============================================================================
// RUTA API: CREAR SOLICITUD DE RETIRO - PRO-FINANCE
// ============================================================================
// Crea una solicitud de retiro desde una cuenta específica ("cajita").
// Descuenta el balance de la cuenta y requiere aprobación administrativa.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalSchema } from "@/lib/validations/wallet";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";

/**
 * POST /api/wallet/withdraw
 * Crea una solicitud de retiro desde una cuenta específica.
 *
 * Body esperado: { amount: number, bankAccountId?: string, accountId: string }
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
    const { bankAccountId, accountId } = body;

    // Validar que se proporcione accountId
    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { error: "Se requiere el ID de la cuenta" },
        { status: 400 }
      );
    }

    // 3. Crear solicitud y descontar balance en una transacción atómica
    const withdrawalResult = await prisma.$transaction(async (tx) => {
      // a. Verificar que la cuenta pertenezca al usuario y obtener balance
      const account = await tx.account.findFirst({
        where: {
          id: accountId,
          userId: session.user.id,
        },
        select: {
          id: true,
          investedCapital: true,
          withdrawalLimitByDate: true,
        },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      const currentBalance = decimalToNumber(account.investedCapital);

      // b. Verificar balance suficiente
      if (amount > currentBalance) {
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // c. Verificar límite de retiro si existe
      if (account.withdrawalLimitByDate) {
        const limit = decimalToNumber(account.withdrawalLimitByDate);
        if (amount > limit) {
          throw new Error("WITHDRAWAL_LIMIT_EXCEEDED");
        }
      }

      // d. Validar cuenta bancaria si se proporcionó
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

      // e. Descontar balance de la cuenta
      await tx.account.update({
        where: { id: account.id },
        data: { investedCapital: { decrement: amount } },
      });

      // f. Crear solicitud de retiro con referencia a la cuenta
      const request = await tx.withdrawalRequest.create({
        data: {
          userId: session.user.id,
          accountId: account.id,
          amount,
          status: "PENDING",
          bankAccountId: bankAccountId || null,
        },
      });

      // g. Crear registro de transacción (Ledger)
      const ledgerTx = await tx.transaction.create({
        data: {
          userId: session.user.id,
          accountId: account.id,
          type: "WITHDRAWAL",
          amount,
          status: "COMPLETED",
        },
        select: { id: true },
      });

      return { request, accountId: account.id, transactionId: ledgerTx.id };
    });

    logger.debug(
      `📤 Solicitud de retiro creada: $${amount} desde cuenta ${withdrawalResult.accountId}`
    );

    // ── 4. AuditLog (C-3) ──────────────────────────────────────────────────────
    // Fuera del $transaction: si el log falla, el retiro ya se creó y confirmó.
    // No se usa logAudit() — hace auth() extra innecesario en este contexto.
    try {
      await prisma.auditLog.create({
        data: {
          action: "WITHDRAWAL_REQUESTED",
          entityType: "WithdrawalRequest",
          entityId: withdrawalResult.request.id,
          userId: session.user.id,
          details: JSON.stringify({
            amount,
            accountId: withdrawalResult.accountId,
            bankAccountId: bankAccountId || null,
            withdrawalRequestId: withdrawalResult.request.id,
            transactionId: withdrawalResult.transactionId,
          }),
          ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
        },
      });
    } catch (auditError) {
      // El AuditLog no puede romper una operación financiera ya confirmada
      logger.error("[AUDIT_ERROR] ❌ Error al registrar AuditLog de retiro:", auditError);
    }

    // 5. Enviar notificación simulada al departamento de finanzas
    const financeEmail = process.env.FINANCE_DEPARTMENT_EMAIL;
    logger.debug(
      `📧 [SIMULADO] Email enviado a ${financeEmail}:`,
      `Usuario ${session.user.id} solicita retiro de $${amount}`
    );

    // 5. Retornar confirmación
    return NextResponse.json({
      success: true,
      message: "Solicitud de retiro enviada exitosamente",
      withdrawal: {
        id: withdrawalResult.request.id,
        amount: decimalToNumber(withdrawalResult.request.amount),
        status: withdrawalResult.request.status,
        requestedAt: withdrawalResult.request.requestedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";

    if (message === "ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Cuenta no encontrada" },
        { status: 404 }
      );
    }
    if (message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Balance insuficiente" },
        { status: 400 }
      );
    }
    if (message === "WITHDRAWAL_LIMIT_EXCEEDED") {
      return NextResponse.json(
        { error: "El monto excede el límite de retiro" },
        { status: 400 }
      );
    }
    if (message === "INVALID_BANK_ACCOUNT") {
      return NextResponse.json(
        { error: "Cuenta bancaria inválida" },
        { status: 400 }
      );
    }

    logger.error("❌ Error creando solicitud de retiro:", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

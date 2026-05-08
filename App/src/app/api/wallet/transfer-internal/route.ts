// ============================================================================
// API ROUTE: TRANSFERENCIA INTERNA - PRO-FINANCE
// ============================================================================
//
// Mueve fondos entre las cuentas (SAVINGS ↔ INVESTMENT) del usuario autenticado.
// Toda la operación ocurre dentro de una transacción Prisma para garantizar
// atomicidad e integridad del saldo.
//
// SEGURIDAD:
//   - userId siempre proviene de session.user.id (JWT).  NUNCA del cuerpo del request.
//   - Se valida ownership de AMBAS cuentas contra session.user.id.
//   - Se valida que source !== destination.
//   - Se valida que los tipos de cuenta son coherentes con la dirección.
//
// COMPATIBILIDAD:
//   El endpoint acepta dos formatos de llamada:
//
//   1. EXPLÍCITO (seguro, recomendado):
//      { amount, direction, sourceAccountId, destinationAccountId }
//
//   2. IMPLÍCITO / LEGACY (fallback temporal):
//      { amount, direction }
//      → El backend resuelve las cuentas por tipo.
//      → Emite un warning en logs para que el frontend sea actualizado.
//      → Aceptable SOLO si el usuario tiene exactamente 1 cuenta SAVINGS
//        y 1 cuenta INVESTMENT (caso más frecuente).
//
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";
import { isInvestmentWindowOpen } from "@/lib/logic/withdrawal-window";

export async function POST(req: NextRequest) {
  try {
    // ── 1. Autenticación ─────────────────────────────────────────────────────
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const userId = session.user.id; // Fuente de verdad: NUNCA body.userId

    // ── 2. Parseo y validación básica del body ────────────────────────────────
    const body = await req.json();
    const {
      amount,
      direction,
      sourceAccountId,
      destinationAccountId,
    } = body;

    // Structured log: inicio de la operación
    logger.debug(
      `[transfer-internal] START — userId: ${userId}, direction: ${direction ?? "(none)"}, amount: ${amount ?? "(none)"}, ` +
      `sourceAccountId: ${sourceAccountId ?? "(implicit)"}, destinationAccountId: ${destinationAccountId ?? "(implicit)"}`
    );

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    if (direction !== "TO_INVESTMENT" && direction !== "TO_SAVINGS") {
      return NextResponse.json(
        { error: "Dirección de transferencia inválida" },
        { status: 400 }
      );
    }

    // ── 3. Estado del periodo de inversión ────────────────────────────────────
    const windowStatus = await isInvestmentWindowOpen();

    // ── 4. Transacción Prisma (atómica) ───────────────────────────────────────
    // Retorna datos estructurados (no NextResponse) para que el AuditLog (C-2)
    // pueda insertarse fuera de la transacción.
    const txResult = await prisma.$transaction(async (tx) => {

      // ── 4a. Resolver cuentas de origen y destino ──────────────────────────
      let sourceAccount: any = null;
      let destinationAccount: any = null;

      const hasExplicitIds =
        typeof sourceAccountId === "string" && sourceAccountId.length > 0 &&
        typeof destinationAccountId === "string" && destinationAccountId.length > 0;

      if (hasExplicitIds) {
        // ── Camino seguro: IDs explícitos provistos por el cliente ──────────
        // Validar ownership de ambas cuentas contra session.user.id
        [sourceAccount, destinationAccount] = await Promise.all([
          tx.account.findFirst({
            where: { id: sourceAccountId, userId },
          }),
          tx.account.findFirst({
            where: { id: destinationAccountId, userId },
          }),
        ]);

        if (!sourceAccount) {
          logger.error(
            `[transfer-internal] sourceAccount no encontrada o no autorizada — userId: ${userId}, sourceAccountId: ${sourceAccountId}`
          );
          throw new Error("SOURCE_ACCOUNT_NOT_FOUND");
        }

        if (!destinationAccount) {
          logger.error(
            `[transfer-internal] destinationAccount no encontrada o no autorizada — userId: ${userId}, destinationAccountId: ${destinationAccountId}`
          );
          throw new Error("DESTINATION_ACCOUNT_NOT_FOUND");
        }

        // Prevenir transferencia a sí misma
        if (sourceAccount.id === destinationAccount.id) {
          throw new Error("SAME_ACCOUNT_ERROR");
        }

        // Validar coherencia de tipos con la dirección declarada
        // (protección contra peticiones manipuladas desde el cliente)
        if (direction === "TO_INVESTMENT") {
          if (sourceAccount.type !== "SAVINGS") {
            logger.warn(
              `[transfer-internal] Tipo de cuenta origen inválido para TO_INVESTMENT — esperado SAVINGS, recibido ${sourceAccount.type}`
            );
            throw new Error("INVALID_ACCOUNT_TYPE_FOR_DIRECTION");
          }
          if (destinationAccount.type !== "INVESTMENT") {
            logger.warn(
              `[transfer-internal] Tipo de cuenta destino inválido para TO_INVESTMENT — esperado INVESTMENT, recibido ${destinationAccount.type}`
            );
            throw new Error("INVALID_ACCOUNT_TYPE_FOR_DIRECTION");
          }
        } else {
          // TO_SAVINGS
          if (sourceAccount.type !== "INVESTMENT") {
            logger.warn(
              `[transfer-internal] Tipo de cuenta origen inválido para TO_SAVINGS — esperado INVESTMENT, recibido ${sourceAccount.type}`
            );
            throw new Error("INVALID_ACCOUNT_TYPE_FOR_DIRECTION");
          }
          if (destinationAccount.type !== "SAVINGS") {
            logger.warn(
              `[transfer-internal] Tipo de cuenta destino inválido para TO_SAVINGS — esperado SAVINGS, recibido ${destinationAccount.type}`
            );
            throw new Error("INVALID_ACCOUNT_TYPE_FOR_DIRECTION");
          }
        }

      } else {
        // ── Fallback TEMPORAL: cliente no envió IDs explícitos ───────────────
        // Se resuelven por tipo. Seguro únicamente cuando el usuario tiene
        // exactamente 1 SAVINGS y 1 INVESTMENT. Loggear para forzar actualización.
        // [M-3] FALLBACK ACTIVO — nivel ERROR para visibilidad máxima en logs
        // El sistema sigue funcionando, pero esto DEBE eliminarse antes de producción.
        logger.error(
          `[transfer-internal] FALLBACK ACTIVADO — esto debe eliminarse antes de producción`,
          {
            userId,
            direction,
            note: "sourceAccountId/destinationAccountId no fueron provistos por el cliente. Actualizar InternalTransferModal.",
          }
        );

        const savingsAcc = await tx.account.findFirst({
          where: { userId, type: "SAVINGS" },
        });
        const investmentAcc = await tx.account.findFirst({
          where: { userId, type: "INVESTMENT" },
          orderBy: { createdAt: "asc" }, // Determinista: siempre la primera creada
        });

        if (!savingsAcc || !investmentAcc) {
          logger.error(
            `[transfer-internal] Fallback: cuentas no encontradas — userId: ${userId}`
          );
          throw new Error("COULD_NOT_FIND_ACCOUNTS");
        }

        sourceAccount = direction === "TO_INVESTMENT" ? savingsAcc : investmentAcc;
        destinationAccount = direction === "TO_INVESTMENT" ? investmentAcc : savingsAcc;
      }

      // ── 4b. Validar balance suficiente en la cuenta origen ────────────────
      const currentSourceBalance = decimalToNumber(sourceAccount.investedCapital);
      if (amount > currentSourceBalance) {
        logger.warn(
          `[transfer-internal] Fondos insuficientes — userId: ${userId}, sourceAccount: ${sourceAccount.id}, balance: ${currentSourceBalance}, solicitado: ${amount}`
        );
        throw new Error("INSUFFICIENT_FUNDS");
      }

      // ── 4c. Lógica de negocio según dirección ─────────────────────────────

      if (direction === "TO_INVESTMENT") {
        // Bloqueo de periodo: no se admiten nuevos fondos en inversión
        if (!windowStatus.isOpen) {
          throw new Error("INVESTMENT_BLOCKED");
        }

        // Débito en origen → crédito en destino
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { investedCapital: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: destinationAccount.id },
          data: { investedCapital: { increment: amount } },
        });

        const sourceTx = await tx.transaction.create({
          data: {
            userId,
            accountId: sourceAccount.id,
            type: "WITHDRAWAL",
            amount,
            status: "COMPLETED",
          },
          select: { id: true },
        });
        const destTx = await tx.transaction.create({
          data: {
            userId,
            accountId: destinationAccount.id,
            type: "DEPOSIT",
            amount,
            status: "COMPLETED",
          },
          select: { id: true },
        });

        logger.debug(
          `[transfer-internal] ✅ TO_INVESTMENT completado — userId: ${userId}, monto: ${amount}, source: ${sourceAccount.id}, dest: ${destinationAccount.id}`
        );

        return {
          queued: false,
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          sourceTransactionId: sourceTx.id,
          destinationTransactionId: destTx.id,
          message: "Transferencia a Inversión exitosa",
        };

      } else {
        // TO_SAVINGS
        if (!windowStatus.isOpen) {
          // Periodo cerrado → encolar como WithdrawalRequest
          await tx.withdrawalRequest.create({
            data: {
              userId,
              accountId: sourceAccount.id,
              amount,
              status: "PENDING",
              bankAccountId: null, // null = transferencia interna (no bancaria)
              notes: "En cola para pase a Ahorros",
            },
          });

          logger.debug(
            `[transfer-internal] ⏳ TO_SAVINGS encolado (periodo cerrado) — userId: ${userId}, monto: ${amount}, sourceAccount: ${sourceAccount.id}`
          );

          return {
            queued: true,
            sourceAccountId: sourceAccount.id,
            destinationAccountId: destinationAccount.id,
            sourceTransactionId: null,
            destinationTransactionId: null,
            message: "Periodo bloqueado: Tu solicitud ha sido puesta en cola.",
          };
        }

        // Periodo abierto → transferencia inmediata
        await tx.account.update({
          where: { id: sourceAccount.id },
          data: { investedCapital: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: destinationAccount.id },
          data: { investedCapital: { increment: amount } },
        });

        const sourceTx = await tx.transaction.create({
          data: {
            userId,
            accountId: sourceAccount.id,
            type: "WITHDRAWAL",
            amount,
            status: "COMPLETED",
          },
          select: { id: true },
        });
        const destTx = await tx.transaction.create({
          data: {
            userId,
            accountId: destinationAccount.id,
            type: "DEPOSIT",
            amount,
            status: "COMPLETED",
          },
          select: { id: true },
        });

        logger.debug(
          `[transfer-internal] ✅ TO_SAVINGS completado — userId: ${userId}, monto: ${amount}, source: ${sourceAccount.id}, dest: ${destinationAccount.id}`
        );

        return {
          queued: false,
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          sourceTransactionId: sourceTx.id,
          destinationTransactionId: destTx.id,
          message: "Transferencia a Ahorros exitosa",
        };
      }
    }); // fin prisma.$transaction

    // ── 5. AuditLog (C-2) ─────────────────────────────────────────────────────────────────────
    // Fuera del $transaction: si el log falla, la transferencia ya confirmó.
    // No se usa logAudit() porque hace auth() extra y no es necesario aquí.
    // Solo auditar transferencias inmediatas (las encoladas no mueven fondos todavía).
    if (!txResult.queued && txResult.sourceTransactionId) {
      try {
        await prisma.auditLog.create({
          data: {
            action: "INTERNAL_TRANSFER",
            entityType: "Transaction",
            entityId: txResult.sourceTransactionId,
            userId,
            details: JSON.stringify({
              sourceAccountId: txResult.sourceAccountId,
              destinationAccountId: txResult.destinationAccountId,
              amount,
              direction,
              sourceTransactionId: txResult.sourceTransactionId,
              destinationTransactionId: txResult.destinationTransactionId,
            }),
            ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
          },
        });
      } catch (auditError) {
        // El AuditLog no puede romper una operación financiera ya confirmada
        logger.error("[AUDIT_ERROR] ❌ Error al registrar AuditLog de transferencia interna:", auditError);
      }
    }

    // Construir la respuesta JSON a partir de los datos retornados por la transacción
    const responsePayload: Record<string, unknown> = { success: true, message: txResult.message };
    if (txResult.queued) responsePayload.queued = true;
    return NextResponse.json(responsePayload);

  } catch (error: any) {
    logger.error(
      `[transfer-internal] ERROR — ${error?.message ?? error}`
    );

    const msg = error?.message;

    if (msg === "SOURCE_ACCOUNT_NOT_FOUND")
      return NextResponse.json(
        { error: "Cuenta de origen no encontrada o no autorizada" },
        { status: 404 }
      );
    if (msg === "DESTINATION_ACCOUNT_NOT_FOUND")
      return NextResponse.json(
        { error: "Cuenta de destino no encontrada o no autorizada" },
        { status: 404 }
      );
    if (msg === "SAME_ACCOUNT_ERROR")
      return NextResponse.json(
        { error: "Las cuentas de origen y destino no pueden ser la misma" },
        { status: 400 }
      );
    if (msg === "INVALID_ACCOUNT_TYPE_FOR_DIRECTION")
      return NextResponse.json(
        { error: "Los tipos de cuenta no coinciden con la dirección de transferencia" },
        { status: 400 }
      );
    if (msg === "COULD_NOT_FIND_ACCOUNTS")
      return NextResponse.json(
        { error: "Cuentas no encontradas. Asegúrate de tener al menos una cuenta de inversión." },
        { status: 404 }
      );
    if (msg === "INVESTMENT_BLOCKED")
      return NextResponse.json(
        { error: "El periodo de Inversión está cerrado. No se puede ingresar capital nuevo." },
        { status: 403 }
      );
    if (msg === "INSUFFICIENT_FUNDS")
      return NextResponse.json(
        { error: "Fondos insuficientes en la cuenta de origen" },
        { status: 400 }
      );

    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

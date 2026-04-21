import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decimalToNumber } from "@/lib/utils/currency";
import { logger } from "@/lib/logger";
import { isInvestmentWindowOpen } from "@/lib/logic/withdrawal-window";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { amount, direction } = body; // direction: 'TO_INVESTMENT' | 'TO_SAVINGS'

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    }

    if (direction !== "TO_INVESTMENT" && direction !== "TO_SAVINGS") {
      return NextResponse.json({ error: "Dirección de transferencia inválida" }, { status: 400 });
    }

    // Verificar estado del periodo de inversión
    const status = await isInvestmentWindowOpen();

    return await prisma.$transaction(async (tx) => {
      // Siempre buscar la cuenta de Ahorros única del usuario
      const savingsAccount = await tx.account.findFirst({
        where: { userId: session.user.id, type: "SAVINGS" },
      });

      // Si el cliente envía un accountId (cuenta de inversión activa), usarlo.
      // Esto permite soportar múltiples cuentas de inversión por usuario.
      const { accountId: activeAccountId } = body;
      let investmentAccount: any = null;

      if (activeAccountId && typeof activeAccountId === "string") {
        investmentAccount = await tx.account.findFirst({
          where: { userId: session.user.id, type: "INVESTMENT", id: activeAccountId },
        });
      }

      // Fallback: tomar la primera cuenta de inversión (compatibilidad con cuentas legacy)
      if (!investmentAccount) {
        investmentAccount = await tx.account.findFirst({
          where: { userId: session.user.id, type: "INVESTMENT" },
        });
      }

      if (!savingsAccount || !investmentAccount) {
        throw new Error("COULD_NOT_FIND_ACCOUNTS");
      }

      if (direction === "TO_INVESTMENT") {
        if (!status.isOpen) {
          throw new Error("INVESTMENT_BLOCKED");
        }

        const currentSavings = decimalToNumber(savingsAccount.investedCapital);
        if (amount > currentSavings) throw new Error("INSUFFICIENT_FUNDS_SAVINGS");

        // Descontar de Ahorros → sumar a Inversión
        await tx.account.update({
          where: { id: savingsAccount.id },
          data: { investedCapital: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: investmentAccount.id },
          data: { investedCapital: { increment: amount } },
        });

        // Registro de transacciones (Ledger)
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            accountId: savingsAccount.id,
            type: "WITHDRAWAL",
            amount,
            status: "COMPLETED",
          },
        });
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            accountId: investmentAccount.id,
            type: "DEPOSIT",
            amount,
            status: "COMPLETED",
          },
        });

        return NextResponse.json({
          success: true,
          message: "Transferencia a Inversión exitosa",
        });

      } else if (direction === "TO_SAVINGS") {
        const currentInvestment = decimalToNumber(investmentAccount.investedCapital);
        if (amount > currentInvestment) throw new Error("INSUFFICIENT_FUNDS_INVESTMENT");

        if (!status.isOpen) {
          // Bloqueado: poner en cola como WithdrawalRequest
          await tx.withdrawalRequest.create({
            data: {
              userId: session.user.id,
              accountId: investmentAccount.id,
              amount,
              status: "PENDING",
              bankAccountId: null, // Indica transferencia interna
              notes: "En cola para pase a Ahorros",
            },
          });

          return NextResponse.json({
            success: true,
            queued: true,
            message: "Periodo bloqueado: Tu solicitud ha sido puesta en cola.",
          });
        } else {
          // Desbloqueado: transferencia instantánea
          await tx.account.update({
            where: { id: investmentAccount.id },
            data: { investedCapital: { decrement: amount } },
          });
          await tx.account.update({
            where: { id: savingsAccount.id },
            data: { investedCapital: { increment: amount } },
          });

          // Registro de transacciones (Ledger)
          await tx.transaction.create({
            data: {
              userId: session.user.id,
              accountId: investmentAccount.id,
              type: "WITHDRAWAL",
              amount,
              status: "COMPLETED",
            },
          });
          await tx.transaction.create({
            data: {
              userId: session.user.id,
              accountId: savingsAccount.id,
              type: "DEPOSIT",
              amount,
              status: "COMPLETED",
            },
          });

          return NextResponse.json({
            success: true,
            message: "Transferencia a Ahorros exitosa",
          });
        }
      }
    });

  } catch (error: any) {
    logger.error("❌ Error en transferencia interna:", error);
    const message = error.message;
    if (message === "COULD_NOT_FIND_ACCOUNTS") return NextResponse.json({ error: "Cuentas no encontradas. Asegúrate de tener al menos una cuenta de inversión." }, { status: 404 });
    if (message === "INVESTMENT_BLOCKED") return NextResponse.json({ error: "El periodo de Inversión está cerrado. No se puede ingresar capital nuevo." }, { status: 403 });
    if (message === "INSUFFICIENT_FUNDS_SAVINGS") return NextResponse.json({ error: "Fondos insuficientes en la cuenta de Ahorros" }, { status: 400 });
    if (message === "INSUFFICIENT_FUNDS_INVESTMENT") return NextResponse.json({ error: "Fondos insuficientes en la cuenta de Inversión" }, { status: 400 });

    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}

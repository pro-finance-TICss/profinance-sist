// ============================================================================
// SERVICIO DE REFERIDOS — PRO-FINANCE
// ============================================================================
// Lógica central del sistema de referidos. Todas las funciones son puras,
// idempotentes y seguras para ejecución concurrente.
//
// REGLA DE COMISIÓN:
//   5% del monto del primer depósito COMPLETED del referido.
//   Sin tope máximo. Sin mínimo de inversión.
//
// IDEMPOTENCIA:
//   ReferralReward.sourceTransactionId tiene @unique en el schema.
//   Si se llama dos veces con el mismo transactionId, la segunda llamada
//   detecta el registro existente y retorna sin crear duplicados.
// ============================================================================

import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ============================================================================
// CONSTANTES
// ============================================================================

/** Porcentaje de comisión aplicado sobre el monto del depósito del referido */
const COMMISSION_PERCENTAGE = 0.05;

/** Caracteres permitidos para el código de referido (sin I, O, 0, 1 para evitar confusión) */
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";

// ============================================================================
// TIPOS
// ============================================================================

export type CommissionResult =
    | {
        success: true;
        commissionAmount: number;
        currency: string;
        creditedAccountId: string;
        rewardTransactionId: string;
        referralActivated: boolean;
    }
    | {
        success: false;
        reason:
        | "NO_REFERRAL"
        | "ALREADY_PROCESSED"
        | "TRANSACTION_NOT_VALID"
        | "NO_REWARD_ACCOUNT";
        detail?: string;
    };

// ============================================================================
// GENERACIÓN DE CÓDIGO DE REFERIDO
// ============================================================================

/**
 * Genera un código de referido único de 8 caracteres (4 letras + 4 dígitos).
 * Reintenta automáticamente en caso de colisión.
 *
 * @param tx - Transacción Prisma activa (para atomicidad)
 * @returns Código único garantizado
 */
export async function generateUniqueReferralCode(
    tx: Prisma.TransactionClient
): Promise<string> {
    const MAX_ATTEMPTS = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        let code = "";

        // 4 letras
        for (let i = 0; i < 4; i++) {
            code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
        }

        // 4 dígitos
        for (let i = 0; i < 4; i++) {
            code += CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
        }

        // Verificar unicidad dentro de la transacción
        const existing = await tx.user.findUnique({
            where: { referralCode: code },
            select: { id: true },
        });

        if (!existing) {
            return code;
        }
    }

    throw new Error(
        `[referral.service] No se pudo generar un código único después de ${MAX_ATTEMPTS} intentos`
    );
}

// ============================================================================
// OBTENER CUENTA DESTINO DE COMISIONES
// ============================================================================

/**
 * Obtiene la cuenta donde se acreditará la comisión del referrer.
 *
 * Prioridad:
 * 1. Account con isDefaultReward = true
 * 2. Fallback: primera Account creada (por fecha)
 *
 * @param userId - ID del referrer (Usuario A)
 * @param tx - Transacción Prisma activa
 * @returns Account encontrada, o null si el usuario no tiene cuentas
 */
export async function getRewardAccount(
    userId: string,
    tx: Prisma.TransactionClient
) {
    // Intentar cuenta marcada como destino de recompensas
    const defaultAccount = await tx.account.findFirst({
        where: { userId, isDefaultReward: true },
        select: { id: true, investedCapital: true },
    });

    if (defaultAccount) return defaultAccount;

    // Fallback: primera cuenta creada
    const firstAccount = await tx.account.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { id: true, investedCapital: true },
    });

    return firstAccount;
}

// ============================================================================
// PROCESAMIENTO DE COMISIÓN DE REFERIDO
// ============================================================================

/**
 * Procesa la comisión de referido para una transacción dada.
 *
 * Esta función es IDEMPOTENTE: si se llama dos veces con el mismo
 * sourceTransactionId, la segunda llamada retorna { success: false, reason: 'ALREADY_PROCESSED' }
 * sin crear registros duplicados.
 *
 * Flujo:
 * 1. Verifica que la transacción existe, es DEPOSIT y está COMPLETED
 * 2. Busca si el usuario tiene un Referral activo (fue referido por alguien)
 * 3. Verifica idempotencia (no procesar dos veces la misma transacción)
 * 4. Calcula la comisión (5%)
 * 5. Obtiene la cuenta destino del referrer
 * 6. En una transacción atómica:
 *    a. Crea ReferralReward
 *    b. Crea Transaction de tipo COMMISSION para el referrer
 *    c. Incrementa investedCapital de la cuenta destino
 *    d. Activa el Referral si estaba PENDING
 *
 * @param sourceTransactionId - ID de la transacción del referido que dispara la comisión
 * @returns CommissionResult con detalles del resultado
 */
export async function processReferralCommission(
    sourceTransactionId: string
): Promise<CommissionResult> {
    // ── 1. Cargar la transacción fuente ──────────────────────────────────────
    const sourceTx = await prisma.transaction.findUnique({
        where: { id: sourceTransactionId },
        select: {
            id: true,
            userId: true,
            accountId: true,
            type: true,
            status: true,
            amount: true,
        },
    });

    if (!sourceTx) {
        return {
            success: false,
            reason: "TRANSACTION_NOT_VALID",
            detail: `Transacción ${sourceTransactionId} no encontrada`,
        };
    }

    // Solo procesar depósitos completados
    if (sourceTx.type !== "DEPOSIT" || sourceTx.status !== "COMPLETED") {
        return {
            success: false,
            reason: "TRANSACTION_NOT_VALID",
            detail: `Transacción ${sourceTransactionId} no es un DEPOSIT COMPLETED (type=${sourceTx.type}, status=${sourceTx.status})`,
        };
    }

    // ── 2. Buscar relación de referido del usuario ───────────────────────────
    const referral = await prisma.referral.findUnique({
        where: { referredId: sourceTx.userId },
        select: {
            id: true,
            referrerId: true,
            status: true,
            referrer: {
                select: { id: true, baseCurrency: true },
            },
        },
    });

    if (!referral) {
        return {
            success: false,
            reason: "NO_REFERRAL",
            detail: `Usuario ${sourceTx.userId} no fue referido por nadie`,
        };
    }

    // ── 3. Verificar idempotencia ─────────────────────────────────────────────
    const existingReward = await prisma.referralReward.findUnique({
        where: { sourceTransactionId },
        select: { id: true, rewardTransactionId: true, amount: true, currency: true, creditedAccountId: true },
    });

    if (existingReward) {
        return {
            success: false,
            reason: "ALREADY_PROCESSED",
            detail: `La transacción ${sourceTransactionId} ya generó la comisión ${existingReward.id}`,
        };
    }

    // ── 4. Calcular comisión ──────────────────────────────────────────────────
    const commissionAmount = sourceTx.amount.mul(COMMISSION_PERCENTAGE);
    const currency = referral.referrer.baseCurrency || "COP";

    // ── 5. Obtener cuenta destino del referrer ────────────────────────────────
    // Necesitamos hacer esto dentro de la transacción para consistencia
    const rewardAccount = await prisma.account.findFirst({
        where: {
            userId: referral.referrerId,
            isDefaultReward: true,
        },
        select: { id: true, investedCapital: true },
    }) ?? await prisma.account.findFirst({
        where: { userId: referral.referrerId },
        orderBy: { createdAt: "asc" },
        select: { id: true, investedCapital: true },
    });

    if (!rewardAccount) {
        return {
            success: false,
            reason: "NO_REWARD_ACCOUNT",
            detail: `El referrer ${referral.referrerId} no tiene cuentas para acreditar la comisión`,
        };
    }

    // ── 6. Ejecutar operaciones atómicas ─────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
        // a. Crear la transacción COMMISSION visible en el historial del referrer
        const commissionTx = await tx.transaction.create({
            data: {
                userId: referral.referrerId,
                accountId: rewardAccount.id,
                type: "COMMISSION",
                amount: commissionAmount,
                status: "COMPLETED",
            },
            select: { id: true },
        });

        // b. Crear el registro de auditoría ReferralReward
        await tx.referralReward.create({
            data: {
                referralId: referral.id,
                sourceTransactionId,
                creditedAccountId: rewardAccount.id,
                rewardTransactionId: commissionTx.id,
                amount: commissionAmount,
                percentageApplied: COMMISSION_PERCENTAGE,
                currency,
                status: "CREDITED",
            },
        });

        // c. Incrementar el balance de la cuenta destino del referrer
        await tx.account.update({
            where: { id: rewardAccount.id },
            data: {
                investedCapital: {
                    increment: commissionAmount,
                },
            },
        });

        // d. Activar el referido si estaba PENDING
        const wasActivated = referral.status === "PENDING";
        if (wasActivated) {
            await tx.referral.update({
                where: { id: referral.id },
                data: {
                    status: "ACTIVE",
                    activatedAt: new Date(),
                },
            });
        }

        return {
            commissionTxId: commissionTx.id,
            wasActivated,
        };
    });

    return {
        success: true,
        commissionAmount: commissionAmount.toNumber(),
        currency,
        creditedAccountId: rewardAccount.id,
        rewardTransactionId: result.commissionTxId,
        referralActivated: result.wasActivated,
    };
}

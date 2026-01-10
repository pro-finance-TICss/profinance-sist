// ============================================================================
// VALIDACIONES DE WALLET - PRO-FINANCE
// ============================================================================
// Schemas de validación con Zod para operaciones de billetera.
// ============================================================================

import { z } from "zod";

// ============================================================================
// CONSTANTES DE VALIDACIÓN
// ============================================================================

/** Monto mínimo para depósitos (USD) */
export const MIN_DEPOSIT_AMOUNT = 10;

/** Monto máximo para depósitos (USD) */
export const MAX_DEPOSIT_AMOUNT = 100000;

/** Monto mínimo para retiros (USD) */
export const MIN_WITHDRAWAL_AMOUNT = 10;

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Schema para validar depósitos.
 * Valida que el monto esté entre $10 y $100,000.
 */
export const depositSchema = z.object({
  amount: z
    .number({
      required_error: "El monto es requerido.",
      invalid_type_error: "El monto debe ser un número.",
    })
    .min(MIN_DEPOSIT_AMOUNT, {
      message: `El monto mínimo de depósito es $${MIN_DEPOSIT_AMOUNT}.`,
    })
    .max(MAX_DEPOSIT_AMOUNT, {
      message: `El monto máximo de depósito es $${MAX_DEPOSIT_AMOUNT.toLocaleString()}.`,
    })
    .refine(
      (val) => {
        // Validar que no tenga más de 2 decimales
        const decimals = (val.toString().split(".")[1] || "").length;
        return decimals <= 2;
      },
      {
        message: "El monto no puede tener más de 2 decimales.",
      }
    ),
});

/**
 * Schema para validar retiros.
 * Valida que el monto sea al menos $10.
 * La validación de balance disponible se hace en el servidor.
 */
export const withdrawalSchema = z.object({
  amount: z
    .number({
      required_error: "El monto es requerido.",
      invalid_type_error: "El monto debe ser un número.",
    })
    .min(MIN_WITHDRAWAL_AMOUNT, {
      message: `El monto mínimo de retiro es $${MIN_WITHDRAWAL_AMOUNT}.`,
    })
    .refine(
      (val) => {
        // Validar que no tenga más de 2 decimales
        const decimals = (val.toString().split(".")[1] || "").length;
        return decimals <= 2;
      },
      {
        message: "El monto no puede tener más de 2 decimales.",
      }
    ),
});

/**
 * Schema para validar aprobación/rechazo de retiros (admin).
 */
export const approveWithdrawalSchema = z.object({
  withdrawalId: z.string({
    required_error: "El ID de la solicitud es requerido.",
  }),
  action: z.enum(["APPROVE", "REJECT"], {
    required_error: "La acción es requerida.",
    invalid_type_error: "La acción debe ser APPROVE o REJECT.",
  }),
  notes: z.string().optional(),
});

// ============================================================================
// TIPOS INFERIDOS
// ============================================================================

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type ApproveWithdrawalInput = z.infer<typeof approveWithdrawalSchema>;

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
// SCHEMAS DE CUENTAS BANCARIAS
// ============================================================================

/** Países disponibles */
export const AVAILABLE_COUNTRIES = ["CO", "MX"] as const;

/** Tipos de cuenta */
export const ACCOUNT_TYPES = ["SAVINGS", "CHECKING", "CLABE", "DEBIT"] as const;

/**
 * Schema para validar creación/edición de cuentas bancarias.
 */
export const bankAccountSchema = z.object({
  /** Nombre del titular (como aparece en la cuenta) */
  holderName: z
    .string({
      required_error: "El nombre del titular es requerido.",
    })
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .max(100, { message: "El nombre no puede exceder 100 caracteres." }),

  /** Tipo de documento */
  documentType: z
    .string({
      required_error: "El tipo de documento es requerido.",
    })
    .min(1, { message: "Selecciona un tipo de documento." }),

  /** Número de documento */
  documentNumber: z
    .string({
      required_error: "El número de documento es requerido.",
    })
    .min(5, {
      message: "El número de documento debe tener al menos 5 caracteres.",
    })
    .max(20, {
      message: "El número de documento no puede exceder 20 caracteres.",
    }),

  /** País de la cuenta */
  country: z.enum(AVAILABLE_COUNTRIES, {
    required_error: "El país es requerido.",
    invalid_type_error: "País no válido.",
  }),

  /** Código del banco */
  bankCode: z
    .string({
      required_error: "El banco es requerido.",
    })
    .min(1, { message: "Selecciona un banco." }),

  /** Número de cuenta (se encriptará en el servidor) */
  accountNumber: z
    .string({
      required_error: "El número de cuenta es requerido.",
    })
    .min(10, { message: "El número de cuenta debe tener al menos 10 dígitos." })
    .max(20, { message: "El número de cuenta no puede exceder 20 dígitos." })
    .regex(/^\d+$/, {
      message: "El número de cuenta solo debe contener dígitos.",
    }),

  /** Tipo de cuenta */
  accountType: z.enum(ACCOUNT_TYPES, {
    required_error: "El tipo de cuenta es requerido.",
    invalid_type_error: "Tipo de cuenta no válido.",
  }),

  /** Marcar como cuenta predeterminada */
  isDefault: z.boolean().optional().default(false),
});

/**
 * Schema para actualizar una cuenta bancaria (todos los campos opcionales excepto el ID).
 */
export const updateBankAccountSchema = bankAccountSchema.partial().extend({
  id: z.string({
    required_error: "El ID de la cuenta es requerido.",
  }),
});

// ============================================================================
// TIPOS INFERIDOS
// ============================================================================

export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type ApproveWithdrawalInput = z.infer<typeof approveWithdrawalSchema>;
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;

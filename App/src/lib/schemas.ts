import { z } from "zod";

/**
 * Esquema de validación para el Login.
 * @description Define las reglas de negocio para los campos de inicio de sesión.
 */
export const loginSchema = z.object({
  username: z
    .string()
    .min(3, { message: "El usuario debe tener al menos 3 caracteres." })
    .max(50, { message: "El usuario no puede exceder los 50 caracteres." })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        "El usuario solo puede contener letras, números y guiones bajos.",
    }),

  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Esquema de validación para el Registro.
 * @description Valida campos de registro incluyendo email, contraseña segura y confirmación.
 */
export const registerSchema = z
  .object({
    fullname: z
      .string()
      .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
      .max(100, { message: "El nombre no puede exceder los 100 caracteres." })
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
        message: "El nombre solo puede contener letras y espacios.",
      }),

    email: z
      .string()
      .email({ message: "Por favor ingresa un correo electrónico válido." })
      .min(5, { message: "El correo es demasiado corto." })
      .max(100, { message: "El correo no puede exceder los 100 caracteres." })
      .toLowerCase(),

    username: z
      .string()
      .min(3, { message: "El usuario debe tener al menos 3 caracteres." })
      .max(50, { message: "El usuario no puede exceder los 50 caracteres." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message:
          "El usuario solo puede contener letras, números y guiones bajos.",
      }),

    password: z
      .string()
      .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
      .regex(/[A-Z]/, {
        message: "La contraseña debe contener al menos una letra mayúscula.",
      })
      .regex(/[a-z]/, {
        message: "La contraseña debe contener al menos una letra minúscula.",
      })
      .regex(/[0-9]/, {
        message: "La contraseña debe contener al menos un número.",
      }),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Esquema de validación para código de verificación (2FA/OTP).
 * @description Valida el código de 6 dígitos para autenticación de dos factores.
 */
export const verificationSchema = z.object({
  code: z
    .string()
    .length(6, { message: "El código debe tener exactamente 6 dígitos." })
    .regex(/^[0-9]+$/, { message: "El código solo puede contener números." }),
});

export type VerificationFormData = z.infer<typeof verificationSchema>;

/**
 * Esquema de validación para Depósitos.
 * @description Valida el monto de depósito con límites mínimo y máximo.
 */
export const depositSchema = z.object({
  amount: z
    .number({
      required_error: "El monto es requerido.",
      invalid_type_error: "El monto debe ser un número.",
    })
    .positive({ message: "El monto debe ser mayor a cero." })
    .min(10, { message: "El monto mínimo de depósito es $10." })
    .max(1000000, { message: "El monto máximo de depósito es $1,000,000." }),
  method: z
    .enum(["tarjeta", "transferencia", "efectivo"], {
      errorMap: () => ({ message: "Selecciona un método de pago válido." }),
    })
    .optional(),
});

export type DepositFormData = z.infer<typeof depositSchema>;

/**
 * Esquema de validación para Retiros.
 * @description Valida el monto de retiro con límites y verificación contra balance disponible.
 */
export const withdrawalSchema = z.object({
  amount: z
    .number({
      required_error: "El monto es requerido.",
      invalid_type_error: "El monto debe ser un número.",
    })
    .positive({ message: "El monto debe ser mayor a cero." })
    .min(10, { message: "El monto mínimo de retiro es $10." }),
  method: z
    .enum(["tarjeta", "transferencia"], {
      errorMap: () => ({
        message: "Selecciona un método de retiro válido.",
      }),
    })
    .optional(),
});

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

/**
 * Esquema de validación para formulario de Contacto.
 * @description Valida los campos del formulario de soporte/contacto.
 */
export const contactSchema = z.object({
  name: z
    .string()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
    .max(100, { message: "El nombre no puede exceder los 100 caracteres." }),

  email: z
    .string()
    .email({ message: "Por favor ingresa un correo electrónico válido." })
    .toLowerCase(),

  subject: z
    .string()
    .min(5, { message: "El asunto debe tener al menos 5 caracteres." })
    .max(150, { message: "El asunto no puede exceder los 150 caracteres." })
    .optional(),

  message: z
    .string()
    .min(10, { message: "El mensaje debe tener al menos 10 caracteres." })
    .max(1000, { message: "El mensaje no puede exceder los 1000 caracteres." })
    .transform((val) => val.replace(/[<>]/g, "")), // Sanitización básica
});

export type ContactFormData = z.infer<typeof contactSchema>;

// ============================================================================
// VALIDACIONES DE AUTENTICACIÓN - ZOD SCHEMAS
// ============================================================================
// Define los esquemas de validación para login, registro y 2FA.
// Incluye reglas de seguridad para contraseñas y sanitización de inputs.
// ============================================================================

import { z } from "zod";

// ============================================================================
// REGEX Y CONSTANTES DE VALIDACIÓN
// ============================================================================

/**
 * Expresión regular para validar contraseñas seguras.
 * Requiere: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 especial.
 */
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

/**
 * Mensaje de error para contraseñas que no cumplen los requisitos.
 */
const PASSWORD_ERROR_MESSAGE =
  "La contraseña debe tener mínimo 8 caracteres, incluyendo: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (!@#$%^&*).";

/**
 * Expresión regular para validar formato de email.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// FUNCIONES DE SANITIZACIÓN
// ============================================================================

/**
 * Sanitiza un string eliminando caracteres peligrosos para prevenir inyecciones.
 * @param value - String a sanitizar
 * @returns String limpio sin caracteres peligrosos
 */
const sanitizeString = (value: string): string => {
  return value
    .trim()
    .replace(/[<>]/g, "") // Elimina < y > para prevenir XSS
    .replace(/['";]/g, ""); // Elimina comillas para prevenir SQL injection
};

/**
 * Sanitiza y normaliza un email.
 * @param email - Email a sanitizar
 * @returns Email en minúsculas y limpio
 */
const sanitizeEmail = (email: string): string => {
  return sanitizeString(email).toLowerCase();
};

// ============================================================================
// SCHEMA DE LOGIN
// ============================================================================

/**
 * Schema de validación para el formulario de inicio de sesión.
 * Valida email y contraseña con sanitización incluida.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo electrónico es requerido." })
    .email({ message: "Por favor ingresa un correo electrónico válido." })
    .regex(EMAIL_REGEX, { message: "El formato del correo no es válido." })
    .transform(sanitizeEmail),

  password: z
    .string()
    .min(1, { message: "La contraseña es requerida." })
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres." }),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// SCHEMA DE REGISTRO
// ============================================================================

/**
 * Schema de validación para el formulario de registro.
 * Incluye validación de contraseña segura y confirmación.
 */
export const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(1, { message: "El nombre es requerido." })
      .min(2, { message: "El nombre debe tener al menos 2 caracteres." })
      .max(50, { message: "El nombre no puede exceder 50 caracteres." })
      .transform(sanitizeString),

    paternalSurname: z
      .string()
      .min(1, { message: "El apellido paterno es requerido." })
      .min(2, { message: "El apellido debe tener al menos 2 caracteres." })
      .max(50, { message: "El apellido no puede exceder 50 caracteres." })
      .transform(sanitizeString),

    maternalSurname: z
      .string()
      .min(1, { message: "El apellido materno es requerido." })
      .min(2, { message: "El apellido debe tener al menos 2 caracteres." })
      .max(50, { message: "El apellido no puede exceder 50 caracteres." })
      .transform(sanitizeString),

    email: z
      .string()
      .min(1, { message: "El correo electrónico es requerido." })
      .email({ message: "Por favor ingresa un correo electrónico válido." })
      .regex(EMAIL_REGEX, { message: "El formato del correo no es válido." })
      .transform(sanitizeEmail),

    password: z
      .string()
      .min(1, { message: "La contraseña es requerida." })
      .regex(PASSWORD_REGEX, { message: PASSWORD_ERROR_MESSAGE }),

    confirmPassword: z.string().min(1, { message: "Confirma tu contraseña." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================================
// SCHEMA DE VERIFICACIÓN 2FA
// ============================================================================

/**
 * Schema de validación para el código de verificación 2FA.
 * Valida que sea un código de 6 dígitos numéricos.
 */
export const twoFactorSchema = z.object({
  code: z
    .string()
    .length(6, { message: "El código debe tener exactamente 6 dígitos." })
    .regex(/^\d{6}$/, { message: "El código solo puede contener números." }),
});

export type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

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

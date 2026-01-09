// ============================================================================
// SERVER ACTIONS DE AUTENTICACIÓN
// ============================================================================
// Acciones del servidor para registro de usuarios y verificación 2FA.
// Utiliza Prisma para persistencia y bcrypt para hashing seguro.
// ============================================================================

"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import type { RegisterFormData } from "@/lib/validations/auth";

// ============================================================================
// TIPOS DE RESPUESTA
// ============================================================================

/**
 * Respuesta estándar de las Server Actions.
 */
interface ActionResponse {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

/**
 * Datos de usuario sanitizados (sin información sensible).
 */
interface SanitizedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

// ============================================================================
// CONSTANTES DE SEGURIDAD
// ============================================================================

/**
 * Número de rondas de salt para bcrypt.
 * 12 es un buen balance entre seguridad y rendimiento.
 */
const BCRYPT_SALT_ROUNDS = 12;

// ============================================================================
// ACCIÓN: REGISTRAR USUARIO
// ============================================================================

/**
 * Registra un nuevo usuario en el sistema.
 * Valida los datos, verifica unicidad del email, hashea la contraseña
 * y crea el registro en la base de datos.
 *
 * @param formData - Datos del formulario de registro
 * @returns Resultado de la operación con mensaje y posibles errores
 */
export async function registerUser(
  formData: RegisterFormData
): Promise<ActionResponse & { user?: SanitizedUser }> {
  try {
    // ================================================================
    // PASO 1: Validación con Zod
    // ================================================================
    const validatedFields = registerSchema.safeParse(formData);

    if (!validatedFields.success) {
      // Extraer errores de validación por campo
      const fieldErrors: Record<string, string[]> = {};
      validatedFields.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(error.message);
      });

      return {
        success: false,
        message: "Por favor corrige los errores en el formulario.",
        errors: fieldErrors,
      };
    }

    const { email, password, firstName, paternalSurname, maternalSurname } =
      validatedFields.data;

    // ================================================================
    // PASO 2: Verificar si el email ya existe
    // ================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        message: "El usuario ya está registrado con este correo electrónico.",
        errors: {
          email: ["Este correo ya está en uso. ¿Olvidaste tu contraseña?"],
        },
      };
    }

    // ================================================================
    // PASO 3: Hashear contraseña con bcrypt
    // ================================================================
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // ================================================================
    // PASO 4: Crear usuario en la base de datos
    // ================================================================
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        paternalSurname,
        maternalSurname,
        // createdAt se establece automáticamente por Prisma
      },
    });

    console.log("✅ Usuario registrado exitosamente:", email);

    // ================================================================
    // PASO 5: Retornar usuario sanitizado (sin password)
    // ================================================================
    const sanitizedUser: SanitizedUser = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: `${newUser.paternalSurname} ${newUser.maternalSurname}`,
      createdAt: newUser.createdAt,
    };

    return {
      success: true,
      message: "¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.",
      user: sanitizedUser,
    };
  } catch (error) {
    console.error("❌ Error al registrar usuario:", error);

    return {
      success: false,
      message:
        "Ocurrió un error al crear la cuenta. Por favor intenta de nuevo.",
    };
  }
}

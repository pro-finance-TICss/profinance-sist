"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";
import bcrypt from "bcryptjs";

// ============================================================================
// ACCIONES DE PERFIL DE USUARIO
// ============================================================================

/**
 * Obtiene los datos detallados del perfil del usuario actual.
 */
export async function getUserProfile() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "No autorizado" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        paternalSurname: true,
        maternalSurname: true,
        email: true,
        totpEnabled: true,
        // No devolver información sensible como password o secretos
      },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error fetching profile:", error);
    return { success: false, message: "Error al obtener perfil" };
  }
}

// ============================================================================
// ACCIONES DE SEGURIDAD
// ============================================================================

interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  totpCode: string;
}

/**
 * Cambia la contraseña del usuario validando:
 * 1. TOTP correcto
 * 2. Contraseña actual correcta
 * 3. Nueva contraseña diferente a la actual
 */
export async function changePassword({
  currentPassword,
  newPassword,
  totpCode,
}: ChangePasswordParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: "No autorizado" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    // 1. Validar TOTP (Obligatorio para mayor seguridad)
    if (!user.totpSecret || !user.totpEnabled) {
      return {
        success: false,
        message: "Debes tener 2FA activado para cambiar tu contraseña.",
      };
    }

    const isValidTotp = verifyTotpToken(totpCode, user.totpSecret);
    if (!isValidTotp) {
      return { success: false, message: "Código de autenticación inválido." };
    }

    // 2. Validar contraseña actual
    const isPasswordCorrect = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordCorrect) {
      return { success: false, message: "La contraseña actual es incorrecta." };
    }

    // 3. Validar que la nueva contraseña no sea igual a la actual
    // Nota: Comparamos con el hash, si bcrypt.compare da true, son iguales
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        message: "La nueva contraseña no puede ser igual a la actual.",
      };
    }

    // 4. Actualizar contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    console.log(`🔐 Password changed for user: ${user.email}`);

    return {
      success: true,
      message: "Contraseña actualizada exitosamente.",
    };
  } catch (error) {
    console.error("Error changing password:", error);
    return {
      success: false,
      message: "Error al cambiar la contraseña. Intente nuevamente.",
    };
  }
}

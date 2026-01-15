"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/enums";
import bcrypt from "bcryptjs";

/**
 * Verifica si un usuario requiere completar la configuración de seguridad.
 * Retorna información sobre el estado de onboarding del usuario.
 */
export async function checkSecuritySetupStatus() {
  const session = await auth();
  if (!session?.user?.id) {
    return { requiresSetup: false, reason: "NOT_AUTHENTICATED" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      totpEnabled: true,
      mustChangePassword: true,
      email: true,
    },
  });

  if (!user) {
    return { requiresSetup: false, reason: "USER_NOT_FOUND" };
  }

  // Solo aplicar a ADMIN y SUPER_ADMIN
  const isPrivilegedUser =
    user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;

  if (!isPrivilegedUser) {
    return { requiresSetup: false, reason: "NOT_PRIVILEGED_USER" };
  }

  // Determinar qué pasos faltan
  const needsTotpSetup = !user.totpEnabled;
  const needsPasswordChange = user.mustChangePassword;

  // Si ambos están completos, no se requiere setup
  if (!needsTotpSetup && !needsPasswordChange) {
    return { requiresSetup: false, reason: "COMPLETE" };
  }

  return {
    requiresSetup: true,
    needsTotpSetup,
    needsPasswordChange,
    currentStep: needsTotpSetup ? 1 : 2, // Paso 1: TOTP, Paso 2: Contraseña
    totalSteps: 2,
  };
}

/**
 * Cambia la contraseña del usuario autenticado.
 * Valida la contraseña actual y actualiza a la nueva.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "No autorizado" };
  }

  // Validaciones básicas
  if (newPassword.length < 8) {
    return {
      success: false,
      message: "La nueva contraseña debe tener al menos 8 caracteres",
    };
  }

  // Requisitos de seguridad para la contraseña
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
    return {
      success: false,
      message:
        "La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user) {
      return { success: false, message: "Usuario no encontrado" };
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return { success: false, message: "La contraseña actual es incorrecta" };
    }

    // Verificar que la nueva contraseña sea diferente
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return {
        success: false,
        message: "La nueva contraseña debe ser diferente a la actual",
      };
    }

    // Hashear y actualizar
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false, // Marcar como completado
      },
    });

    return { success: true, message: "Contraseña actualizada correctamente" };
  } catch (error) {
    console.error("Error cambiando contraseña:", error);
    return { success: false, message: "Error al cambiar la contraseña" };
  }
}

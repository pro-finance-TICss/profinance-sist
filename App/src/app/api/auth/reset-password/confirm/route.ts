// ============================================================================
// API: Confirmar nuevo password después de verificación 2FA
// POST /api/auth/reset-password/confirm
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Datos incompletos" },
        { status: 400 }
      );
    }

    // Validar longitud mínima de contraseña
    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres",
        },
        { status: 400 }
      );
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que el token no ha expirado (15 minutos)
    // Nota: En producción real, usa una tabla PasswordReset separada
    const now = new Date();
    if (!user.lastFailedRecoveryAt || user.lastFailedRecoveryAt < now) {
      return NextResponse.json(
        {
          success: false,
          message: "Token expirado. Vuelve a intentar el proceso.",
        },
        { status: 401 }
      );
    }

    // Verificar que la nueva contraseña es diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          message: "La nueva contraseña debe ser diferente a la actual",
        },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña e invalidar token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        lastFailedRecoveryAt: null, // Limpiar token temporal
        tokenVersion: { increment: 1 }, // Invalidar sesiones activas
        mustChangePassword: false, // Si tenía cambio obligatorio, ya lo hizo
      },
    });

    // Revocar todos los dispositivos de confianza por seguridad
    await prisma.trustedDevice.deleteMany({
      where: { userId: user.id },
    });

    logger.debug(`✅ Contraseña reseteada para: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente",
    });
  } catch (error) {
    logger.error("Error en reset-password/confirm:", error);
    return NextResponse.json(
      { success: false, message: "Error del servidor" },
      { status: 500 }
    );
  }
}

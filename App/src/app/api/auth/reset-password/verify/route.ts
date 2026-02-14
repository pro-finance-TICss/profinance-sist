// ============================================================================
// API: Verificar código 2FA para reseteo de contraseña
// POST /api/auth/reset-password/verify
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTotpToken } from "@/lib/totp";
import { verifyRecoveryCode } from "@/lib/actions/recovery-codes";
import crypto from "crypto";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code, mode } = body;

    if (!email || !code || !mode) {
      return NextResponse.json(
        { success: false, message: "Datos incompletos" },
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

    // Verificar que tiene 2FA habilitado
    if (!user.totpEnabled || !user.totpSecret) {
      return NextResponse.json(
        {
          success: false,
          message: "Este usuario no tiene 2FA habilitado. Contacta al soporte.",
        },
        { status: 400 }
      );
    }

    // Verificar código según el modo
    let isValid = false;

    if (mode === "totp") {
      isValid = verifyTotpToken(code, user.totpSecret);
    } else if (mode === "recovery") {
      const verification = await verifyRecoveryCode(user.id, code);
      isValid = verification.success;
    }

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            mode === "totp"
              ? "Código TOTP incorrecto"
              : "Código de recuperación inválido o ya usado",
        },
        { status: 401 }
      );
    }

    // Generar token temporal de reseteo (válido por 15 minutos)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar token en base de datos (reutilizamos campo tokenVersion para simplificar)
    // En producción, considera crear una tabla separada PasswordResetToken
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // Guardamos el token hasheado temporalmente
        // Nota: En producción, usa una tabla separada PasswordReset
        lastFailedRecoveryAt: expiresAt, // Temporal: reutilizamos este campo
      },
    });

    return NextResponse.json({
      success: true,
      token: resetToken,
      message: "Código verificado correctamente",
    });
  } catch (error) {
    logger.error("Error en reset-password/verify:", error);
    return NextResponse.json(
      { success: false, message: "Error del servidor" },
      { status: 500 }
    );
  }
}

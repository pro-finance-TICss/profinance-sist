// ============================================================================
// API: Verificar Dispositivo Confiable Pre-Login
// POST /api/auth/check-trusted-device
// ============================================================================
// Verifica si el dispositivo actual es confiable para un usuario específico.
// Se usa antes del login para determinar si se puede omitir TOTP.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const TRUSTED_DEVICE_COOKIE_NAME = "pf_trusted_device";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { trusted: false, error: "Email requerido" },
        { status: 400 }
      );
    }

    // Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ trusted: false });
    }

    // Verificar cookie de dispositivo confiable
    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;

    if (!deviceToken) {
      return NextResponse.json({ trusted: false });
    }

    // Verificar si el token es válido para este usuario
    const trustedDevice = await prisma.trustedDevice.findFirst({
      where: {
        deviceToken,
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    if (!trustedDevice) {
      // Token inválido o expirado
      return NextResponse.json({ trusted: false });
    }

    // Dispositivo confiable encontrado - devolver el token
    return NextResponse.json({
      trusted: true,
      deviceToken,
    });
  } catch (error) {
    logger.error("Error en check-trusted-device:", error);
    return NextResponse.json(
      { trusted: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}

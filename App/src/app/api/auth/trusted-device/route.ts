// ============================================================================
// API: Gestión de Dispositivos de Confianza
// POST /api/auth/trusted-device - Crear dispositivo confiable
// DELETE /api/auth/trusted-device - Revocar dispositivo actual
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTrustedDevice } from "@/lib/trusted-device";
import { cookies } from "next/headers";
import { TRUSTED_DEVICE_COOKIE_NAME } from "@/lib/trusted-device";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST: Crear dispositivo de confianza después de verificación TOTP exitosa.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const userAgent = request.headers.get("user-agent");
    const result = await createTrustedDevice(session.user.id, userAgent);

    if (!result.success) {
      return NextResponse.json(
        { error: "Error creando dispositivo de confianza" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dispositivo marcado como confiable por 30 días",
    });
  } catch (error) {
    logger.error("Error en POST /api/auth/trusted-device:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * DELETE: Revocar dispositivo actual (cerrar sesión de este dispositivo).
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const deviceToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;

    if (deviceToken) {
      // Eliminar de base de datos
      await prisma.trustedDevice.deleteMany({
        where: {
          deviceToken,
          userId: session.user.id,
        },
      });

      // Eliminar cookie
      cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);
    }

    return NextResponse.json({
      success: true,
      message: "Confianza del dispositivo revocada",
    });
  } catch (error) {
    logger.error("Error en DELETE /api/auth/trusted-device:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

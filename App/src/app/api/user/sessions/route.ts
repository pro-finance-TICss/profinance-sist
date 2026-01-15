// ============================================================================
// API: Gestión de Sesiones/Dispositivos del Usuario
// GET /api/user/sessions - Listar sesiones activas
// DELETE /api/user/sessions - Cerrar sesión(es)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listTrustedDevices,
  revokeTrustedDevice,
  revokeAllTrustedDevices,
  TRUSTED_DEVICE_COOKIE_NAME,
} from "@/lib/trusted-device";
import { cookies } from "next/headers";

/**
 * GET: Lista todas las sesiones/dispositivos activos del usuario.
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const devices = await listTrustedDevices(session.user.id);

    // Identificar el dispositivo actual
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(TRUSTED_DEVICE_COOKIE_NAME)?.value;

    const devicesWithCurrent = devices.map(
      (device: {
        id: string;
        deviceName: string | null;
        lastUsedAt: Date;
        createdAt: Date;
        expiresAt: Date;
      }) => ({
        ...device,
        isCurrent: false, // No podemos comparar directamente, solo por token
      })
    );

    return NextResponse.json({
      success: true,
      devices: devicesWithCurrent,
      currentDeviceToken: currentToken ? true : false, // Solo indicar si existe
    });
  } catch (error) {
    console.error("Error en GET /api/user/sessions:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * DELETE: Cerrar sesión específica o todas las sesiones.
 * Body: { deviceId?: string, revokeAll?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { deviceId, revokeAll } = body;

    // Opción 1: Revocar todos los dispositivos
    if (revokeAll) {
      const count = await revokeAllTrustedDevices(session.user.id);

      // Eliminar cookie del dispositivo actual también
      const cookieStore = await cookies();
      cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);

      return NextResponse.json({
        success: true,
        message: `${count} sesiones cerradas`,
        count,
      });
    }

    // Opción 2: Revocar dispositivo específico
    if (deviceId) {
      const success = await revokeTrustedDevice(deviceId, session.user.id);

      if (!success) {
        return NextResponse.json(
          { error: "Dispositivo no encontrado" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Sesión cerrada",
      });
    }

    return NextResponse.json(
      { error: "Debe especificar deviceId o revokeAll" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en DELETE /api/user/sessions:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

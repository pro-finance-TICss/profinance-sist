// ============================================================================
// API: Gestión de Sesiones del Usuario
// GET /api/user/sessions - Listar sesiones activas
// DELETE /api/user/sessions - Cerrar sesión(es)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

const TRUSTED_DEVICE_COOKIE_NAME = "pf_trusted_device";

/**
 * GET: Lista todas las sesiones activas del usuario.
 */
export async function GET() {
  try {
    const authSession = await auth();

    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener sessionId del token actual
    const currentSessionId = authSession.user.sessionId;

    // Listar todas las sesiones activas del usuario
    const sessions = await prisma.session.findMany({
      where: {
        userId: authSession.user.id,
        expiresAt: { gt: new Date() }, // Solo sesiones no expiradas
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
        lastActiveAt: true,
      },
    });

    // Marcar cuál es la sesión actual
    const sessionsWithCurrent = sessions.map((session) => ({
      ...session,
      isCurrent: session.id === currentSessionId,
    }));

    return NextResponse.json({
      success: true,
      sessions: sessionsWithCurrent,
      count: sessions.length,
    });
  } catch (error) {
    logger.error("Error en GET /api/user/sessions:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

/**
 * DELETE: Cerrar sesión específica o todas las sesiones.
 * Body: { sessionId?: string, revokeAll?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const authSession = await auth();

    if (!authSession?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, revokeAll } = body;

    const currentSessionId = authSession.user.sessionId;

    // Opción 1: Revocar todas las sesiones
    if (revokeAll) {
      // Eliminar todas las sesiones del usuario
      const result = await prisma.session.deleteMany({
        where: { userId: authSession.user.id },
      });

      // También eliminar dispositivos de confianza
      await prisma.trustedDevice.deleteMany({
        where: { userId: authSession.user.id },
      });

      // Eliminar cookie del dispositivo actual
      const cookieStore = await cookies();
      cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);

      return NextResponse.json({
        success: true,
        message: `${result.count} sesiones cerradas`,
        count: result.count,
      });
    }

    // Opción 2: Revocar sesión específica
    if (sessionId) {
      // Verificar que la sesión pertenece al usuario
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: authSession.user.id,
        },
      });

      if (!session) {
        return NextResponse.json(
          { error: "Sesión no encontrada" },
          { status: 404 }
        );
      }

      // Eliminar la sesión
      await prisma.session.delete({
        where: { id: sessionId },
      });

      // Si es la sesión actual, también eliminamos la cookie de dispositivo confiable
      if (sessionId === currentSessionId) {
        const cookieStore = await cookies();
        cookieStore.delete(TRUSTED_DEVICE_COOKIE_NAME);
      }

      return NextResponse.json({
        success: true,
        message: "Sesión cerrada",
        isCurrent: sessionId === currentSessionId,
      });
    }

    return NextResponse.json(
      { error: "Debe especificar sessionId o revokeAll" },
      { status: 400 }
    );
  } catch (error) {
    logger.error("Error en DELETE /api/user/sessions:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

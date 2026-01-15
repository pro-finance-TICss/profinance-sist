// ============================================================================
// API: Verificar Validez de Sesión
// GET /api/auth/verify-session
// ============================================================================
// Verifica si la sesión actual sigue siendo válida (no ha sido revocada).
// Se puede llamar periódicamente desde el cliente o en cada navegación.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const authSession = await auth();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { valid: false, reason: "not_authenticated" },
        { status: 401 }
      );
    }

    // Obtener el sessionId del token (lo agregamos en auth.ts)
    // @ts-ignore - El campo existe en el token
    const sessionId = authSession.user.sessionId;

    if (!sessionId) {
      // Sesión legacy sin sessionId (creada antes de la migración)
      // Considerarla válida pero sugerir re-login
      return NextResponse.json({
        valid: true,
        legacy: true,
        message: "Sesión legacy, considera volver a iniciar sesión.",
      });
    }

    // Verificar que la sesión existe en la base de datos
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      // La sesión fue revocada
      return NextResponse.json(
        { valid: false, reason: "session_revoked" },
        { status: 401 }
      );
    }

    // Verificar que la sesión no ha expirado
    if (session.expiresAt < new Date()) {
      // Limpiar sesión expirada
      await prisma.session.delete({ where: { id: sessionId } });
      return NextResponse.json(
        { valid: false, reason: "session_expired" },
        { status: 401 }
      );
    }

    // Actualizar última actividad
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    return NextResponse.json({
      valid: true,
      sessionId,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Error en verify-session:", error);
    return NextResponse.json(
      { valid: false, reason: "server_error" },
      { status: 500 }
    );
  }
}

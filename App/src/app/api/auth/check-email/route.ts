import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// API: Verificar si un correo electrónico está registrado
// POST /api/auth/check-email
// ============================================================================

const emailSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar el formato del email
    const validation = emailSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { exists: false, error: "Correo electrónico inválido" },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true }, // Solo necesitamos saber si existe
    });

    // Nota de seguridad: En producción, podrías querer siempre devolver
    // la misma respuesta para evitar enumeración de usuarios.
    // Sin embargo, para la funcionalidad de recuperación con códigos,
    // necesitamos saber si el usuario existe.

    return NextResponse.json({
      exists: !!user,
    });
  } catch (error) {
    console.error("Error verificando email:", error);
    return NextResponse.json(
      { exists: false, error: "Error del servidor" },
      { status: 500 }
    );
  }
}

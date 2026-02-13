// ============================================================================
// RUTA API - ACTUALIZAR PREFERENCIA DE MONEDA DEL USUARIO
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { currency } = await req.json();

    // Validar que la moneda sea una de las soportadas
    const validCurrencies = ["USD", "COP", "EUR", "MXN", "GBP"];
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: "Moneda no válida" },
        { status: 400 }
      );
    }

    // Actualizar preferencia en la base de datos
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredCurrency: currency },
    });

    return NextResponse.json({
      success: true,
      currency,
    });
  } catch (error) {
    console.error("❌ Error al actualizar moneda:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

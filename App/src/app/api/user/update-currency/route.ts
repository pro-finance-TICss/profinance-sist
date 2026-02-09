// ============================================================================
// API ROUTE - UPDATE USER CURRENCY PREFERENCE
//============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currency } = await req.json();

    // Validar moneda
    const validCurrencies = ["USD", "COP", "EUR", "MXN", "GBP"];
    if (!validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: "Invalid currency" },
        { status: 400 }
      );
    }

    // Actualizar en base de datos
    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferredCurrency: currency },
    });

    return NextResponse.json({
      success: true,
      currency,
    });
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

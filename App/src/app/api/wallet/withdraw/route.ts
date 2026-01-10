// ============================================================================
// API ROUTE: CREATE WITHDRAWAL REQUEST - PRO-FINANCE
// ============================================================================
// Crea una solicitud de retiro que requiere aprobación administrativa.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withdrawalSchema } from "@/lib/validations/wallet";
import { decimalToNumber } from "@/lib/utils/currency";

/**
 * POST /api/wallet/withdraw
 * Crea una solicitud de retiro.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Parsear y validar el body
    const body = await req.json();
    const validation = withdrawalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount } = validation.data;

    // 3. Verificar que el usuario tenga balance suficiente
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { availableBalance: true, email: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const availableBalance = decimalToNumber(user.availableBalance);

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: "Balance insuficiente",
          message: `Tu balance disponible es $${availableBalance.toFixed(2)}`,
        },
        { status: 400 }
      );
    }

    // 4. Crear solicitud de retiro
    const withdrawalRequest = await prisma.withdrawalRequest.create({
      data: {
        userId: session.user.id,
        amount,
        status: "PENDING",
      },
    });

    console.log(`📤 Solicitud de retiro creada: $${amount} para ${user.email}`);

    // 5. TODO: Enviar notificación por email al departamento de finanzas
    // Aquí se integraría con un servicio de email (Resend, SendGrid, etc.)
    const financeEmail = process.env.FINANCE_DEPARTMENT_EMAIL;
    console.log(
      `📧 [SIMULADO] Email enviado a ${financeEmail}:`,
      `Usuario ${user.email} solicita retiro de $${amount}`
    );

    // 6. Retornar confirmación
    return NextResponse.json({
      success: true,
      message: "Solicitud de retiro enviada exitosamente",
      withdrawal: {
        id: withdrawalRequest.id,
        amount: decimalToNumber(withdrawalRequest.amount),
        status: withdrawalRequest.status,
        requestedAt: withdrawalRequest.requestedAt,
      },
    });
  } catch (error) {
    console.error("❌ Error creando solicitud de retiro:", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}

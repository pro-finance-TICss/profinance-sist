// ============================================================================
// API ROUTE: CREATE MERCADO PAGO PREFERENCE - PRO-FINANCE
// ============================================================================
// Crea una preferencia de pago en Mercado Pago para depósitos.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { depositSchema } from "@/lib/validations/wallet";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { logger } from "@/lib/logger";

// Inicializar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

/**
 * POST /api/mercadopago/create-preference
 * Crea una preferencia de pago.
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
    const validation = depositSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount } = validation.data;

    // 3. Crear preferencia en Mercado Pago
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [
          {
            id: "deposit",
            title: "Depósito de Capital - Pro-Finance",
            description: `Depósito de fondos a cuenta ${session.user.email}`,
            quantity: 1,
            unit_price: amount,
            currency_id: "COP", // Mercado Pago Colombia requiere COP.
          },
        ],
        back_urls: {
          success: `${process.env.NEXTAUTH_URL}/dashboard?deposit=success`,
          failure: `${process.env.NEXTAUTH_URL}/dashboard?deposit=failure`,
          pending: `${process.env.NEXTAUTH_URL}/dashboard?deposit=pending`,
        },
        auto_return: "approved",
        metadata: {
          user_id: session.user.id, // MP usa snake_case para metadata a veces, pero better safe
          type: "DEPOSIT",
        },
        // Información del pagador (opcional pero recomendada)
        payer: {
          email: session.user.email,
          name: session.user.name || "Usuario",
        },
      },
    });

    logger.debug("✅ Preferencia de MP creada:", result.id);

    // 4. Retornar URL de inicio de pago (init_point)
    // init_point es para producción, sandbox_init_point para pruebas
    const url =
      process.env.NODE_ENV === "production"
        ? result.init_point
        : result.sandbox_init_point;

    return NextResponse.json({
      preferenceId: result.id,
      url: url,
    });
  } catch (error: any) {
    logger.error("❌ Error creando preferencia de MP:", error);
    return NextResponse.json(
      { error: "Error al procesar el pago con Mercado Pago" },
      { status: 500 }
    );
  }
}

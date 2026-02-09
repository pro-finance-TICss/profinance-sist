// ============================================================================
// API ROUTE: MERCADO PAGO WEBHOOK - PRO-FINANCE
// ============================================================================
// Procesa notificaciones de Mercado Pago (payment, merchant_order).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Inicializar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

/**
 * POST /api/mercadopago/webhook
 * Procesa notificaciones de Mercado Pago.
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Mercado Pago envía el topic/type y el id en el query string o en el body
    // Ejemplo query: ?topic=payment&id=123456789
    const topic = searchParams.get("topic") || searchParams.get("type");
    const id = searchParams.get("id") || searchParams.get("data.id");

    console.log(`📨 Webhook MP recibido: Topic=${topic}, ID=${id}`);

    if (topic === "payment" && id) {
      // 1. Consultar el estado del pago en Mercado Pago
      const payment = new Payment(client);
      const paymentData = await payment.get({ id: id });

      console.log(`💰 Estado del pago ${id}: ${paymentData.status}`);

      // 2. Verificar estado aprobado
      if (paymentData.status === "approved") {
        const userId = paymentData.metadata?.user_id;
        const type = paymentData.metadata?.type;
        const transactionAmount = paymentData.transaction_amount;

        if (!userId || type !== "DEPOSIT") {
          console.error("❌ Metadata faltante o inválida en pago de MP");
          return NextResponse.json({ status: "ignored" });
        }

        // 3. Verificar si ya procesamos este pago
        const existingTx = await prisma.transaction.findUnique({
          where: { paymentId: String(id) },
        });

        if (existingTx) {
          console.log("⚠️ Transacción ya procesada previamente");
          return NextResponse.json({ status: "ok" });
        }

        // 4. Actualizar balance y crear transacción
        // Asumimos que transactionAmount viene en la moneda correcta del balance (ej. USD)
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: userId },
            data: {
              investedCapital: { increment: transactionAmount },
            },
          });

          await tx.transaction.create({
            data: {
              userId,
              type: "DEPOSIT",
              amount: transactionAmount || 0,
              status: "COMPLETED",
              paymentId: String(id), // Guardamos el ID de MP
            },
          });
        });

        console.log("✅ Balance actualizado exitosamente");
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Error procesando webhook MP:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

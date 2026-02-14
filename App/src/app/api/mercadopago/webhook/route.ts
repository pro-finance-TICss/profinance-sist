// ============================================================================
// RUTA API: WEBHOOK DE MERCADO PAGO - PRO-FINANCE
// ============================================================================
// Procesa notificaciones de Mercado Pago (payment, merchant_order).
// SEGURIDAD: Valida la firma HMAC del webhook antes de procesar.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Inicializar cliente de Mercado Pago con token de acceso
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

/**
 * Valida la firma HMAC del webhook de Mercado Pago.
 * Previene ataques de falsificación de webhooks.
 * @see https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks
 */
function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null
): boolean {
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // Si no hay secreto configurado, permitir en desarrollo pero advertir
  if (!webhookSecret) {
    console.warn(
      "⚠️ MERCADOPAGO_WEBHOOK_SECRET no configurado. " +
      "Omitiendo validación de firma (NO usar en producción)."
    );
    return process.env.NODE_ENV !== "production";
  }

  if (!xSignature || !xRequestId) {
    console.error("❌ Webhook sin firma X-Signature o X-Request-Id");
    return false;
  }

  // Extraer ts y v1 de la firma: "ts=xxx,v1=yyy"
  const parts: Record<string, string> = {};
  xSignature.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) parts[key.trim()] = value.trim();
  });

  const ts = parts["ts"];
  const receivedHash = parts["v1"];

  if (!ts || !receivedHash) {
    console.error("❌ Formato de firma inválido");
    return false;
  }

  // Construir el manifest para validación
  // Formato: "id:[dataId];request-id:[xRequestId];ts:[ts];"
  const manifest = `id:${dataId || ""};request-id:${xRequestId};ts:${ts};`;

  // Calcular HMAC SHA256
  const expectedHash = crypto
    .createHmac("sha256", webhookSecret)
    .update(manifest)
    .digest("hex");

  // Comparación segura contra ataques de timing
  return crypto.timingSafeEqual(
    Buffer.from(receivedHash),
    Buffer.from(expectedHash)
  );
}

/**
 * POST /api/mercadopago/webhook
 * Procesa notificaciones de Mercado Pago.
 */
export async function POST(req: NextRequest) {
  try {
    // ================================================================
    // 0. VALIDAR FIRMA DEL WEBHOOK (Seguridad anti-falsificación)
    // ================================================================
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");

    const url = new URL(req.url);
    const searchParams = url.searchParams;

    // Mercado Pago envía el topic/type y el id en el query string o en el body
    // Ejemplo query: ?topic=payment&id=123456789
    const topic = searchParams.get("topic") || searchParams.get("type");
    const id = searchParams.get("id") || searchParams.get("data.id");

    // Validar firma HMAC antes de procesar cualquier dato
    if (!validateWebhookSignature(xSignature, xRequestId, id)) {
      console.error("❌ Firma de webhook inválida - posible intento de falsificación");
      return NextResponse.json(
        { error: "Firma inválida" },
        { status: 403 }
      );
    }

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

        // 4. Actualizar balance de la primera cuenta del usuario y crear transacción
        // Nota: MercadoPago no envía accountId, así que usamos la primera cuenta por defecto
        await prisma.$transaction(async (tx) => {
          // Buscar primera cuenta del usuario
          const account = await tx.account.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          });

          if (!account) {
            console.error("❌ No se encontró cuenta para el usuario:", userId);
            throw new Error("Cuenta no encontrada");
          }

          // Incrementar balance de la cuenta
          await tx.account.update({
            where: { id: account.id },
            data: {
              investedCapital: { increment: transactionAmount },
            },
          });

          await tx.transaction.create({
            data: {
              userId,
              accountId: account.id,
              type: "DEPOSIT",
              amount: transactionAmount || 0,
              status: "COMPLETED",
              paymentId: String(id),
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

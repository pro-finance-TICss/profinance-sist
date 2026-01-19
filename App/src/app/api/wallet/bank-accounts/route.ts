// ============================================================================
// RUTA API: CUENTAS BANCARIAS - PRO-FINANCE
// ============================================================================
// CRUD de cuentas bancarias para retiros.
// GET: Lista las cuentas del usuario autenticado.
// POST: Crea una nueva cuenta bancaria.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bankAccountSchema } from "@/lib/validations/wallet";
import { encryptAccountNumber } from "@/lib/utils/encryption";
import { getBankByCode } from "@/lib/data/banks";

// ============================================================================
// GET - LISTAR CUENTAS BANCARIAS
// ============================================================================

/**
 * GET /api/wallet/bank-accounts
 * Lista todas las cuentas bancarias activas del usuario.
 */
export async function GET() {
  try {
    // 1. Verificar autenticación
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener cuentas activas del usuario
    const accounts = await prisma.bankAccount.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: [
        { isDefault: "desc" }, // Predeterminada primero
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        holderName: true,
        documentType: true,
        documentNumber: true,
        country: true,
        bankCode: true,
        bankName: true,
        accountNumberLast4: true,
        accountType: true,
        isDefault: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("❌ Error obteniendo cuentas bancarias:", error);
    return NextResponse.json(
      { error: "Error al obtener cuentas bancarias" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - CREAR CUENTA BANCARIA
// ============================================================================

/**
 * POST /api/wallet/bank-accounts
 * Crea una nueva cuenta bancaria para el usuario.
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
    const validation = bankAccountSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 3. Validar que el banco existe
    const bank = getBankByCode(data.bankCode, data.country);
    if (!bank) {
      return NextResponse.json(
        { error: "Banco no válido para el país seleccionado" },
        { status: 400 }
      );
    }

    // 4. Encriptar número de cuenta
    const { encrypted, last4 } = encryptAccountNumber(data.accountNumber);

    // 5. Verificar límite de cuentas (máximo 5 por usuario)
    const accountCount = await prisma.bankAccount.count({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (accountCount >= 5) {
      return NextResponse.json(
        { error: "Has alcanzado el límite máximo de 5 cuentas bancarias" },
        { status: 400 }
      );
    }

    // 6. Si es predeterminada, quitar predeterminado de otras
    if (data.isDefault) {
      await prisma.bankAccount.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // 7. Crear cuenta bancaria
    const account = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        holderName: data.holderName,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        country: data.country,
        bankCode: data.bankCode,
        bankName: bank.name,
        accountNumberEncrypted: encrypted,
        accountNumberLast4: last4,
        accountType: data.accountType,
        isDefault: data.isDefault || accountCount === 0, // Si es la primera, es predeterminada
      },
    });

    // 8. Crear notificación al usuario
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: "Cuenta bancaria agregada",
        message: `Se agregó la cuenta ${bank.name} terminada en ****${last4} para tus retiros.`,
        type: "SUCCESS",
      },
    });

    console.log(
      `✅ Cuenta bancaria creada: ${bank.name} ****${last4} para usuario ${session.user.id}`
    );

    return NextResponse.json({
      success: true,
      message: "Cuenta bancaria agregada exitosamente",
      account: {
        id: account.id,
        holderName: account.holderName,
        bankName: account.bankName,
        accountNumberLast4: account.accountNumberLast4,
        accountType: account.accountType,
        isDefault: account.isDefault,
      },
    });
  } catch (error) {
    console.error("❌ Error creando cuenta bancaria:", error);
    return NextResponse.json(
      { error: "Error al crear cuenta bancaria" },
      { status: 500 }
    );
  }
}

// ============================================================================
// API ROUTE: GET ACCOUNTS (ADAPTER PATTERN) - PRO-FINANCE
// ============================================================================
// RESPONSABILIDAD:
// Mapear User → Account[] virtual SIN modificar el schema de Prisma.
// 
// ARQUITECTURA:
// - HOY: 1 usuario → 3 cuentas virtuales (derivada de User para simulación)
// - FUTURO: 1 usuario → N cuentas reales (tabla Account en DB)
// 
// GARANTÍAS:
// - IDs deterministas (personal_${userId}, socio_${userId}, etc.)
// - No modifica DB
// - No rompe scripts existentes (lee availableBalance e investedCapital)
// - Compatible con AccountContext
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Tipo de cuenta del usuario (debe coincidir con AccountContext)
 */
type AccountRole = "USER" | "SOCIO";

/**
 * Interfaz de cuenta virtual (Actualizada para soportar balances reales)
 */
interface VirtualAccount {
    id: string;
    name: string;
    userId: string;
    role: AccountRole;
    balance: number;          // Saldo disponible (availableBalance)
    investedCapital: number;   // Capital invertido (investedCapital)
    createdAt: string;
}

/**
 * GET /api/accounts
 * * Retorna las cuentas del usuario autenticado.
 * * IMPLEMENTACIÓN ACTUAL (Adapter Pattern - Prueba de Carlos):
 * - Lee datos reales del modelo User (incluyendo balances de los scripts)
 * - Crea 3 "cuentas virtuales" para simular diferentes inversiones
 * - Permite probar el selector de cuentas y los roles USER/SOCIO
 */
export async function GET(req: NextRequest) {
    try {
        // ================================================================
        // 1. VERIFICAR AUTENTICACIÓN
        // ================================================================
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // ================================================================
        // 2. OBTENER DATOS DEL USUARIO
        // ================================================================
        // Incluimos los campos que el script add_balance.js modifica
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                paternalSurname: true,
                role: true,
                createdAt: true,
                availableBalance: true, // Campo real de la DB
                investedCapital: true,  // Campo real de la DB
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        // ================================================================
        // 3. ADAPTER: Lógica de Transformación (Prueba Multicuenta de Carlos)
        // ================================================================

        // Convertimos los Decimal de Prisma a Number para el Frontend
        const realAvailable = user.availableBalance ? Number(user.availableBalance.toString()) : 0;
        const realInvested = user.investedCapital ? Number(user.investedCapital.toString()) : 0;

        // MAPEO DETERMINISTA:
        // Creamos 3 contextos de inversión para el mismo usuario humano (Carlos)
        const virtualAccounts: VirtualAccount[] = [
            {
                id: `personal_a_${user.id}`,
                name: `Cuenta Normal A`,
                userId: user.id,
                role: "USER",
                balance: 10000,           // Inversión simulada de 10k
                investedCapital: 500,
                createdAt: user.createdAt.toISOString(),
            },
            {
                id: `personal_b_${user.id}`,
                name: `Cuenta Normal B`,
                userId: user.id,
                role: "USER",
                balance: 10000,           // Inversión simulada de 10k
                investedCapital: 500,
                createdAt: user.createdAt.toISOString(),
            },
            {
                id: `socio_${user.id}`,
                name: `Cuenta Socio Premium`,
                userId: user.id,
                role: "SOCIO",
                balance: realAvailable,   // <--- AQUÍ SE REFLEJA EL SCRIPT add_balance.js
                investedCapital: realInvested, // <--- AQUÍ SE REFLEJA EL SCRIPT add_balance.js
                createdAt: user.createdAt.toISOString(),
            },
        ];

        console.log(
            `✅ Prueba de Carlos: Cuentas generadas para ${user.email}. ` +
            `La cuenta Socio usa datos reales de la DB (Balance: ${realAvailable}).`
        );

        return NextResponse.json(virtualAccounts);

        // ================================================================
        // MIGRACIÓN FUTURA (cuando exista tabla Account):
        // ================================================================
        // const accounts = await prisma.account.findMany({
        //   where: { userId: session.user.id },
        //   select: {
        //     id: true,
        //     name: true,
        //     userId: true,
        //     role: true,
        //     balance: true,
        //     investedCapital: true,
        //     createdAt: true,
        //   },
        // });
        // return NextResponse.json(accounts);
        // ================================================================

    } catch (error) {
        console.error("❌ Error obteniendo cuentas:", error);
        return NextResponse.json(
            { error: "Error al obtener cuentas" },
            { status: 500 }
        );
    }
}
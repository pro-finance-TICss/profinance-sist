// ============================================================================
// API ROUTE: GET ACCOUNTS (ADAPTER PATTERN) - PRO-FINANCE
// ============================================================================
// RESPONSABILIDAD:
// Mapear User → Account[] virtual SIN modificar el schema de Prisma.
// 
// ARQUITECTURA:
// - HOY: 1 usuario → 1 cuenta virtual (derivada de User)
// - FUTURO: 1 usuario → N cuentas reales (tabla Account en DB)
// 
// GARANTÍAS:
// - IDs deterministas (main_${userId})
// - No modifica DB
// - No rompe scripts existentes
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
 * Interfaz de cuenta virtual (debe coincidir con AccountContext)
 */
interface VirtualAccount {
    id: string;
    name: string;
    userId: string;
    role: AccountRole;
    createdAt: string;
}

/**
 * GET /api/accounts
 * 
 * Retorna las cuentas del usuario autenticado.
 * 
 * IMPLEMENTACIÓN ACTUAL (Adapter Pattern):
 * - Lee datos del modelo User
 * - Crea una "cuenta virtual" a partir del usuario
 * - Retorna array de 1 elemento
 * 
 * IMPLEMENTACIÓN FUTURA (cuando exista tabla Account):
 * - Leer directamente de prisma.account.findMany()
 * - Retornar cuentas reales del usuario
 * - NO requiere cambios en el frontend
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
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                firstName: true,
                paternalSurname: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            );
        }

        // ================================================================
        // 3. ADAPTER: Crear cuenta virtual a partir del User
        // ================================================================

        // MAPEO DETERMINISTA (NO NEGOCIABLE)
        // - ID: main_${userId} (siempre el mismo para el mismo usuario)
        // - Garantiza compatibilidad con localStorage.activeAccountId
        const accountId = `main_${user.id}`;

        // Derivar nombre de cuenta según el rol
        const accountName = user.role === "SOCIO"
            ? `Cuenta Socio - ${user.firstName} ${user.paternalSurname}`
            : `Cuenta Personal - ${user.firstName} ${user.paternalSurname}`;

        // Normalizar rol (solo USER o SOCIO son válidos para Account)
        const accountRole: AccountRole =
            user.role === "SOCIO" ? "SOCIO" : "USER";

        // Crear objeto de cuenta virtual
        const virtualAccounts = [
            {
                id: `personal_${user.id}`,
                name: `Cuenta Personal`,
                userId: user.id,
                role: "USER",
                createdAt: user.createdAt.toISOString(),
            },
            {
                id: `socio_${user.id}`,
                name: `Cuenta Socio`,
                userId: user.id,
                role: "SOCIO",
                createdAt: user.createdAt.toISOString(),
            },
            {
                id: `ahorros_${user.id}`,
                name: `Cuenta Ahorros`,
                userId: user.id,
                role: "USER",
                createdAt: user.createdAt.toISOString(),
            },
        ];


        console.log(
            `✅ Cuentas virtuales generadas para ${user.email}:`,
            virtualAccounts
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
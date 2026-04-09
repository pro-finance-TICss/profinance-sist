// ============================================================================
// API ROUTE: GET REFERRALS - PRO-FINANCE
// ============================================================================
// Retorna el código de referido del usuario, estadísticas y lista de referidos.
// Esta ruta es global al usuario — no depende de la cuenta activa.
// ============================================================================

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReferralLink } from "@/lib/utils/site-url";
import { logger } from "@/lib/logger";

/**
 * GET /api/referrals
 * Retorna el código de referido, stats y lista de referidos del usuario.
 */
export async function GET() {
    try {
        // 1. Verificar autenticación
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const userId = session.user.id;

        // 2. Obtener datos del usuario (referralCode)
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { referralCode: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
        }

        // 3. Obtener todos los referidos con sus recompensas
        const referrals = await prisma.referral.findMany({
            where: { referrerId: userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                referredId: true,
                status: true,
                createdAt: true,
                activatedAt: true,
                rewards: {
                    select: {
                        amount: true,
                        currency: true,
                        status: true,
                    },
                },
            },
        });

        // 4. Calcular estadísticas
        const totalReferrals = referrals.length;
        const activeReferrals = referrals.filter((r) => r.status === "ACTIVE").length;
        const totalEarnings = referrals.reduce((sum, r) => {
            const credited = r.rewards
                .filter((rw) => rw.status === "CREDITED")
                .reduce((s, rw) => s + Number(rw.amount), 0);
            return sum + credited;
        }, 0);

        // 5. Formatear lista de referidos para el frontend
        const referralList = referrals.map((r) => ({
            id: r.id,
            referredId: r.referredId,
            status: r.status,
            createdAt: r.createdAt.toISOString(),
            activatedAt: r.activatedAt?.toISOString() ?? null,
            totalRewards: r.rewards
                .filter((rw) => rw.status === "CREDITED")
                .reduce((s, rw) => s + Number(rw.amount), 0),
            currency: r.rewards[0]?.currency ?? null,
        }));

        // 6. Construir el link de referido usando la URL de producción correcta
        const referralLink = user.referralCode
            ? buildReferralLink(user.referralCode)
            : null;

        return NextResponse.json({
            referralCode: user.referralCode,
            referralLink,
            stats: {
                total: totalReferrals,
                active: activeReferrals,
                totalEarnings,
            },
            referrals: referralList,
        });
    } catch (error) {
        logger.error("❌ Error obteniendo referidos:", error);
        return NextResponse.json(
            { error: "Error al obtener referidos" },
            { status: 500 }
        );
    }
}

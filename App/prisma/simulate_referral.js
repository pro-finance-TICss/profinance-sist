/**
 * SCRIPT: SIMULAR COMISIÓN DE REFERIDO (E2E TESTING)
 *
 * DESCRIPCIÓN:
 * Busca la primera transacción DEPOSIT+COMPLETED del usuario referido
 * y ejecuta la lógica de comisión de referido directamente.
 *
 * USO:
 *   node prisma/simulate_referral.js <email_del_referido>
 *
 * EJEMPLO:
 *   node prisma/simulate_referral.js usuariob@test.com
 *
 * PREREQUISITOS:
 * 1. Usuario B debe estar registrado con el link de referido de Usuario A
 * 2. Usuario B debe tener al menos una transacción DEPOSIT+COMPLETED
 *    (usar: node prisma/add_balance.js usuariob@test.com 100000)
 *    NOTA: add_balance.js solo actualiza investedCapital, no crea transacciones.
 *    Para crear una transacción real, usar el script create_investment.js
 *    o insertar directamente en la DB (ver instrucciones abajo).
 */

const { PrismaClient, Prisma } = require("@prisma/client");
const prisma = new PrismaClient();

// Porcentaje de comisión (debe coincidir con referral.service.ts)
const COMMISSION_PERCENTAGE = new Prisma.Decimal("0.05");

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error("❌ Error: Debes proporcionar el email del usuario referido.");
        console.log("Uso: node prisma/simulate_referral.js <email>");
        process.exit(1);
    }

    console.log(`\n🔍 Buscando usuario referido: ${email}...`);

    // 1. Buscar usuario referido
    const referredUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, firstName: true, paternalSurname: true },
    });

    if (!referredUser) {
        console.error(`❌ Usuario "${email}" no encontrado.`);
        process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${referredUser.firstName} ${referredUser.paternalSurname} (${referredUser.id})`);

    // 2. Verificar que el usuario fue referido
    const referral = await prisma.referral.findUnique({
        where: { referredId: referredUser.id },
        include: {
            referrer: { select: { id: true, email: true, firstName: true, baseCurrency: true } },
        },
    });

    if (!referral) {
        console.error(`❌ El usuario "${email}" no fue referido por nadie.`);
        console.log("   Asegúrate de que se registró usando un link de referido válido.");
        process.exit(1);
    }

    console.log(`✅ Referido por: ${referral.referrer.firstName} (${referral.referrer.email})`);
    console.log(`   Estado actual del referido: ${referral.status}`);

    // 3. Buscar primera transacción DEPOSIT+COMPLETED del referido
    const sourceTx = await prisma.transaction.findFirst({
        where: {
            userId: referredUser.id,
            type: "DEPOSIT",
            status: "COMPLETED",
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, amount: true, createdAt: true },
    });

    if (!sourceTx) {
        console.error(`❌ El usuario "${email}" no tiene transacciones DEPOSIT+COMPLETED.`);
        console.log("\n   Para crear una transacción de prueba, ejecuta:");
        console.log(`   node prisma/create_investment.js ${email} 100000`);
        console.log("\n   O inserta directamente en la DB:");
        console.log(`   node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.transaction.create({data:{userId:'${referredUser.id}',type:'DEPOSIT',status:'COMPLETED',amount:100000}}).then(t=>console.log('TX creada:',t.id)).finally(()=>p.$disconnect())"`);
        process.exit(1);
    }

    console.log(`\n💰 Transacción fuente encontrada:`);
    console.log(`   ID: ${sourceTx.id}`);
    console.log(`   Monto: $${sourceTx.amount}`);
    console.log(`   Fecha: ${sourceTx.createdAt.toLocaleDateString("es-ES")}`);

    // 4. Verificar idempotencia
    const existingReward = await prisma.referralReward.findUnique({
        where: { sourceTransactionId: sourceTx.id },
    });

    if (existingReward) {
        console.log(`\n⚠️  Esta transacción ya generó una comisión:`);
        console.log(`   ReferralReward ID: ${existingReward.id}`);
        console.log(`   Monto: $${existingReward.amount} ${existingReward.currency}`);
        console.log(`   Estado: ${existingReward.status}`);
        console.log("\n   Para probar de nuevo, usa una transacción diferente.");
        process.exit(0);
    }

    // 5. Obtener cuenta destino del referrer
    const rewardAccount = await prisma.account.findFirst({
        where: { userId: referral.referrerId, isDefaultReward: true },
        select: { id: true, name: true, investedCapital: true },
    }) ?? await prisma.account.findFirst({
        where: { userId: referral.referrerId },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, investedCapital: true },
    });

    if (!rewardAccount) {
        console.error(`❌ El referrer ${referral.referrer.email} no tiene cuentas.`);
        process.exit(1);
    }

    const commissionAmount = new Prisma.Decimal(sourceTx.amount).mul(COMMISSION_PERCENTAGE);
    const currency = referral.referrer.baseCurrency || "COP";

    console.log(`\n📊 Calculando comisión:`);
    console.log(`   Monto inversión: $${sourceTx.amount}`);
    console.log(`   Porcentaje: 5%`);
    console.log(`   Comisión: $${commissionAmount} ${currency}`);
    console.log(`   Cuenta destino: "${rewardAccount.name}" (${rewardAccount.id})`);
    console.log(`   Balance actual: $${rewardAccount.investedCapital}`);

    // 6. Ejecutar operaciones atómicas
    console.log(`\n⚡ Procesando comisión...`);

    const result = await prisma.$transaction(async (tx) => {
        // Crear transacción COMMISSION
        const commissionTx = await tx.transaction.create({
            data: {
                userId: referral.referrerId,
                accountId: rewardAccount.id,
                type: "COMMISSION",
                amount: commissionAmount,
                status: "COMPLETED",
            },
        });

        // Crear ReferralReward
        await tx.referralReward.create({
            data: {
                referralId: referral.id,
                sourceTransactionId: sourceTx.id,
                creditedAccountId: rewardAccount.id,
                rewardTransactionId: commissionTx.id,
                amount: commissionAmount,
                percentageApplied: COMMISSION_PERCENTAGE,
                currency,
                status: "CREDITED",
            },
        });

        // Incrementar balance
        const updatedAccount = await tx.account.update({
            where: { id: rewardAccount.id },
            data: { investedCapital: { increment: commissionAmount } },
            select: { investedCapital: true },
        });

        // Activar referido si estaba PENDING
        const wasActivated = referral.status === "PENDING";
        if (wasActivated) {
            await tx.referral.update({
                where: { id: referral.id },
                data: { status: "ACTIVE", activatedAt: new Date() },
            });
        }

        return { commissionTxId: commissionTx.id, wasActivated, newBalance: updatedAccount.investedCapital };
    });

    console.log(`\n✅ ¡Comisión procesada exitosamente!`);
    console.log(`   Transacción COMMISSION: ${result.commissionTxId}`);
    console.log(`   Comisión acreditada: $${commissionAmount} ${currency}`);
    console.log(`   Nuevo balance de "${rewardAccount.name}": $${result.newBalance}`);
    if (result.wasActivated) {
        console.log(`   🎉 Referido activado: PENDING → ACTIVE`);
    }
    console.log(`\n   Verifica en el dashboard de ${referral.referrer.email}:`);
    console.log(`   → /dashboard/referidos (tabla de referidos)`);
    console.log(`   → /dashboard/transacciones (transacción COMMISSION)`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error("\n❌ Error:", e.message);
        await prisma.$disconnect();
        process.exit(1);
    });

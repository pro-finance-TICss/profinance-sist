const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const amount = parseFloat(process.argv[3]);

    if (!email || !amount) {
        console.log('❌ Uso: node prisma/create_test_investment.js <email> <monto>');
        process.exit(1);
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
    });

    if (!user || user.accounts.length === 0) {
        console.log('❌ Usuario no encontrado o no tiene cajitas.');
        process.exit(1);
    }

    // Creamos la transacción que el sistema de referidos necesita ver
    const transaction = await prisma.transaction.create({
        data: {
            userId: user.id,
            accountId: user.accounts[0].id,
            type: 'DEPOSIT',
            amount: amount,
            status: 'COMPLETED', // ESTO ES LO QUE BUSCA EL SCRIPT DE SIMULACIÓN
        }
    });

    // También actualizamos el capital de la cuenta para que sea real
    await prisma.account.update({
        where: { id: user.accounts[0].id },
        data: {
            investedCapital: { increment: amount }
        }
    });

    console.log(`✅ Inversión de $${amount} creada exitosamente para ${email}`);
    console.log(`📝 ID de Transacción: ${transaction.id}`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
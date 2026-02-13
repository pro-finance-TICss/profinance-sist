/**
 * SCRIPT: AGREGAR SALDO DE PRUEBA
 * * DESCRIPCIÓN:
 * Busca un usuario por email y le asigna capital e inversión.
 * Integración Híbrida: Flexibilidad de Main + Integridad de Datos de Rama10.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Captura de email desde terminal (Arquitectura de Main)
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Error: Debes proporcionar un correo electrónico.");
    console.log("Uso: node prisma/add_balance.js <correo>");
    process.exit(1);
  }

  console.log(`Buscando usuario con correo "${email}"...`);

  const user = await prisma.user.findUnique({
    where: { email: email },
  });

  if (!user) {
    console.error(`❌ Usuario con correo ${email} no encontrado.`);
    return;
  }

  console.log(`Usuario encontrado: ${user.firstName} ${user.paternalSurname} (${user.id})`);

  // Actualización de Balance: Garantizamos consistencia de la Fase 4
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      // Usamos el monto de Main pero mantenemos la estructura completa de Rama10
      investedCapital: 50000,
      availableBalance: 15000,
    },
  });

  console.log(`✅ Balance actualizado para el usuario ${user.email}:`);
  const currency = updated.baseCurrency || "COP";
  console.log(`   - Capital Invertido: $${updated.investedCapital} ${currency}`);
  console.log(`   - Saldo Disponible: $${updated.availableBalance} ${currency}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

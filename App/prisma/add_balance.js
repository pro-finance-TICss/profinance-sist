/**
 * SCRIPT: AGREGAR SALDO DE PRUEBA
 *
 * DESCRIPCIÓN:
 * Busca un usuario de prueba específico ("Prueba Prueba Prueba") y le asigna
 * capital invertido y saldo disponible para pruebas de interfaz.
 *
 * USO:
 * node prisma/add_balance.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for user "ko ko ko"...');
  const user = await prisma.user.findFirst({
    where: {
      firstName: "ko",
      paternalSurname: "ko",
      maternalSurname: "ko",
    },
  });

  console.log(`Usuario encontrado: ${user.email} (${user.id})`);

  // Actualizar los valores en la base de datos
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      investedCapital: 100,
      availableBalance: 50,
    },
  });

  console.log(`✅ Saldo actualizado para el usuario ${user.email}:`);
  console.log(`   - Capital Invertido: $${updated.investedCapital}`);
  console.log(`   - Saldo Disponible: $${updated.availableBalance}`);
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

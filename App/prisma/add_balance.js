/**
 * SCRIPT: AGREGAR SALDO DE PRUEBA
 *
 * DESCRIPCIÓN:
 * Busca un usuario de prueba específico y le asigna
 * capital invertido y saldo disponible para pruebas de interfaz.
 *
 * USO:
 * node prisma/add_balance.js <correo>
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Error: Debes proporcionar un correo electrónico.");
    console.log("Uso: node prisma/add_balance.js <correo>");
    process.exit(1);
  }

  console.log(`Buscando usuario con correo "${email}"...`);
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    console.error(`❌ Usuario con correo ${email} no encontrado.`);
    return;
  }

  console.log(`Usuario encontrado: ${user.firstName} ${user.paternalSurname} (${user.id})`);

  // Actualizar los valores en la base de datos
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      investedCapital: 50000,
      availableBalance: 15000,
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

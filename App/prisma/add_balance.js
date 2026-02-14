/**
 * SCRIPT: AGREGAR SALDO DE PRUEBA
 * DESCRIPCIÓN:
 * Busca un usuario por email y actualiza el balance de su primera cuenta.
 * Si no tiene cuentas, crea una cuenta por defecto "Mi Cuenta".
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const amount = parseFloat(process.argv[3]) || 50000;

  if (!email) {
    console.error("❌ Error: Debes proporcionar un correo electrónico.");
    console.log("Uso: node prisma/add_balance.js <correo> [monto]");
    console.log("Ejemplo: node prisma/add_balance.js user@test.com 50000");
    process.exit(1);
  }

  console.log(`Buscando usuario con correo "${email}"...`);

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, firstName: true, paternalSurname: true, baseCurrency: true },
  });

  if (!user) {
    console.error(`❌ Usuario con correo ${email} no encontrado.`);
    return;
  }

  console.log(`Usuario encontrado: ${user.firstName} ${user.paternalSurname} (${user.id})`);

  // Buscar primera cuenta del usuario
  let account = await prisma.account.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  // Si no tiene cuentas, crear una por defecto
  if (!account) {
    console.log("⚠️ No se encontraron cuentas, creando cuenta por defecto...");
    account = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Mi Cuenta",
        role: "USER",
        investedCapital: 0,
      },
    });
    console.log(`✅ Cuenta "${account.name}" creada con ID: ${account.id}`);
  }

  // Actualizar balance de la cuenta
  const updated = await prisma.account.update({
    where: { id: account.id },
    data: { investedCapital: amount },
  });

  const currency = user.baseCurrency || "COP";
  console.log(`✅ Balance actualizado para cuenta "${updated.name}" (${updated.id}):`);
  console.log(`   - Capital Invertido: $${updated.investedCapital} ${currency}`);
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

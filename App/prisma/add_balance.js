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
  const accountIndex = parseInt(process.argv[4]) || 0; // Índice de la cuenta (opcional, default 0)

  if (!email) {
    console.error("❌ Error: Debes proporcionar un correo electrónico.");
    console.log("Uso: node prisma/add_balance.js <correo> [monto] [indice_cuenta]");
    console.log("Ejemplo: node prisma/add_balance.js user@test.com 50000 1");
    process.exit(1);
  }

  console.log(`Buscando usuario con correo "${email}"...`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!user) {
    console.error(`❌ Usuario con correo ${email} no encontrado.`);
    return;
  }

  console.log(`Usuario encontrado: ${user.firstName} ${user.paternalSurname} (${user.id})`);
  console.log(`Cuentas encontradas: ${user.accounts.length}`);

  if (user.accounts.length === 0) {
    console.log("⚠️ No se encontraron cuentas, creando cuenta por defecto...");
    const newAccount = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Mi Cuenta",
        role: "USER",
        investedCapital: amount,
      },
    });
    console.log(`✅ Cuenta "${newAccount.name}" creada con ID: ${newAccount.id} y saldo: ${amount}`);
    return;
  }

  // Listar cuentas disponibles
  user.accounts.forEach((acc, idx) => {
    console.log(`[${idx}] ${acc.name} - Rol: ${acc.role} - ID: ${acc.id}`);
  });

  if (accountIndex < 0 || accountIndex >= user.accounts.length) {
    console.error(`❌ Índice de cuenta inválido: ${accountIndex}. Seleccione entre 0 y ${user.accounts.length - 1}`);
    return;
  }

  const account = user.accounts[accountIndex];
  console.log(`\nSeleccionando cuenta [${accountIndex}]: ${account.name} (${account.id})...`);

  // Actualizar balance de la cuenta seleccionada
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

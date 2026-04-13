/**
 * BACKFILL: Tipos de cuenta
 * ─────────────────────────────────────────────────────────────────────────────
 * Este script realiza la migración de datos para el nuevo sistema de tipos de cuenta:
 *
 *   1. Marca TODAS las cuentas existentes como tipo "INVESTMENT"
 *      (son cuentas de inversión creadas antes de este cambio).
 *
 *   2. Para cada usuario que NO tenga ya una cuenta de tipo "SAVINGS",
 *      crea automáticamente una cuenta de Ahorro ("Mi Cuenta de Ahorro").
 *
 * Ejecutar DESPUÉS de `prisma db push` o de la migración correspondiente.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Iniciando backfill de tipos de cuenta...\n");

  // ── PASO 1: Marcar todas las cuentas existentes como INVESTMENT ─────────────
  const { count: updatedCount } = await prisma.account.updateMany({
    where: {
      // Solo actualizar las que aún tienen el valor default "SAVINGS"
      // (es decir, las que acaban de recibir el campo por la migración)
      type: "SAVINGS",
    },
    data: {
      type: "INVESTMENT",
    },
  });

  console.log(`✅ ${updatedCount} cuentas existentes marcadas como INVESTMENT.`);

  // ── PASO 2: Obtener todos los usuarios ──────────────────────────────────────
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      accounts: {
        where: { type: "SAVINGS" },
        select: { id: true },
      },
    },
  });

  console.log(`\n👥 Total de usuarios encontrados: ${users.length}`);

  let createdSavings = 0;
  let skipped = 0;

  for (const user of users) {
    if (user.accounts.length > 0) {
      // Ya tiene cuenta SAVINGS
      skipped++;
      continue;
    }

    // Crear cuenta de Ahorro para este usuario
    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Mi Cuenta de Ahorro",
        type: "SAVINGS",
        role: "USER",
        investedCapital: 0,
      },
    });

    createdSavings++;
    console.log(`  ➕ Cuenta de Ahorro creada para: ${user.email}`);
  }

  console.log(`\n📊 Resumen:`);
  console.log(`   • Usuarios con cuenta SAVINGS ya existente: ${skipped}`);
  console.log(`   • Cuentas de Ahorro creadas: ${createdSavings}`);
  console.log(`\n✅ Backfill completado exitosamente.`);
}

main()
  .catch((e) => {
    console.error("❌ Error durante el backfill:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

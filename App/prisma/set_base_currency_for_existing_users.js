/**
 * SCRIPT: MIGRACIÓN DE USUARIOS EXISTENTES
 *
 * DESCRIPCIÓN:
 * Asigna 'CO' como país y 'COP' como moneda base a todos los usuarios
 * que no tengan estos campos definidos.
 *
 * USO:
 * node prisma/set_base_currency_for_existing_users.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("=== MIGRACIÓN DE USUARIOS EXISTENTES ===");
  console.log("Estableciendo moneda base COP y país CO para usuarios sin definir...\n");

  try {
    // 1. Contar usuarios a actualizar (donde country es null)
    // Nota: baseCurrency tiene default 'COP' en schema, pero country es null.
    // Queremos asegurar que baseCurrency sea COP también.
    const count = await prisma.user.count({
      where: {
        country: null,
      },
    });

    console.log(`Usuarios encontrados sin país definido: ${count}`);

    if (count === 0) {
      console.log("✅ No hay usuarios pendientes de migración.");
      return;
    }

    console.log("Iniciando actualización...");

    // 2. Actualizar usuarios
    const result = await prisma.user.updateMany({
      where: {
        country: null,
      },
      data: {
        country: 'CO',
        baseCurrency: 'COP',
      },
    });

    console.log(`\n✅ Migración completada exitosamente.`);
    console.log(`   - Usuarios actualizados: ${result.count}`);

  } catch (error) {
    console.error("\n❌ Error durante la migración:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

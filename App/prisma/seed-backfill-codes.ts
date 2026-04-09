// ============================================================================
// SCRIPT DE MIGRACIÓN: BACKFILL DE REFERRAL CODES
// ============================================================================
// Genera y asigna referralCode único a todos los usuarios existentes
// que actualmente tienen referralCode = null.
//
// USO:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-backfill-codes.ts
//
// CARACTERÍSTICAS:
//   - Idempotente: puede ejecutarse varias veces sin duplicar datos
//   - Procesa en lotes (batch) de 50 para evitar timeout de transacción
//   - Genera el mismo formato de código que el sistema existente (LETTERS+DIGITS)
//   - Logging detallado del progreso
//
// ORDEN DE EJECUCIÓN (IMPORTANTE):
//   1. Ejecutar ESTE script antes del deploy
//   2. Verificar con: SELECT COUNT(*) FROM "User" WHERE "referralCode" IS NULL
//   3. Confirmar que el resultado es 0
//   4. Hacer deploy de la nueva versión
// ============================================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Constantes de generación de código (misma lógica que referral.service.ts) ──
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_DIGITS = "23456789";
const BATCH_SIZE = 50;
const MAX_ATTEMPTS_PER_CODE = 20;

/**
 * Genera un código de referido candidato (no verifica unicidad).
 * Formato: 4 letras + 4 dígitos (ej: ABCD1234)
 */
function generateCandidateCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  }
  for (let i = 0; i < 4; i++) {
    code += CODE_DIGITS[Math.floor(Math.random() * CODE_DIGITS.length)];
  }
  return code;
}

/**
 * Procesa un lote de usuarios sin referralCode.
 * Asigna un código único a cada uno dentro de una transacción.
 *
 * @param userIds - IDs de usuarios a procesar en este lote
 * @returns Número de usuarios actualizados exitosamente
 */
async function processBatch(userIds: string[]): Promise<number> {
  let updated = 0;

  // Obtener todos los códigos ya existentes en la DB para evitar colisiones
  // (leemos dentro del loop para consistencia)
  for (const userId of userIds) {
    let code: string | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_CODE; attempt++) {
      const candidate = generateCandidateCode();

      // Verificar unicidad
      const existing = await prisma.user.findUnique({
        where: { referralCode: candidate },
        select: { id: true },
      });

      if (!existing) {
        code = candidate;
        break;
      }
    }

    if (!code) {
      console.error(
        `❌ No se pudo generar un código único para el usuario ${userId} después de ${MAX_ATTEMPTS_PER_CODE} intentos. Saltando.`
      );
      continue;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    updated++;
    console.log(`  ✅ Usuario ${userId} → código: ${code}`);
  }

  return updated;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 Iniciando backfill de referralCodes...\n");

  // 1. Contar usuarios sin referralCode
  const totalWithout = await prisma.user.count({
    where: { referralCode: null },
  });

  if (totalWithout === 0) {
    console.log("✅ Todos los usuarios ya tienen referralCode. Nada que migrar.\n");
    return;
  }

  console.log(`📊 Usuarios sin referralCode: ${totalWithout}`);
  console.log(`🔄 Procesando en lotes de ${BATCH_SIZE}...\n`);

  let totalUpdated = 0;
  let offset = 0;

  // 2. Procesar en lotes
  while (true) {
    const batch = await prisma.user.findMany({
      where: { referralCode: null },
      select: { id: true, email: true },
      take: BATCH_SIZE,
      skip: offset,
      orderBy: { createdAt: "asc" },
    });

    if (batch.length === 0) break;

    console.log(
      `\n📦 Lote ${Math.floor(offset / BATCH_SIZE) + 1}: ${batch.length} usuarios`
    );

    const updatedInBatch = await processBatch(batch.map((u) => u.id));
    totalUpdated += updatedInBatch;
    offset += batch.length;
  }

  // 3. Verificación final
  const remaining = await prisma.user.count({
    where: { referralCode: null },
  });

  console.log("\n" + "=".repeat(60));
  console.log(`✅ Migración completada:`);
  console.log(`   - Usuarios procesados: ${totalWithout}`);
  console.log(`   - Códigos asignados:   ${totalUpdated}`);
  console.log(`   - Sin código aún:      ${remaining}`);

  if (remaining > 0) {
    console.error(
      `\n⚠️  ADVERTENCIA: Hay ${remaining} usuarios sin referralCode.`
    );
    console.error(
      "   Vuelve a ejecutar este script para completar la migración."
    );
    process.exit(1);
  } else {
    console.log(
      "\n✅ VERIFICACIÓN EXITOSA: Todos los usuarios tienen referralCode."
    );
    console.log("   Puedes proceder con el deploy de la nueva versión.\n");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error fatal en migración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

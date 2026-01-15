/**
 * SCRIPT: CREAR SUPER ADMIN
 *
 * DESCRIPCIÓN:
 * Este script crea o actualiza el usuario Super Admin inicial en la base de datos.
 * Es útil para configurar el acceso administrativo en un entorno nuevo.
 *
 * USO:
 * node prisma/create_superadmin.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "pfinancedev2@gmail.com";
  const passwordRaw = "Prueba1234!";

  console.log(`Creando/Actualizando Super Admin: ${email}`);

  // Encriptar la contraseña (balance entre seguridad y velocidad con salt rounds 10)
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

  // Intentar actualizar si existe, o crear si no existe
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "SUPER_ADMIN",
      totpEnabled: false,
      tokenVersion: { increment: 1 },
    },
    create: {
      email,
      password: hashedPassword,
      firstName: "Super",
      paternalSurname: "Admin",
      maternalSurname: "System",
      role: "SUPER_ADMIN",
      totpEnabled: false,
      investedCapital: 0,
      availableBalance: 0,
    },
  });

  console.log(`✅ Super Admin configurado exitosamente:`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Email: ${user.email}`);
  console.log(`   - Rol: ${user.role}`);
  console.log(`   - 2FA Habilitado: ${user.totpEnabled}`);
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

/**
 * SCRIPT: CREAR SUPER ADMIN
 *
 * DESCRIPCIÓN:
 * Este script crea o actualiza el usuario Super Admin inicial en la base de datos.
 *
 * USO:
 * node prisma/create_superadmin.js
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "superadmin@prueba.com";
  const passwordRaw = "TempPass123!";

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
      mustChangePassword: true, // Forzar cambio de contraseña
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
      mustChangePassword: true,
    },
  });

  // Crear cuenta por defecto si no tiene ninguna
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId: user.id,
        name: "Admin Principal",
        role: "USER",
        investedCapital: 0,
      },
    });
    console.log(`   ✅ Cuenta por defecto creada`);
  }

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

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Password123!", 12);

  // Limpiar usuarios previos para evitar conflictos si el esquema cambió
  // (Opcional, pero útil para "Activar la base de datos de prueba" de cero)
  // await prisma.user.deleteMany();

  const users = [
    {
      email: "test@profinance.com",
      password: hashedPassword,
      firstName: "Usuario",
      paternalSurname: "de",
      maternalSurname: "Prueba",
      role: "USER",
    },
    {
      email: "admin@profinance.com",
      password: hashedPassword,
      firstName: "Admin",
      paternalSurname: "Sist",
      maternalSurname: "Pro",
      role: "ADMIN",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword, // Asegurar que la contraseña sea esta
      },
      create: user,
    });
  }

  console.log("Base de datos de prueba activada con 2 usuarios:");
  console.log("- test@profinance.com / Password123!");
  console.log("- admin@profinance.com / Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

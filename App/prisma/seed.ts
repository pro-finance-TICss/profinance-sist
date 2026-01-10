import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Password123!", 12);

  const testUser = await prisma.user.upsert({
    where: { email: "test@profinance.com" },
    update: {},
    create: {
      email: "test@profinance.com",
      password: hashedPassword,
      firstName: "Usuario",
      paternalSurname: "de",
      maternalSurname: "Prueba",
      role: "USER",
      totpEnabled: false, // Usuario legacy sin TOTP
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@profinance.com" },
    update: {},
    create: {
      email: "admin@profinance.com",
      password: hashedPassword,
      firstName: "Admin",
      paternalSurname: "Sist",
      maternalSurname: "Pro",
      role: "ADMIN",
      totpEnabled: false, // Usuario legacy sin TOTP
    },
  });

  console.log({ testUser, adminUser });
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

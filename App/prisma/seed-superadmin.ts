import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Pro-FinanceD3v.", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "pfinancedev@gmail.com" },
    update: {
      role: "SUPER_ADMIN", // Ensure role is updated if user exists
      password: hashedPassword, // Ensure password is correct
      totpEnabled: false,
    },
    create: {
      email: "pfinancedev@gmail.com",
      password: hashedPassword,
      firstName: "Super",
      paternalSurname: "Admin",
      maternalSurname: "Dev",
      role: "SUPER_ADMIN",
      totpEnabled: false,
    },
  });

  console.log({ superAdmin });
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

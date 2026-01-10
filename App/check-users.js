const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, firstName: true },
  });
  console.log("Usuarios en la base de datos:");
  console.table(users);
  await prisma.$disconnect();
}
run();

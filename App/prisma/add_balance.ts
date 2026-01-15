import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for user "Prueba Prueba Prueba"...');
  const user = await prisma.user.findFirst({
    where: {
      firstName: "Prueba",
      paternalSurname: "Prueba",
      maternalSurname: "Prueba",
    },
  });

  if (!user) {
    console.log('User "Prueba Prueba Prueba" not found.');
    return;
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      investedCapital: 50000,
      availableBalance: 15000,
    },
  });

  console.log(`✅ Updated balance for user ${user.email}:`);
  console.log(`   - Invested Capital: $${updated.investedCapital}`);
  console.log(`   - Available Balance: $${updated.availableBalance}`);
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

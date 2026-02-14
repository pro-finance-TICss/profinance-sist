import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for user "ko ko ko"...');
  const user = await prisma.user.findFirst({
    where: {
      firstName: "ko",
      paternalSurname: "ko",
      maternalSurname: "ko",
    },
  });

  if (!user) {
    console.log('User "ko ko ko" not found.');
    return;
  }

  console.log(`Found user: ${user.email} (${user.id})`);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      investedCapital: 100,
      availableBalance: 50,
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

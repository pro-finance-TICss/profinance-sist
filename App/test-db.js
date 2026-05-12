const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const performances = await prisma.performance.findMany({
    where: { status: 'COMPLETED' },
    select: { targetRole: true, startDate: true, percentage: true }
  });
  console.log('Global Performances:');
  console.log(performances.map(p => ({ role: p.targetRole, date: p.startDate, pct: p.percentage })));
  
  const snapshots = await prisma.accountPerformanceSnapshot.findMany({
    select: { accountId: true, periodStart: true, percentageRaw: true }
  });
  console.log('Snapshots:');
  console.log(snapshots);
}
main().finally(() => prisma.$disconnect());

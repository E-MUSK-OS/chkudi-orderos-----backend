import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE amazon_analytics_history CASCADE;');
  console.log("Deleted all history rows");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

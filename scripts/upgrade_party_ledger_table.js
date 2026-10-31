import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("=== Checking Party/Ledger Book Columns in Database ===");

  const columns = [
    `ADD COLUMN IF NOT EXISTS "legalName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "msmeNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "branchName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'Current'`,
    `ADD COLUMN IF NOT EXISTS "creditDebitLimit" DOUBLE PRECISION DEFAULT 0`,
    `ADD COLUMN IF NOT EXISTS "refContactName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`,
    `ADD COLUMN IF NOT EXISTS "completionPercentage" INTEGER DEFAULT 0`,
    `ADD COLUMN IF NOT EXISTS "createdByName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "updatedByName" TEXT`
  ];

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Party" ${col};`);
    } catch (err) {
      console.warn(`Column check notice: ${err.message}`);
    }
  }

  console.log("=== Party/Ledger Book columns verified. No static data added. ===");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

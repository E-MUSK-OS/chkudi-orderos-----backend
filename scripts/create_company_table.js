import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("Checking database connection and creating Company table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Company" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "companyName" TEXT NOT NULL DEFAULT '',
      "companyCode" TEXT NOT NULL DEFAULT '',
      "ownerName" TEXT NOT NULL DEFAULT '',
      "gstNumber" TEXT NOT NULL,
      "panNumber" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "addressLine1" TEXT,
      "addressLine2" TEXT,
      "city" TEXT,
      "state" TEXT DEFAULT 'Gujarat',
      "stateCode" TEXT DEFAULT '24',
      "pincode" TEXT,
      "logoUrl" TEXT,
      "bankName" TEXT,
      "accountNumber" TEXT,
      "ifscCode" TEXT,
      "branchName" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "Company_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Company_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Company_userId_idx" ON "Company"("userId");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Company_gstNumber_idx" ON "Company"("gstNumber");`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Company_status_idx" ON "Company"("status");`);

  console.log("Company table and indexes created successfully!");
}

main()
  .catch((e) => {
    console.error("Error creating Company table:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

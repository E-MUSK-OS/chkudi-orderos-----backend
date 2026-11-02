import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("Checking database connection and creating ClientConfiguration table...");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClientConfiguration" (
      "id" TEXT NOT NULL,
      "workspaceSuperAdminId" TEXT NOT NULL,
      "clientName" TEXT NOT NULL DEFAULT 'Enterprise Plus',
      "subscriptionPlan" TEXT NOT NULL DEFAULT 'Enterprise Plus',
      "hasSeparateInventoryDept" BOOLEAN NOT NULL DEFAULT false,
      "enabledSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "enabledRoutes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "configurationData" JSONB,
      "createdById" TEXT,
      "updatedById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "ClientConfiguration_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ClientConfiguration_workspaceSuperAdminId_key" UNIQUE ("workspaceSuperAdminId"),
      CONSTRAINT "ClientConfiguration_workspaceSuperAdminId_fkey" FOREIGN KEY ("workspaceSuperAdminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ClientConfiguration_workspaceSuperAdminId_idx" ON "ClientConfiguration"("workspaceSuperAdminId");
  `);

  console.log("ClientConfiguration table and indexes created successfully!");
}

main()
  .catch((e) => {
    console.error("Error creating ClientConfiguration table:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function main() {
  console.log("Adding comprehensive Company profile fields to database...");

  const columns = [
    // General Details
    `ADD COLUMN IF NOT EXISTS "legalName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "brandName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "abbreviation" TEXT`,
    `ADD COLUMN IF NOT EXISTS "businessType" TEXT DEFAULT 'Properiter'`,
    `ADD COLUMN IF NOT EXISTS "website" TEXT`,

    // Contact Details - Billing
    `ADD COLUMN IF NOT EXISTS "billingAddress1" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingAddress2" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingAddress3" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingPincode" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingArea" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingCity" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingState" TEXT DEFAULT 'Gujarat'`,
    `ADD COLUMN IF NOT EXISTS "billingCountry" TEXT DEFAULT 'India'`,
    `ADD COLUMN IF NOT EXISTS "billingContactName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "billingContactNo" TEXT`,

    // Contact Details - Shipping
    `ADD COLUMN IF NOT EXISTS "shippingSameAsBilling" BOOLEAN DEFAULT true`,
    `ADD COLUMN IF NOT EXISTS "shippingAddress1" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingAddress2" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingAddress3" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingPincode" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingArea" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingCity" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingState" TEXT DEFAULT 'Gujarat'`,
    `ADD COLUMN IF NOT EXISTS "shippingCountry" TEXT DEFAULT 'India'`,
    `ADD COLUMN IF NOT EXISTS "shippingContactName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "shippingContactNo" TEXT`,

    // Accounting - Legal
    `ADD COLUMN IF NOT EXISTS "tanNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "cstNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "fssaiNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "tradeCategory" TEXT DEFAULT 'Manufacturing'`,
    `ADD COLUMN IF NOT EXISTS "msmeNumber" TEXT`,

    // Accounting - Bank
    `ADD COLUMN IF NOT EXISTS "accountHolderName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "accountName" TEXT`,
    `ADD COLUMN IF NOT EXISTS "accountType" TEXT DEFAULT 'Current'`,
    `ADD COLUMN IF NOT EXISTS "upiId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "clientCode" TEXT`,
    `ADD COLUMN IF NOT EXISTS "productCode" TEXT`,

    // Accounting - Invoice & Other
    `ADD COLUMN IF NOT EXISTS "taxInvoicePrefix" TEXT`,
    `ADD COLUMN IF NOT EXISTS "taxInvoiceNext" TEXT DEFAULT '1'`,
    `ADD COLUMN IF NOT EXISTS "retailInvoicePrefix" TEXT`,
    `ADD COLUMN IF NOT EXISTS "retailInvoiceNext" TEXT DEFAULT '1'`,
    `ADD COLUMN IF NOT EXISTS "considerInPnL" TEXT DEFAULT 'Yes'`,

    // Logo & Signature
    `ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT`,
    `ADD COLUMN IF NOT EXISTS "completionPercentage" INTEGER DEFAULT 60`
  ];

  for (const col of columns) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Company" ${col};`);
    } catch (err) {
      console.warn(`Column check notice: ${err.message}`);
    }
  }

  // Also seed/update the sample JAY BHAVANI FASHION with the exact data from user's screenshots!
  const sampleData = {
    legalName: "JAY BHAVANI FASHION",
    companyName: "JAY BHAVANI FASHION",
    brandName: "JAY BHAVANI FASHION",
    ownerName: "DIPABEN RAMESHBHAI BHATIYA",
    companyCode: "JBF",
    abbreviation: "JBF",
    businessType: "Properiter",
    email: "jaybhavanifashion2024@gmail.com",
    phone: "9925828382",
    website: "",

    billingAddress1: "Plot- No-D-9/13A",
    billingAddress2: "Sachin Udhyognagar Sahakari Mandli",
    billingAddress3: "Hojiwal Industrial Estata vanz Road No-2",
    billingPincode: "394230",
    billingArea: "Sachin",
    billingCity: "Surat",
    billingState: "Gujarat",
    billingCountry: "India",
    billingContactName: "Shailesh Bhatiya",
    billingContactNo: "9925377339",

    shippingSameAsBilling: true,
    shippingAddress1: "Plot- No-D-9/13A",
    shippingAddress2: "Sachin Udhyognagar Sahakari Mandli",
    shippingAddress3: "Hojiwal Industrial Estata vanz Road No-2",
    shippingPincode: "394230",
    shippingArea: "Sachin",
    shippingCity: "Surat",
    shippingState: "Gujarat",
    shippingCountry: "India",
    shippingContactName: "Shailesh Bhatiya",
    shippingContactNo: "9925377339",

    gstNumber: "24CAGPB1419N1ZW",
    tanNumber: "SRTD09780B",
    panNumber: "CAGPB1419N",
    cstNumber: "",
    fssaiNumber: "",
    tradeCategory: "Manufacturing",
    msmeNumber: "",

    bankName: "KOTAK MAHINDRA BANK",
    accountHolderName: "DIPABEN RAMESHBHAI BHATIYA",
    accountName: "JAY BHAVANI FASHION",
    accountNumber: "9925828382",
    ifscCode: "KKBK0002868",
    accountType: "Current",
    branchName: "KATARGAM SURAT",
    upiId: "",
    clientCode: "",
    productCode: "",

    taxInvoicePrefix: "JBFT",
    taxInvoiceNext: "1",
    retailInvoicePrefix: "JBFR",
    retailInvoiceNext: "1",
    considerInPnL: "Yes",
    completionPercentage: 60,
    status: "ACTIVE"
  };

  await prisma.company.updateMany({
    where: {
      gstNumber: "24CAGPB1419N1ZW"
    },
    data: sampleData
  });

  console.log("Successfully upgraded Company table and updated sample record with full database values!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

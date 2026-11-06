import prisma from "../config/prisma.js";

export const findCompanyByIdRepo = async (id, userId) => {
  return await prisma.company.findFirst({
    where: { id, userId },
  });
};

export const findCompanyByGstRepo = async (gstNumber, userId) => {
  return await prisma.company.findFirst({
    where: {
      userId,
      gstNumber: {
        equals: gstNumber.trim(),
        mode: "insensitive",
      },
    },
  });
};

export const findCompaniesRepo = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 9,
    search = "",
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 9);
  const skip = (pageNum - 1) * limitNum;

  const where = {
    userId,
  };

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { companyName: { contains: s, mode: "insensitive" } },
      { companyCode: { contains: s, mode: "insensitive" } },
      { ownerName: { contains: s, mode: "insensitive" } },
      { gstNumber: { contains: s, mode: "insensitive" } },
      { city: { contains: s, mode: "insensitive" } },
    ];
  }

  if (status && status !== "All") {
    where.status = status.toUpperCase();
  }

  const validSortFields = [
    "createdAt",
    "companyName",
    "companyCode",
    "ownerName",
    "gstNumber",
    "status",
  ];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderDirection = sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [orderField]: orderDirection },
    }),
  ]);

  return {
    companies,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

const ALLOWED_COMPANY_FIELDS = new Set([
  "companyName",
  "companyCode",
  "ownerName",
  "gstNumber",
  "panNumber",
  "email",
  "phone",
  "legalName",
  "brandName",
  "abbreviation",
  "businessType",
  "website",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "stateCode",
  "pincode",
  "billingAddress1",
  "billingAddress2",
  "billingAddress3",
  "billingPincode",
  "billingArea",
  "billingCity",
  "billingState",
  "billingCountry",
  "billingContactName",
  "billingContactNo",
  "shippingSameAsBilling",
  "shippingAddress1",
  "shippingAddress2",
  "shippingAddress3",
  "shippingPincode",
  "shippingArea",
  "shippingCity",
  "shippingState",
  "shippingCountry",
  "shippingContactName",
  "shippingContactNo",
  "tanNumber",
  "cstNumber",
  "fssaiNumber",
  "tradeCategory",
  "msmeNumber",
  "bankName",
  "accountHolderName",
  "accountName",
  "accountNumber",
  "ifscCode",
  "accountType",
  "branchName",
  "upiId",
  "clientCode",
  "productCode",
  "taxInvoicePrefix",
  "taxInvoiceNext",
  "retailInvoicePrefix",
  "retailInvoiceNext",
  "considerInPnL",
  "logoUrl",
  "signatureUrl",
  "completionPercentage",
  "status",
  "isDefault",
  "isBranch",
  "parentCompanyId",
  "companyBranchName",
]);

export const sanitizeCompanyData = (data) => {
  if (!data || typeof data !== "object") return {};
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (ALLOWED_COMPANY_FIELDS.has(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export const createCompanyRepo = async (userId, data) => {
  const sanitized = sanitizeCompanyData(data);
  const { isBranch, parentCompanyId, companyBranchName, ...prismaData } = sanitized;
  const company = await prisma.company.create({
    data: {
      userId,
      ...prismaData,
    },
  });

  if (isBranch || parentCompanyId || companyBranchName) {
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "Company" SET "isBranch" = $1, "parentCompanyId" = $2, "companyBranchName" = $3 WHERE id = $4',
        Boolean(isBranch),
        parentCompanyId || null,
        companyBranchName || null,
        company.id
      );
      company.isBranch = Boolean(isBranch);
      company.parentCompanyId = parentCompanyId || null;
      company.companyBranchName = companyBranchName || null;
    } catch (e) {
      console.error("Error setting branch fields on company:", e);
    }
  }

  return company;
};

export const updateCompanyRepo = async (id, userId, data) => {
  const sanitized = sanitizeCompanyData(data);
  return await prisma.company.update({
    where: { id },
    data: {
      ...sanitized,
      updatedAt: new Date(),
    },
  });
};

export const toggleCompanyStatusRepo = async (id, userId, targetStatus) => {
  const current = await findCompanyByIdRepo(id, userId);
  if (!current) throw new Error("Company not found.");

  let nextStatus;
  if (targetStatus && typeof targetStatus === "string") {
    nextStatus = targetStatus.toUpperCase();
  } else {
    nextStatus = current.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
  }

  return await prisma.company.update({
    where: { id },
    data: { status: nextStatus, updatedAt: new Date() },
  });
};

export const deleteCompanyRepo = async (id, userId) => {
  return await prisma.company.delete({
    where: { id },
  });
};

/* ==========================================================================
   Company Branch Repository (Separate CompanyBranch table with FKs)
   ========================================================================== */

export const createBranchRepo = async ({ userId, companyId, branchName, gstNumber, status = "ACTIVE" }) => {
  const branchId = "br_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  const query = `
    INSERT INTO "CompanyBranch" ("id", "userId", "companyId", "branchName", "gstNumber", "status", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, "userId", "companyId", "branchName", "gstNumber", "status", "createdAt", "updatedAt"
  `;
  const rows = await prisma.$queryRawUnsafe(
    query,
    branchId,
    userId,
    companyId,
    branchName.trim(),
    gstNumber.trim().toUpperCase(),
    status || "ACTIVE"
  );
  return rows?.[0] || null;
};

export const findBranchesRepo = async (userId, companyId = null) => {
  try {
    let query = `
      SELECT b.id, b."userId", b."companyId", b."branchName", b."gstNumber", b."status", b."createdAt",
             c."companyName"
      FROM "CompanyBranch" b
      JOIN "Company" c ON b."companyId" = c.id
      WHERE b."userId" = $1
    `;
    const params = [userId];

    if (companyId) {
      query += ' AND b."companyId" = $2';
      params.push(companyId);
    }

    query += ' ORDER BY b."createdAt" ASC';

    const rows = await prisma.$queryRawUnsafe(query, ...params);

    return (rows || []).map((b) => ({
      id: b.id,
      companyId: b.companyId,
      companyName: b.companyName,
      branchName: b.branchName,
      displayName: `${b.companyName} - ${b.branchName}`,
      gstNumber: b.gstNumber,
      status: b.status,
      createdAt: b.createdAt,
    }));
  } catch (err) {
    console.error("findBranchesRepo error:", err);
    return [];
  }
};

export const deleteBranchRepo = async (id, userId) => {
  try {
    const query = 'DELETE FROM "CompanyBranch" WHERE id = $1 AND "userId" = $2 RETURNING id';
    const rows = await prisma.$queryRawUnsafe(query, id, userId);
    return rows?.[0] || null;
  } catch (err) {
    console.error("deleteBranchRepo error:", err);
    return null;
  }
};

export const updateBranchStatusRepo = async (id, userId, status) => {
  try {
    const query = `
      UPDATE "CompanyBranch"
      SET "status" = $1, "updatedAt" = NOW()
      WHERE "id" = $2 AND "userId" = $3
      RETURNING id, "userId", "companyId", "branchName", "gstNumber", "status", "createdAt", "updatedAt"
    `;
    const rows = await prisma.$queryRawUnsafe(query, status, id, userId);
    return rows?.[0] || null;
  } catch (err) {
    console.error("updateBranchStatusRepo error:", err);
    return null;
  }
};

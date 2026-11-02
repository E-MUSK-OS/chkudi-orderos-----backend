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

export const createCompanyRepo = async (userId, data) => {
  return await prisma.company.create({
    data: {
      userId,
      ...data,
    },
  });
};

export const updateCompanyRepo = async (id, userId, data) => {
  return await prisma.company.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
};

export const toggleCompanyStatusRepo = async (id, userId) => {
  const current = await findCompanyByIdRepo(id, userId);
  if (!current) throw new Error("Company not found.");

  const nextStatus = current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
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

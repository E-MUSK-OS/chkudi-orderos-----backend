import prisma from "../config/prisma.js";

export const createPartyRepo = async (data) => {
  return await prisma.party.create({
    data,
  });
};

export const findPartiesRepo = async (
  userId,
  {
    search = "",
    ledgerName = "",
    accountHead = "",
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 50,
    page = 1,
  } = {}
) => {
  const andConditions = [{ userId }];

  if (accountHead && accountHead !== "All") {
    andConditions.push({
      accountHead: { equals: accountHead, mode: "insensitive" },
    });
  }

  if (ledgerName) {
    andConditions.push({
      partyName: { contains: ledgerName, mode: "insensitive" },
    });
  }

  if (search) {
    andConditions.push({
      OR: [
        { partyName: { contains: search, mode: "insensitive" } },
        { accountCode: { contains: search, mode: "insensitive" } },
        { alias: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { gstin: { contains: search, mode: "insensitive" } },
        { legalName: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  const where = andConditions.length > 1 ? { AND: andConditions } : andConditions[0];

  const skip = (Math.max(1, page) - 1) * limit;

  // Dynamic ordering
  const validSortFields = [
    "partyName",
    "accountCode",
    "accountHead",
    "contactPerson",
    "gstin",
    "email",
    "createdAt",
    "updatedAt",
  ];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderDirection = sortOrder.toLowerCase() === "asc" ? "asc" : "desc";

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take: limit,
    }),
    prisma.party.count({ where }),
  ]);

  return { parties, total, page, limit };
};

export const findPartyByIdRepo = async (id, userId) => {
  return await prisma.party.findFirst({
    where: {
      id,
      userId,
    },
  });
};

export const findPartyByNameRepo = async (partyName, userId) => {
  return await prisma.party.findFirst({
    where: {
      partyName: { equals: partyName, mode: "insensitive" },
      userId,
    },
  });
};

export const updatePartyRepo = async (id, userId, data) => {
  return await prisma.party.update({
    where: {
      id,
      userId,
    },
    data,
  });
};

export const deletePartyRepo = async (id, userId) => {
  return await prisma.party.delete({
    where: {
      id,
      userId,
    },
  });
};

export const bulkCreatePartiesRepo = async (partiesList) => {
  const results = [];
  for (const item of partiesList) {
    const existing = await prisma.party.findFirst({
      where: {
        userId: item.userId,
        partyName: { equals: item.partyName, mode: "insensitive" },
      },
    });

    if (existing) {
      const updated = await prisma.party.update({
        where: { id: existing.id },
        data: item,
      });
      results.push(updated);
    } else {
      const created = await prisma.party.create({
        data: item,
      });
      results.push(created);
    }
  }
  return results;
};

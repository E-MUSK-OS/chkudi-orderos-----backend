import prisma from "../config/prisma.js";

export const createPartyRepo = async (data) => {
  return await prisma.party.create({
    data,
  });
};

export const findPartiesRepo = async (userId, { search = "", accountHead, limit = 50, page = 1 } = {}) => {
  const where = {
    userId,
    ...(accountHead ? { accountHead } : {}),
    ...(search
      ? {
          OR: [
            { partyName: { contains: search, mode: "insensitive" } },
            { accountCode: { contains: search, mode: "insensitive" } },
            { alias: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { contactPerson: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [parties, total] = await Promise.all([
    prisma.party.findMany({
      where,
      orderBy: { partyName: "asc" },
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

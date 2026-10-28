import prisma from "../config/prisma.js";

export const getNextWebstoreCodeRepo = async (userId) => {
  const latest = await prisma.webstore.findFirst({
    where: { userId },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  return latest && typeof latest.code === "number" ? latest.code + 1 : 1;
};

export const findWebstoreByNameRepo = async (storeName, userId) => {
  return await prisma.webstore.findFirst({
    where: {
      userId,
      storeName: {
        equals: storeName.trim(),
        mode: "insensitive",
      },
    },
  });
};

export const findWebstoreByIdRepo = async (id, userId) => {
  return await prisma.webstore.findFirst({
    where: { id, userId },
  });
};

export const findWebstoresRepo = async (userId, options = {}) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    marketplaceName = "",
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const isActiveFilter =
    isActive === "true" || isActive === true
      ? true
      : isActive === "false" || isActive === false
      ? false
      : undefined;

  const where = {
    userId,
    ...(marketplaceName && marketplaceName !== "All"
      ? { marketplaceName: { equals: marketplaceName, mode: "insensitive" } }
      : {}),
    ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
    ...(search
      ? {
          OR: [
            { storeName: { contains: search.trim(), mode: "insensitive" } },
            { marketplaceName: { contains: search.trim(), mode: "insensitive" } },
            { billTo: { contains: search.trim(), mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const take = Math.max(1, Number(limit));

  const validSortFields = [
    "storeName",
    "marketplaceName",
    "billTo",
    "skuCount",
    "registrationDate",
    "isActive",
    "createdAt",
  ];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  const orderDirection = sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  const [webstores, total] = await Promise.all([
    prisma.webstore.findMany({
      where,
      orderBy: { [orderField]: orderDirection },
      skip,
      take,
    }),
    prisma.webstore.count({ where }),
  ]);

  return {
    webstores,
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / take) || 1,
  };
};

export const createWebstoreRepo = async (userId, data) => {
  let code = data.code;
  if (!code || code === 0) {
    code = await getNextWebstoreCodeRepo(userId);
  }

  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  return await prisma.webstore.create({
    data: {
      ...data,
      code,
      userId,
      registrationDate: parseDate(data.registrationDate) || new Date(),
      lastPaymentDate: parseDate(data.lastPaymentDate),
    },
  });
};

export const updateWebstoreRepo = async (id, userId, data) => {
  const parseDate = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  };

  const payload = { ...data };
  if ("registrationDate" in payload) {
    payload.registrationDate = parseDate(payload.registrationDate) || new Date();
  }
  if ("lastPaymentDate" in payload) {
    payload.lastPaymentDate = parseDate(payload.lastPaymentDate);
  }

  return await prisma.webstore.update({
    where: { id, userId },
    data: payload,
  });
};

export const toggleWebstoreStatusRepo = async (id, userId) => {
  const existing = await findWebstoreByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Webstore not found.");
  }

  return await prisma.webstore.update({
    where: { id, userId },
    data: {
      isActive: !existing.isActive,
    },
  });
};

export const deleteWebstoreRepo = async (id, userId) => {
  return await prisma.webstore.delete({
    where: { id, userId },
  });
};

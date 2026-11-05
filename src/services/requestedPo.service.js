import prisma from "../config/prisma.js";

/**
 * Get all requested POs for the authenticated user with optional store filter and search
 */
export const getRequestedPOsService = async (userId, query = {}) => {
  const { storeId, search, page, limit } = query;

  const where = {
    userId,
  };

  if (storeId && storeId !== "all") {
    where.storeId = storeId;
  }

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { poNumber: { contains: term, mode: "insensitive" } },
      { storeName: { contains: term, mode: "insensitive" } },
      { fileName: { contains: term, mode: "insensitive" } },
    ];
  }

  const take = limit ? parseInt(limit, 10) : undefined;
  const skip = page && limit ? (parseInt(page, 10) - 1) * take : undefined;

  const [total, records] = await Promise.all([
    prisma.requestedPO.count({ where }),
    prisma.requestedPO.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
  ]);

  return {
    pos: records,
    total,
    page: page ? parseInt(page, 10) : 1,
    limit: take || total,
  };
};

/**
 * Get the latest PO date for each store belonging to the user
 */
export const getLatestPoDatesService = async (userId) => {
  const records = await prisma.requestedPO.findMany({
    where: { userId },
    select: {
      storeId: true,
      poDate: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const latestDates = {};
  for (const record of records) {
    if (record.storeId && !latestDates[record.storeId]) {
      latestDates[record.storeId] = record.poDate;
    }
  }

  return latestDates;
};

/**
 * Get a single requested PO by its ID or PO Number
 */
export const getRequestedPOByIdService = async (idOrPoNumber, userId) => {
  if (!idOrPoNumber) return null;

  const clean = String(idOrPoNumber).replace(/^#/, "").trim();

  // Try matching by id first, then by poNumber (exact or case-insensitive)
  const po = await prisma.requestedPO.findFirst({
    where: {
      userId,
      OR: [
        { id: clean },
        { poNumber: clean },
        { poNumber: { equals: clean, mode: "insensitive" } },
      ],
    },
  });

  return po;
};

/**
 * Create or update a requested PO in the database
 */
export const upsertRequestedPOService = async (userId, data) => {
  const {
    id,
    storeId,
    storeName,
    marketplaceName,
    poNumber,
    poDate,
    fileName,
    itemsCount,
    totalQuantity,
    totalAmount,
    status,
    columns,
    items,
  } = data;

  const cleanPoNumber = String(poNumber || "").trim();

  // Check if updating existing record
  let existing = null;
  if (id) {
    const cleanId = String(id).replace(/^#/, "").trim();
    if (!cleanId.startsWith("po_")) {
      existing = await prisma.requestedPO.findFirst({
        where: {
          userId,
          OR: [
            { id: cleanId },
            { poNumber: cleanId },
            { poNumber: { equals: cleanId, mode: "insensitive" } },
          ],
        },
      });
    }
  }

  // If not found by ID, also check if a PO with same poNumber and storeId already exists
  if (!existing && cleanPoNumber && storeId) {
    existing = await prisma.requestedPO.findFirst({
      where: {
        userId,
        storeId,
        poNumber: { equals: cleanPoNumber, mode: "insensitive" },
      },
    });
  }

  const payload = {
    storeId: storeId || "default",
    storeName: storeName || "Default Store",
    marketplaceName: marketplaceName || null,
    poNumber: cleanPoNumber || `PO-${Date.now()}`,
    poDate: poDate || new Date().toISOString().split("T")[0],
    fileName: fileName || null,
    itemsCount: typeof itemsCount === "number" ? itemsCount : (items?.length || 0),
    totalQuantity: typeof totalQuantity === "number" ? totalQuantity : (items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0),
    totalAmount: typeof totalAmount === "number" ? totalAmount : (items?.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0) || 0.0),
    status: status || "Uploaded",
    columns: columns ? columns : [],
    items: items ? items : [],
  };

  if (existing) {
    return await prisma.requestedPO.update({
      where: { id: existing.id },
      data: payload,
    });
  }

  return await prisma.requestedPO.create({
    data: {
      ...payload,
      userId,
    },
  });
};

/**
 * Delete a requested PO by ID or PO Number
 */
export const deleteRequestedPOService = async (idOrPoNumber, userId) => {
  const clean = String(idOrPoNumber).replace(/^#/, "").trim();

  const existing = await prisma.requestedPO.findFirst({
    where: {
      userId,
      OR: [
        { id: clean },
        { poNumber: clean },
        { poNumber: { equals: clean, mode: "insensitive" } },
      ],
    },
  });

  if (!existing) {
    throw new Error("Requested PO not found.");
  }

  await prisma.requestedPO.delete({
    where: { id: existing.id },
  });

  return { success: true, message: "Purchase order deleted successfully." };
};


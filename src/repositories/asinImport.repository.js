import prisma from "../config/prisma.js";

/**
 * Bulk create ASIN imports for a user
 */
export const bulkCreateAsinImports = async (items) => {
  return prisma.asinImport.createMany({
    data: items,
  });
};

/**
 * Bulk upsert ASIN imports for a user
 * Deletes old records with the same ASIN and inserts new ones
 */
export const bulkUpsertAsinImports = async (items, userId) => {
  if (!items || items.length === 0) return { count: 0 };

  // Deduplicate items by ASIN (last one wins)
  const uniqueItemsMap = new Map();
  const itemsWithoutAsin = [];

  for (const item of items) {
    if (item.asin && item.asin.trim()) {
      uniqueItemsMap.set(item.asin.trim().toLowerCase(), item);
    } else {
      itemsWithoutAsin.push(item);
    }
  }

  const finalItems = Array.from(uniqueItemsMap.values());
  const asinsToLower = Array.from(uniqueItemsMap.keys());

  return prisma.$transaction(async (tx) => {
    if (asinsToLower.length > 0) {
      // Find all existing records for this user
      const existingRecords = await tx.asinImport.findMany({
        where: { userId },
        select: { id: true, asin: true },
      });

      // Filter to find the ones to delete (case-insensitive match)
      const idsToDelete = existingRecords
        .filter(record => record.asin && asinsToLower.includes(record.asin.trim().toLowerCase()))
        .map(record => record.id);

      if (idsToDelete.length > 0) {
        await tx.asinImport.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });
      }
    }

    // Insert all new records
    const allItemsToCreate = [...finalItems, ...itemsWithoutAsin];
    if (allItemsToCreate.length > 0) {
      const created = await tx.asinImport.createMany({
        data: allItemsToCreate,
      });
      return { count: created.count };
    }
    return { count: 0 };
  }, {
    timeout: 30000 // Give it 30 seconds for large files
  });
};

/**
 * Get all ASIN imports for a user with optional search filtering
 */
export const getAsinImports = async ({ userId, search }) => {
  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { asin: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { rackAddress: { contains: search, mode: "insensitive" } },
            { generateBarcode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.asinImport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    }),
    prisma.asinImport.count({ where }),
  ]);

  return { items, total };
};

/**
 * Delete ASIN import by ID and user ID
 */
export const deleteAsinImportById = async (id, userId) => {
  return prisma.asinImport.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

/**
 * Update ASIN import by ID and user ID
 */
export const updateAsinImportById = async (id, userId, data) => {
  return prisma.asinImport.updateMany({
    where: {
      id,
      userId,
    },
    data,
  });
};

/**
 * Clear all ASIN imports for user
 */
export const deleteAllAsinImportsByUser = async (userId) => {
  return prisma.asinImport.deleteMany({
    where: {
      userId,
    },
  });
};

/**
 * Upsert ASIN import by userId and asin
 */
export const upsertAsinImport = async (
  { userId, asin, sku, rackAddress, generateBarcode },
  tx = prisma
) => {
  if (!asin || !asin.trim()) return null;
  const cleanAsin = asin.trim();
  const cleanSku = sku ? sku.trim() : "";
  const cleanRack = rackAddress ? rackAddress.trim() : null;
  const cleanBarcode = generateBarcode ? generateBarcode.trim() : cleanSku || cleanAsin;

  const existing = await tx.asinImport.findFirst({
    where: {
      userId,
      asin: { equals: cleanAsin, mode: "insensitive" },
    },
  });

  if (existing) {
    return await tx.asinImport.update({
      where: { id: existing.id },
      data: {
        sku: cleanSku || existing.sku,
        rackAddress: cleanRack !== null ? cleanRack : existing.rackAddress,
        generateBarcode: cleanBarcode || existing.generateBarcode,
      },
    });
  } else {
    return await tx.asinImport.create({
      data: {
        userId,
        asin: cleanAsin,
        sku: cleanSku,
        rackAddress: cleanRack,
        generateBarcode: cleanBarcode,
      },
    });
  }
};




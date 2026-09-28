import prisma from "../config/prisma.js";

/**
 * Bulk upsert Myntra imports for a user.
 * 1. Deduplicates within the uploaded sheet (last row wins).
 * 2. Scans existing database records: if duplicate records exist for the same myntraSku, deletes extra copies.
 * 3. Updates matching existing records with the latest values from the new sheet.
 * 4. Inserts any brand new SKUs.
 */
export const bulkUpsertMyntraImports = async (userId, items) => {
  if (!items || items.length === 0) {
    return {
      totalProcessed: 0,
      createdCount: 0,
      updatedCount: 0,
      duplicatesRemoved: 0,
    };
  }

  // Deduplicate items in the sheet by myntraSku (case-insensitive, last one in sheet wins)
  const incomingMap = new Map();
  for (const item of items) {
    const rawSku = item.myntraSku ? String(item.myntraSku).trim() : "";
    if (rawSku) {
      incomingMap.set(rawSku.toLowerCase(), {
        ...item,
        myntraSku: rawSku,
        userId,
      });
    }
  }

  const incomingItems = Array.from(incomingMap.values());

  return prisma.$transaction(
    async (tx) => {
      // 1. Fetch all existing records for this user, sorted newest first
      const existingRecords = await tx.myntraImport.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      // Group existing records by lowercase myntraSku to detect and eliminate any duplicates
      const existingBySku = new Map();
      const duplicateIdsToDelete = [];

      for (const rec of existingRecords) {
        if (!rec.myntraSku) continue;
        const key = rec.myntraSku.trim().toLowerCase();
        if (!existingBySku.has(key)) {
          existingBySku.set(key, rec);
        } else {
          // Extra duplicate found in DB for this SKU - mark for deletion
          duplicateIdsToDelete.push(rec.id);
        }
      }

      // Delete pre-existing duplicates if any
      if (duplicateIdsToDelete.length > 0) {
        await tx.myntraImport.deleteMany({
          where: { id: { in: duplicateIdsToDelete } },
        });
      }

      let createdCount = 0;
      let updatedCount = 0;
      const toCreate = [];
      const toUpdate = [];

      // 2. Separate incoming items into updates vs creates
      for (const item of incomingItems) {
        const key = item.myntraSku.toLowerCase();
        const existing = existingBySku.get(key);

        if (existing) {
          // Update existing record with the latest values from the sheet
          toUpdate.push({
            id: existing.id,
            data: {
              myntraSku: item.myntraSku, // Latest casing
              sellerSku:
                item.sellerSku !== undefined && item.sellerSku !== null && item.sellerSku !== ""
                  ? item.sellerSku
                  : existing.sellerSku,
              rackAddress:
                item.rackAddress !== undefined && item.rackAddress !== null && item.rackAddress !== ""
                  ? item.rackAddress
                  : existing.rackAddress,
              asin:
                item.asin !== undefined && item.asin !== null && item.asin !== ""
                  ? item.asin
                  : existing.asin,
              generatedBarcode:
                item.generatedBarcode !== undefined &&
                item.generatedBarcode !== null &&
                item.generatedBarcode !== ""
                  ? item.generatedBarcode
                  : existing.generatedBarcode,
              updatedAt: new Date(),
            },
          });
        } else {
          // Brand new SKU
          toCreate.push({
            userId,
            myntraSku: item.myntraSku,
            sellerSku: item.sellerSku || null,
            rackAddress: item.rackAddress || null,
            asin: item.asin || null,
            generatedBarcode: item.generatedBarcode || item.sellerSku || item.myntraSku,
          });
        }
      }

      // Execute updates in batches of 50
      if (toUpdate.length > 0) {
        for (let i = 0; i < toUpdate.length; i += 50) {
          const chunk = toUpdate.slice(i, i + 50);
          await Promise.all(
            chunk.map((u) =>
              tx.myntraImport.update({
                where: { id: u.id },
                data: u.data,
              })
            )
          );
        }
        updatedCount = toUpdate.length;
      }

      // Execute creates in batch
      if (toCreate.length > 0) {
        const created = await tx.myntraImport.createMany({
          data: toCreate,
        });
        createdCount = created.count;
      }

      return {
        totalProcessed: incomingItems.length,
        createdCount,
        updatedCount,
        duplicatesRemoved: duplicateIdsToDelete.length,
      };
    },
    {
      timeout: 60000,
    }
  );
};

/**
 * Get paginated or full list of Myntra imports for a user
 */
export const getMyntraImports = async (userId, { page, limit, search } = {}) => {
  const where = {
    userId,
    ...(search
      ? {
          OR: [
            { myntraSku: { contains: search, mode: "insensitive" } },
            { sellerSku: { contains: search, mode: "insensitive" } },
            { asin: { contains: search, mode: "insensitive" } },
            { generatedBarcode: { contains: search, mode: "insensitive" } },
            { rackAddress: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : null;
  const parsedLimit = limit ? Math.max(1, parseInt(limit, 10)) : null;

  const queryOptions = {
    where,
    orderBy: { createdAt: "desc" },
  };

  if (parsedPage && parsedLimit) {
    queryOptions.skip = (parsedPage - 1) * parsedLimit;
    queryOptions.take = parsedLimit;
  }

  const [items, total] = await Promise.all([
    prisma.myntraImport.findMany(queryOptions),
    prisma.myntraImport.count({ where }),
  ]);

  return {
    items,
    total,
    page: parsedPage || 1,
    limit: parsedLimit || total,
    totalPages: parsedLimit ? Math.ceil(total / parsedLimit) : 1,
  };
};

/**
 * Get all Myntra mappings for user formatted as a dictionary/map for O(1) lookups
 * Returns both a keyed object (lookup dictionary) and the raw items array
 */
export const getAllMyntraMappingsByUser = async (userId) => {
  const records = await prisma.myntraImport.findMany({
    where: { userId },
    select: {
      id: true,
      myntraSku: true,
      sellerSku: true,
      asin: true,
      generatedBarcode: true,
      rackAddress: true,
      createdAt: true,
    },
  });

  const dictionary = {};
  for (const rec of records) {
    if (rec.myntraSku) {
      const key = rec.myntraSku.trim().toLowerCase();
      dictionary[key] = {
        id: rec.id,
        myntraSku: rec.myntraSku,
        sellerSku: rec.sellerSku || "",
        asin: rec.asin || "",
        generatedBarcode: rec.generatedBarcode || rec.sellerSku || rec.myntraSku,
        rackAddress: rec.rackAddress || "",
      };
    }
  }

  return {
    mappings: dictionary,
    items: records,
    total: records.length,
  };
};

/**
 * Delete Myntra import by ID and user ID
 */
export const deleteMyntraImportById = async (id, userId) => {
  return prisma.myntraImport.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

/**
 * Clear all Myntra imports for user
 */
export const deleteAllMyntraImportsByUser = async (userId) => {
  return prisma.myntraImport.deleteMany({
    where: {
      userId,
    },
  });
};

/**
 * Update Myntra import by ID and user ID
 */
export const updateMyntraImportById = async (id, userId, data) => {
  if (data.myntraSku) {
    const trimmedSku = data.myntraSku.trim();
    // Clean up any other duplicates that already have this SKU
    await prisma.myntraImport.deleteMany({
      where: {
        userId,
        myntraSku: { equals: trimmedSku, mode: "insensitive" },
        id: { not: id },
      },
    });
  }

  return prisma.myntraImport.updateMany({
    where: {
      id,
      userId,
    },
    data,
  });
};

/**
 * Create or update single Myntra import record.
 * If myntraSku already exists for this user, updates with latest values and removes any duplicates.
 */
export const createMyntraImportRecord = async (userId, data) => {
  const trimmedSku = data.myntraSku.trim();

  // Check if a record already exists with this SKU for the user
  const existingRecords = await prisma.myntraImport.findMany({
    where: {
      userId,
      myntraSku: { equals: trimmedSku, mode: "insensitive" },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existingRecords.length > 0) {
    const [primary, ...duplicates] = existingRecords;

    // Remove any older duplicate records
    if (duplicates.length > 0) {
      await prisma.myntraImport.deleteMany({
        where: { id: { in: duplicates.map((d) => d.id) } },
      });
    }

    // Update the record with the latest values
    return prisma.myntraImport.update({
      where: { id: primary.id },
      data: {
        myntraSku: trimmedSku,
        sellerSku: data.sellerSku?.trim() || primary.sellerSku,
        asin: data.asin?.trim() || primary.asin,
        generatedBarcode:
          data.generatedBarcode?.trim() ||
          data.sellerSku?.trim() ||
          primary.generatedBarcode,
        rackAddress: data.rackAddress?.trim() || primary.rackAddress,
        updatedAt: new Date(),
      },
    });
  }

  return prisma.myntraImport.create({
    data: {
      userId,
      myntraSku: trimmedSku,
      sellerSku: data.sellerSku?.trim() || null,
      asin: data.asin?.trim() || null,
      generatedBarcode:
        data.generatedBarcode?.trim() ||
        data.sellerSku?.trim() ||
        trimmedSku,
      rackAddress: data.rackAddress?.trim() || null,
    },
  });
};

/**
 * Deduplicate all Myntra import records for a user.
 * Keeps the newest record for each lowercase myntraSku and deletes all older duplicates.
 */
export const cleanDuplicateMyntraImports = async (userId) => {
  const allRecords = await prisma.myntraImport.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const seen = new Set();
  const duplicateIds = [];

  for (const rec of allRecords) {
    if (!rec.myntraSku) continue;
    const key = rec.myntraSku.trim().toLowerCase();
    if (seen.has(key)) {
      duplicateIds.push(rec.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length > 0) {
    const result = await prisma.myntraImport.deleteMany({
      where: { id: { in: duplicateIds } },
    });
    return result.count;
  }

  return 0;
};



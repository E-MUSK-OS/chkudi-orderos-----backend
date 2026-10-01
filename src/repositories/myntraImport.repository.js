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
  const uniqueItemsMap = new Map();
  const itemsWithoutSku = [];

  for (const item of items) {
    const rawSku = item.myntraSku ? String(item.myntraSku).trim() : "";
    if (rawSku) {
      uniqueItemsMap.set(rawSku.toLowerCase(), item);
    } else {
      itemsWithoutSku.push(item);
    }
  }

  const finalItems = Array.from(uniqueItemsMap.values());
  const skusToLower = Array.from(uniqueItemsMap.keys());

  return prisma.$transaction(async (tx) => {
    let deletedCount = 0;
    if (skusToLower.length > 0) {
      // Find all existing records for this user
      const existingRecords = await tx.myntraImport.findMany({
        where: { userId },
        select: { id: true, myntraSku: true },
      });

      // Filter to find the ones to delete (case-insensitive match)
      const idsToDelete = existingRecords
        .filter(record => record.myntraSku && skusToLower.includes(record.myntraSku.trim().toLowerCase()))
        .map(record => record.id);

      if (idsToDelete.length > 0) {
        // Delete in chunks if there are too many (SQLite/Postgres limits)
        for (let i = 0; i < idsToDelete.length; i += 1000) {
          const res = await tx.myntraImport.deleteMany({
            where: { id: { in: idsToDelete.slice(i, i + 1000) } },
          });
          deletedCount += res.count;
        }
      }
    }

    // Prepare objects for creation
    const allItemsToCreate = [...finalItems, ...itemsWithoutSku].map(item => ({
      userId,
      myntraSku: item.myntraSku ? String(item.myntraSku).trim() : "",
      sellerSku: item.sellerSku || null,
      rackAddress: item.rackAddress || null,
      generateBarcode: item.generateBarcode || item.generatedBarcode || item.sellerSku || item.myntraSku || null,
    }));

    let createdCount = 0;
    if (allItemsToCreate.length > 0) {
      // Create in chunks of 1000
      for (let i = 0; i < allItemsToCreate.length; i += 1000) {
        const chunk = allItemsToCreate.slice(i, i + 1000);
        const created = await tx.myntraImport.createMany({
          data: chunk,
        });
        createdCount += created.count;
      }
    }
    
    return {
      totalProcessed: items.length,
      createdCount: createdCount,
      updatedCount: deletedCount, // We report deleted ones as updated since they were replaced
      duplicatesRemoved: deletedCount, 
    };
  }, {
    timeout: 30000 // Give it 30 seconds for large files
  });
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
            { generateBarcode: { contains: search, mode: "insensitive" } },
            { rackAddress: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const parsedPage = page ? Math.max(1, parseInt(page, 10)) : null;
  const parsedLimit = limit ? Math.max(1, parseInt(limit, 10)) : null;

  const queryOptions = {
    where,
    select: {
      id: true,
      myntraSku: true,
      sellerSku: true,
      generateBarcode: true,
      rackAddress: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
    },
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
      generateBarcode: true,
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
        generateBarcode: rec.generateBarcode || rec.sellerSku || rec.myntraSku,
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
    select: {
      id: true,
      myntraSku: true,
      sellerSku: true,
      rackAddress: true,
      generateBarcode: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const barcodeVal = (data.generateBarcode !== undefined ? data.generateBarcode : data.generatedBarcode)?.trim();

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
        generateBarcode:
          barcodeVal ||
          data.sellerSku?.trim() ||
          primary.generateBarcode,
        rackAddress: data.rackAddress?.trim() || primary.rackAddress,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        myntraSku: true,
        sellerSku: true,
        generateBarcode: true,
        rackAddress: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  return prisma.myntraImport.create({
    data: {
      userId,
      myntraSku: trimmedSku,
      sellerSku: data.sellerSku?.trim() || null,
      generateBarcode:
        barcodeVal ||
        data.sellerSku?.trim() ||
        trimmedSku,
      rackAddress: data.rackAddress?.trim() || null,
    },
    select: {
      id: true,
      myntraSku: true,
      sellerSku: true,
      generateBarcode: true,
      rackAddress: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
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
    select: {
      id: true,
      myntraSku: true,
    },
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



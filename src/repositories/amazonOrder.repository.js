import prisma from "../config/prisma.js";
import { getIstDate, calculateSeventhDay6Pm } from "./amazonBatch.repository.js";

// In-memory mutex map to serialize concurrent print/save requests per user and AWB/OrderId
const saveLocks = new Map();

/**
 * Bulk upsert / save printed Amazon orders for a user.
 * Sets 7 days expiration timestamp (expiresAt: 6:00 PM on the 7th day in IST).
 * Preserves packingScanStatus if already SCANNED unless explicitly reprinted.
 */
export const savePrintedAmazonOrders = async (userId, orders, batchId) => {
  const now = new Date();
  const istNow = getIstDate(now);
  const expiresAt = calculateSeventhDay6Pm(now);

  // Verify batchId exists in DB before using to prevent Foreign Key constraint violation (P2003)
  let verifiedBatchId = null;
  if (batchId) {
    try {
      const batchRecord = await prisma.amazonProcessBatch.findFirst({
        where: { id: String(batchId), userId },
        select: { id: true },
      });
      if (batchRecord) {
        verifiedBatchId = batchRecord.id;
      }
    } catch {
      verifiedBatchId = null;
    }
  }

  // Pre-fetch candidate records in one batch query to eliminate N+1 loop (Issue #6)
  const allCleanAwbs = [];
  const allCleanOrderIds = [];
  for (const item of orders) {
    const cleanOrderId = (item.orderId || item.orderNumber || "").trim();
    const cleanAwb = (item.awb || "").trim();
    if (cleanAwb && cleanAwb.length >= 6 && cleanAwb.toUpperCase() !== "N/A" && cleanAwb !== "-") {
      allCleanAwbs.push(cleanAwb);
    }
    if (cleanOrderId && cleanOrderId.toUpperCase() !== "N/A" && cleanOrderId !== "-") {
      allCleanOrderIds.push(cleanOrderId);
    }
  }

  let preloadedOrders = [];
  if (allCleanAwbs.length > 0 || allCleanOrderIds.length > 0) {
    const orConditions = [];
    if (allCleanAwbs.length > 0) {
      orConditions.push({ awb: { in: allCleanAwbs, mode: "insensitive" } });
    }
    if (allCleanOrderIds.length > 0) {
      orConditions.push({ orderId: { in: allCleanOrderIds, mode: "insensitive" } });
    }
    try {
      preloadedOrders = await prisma.amazonOrder.findMany({
        where: {
          userId,
          OR: orConditions,
        },
        orderBy: [
          { updatedAt: "desc" },
          { createdAt: "desc" },
        ],
      });
    } catch (e) {
      console.warn("Failed to prefetch existing orders in batch:", e);
    }
  }

  const results = [];
  const processedOrderKeys = new Set();

  for (const item of orders) {
    const cleanOrderId = (item.orderId || item.orderNumber || "").trim();
    const cleanAwb = (item.awb || "").trim();
    const cleanInvoice = (item.invoice || item.pdfInvoice || item.zplInvoice || "N/A").trim();
    const cleanAsin = (item.asin || "").trim();
    const cleanSellerSku = (item.sellerSku || "").trim();
    const cleanCustomer = (item.customer || "").trim();
    const isExplicitPrint = item.isExplicitPrint === true;

    const hasValidOrderId = cleanOrderId && cleanOrderId.toUpperCase() !== "N/A" && cleanOrderId !== "-";
    const hasValidAwb =
      cleanAwb &&
      cleanAwb.length >= 6 &&
      cleanAwb.toUpperCase() !== "N/A" &&
      cleanAwb !== "-" &&
      !/^\d{3}-\d{7}-\d{7}$/.test(cleanAwb) &&
      !/^B[0-9A-Z]{9}$/i.test(cleanAwb);

    // If neither valid order ID nor valid AWB is present, skip
    if (!hasValidOrderId && !hasValidAwb) continue;

    // Deduplicate within the same batch payload to avoid duplicate processing
    const itemKey = hasValidAwb ? `AWB:${cleanAwb.toUpperCase()}` : `ORDER:${cleanOrderId.toUpperCase()}`;
    if (processedOrderKeys.has(itemKey)) continue;
    processedOrderKeys.add(itemKey);

    // Per-user per-item mutex lock to serialize concurrent multi-tab or multi-request operations
    const lockKey = `${userId}:${itemKey}`;
    const previousLock = saveLocks.get(lockKey) || Promise.resolve();

    let releaseLock;
    const currentLock = new Promise((resolve) => {
      releaseLock = resolve;
    });
    saveLocks.set(lockKey, currentLock);

    try {
      await previousLock;

      // 1. Search for existing records strictly by AWB first (check preloaded cache, then DB fallback)
      let existingOrders = [];
      if (hasValidAwb) {
        // Fast in-memory check against preloaded cache
        existingOrders = preloadedOrders.filter((o) => {
          const dbAwb = (o.awb || "").trim().toLowerCase();
          if (dbAwb === cleanAwb.toLowerCase()) return true;
          const tokens = dbAwb.split(/[\r\n]+|\s+\/\s+|\s*,\s*|\s+/).map((t) => t.trim().toLowerCase());
          return tokens.includes(cleanAwb.toLowerCase());
        });

        // Fallback query if not found in preloaded cache
        if (existingOrders.length === 0) {
          const orConditions = [
            { awb: { equals: cleanAwb, mode: "insensitive" } },
          ];
          if (cleanAwb.length >= 8) {
            orConditions.push({ awb: { contains: cleanAwb, mode: "insensitive" } });
          }

          const candidates = await prisma.amazonOrder.findMany({
            where: {
              userId,
              OR: orConditions,
            },
            orderBy: [
              { updatedAt: "desc" },
              { createdAt: "desc" },
            ],
          });

          existingOrders = candidates.filter((o) => {
            const dbAwb = (o.awb || "").trim().toLowerCase();
            if (dbAwb === cleanAwb.toLowerCase()) return true;
            const tokens = dbAwb.split(/[\r\n]+|\s+\/\s+|\s*,\s*|\s+/).map((t) => t.trim().toLowerCase());
            return tokens.includes(cleanAwb.toLowerCase());
          });
        }
      }

      // 2. Fallback to Order ID ONLY if no record was found by AWB AND existing record has NO valid AWB
      // This protects split shipments (same Order ID, different AWBs) from overwriting each other!
      if (existingOrders.length === 0 && hasValidOrderId) {
        // Fast in-memory check against preloaded cache
        existingOrders = preloadedOrders.filter((o) => {
          const dbOrder = (o.orderId || "").trim().toLowerCase();
          const dbAwb = (o.awb || "").trim().toUpperCase();
          const isAwbEmpty = !dbAwb || dbAwb === "N/A" || dbAwb === "-";
          return dbOrder === cleanOrderId.toLowerCase() && isAwbEmpty;
        });

        if (existingOrders.length === 0) {
          existingOrders = await prisma.amazonOrder.findMany({
            where: {
              userId,
              orderId: { equals: cleanOrderId, mode: "insensitive" },
              awb: { in: ["N/A", "-", ""] },
            },
            orderBy: [
              { updatedAt: "desc" },
              { createdAt: "desc" },
            ],
          });
        }
      }

      if (existingOrders && existingOrders.length > 0) {
        const primaryRecord = existingOrders[0];

        // Purge any legacy duplicates if more than 1 record existed previously
        if (existingOrders.length > 1) {
          const duplicateIds = existingOrders.slice(1).map((o) => o.id);
          try {
            await prisma.amazonOrder.deleteMany({
              where: { id: { in: duplicateIds } },
            });
          } catch (delErr) {
            console.warn("Failed to delete legacy duplicate amazonOrder records:", delErr);
          }
        }

        // Status update logic:
        // If explicit print by user: reset to PENDING (for re-packing/re-scanning)
        // If passive background sync: PRESERVE existing status (never reset SCANNED to PENDING!)
        const targetStatus = isExplicitPrint
          ? "PENDING"
          : (primaryRecord.packingScanStatus || "PENDING");

        const updated = await prisma.amazonOrder.update({
          where: { id: primaryRecord.id },
          data: {
            invoice: cleanInvoice && cleanInvoice !== "N/A" ? cleanInvoice : primaryRecord.invoice,
            orderId: hasValidOrderId ? cleanOrderId : primaryRecord.orderId,
            awb: hasValidAwb ? cleanAwb : primaryRecord.awb,
            asin: cleanAsin && cleanAsin !== "N/A" ? cleanAsin : primaryRecord.asin,
            sellerSku: cleanSellerSku && cleanSellerSku !== "N/A" ? cleanSellerSku : primaryRecord.sellerSku,
            customer: cleanCustomer && cleanCustomer !== "N/A" ? cleanCustomer : primaryRecord.customer,
            packingScanStatus: targetStatus,
            batchId: verifiedBatchId || primaryRecord.batchId || null,
            createdAt: isExplicitPrint ? istNow : primaryRecord.createdAt,
            updatedAt: istNow,
            expiresAt,
          },
        });
        results.push(updated);

        // Update preloaded cache in memory
        const cacheIdx = preloadedOrders.findIndex((o) => o.id === updated.id);
        if (cacheIdx >= 0) {
          preloadedOrders[cacheIdx] = updated;
        } else {
          preloadedOrders.push(updated);
        }
      } else {
        // Create fresh record only when no existing record exists
        try {
          const created = await prisma.amazonOrder.create({
            data: {
              userId,
              invoice: cleanInvoice || "N/A",
              orderId: cleanOrderId || "N/A",
              awb: cleanAwb || "N/A",
              asin: cleanAsin || "N/A",
              sellerSku: cleanSellerSku || "N/A",
              customer: cleanCustomer || "N/A",
              packingScanStatus: "PENDING",
              batchId: verifiedBatchId || null,
              createdAt: istNow,
              updatedAt: istNow,
              expiresAt,
            },
          });
          results.push(created);
          preloadedOrders.push(created);
        } catch (createErr) {
          // Issue #5: Handle P2002 unique constraint collision gracefully (race condition fallback)
          if (createErr.code === "P2002") {
            const existing = await prisma.amazonOrder.findFirst({
              where: { userId, awb: cleanAwb },
            });
            if (existing) {
              const targetStatus = isExplicitPrint ? "PENDING" : (existing.packingScanStatus || "PENDING");
              const updated = await prisma.amazonOrder.update({
                where: { id: existing.id },
                data: {
                  invoice: cleanInvoice && cleanInvoice !== "N/A" ? cleanInvoice : existing.invoice,
                  orderId: hasValidOrderId ? cleanOrderId : existing.orderId,
                  asin: cleanAsin && cleanAsin !== "N/A" ? cleanAsin : existing.asin,
                  sellerSku: cleanSellerSku && cleanSellerSku !== "N/A" ? cleanSellerSku : existing.sellerSku,
                  customer: cleanCustomer && cleanCustomer !== "N/A" ? cleanCustomer : existing.customer,
                  packingScanStatus: targetStatus,
                  batchId: verifiedBatchId || existing.batchId || null,
                  createdAt: isExplicitPrint ? istNow : existing.createdAt,
                  updatedAt: istNow,
                  expiresAt,
                },
              });
              results.push(updated);
            }
          } else {
            throw createErr;
          }
        }
      }
    } finally {
      releaseLock();
      if (saveLocks.get(lockKey) === currentLock) {
        saveLocks.delete(lockKey);
      }
    }
  }

  return results;
};

/**
 * Get Amazon orders with filters, search, date, and pagination
 */
export const getAmazonOrders = async ({
  userId,
  search = "",
  packingScanStatus,
  date,
  page = 1,
  limit = 50,
  batchId,
}) => {
  const skip = (Math.max(1, page) - 1) * limit;

  let dateFilter = null;
  if (date) {
    const parts = String(date).split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      // getIstDate stores literal IST timestamps (via getTime() + 5.5h) into PostgreSQL.
      // Therefore, the date filter strictly matches the full 24 hours of that selected IST day:
      // 00:00:00.000 to 23:59:59.999.
      const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
      dateFilter = {
        gte: startUtc,
        lte: endUtc,
      };
    } else {
      const parsed = new Date(date);
      dateFilter = {
        gte: new Date(new Date(parsed).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(parsed).setHours(23, 59, 59, 999)),
      };
    }
  }

  const baseWhere = {
    userId,
    ...(batchId ? { batchId } : {}),
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const where = {
    ...baseWhere,
    ...(packingScanStatus && packingScanStatus !== "ALL"
      ? { packingScanStatus }
      : {}),
    ...(search
      ? {
          OR: [
            { invoice: { contains: search, mode: "insensitive" } },
            { orderId: { contains: search, mode: "insensitive" } },
            { awb: { contains: search, mode: "insensitive" } },
            { asin: { contains: search, mode: "insensitive" } },
            { sellerSku: { contains: search, mode: "insensitive" } },
            { customer: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total, pendingCount, scannedCount] = await Promise.all([
    prisma.amazonOrder.findMany({
      where,
      orderBy: [
        { packingScanStatus: "asc" }, // "PENDING" appears before "SCANNED"
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: limit,
    }),
    prisma.amazonOrder.count({ where }),
    prisma.amazonOrder.count({
      where: {
        ...baseWhere,
        packingScanStatus: "PENDING",
      },
    }),
    prisma.amazonOrder.count({
      where: {
        ...baseWhere,
        packingScanStatus: "SCANNED",
      },
    }),
  ]);

  return {
    orders,
    total,
    summary: {
      total: pendingCount + scannedCount,
      pending: pendingCount,
      scanned: scannedCount,
    },
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Update packingScanStatus strictly by Amazon AWB tracking barcode
 */
export const updatePackingScanStatusByAwb = async (userId, awb, status = "SCANNED") => {
  const cleanAwb = (awb || "").trim();
  if (!cleanAwb || cleanAwb.toUpperCase() === "N/A" || cleanAwb === "-") return null;

  // STRICT REQUIREMENT: Only Amazon AWB tracking barcodes are valid!
  // Reject Amazon Order ID pattern (e.g. 402-1234567-1234567) or ASIN (B0...)
  if (/^\d{3}-\d{7}-\d{7}$/.test(cleanAwb) || /^B[0-9A-Z]{9}$/i.test(cleanAwb)) {
    return null;
  }

  // 1. Find all matching orders (case-insensitive exact match or contains match)
  const orConditions = [
    { awb: { equals: cleanAwb, mode: "insensitive" } },
  ];
  if (cleanAwb.length >= 8) {
    orConditions.push({ awb: { contains: cleanAwb, mode: "insensitive" } });
  }

  const candidates = await prisma.amazonOrder.findMany({
    where: {
      userId,
      OR: orConditions,
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Strict token matching to avoid substring clashes (e.g. "12345678" vs "1234567890")
  const matchingOrders = candidates.filter((o) => {
    const dbAwb = (o.awb || "").trim().toLowerCase();
    if (dbAwb === cleanAwb.toLowerCase()) return true;
    const tokens = dbAwb.split(/[\r\n]+|\s+\/\s+|\s*,\s*|\s+/).map((t) => t.trim().toLowerCase());
    return tokens.includes(cleanAwb.toLowerCase());
  });

  if (!matchingOrders || matchingOrders.length === 0) return null;

  // If duplicate records exist in the database from past runs, purge them and maintain strictly one clean record
  let order = matchingOrders[0];
  if (matchingOrders.length > 1) {
    // If any record was already SCANNED, prioritize that record as the primary
    const alreadyScannedRecord = matchingOrders.find((o) => o.packingScanStatus === "SCANNED");
    if (alreadyScannedRecord) {
      order = alreadyScannedRecord;
    }
    const duplicateIds = matchingOrders.filter((o) => o.id !== order.id).map((o) => o.id);
    if (duplicateIds.length > 0) {
      try {
        await prisma.amazonOrder.deleteMany({
          where: { id: { in: duplicateIds } },
        });
      } catch (delErr) {
        console.warn("Failed to delete duplicate amazonOrder records during scan:", delErr);
      }
    }
  }

  // If already scanned, return alreadyScanned error
  if (order.packingScanStatus === status) {
    return { alreadyScanned: true, order };
  }

  return prisma.amazonOrder.update({
    where: { id: order.id },
    data: {
      packingScanStatus: status,
      updatedAt: getIstDate(new Date()),
    },
  });
};

/**
 * Update packingScanStatus by ID
 */
export const updatePackingScanStatusById = async (userId, id, status = "SCANNED") => {
  const order = await prisma.amazonOrder.findFirst({
    where: { id, userId },
  });

  if (!order) return null;

  return prisma.amazonOrder.update({
    where: { id },
    data: { packingScanStatus: status },
  });
};

/**
 * Delete orders older than 7 days (called by cron)
 */
export const deleteExpiredAmazonOrders = async () => {
  const istNow = getIstDate(new Date());
  const sevenDaysAgoIst = new Date(istNow.getTime() - 7 * 24 * 60 * 60 * 1000);
  return prisma.amazonOrder.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: istNow } },
        { createdAt: { lt: sevenDaysAgoIst } },
      ],
    },
  });
};

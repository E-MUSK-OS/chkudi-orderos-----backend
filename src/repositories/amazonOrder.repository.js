import prisma from "../config/prisma.js";
import { getIstDate, calculateSeventhDay6Pm } from "./amazonBatch.repository.js";

/**
 * Bulk upsert / save printed Amazon orders for a user.
 * Sets 7 days expiration timestamp (expiresAt: 6:00 PM on the 7th day in IST).
 * Preserves packingScanStatus if already SCANNED.
 */
export const savePrintedAmazonOrders = async (userId, orders) => {
  const now = new Date();
  const istNow = getIstDate(now);
  const expiresAt = calculateSeventhDay6Pm(now);

  const results = [];

  for (const item of orders) {
    const cleanOrderId = (item.orderId || item.orderNumber || "").trim();
    const cleanAwb = (item.awb || "").trim();
    const cleanInvoice = (item.invoice || item.pdfInvoice || item.zplInvoice || "N/A").trim();
    const cleanAsin = (item.asin || "").trim();
    const cleanSellerSku = (item.sellerSku || "").trim();
    const cleanCustomer = (item.customer || "").trim();
    const status = item.packingScanStatus === "SCANNED" ? "SCANNED" : "PENDING";

    const hasValidOrderId = cleanOrderId && cleanOrderId.toUpperCase() !== "N/A" && cleanOrderId !== "-";
    const hasValidAwb = cleanAwb && cleanAwb.toUpperCase() !== "N/A" && cleanAwb !== "-";

    // If neither valid order ID nor valid AWB is present, skip
    if (!hasValidOrderId && !hasValidAwb) continue;

    // Verify print strictly by AWB Tracking (not Amazon order id because same person can have multiple orders)
    let existing = null;
    if (hasValidAwb) {
      existing = await prisma.amazonOrder.findFirst({
        where: {
          userId,
          awb: cleanAwb,
        },
      });
    } else if (hasValidOrderId) {
      existing = await prisma.amazonOrder.findFirst({
        where: {
          userId,
          orderId: cleanOrderId,
          awb: { in: ["N/A", "-", ""] },
        },
      });
    }

    if (existing) {
      // Reset status to PENDING upon reprint (requires re-scanning new label) and refresh print timestamps
      const updated = await prisma.amazonOrder.update({
        where: { id: existing.id },
        data: {
          invoice: cleanInvoice && cleanInvoice !== "N/A" ? cleanInvoice : existing.invoice,
          orderId: hasValidOrderId ? cleanOrderId : existing.orderId,
          awb: hasValidAwb ? cleanAwb : existing.awb,
          asin: cleanAsin && cleanAsin !== "N/A" ? cleanAsin : existing.asin,
          sellerSku: cleanSellerSku && cleanSellerSku !== "N/A" ? cleanSellerSku : existing.sellerSku,
          customer: cleanCustomer && cleanCustomer !== "N/A" ? cleanCustomer : existing.customer,
          packingScanStatus: "PENDING",
          createdAt: istNow,
          updatedAt: istNow,
          expiresAt,
        },
      });
      results.push(updated);
    } else {
      // Create fresh record
      const created = await prisma.amazonOrder.create({
        data: {
          userId,
          invoice: cleanInvoice || "N/A",
          orderId: cleanOrderId || "N/A",
          awb: cleanAwb || "N/A",
          asin: cleanAsin || "N/A",
          sellerSku: cleanSellerSku || "N/A",
          customer: cleanCustomer || "N/A",
          packingScanStatus: status,
          createdAt: istNow,
          updatedAt: istNow,
          expiresAt,
        },
      });
      results.push(created);
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

  // 1. Try exact match strictly on awb (case-insensitive)
  let order = await prisma.amazonOrder.findFirst({
    where: {
      userId,
      awb: { equals: cleanAwb, mode: "insensitive" },
    },
  });

  // 2. If not found, try contains match strictly on awb (handles multi-AWB labels)
  if (!order && cleanAwb.length >= 8) {
    order = await prisma.amazonOrder.findFirst({
      where: {
        userId,
        awb: { contains: cleanAwb, mode: "insensitive" },
      },
    });
  }

  if (!order) return null;

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

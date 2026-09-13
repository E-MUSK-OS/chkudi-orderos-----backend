import prisma from "../config/prisma.js";

/**
 * Bulk upsert / save printed Amazon orders for a user.
 * Sets 7 days expiration timestamp (expiresAt).
 * Preserves packingScanStatus if already SCANNED.
 */
export const savePrintedAmazonOrders = async (userId, orders) => {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SEVEN_DAYS_MS);

  const results = [];

  for (const item of orders) {
    const cleanOrderId = (item.orderId || item.orderNumber || "").trim();
    const cleanAwb = (item.awb || "").trim();
    const cleanInvoice = (item.invoice || item.pdfInvoice || item.zplInvoice || "N/A").trim();
    const cleanAsin = (item.asin || "").trim();
    const cleanSellerSku = (item.sellerSku || "").trim();
    const cleanCustomer = (item.customer || "").trim();
    const status = item.packingScanStatus === "SCANNED" ? "SCANNED" : "PENDING";

    if (!cleanOrderId && !cleanAwb) continue;

    // Check if record already exists for this user and orderId/awb
    const existing = await prisma.amazonOrder.findFirst({
      where: {
        userId,
        OR: [
          ...(cleanOrderId ? [{ orderId: cleanOrderId }] : []),
          ...(cleanAwb ? [{ awb: cleanAwb }] : []),
        ],
      },
    });

    if (existing) {
      // If already exists, update details and extend expiresAt, but preserve SCANNED status if already scanned
      const updated = await prisma.amazonOrder.update({
        where: { id: existing.id },
        data: {
          invoice: cleanInvoice || existing.invoice,
          orderId: cleanOrderId || existing.orderId,
          awb: cleanAwb || existing.awb,
          asin: cleanAsin || existing.asin,
          sellerSku: cleanSellerSku || existing.sellerSku,
          customer: cleanCustomer || existing.customer,
          // Preserve SCANNED if it was already marked as SCANNED
          packingScanStatus: existing.packingScanStatus === "SCANNED" ? "SCANNED" : status,
          expiresAt,
        },
      });
      results.push(updated);
    } else {
      // Create fresh record
      const created = await prisma.amazonOrder.create({
        data: {
          userId,
          invoice: cleanInvoice,
          orderId: cleanOrderId,
          awb: cleanAwb,
          asin: cleanAsin,
          sellerSku: cleanSellerSku,
          customer: cleanCustomer,
          packingScanStatus: status,
          expiresAt,
        },
      });
      results.push(created);
    }
  }

  return results;
};

/**
 * Get Amazon orders with filters, search, and pagination
 */
export const getAmazonOrders = async ({
  userId,
  search = "",
  packingScanStatus,
  page = 1,
  limit = 50,
}) => {
  const skip = (Math.max(1, page) - 1) * limit;

  const where = {
    userId,
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

  const [orders, total] = await Promise.all([
    prisma.amazonOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.amazonOrder.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Update packingScanStatus by AWB or Order ID
 */
export const updatePackingScanStatusByAwb = async (userId, awb, status = "SCANNED") => {
  const cleanAwb = awb.trim();
  const order = await prisma.amazonOrder.findFirst({
    where: {
      userId,
      OR: [{ awb: cleanAwb }, { orderId: cleanAwb }],
    },
  });

  if (!order) return null;

  return prisma.amazonOrder.update({
    where: { id: order.id },
    data: { packingScanStatus: status },
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.amazonOrder.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { createdAt: { lt: sevenDaysAgo } },
      ],
    },
  });
};

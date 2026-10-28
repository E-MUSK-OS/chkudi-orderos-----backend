import prisma from "../config/prisma.js";

export const getUserChallanPrefix = (user) => {
  if (!user) return "PURC";

  let source = "";
  if (user.fullName && user.fullName.trim()) {
    const firstWord = user.fullName.trim().split(/\s+/)[0];
    source = firstWord;
  } else if (user.username && user.username.trim()) {
    const firstWord = user.username.trim().split(/[_\s@.]+/)[0];
    source = firstWord;
  } else if (user.email && user.email.includes("@")) {
    source = user.email.split("@")[0].trim();
  }

  const cleaned = source.replace(/[^a-zA-Z0-9]/g, "");
  if (!cleaned) return "PURC";

  return cleaned.slice(0, 4).toUpperCase();
};

export const getNextPurchaseChallanNoRepo = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, fullName: true },
  });

  const prefix = getUserChallanPrefix(user);

  const existingChallans = await prisma.purchaseChallan.findMany({
    where: { userId },
    select: { challanNo: true },
  });

  const existingNosUpper = new Set(
    existingChallans.map((c) => (c.challanNo || "").trim().toUpperCase())
  );

  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`, "i");

  let maxSeq = 0;
  for (const c of existingChallans) {
    if (!c.challanNo) continue;
    const match = c.challanNo.trim().match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  while (existingNosUpper.has(`${prefix}-${nextSeq}`.toUpperCase())) {
    nextSeq++;
  }

  return `${prefix}-${nextSeq}`;
};

export const createPurchaseChallanRepo = async (userId, data, items) => {
  const totalOrderedQty = items.reduce((sum, item) => sum + (Number(item.orderedQty) || 0), 0);
  const totalReceivedQty = items.reduce((sum, item) => sum + (Number(item.receivedQty) || 0), 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.receivedQty) || 0) * (Number(item.rate) || 0),
    0
  );

  return await prisma.purchaseChallan.create({
    data: {
      userId,
      supplierId: data.supplierId || null,
      supplierName: data.supplierName,
      contactNo: data.contactNo || null,
      challanNo: data.challanNo,
      partyChallanNo: data.partyChallanNo || null,
      challanDate: data.challanDate ? new Date(data.challanDate) : new Date(),
      partyChallanDate: data.partyChallanDate ? new Date(data.partyChallanDate) : null,
      challanFor: data.challanFor || "Purchase",
      stockIn: data.stockIn || "General",
      courierPartner: data.courierPartner || null,
      lrNo: data.lrNo || null,
      receivedBy: data.receivedBy || "Ramesh",
      checkedBy: data.checkedBy || "Ramesh",
      preparedBy: data.preparedBy || "Ramesh",
      totalOrderedQty,
      totalReceivedQty,
      totalAmount,
      invoiceStatus: data.invoiceStatus || "Pending",
      items: {
        create: items.map((item, idx) => ({
          itemNo: item.itemNo || idx + 1,
          sku: item.sku,
          name: item.name,
          orderedQty: Number(item.orderedQty) || 0,
          receivedQty: Number(item.receivedQty) || 0,
          rate: Number(item.rate) || 0,
          amount: (Number(item.receivedQty) || 0) * (Number(item.rate) || 0),
          poNo: item.poNo || null,
          partyChallanNo: item.partyChallanNo || null,
          receivedDate: item.receivedDate || null,
          remarks: item.remarks || null,
          printBarcode: item.printBarcode !== false,
        })),
      },
    },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      supplier: true,
    },
  });
};

export const findPurchaseChallansRepo = async (userId, filters = {}) => {
  const {
    challanNo,
    partyChallanNo,
    supplierName,
    productSku,
    startDate,
    endDate,
    invoiceStatus,
    challanFor,
    stockIn,
    page = 1,
    limit = 50,
  } = filters;

  const parseFilterDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }

    const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }

    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  };

  let challanDateFilter = undefined;
  const parsedStart = parseFilterDate(startDate);
  const parsedEnd = parseFilterDate(endDate);

  if (parsedStart && parsedEnd) {
    const startOfDay = new Date(parsedStart);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedEnd);
    endOfDay.setUTCHours(23, 59, 59, 999);

    challanDateFilter = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (parsedStart) {
    const startOfDay = new Date(parsedStart);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedStart);
    endOfDay.setUTCHours(23, 59, 59, 999);

    challanDateFilter = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (parsedEnd) {
    const endOfDay = new Date(parsedEnd);
    endOfDay.setUTCHours(23, 59, 59, 999);

    challanDateFilter = {
      lte: endOfDay,
    };
  }

  const where = {
    userId,
    ...(challanNo ? { challanNo: { contains: challanNo, mode: "insensitive" } } : {}),
    ...(partyChallanNo
      ? {
          OR: [
            { partyChallanNo: { contains: partyChallanNo, mode: "insensitive" } },
            {
              items: {
                some: { partyChallanNo: { contains: partyChallanNo, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
    ...(supplierName ? { supplierName: { contains: supplierName, mode: "insensitive" } } : {}),
    ...(invoiceStatus && invoiceStatus !== "All"
      ? {
          invoiceStatus:
            invoiceStatus === "Pending"
              ? { in: ["Pending", "Not Invoiced"] }
              : invoiceStatus === "Complete"
              ? { in: ["Complete", "Invoiced"] }
              : invoiceStatus,
        }
      : {}),
    ...(challanFor && challanFor !== "All" ? { challanFor } : {}),
    ...(stockIn && stockIn !== "All" ? { stockIn } : {}),
    ...(challanDateFilter ? { challanDate: challanDateFilter } : {}),
    ...(productSku
      ? {
          items: {
            some: {
              sku: { contains: productSku, mode: "insensitive" },
            },
          },
        }
      : {}),
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [challans, total] = await Promise.all([
    prisma.purchaseChallan.findMany({
      where,
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        supplier: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.purchaseChallan.count({ where }),
  ]);

  return { challans, total, page: Number(page), limit: Number(limit) };
};

export const findPurchaseChallanByIdRepo = async (id, userId) => {
  return await prisma.purchaseChallan.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      supplier: true,
    },
  });
};

export const updatePurchaseChallanRepo = async (id, userId, data, items) => {
  const totalOrderedQty = items
    ? items.reduce((sum, item) => sum + (Number(item.orderedQty) || 0), 0)
    : undefined;
  const totalReceivedQty = items
    ? items.reduce((sum, item) => sum + (Number(item.receivedQty) || 0), 0)
    : undefined;
  const totalAmount = items
    ? items.reduce(
        (sum, item) => sum + (Number(item.receivedQty) || 0) * (Number(item.rate) || 0),
        0
      )
    : undefined;

  return await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.purchaseChallanItem.deleteMany({
        where: { challanId: id },
      });
    }

    return await tx.purchaseChallan.update({
      where: { id, userId },
      data: {
        ...(data.supplierId !== undefined ? { supplierId: data.supplierId } : {}),
        ...(data.supplierName !== undefined ? { supplierName: data.supplierName } : {}),
        ...(data.contactNo !== undefined ? { contactNo: data.contactNo } : {}),
        ...(data.partyChallanNo !== undefined ? { partyChallanNo: data.partyChallanNo } : {}),
        ...(data.challanDate ? { challanDate: new Date(data.challanDate) } : {}),
        ...(data.partyChallanDate !== undefined
          ? {
              partyChallanDate: data.partyChallanDate ? new Date(data.partyChallanDate) : null,
            }
          : {}),
        ...(data.challanFor !== undefined ? { challanFor: data.challanFor } : {}),
        ...(data.stockIn !== undefined ? { stockIn: data.stockIn } : {}),
        ...(data.courierPartner !== undefined ? { courierPartner: data.courierPartner } : {}),
        ...(data.lrNo !== undefined ? { lrNo: data.lrNo } : {}),
        ...(data.receivedBy !== undefined ? { receivedBy: data.receivedBy } : {}),
        ...(data.checkedBy !== undefined ? { checkedBy: data.checkedBy } : {}),
        ...(data.preparedBy !== undefined ? { preparedBy: data.preparedBy } : {}),
        ...(data.invoiceStatus !== undefined ? { invoiceStatus: data.invoiceStatus } : {}),
        ...(totalOrderedQty !== undefined ? { totalOrderedQty } : {}),
        ...(totalReceivedQty !== undefined ? { totalReceivedQty } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(items
          ? {
              items: {
                create: items.map((item, idx) => ({
                  itemNo: item.itemNo || idx + 1,
                  sku: item.sku,
                  name: item.name,
                  orderedQty: Number(item.orderedQty) || 0,
                  receivedQty: Number(item.receivedQty) || 0,
                  rate: Number(item.rate) || 0,
                  amount: (Number(item.receivedQty) || 0) * (Number(item.rate) || 0),
                  poNo: item.poNo || null,
                  partyChallanNo: item.partyChallanNo || null,
                  receivedDate: item.receivedDate || null,
                  remarks: item.remarks || null,
                  printBarcode: item.printBarcode !== false,
                })),
              },
            }
          : {}),
      },
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        supplier: true,
      },
    });
  });
};

export const deletePurchaseChallanRepo = async (id, userId) => {
  return await prisma.purchaseChallan.delete({
    where: {
      id,
      userId,
    },
  });
};

export const searchProductSkusRepo = async (userId, search = "") => {
  const query = (search || "").trim();

  if (!query) {
    const [products, myntraItems, asinItems] = await Promise.all([
      prisma.product.findMany({
        where: { userId, isActive: true },
        take: 10,
        select: { id: true, masterSku: true, productName: true, mrp: true },
      }),
      prisma.myntraImport.findMany({
        where: { userId },
        take: 10,
        select: { sellerSku: true },
      }),
      prisma.asinImport.findMany({
        where: { userId },
        take: 10,
        select: { sku: true },
      }),
    ]);

    const results = [];
    const seen = new Set();

    for (const p of products) {
      if (p.masterSku && !seen.has(p.masterSku.toUpperCase())) {
        seen.add(p.masterSku.toUpperCase());
        results.push({
          sku: p.masterSku,
          name: p.productName || "",
          rate: p.mrp || 0,
        });
      }
    }

    for (const m of myntraItems) {
      if (m.sellerSku && !seen.has(m.sellerSku.toUpperCase())) {
        seen.add(m.sellerSku.toUpperCase());
        results.push({
          sku: m.sellerSku,
          name: "",
          rate: 0,
        });
      }
    }

    for (const a of asinItems) {
      if (a.sku && !seen.has(a.sku.toUpperCase())) {
        seen.add(a.sku.toUpperCase());
        results.push({
          sku: a.sku,
          name: "",
          rate: 0,
        });
      }
    }

    return results.slice(0, 20);
  }

  const [products, myntraItems, asinItems] = await Promise.all([
    prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { masterSku: { contains: query, mode: "insensitive" } },
          { productName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
      select: { id: true, masterSku: true, productName: true, mrp: true },
    }),
    prisma.myntraImport.findMany({
      where: {
        userId,
        sellerSku: { contains: query, mode: "insensitive" },
      },
      take: 20,
      select: { sellerSku: true },
    }),
    prisma.asinImport.findMany({
      where: {
        userId,
        sku: { contains: query, mode: "insensitive" },
      },
      take: 20,
      select: { sku: true },
    }),
  ]);

  const results = [];
  const seen = new Set();

  for (const p of products) {
    if (p.masterSku && !seen.has(p.masterSku.toUpperCase())) {
      seen.add(p.masterSku.toUpperCase());
      results.push({
        sku: p.masterSku,
        name: p.productName || "",
        rate: p.mrp || 0,
      });
    }
  }

  for (const m of myntraItems) {
    if (m.sellerSku && !seen.has(m.sellerSku.toUpperCase())) {
      seen.add(m.sellerSku.toUpperCase());
      results.push({
        sku: m.sellerSku,
        name: "",
        rate: 0,
      });
    }
  }

  for (const a of asinItems) {
    if (a.sku && !seen.has(a.sku.toUpperCase())) {
      seen.add(a.sku.toUpperCase());
      results.push({
        sku: a.sku,
        name: "",
        rate: 0,
      });
    }
  }

  return results.slice(0, 25);
};

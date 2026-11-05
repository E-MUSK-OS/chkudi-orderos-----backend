import prisma from "../config/prisma.js";

export const getUserChallanPrefix = (user) => {
  if (!user) return "CHAL";

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
  if (!cleaned) return "CHAL";

  return cleaned.slice(0, 4).toUpperCase();
};

export const getNextChallanNoRepo = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true, fullName: true },
  });

  const prefix = getUserChallanPrefix(user);

  const existingChallans = await prisma.salesChallan.findMany({
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

export const createSalesChallanRepo = async (userId, data, items) => {
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
    0
  );

  return await prisma.salesChallan.create({
    data: {
      userId,
      partyId: data.partyId || null,
      partyName: data.partyName,
      contactNo: data.contactNo || null,
      challanNo: data.challanNo,
      challanRefNo: data.challanRefNo || null,
      challanDate: data.challanDate ? new Date(data.challanDate) : new Date(),
      challanFor: data.challanFor || "Sales",
      stockOutFrom: data.stockOutFrom || "General",
      consigneeName: data.consigneeName || "Not Applicable",
      deliveryBy: data.deliveryBy || "Buyer",
      preparedBy: data.preparedBy || null,
      deliveryTerms: data.deliveryTerms || null,
      totalQuantity,
      totalAmount,
      invoiceStatus: data.invoiceStatus || "Pending",
      items: {
        create: items.map((item, idx) => ({
          itemNo: item.itemNo || idx + 1,
          sku: item.sku,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          rate: Number(item.rate) || 0,
          amount: (Number(item.quantity) || 1) * (Number(item.rate) || 0),
          dispatchDate: item.dispatchDate || null,
          subCn: item.subCn || null,
          remarks: item.remarks || null,
          printBarcode: item.printBarcode !== false,
        })),
      },
    },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      party: true,
    },
  });
};

export const findSalesChallansRepo = async (userId, filters = {}) => {
  const {
    search,
    challanNo,
    challanRefNo,
    partyName,
    productSku,
    startDate,
    endDate,
    invoiceStatus,
    challanFor,
    page = 1,
    limit = 50,
  } = filters;

  // Safe date parsing helper supporting YYYY-MM-DD and DD-MM-YYYY
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
    // When only startDate is selected, filter for that entire calendar day
    const startOfDay = new Date(parsedStart);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedStart);
    endOfDay.setUTCHours(23, 59, 59, 999);

    challanDateFilter = {
      gte: startOfDay,
      lte: endOfDay,
    };
  } else if (parsedEnd) {
    // When only endDate is selected, filter up to end of that calendar day
    const endOfDay = new Date(parsedEnd);
    endOfDay.setUTCHours(23, 59, 59, 999);

    challanDateFilter = {
      lte: endOfDay,
    };
  }

  const searchTrimmed = typeof search === "string" ? search.trim() : "";
  let searchOrConditions = [];

  if (searchTrimmed) {
    searchOrConditions.push(
      { challanNo: { contains: searchTrimmed, mode: "insensitive" } },
      { challanRefNo: { contains: searchTrimmed, mode: "insensitive" } },
      { partyName: { contains: searchTrimmed, mode: "insensitive" } },
      { contactNo: { contains: searchTrimmed, mode: "insensitive" } },
      { preparedBy: { contains: searchTrimmed, mode: "insensitive" } },
      { challanFor: { contains: searchTrimmed, mode: "insensitive" } },
      { stockOutFrom: { contains: searchTrimmed, mode: "insensitive" } },
      { invoiceStatus: { contains: searchTrimmed, mode: "insensitive" } },
      { consigneeName: { contains: searchTrimmed, mode: "insensitive" } },
      { deliveryBy: { contains: searchTrimmed, mode: "insensitive" } },
      { deliveryTerms: { contains: searchTrimmed, mode: "insensitive" } },
      {
        party: {
          OR: [
            { partyName: { contains: searchTrimmed, mode: "insensitive" } },
            { city: { contains: searchTrimmed, mode: "insensitive" } },
            { state: { contains: searchTrimmed, mode: "insensitive" } },
            { phone: { contains: searchTrimmed, mode: "insensitive" } },
            { whatsapp: { contains: searchTrimmed, mode: "insensitive" } },
            { accountCode: { contains: searchTrimmed, mode: "insensitive" } },
            { alias: { contains: searchTrimmed, mode: "insensitive" } },
          ],
        },
      },
      {
        items: {
          some: {
            OR: [
              { sku: { contains: searchTrimmed, mode: "insensitive" } },
              { name: { contains: searchTrimmed, mode: "insensitive" } },
              { subCn: { contains: searchTrimmed, mode: "insensitive" } },
              { remarks: { contains: searchTrimmed, mode: "insensitive" } },
            ],
          },
        },
      }
    );

    const searchNum = Number(searchTrimmed);
    if (!isNaN(searchNum)) {
      if (Number.isInteger(searchNum)) {
        searchOrConditions.push({ totalQuantity: searchNum });
      }
      searchOrConditions.push({ totalAmount: searchNum });
    }

    const parsedSearchDate = parseFilterDate(searchTrimmed);
    if (parsedSearchDate) {
      const sDay = new Date(parsedSearchDate);
      sDay.setUTCHours(0, 0, 0, 0);
      const eDay = new Date(parsedSearchDate);
      eDay.setUTCHours(23, 59, 59, 999);
      searchOrConditions.push({
        challanDate: {
          gte: sDay,
          lte: eDay,
        },
      });
    }
  }

  const where = {
    userId,
    ...(searchOrConditions.length > 0 ? { OR: searchOrConditions } : {}),
    ...(challanNo ? { challanNo: { contains: challanNo, mode: "insensitive" } } : {}),
    ...(challanRefNo ? { challanRefNo: { contains: challanRefNo, mode: "insensitive" } } : {}),
    ...(partyName ? { partyName: { contains: partyName, mode: "insensitive" } } : {}),
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
    prisma.salesChallan.findMany({
      where,
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        party: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: Number(limit),
    }),
    prisma.salesChallan.count({ where }),
  ]);

  return { challans, total, page: Number(page), limit: Number(limit) };
};

export const findSalesChallanByIdRepo = async (id, userId) => {
  return await prisma.salesChallan.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      party: true,
    },
  });
};

export const updateSalesChallanRepo = async (id, userId, data, items) => {
  const totalQuantity = items
    ? items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
    : undefined;
  const totalAmount = items
    ? items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0),
      0
    )
    : undefined;

  return await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.salesChallanItem.deleteMany({
        where: { challanId: id },
      });
    }

    return await tx.salesChallan.update({
      where: { id, userId },
      data: {
        ...(data.partyId !== undefined ? { partyId: data.partyId } : {}),
        ...(data.partyName !== undefined ? { partyName: data.partyName } : {}),
        ...(data.contactNo !== undefined ? { contactNo: data.contactNo } : {}),
        ...(data.challanRefNo !== undefined ? { challanRefNo: data.challanRefNo } : {}),
        ...(data.challanDate ? { challanDate: new Date(data.challanDate) } : {}),
        ...(data.challanFor !== undefined ? { challanFor: data.challanFor } : {}),
        ...(data.stockOutFrom !== undefined ? { stockOutFrom: data.stockOutFrom } : {}),
        ...(data.consigneeName !== undefined ? { consigneeName: data.consigneeName } : {}),
        ...(data.deliveryBy !== undefined ? { deliveryBy: data.deliveryBy } : {}),
        ...(data.preparedBy !== undefined ? { preparedBy: data.preparedBy } : {}),
        ...(data.deliveryTerms !== undefined ? { deliveryTerms: data.deliveryTerms } : {}),
        ...(data.invoiceStatus !== undefined ? { invoiceStatus: data.invoiceStatus } : {}),
        ...(totalQuantity !== undefined ? { totalQuantity } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(items
          ? {
            items: {
              create: items.map((item, idx) => ({
                itemNo: item.itemNo || idx + 1,
                sku: item.sku,
                name: item.name,
                quantity: Number(item.quantity) || 1,
                rate: Number(item.rate) || 0,
                amount: (Number(item.quantity) || 1) * (Number(item.rate) || 0),
                dispatchDate: item.dispatchDate || null,
                subCn: item.subCn || null,
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
        party: true,
      },
    });
  });
};

export const deleteSalesChallanRepo = async (id, userId) => {
  return await prisma.salesChallan.delete({
    where: {
      id,
      userId,
    },
  });
};

export const searchProductSkusRepo = async (userId, search = "") => {
  const query = (search || "").trim();

  // If query is empty, return top products and imports for initial suggestions
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

    products.forEach((p) => {
      if (p.masterSku && !seen.has(p.masterSku.toLowerCase())) {
        seen.add(p.masterSku.toLowerCase());
        results.push({
          sku: p.masterSku,
          name: p.productName || p.masterSku,
          rate: Number(p.mrp) || 0,
        });
      }
    });

    myntraItems.forEach((m) => {
      const sku = m.sellerSku ? m.sellerSku.trim() : "";
      if (sku && !seen.has(sku.toLowerCase())) {
        seen.add(sku.toLowerCase());
        results.push({
          sku,
          name: sku,
          rate: 0,
        });
      }
    });

    asinItems.forEach((a) => {
      if (a.sku && !seen.has(a.sku.toLowerCase())) {
        seen.add(a.sku.toLowerCase());
        results.push({
          sku: a.sku ? a.sku.trim() : "",
          name: a.sku ? a.sku.trim() : "",
          rate: 0,
        });
      }
    });

    return results;
  }

  // When query is provided:
  // Search in parallel across:
  // 1. Products & Variants (current user)
  // 2. AsinImport (user-specific first, then global fallback)
  // 3. MyntraImport (user-specific first, then global fallback)
  const [products, variants, userAsins, userMyntras] = await Promise.all([
    prisma.product.findMany({
      where: {
        userId,
        isActive: true,
        OR: [
          { masterSku: { contains: query, mode: "insensitive" } },
          { productName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 15,
      select: {
        id: true,
        masterSku: true,
        productName: true,
        mrp: true,
      },
    }),
    prisma.productVariant.findMany({
      where: {
        product: { userId, isActive: true },
        variantSku: { contains: query, mode: "insensitive" },
      },
      take: 15,
      include: {
        product: {
          select: { productName: true, mrp: true },
        },
      },
    }),
    prisma.asinImport.findMany({
      where: {
        userId,
        sku: { contains: query, mode: "insensitive" },
      },
      take: 60,
      orderBy: { sku: "asc" },
      select: { sku: true },
    }),
    prisma.myntraImport.findMany({
      where: {
        userId,
        sellerSku: { contains: query, mode: "insensitive" },
      },
      take: 60,
      orderBy: { sellerSku: "asc" },
      select: { sellerSku: true },
    }),
  ]);

  let allAsins = [...userAsins];
  let allMyntras = [...userMyntras];

  // If user-specific catalog imports have fewer than 40 results,
  // query global imports so warehouse-wide imported SKUs are also matched
  if (allMyntras.length < 40 || allAsins.length < 40) {
    const [globalAsins, globalMyntras] = await Promise.all([
      allAsins.length < 40
        ? prisma.asinImport.findMany({
          where: {
            sku: { contains: query, mode: "insensitive" },
          },
          take: 60,
          orderBy: { sku: "asc" },
          select: { sku: true },
        })
        : Promise.resolve([]),
      allMyntras.length < 40
        ? prisma.myntraImport.findMany({
          where: {
            sellerSku: { contains: query, mode: "insensitive" },
          },
          take: 60,
          orderBy: { sellerSku: "asc" },
          select: { sellerSku: true },
        })
        : Promise.resolve([]),
    ]);

    allAsins = [...allAsins, ...globalAsins];
    allMyntras = [...allMyntras, ...globalMyntras];
  }

  const results = [];
  const seenSkus = new Set();

  // 1. Products
  products.forEach((p) => {
    if (p.masterSku && !seenSkus.has(p.masterSku.toLowerCase())) {
      seenSkus.add(p.masterSku.toLowerCase());
      results.push({
        sku: p.masterSku,
        name: p.productName || p.masterSku,
        rate: Number(p.mrp) || 0,
      });
    }
  });

  // 2. Variants
  variants.forEach((v) => {
    if (v.variantSku && !seenSkus.has(v.variantSku.toLowerCase())) {
      seenSkus.add(v.variantSku.toLowerCase());
      results.push({
        sku: v.variantSku,
        name: v.product?.productName || v.variantSku,
        rate: Number(v.product?.mrp) || 0,
      });
    }
  });

  // 3. Myntra Imports (e.g. WO-Trouser-5272-Cream-28)
  allMyntras.forEach((m) => {
    const sku = m.sellerSku ? m.sellerSku.trim() : "";
    if (sku && !seenSkus.has(sku.toLowerCase())) {
      seenSkus.add(sku.toLowerCase());
      results.push({
        sku,
        name: sku,
        rate: 0,
      });
    }
  });

  // 4. ASIN Imports (e.g. Men-Pant-5188-Black-28)
  allAsins.forEach((a) => {
    const sku = a.sku ? a.sku.trim() : "";
    if (sku && !seenSkus.has(sku.toLowerCase())) {
      seenSkus.add(sku.toLowerCase());
      results.push({
        sku,
        name: sku,
        rate: 0,
      });
    }
  });

  // 5. Check if any 0-rate items have a recent rate in SalesChallanItem
  const zeroRateSkus = results.filter((r) => r.rate === 0).map((r) => r.sku);
  if (zeroRateSkus.length > 0) {
    try {
      const recentItems = await prisma.salesChallanItem.findMany({
        where: {
          sku: { in: zeroRateSkus },
          rate: { gt: 0 },
        },
        select: { sku: true, rate: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const rateMap = new Map();
      recentItems.forEach((ri) => {
        if (!rateMap.has(ri.sku.toLowerCase())) {
          rateMap.set(ri.sku.toLowerCase(), Number(ri.rate));
        }
      });

      results.forEach((r) => {
        if (r.rate === 0 && rateMap.has(r.sku.toLowerCase())) {
          r.rate = rateMap.get(r.sku.toLowerCase());
        }
      });
    } catch (rateErr) {
      // Non-critical, continue with rate 0
    }
  }

  const lowerQuery = query.toLowerCase();
  const matched = results.filter(
    (r) =>
      r.sku.toLowerCase().includes(lowerQuery) ||
      (r.name && r.name.toLowerCase().includes(lowerQuery))
  );

  matched.sort((a, b) => a.sku.localeCompare(b.sku));

  return matched.slice(0, 60);
};

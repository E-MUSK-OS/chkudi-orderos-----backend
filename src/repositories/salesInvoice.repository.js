import prisma from "../config/prisma.js";

function parseDateOrFallback(val, fallback = null) {
  if (!val) return fallback;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return fallback;
    // Format DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      const [d, m, y] = trimmed.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    // Format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-").map(Number);
      const parsed = new Date(Date.UTC(y, m - 1, d));
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const standard = new Date(trimmed);
    if (!isNaN(standard.getTime())) return standard;
  }
  return fallback;
}

export const getNextInvoiceNoRepo = async (userId) => {
  const existingInvoices = await prisma.salesInvoice.findMany({
    where: { userId },
    select: { invoiceNo: true },
  });

  let maxSeq = 0;
  for (const inv of existingInvoices) {
    if (!inv.invoiceNo) continue;
    const match = inv.invoiceNo.trim().match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  return String(maxSeq + 1);
};

export const createSalesInvoiceRepo = async (userId, data, items) => {
  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.amount) || (Number(it.quantity) || 0) * (Number(it.rate) || 0)), 0) * 100
  ) / 100;
  const totalDiscount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.discountAmount) || 0), 0) * 100
  ) / 100;
  const amountBeforeTax = Math.round(
    items.reduce((sum, it) => sum + (Number(it.taxableAmount) || 0), 0) * 100
  ) / 100;
  const sgstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.sgstAmount) || 0), 0) * 100
  ) / 100;
  const cgstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.cgstAmount) || 0), 0) * 100
  ) / 100;
  const igstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.igstAmount) || 0), 0) * 100
  ) / 100;
  const totalGst = Math.round((sgstAmount + cgstAmount + igstAmount) * 100) / 100;
  const amountAfterTax = Math.round((amountBeforeTax + totalGst) * 100) / 100;

  const roundOff = typeof data.roundOff === "number"
    ? data.roundOff
    : (data.applyRoundOff === false
        ? 0
        : Math.round((Math.round(amountAfterTax) - amountAfterTax) * 100) / 100);

  const netAmount = Math.round((amountAfterTax + roundOff) * 100) / 100;

  return await prisma.$transaction(async (tx) => {
    const createdInvoice = await tx.salesInvoice.create({
      data: {
        userId,
        challanId: data.challanId || null,
        partyId: data.partyId || null,
        invoiceType: data.invoiceType || "Tax Invoice",
        invoiceNo: data.invoiceNo,
        invoiceDate: parseDateOrFallback(data.invoiceDate, new Date()),
        challanNo: data.challanNo || null,
        challanDate: parseDateOrFallback(data.challanDate, null),
        partyGstn: data.partyGstn || null,
        stateCode: data.stateCode || null,
        brokerName: data.brokerName || null,
        consigneeName: data.consigneeName || null,
        editOn: data.editOn !== false,

        remarks: data.remarks || null,
        ewayBillNo: data.ewayBillNo || null,
        expenseOnSales: Number(data.expenseOnSales) || 0,
        hasReceipt: Boolean(data.hasReceipt),
        receivedAmount: data.receivedAmount !== undefined ? Number(data.receivedAmount) : 0,
        receiptMode: data.receiptMode || null,
        receiptAccount: data.receiptAccount || null,
        transactionType: data.transactionType || null,
        transactionDate: parseDateOrFallback(data.transactionDate, null),
        chequeNo: data.chequeNo || null,
        bankName: data.bankName || null,

        billingPartyName: data.billingPartyName,
        billingAddress: data.billingAddress || null,
        billingCity: data.billingCity || null,
        billingState: data.billingState || null,
        billingPincode: data.billingPincode || null,
        billingEmail: data.billingEmail || null,
        billingMobile: data.billingMobile || null,

        shippingPartyName: data.shippingPartyName || null,
        shippingAddress: data.shippingAddress || null,
        shippingAddress2: data.shippingAddress2 || null,
        shippingCity: data.shippingCity || null,
        shippingState: data.shippingState || null,
        shippingPincode: data.shippingPincode || null,
        shippingContact: data.shippingContact || null,
        courierPartner: data.courierPartner || null,
        trackingNo: data.trackingNo || null,

        totalQuantity,
        totalAmount,
        totalDiscount,
        amountBeforeTax,
        sgstAmount,
        cgstAmount,
        igstAmount,
        totalGst,
        amountAfterTax,
        roundOff,
        netAmount,
        status: data.status || "Generated",

        items: {
          create: items.map((it, idx) => ({
            itemNo: it.itemNo || idx + 1,
            sku: it.sku,
            particular: it.particular || it.sku,
            hsn: it.hsn || null,
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
            amount: Number(it.amount) || (Number(it.quantity) || 1) * (Number(it.rate) || 0),
            discountPercent: Number(it.discountPercent) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            taxableAmount: Number(it.taxableAmount) || 0,
            sgstRate: Number(it.sgstRate) || 0,
            sgstAmount: Number(it.sgstAmount) || 0,
            cgstRate: Number(it.cgstRate) || 0,
            cgstAmount: Number(it.cgstAmount) || 0,
            igstRate: Number(it.igstRate) || 0,
            igstAmount: Number(it.igstAmount) || 0,
            total: Number(it.total) || 0,
          })),
        },
      },
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        party: true,
        challan: true,
      },
    });

    // Automatically update the associated SalesChallan's invoiceStatus to "Invoiced"
    if (data.challanId) {
      await tx.salesChallan.update({
        where: { id: data.challanId },
        data: { invoiceStatus: "Invoiced" },
      });
    }

    return createdInvoice;
  });
};

export const findSalesInvoicesRepo = async (userId, filters = {}) => {
  const {
    search,
    invoiceNo,
    challanNo,
    partyName,
    startDate,
    endDate,
    status,
    productSku,
    invoiceType,
    challanRefNo,
    page = 1,
    limit = 50,
  } = filters;

  const where = { userId };

  if (invoiceNo && invoiceNo.trim()) {
    where.invoiceNo = { contains: invoiceNo.trim(), mode: "insensitive" };
  }

  if (challanNo && challanNo.trim()) {
    where.challanNo = { contains: challanNo.trim(), mode: "insensitive" };
  }

  if (partyName && partyName.trim()) {
    where.billingPartyName = { contains: partyName.trim(), mode: "insensitive" };
  }

  if (invoiceType && invoiceType !== "All") {
    where.invoiceType = invoiceType;
  }

  if (status && status !== "All") {
    if (status.toLowerCase() === "pending") {
      where.status = { notIn: ["Close", "Closed", "Paid"] };
    } else if (status.toLowerCase() === "close") {
      where.status = { in: ["Close", "Closed", "Paid"] };
    } else {
      where.status = status;
    }
  }

  if (productSku && productSku.trim()) {
    where.items = {
      some: {
        OR: [
          { sku: { contains: productSku.trim(), mode: "insensitive" } },
          { particular: { contains: productSku.trim(), mode: "insensitive" } },
        ],
      },
    };
  }

  if (challanRefNo && challanRefNo.trim()) {
    where.challan = {
      challanRefNo: { contains: challanRefNo.trim(), mode: "insensitive" },
    };
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { invoiceNo: { contains: s, mode: "insensitive" } },
      { challanNo: { contains: s, mode: "insensitive" } },
      { billingPartyName: { contains: s, mode: "insensitive" } },
      { partyGstn: { contains: s, mode: "insensitive" } },
    ];
  }

  if (startDate || endDate) {
    where.invoiceDate = {};
    if (startDate) {
      const sDate = parseDateOrFallback(startDate);
      if (sDate) where.invoiceDate.gte = sDate;
    }
    if (endDate) {
      const eDate = parseDateOrFallback(endDate);
      if (eDate) {
        eDate.setHours(23, 59, 59, 999);
        where.invoiceDate.lte = eDate;
      }
    }
  }

  const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

  const [invoices, total] = await Promise.all([
    prisma.salesInvoice.findMany({
      where,
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        party: {
          select: { id: true, partyName: true, phone: true, city: true, state: true, gstin: true },
        },
        challan: {
          select: { id: true, challanNo: true, challanDate: true, challanRefNo: true },
        },
      },
      orderBy: { invoiceDate: "desc" },
      skip,
      take,
    }),
    prisma.salesInvoice.count({ where }),
  ]);

  return { invoices, total, page: parseInt(page, 10) || 1, limit: take };
};

export const findSalesInvoiceByIdRepo = async (id, userId) => {
  return await prisma.salesInvoice.findFirst({
    where: { id, userId },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      party: true,
      challan: true,
    },
  });
};

export const findSalesInvoiceByChallanIdRepo = async (challanId, userId) => {
  return await prisma.salesInvoice.findFirst({
    where: { challanId, userId },
    include: {
      items: {
        orderBy: { itemNo: "asc" },
      },
      party: true,
      challan: true,
    },
  });
};

export const updateSalesInvoiceRepo = async (id, userId, data, items) => {
  const existing = await prisma.salesInvoice.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Sales Invoice not found.");
  }

  const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.amount) || (Number(it.quantity) || 0) * (Number(it.rate) || 0)), 0) * 100
  ) / 100;
  const totalDiscount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.discountAmount) || 0), 0) * 100
  ) / 100;
  const amountBeforeTax = Math.round(
    items.reduce((sum, it) => sum + (Number(it.taxableAmount) || 0), 0) * 100
  ) / 100;
  const sgstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.sgstAmount) || 0), 0) * 100
  ) / 100;
  const cgstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.cgstAmount) || 0), 0) * 100
  ) / 100;
  const igstAmount = Math.round(
    items.reduce((sum, it) => sum + (Number(it.igstAmount) || 0), 0) * 100
  ) / 100;
  const totalGst = Math.round((sgstAmount + cgstAmount + igstAmount) * 100) / 100;
  const amountAfterTax = Math.round((amountBeforeTax + totalGst) * 100) / 100;

  const roundOff = typeof data.roundOff === "number"
    ? data.roundOff
    : (data.applyRoundOff === false
        ? 0
        : Math.round((Math.round(amountAfterTax) - amountAfterTax) * 100) / 100);

  const netAmount = Math.round((amountAfterTax + roundOff) * 100) / 100;

  return await prisma.$transaction(async (tx) => {
    // Delete existing items
    await tx.salesInvoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    const updated = await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceType: data.invoiceType || existing.invoiceType,
        invoiceDate: data.invoiceDate ? parseDateOrFallback(data.invoiceDate, existing.invoiceDate) : existing.invoiceDate,
        challanDate: data.challanDate !== undefined ? parseDateOrFallback(data.challanDate, null) : existing.challanDate,
        brokerName: data.brokerName !== undefined ? data.brokerName : existing.brokerName,
        consigneeName: data.consigneeName !== undefined ? data.consigneeName : existing.consigneeName,
        editOn: data.editOn !== undefined ? data.editOn : existing.editOn,

        remarks: data.remarks !== undefined ? data.remarks : existing.remarks,
        ewayBillNo: data.ewayBillNo !== undefined ? data.ewayBillNo : existing.ewayBillNo,
        expenseOnSales: data.expenseOnSales !== undefined ? Number(data.expenseOnSales) : existing.expenseOnSales,
        hasReceipt: data.hasReceipt !== undefined ? Boolean(data.hasReceipt) : existing.hasReceipt,
        receivedAmount: data.receivedAmount !== undefined ? Number(data.receivedAmount) : existing.receivedAmount,
        receiptMode: data.receiptMode !== undefined ? data.receiptMode : existing.receiptMode,
        receiptAccount: data.receiptAccount !== undefined ? data.receiptAccount : existing.receiptAccount,
        transactionType: data.transactionType !== undefined ? data.transactionType : existing.transactionType,
        transactionDate: data.transactionDate !== undefined ? parseDateOrFallback(data.transactionDate, null) : existing.transactionDate,
        chequeNo: data.chequeNo !== undefined ? data.chequeNo : existing.chequeNo,
        bankName: data.bankName !== undefined ? data.bankName : existing.bankName,

        billingPartyName: data.billingPartyName || existing.billingPartyName,
        billingAddress: data.billingAddress !== undefined ? data.billingAddress : existing.billingAddress,
        billingCity: data.billingCity !== undefined ? data.billingCity : existing.billingCity,
        billingState: data.billingState !== undefined ? data.billingState : existing.billingState,
        billingPincode: data.billingPincode !== undefined ? data.billingPincode : existing.billingPincode,
        billingEmail: data.billingEmail !== undefined ? data.billingEmail : existing.billingEmail,
        billingMobile: data.billingMobile !== undefined ? data.billingMobile : existing.billingMobile,

        shippingPartyName: data.shippingPartyName !== undefined ? data.shippingPartyName : existing.shippingPartyName,
        shippingAddress: data.shippingAddress !== undefined ? data.shippingAddress : existing.shippingAddress,
        shippingAddress2: data.shippingAddress2 !== undefined ? data.shippingAddress2 : existing.shippingAddress2,
        shippingCity: data.shippingCity !== undefined ? data.shippingCity : existing.shippingCity,
        shippingState: data.shippingState !== undefined ? data.shippingState : existing.shippingState,
        shippingPincode: data.shippingPincode !== undefined ? data.shippingPincode : existing.shippingPincode,
        shippingContact: data.shippingContact !== undefined ? data.shippingContact : existing.shippingContact,
        courierPartner: data.courierPartner !== undefined ? data.courierPartner : existing.courierPartner,
        trackingNo: data.trackingNo !== undefined ? data.trackingNo : existing.trackingNo,

        totalQuantity,
        totalAmount,
        totalDiscount,
        amountBeforeTax,
        sgstAmount,
        cgstAmount,
        igstAmount,
        totalGst,
        amountAfterTax,
        roundOff,
        netAmount,
        status: data.status || existing.status,

        items: {
          create: items.map((it, idx) => ({
            itemNo: it.itemNo || idx + 1,
            sku: it.sku,
            particular: it.particular || it.sku,
            hsn: it.hsn || null,
            quantity: Number(it.quantity) || 1,
            rate: Number(it.rate) || 0,
            amount: Number(it.amount) || (Number(it.quantity) || 1) * (Number(it.rate) || 0),
            discountPercent: Number(it.discountPercent) || 0,
            discountAmount: Number(it.discountAmount) || 0,
            taxableAmount: Number(it.taxableAmount) || 0,
            sgstRate: Number(it.sgstRate) || 0,
            sgstAmount: Number(it.sgstAmount) || 0,
            cgstRate: Number(it.cgstRate) || 0,
            cgstAmount: Number(it.cgstAmount) || 0,
            igstRate: Number(it.igstRate) || 0,
            igstAmount: Number(it.igstAmount) || 0,
            total: Number(it.total) || 0,
          })),
        },
      },
      include: {
        items: {
          orderBy: { itemNo: "asc" },
        },
        party: true,
        challan: true,
      },
    });

    return updated;
  });
};

export const deleteSalesInvoiceRepo = async (id, userId) => {
  const existing = await prisma.salesInvoice.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    throw new Error("Sales Invoice not found.");
  }

  return await prisma.$transaction(async (tx) => {
    // Delete items first
    await tx.salesInvoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    const deleted = await tx.salesInvoice.delete({
      where: { id },
    });

    // Revert challan status if this was linked to a challan
    if (existing.challanId) {
      const remainingForChallan = await tx.salesInvoice.count({
        where: { challanId: existing.challanId },
      });
      if (remainingForChallan === 0) {
        await tx.salesChallan.update({
          where: { id: existing.challanId },
          data: { invoiceStatus: "Pending" },
        });
      }
    }

    return deleted;
  });
};

import ExcelJS from "exceljs";
import {
  createPurchaseChallanRepo,
  findPurchaseChallansRepo,
  findPurchaseChallanByIdRepo,
  updatePurchaseChallanRepo,
  deletePurchaseChallanRepo,
  getNextPurchaseChallanNoRepo,
  searchProductSkusRepo,
} from "../repositories/purchaseChallan.repository.js";
import { findPartyByIdRepo } from "../repositories/party.repository.js";

export const getNextPurchaseChallanNoService = async (userId) => {
  return await getNextPurchaseChallanNoRepo(userId);
};

export const createPurchaseChallanService = async (userId, data) => {
  let challanNo = data.challanNo;
  if (!challanNo) {
    challanNo = await getNextPurchaseChallanNoRepo(userId);
  }

  let contactNo = data.contactNo;
  if (!contactNo && data.supplierId) {
    const party = await findPartyByIdRepo(data.supplierId, userId);
    if (party) {
      contactNo = party.phone || party.whatsapp || null;
    }
  }

  const items = (data.items || []).map((item) => ({
    ...item,
    name: item.name && typeof item.name === "string" ? item.name.trim() : "",
  }));

  let partyChallanNo = data.partyChallanNo;
  if (!partyChallanNo && items.length > 0) {
    const itemNos = Array.from(
      new Set(
        items
          .map((it) => it.partyChallanNo && it.partyChallanNo.trim())
          .filter(Boolean)
      )
    );
    if (itemNos.length > 0) {
      partyChallanNo = itemNos.join(", ");
    }
  }

  return await createPurchaseChallanRepo(
    userId,
    {
      ...data,
      challanNo,
      partyChallanNo: partyChallanNo || null,
      contactNo,
    },
    items
  );
};

export const getPurchaseChallansService = async (userId, filters) => {
  return await findPurchaseChallansRepo(userId, filters);
};

export const getPurchaseChallanByIdService = async (id, userId) => {
  const challan = await findPurchaseChallanByIdRepo(id, userId);
  if (!challan) {
    throw new Error("Purchase Challan not found.");
  }
  return challan;
};

export const updatePurchaseChallanService = async (id, userId, data) => {
  const existing = await findPurchaseChallanByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Purchase Challan not found.");
  }

  const items = data.items
    ? data.items.map((item) => ({
        ...item,
        name: item.name && typeof item.name === "string" ? item.name.trim() : "",
      }))
    : undefined;

  let partyChallanNo = data.partyChallanNo;
  if (partyChallanNo === undefined && items && items.length > 0) {
    const itemNos = Array.from(
      new Set(
        items
          .map((it) => it.partyChallanNo && it.partyChallanNo.trim())
          .filter(Boolean)
      )
    );
    if (itemNos.length > 0) {
      partyChallanNo = itemNos.join(", ");
    }
  }

  return await updatePurchaseChallanRepo(
    id,
    userId,
    {
      ...data,
      ...(partyChallanNo !== undefined ? { partyChallanNo } : {}),
    },
    items
  );
};

export const deletePurchaseChallanService = async (id, userId) => {
  const existing = await findPurchaseChallanByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Purchase Challan not found.");
  }
  return await deletePurchaseChallanRepo(id, userId);
};

export const searchProductSkusService = async (userId, search) => {
  return await searchProductSkusRepo(userId, search);
};

// ==================================================================================
// Excel Export Services
// ==================================================================================

export const exportPurchaseChallansToExcel = async (userId, filters) => {
  const { challans } = await findPurchaseChallansRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Purchase Challans");

  worksheet.columns = [
    { header: "No.", key: "no", width: 8 },
    { header: "Date", key: "date", width: 14 },
    { header: "Challan No", key: "challanNo", width: 16 },
    { header: "Party Challan No", key: "partyChallanNo", width: 18 },
    { header: "Party Name", key: "supplierName", width: 28 },
    { header: "Contact No", key: "contactNo", width: 16 },
    { header: "Ordered Qty", key: "orderedQty", width: 14 },
    { header: "Received Qty", key: "receivedQty", width: 14 },
    { header: "Prepared By", key: "preparedBy", width: 16 },
    { header: "Challan For", key: "challanFor", width: 14 },
    { header: "Stock In", key: "stockIn", width: 14 },
    { header: "Courier Partner", key: "courierPartner", width: 18 },
    { header: "LR No", key: "lrNo", width: 16 },
    { header: "Invoice Status", key: "invoiceStatus", width: 16 },
  ];

  challans.forEach((c, index) => {
    const formattedDate = c.challanDate
      ? new Date(c.challanDate).toLocaleDateString("en-GB")
      : "-";

    const partyChallanNo =
      c.partyChallanNo ||
      Array.from(
        new Set(
          (c.items || [])
            .map((it) => it.partyChallanNo && it.partyChallanNo.trim())
            .filter(Boolean)
        )
      ).join(", ") ||
      "-";

    worksheet.addRow({
      no: index + 1,
      date: formattedDate,
      challanNo: c.challanNo,
      partyChallanNo,
      supplierName: c.supplierName,
      contactNo: c.contactNo || "-",
      orderedQty: c.totalOrderedQty || 0,
      receivedQty: c.totalReceivedQty || 0,
      preparedBy: c.preparedBy || "-",
      challanFor: c.challanFor || "Purchase",
      stockIn: c.stockIn || "General",
      courierPartner: c.courierPartner || "-",
      lrNo: c.lrNo || "-",
      invoiceStatus: c.invoiceStatus || "Pending",
    });
  });

  return workbook;
};

export const exportPurchaseSkuWiseToExcel = async (userId, filters) => {
  const { challans } = await findPurchaseChallansRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("SKU Wise Purchase Challan");

  worksheet.columns = [
    { header: "Challan No", key: "challanNo", width: 16 },
    { header: "Challan Date", key: "challanDate", width: 14 },
    { header: "Party Challan No", key: "partyChallanNo", width: 18 },
    { header: "Supplier Name", key: "supplierName", width: 28 },
    { header: "Stock In Godown", key: "stockIn", width: 16 },
    { header: "Item No", key: "itemNo", width: 10 },
    { header: "Product SKU", key: "sku", width: 20 },
    { header: "Particulars Name", key: "name", width: 30 },
    { header: "Ordered Qty", key: "orderedQty", width: 14 },
    { header: "Received Qty", key: "receivedQty", width: 14 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "PO No", key: "poNo", width: 16 },
    { header: "Received Date", key: "receivedDate", width: 14 },
    { header: "Remarks", key: "remarks", width: 24 },
  ];

  challans.forEach((c) => {
    const formattedDate = c.challanDate
      ? new Date(c.challanDate).toLocaleDateString("en-GB")
      : "-";

    (c.items || []).forEach((item) => {
      worksheet.addRow({
        challanNo: c.challanNo,
        challanDate: formattedDate,
        partyChallanNo: item.partyChallanNo || c.partyChallanNo || "-",
        supplierName: c.supplierName,
        stockIn: c.stockIn || "General",
        itemNo: item.itemNo,
        sku: item.sku,
        name: item.name,
        orderedQty: item.orderedQty,
        receivedQty: item.receivedQty,
        rate: item.rate,
        amount: item.amount,
        poNo: item.poNo || "-",
        receivedDate: item.receivedDate || "-",
        remarks: item.remarks || "-",
      });
    });
  });

  return workbook;
};

export const exportPurchaseBlankFormatExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Inward Items Template");

  worksheet.columns = [
    { header: "Particulars [SKU]", key: "sku", width: 22 },
    { header: "Particulars [Name]", key: "name", width: 30 },
    { header: "Ord.Qty", key: "orderedQty", width: 14 },
    { header: "Rec.Qty", key: "receivedQty", width: 14 },
    { header: "Rate", key: "rate", width: 14 },
    { header: "PO No", key: "poNo", width: 16 },
    { header: "Challan No", key: "partyChallanNo", width: 18 },
    { header: "Rec.Date", key: "receivedDate", width: 14 },
    { header: "Remarks", key: "remarks", width: 24 },
  ];

  worksheet.addRow({
    sku: "SAMPLE-SKU-001",
    name: "Sample Finished Good Product",
    orderedQty: 50,
    receivedQty: 50,
    rate: 150.0,
    poNo: "PO-2026-001",
    partyChallanNo: "CHAL-8891",
    receivedDate: "25-10-2026",
    remarks: "Good quality received in full",
  });

  return workbook;
};

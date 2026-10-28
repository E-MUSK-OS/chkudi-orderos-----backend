import ExcelJS from "exceljs";
import {
  createSalesChallanRepo,
  findSalesChallansRepo,
  findSalesChallanByIdRepo,
  updateSalesChallanRepo,
  deleteSalesChallanRepo,
  getNextChallanNoRepo,
  searchProductSkusRepo,
} from "../repositories/salesChallan.repository.js";
import { findPartyByIdRepo } from "../repositories/party.repository.js";

export const getNextChallanNoService = async (userId) => {
  return await getNextChallanNoRepo(userId);
};

export const createSalesChallanService = async (userId, data) => {
  let challanNo = data.challanNo;
  if (!challanNo) {
    challanNo = await getNextChallanNoRepo(userId);
  }

  // Populate contactNo from party if available and not given
  let contactNo = data.contactNo;
  if (!contactNo && data.partyId) {
    const party = await findPartyByIdRepo(data.partyId, userId);
    if (party) {
      contactNo = party.phone || party.whatsapp || null;
    }
  }

  // Ensure each item has a valid name (fallback to sku)
  const items = (data.items || []).map((item) => ({
    ...item,
    name: item.name && item.name.trim().length > 0 ? item.name.trim() : item.sku.trim(),
  }));

  return await createSalesChallanRepo(
    userId,
    {
      ...data,
      challanNo,
      contactNo,
    },
    items
  );
};

export const getSalesChallansService = async (userId, filters) => {
  return await findSalesChallansRepo(userId, filters);
};

export const getSalesChallanByIdService = async (id, userId) => {
  const challan = await findSalesChallanByIdRepo(id, userId);
  if (!challan) {
    throw new Error("Sales Challan not found.");
  }
  return challan;
};

export const updateSalesChallanService = async (id, userId, data) => {
  const existing = await findSalesChallanByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Sales Challan not found.");
  }
  const items = data.items
    ? data.items.map((item) => ({
        ...item,
        name: item.name && item.name.trim().length > 0 ? item.name.trim() : item.sku.trim(),
      }))
    : undefined;
  return await updateSalesChallanRepo(id, userId, data, items);
};

export const deleteSalesChallanService = async (id, userId) => {
  const existing = await findSalesChallanByIdRepo(id, userId);
  if (!existing) {
    throw new Error("Sales Challan not found.");
  }
  return await deleteSalesChallanRepo(id, userId);
};

export const searchProductSkusService = async (userId, search) => {
  return await searchProductSkusRepo(userId, search);
};

// ==================================================================================
// Excel Export Services
// ==================================================================================

export const exportChallansToExcel = async (userId, filters) => {
  const { challans } = await findSalesChallansRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Challans");

  worksheet.columns = [
    { header: "No.", key: "no", width: 8 },
    { header: "Party Name", key: "partyName", width: 25 },
    { header: "Challan No", key: "challanNo", width: 16 },
    { header: "Challan Ref.No", key: "challanRefNo", width: 18 },
    { header: "Date", key: "date", width: 16 },
    { header: "Contact No", key: "contactNo", width: 18 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Prepared By", key: "preparedBy", width: 18 },
    { header: "Challan For", key: "challanFor", width: 15 },
    { header: "Stock Out", key: "stockOut", width: 15 },
    { header: "Invoice Status", key: "invoiceStatus", width: 16 },
  ];

  // Header style
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B5C" },
  };

  challans.forEach((ch, idx) => {
    worksheet.addRow({
      no: idx + 1,
      partyName: ch.partyName,
      challanNo: ch.challanNo,
      challanRefNo: ch.challanRefNo || "-",
      date: new Date(ch.challanDate).toLocaleDateString("en-IN"),
      contactNo: ch.contactNo || "-",
      quantity: ch.totalQuantity,
      preparedBy: ch.preparedBy || "-",
      challanFor: ch.challanFor,
      stockOut: ch.stockOutFrom,
      invoiceStatus: ch.invoiceStatus,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const exportSkuWiseToExcel = async (userId, filters) => {
  const { challans } = await findSalesChallansRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("SKU Wise Challans");

  worksheet.columns = [
    { header: "Challan No", key: "challanNo", width: 15 },
    { header: "Date", key: "date", width: 15 },
    { header: "Party Name", key: "partyName", width: 25 },
    { header: "Item No", key: "itemNo", width: 10 },
    { header: "Product SKU", key: "sku", width: 22 },
    { header: "Product Name", key: "name", width: 30 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Dis.Date", key: "dispatchDate", width: 14 },
    { header: "Sub C.N", key: "subCn", width: 14 },
    { header: "Remarks", key: "remarks", width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B5C" },
  };

  challans.forEach((ch) => {
    (ch.items || []).forEach((item) => {
      worksheet.addRow({
        challanNo: ch.challanNo,
        date: new Date(ch.challanDate).toLocaleDateString("en-IN"),
        partyName: ch.partyName,
        itemNo: item.itemNo,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
        dispatchDate: item.dispatchDate || "-",
        subCn: item.subCn || "-",
        remarks: item.remarks || "-",
      });
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const exportBlankFormatExcel = async () => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Challan Items Template");

  worksheet.columns = [
    { header: "Particulars [SKU]", key: "sku", width: 24 },
    { header: "Particulars [Name]", key: "name", width: 32 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Dis.Date", key: "dispatchDate", width: 14 },
    { header: "Sub C.N", key: "subCn", width: 14 },
    { header: "Remarks", key: "remarks", width: 22 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF244B5C" },
  };

  // Keep format completely blank with only headers

  return await workbook.xlsx.writeBuffer();
};

import ExcelJS from "exceljs";
import {
  getNextInvoiceNoRepo,
  createSalesInvoiceRepo,
  findSalesInvoicesRepo,
  findSalesInvoiceByIdRepo,
  findSalesInvoiceByChallanIdRepo,
  updateSalesInvoiceRepo,
  deleteSalesInvoiceRepo,
} from "../repositories/salesInvoice.repository.js";
import { findPartyByIdRepo } from "../repositories/party.repository.js";

export const getNextInvoiceNoService = async (userId) => {
  return await getNextInvoiceNoRepo(userId);
};

export const createSalesInvoiceService = async (userId, data) => {
  let invoiceNo = data.invoiceNo;
  if (!invoiceNo) {
    invoiceNo = await getNextInvoiceNoRepo(userId);
  }

  // Populate billing party name if not provided
  let billingPartyName = data.billingPartyName;
  if (!billingPartyName && data.partyId) {
    const party = await findPartyByIdRepo(data.partyId, userId);
    if (party) {
      billingPartyName = party.partyName;
    }
  }

  const items = (data.items || []).map((it) => ({
    ...it,
    particular: it.particular && it.particular.trim().length > 0 ? it.particular.trim() : it.sku.trim(),
  }));

  return await createSalesInvoiceRepo(
    userId,
    {
      ...data,
      invoiceNo,
      billingPartyName: billingPartyName || "Valued Customer",
    },
    items
  );
};

export const getSalesInvoicesService = async (userId, filters) => {
  return await findSalesInvoicesRepo(userId, filters);
};

export const getSalesInvoiceByIdService = async (id, userId) => {
  const invoice = await findSalesInvoiceByIdRepo(id, userId);
  if (!invoice) {
    throw new Error("Sales Invoice not found.");
  }
  return invoice;
};

export const getSalesInvoiceByChallanIdService = async (challanId, userId) => {
  return await findSalesInvoiceByChallanIdRepo(challanId, userId);
};

export const updateSalesInvoiceService = async (id, userId, data) => {
  const items = (data.items || []).map((it) => ({
    ...it,
    particular: it.particular && it.particular.trim().length > 0 ? it.particular.trim() : it.sku.trim(),
  }));
  return await updateSalesInvoiceRepo(id, userId, data, items);
};

export const deleteSalesInvoiceService = async (id, userId) => {
  return await deleteSalesInvoiceRepo(id, userId);
};

// ==================================================================================
// Excel Exports (Detail, SKU Wise, Tally Format)
// ==================================================================================

export const exportInvoiceDetailToExcel = async (userId, filters) => {
  const { invoices } = await findSalesInvoicesRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Invoices Detail");

  worksheet.columns = [
    { header: "No.", key: "no", width: 8 },
    { header: "Invoice No", key: "invoiceNo", width: 14 },
    { header: "Invoice Date", key: "invoiceDate", width: 14 },
    { header: "Challan No", key: "challanNo", width: 14 },
    { header: "Challan Date", key: "challanDate", width: 14 },
    { header: "Party Name", key: "partyName", width: 28 },
    { header: "Party GSTN", key: "gstn", width: 18 },
    { header: "Total Qty", key: "qty", width: 12 },
    { header: "Taxable Amt", key: "taxableAmt", width: 16 },
    { header: "SGST", key: "sgst", width: 14 },
    { header: "CGST", key: "cgst", width: 14 },
    { header: "IGST", key: "igst", width: 14 },
    { header: "Total GST", key: "totalGst", width: 14 },
    { header: "Net Amount (INR)", key: "netAmount", width: 18 },
    { header: "Status", key: "status", width: 14 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2942" },
  };

  invoices.forEach((inv, idx) => {
    worksheet.addRow({
      no: idx + 1,
      invoiceNo: inv.invoiceNo,
      invoiceDate: new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
      challanNo: inv.challanNo || "-",
      challanDate: inv.challanDate ? new Date(inv.challanDate).toLocaleDateString("en-IN") : "-",
      partyName: inv.billingPartyName,
      gstn: inv.partyGstn || "-",
      qty: inv.totalQuantity,
      taxableAmt: inv.amountBeforeTax,
      sgst: inv.sgstAmount,
      cgst: inv.cgstAmount,
      igst: inv.igstAmount,
      totalGst: inv.totalGst,
      netAmount: inv.netAmount,
      status: inv.status,
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const exportInvoiceSkuWiseToExcel = async (userId, filters) => {
  const { invoices } = await findSalesInvoicesRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("SKU Wise Invoice Items");

  worksheet.columns = [
    { header: "Invoice No", key: "invoiceNo", width: 14 },
    { header: "Date", key: "date", width: 14 },
    { header: "Party Name", key: "partyName", width: 28 },
    { header: "Item No", key: "itemNo", width: 10 },
    { header: "Product SKU", key: "sku", width: 24 },
    { header: "Particular", key: "particular", width: 32 },
    { header: "HSN", key: "hsn", width: 14 },
    { header: "Qty", key: "qty", width: 12 },
    { header: "Rate", key: "rate", width: 14 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Taxable Amt", key: "taxableAmt", width: 14 },
    { header: "SGST", key: "sgst", width: 12 },
    { header: "CGST", key: "cgst", width: 12 },
    { header: "IGST", key: "igst", width: 12 },
    { header: "Total", key: "total", width: 16 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2942" },
  };

  invoices.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      worksheet.addRow({
        invoiceNo: inv.invoiceNo,
        date: new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
        partyName: inv.billingPartyName,
        itemNo: it.itemNo,
        sku: it.sku,
        particular: it.particular,
        hsn: it.hsn || "-",
        qty: it.quantity,
        rate: it.rate,
        amount: it.amount,
        taxableAmt: it.taxableAmount,
        sgst: it.sgstAmount,
        cgst: it.cgstAmount,
        igst: it.igstAmount,
        total: it.total,
      });
    });
  });

  return await workbook.xlsx.writeBuffer();
};

export const exportInvoiceTallyToExcel = async (userId, filters) => {
  const { invoices } = await findSalesInvoicesRepo(userId, { ...filters, limit: 10000, page: 1 });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Tally Format");

  worksheet.columns = [
    { header: "Vch Date", key: "date", width: 14 },
    { header: "Vch Type", key: "vchType", width: 16 },
    { header: "Vch No", key: "vchNo", width: 14 },
    { header: "Party Ledger", key: "partyLedger", width: 30 },
    { header: "GSTIN/UIN", key: "gstin", width: 18 },
    { header: "State", key: "state", width: 16 },
    { header: "Item Description", key: "item", width: 30 },
    { header: "HSN/SAC", key: "hsn", width: 14 },
    { header: "Quantity", key: "qty", width: 12 },
    { header: "Rate", key: "rate", width: 14 },
    { header: "Taxable Value", key: "taxable", width: 16 },
    { header: "CGST", key: "cgst", width: 14 },
    { header: "SGST", key: "sgst", width: 14 },
    { header: "IGST", key: "igst", width: 14 },
    { header: "Total Invoice Value", key: "total", width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F2942" },
  };

  invoices.forEach((inv) => {
    (inv.items || []).forEach((it) => {
      worksheet.addRow({
        date: new Date(inv.invoiceDate).toLocaleDateString("en-IN"),
        vchType: inv.invoiceType || "Sales",
        vchNo: inv.invoiceNo,
        partyLedger: inv.billingPartyName,
        gstin: inv.partyGstn || "-",
        state: inv.billingState || "-",
        item: it.particular || it.sku,
        hsn: it.hsn || "-",
        qty: it.quantity,
        rate: it.rate,
        taxable: it.taxableAmount,
        cgst: it.cgstAmount,
        sgst: it.sgstAmount,
        igst: it.igstAmount,
        total: it.total,
      });
    });
  });

  return await workbook.xlsx.writeBuffer();
};

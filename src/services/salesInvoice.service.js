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
    { header: "No", key: "no", width: 6 },
    { header: "OCInvoiceNo", key: "ocInvoiceNo", width: 14 },
    { header: "OCChallanNo", key: "ocChallanNo", width: 14 },
    { header: "ChallanRefNo", key: "challanRefNo", width: 14 },
    { header: "InvoiceType", key: "invoiceType", width: 14 },
    { header: "Date", key: "date", width: 14 },
    { header: "CustomerName", key: "customerName", width: 28 },
    { header: "ProductSKU", key: "productSku", width: 32 },
    { header: "HSNCode", key: "hsnCode", width: 14 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "DiscountAmount", key: "discountAmount", width: 15 },
    { header: "TaxableAmount", key: "taxableAmount", width: 15 },
    { header: "SGSTRate", key: "sgstRate", width: 12 },
    { header: "SGSTAmount", key: "sgstAmount", width: 12 },
    { header: "CGSTRate", key: "cgstRate", width: 12 },
    { header: "CGSTAmount", key: "cgstAmount", width: 12 },
    { header: "IGSTRate", key: "igstRate", width: 12 },
    { header: "IGSTAmount", key: "igstAmount", width: 12 },
    { header: "ProductNetAmount", key: "productNetAmount", width: 18 },
  ];

  // Header style matching requested format: blue background (#2E75B6), bold white text
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E75B6" },
  };

  let rowCounter = 1;
  let totalQty = 0;
  let totalAmount = 0;
  let totalDiscountAmount = 0;
  let totalTaxableAmount = 0;
  let totalSgstAmount = 0;
  let totalCgstAmount = 0;
  let totalIgstAmount = 0;
  let totalProductNetAmount = 0;

  invoices.forEach((inv) => {
    const invDateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "-";
    const ocChallanNo = inv.challanNo || (inv.challan ? inv.challan.challanNo : "-");
    const challanRef = inv.challan?.challanRefNo || inv.challanRefNo || "-";

    (inv.items || []).forEach((it) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const amt = Number(it.amount) || q * r;
      const disc = Number(it.discountAmount) || 0;
      const taxable = Number(it.taxableAmount) || amt - disc;
      const sgstR = Number(it.sgstRate) || 0;
      const sgstA = Number(it.sgstAmount) || 0;
      const cgstR = Number(it.cgstRate) || 0;
      const cgstA = Number(it.cgstAmount) || 0;
      const igstR = Number(it.igstRate) || 0;
      const igstA = Number(it.igstAmount) || 0;
      const net = Number(it.total) || taxable + sgstA + cgstA + igstA;

      totalQty += q;
      totalAmount += amt;
      totalDiscountAmount += disc;
      totalTaxableAmount += taxable;
      totalSgstAmount += sgstA;
      totalCgstAmount += cgstA;
      totalIgstAmount += igstA;
      totalProductNetAmount += net;

      worksheet.addRow({
        no: rowCounter++,
        ocInvoiceNo: inv.invoiceNo,
        ocChallanNo: ocChallanNo,
        challanRefNo: challanRef,
        invoiceType: inv.invoiceType || "Tax Invoice",
        date: invDateStr,
        customerName: inv.billingPartyName || "-",
        productSku: it.particular && it.particular.trim() ? it.particular.trim() : (it.sku || "-"),
        hsnCode: it.hsn || "-",
        quantity: q,
        rate: r,
        amount: amt,
        discountAmount: disc,
        taxableAmount: taxable,
        sgstRate: sgstR,
        sgstAmount: sgstA,
        cgstRate: cgstR,
        cgstAmount: cgstA,
        igstRate: igstR,
        igstAmount: igstA,
        productNetAmount: net,
      });
    });
  });

  // Total row matching requested format
  const totalRow = worksheet.addRow({
    no: "",
    ocInvoiceNo: "",
    ocChallanNo: "",
    challanRefNo: "",
    invoiceType: "",
    date: "",
    customerName: "",
    productSku: "Total.",
    hsnCode: "",
    quantity: Math.round(totalQty * 100) / 100,
    rate: "",
    amount: Math.round(totalAmount * 100) / 100,
    discountAmount: Math.round(totalDiscountAmount * 100) / 100,
    taxableAmount: Math.round(totalTaxableAmount * 100) / 100,
    sgstRate: "",
    sgstAmount: Math.round(totalSgstAmount * 100) / 100,
    cgstRate: "",
    cgstAmount: Math.round(totalCgstAmount * 100) / 100,
    igstRate: "",
    igstAmount: Math.round(totalIgstAmount * 100) / 100,
    productNetAmount: Math.round(totalProductNetAmount * 100) / 100,
  });

  totalRow.font = { bold: true };

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
    { header: "Date", key: "date", width: 14 },
    { header: "Order No / Ref No", key: "orderNoRefNo", width: 18 },
    { header: "Invoice No", key: "invoiceNo", width: 14 },
    { header: "Voucher Type", key: "voucherType", width: 16 },
    { header: "Customer Name", key: "customerName", width: 28 },
    { header: "Sale Account Name", key: "saleAccountName", width: 20 },
    { header: "End User Name", key: "endUserName", width: 28 },
    { header: "Sales Order Due Date if any", key: "salesOrderDueDate", width: 24 },
    { header: "Order No", key: "orderNo", width: 16 },
    { header: "Order Date", key: "orderDate", width: 14 },
    { header: "Order Other Reference", key: "orderOtherReference", width: 22 },
    { header: "Tracking id", key: "trackingId", width: 18 },
    { header: "Courier name", key: "courierName", width: 16 },
    { header: "CMP GSTN", key: "cmpGstn", width: 18 },
    { header: "GST Reg Name", key: "gstRegName", width: 28 },
    { header: "Dispatch From Address1", key: "dispatchFromAddress1", width: 26 },
    { header: "Dispatch From Address2", key: "dispatchFromAddress2", width: 26 },
    { header: "Dispatch From Address3", key: "dispatchFromAddress3", width: 26 },
    { header: "Dispatch From Place", key: "dispatchFromPlace", width: 18 },
    { header: "Dispatch From Pincode", key: "dispatchFromPincode", width: 20 },
    { header: "Buyer Adress Type", key: "buyerAdressType", width: 18 },
    { header: "Buyer Address1", key: "buyerAddress1", width: 26 },
    { header: "Buyer Address2", key: "buyerAddress2", width: 26 },
    { header: "Buyer Address3", key: "buyerAddress3", width: 26 },
    { header: "Bill To Place", key: "billToPlace", width: 18 },
    { header: "Bill To Pincode", key: "billToPincode", width: 16 },
    { header: "Consignee Name", key: "consigneeName", width: 28 },
    { header: "Consignee Address1", key: "consigneeAddress1", width: 26 },
    { header: "Consignee Address2", key: "consigneeAddress2", width: 26 },
    { header: "Consignee Address3", key: "consigneeAddress3", width: 26 },
    { header: "Ship To Place", key: "shipToPlace", width: 18 },
    { header: "Ship To Pincode", key: "shipToPincode", width: 16 },
    { header: "Consignee State", key: "consigneeState", width: 18 },
    { header: "Consignee Phone No", key: "consigneePhoneNo", width: 18 },
    { header: "Consignee GST No If Any", key: "consigneeGstNo", width: 24 },
    { header: "End User State", key: "endUserState", width: 18 },
    { header: "Country", key: "country", width: 14 },
    { header: "Contact number", key: "contactNumber", width: 16 },
    { header: "Email id", key: "emailId", width: 24 },
    { header: "End User GST NO If any", key: "endUserGstNo", width: 24 },
    { header: "Delivery Type", key: "deliveryType", width: 16 },
    { header: "Delivery Note No", key: "deliveryNoteNo", width: 18 },
    { header: "Delivery Note Dt", key: "deliveryNoteDt", width: 16 },
    { header: "Dispatch Doc No", key: "dispatchDocNo", width: 18 },
    { header: "Stock Item", key: "stockItem", width: 30 },
    { header: "HSN", key: "hsn", width: 14 },
    { header: "Godown Name", key: "godownName", width: 18 },
    { header: "Batch Name", key: "batchName", width: 18 },
    { header: "Qty", key: "qty", width: 10 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Rate", key: "rate", width: 12 },
    { header: "Disc Rate", key: "discRate", width: 12 },
    { header: "GST Rate", key: "gstRate", width: 12 },
    { header: "Cess Rate", key: "cessRate", width: 12 },
    { header: "Cess / Unit", key: "cessUnit", width: 12 },
    { header: "Other Exp1", key: "otherExp1", width: 12 },
    { header: "Other Exp2", key: "otherExp2", width: 12 },
    { header: "Other Exp3", key: "otherExp3", width: 12 },
    { header: "Other Exp4", key: "otherExp4", width: 12 },
    { header: "Other Exp5", key: "otherExp5", width: 12 },
    { header: "Narration", key: "narration", width: 26 },
    { header: "Post GST Discount", key: "postGstDiscount", width: 18 },
    { header: "TCS", key: "tcs", width: 12 },
    { header: "Round Off", key: "roundOff", width: 12 },
  ];

  // Header style: Blue background #2E75B6, bold white text
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E75B6" },
  };

  invoices.forEach((inv) => {
    const invDateStr = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "";
    const chDateStr = inv.challanDate ? new Date(inv.challanDate).toLocaleDateString("en-IN") : "";
    const ocChallanNo = inv.challanNo || (inv.challan ? inv.challan.challanNo : "");
    const challanRef = inv.challan?.challanRefNo || inv.challanRefNo || "";

    (inv.items || []).forEach((it) => {
      const q = Number(it.quantity) || 0;
      const r = Number(it.rate) || 0;
      const dp = Number(it.discountPercent) || 0;
      const sgstR = Number(it.sgstRate) || 0;
      const cgstR = Number(it.cgstRate) || 0;
      const igstR = Number(it.igstRate) || 0;
      const totalGstRate = sgstR + cgstR + igstR;

      worksheet.addRow({
        date: invDateStr,
        orderNoRefNo: challanRef || ocChallanNo,
        invoiceNo: inv.invoiceNo,
        voucherType: inv.invoiceType || "Sales",
        customerName: inv.billingPartyName || "",
        saleAccountName: "Sales Account",
        endUserName: inv.billingPartyName || "",
        salesOrderDueDate: "",
        orderNo: ocChallanNo,
        orderDate: chDateStr || invDateStr,
        orderOtherReference: challanRef,
        trackingId: inv.trackingNo || "",
        courierName: inv.courierPartner || "",
        cmpGstn: "",
        gstRegName: inv.billingPartyName || "",
        dispatchFromAddress1: inv.shippingAddress || inv.billingAddress || "",
        dispatchFromAddress2: inv.shippingAddress2 || "",
        dispatchFromAddress3: "",
        dispatchFromPlace: inv.shippingCity || inv.billingCity || "",
        dispatchFromPincode: inv.shippingPincode || inv.billingPincode || "",
        buyerAdressType: inv.partyGstn ? "Regular" : "Unregistered",
        buyerAddress1: inv.billingAddress || "",
        buyerAddress2: "",
        buyerAddress3: "",
        billToPlace: inv.billingCity || "",
        billToPincode: inv.billingPincode || "",
        consigneeName: inv.consigneeName || inv.shippingPartyName || inv.billingPartyName || "",
        consigneeAddress1: inv.shippingAddress || inv.billingAddress || "",
        consigneeAddress2: inv.shippingAddress2 || "",
        consigneeAddress3: "",
        shipToPlace: inv.shippingCity || inv.billingCity || "",
        shipToPincode: inv.shippingPincode || inv.billingPincode || "",
        consigneeState: inv.shippingState || inv.billingState || "",
        consigneePhoneNo: inv.shippingContact || inv.billingMobile || "",
        consigneeGstNo: inv.partyGstn || "",
        endUserState: inv.billingState || "",
        country: "India",
        contactNumber: inv.billingMobile || "",
        emailId: inv.billingEmail || "",
        endUserGstNo: inv.partyGstn || "",
        deliveryType: "",
        deliveryNoteNo: ocChallanNo,
        deliveryNoteDt: chDateStr,
        dispatchDocNo: ocChallanNo,
        stockItem: it.particular && it.particular.trim() ? it.particular.trim() : (it.sku || ""),
        hsn: it.hsn || "",
        godownName: "Main Location",
        batchName: "Primary Batch",
        qty: q,
        unit: "PCS",
        rate: r,
        discRate: dp,
        gstRate: totalGstRate,
        cessRate: 0,
        cessUnit: 0,
        otherExp1: 0,
        otherExp2: 0,
        otherExp3: 0,
        otherExp4: 0,
        otherExp5: 0,
        narration: inv.remarks || "Being sales invoice generated",
        postGstDiscount: 0,
        tcs: 0,
        roundOff: inv.roundOff || 0,
      });
    });
  });

  return await workbook.xlsx.writeBuffer();
};

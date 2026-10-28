import {
  getNextPurchaseInvoiceNoService,
  createPurchaseInvoiceService,
  getPurchaseInvoicesService,
  getPurchaseInvoiceByIdService,
  getPurchaseInvoiceByChallanIdService,
  updatePurchaseInvoiceService,
  deletePurchaseInvoiceService,
  exportPurchaseInvoiceDetailToExcel,
  exportPurchaseInvoiceSkuWiseToExcel,
  exportPurchaseInvoiceTallyToExcel,
} from "../services/purchaseInvoice.service.js";
import {
  createPurchaseInvoiceSchema,
  updatePurchaseInvoiceSchema,
} from "../validations/purchaseInvoice.validation.js";

export const getNextPurchaseInvoiceNo = async (req, res, next) => {
  try {
    const nextNo = await getNextPurchaseInvoiceNoService(req.user.id);
    return res.status(200).json({
      success: true,
      data: { nextInvoiceNo: nextNo },
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseInvoice = async (req, res, next) => {
  try {
    const data = createPurchaseInvoiceSchema.parse(req.body);
    const invoice = await createPurchaseInvoiceService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Purchase Invoice created successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPurchaseInvoices = async (req, res, next) => {
  try {
    const result = await getPurchaseInvoicesService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result.invoices,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseInvoiceById = async (req, res, next) => {
  try {
    const invoice = await getPurchaseInvoiceByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseInvoiceByChallanId = async (req, res, next) => {
  try {
    const invoice = await getPurchaseInvoiceByChallanIdService(req.params.challanId, req.user.id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseInvoice = async (req, res, next) => {
  try {
    const data = updatePurchaseInvoiceSchema.parse(req.body);
    const invoice = await updatePurchaseInvoiceService(req.params.id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Purchase Invoice updated successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseInvoice = async (req, res, next) => {
  try {
    await deletePurchaseInvoiceService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Purchase Invoice deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const exportPurchaseInvoiceDetail = async (req, res, next) => {
  try {
    const buffer = await exportPurchaseInvoiceDetailToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Purchase_Invoices_Detail.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportPurchaseInvoiceSkuWise = async (req, res, next) => {
  try {
    const buffer = await exportPurchaseInvoiceSkuWiseToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Purchase_Invoices_SKU_Wise.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportPurchaseInvoiceTally = async (req, res, next) => {
  try {
    const buffer = await exportPurchaseInvoiceTallyToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Purchase_Invoices_Tally.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

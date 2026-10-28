import {
  getNextInvoiceNoService,
  createSalesInvoiceService,
  getSalesInvoicesService,
  getSalesInvoiceByIdService,
  getSalesInvoiceByChallanIdService,
  updateSalesInvoiceService,
  deleteSalesInvoiceService,
  exportInvoiceDetailToExcel,
  exportInvoiceSkuWiseToExcel,
  exportInvoiceTallyToExcel,
} from "../services/salesInvoice.service.js";
import {
  createSalesInvoiceSchema,
  updateSalesInvoiceSchema,
} from "../validations/salesInvoice.validation.js";

export const getNextInvoiceNo = async (req, res, next) => {
  try {
    const nextNo = await getNextInvoiceNoService(req.user.id);
    return res.status(200).json({
      success: true,
      data: { nextInvoiceNo: nextNo },
    });
  } catch (error) {
    next(error);
  }
};

export const createSalesInvoice = async (req, res, next) => {
  try {
    const data = createSalesInvoiceSchema.parse(req.body);
    const invoice = await createSalesInvoiceService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Sales Invoice created successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSalesInvoices = async (req, res, next) => {
  try {
    const result = await getSalesInvoicesService(req.user.id, req.query);
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

export const getSalesInvoiceById = async (req, res, next) => {
  try {
    const invoice = await getSalesInvoiceByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getSalesInvoiceByChallanId = async (req, res, next) => {
  try {
    const invoice = await getSalesInvoiceByChallanIdService(req.params.challanId, req.user.id);
    return res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSalesInvoice = async (req, res, next) => {
  try {
    const data = updateSalesInvoiceSchema.parse(req.body);
    const invoice = await updateSalesInvoiceService(req.params.id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Sales Invoice updated successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSalesInvoice = async (req, res, next) => {
  try {
    await deleteSalesInvoiceService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Sales Invoice deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const exportInvoiceDetail = async (req, res, next) => {
  try {
    const buffer = await exportInvoiceDetailToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Sales_Invoices_Detail.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportInvoiceSkuWise = async (req, res, next) => {
  try {
    const buffer = await exportInvoiceSkuWiseToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Sales_Invoices_SKU_Wise.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const exportInvoiceTally = async (req, res, next) => {
  try {
    const buffer = await exportInvoiceTallyToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="Sales_Invoices_Tally.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

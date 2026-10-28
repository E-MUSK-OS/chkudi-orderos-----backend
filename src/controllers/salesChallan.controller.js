import {
  createSalesChallanService,
  getSalesChallansService,
  getSalesChallanByIdService,
  updateSalesChallanService,
  deleteSalesChallanService,
  getNextChallanNoService,
  searchProductSkusService,
  exportChallansToExcel,
  exportSkuWiseToExcel,
  exportBlankFormatExcel,
} from "../services/salesChallan.service.js";
import {
  createSalesChallanSchema,
  updateSalesChallanSchema,
} from "../validations/salesChallan.validation.js";

export const getNextChallanNo = async (req, res, next) => {
  try {
    const nextNo = await getNextChallanNoService(req.user.id);
    return res.status(200).json({
      success: true,
      data: { nextChallanNo: nextNo },
    });
  } catch (error) {
    next(error);
  }
};

export const createSalesChallan = async (req, res, next) => {
  try {
    const data = createSalesChallanSchema.parse(req.body);
    const challan = await createSalesChallanService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Sales Challan created successfully.",
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllSalesChallans = async (req, res, next) => {
  try {
    const result = await getSalesChallansService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result.challans,
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

export const getSalesChallanById = async (req, res, next) => {
  try {
    const challan = await getSalesChallanByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSalesChallan = async (req, res, next) => {
  try {
    const data = updateSalesChallanSchema.parse(req.body);
    const updated = await updateSalesChallanService(req.params.id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Sales Challan updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSalesChallan = async (req, res, next) => {
  try {
    await deleteSalesChallanService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Sales Challan deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const searchProductSkus = async (req, res, next) => {
  try {
    const search = req.query.q || req.query.search || "";
    const results = await searchProductSkusService(req.user.id, search);
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadChallansExcel = async (req, res, next) => {
  try {
    const buffer = await exportChallansToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales_challans_${Date.now()}.xlsx"`
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const downloadSkuWiseExcel = async (req, res, next) => {
  try {
    const buffer = await exportSkuWiseToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sales_challans_sku_wise_${Date.now()}.xlsx"`
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

export const downloadBlankFormatExcel = async (req, res, next) => {
  try {
    const buffer = await exportBlankFormatExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="challan_blank_format.xlsx"`
    );
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
};

import {
  createPurchaseChallanService,
  getPurchaseChallansService,
  getPurchaseChallanByIdService,
  updatePurchaseChallanService,
  deletePurchaseChallanService,
  getNextPurchaseChallanNoService,
  searchProductSkusService,
  exportPurchaseChallansToExcel,
  exportPurchaseSkuWiseToExcel,
  exportPurchaseBlankFormatExcel,
} from "../services/purchaseChallan.service.js";
import {
  createPurchaseChallanSchema,
  updatePurchaseChallanSchema,
} from "../validations/purchaseChallan.validation.js";

export const getNextPurchaseChallanNo = async (req, res, next) => {
  try {
    const nextNo = await getNextPurchaseChallanNoService(req.user.id);
    return res.status(200).json({
      success: true,
      data: { nextChallanNo: nextNo },
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseChallan = async (req, res, next) => {
  try {
    const data = createPurchaseChallanSchema.parse(req.body);
    const challan = await createPurchaseChallanService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Purchase Challan created successfully.",
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPurchaseChallans = async (req, res, next) => {
  try {
    const result = await getPurchaseChallansService(req.user.id, req.query);
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

export const getPurchaseChallanById = async (req, res, next) => {
  try {
    const challan = await getPurchaseChallanByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseChallan = async (req, res, next) => {
  try {
    const data = updatePurchaseChallanSchema.parse(req.body);
    const challan = await updatePurchaseChallanService(req.params.id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Purchase Challan updated successfully.",
      data: challan,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseChallan = async (req, res, next) => {
  try {
    await deletePurchaseChallanService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Purchase Challan deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const searchProductSkus = async (req, res, next) => {
  try {
    const skus = await searchProductSkusService(req.user.id, req.query.q);
    return res.status(200).json({
      success: true,
      data: skus,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadChallansExcel = async (req, res, next) => {
  try {
    const workbook = await exportPurchaseChallansToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Purchase_Challans_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const downloadSkuWiseExcel = async (req, res, next) => {
  try {
    const workbook = await exportPurchaseSkuWiseToExcel(req.user.id, req.query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Purchase_Challans_SKU_Wise_${Date.now()}.xlsx`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const downloadBlankFormatExcel = async (req, res, next) => {
  try {
    const workbook = await exportPurchaseBlankFormatExcel();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Purchase_Challan_Template.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

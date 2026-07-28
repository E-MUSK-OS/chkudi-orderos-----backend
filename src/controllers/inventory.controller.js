import {
  getInventoriesService,
  getInventoryByIdService,
  updateInventoryService,
  adjustInventoryService,
  deleteInventoryService,
  exportInventoryService,
  importInventoryService,
} from "../services/inventory.service.js";

import {
  updateInventorySchema,
  adjustInventorySchema,
} from "../validations/inventory.validation.js";

// ==================================================================================
// ============================== GET INVENTORIES ===================================
// ==================================================================================

export const getInventories = async (req, res, next) => {
  try {
    // const result = await getInventoriesService({
    //   userId: req.user.id,
    //   page: req.query.page,
    //   limit: req.query.limit,
    //   search: req.query.search,
    //   productId: req.query.productId,
    //   variantStatus:
    //     req.query.variantStatus !== undefined
    //       ? req.query.variantStatus === "true"
    //       : undefined,
    //   sortBy: req.query.sortBy,
    //   sortOrder: req.query.sortOrder,
    // });

    const result = await getInventoriesService({
      userId: req.user.id,
      warehouseId: req.query.warehouseId,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      productId: req.query.productId,
      variantStatus:
        req.query.variantStatus !== undefined
          ? req.query.variantStatus === "true"
          : undefined,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: "Inventories fetched successfully.",
      data: result.inventories,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// =========================== GET INVENTORY BY ID ==================================
// ==================================================================================

export const getInventoryById = async (req, res, next) => {
  try {
    const inventory = await getInventoryByIdService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Inventory fetched successfully.",
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================= UPDATE INVENTORY ===================================
// ==================================================================================

export const updateInventory = async (req, res, next) => {
  try {
    const data = updateInventorySchema.parse(req.body);

    const inventory = await updateInventoryService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Inventory updated successfully.",
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================= ADJUST INVENTORY ===================================
// ==================================================================================

export const adjustInventory = async (req, res, next) => {
  try {
    const data = adjustInventorySchema.parse(req.body);

    const inventory = await adjustInventoryService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Inventory adjusted successfully.",
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// ==================================================================================
// ============================= DELETE INVENTORY ===================================
// ==================================================================================

export const deleteInventory = async (req, res, next) => {
  try {
    const result = await deleteInventoryService(req.params.id, req.user.id);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const exportInventory = async (req, res, next) => {
  try {
    // const workbook = await exportInventoryService(req.user.id);
    const workbook = await exportInventoryService(
      req.user.id,
      req.query.warehouseId,
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Inventory.xlsx"',
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    next(error);
  }
};

export const importInventory = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Excel file is required.",
      });
    }

    // const result = await importInventoryService(req.user.id, req.file);
    const result = await importInventoryService(
      req.user.id,
      req.file,
      // req.body.warehouseId,
    );

    return res.status(200).json({
      success: true,
      message: "Inventory imported successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

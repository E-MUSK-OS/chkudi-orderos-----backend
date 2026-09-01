import {
  createWarehouseService,
  getAllWarehousesService,
  getWarehouseByIdService,
  updateWarehouseService,
  deleteWarehouseService,
  updateWarehouseStatusService,
  getWarehouseStatsService,
} from "../services/warehouse.service.js";

import {
  createWarehouseSchema,
  updateWarehouseSchema,
  updateWarehouseStatusSchema,
} from "../validations/warehouse.validation.js";

// ======================================================
// Create Warehouse
// ======================================================

export const createWarehouse = async (req, res, next) => {
  try {
    const data = createWarehouseSchema.parse(req.body);

    const warehouse = await createWarehouseService(req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Warehouse created successfully.",
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get All Warehouses
// ======================================================

export const getAllWarehouses = async (req, res, next) => {
  try {
    const warehouses = await getAllWarehousesService(req.user.id);

    return res.status(200).json({
      success: true,
      data: warehouses,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Get Warehouse By Id
// ======================================================

export const getWarehouseById = async (req, res, next) => {
  try {
    const warehouse = await getWarehouseByIdService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Warehouse
// ======================================================

export const updateWarehouse = async (req, res, next) => {
  try {
    const data = updateWarehouseSchema.parse(req.body);

    const warehouse = await updateWarehouseService(
      req.params.id,
      req.user.id,
      data,
    );

    return res.status(200).json({
      success: true,
      message: "Warehouse updated successfully.",
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Delete Warehouse
// ======================================================

export const deleteWarehouse = async (req, res, next) => {
  try {
    await deleteWarehouseService(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ======================================================
// Update Warehouse Status
// ======================================================

export const updateWarehouseStatus = async (req, res, next) => {
  try {
    const { isActive } = updateWarehouseStatusSchema.parse(req.body);

    const warehouse = await updateWarehouseStatusService(
      req.params.id,
      req.user.id,
      isActive,
    );

    return res.status(200).json({
      success: true,
      message: `Warehouse ${
        isActive ? "activated" : "deactivated"
      } successfully.`,
      data: warehouse,
    });
  } catch (error) {
    next(error);
  }
};

export const getWarehouseStats = async (req, res, next) => {
  try {
    const stats = await getWarehouseStatsService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Warehouse statistics fetched successfully.",
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

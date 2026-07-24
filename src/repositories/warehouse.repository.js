import prisma from "../config/prisma.js";

// ======================================================
// Count Warehouses By User
// ======================================================

export const countWarehousesByUserId = async (userId) => {
  return await prisma.warehouse.count({
    where: {
      userId,
    },
  });
};

// ======================================================
// Create Warehouse
// ======================================================

export const createWarehouse = async (data) => {
  return await prisma.warehouse.create({
    data,
  });
};

// ======================================================
// Get All Warehouses
// ======================================================

export const getWarehousesByUserId = async (userId) => {
  return await prisma.warehouse.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Warehouse By Id
// ======================================================

export const getWarehouseById = async (id, userId) => {
  return await prisma.warehouse.findFirst({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Find Warehouse By Name
// ======================================================

export const findWarehouseByName = async (warehouseName, userId) => {
  return await prisma.warehouse.findFirst({
    where: {
      warehouseName,
      userId,
    },
  });
};

// ======================================================
// Find Warehouse By Code
// ======================================================

export const findWarehouseByCode = async (warehouseCode, userId) => {
  return await prisma.warehouse.findFirst({
    where: {
      warehouseCode,
      userId,
    },
  });
};

// ======================================================
// Update Warehouse
// ======================================================

export const updateWarehouse = async (id, data) => {
  return await prisma.warehouse.update({
    where: {
      id,
    },
    data,
  });
};

// ======================================================
// Delete Warehouse
// ======================================================

export const deleteWarehouse = async (id, userId) => {
  return await prisma.warehouse.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Get Default Warehouse
// ======================================================

export const getDefaultWarehouse = async (userId) => {
  return await prisma.warehouse.findFirst({
    where: {
      userId,
      isDefault: true,
    },
  });
};

// ======================================================
// Clear Default Warehouse
// ======================================================

export const clearDefaultWarehouse = async (userId) => {
  return await prisma.warehouse.updateMany({
    where: {
      userId,
      isDefault: true,
    },
    data: {
      isDefault: false,
    },
  });
};

// ======================================================
// Update Warehouse Status
// ======================================================

export const updateWarehouseStatus = async (id, isActive) => {
  return await prisma.warehouse.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });
};

export const getWarehouseStats = async (userId) => {
  const totalWarehouses = await prisma.warehouse.count({
    where: { userId },
  });

  const activeWarehouses = await prisma.warehouse.count({
    where: {
      userId,
      isActive: true,
    },
  });

  const inactiveWarehouses = await prisma.warehouse.count({
    where: {
      userId,
      isActive: false,
    },
  });

  const defaultWarehouse = await prisma.warehouse.findFirst({
    where: {
      userId,
      isDefault: true,
    },
    select: {
      id: true,
      warehouseName: true,
    },
  });

  return {
    totalWarehouses,
    activeWarehouses,
    inactiveWarehouses,
    defaultWarehouse,
  };
};

import ExcelJS from "exceljs";
import {
  createInventory,
  getInventoryById,
  getInventoryByVariantId,
  getInventories,
  updateInventory,
  adjustInventory,
  deleteInventory,
} from "../repositories/inventory.repository.js";
import { AppError } from "../utils/AppError.js";
import prisma from "../config/prisma.js";
import { checkInventoryNotifications } from "./inventoryNotification.service.js";

export const getInventoriesService = async ({
  userId,
  page,
  limit,
  search,
  productId,
  variantStatus,
  sortBy,
  sortOrder,
}) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const result = await getInventories({
    userId,
    page,
    limit,
    search,
    productId,
    variantStatus,
    sortBy,
    sortOrder,
  });

  return result;
};

export const getInventoryByIdService = async (id, userId) => {
  if (!id) {
    throw new AppError("Inventory id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const inventory = await getInventoryById(id);

  if (!inventory) {
    throw new AppError("Inventory not found.", 404);
  }

  if (inventory.userId !== userId) {
    throw new AppError("You are not authorized to access this inventory.", 403);
  }

  return inventory;
};

export const updateInventoryService = async (id, userId, data) => {
  if (!id) {
    throw new AppError("Inventory id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const inventory = await getInventoryById(id);

  if (!inventory) {
    throw new AppError("Inventory not found.", 404);
  }

  if (inventory.userId !== userId) {
    throw new AppError("You are not authorized to update this inventory.", 403);
  }

  if (data.reorderLevel !== undefined && data.reorderLevel < 0) {
    throw new AppError("Reorder level cannot be less than 0.", 400);
  }

  const updatedInventory = await updateInventory(id, data);

  return updatedInventory;
};

export const adjustInventoryService = async (id, userId, data) => {
  const { quantity, adjustmentType, reason } = data;

  // ======================================================
  // Validate Input
  // ======================================================

  if (!id) {
    throw new AppError("Inventory id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  if (!quantity || quantity <= 0) {
    throw new AppError("Quantity must be greater than 0.", 400);
  }

  if (!["IN", "OUT"].includes(adjustmentType)) {
    throw new AppError("Invalid adjustment type.", 400);
  }

  if (!reason?.trim()) {
    throw new AppError("Reason is required.", 400);
  }

  // ======================================================
  // Transaction
  // ======================================================

  return await prisma.$transaction(async (tx) => {
    // ======================================================
    // Get Inventory
    // ======================================================

    const inventory = await getInventoryById(id, tx);

    if (!inventory) {
      throw new AppError("Inventory not found.", 404);
    }

    // ======================================================
    // Ownership Check
    // ======================================================

    if (inventory.userId !== userId) {
      throw new AppError(
        "You are not authorized to update this inventory.",
        403,
      );
    }

    // ======================================================
    // Calculate Available Stock
    // ======================================================

    let availableStock = inventory.availableStock;

    if (adjustmentType === "IN") {
      availableStock += quantity;
    }

    if (adjustmentType === "OUT") {
      if (availableStock < quantity) {
        throw new AppError("Insufficient stock available.", 400);
      }

      availableStock -= quantity;
    }

    // ======================================================
    // Update Inventory
    // ======================================================

    const updatedInventory = await adjustInventory(
      id,
      {
        availableStock,
      },
      tx,
    );

    const inventoryWithRelations = await tx.productInventory.findUnique({
      where: {
        id: updatedInventory.id,
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    });

    const notificationFlags = await checkInventoryNotifications(
      inventoryWithRelations,
    );

    if (notificationFlags) {
      await tx.productInventory.update({
        where: {
          id: updatedInventory.id,
        },
        data: notificationFlags,
      });
    }

    // ======================================================
    // Future Inventory History
    // ======================================================

    /*
    await createInventoryHistory(
      {
        inventoryId: inventory.id,
        productVariantId: inventory.productVariantId,
        userId,
        adjustmentType,
        quantity,
        previousStock: inventory.availableStock,
        currentStock: availableStock,
        reason,
      },
      tx
    );
    */

    return updatedInventory;
  });
};

export const createInventoryService = async (productVariantId, userId, tx) => {
  if (!productVariantId) {
    throw new AppError("Product variant id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const existingInventory = await getInventoryByVariantId(productVariantId);

  if (existingInventory) {
    throw new AppError("Inventory already exists for this variant.", 409);
  }

  return await createInventory(
    {
      productVariantId,

      userId,

      availableStock: 0,

      reservedStock: 0,

      damagedStock: 0,

      incomingStock: 0,

      reorderLevel: 10,
    },
    tx,
  );
};

export const deleteInventoryService = async (id, userId) => {
  // ======================================================
  // Validate Input
  // ======================================================

  if (!id) {
    throw new AppError("Inventory id is required.", 400);
  }

  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  // ======================================================
  // Get Inventory
  // ======================================================

  const inventory = await getInventoryById(id);

  if (!inventory) {
    throw new AppError("Inventory not found.", 404);
  }

  // ======================================================
  // Ownership Check
  // ======================================================

  if (inventory.userId !== userId) {
    throw new AppError("You are not authorized to delete this inventory.", 403);
  }

  // ======================================================
  // Delete Inventory
  // ======================================================

  await deleteInventory(id);

  return {
    success: true,
    message: "Inventory deleted successfully.",
  };
};

export const exportInventoryService = async (userId) => {
  if (!userId) throw new AppError("User not found.", 401);

  const inventories = await prisma.productInventory.findMany({
    where: { userId },
    include: {
      productVariant: {
        include: {
          product: true,
          attributes: {
            include: {
              productAttribute: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!inventories.length) {
    throw new AppError("No inventory found to export.", 404);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OMS";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Inventory");

  const attributeNames = [
    ...new Set(
      inventories.flatMap((inventory) =>
        inventory.productVariant.attributes.map(
          (attribute) => attribute.productAttribute.attributeName,
        ),
      ),
    ),
  ];

  worksheet.columns = [
    { header: "Product Name", key: "productName", width: 35 },
    { header: "Master SKU", key: "masterSku", width: 25 },
    { header: "Variant SKU", key: "variantSku", width: 30 },
    // { header: "Attributes", key: "attributes", width: 40 },
    ...attributeNames.map((name) => ({
      header: name,
      key: name,
      width: 18,
    })),
    { header: "Available", key: "availableStock", width: 15 },
    { header: "Reserved", key: "reservedStock", width: 15 },
    { header: "Incoming", key: "incomingStock", width: 15 },
    { header: "Damaged", key: "damagedStock", width: 15 },
    { header: "Reorder", key: "reorderLevel", width: 15 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: "FF0A0E1A",
      },
    };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // inventories.forEach((inventory) => {
  //   const attributes = inventory.productVariant.attributes
  //     .map(
  //       (attribute) =>
  //         `${attribute.productAttribute.attributeName}: ${attribute.attributeValue}`,
  //     )
  //     .join(", ");

  //   worksheet.addRow({
  //     productName: inventory.productVariant.product.productName,
  //     masterSku: inventory.productVariant.product.masterSku,
  //     variantSku: inventory.productVariant.variantSku,
  //     attributes,
  //     availableStock: inventory.availableStock,
  //     reservedStock: inventory.reservedStock,
  //     incomingStock: inventory.incomingStock,
  //     damagedStock: inventory.damagedStock,
  //     reorderLevel: inventory.reorderLevel,
  //   });
  // });

  inventories.forEach((inventory) => {
    const row = {
      productName: inventory.productVariant.product.productName,

      masterSku: inventory.productVariant.product.masterSku,

      variantSku: inventory.productVariant.variantSku,

      availableStock: inventory.availableStock,

      reservedStock: inventory.reservedStock,

      incomingStock: inventory.incomingStock,

      damagedStock: inventory.damagedStock,

      reorderLevel: inventory.reorderLevel,
    };

    inventory.productVariant.attributes.forEach((attribute) => {
      row[attribute.productAttribute.attributeName] = attribute.attributeValue;
    });

    worksheet.addRow(row);
  });

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: "I1" };

  return workbook;
};

export const importInventoryService = async (userId, file) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  if (!file) {
    throw new AppError("Excel file is required.", 400);
  }

  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(file.buffer);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new AppError("Worksheet not found.", 400);
  }

  // ======================================================
  // Header Mapping
  // ======================================================

  const headerRow = worksheet.getRow(1);

  const headerMap = {};

  headerRow.eachCell((cell, colNumber) => {
    headerMap[String(cell.value).trim()] = colNumber;
  });

  // ======================================================
  // Required Headers
  // ======================================================

  const requiredHeaders = [
    "Variant SKU",
    "Available",
    "Reserved",
    "Incoming",
    "Damaged",
    "Reorder",
  ];

  for (const header of requiredHeaders) {
    if (!headerMap[header]) {
      throw new AppError(`Missing required column: ${header}`, 400);
    }
  }

  // ======================================================
  // Read Excel Rows
  // ======================================================

  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    rows.push({
      rowNumber,

      variantSku: String(
        row.getCell(headerMap["Variant SKU"]).value ?? "",
      ).trim(),

      availableStock: Number(row.getCell(headerMap["Available"]).value ?? 0),

      reservedStock: Number(row.getCell(headerMap["Reserved"]).value ?? 0),

      incomingStock: Number(row.getCell(headerMap["Incoming"]).value ?? 0),

      damagedStock: Number(row.getCell(headerMap["Damaged"]).value ?? 0),

      reorderLevel: Number(row.getCell(headerMap["Reorder"]).value ?? 0),
    });
  });

  // ======================================================
  // Collect Variant SKU
  // ======================================================

  const variantSkus = rows.map((row) => row.variantSku).filter(Boolean);

  // ======================================================
  // Transaction
  // ======================================================

  return await prisma.$transaction(async (tx) => {
    // ======================================================
    // Fetch All Inventories (Single Query)
    // ======================================================

    const inventories = await tx.productInventory.findMany({
      where: {
        userId,
        productVariant: {
          variantSku: {
            in: variantSkus,
          },
        },
      },
      include: {
        productVariant: {
          select: {
            id: true,
            variantSku: true,
          },
        },
      },
    });

    // ======================================================
    // Create Inventory Map
    // ======================================================

    const inventoryMap = new Map();

    for (const inventory of inventories) {
      inventoryMap.set(inventory.productVariant.variantSku, inventory);
    }

    let updated = 0;

    let failed = 0;

    const errors = [];

    // ======================================================
    // Update Rows
    // ======================================================

    for (const row of rows) {
      // Variant SKU Validation

      if (!row.variantSku) {
        failed++;

        errors.push({
          row: row.rowNumber,
          variantSku: "",
          message: "Variant SKU is required",
        });

        continue;
      }

      // Number Validation

      const stockFields = [
        "availableStock",
        "reservedStock",
        "incomingStock",
        "damagedStock",
        "reorderLevel",
      ];

      const hasInvalidNumber = stockFields.some((field) =>
        Number.isNaN(row[field]),
      );

      if (hasInvalidNumber) {
        failed++;

        errors.push({
          row: row.rowNumber,
          variantSku: row.variantSku,
          message: "Invalid stock value",
        });

        continue;
      }

      // Get Inventory From Map

      const inventory = inventoryMap.get(row.variantSku);

      if (!inventory) {
        failed++;

        errors.push({
          row: row.rowNumber,
          variantSku: row.variantSku,
          message: "Variant SKU not found",
        });

        continue;
      }

      // Update Inventory

      const updatedInventory = await tx.productInventory.update({
        where: {
          id: inventory.id,
        },
        data: {
          availableStock: row.availableStock,
          reservedStock: row.reservedStock,
          incomingStock: row.incomingStock,
          damagedStock: row.damagedStock,
          reorderLevel: row.reorderLevel,
        },
      });

      const inventoryWithRelations = await tx.productInventory.findUnique({
        where: {
          id: updatedInventory.id,
        },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      });

      const notificationFlags = await checkInventoryNotifications(
        inventoryWithRelations,
      );

      if (notificationFlags) {
        await tx.productInventory.update({
          where: {
            id: updatedInventory.id,
          },
          data: notificationFlags,
        });
      }

      updated++;
    }

    return {
      totalRows: rows.length,
      updated,
      failed,
      errors,
    };
  });
};

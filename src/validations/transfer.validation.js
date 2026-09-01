import { z } from "zod";

// ==================================================================================
// ============================== TRANSFER ITEM =====================================
// ==================================================================================

const transferItemSchema = z.object({
  productVariantId: z
    .string()
    .trim()
    .min(1, "Product Variant is required"),

  quantity: z
    .number({
      invalid_type_error: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),
});

// ==================================================================================
// ============================== CREATE TRANSFER ===================================
// ==================================================================================

export const createTransferSchema = z
  .object({
    fromWarehouseId: z
      .string()
      .trim()
      .min(1, "From Warehouse is required"),

    toWarehouseId: z
      .string()
      .trim()
      .min(1, "To Warehouse is required"),

    notes: z
      .string()
      .trim()
      .max(500, "Notes cannot exceed 500 characters")
      .optional(),

    items: z
      .array(transferItemSchema)
      .min(1, "At least one product is required"),
  })
  .refine(
    (data) => data.fromWarehouseId !== data.toWarehouseId,
    {
      message: "From Warehouse and To Warehouse cannot be the same",
      path: ["toWarehouseId"],
    },
  );

// ==================================================================================
// ============================== UPDATE STATUS =====================================
// ==================================================================================

export const updateTransferStatusSchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED"]),
});
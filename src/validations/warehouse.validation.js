import { z } from "zod";

// ======================================================
// Create Warehouse Validation
// ======================================================

export const createWarehouseSchema = z.object({
  warehouseName: z
    .string()
    .trim()
    .min(2, "Warehouse name must be at least 2 characters.")
    .max(100, "Warehouse name cannot exceed 100 characters."),

  warehouseCode: z
    .string()
    .trim()
    .min(2, "Warehouse code must be at least 2 characters.")
    .max(20, "Warehouse code cannot exceed 20 characters."),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional(),

  isDefault: z.boolean().optional(),

  isActive: z.boolean().optional(),

  contactPerson: z.string().trim().max(100).optional(),

  phone: z.string().trim().max(20).optional(),

  email: z
    .string()
    .trim()
    .email("Invalid email address.")
    .optional()
    .or(z.literal("")),

  addressLine1: z.string().trim().max(255).optional(),

  addressLine2: z.string().trim().max(255).optional(),

  city: z.string().trim().max(100).optional(),

  state: z.string().trim().max(100).optional(),

  country: z.string().trim().max(100).optional(),

  pincode: z.string().trim().max(20).optional(),

  gstNumber: z.string().trim().max(30).optional(),
});

// ======================================================
// Update Warehouse Validation
// ======================================================

export const updateWarehouseSchema = createWarehouseSchema.partial();

// ======================================================
// Update Warehouse Status Validation
// ======================================================

export const updateWarehouseStatusSchema = z.object({
  isActive: z.boolean(),
});

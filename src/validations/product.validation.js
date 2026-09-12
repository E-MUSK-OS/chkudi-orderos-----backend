import { z } from "zod";

// ======================================================
// Create Product Validation
// ======================================================

const productAttributeSchema = z.object({
  id: z.string().optional(),  
  attributeName: z
    .string()
    .trim()
    .min(1, "Attribute name is required.")
    .max(100, "Attribute name cannot exceed 100 characters."),
});

export const createProductSchema = z.object({
  productName: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters.")
    .max(255, "Product name cannot exceed 255 characters."),

  masterSku: z
    .string()
    .trim()
    .min(2, "Master SKU must be at least 2 characters.")
    .max(100, "Master SKU cannot exceed 100 characters."),

  brand: z
    .string()
    .trim()
    .max(100, "Brand cannot exceed 100 characters.")
    .optional(),

  category: z
    .string()
    .trim()
    .min(2, "Category is required.")
    .max(100, "Category cannot exceed 100 characters."),

  subCategory: z
    .string()
    .trim()
    .max(100, "Sub category cannot exceed 100 characters.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description cannot exceed 1000 characters.")
    .optional(),

  asin: z
    .string()
    .trim()
    .max(100, "ASIN cannot exceed 100 characters.")
    .optional()
    .nullable(),

  rackAddress: z
    .string()
    .trim()
    .max(100, "Rack address cannot exceed 100 characters.")
    .optional()
    .nullable(),

  generateBarcode: z
    .string()
    .trim()
    .max(50, "Generate Barcode cannot exceed 50 characters.")
    .optional()
    .nullable(),

  mrp: z
    .number()
    .min(0, "MRP must be a non-negative number.")
    .optional()
    .nullable(),

  hsnCode: z
    .string()
    .trim()
    .max(50, "HSN code cannot exceed 50 characters.")
    .optional()
    .nullable(),

  gstRate: z
    .number()
    .min(0, "GST rate must be a non-negative number.")
    .optional()
    .nullable(),

  attributes: z.array(productAttributeSchema).default([]),

  isActive: z.boolean().optional(),
});

// ======================================================
// Update Product Validation
// ======================================================

export const updateProductSchema = createProductSchema.partial();

// ======================================================
// Update Product Status Validation
// ======================================================

export const updateProductStatusSchema = z.object({
  isActive: z.boolean(),
});

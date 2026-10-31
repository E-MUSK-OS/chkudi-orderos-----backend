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
  attributeValue: z.string().trim().optional(),
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
    .preprocess(
      (val) => (val === undefined || val === null ? "" : String(val).trim()),
      z.string({ required_error: "MRP is required." }).min(1, "MRP is required.")
    ),

  mfgMonth: z
    .string()
    .trim()
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

  // General Details (New Fields)
  sku: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().max(50).optional().nullable().default("Pcs"),
  sizeList: z.string().trim().max(500).optional().nullable(),
  colors: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [])))
    .optional()
    .default([]),
  marketplace: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : ["All"])))
    .optional()
    .default(["All"]),
  gender: z.string().trim().max(50).optional().nullable(),
  referenceParty: z.string().trim().max(100).optional().nullable(),

  // Kardex Details (New Fields)
  productCost: z.number().min(0).optional().nullable().default(0),
  dealerRate: z.number().min(0).optional().nullable().default(0),
  retailRate: z.number().min(0).optional().nullable().default(0),
  openingStock: z.number().int().min(0).optional().nullable().default(0),
  reorderLevelStock: z.number().int().min(0).optional().nullable().default(0),
  minimumStock: z.number().int().min(0).optional().nullable().default(0),
  productPoints: z.number().min(0).optional().nullable().default(1),
  isPaired: z.boolean().optional().default(false),
  availability: z.string().trim().max(50).optional().nullable().default("Public"),

  attributes: z.array(productAttributeSchema).default([]),

  isActive: z.boolean().optional(),
});

// ======================================================
// Update Product Validation
// ======================================================

export const updateProductSchema = createProductSchema.partial().extend({
  gender: z.string().trim().max(50).optional().nullable(),
  referenceParty: z.string().trim().max(100).optional().nullable(),
  sizeList: z.string().trim().max(500).optional().nullable(),
  colors: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [])))
    .optional(),
  marketplace: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [])))
    .optional(),
  mrp: z
    .preprocess(
      (val) => (val === undefined || val === null ? undefined : String(val).trim()),
      z.string().min(1, "MRP cannot be empty.").optional()
    ),
  mfgMonth: z.string().trim().optional().nullable(),
});

// ======================================================
// Update Product Status Validation
// ======================================================

export const updateProductStatusSchema = z.object({
  isActive: z.boolean(),
});

// ======================================================
// Dropdown Option Validation
// ======================================================

export const createDropdownOptionSchema = z.object({
  field: z.string().trim().min(1, "Field name is required."),
  value: z.string().trim().min(1, "Option value is required."),
  label: z.string().trim().optional(),
});

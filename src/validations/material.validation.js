import { z } from "zod";

// ======================================================
// Create Material Validation
// ======================================================

const materialAttributeSchema = z.object({
  id: z.string().optional(),
  attributeName: z
    .string()
    .trim()
    .min(1, "Attribute name is required.")
    .max(100, "Attribute name cannot exceed 100 characters."),
  attributeValue: z.string().trim().optional(),
});

export const createMaterialSchema = z.object({
  materialName: z
    .string()
    .trim()
    .min(2, "Material name must be at least 2 characters.")
    .max(255, "Material name cannot exceed 255 characters."),

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
    .optional()
    .nullable(),

  forUse: z
    .string()
    .trim()
    .max(100, "For Use cannot exceed 100 characters.")
    .optional()
    .nullable(),

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

  // General Details
  sku: z.string().trim().max(100).optional().nullable(),
  manufacturingGroup: z.string().trim().max(100).optional().nullable(),
  unit: z.string().trim().max(50).optional().nullable().default("Pcs"),
  sizeList: z.string().trim().max(500).optional().nullable(),
  colors: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [])))
    .optional()
    .default([]),
  width: z.number().optional().nullable().default(0),
  widthRangeFrom: z.number().optional().nullable().default(0),
  widthRangeTo: z.number().optional().nullable().default(0),
  gsm: z.number().optional().nullable().default(0),
  gsmRangeFrom: z.number().optional().nullable().default(0),
  gsmRangeTo: z.number().optional().nullable().default(0),
  ledgerGroup: z.string().trim().max(100).optional().nullable().default("Material Purchase"),
  less: z.number().optional().nullable().default(0),
  marketplace: z
    .array(z.string().trim())
    .or(z.string().transform((val) => (val ? val.split(",").map((s) => s.trim()).filter(Boolean) : ["All"])))
    .optional()
    .default(["All"]),
  gender: z.string().trim().max(50).optional().nullable(),
  referenceParty: z.string().trim().max(100).optional().nullable(),

  // Kardex Details
  costApplyingMode: z.string().trim().max(100).optional().nullable(),
  materialCost: z.number().min(0).optional().nullable().default(0),
  salesRate: z.number().min(0).optional().nullable().default(0),
  purchaseType: z.string().trim().max(100).optional().nullable(),
  isStockDetailsCompulsory: z.boolean().optional().default(false),
  issueMode: z.string().trim().max(100).optional().nullable(),
  consumptionMode: z.string().trim().max(100).optional().nullable(),
  isIssuable: z.boolean().optional().default(false),
  isSellable: z.boolean().optional().default(false),
  dealerRate: z.number().min(0).optional().nullable().default(0),
  retailRate: z.number().min(0).optional().nullable().default(0),
  openingStock: z.number().int().min(0).optional().nullable().default(0),
  reorderLevelStock: z.number().int().min(0).optional().nullable().default(0),
  minimumStock: z.number().int().min(0).optional().nullable().default(0),
  materialPoints: z.number().min(0).optional().nullable().default(1),
  isPaired: z.boolean().optional().default(false),
  availability: z.string().trim().max(50).optional().nullable().default("Public"),

  attributes: z.array(materialAttributeSchema).default([]),

  isActive: z.boolean().optional(),
});

// ======================================================
// Update Material Validation
// ======================================================

export const updateMaterialSchema = createMaterialSchema.partial().extend({
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
      (val) => (val === undefined || val === null ? "" : String(val).trim()),
      z.string().min(1, "MRP is required.").optional()
    ),
  materialCost: z.number().min(0).optional().nullable(),
  dealerRate: z.number().min(0).optional().nullable(),
  retailRate: z.number().min(0).optional().nullable(),
  openingStock: z.number().int().min(0).optional().nullable(),
  reorderLevelStock: z.number().int().min(0).optional().nullable(),
  minimumStock: z.number().int().min(0).optional().nullable(),
  materialPoints: z.number().min(0).optional().nullable(),
  isPaired: z.boolean().optional(),
  availability: z.string().trim().max(50).optional().nullable(),
});

// ======================================================
// Update Material Status Validation
// ======================================================

export const updateMaterialStatusSchema = z.object({
  isActive: z.boolean(),
});

// ======================================================
// Dropdown Option Validation
// ======================================================

export const createDropdownOptionSchema = z.object({
  field: z.string().trim().min(1, "Field name is required."),
  value: z.string().trim().min(1, "Value is required."),
  label: z.string().trim().optional(),
});


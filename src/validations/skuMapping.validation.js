import { z } from "zod";

// ==================================================================================
// ============================ UPDATE SKU MAPPING ==================================
// ==================================================================================

export const updateSkuMappingSchema = z.object({
  // ======================================================
  // Required
  // ======================================================

  shortSku: z
    .string({
      required_error: "Short SKU is required.",
    })
    .trim()
    .min(1, "Short SKU is required.")
    .max(255, "Short SKU must not exceed 255 characters."),

  barcodeSku: z
    .string({
      required_error: "Barcode SKU is required.",
    })
    .trim()
    .min(1, "Barcode SKU is required.")
    .max(255, "Barcode SKU must not exceed 255 characters."),

  // ======================================================
  // Optional
  // ======================================================

  ordercookSku: z
    .string()
    .trim()
    .max(255, "OrderCook SKU must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),

  brandName: z
    .string()
    .trim()
    .max(255, "Brand Name must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),

  asinBarcode: z
    .string()
    .trim()
    .max(255, "Asin (Barcode) must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),

  color: z
    .string()
    .trim()
    .max(255, "Color must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),

  size: z
    .string()
    .trim()
    .max(100, "Size must not exceed 100 characters.")
    .optional()
    .or(z.literal("")),

  fullSku: z
    .string()
    .trim()
    .max(255, "Full SKU must not exceed 255 characters.")
    .optional()
    .or(z.literal("")),

  title: z
    .string()
    .trim()
    .max(500, "Title must not exceed 500 characters.")
    .optional()
    .or(z.literal("")),

  qty: z.number().int().min(0, "QTY cannot be negative.").optional().nullable(),

  mrp: z.number().min(0, "MRP cannot be negative.").optional().nullable(),
});

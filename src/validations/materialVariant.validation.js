import { z } from "zod";

// ======================================================
// Material Variant Attribute Validation
// ======================================================

const attributeSchema = z.object({
  materialAttributeId: z.string().cuid("Invalid material attribute id."),

  attributeValue: z
    .string()
    .trim()
    .min(1, "Attribute value is required.")
    .max(255, "Attribute value cannot exceed 255 characters."),
});

// ======================================================
// Create Material Variant Validation
// ======================================================

export const createMaterialVariantSchema = z.object({
  materialId: z.string().cuid("Invalid material id."),

  variantSku: z
    .string()
    .trim()
    .min(2, "Variant SKU must be at least 2 characters.")
    .max(100, "Variant SKU cannot exceed 100 characters."),

  asin: z.string().trim().optional().nullable(),

  rackAddress: z.string().trim().max(100).optional().nullable(),

  generateBarcode: z.string().trim().optional().nullable(),

  isActive: z.boolean().optional(),

  attributes: z.array(attributeSchema).optional().default([]),
});

// ======================================================
// Update Material Variant Validation
// ======================================================

export const updateMaterialVariantSchema = createMaterialVariantSchema.partial();

// ======================================================
// Update Material Variant Status Validation
// ======================================================

export const updateMaterialVariantStatusSchema = z.object({
  isActive: z.boolean(),
});


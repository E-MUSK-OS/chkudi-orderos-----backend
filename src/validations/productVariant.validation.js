import { z } from "zod";

// ======================================================
// Product Variant Attribute Validation
// ======================================================

const attributeSchema = z.object({
  productAttributeId: z.string().cuid("Invalid product attribute id."),

  attributeValue: z
    .string()
    .trim()
    .min(1, "Attribute value is required.")
    .max(255, "Attribute value cannot exceed 255 characters."),
});

// ======================================================
// Create Product Variant Validation
// ======================================================

export const createProductVariantSchema = z.object({
  productId: z.string().cuid("Invalid product id."),

  variantSku: z
    .string()
    .trim()
    .min(2, "Variant SKU must be at least 2 characters.")
    .max(100, "Variant SKU cannot exceed 100 characters."),

  isActive: z.boolean().optional(),

  attributes: z.array(attributeSchema).optional().default([]),
});

// ======================================================
// Update Product Variant Validation
// ======================================================

export const updateProductVariantSchema = createProductVariantSchema.partial();

// ======================================================
// Update Product Variant Status Validation
// ======================================================

export const updateProductVariantStatusSchema = z.object({
  isActive: z.boolean(),
});

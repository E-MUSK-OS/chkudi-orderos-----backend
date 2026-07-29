import { z } from "zod";

// ==================================================================================
// ============================ UPDATE SKU MAPPING ==================================
// ==================================================================================

export const updateSkuMappingSchema = z.object({
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

  ordercookSku: z
    .string({
      required_error: "OrderCook SKU is required.",
    })
    .trim()
    .min(1, "OrderCook SKU is required.")
    .max(255, "OrderCook SKU must not exceed 255 characters."),
});

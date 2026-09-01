import { z } from "zod";

// ==================================================================================
// ======================== CREATE MARKETPLACE ======================================
// ==================================================================================

export const createMarketplaceSchema = z.object({
  marketplaceName: z
    .string()
    .trim()
    .min(2, "Marketplace name must be at least 2 characters.")
    .max(100, "Marketplace name cannot exceed 100 characters."),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters.")
    .optional()
    .or(z.literal("")),

  marketplaceCode: z
    .string()
    .trim()
    .min(2, "Marketplace code is required.")
    .max(50, "Marketplace code cannot exceed 50 characters.")
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Marketplace code must start with an uppercase letter and contain only uppercase letters, numbers and underscores.",
    ),

  displayOrder: z.coerce.number().int().min(0).optional(),

  isActive: z.boolean().optional(),
});

// ==================================================================================
// ======================== UPDATE MARKETPLACE ======================================
// ==================================================================================

export const updateMarketplaceSchema = createMarketplaceSchema.partial();

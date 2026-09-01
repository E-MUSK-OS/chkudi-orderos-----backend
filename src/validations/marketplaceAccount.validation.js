import { z } from "zod";

// ==================================================================================
// =================== CREATE MARKETPLACE ACCOUNT ===================================
// ==================================================================================

export const createMarketplaceAccountSchema = z.object({
  marketplaceId: z
    .string()
    .trim()
    .min(1, "Marketplace is required."),

  sellerName: z
    .string()
    .trim()
    .min(2, "Seller name must be at least 2 characters.")
    .max(150, "Seller name cannot exceed 150 characters."),

  sellerCode: z
    .string()
    .trim()
    .min(2, "Seller code is required.")
    .max(100, "Seller code cannot exceed 100 characters."),

  displayName: z
    .string()
    .trim()
    .max(150, "Display name cannot exceed 150 characters.")
    .optional()
    .or(z.literal("")),

  isActive: z.boolean().optional(),
});

// ==================================================================================
// =================== UPDATE MARKETPLACE ACCOUNT ===================================
// ==================================================================================

export const updateMarketplaceAccountSchema =
  createMarketplaceAccountSchema.partial();
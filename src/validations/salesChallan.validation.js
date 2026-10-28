import { z } from "zod";
import { gstValidationSchema } from "./party.validation.js";

export const salesChallanItemSchema = z.object({
  id: z.string().optional(),
  itemNo: z.coerce.number().default(1),
  sku: z.string().trim().min(1, "SKU is required."),
  name: z.string().trim().optional().nullable().default(""),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  rate: z.coerce.number().default(0),
  amount: z.coerce.number().optional(),
  dispatchDate: z.string().optional().nullable(),
  subCn: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  printBarcode: z.boolean().default(true),
});

export const createSalesChallanSchema = z.object({
  partyId: z.string().optional().nullable(),
  partyName: z.string().trim().min(1, "Party name is required."),
  contactNo: z.string().trim().optional().nullable(),
  gstin: gstValidationSchema.optional(),
  challanNo: z.string().trim().optional(),
  challanRefNo: z.string().trim().optional().nullable(),
  challanDate: z.string().optional().nullable(),
  challanFor: z.string().trim().default("Sales"),
  stockOutFrom: z.string().trim().default("General"),
  consigneeName: z.string().trim().default("Not Applicable"),
  deliveryBy: z.string().trim().default("Buyer"),
  preparedBy: z.string().trim().optional().nullable(),
  deliveryTerms: z.string().trim().optional().nullable(),
  invoiceStatus: z.string().trim().optional().default("Pending"),
  items: z.array(salesChallanItemSchema).min(1, "At least one item is required in the challan."),
});

export const updateSalesChallanSchema = createSalesChallanSchema.partial();

import { z } from "zod";
import { gstValidationSchema } from "./party.validation.js";

export const purchaseChallanItemSchema = z.object({
  id: z.string().optional(),
  itemNo: z.coerce.number().default(1),
  sku: z.string().trim().min(1, "SKU is required."),
  name: z.string().trim().optional().nullable().default(""),
  orderedQty: z.coerce.number().default(0),
  receivedQty: z.coerce.number().min(0, "Received quantity cannot be negative.").default(1),
  rate: z.coerce.number().default(0),
  amount: z.coerce.number().optional(),
  poNo: z.string().optional().nullable(),
  partyChallanNo: z.string().optional().nullable(),
  receivedDate: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  printBarcode: z.boolean().default(true),
});

export const createPurchaseChallanSchema = z.object({
  supplierId: z.string().optional().nullable(),
  supplierName: z.string().trim().min(1, "Supplier name is required."),
  contactNo: z.string().trim().optional().nullable(),
  gstin: gstValidationSchema.optional(),
  challanNo: z.string().trim().optional(),
  partyChallanNo: z.string().trim().optional().nullable(),
  challanDate: z.string().optional().nullable(),
  partyChallanDate: z.string().optional().nullable(),
  challanFor: z.string().trim().default("Purchase"),
  stockIn: z.string().trim().default("General"),
  courierPartner: z.string().trim().optional().nullable(),
  lrNo: z.string().trim().optional().nullable(),
  receivedBy: z.string().trim().optional().nullable().default("Ramesh"),
  checkedBy: z.string().trim().optional().nullable().default("Ramesh"),
  preparedBy: z.string().trim().optional().nullable().default("Ramesh"),
  invoiceStatus: z.string().trim().optional().default("Pending"),
  items: z.array(purchaseChallanItemSchema).min(1, "At least one item is required in the challan."),
});

export const updatePurchaseChallanSchema = createPurchaseChallanSchema.partial();

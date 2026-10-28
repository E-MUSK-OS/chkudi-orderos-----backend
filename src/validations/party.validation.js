import { z } from "zod";

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

export const gstValidationSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((val) => !val || GSTIN_REGEX.test(val), {
    message: "Invalid GST number format (15 characters alphanumeric, e.g. 24ABCDE1234F1Z5).",
  })
  .transform((val) => {
    if (!val || val.trim().length === 0) return null;
    return val.trim().toUpperCase();
  });

export const createPartySchema = z.object({
  partyName: z
    .string()
    .trim()
    .min(1, "Party name is required.")
    .max(150, "Party name cannot exceed 150 characters."),
  accountCode: z.string().trim().max(50).optional().nullable(),
  alias: z.string().trim().max(100).optional().nullable(),
  accountHead: z.string().trim().default("Sundry Debtors"),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Invalid email address.")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().max(35).optional().nullable(),
  whatsapp: z.string().trim().max(35).optional().nullable(),

  // Billing Address
  addressLine1: z.string().trim().max(250).optional().nullable(),
  addressLine2: z.string().trim().max(250).optional().nullable(),
  addressLine3: z.string().trim().max(250).optional().nullable(),
  area: z.string().trim().max(150).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  country: z.string().trim().max(100).optional().nullable().default("India"),
  pincode: z.string().trim().max(25).optional().nullable(),

  // Shipping Address
  shippingSameAsBilling: z.boolean().default(true),
  shippingAddress1: z.string().trim().max(250).optional().nullable(),
  shippingAddress2: z.string().trim().max(250).optional().nullable(),
  shippingAddress3: z.string().trim().max(250).optional().nullable(),
  shippingArea: z.string().trim().max(150).optional().nullable(),
  shippingCountry: z.string().trim().max(100).optional().nullable().default("India"),
  shippingState: z.string().trim().max(100).optional().nullable(),
  shippingCity: z.string().trim().max(100).optional().nullable(),
  shippingPincode: z.string().trim().max(25).optional().nullable(),
  shippingPhone: z.string().trim().max(35).optional().nullable(),

  // Accounting Details
  pan: z.string().trim().max(30).optional().nullable(),
  gstin: gstValidationSchema,
  gstDate: z.string().optional().nullable(),
  cstNo: z.string().trim().max(50).optional().nullable(),
  cstDate: z.string().optional().nullable(),
  serviceTaxNo: z.string().trim().max(50).optional().nullable(),
  serviceTaxDate: z.string().optional().nullable(),
  otherTaxNo: z.string().trim().max(50).optional().nullable(),
  otherTaxDate: z.string().optional().nullable(),
  billDueDays: z.coerce.number().default(0),
  creditLimit: z.coerce.number().default(0),
  debitLimit: z.coerce.number().default(0),

  bankName: z.string().trim().max(100).optional().nullable(),
  accountNumber: z.string().trim().max(50).optional().nullable(),
  ifsc: z.string().trim().max(30).optional().nullable(),
  openingBalance: z.coerce.number().default(0),
  balanceType: z.enum(["Credit", "Debit"]).default("Credit"),
  joinDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePartySchema = createPartySchema.partial();

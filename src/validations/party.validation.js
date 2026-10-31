import { z } from "zod";

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

export const gstValidationSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((val) => !val || val === "-" || GSTIN_REGEX.test(val), {
    message: "Invalid GST number format (15 characters alphanumeric, e.g. 24ABCDE1234F1Z5).",
  })
  .transform((val) => {
    if (!val || val.trim().length === 0 || val === "-") return null;
    return val.trim().toUpperCase();
  });

export const createPartySchema = z.object({
  partyName: z
    .string()
    .trim()
    .min(1, "Ledger/Party name is required.")
    .max(150, "Name cannot exceed 150 characters."),
  ledgerName: z.string().trim().optional(),
  accountCode: z.string().trim().max(50).optional().nullable(),
  alias: z.string().trim().max(100).optional().nullable(),
  accountHead: z.string().trim().default("Sundry Debtors"),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  contactName: z.string().trim().max(100).optional().nullable(),
  email: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z.string().trim().max(35).optional().nullable(),
  contactNo: z.string().trim().max(35).optional().nullable(),
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
  panNumber: z.string().trim().max(30).optional().nullable(),
  gstin: gstValidationSchema,
  gstNumber: z.string().trim().optional().nullable(),
  gstDate: z.string().optional().nullable(),
  cstNo: z.string().trim().max(50).optional().nullable(),
  cstDate: z.string().optional().nullable(),
  serviceTaxNo: z.string().trim().max(50).optional().nullable(),
  serviceTaxDate: z.string().optional().nullable(),
  otherTaxNo: z.string().trim().max(50).optional().nullable(),
  otherTaxDate: z.string().optional().nullable(),
  msmeNumber: z.string().trim().max(50).optional().nullable(),
  legalName: z.string().trim().max(150).optional().nullable(),

  billDueDays: z.coerce.number().default(0),
  creditLimit: z.coerce.number().default(0),
  debitLimit: z.coerce.number().default(0),
  creditDebitLimit: z.coerce.number().optional().default(0),
  refContactName: z.string().trim().max(100).optional().nullable(),

  // Bank Details
  bankName: z.string().trim().max(100).optional().nullable(),
  accountHolderName: z.string().trim().max(100).optional().nullable(),
  branchName: z.string().trim().max(100).optional().nullable(),
  accountType: z.string().trim().max(50).optional().nullable().default("Current"),
  accountNumber: z.string().trim().max(50).optional().nullable(),
  ifsc: z.string().trim().max(30).optional().nullable(),
  ifscCode: z.string().trim().max(30).optional().nullable(),

  // Balances & Metadata
  openingBalance: z.coerce.number().default(0),
  balanceType: z.string().optional().default("Credit"),
  joinDate: z.string().optional().nullable(),
  creationDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  logoUrl: z.string().trim().optional().nullable(),
  completionPercentage: z.coerce.number().optional().default(0),
  createdByName: z.string().trim().optional().nullable(),
  updatedByName: z.string().trim().optional().nullable(),
}).passthrough();

export const updatePartySchema = createPartySchema.partial().passthrough();

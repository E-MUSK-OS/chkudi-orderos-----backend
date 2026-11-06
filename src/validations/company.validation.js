import { z } from "zod";

// Helper to sanitize & validate GST number
export const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

export const createCompanyDraftSchema = z.object({
  gstNumber: z
    .string()
    .trim()
    .min(15, "GST Number must be 15 characters")
    .max(15, "GST Number must be 15 characters")
    .transform((val) => val.toUpperCase()),
  companyName: z.string().trim().optional(),
  branchName: z.string().trim().optional().nullable(),
  parentCompanyName: z.string().trim().optional().nullable(),
  parentCompanyId: z.string().trim().optional().nullable(),
  companyCode: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
}).passthrough();

export const createCompanySchema = z.object({
  companyName: z.string().trim().min(1, "Company Name is required"),
  companyCode: z.string().trim().optional().default(""),
  ownerName: z.string().trim().optional().default(""),
  gstNumber: z
    .string()
    .trim()
    .min(15, "GST Number must be 15 characters")
    .max(15, "GST Number must be 15 characters")
    .transform((val) => val.toUpperCase()),
  panNumber: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),

  // General Details
  legalName: z.string().trim().optional().nullable(),
  brandName: z.string().trim().optional().nullable(),
  abbreviation: z.string().trim().optional().nullable(),
  businessType: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),

  // Legacy Address
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable().default("Gujarat"),
  stateCode: z.string().trim().optional().nullable().default("24"),
  pincode: z.string().trim().optional().nullable(),

  // Contact Details - Billing
  billingAddress1: z.string().trim().optional().nullable(),
  billingAddress2: z.string().trim().optional().nullable(),
  billingAddress3: z.string().trim().optional().nullable(),
  billingPincode: z.string().trim().optional().nullable(),
  billingArea: z.string().trim().optional().nullable(),
  billingCity: z.string().trim().optional().nullable(),
  billingState: z.string().trim().optional().nullable(),
  billingCountry: z.string().trim().optional().nullable(),
  billingContactName: z.string().trim().optional().nullable(),
  billingContactNo: z.string().trim().optional().nullable(),

  // Contact Details - Shipping
  shippingSameAsBilling: z.boolean().optional().default(true),
  shippingAddress1: z.string().trim().optional().nullable(),
  shippingAddress2: z.string().trim().optional().nullable(),
  shippingAddress3: z.string().trim().optional().nullable(),
  shippingPincode: z.string().trim().optional().nullable(),
  shippingArea: z.string().trim().optional().nullable(),
  shippingCity: z.string().trim().optional().nullable(),
  shippingState: z.string().trim().optional().nullable(),
  shippingCountry: z.string().trim().optional().nullable(),
  shippingContactName: z.string().trim().optional().nullable(),
  shippingContactNo: z.string().trim().optional().nullable(),

  // Accounting Details - Legal
  tanNumber: z.string().trim().optional().nullable(),
  cstNumber: z.string().trim().optional().nullable(),
  fssaiNumber: z.string().trim().optional().nullable(),
  tradeCategory: z.string().trim().optional().nullable(),
  msmeNumber: z.string().trim().optional().nullable(),

  // Bank Info
  bankName: z.string().trim().optional().nullable(),
  accountHolderName: z.string().trim().optional().nullable(),
  accountName: z.string().trim().optional().nullable(),
  accountNumber: z.string().trim().optional().nullable(),
  ifscCode: z.string().trim().optional().nullable(),
  accountType: z.string().trim().optional().nullable(),
  branchName: z.string().trim().optional().nullable(),
  upiId: z.string().trim().optional().nullable(),
  clientCode: z.string().trim().optional().nullable(),
  productCode: z.string().trim().optional().nullable(),

  // Invoice & Other
  taxInvoicePrefix: z.string().trim().optional().nullable(),
  taxInvoiceNext: z.string().trim().optional().nullable(),
  retailInvoicePrefix: z.string().trim().optional().nullable(),
  retailInvoiceNext: z.string().trim().optional().nullable(),
  considerInPnL: z.string().trim().optional().nullable(),

  // Logo & Signature
  logoUrl: z.string().trim().optional().nullable(),
  signatureUrl: z.string().trim().optional().nullable(),
  completionPercentage: z.number().optional().nullable(),
  registrationDate: z.string().trim().optional().nullable(),

  status: z.enum(["ACTIVE", "DRAFT", "INACTIVE"]).optional().default("ACTIVE"),
  isDefault: z.boolean().optional().default(false),
}).passthrough();

export const updateCompanySchema = createCompanySchema.partial().passthrough();


export const createCompanyBranchSchema = z.object({
  companyId: z.string().trim().optional(),
  branchName: z.string().trim().min(1, "Branch name is required"),
  gstNumber: z
    .string()
    .trim()
    .min(15, "GST Number must be 15 characters")
    .max(15, "GST Number must be 15 characters")
    .transform((val) => val.toUpperCase()),
  status: z.string().trim().optional().default("ACTIVE"),
}).passthrough();

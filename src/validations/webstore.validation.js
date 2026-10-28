import { z } from "zod";

export const createWebstoreSchema = z.object({
  code: z.number().int().nonnegative().optional(),
  marketplaceName: z
    .string()
    .trim()
    .min(1, "Marketplace name is required."),
  marketplaceLogo: z.string().trim().optional().nullable(),
  storeName: z
    .string()
    .trim()
    .min(2, "Web Store name must be at least 2 characters."),
  parentOrChild: z.enum(["Parent", "Child"]).optional().default("Parent"),
  registeredEmail: z.string().trim().email("Invalid registered email.").optional().or(z.literal("")).nullable(),
  contactUsEmail: z.string().trim().email("Invalid contact us email.").optional().or(z.literal("")).nullable(),
  registeredPhone: z.string().trim().max(30).optional().or(z.literal("")).nullable(),
  contactUsPhone: z.string().trim().max(30).optional().or(z.literal("")).nullable(),
  registrationDate: z.string().optional().or(z.date()).nullable(),

  billTo: z.string().trim().optional().or(z.literal("")).nullable(),
  address1: z.string().trim().optional().or(z.literal("")).nullable(),
  address2: z.string().trim().optional().or(z.literal("")).nullable(),
  city: z.string().trim().optional().or(z.literal("")).nullable(),
  pincode: z.string().trim().optional().or(z.literal("")).nullable(),
  state: z.string().trim().optional().or(z.literal("")).nullable(),
  gstNo: z.string().trim().optional().or(z.literal("")).nullable(),

  bankAccount: z.string().trim().optional().or(z.literal("")).nullable(),
  bankIfscCode: z.string().trim().optional().or(z.literal("")).nullable(),
  lastPaymentDate: z.string().optional().or(z.date()).nullable(),

  isActive: z.boolean().optional().default(true),
  returnActive: z.boolean().optional().default(true),
  isOnTpBased: z.boolean().optional().default(false),
  isOnResellerBased: z.boolean().optional().default(false),
  validateStoreBeforeUploading: z.boolean().optional().default(false),
  isManifestBasedSalesInvoice: z.boolean().optional().default(false),
  warehouseCode: z.string().trim().optional().or(z.literal("")).nullable(),

  sellerId: z.string().trim().optional().or(z.literal("")).nullable(),
  secretKey: z.string().trim().optional().or(z.literal("")).nullable(),
  marketplaceId: z.string().trim().optional().or(z.literal("")).nullable(),
  authToken: z.string().trim().optional().or(z.literal("")).nullable(),
  awsAccessKey: z.string().trim().optional().or(z.literal("")).nullable(),
  endPoints: z.string().trim().optional().or(z.literal("")).nullable(),

  spapiOauthCode: z.string().trim().optional().or(z.literal("")).nullable(),
  sellingPartnerId: z.string().trim().optional().or(z.literal("")).nullable(),
  mwsAuthToken: z.string().trim().optional().or(z.literal("")).nullable(),
  refreshToken: z.string().trim().optional().or(z.literal("")).nullable(),
  accessToken: z.string().trim().optional().or(z.literal("")).nullable(),
  spMarketplaceId: z.string().trim().optional().or(z.literal("")).nullable(),
  spClientId: z.string().trim().optional().or(z.literal("")).nullable(),
  spClientSecret: z.string().trim().optional().or(z.literal("")).nullable(),
  spAwsAccessKey: z.string().trim().optional().or(z.literal("")).nullable(),
  spAwsSecretKey: z.string().trim().optional().or(z.literal("")).nullable(),
});

export const updateWebstoreSchema = createWebstoreSchema.partial();

import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/AppError.js";

const prisma = new PrismaClient();

// ==================================================================================
// ============================== CREATE TEMPLATE ====================================
// ==================================================================================

export const createTemplateService = async (userId, data) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const { name, marketplaceId, backgroundImageUrl, thumbnailUrl, layoutJson, settings } = data;

  if (!name) {
    throw new AppError("Template name is required.", 400);
  }

  if (!layoutJson) {
    throw new AppError("Layout JSON is required.", 400);
  }

  if (!settings) {
    throw new AppError("Settings are required.", 400);
  }

  return await prisma.labelTemplate.create({
    data: {
      userId,
      name,
      marketplaceId,
      backgroundImageUrl,
      thumbnailUrl,
      layoutJson,
      settings,
    },
  });
};

// ==================================================================================
// ============================== GET TEMPLATES ======================================
// ==================================================================================

export const getTemplatesService = async (userId) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  return await prisma.labelTemplate.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

// ==================================================================================
// ============================== GET TEMPLATE BY ID ================================
// ==================================================================================

export const getTemplateByIdService = async (userId, id) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const template = await prisma.labelTemplate.findFirst({
    where: { 
      id,
      userId 
    }
  });

  if (!template) {
    throw new AppError("Template not found.", 404);
  }

  return template;
};

// ==================================================================================
// ============================== UPDATE TEMPLATE ====================================
// ==================================================================================

export const updateTemplateService = async (userId, id, data) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const existingTemplate = await prisma.labelTemplate.findFirst({
    where: { id, userId },
  });

  if (!existingTemplate) {
    throw new AppError("Template not found.", 404);
  }

  const { name, marketplaceId, backgroundImageUrl, thumbnailUrl, layoutJson, settings } = data;

  return await prisma.labelTemplate.update({
    where: { id },
    data: {
      name,
      marketplaceId,
      backgroundImageUrl,
      thumbnailUrl,
      layoutJson,
      settings,
    },
  });
};

// ==================================================================================
// ============================== DELETE TEMPLATE ====================================
// ==================================================================================

export const deleteTemplateService = async (userId, id) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }

  const existingTemplate = await prisma.labelTemplate.findFirst({
    where: { id, userId },
  });

  if (!existingTemplate) {
    throw new AppError("Template not found.", 404);
  }

  await prisma.labelTemplate.delete({
    where: { id },
  });

  return { success: true, message: "Template deleted successfully" };
};

// ==================================================================================
// ============================== PRODUCT LOOKUP ====================================
// ==================================================================================

export const lookupProductService = async (userId, query) => {
  if (!userId) {
    throw new AppError("User not found.", 401);
  }
  
  if (!query) {
    return [];
  }

  // 1. Search SkuMapping first (has the most flattened fields)
  const skuMappings = await prisma.skuMapping.findMany({
    where: {
      userId,
      OR: [
        { shortSku: { contains: query, mode: 'insensitive' } },
        { title: { contains: query, mode: 'insensitive' } },
        { asinBarcode: { contains: query, mode: 'insensitive' } },
      ]
    },
    take: 10
  });

  if (skuMappings.length > 0) {
    return skuMappings.map(m => ({
      productVariantId: m.id,
      title: m.title || m.brandName || "",
      sku: m.shortSku,
      masterSku: m.fullSku || "",
      brand: m.brandName || "",
      size: m.size || "",
      color: m.color || "",
      mrp: m.mrp || null,
      asin: m.asinBarcode || "",
      manufacturingMonth: null, // No default field for this in mapping
      availableStock: m.qty || 0,
    }));
  }

  // 2. Search Product / ProductVariant
  const products = await prisma.product.findMany({
    where: {
      userId,
      OR: [
        { productName: { contains: query, mode: 'insensitive' } },
        { masterSku: { contains: query, mode: 'insensitive' } },
        { variants: { some: { variantSku: { contains: query, mode: 'insensitive' } } } }
      ]
    },
    include: {
      variants: {
        include: {
          attributes: {
            include: {
              productAttribute: true
            }
          }
        }
      }
    },
    take: 10
  });

  const results = [];
  products.forEach(p => {
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach(v => {
        let size = "";
        let color = "";
        v.attributes.forEach(attr => {
          const name = attr.productAttribute?.attributeName?.toLowerCase() || "";
          if (name === "size") size = attr.attributeValue;
          if (name === "color") color = attr.attributeValue;
        });
        
        results.push({
          productVariantId: v.id,
          title: p.productName,
          sku: v.variantSku,
          masterSku: p.masterSku,
          brand: p.brand || "",
          size,
          color,
          mrp: null,
          asin: "",
          manufacturingMonth: null,
          availableStock: 0, // Simplified for now
        });
      });
    } else {
      results.push({
        productVariantId: p.id,
        title: p.productName,
        sku: p.masterSku,
        masterSku: p.masterSku,
        brand: p.brand || "",
        size: "",
        color: "",
        mrp: null,
        asin: "",
        manufacturingMonth: null,
        availableStock: 0,
      });
    }
  });

  return results.slice(0, 10);
};

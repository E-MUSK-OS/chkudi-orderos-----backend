import {
  countProductsByUserId,
  createProduct,
  getProductsByUserId,
  getProductById,
  updateProduct,
  deleteProduct,
  findProductByName,
  findProductByMasterSku,
  updateProductStatus,
  getProductStats,
} from "../repositories/product.repository.js";
import { updateVariantsStatusByProduct } from "../repositories/productVariant.repository.js";

// ======================================================
// Validate Product Attributes
// ======================================================

const validateAttributes = (attributes = []) => {
  if (!attributes?.length) {
    return;
  }

  const names = attributes.map((item) =>
    item.attributeName.trim().toLowerCase(),
  );

  const duplicates = names.filter(
    (name, index) => names.indexOf(name) !== index,
  );

  if (duplicates.length > 0) {
    throw new Error(`Duplicate attribute found: ${duplicates[0]}`);
  }
};

// ======================================================
// Create Product
// ======================================================

export const createProductService = async (userId, data) => {
  // Maximum Product Limit
  const totalProducts = await countProductsByUserId(userId);

  if (totalProducts >= 100000) {
    throw new Error(
      "Maximum limit reached. You can create up to 100000 products only.",
    );
  }

  // Duplicate Product Name
  const existingProductName = await findProductByName(data.productName, userId);

  if (existingProductName) {
    throw new Error("Product name already exists.");
  }

  // Duplicate Master SKU
  const existingMasterSku = await findProductByMasterSku(
    data.masterSku,
    userId,
  );

  if (existingMasterSku) {
    throw new Error("Master SKU already exists.");
  }

  validateAttributes(data.attributes);

  return await createProduct({
    ...data,
    isActive: data.isActive ?? true,
    userId,
  });
};

// ======================================================
// Get All Products
// ======================================================

export const getAllProductsService = async (userId) => {
  return await getProductsByUserId(userId);
};

// ======================================================
// Get Product By Id
// ======================================================

export const getProductByIdService = async (id, userId) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  return product;
};

// ======================================================
// Update Product
// ======================================================

export const updateProductService = async (id, userId, data) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  // Duplicate Product Name
  if (data.productName && data.productName !== product.productName) {
    const existing = await findProductByName(data.productName, userId);

    if (existing) {
      throw new Error("Product name already exists.");
    }
  }

  // Duplicate Master SKU
  if (data.masterSku && data.masterSku !== product.masterSku) {
    const existing = await findProductByMasterSku(data.masterSku, userId);

    if (existing) {
      throw new Error("Master SKU already exists.");
    }
  }
  if (data.attributes) {
    validateAttributes(data.attributes);
  }

  await updateProduct(id, data);

  return await getProductById(id, userId);
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProductService = async (id, userId) => {
  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  await deleteProduct(id, userId);

  return true;
};

// ======================================================
// Update Product Status
// ======================================================

export const updateProductStatusService = async (id, userId, isActive) => {
  console.log("SERVICE CALLED");

  const product = await getProductById(id, userId);

  if (!product) {
    throw new Error("Product not found.");
  }

  console.log("BEFORE PRODUCT UPDATE");

  // Product Status
  await updateProductStatus(id, isActive);

  console.log("AFTER PRODUCT UPDATE");

  // All Variant Status
  await updateVariantsStatusByProduct(id, isActive);

  console.log("AFTER VARIANT UPDATE");

  return await getProductById(id, userId);
};

// ======================================================
// Get Product Stats
// ======================================================

export const getProductStatsService = async (userId) => {
  return await getProductStats(userId);
};

import {
  countMaterialsByUserId,
  createMaterial,
  getMaterialsByUserId,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  findMaterialByName,
  findMaterialByAsin,
  findMaterialByMasterSku,
  findMaterialBySkuOrMasterSku,
  updateMaterialStatus,
  getMaterialStats,
  upsertDropdownOption,
  getDropdownOptionsByUserId,
  getPartiesByUserId,
} from "../repositories/material.repository.js";
import { updateVariantsStatusByMaterial } from "../repositories/materialVariant.repository.js";
import { upsertAsinImport } from "../repositories/asinImport.repository.js";
import prisma from "../config/prisma.js";
import * as xlsx from "xlsx";

// ======================================================
// Validate Material Attributes
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
// Create Material
// ======================================================

export const createMaterialService = async (userId, data) => {
  const totalMaterials = await countMaterialsByUserId(userId);

  if (totalMaterials >= 100000) {
    throw new Error(
      "Maximum limit reached. You can create up to 100000 materials only.",
    );
  }

  if (data.asin && data.asin.trim()) {
    const existingAsin = await findMaterialByAsin(data.asin.trim(), userId);
    if (existingAsin) {
      throw new Error("ASIN already exists.");
    }
  }

  validateAttributes(data.attributes);

  const material = await createMaterial({
    ...data,
    asin: data.asin?.trim() || null,
    generateBarcode: data.generateBarcode ? data.generateBarcode.trim() : "No",
    isActive: data.isActive ?? true,
    userId,
  });

  if (data.asin && data.asin.trim()) {
    try {
      await upsertAsinImport({
        userId,
        asin: data.asin.trim(),
        sku: data.masterSku ? data.masterSku.trim() : "",
        rackAddress: data.rackAddress ? data.rackAddress.trim() : null,
        generateBarcode: data.generateBarcode ? data.generateBarcode.trim() : "No",
      });
    } catch (asinErr) {
      console.error("Failed to sync ASIN to AsinImport:", asinErr);
    }
  }

  await autoPersistMaterialOptions(userId, data);
  return material;
};

// ======================================================
// Get All Materials
// ======================================================

export const getAllMaterialsService = async (userId) => {
  return await getMaterialsByUserId(userId);
};

// ======================================================
// Get Material By Id
// ======================================================

export const getMaterialByIdService = async (id, userId) => {
  const material = await getMaterialById(id, userId);

  if (!material) {
    throw new Error("Material not found.");
  }

  return material;
};

// ======================================================
// Update Material
// ======================================================

export const updateMaterialService = async (id, userId, data) => {
  const material = await getMaterialById(id, userId);

  if (!material) {
    throw new Error("Material not found.");
  }

  if (data.asin && data.asin.trim() && data.asin.trim() !== material.asin) {
    const existing = await findMaterialByAsin(data.asin.trim(), userId);
    if (existing) {
      throw new Error("ASIN already exists.");
    }
  }

  if (data.attributes) {
    validateAttributes(data.attributes);
  }

  await updateMaterial(id, {
    ...data,
    ...(data.asin !== undefined ? { asin: data.asin?.trim() || null } : {}),
    ...(data.generateBarcode !== undefined ? { generateBarcode: data.generateBarcode?.trim() || "No" } : {}),
  });

  const updatedMaterial = await getMaterialById(id, userId);

  await autoPersistMaterialOptions(userId, data);
  return updatedMaterial;
};

// ======================================================
// Delete Material
// ======================================================

export const deleteMaterialService = async (id, userId) => {
  const material = await prisma.material.findFirst({
    where: { id, userId },
    include: { variants: true },
  });

  if (!material) {
    throw new Error("Material not found.");
  }

  await deleteMaterial(id, userId);
  return true;
};

// ======================================================
// Update Material Status
// ======================================================

export const updateMaterialStatusService = async (id, userId, isActive) => {
  const material = await getMaterialById(id, userId);

  if (!material) {
    throw new Error("Material not found.");
  }

  await updateMaterialStatus(id, isActive);
  await updateVariantsStatusByMaterial(id, isActive);

  return await getMaterialById(id, userId);
};

// ======================================================
// Get Material Stats
// ======================================================

export const getMaterialStatsService = async (userId) => {
  return await getMaterialStats(userId);
};

// ======================================================
// Import Materials From Excel
// ======================================================

export const importMaterialsFromExcelService = async (userId, fileBuffer) => {
  if (!fileBuffer) {
    throw new Error("No file uploaded.");
  }

  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error("Sheet is empty.");
  }

  const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
  if (rawRows.length === 0) {
    throw new Error("No data rows found in the uploaded sheet.");
  }

  const cleanKey = (k) => String(k || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  let importedCount = 0;
  let updatedCount = 0;
  const validationErrors = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rawRow = rawRows[i];
    const rowNum = i + 2; // Excel row 2 is the first data row

    // Normalize keys
    const row = {};
    for (const [key, val] of Object.entries(rawRow)) {
      row[cleanKey(key)] = val;
    }

    // Skip completely empty rows
    const hasAnyValue = Object.values(row).some((v) => String(v).trim() !== "");
    if (!hasAnyValue) continue;

    // Extract all fields
    const sku = String(row["sku"] || row["mastersku"] || "").trim();
    const masterSku = String(row["mastersku"] || row["sku"] || "").trim();
    const materialName = String(row["materialname"] || row["name"] || "").trim();
    const category = String(row["category"] || "").trim();
    const subCategory = String(row["subcategory"] || row["sub_category"] || "").trim();
    const forUse = String(row["foruse"] || row["for_use"] || row["for"] || "").trim();
    const manufacturingGroup = String(row["manufacturinggroup"] || row["mfggroup"] || "").trim();
    const unit = String(row["unit"] || "Meters").trim();
    const hsnCode = String(row["hsncode"] || row["hsn"] || "").trim();
    const brand = String(row["brandname"] || row["brand"] || "No Brand").trim();
    const less = parseFloat(row["less(%)"] || row["less%"] || row["less"] || 0) || 0;
    const costApplyingMode = String(row["costapplyingmode"] || row["costmode"] || "").trim();
    const issueMode = String(row["issuemode"] || "").trim();
    const consumptionMode = String(row["consumptionmode"] || "").trim();

    // Check mandatory fields
    const missing = [];
    if (!sku) missing.push("SKU");
    if (!masterSku) missing.push("Master SKU");
    if (!materialName) missing.push("Name");
    if (!category) missing.push("Category");
    if (!manufacturingGroup) missing.push("Manufacturing Group");
    if (!unit) missing.push("Unit");
    if (!hsnCode) missing.push("HSN Code");
    if (!brand) missing.push("Brand Name");
    if (!costApplyingMode) missing.push("Cost Applying Mode");
    if (!issueMode) missing.push("Issue Mode");
    if (!consumptionMode) missing.push("Consumption Mode");

    if (missing.length > 0) {
      validationErrors.push(`Row ${rowNum}: Required field(s) missing [${missing.join(", ")}]`);
      continue;
    }

    // Parse colors
    const rawColors = row["colors"] || row["color"] || "";
    let colors = [];
    if (Array.isArray(rawColors)) {
      colors = rawColors.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof rawColors === "string" && rawColors.trim()) {
      colors = rawColors.split(",").map((c) => c.trim()).filter(Boolean);
    }

    // Parse numbers
    const width = Number(row["width"]) || 0;
    const widthRangeFrom = Number(row["widthrangefrom"] || row["widthfrom"]) || 0;
    const widthRangeTo = Number(row["widthrangeto"] || row["widthto"]) || 0;
    const gsm = Number(row["gsm"]) || 0;
    const gsmRangeFrom = Number(row["gsmrangefrom"] || row["gsmfrom"]) || 0;
    const gsmRangeTo = Number(row["gsmrangeto"] || row["gsmto"]) || 0;
    const gstRate = row["gstrate"] !== undefined && row["gstrate"] !== "" ? Number(row["gstrate"]) : 5;
    const materialCost = Number(row["materialcost"] || row["cost"]) || 0;
    const mrp = String(row["mrp"] ?? "0").trim() || "0";
    const salesRate = Number(row["salesrate"]) || 0;
    const reorderLevelStock = parseInt(row["reorderlevelstock"] || row["reorderlevel"], 10) || 0;

    // Parse booleans
    const parseBool = (v) => {
      const s = String(v ?? "").toLowerCase().trim();
      return ["true", "yes", "1", "y"].includes(s);
    };

    const isStockDetailsCompulsory = parseBool(
      row["isstockdetailscompulsory"] || row["detailscompulsory"] || row["stockdetailscompulsory"]
    );
    const isIssuable = parseBool(row["isissuable"] || row["issuable"] || "true");
    const isSellable = parseBool(row["issellable"] || row["sellable"] || "true");

    const description = String(row["description"] || row["desc"] || "").trim();
    const purchaseType = String(row["purchasetype"] || "").trim();

    const payload = {
      userId,
      sku,
      masterSku,
      materialName,
      category,
      subCategory: subCategory || null,
      forUse: forUse || null,
      manufacturingGroup,
      unit,
      colors,
      width,
      widthRangeFrom,
      widthRangeTo,
      gsm,
      gsmRangeFrom,
      gsmRangeTo,
      gstRate,
      hsnCode,
      brand,
      less,
      description,
      costApplyingMode,
      materialCost,
      mrp,
      salesRate,
      reorderLevelStock,
      purchaseType,
      isStockDetailsCompulsory,
      issueMode,
      consumptionMode,
      isIssuable,
      isSellable,
      isActive: true,
      attributes: [],
    };

    try {
      const existing = await findMaterialBySkuOrMasterSku(sku, masterSku, userId);
      if (existing) {
        await updateMaterial(existing.id, payload);
        updatedCount++;
      } else {
        await createMaterial(payload);
        importedCount++;
      }
      await autoPersistMaterialOptions(userId, payload);
    } catch (saveErr) {
      console.error(`Failed to save material row ${rowNum}:`, saveErr);
      validationErrors.push(`Row ${rowNum} (${sku}): ${saveErr.message || "Failed to save"}`);
    }
  }

  if (importedCount === 0 && updatedCount === 0 && validationErrors.length > 0) {
    const errorPreview = validationErrors.slice(0, 3).join(". ");
    throw new Error(`Validation failed for sheet rows. ${errorPreview}`);
  }

  return {
    importedCount,
    updatedCount,
    totalProcessed: importedCount + updatedCount,
    errors: validationErrors,
  };
};

// ======================================================
// Auto Persist Dropdown Options
// ======================================================

export const autoPersistMaterialOptions = async (userId, data) => {
  try {
    const fieldsToPersist = [
      "category",
      "subCategory",
      "forUse",
      "brand",
      "unit",
      "manufacturingGroup",
      "costApplyingMode",
      "issueMode",
      "consumptionMode",
      "purchaseType",
    ];

    const ignoredValues = new Set([
      "no category",
      "no sub category",
      "no manufacturing group",
      "no unit",
      "no brand",
      "no for use",
      "no cost applying mode",
      "no purchase type",
      "no issue mode",
      "no consumption mode",
    ]);

    for (const field of fieldsToPersist) {
      const val = data[field];
      if (val && typeof val === "string") {
        const trimmed = val.trim();
        const lower = trimmed.toLowerCase();
        if (trimmed && !ignoredValues.has(lower) && !lower.startsWith("no ")) {
          await upsertDropdownOption(userId, {
            field: field.toLowerCase(),
            value: trimmed,
            label: trimmed,
          });
        }
      }
    }
  } catch (err) {
    console.error("autoPersistMaterialOptions error:", err);
  }
};

export const getDropdownOptionsService = async (userId) => {
  const [userSaved, parties, existingMaterials, variantColorAttrs] = await Promise.all([
    getDropdownOptionsByUserId(userId),
    getPartiesByUserId(userId),
    prisma.material.findMany({
      where: { userId },
      select: {
        category: true,
        subCategory: true,
        forUse: true,
        brand: true,
        unit: true,
        manufacturingGroup: true,
        costApplyingMode: true,
        purchaseType: true,
        issueMode: true,
        consumptionMode: true,
        gender: true,
        referenceParty: true,
        rackAddress: true,
        availability: true,
        colors: true,
        gstRate: true,
      },
    }),
    prisma.materialVariantAttribute.findMany({
      where: {
        materialVariant: {
          material: { userId },
        },
        materialAttribute: {
          attributeName: {
            in: ["Colour", "colour", "Color", "color"],
          },
        },
      },
      select: {
        attributeValue: true,
      },
    }).catch(() => []),
  ]);

  const variantColors = (variantColorAttrs || [])
    .flatMap((va) => (va.attributeValue ? va.attributeValue.split(",").map((s) => s.trim()) : []))
    .filter(Boolean);

  const materialColors = existingMaterials.flatMap((p) => p.colors || []).filter(Boolean);

  const cleanValues = (arr, ignoredList = []) => {
    const ignoredSet = new Set(ignoredList.map((s) => s.toLowerCase()));
    return [
      ...new Set(
        arr
          .filter(
            (v) =>
              v &&
              typeof v === "string" &&
              v.trim() &&
              !ignoredSet.has(v.trim().toLowerCase()) &&
              !v.trim().toLowerCase().startsWith("no ")
          )
          .map((v) => v.trim())
      ),
    ];
  };

  const distinctMaterials = {
    categories: cleanValues(existingMaterials.map((p) => p.category), ["no category"]),
    subCategories: cleanValues(existingMaterials.map((p) => p.subCategory), ["no sub category"]),
    forUses: cleanValues(existingMaterials.map((p) => p.forUse), ["no for use"]),
    manufacturingGroups: cleanValues(existingMaterials.map((p) => p.manufacturingGroup), ["no manufacturing group"]),
    brands: cleanValues(existingMaterials.map((p) => p.brand), ["no brand"]),
    units: cleanValues(existingMaterials.map((p) => p.unit), ["no unit"]),
    costApplyingModes: cleanValues(existingMaterials.map((p) => p.costApplyingMode), ["no cost applying mode"]),
    purchaseTypes: cleanValues(existingMaterials.map((p) => p.purchaseType), ["no purchase type"]),
    issueModes: cleanValues(existingMaterials.map((p) => p.issueMode), ["no issue mode"]),
    consumptionModes: cleanValues(existingMaterials.map((p) => p.consumptionMode), ["no consumption mode"]),
    genders: cleanValues(existingMaterials.map((p) => p.gender)),
    referenceParties: cleanValues(existingMaterials.map((p) => p.referenceParty)),
    rackAddresses: cleanValues(existingMaterials.map((p) => p.rackAddress)),
    availabilities: cleanValues(existingMaterials.map((p) => p.availability)),
    colors: cleanValues([...materialColors, ...variantColors]),
    gstRates: [...new Set(existingMaterials.map((p) => p.gstRate).filter((g) => g !== null && g !== undefined))],
  };

  return {
    savedOptions: userSaved.filter(
      (o) =>
        o.value &&
        !o.value.toLowerCase().startsWith("no ") &&
        !["no category", "no sub category", "no manufacturing group", "no unit", "no brand", "no for use"].includes(
          o.value.toLowerCase()
        )
    ),
    parties: parties.map((p) => p.partyName).filter(Boolean),
    distinctFromProducts: distinctMaterials,
    distinctFromMaterials: distinctMaterials,
  };
};

export const saveDropdownOptionService = async (userId, data) => {
  return await upsertDropdownOption(userId, data);
};


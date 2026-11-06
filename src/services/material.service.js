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
import { getAllMasterDropdownOptionsService, normalizeFieldKey, ensureFieldDefaultsInDb } from "./settingMasters.service.js";
import { getWorkspaceDropdownManagementMode } from "./clientConfiguration.service.js";

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
    const sku = String(row["sku"] || row["materialsku"] || row["mastersku"] || "").trim();
    const masterSku = String(row["mastersku"] || row["sku"] || "").trim();
    const materialName = String(row["materialname"] || row["name"] || "").trim();
    const category = String(row["category"] || "").trim();
    const subCategory = String(row["subcategory"] || row["sub_category"] || "").trim();
    const forUse = String(row["foruse"] || row["for_use"] || row["for"] || "").trim();
    const manufacturingGroup = String(row["manufacturinggroup"] || row["mfggroup"] || "").trim();
    const unit = String(row["unit"] || "Meters").trim();
    const hsnCode = String(row["hsncode"] || row["hsn"] || "").trim();
    const brand = String(row["brandname"] || row["brand"] || "").trim();
    const less = parseFloat(row["less(%)"] || row["less%"] || row["less"] || 0) || 0;
    const costApplyingMode = String(row["costapplyingmode"] || row["costmode"] || "").trim();
    const issueMode = String(row["issuemode"] || "").trim();
    const consumptionMode = String(row["consumptionmode"] || "").trim();
    const rackAddress = String(row["rackaddress"] || row["rack"] || "").trim();
    const asin = String(row["asin"] || "").trim();
    const myntraSku = String(row["myntrasku"] || row["myntra"] || "").trim();
    const fsnCode = String(row["fsncode"] || row["fsn"] || "").trim();

    if (!sku && !masterSku && !materialName) {
      validationErrors.push(`Row ${rowNum}: Material SKU or Name is required.`);
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
    const materialCost = Number(row["materialcost"] || row["cost"] || row["openingrate"]) || 0;
    const mrp = String(row["mrp"] ?? "0").trim() || "0";
    const salesRate = Number(row["salesrate"]) || 0;
    const openingStock = parseInt(row["openingstock"] || row["stock"], 10) || 0;
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

    try {
      const effectiveSku = sku || masterSku;
      const effectiveMasterSku = masterSku || sku;
      const existing = await findMaterialBySkuOrMasterSku(effectiveSku, effectiveMasterSku, userId);

      if (existing) {
        // Update existing material with non-empty incoming values
        const updatePayload = {
          ...existing,
        };
        if (materialName) updatePayload.materialName = materialName;
        if (category) updatePayload.category = category;
        if (subCategory) updatePayload.subCategory = subCategory;
        if (forUse) updatePayload.forUse = forUse;
        if (manufacturingGroup) updatePayload.manufacturingGroup = manufacturingGroup;
        if (unit) updatePayload.unit = unit;
        if (colors.length > 0) updatePayload.colors = colors;
        if (width > 0) updatePayload.width = width;
        if (gsm > 0) updatePayload.gsm = gsm;
        if (gstRate !== undefined) updatePayload.gstRate = gstRate;
        if (hsnCode) updatePayload.hsnCode = hsnCode;
        if (brand) updatePayload.brand = brand;
        if (costApplyingMode) updatePayload.costApplyingMode = costApplyingMode;
        if (materialCost > 0) updatePayload.materialCost = materialCost;
        if (mrp && mrp !== "0") updatePayload.mrp = mrp;
        if (salesRate > 0) updatePayload.salesRate = salesRate;
        if (reorderLevelStock > 0) updatePayload.reorderLevelStock = reorderLevelStock;
        if (openingStock > 0) updatePayload.openingStock = openingStock;
        if (rackAddress) updatePayload.rackAddress = rackAddress;
        if (asin) updatePayload.asin = asin;
        if (myntraSku) updatePayload.myntraSku = myntraSku;
        if (fsnCode) updatePayload.fsnCode = fsnCode;
        if (issueMode) updatePayload.issueMode = issueMode;
        if (consumptionMode) updatePayload.consumptionMode = consumptionMode;

        await updateMaterial(existing.id, updatePayload);
        await autoPersistMaterialOptions(userId, updatePayload);
        updatedCount++;
      } else {
        // Create new material with sensible defaults
        const createPayload = {
          userId,
          sku: effectiveSku,
          masterSku: effectiveMasterSku,
          materialName: materialName || effectiveMasterSku || effectiveSku,
          category: category || "General",
          subCategory: subCategory || null,
          forUse: forUse || null,
          manufacturingGroup: manufacturingGroup || "General",
          unit: unit || "Meters",
          colors,
          width,
          widthRangeFrom,
          widthRangeTo,
          gsm,
          gsmRangeFrom,
          gsmRangeTo,
          gstRate,
          hsnCode: hsnCode || "0000",
          brand: brand || "No Brand",
          less,
          description: description || null,
          costApplyingMode: costApplyingMode || "FIFO",
          materialCost,
          mrp,
          salesRate,
          openingStock,
          reorderLevelStock,
          purchaseType: purchaseType || null,
          isStockDetailsCompulsory,
          issueMode: issueMode || "Direct",
          consumptionMode: consumptionMode || "Standard",
          isIssuable,
          isSellable,
          rackAddress: rackAddress || null,
          asin: asin || null,
          myntraSku: myntraSku || null,
          fsnCode: fsnCode || null,
          isActive: true,
          attributes: [],
        };

        const created = await createMaterial(createPayload);
        if (asin && asin.trim()) {
          try {
            await upsertAsinImport({
              userId,
              asin: asin.trim(),
              sku: effectiveMasterSku,
              rackAddress: rackAddress || null,
              generateBarcode: "No",
            });
          } catch (asinErr) {
            console.error("Failed to sync ASIN to AsinImport:", asinErr);
          }
        }
        await autoPersistMaterialOptions(userId, createPayload);
        importedCount++;
      }
    } catch (saveErr) {
      console.error(`Failed to save material row ${rowNum}:`, saveErr);
      validationErrors.push(`Row ${rowNum} (${sku || masterSku}): ${saveErr.message || "Failed to save"}`);
    }
  }

  let message = "";
  if (importedCount > 0 && updatedCount > 0) {
    message = `Successfully imported ${importedCount} new material(s) and updated ${updatedCount} existing material(s).`;
  } else if (importedCount > 0) {
    message = `Successfully imported ${importedCount} new material(s).`;
  } else if (updatedCount > 0) {
    message = `Successfully updated ${updatedCount} existing material(s).`;
  } else if (validationErrors.length > 0) {
    message = `Validation failed for some rows: ${validationErrors[0]}`;
  } else {
    message = "No material records were processed.";
  }

  return {
    importedCount,
    updatedCount,
    totalProcessed: importedCount + updatedCount,
    errors: validationErrors,
    message,
  };
};



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
          if (field === "category") {
            await upsertDropdownOption(userId, {
              field: "materialcategory",
              value: trimmed,
              label: trimmed,
            });
          }
          if (field === "subCategory") {
            await upsertDropdownOption(userId, {
              field: "materialsubcategory",
              value: trimmed,
              label: trimmed,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("autoPersistMaterialOptions error:", err);
  }
};

export const getDropdownOptionsService = async (userId) => {
  const [userSaved, parties, existingMaterials, variantColorAttrs] = await Promise.all([
    getAllMasterDropdownOptionsService(userId).catch((err) => {
      console.error("Error fetching master dropdown options:", err);
      return [];
    }),
    getPartiesByUserId(userId).catch((err) => {
      console.error("Error fetching parties:", err);
      return [];
    }),
    prisma.material
      .findMany({
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
      })
      .catch((err) => {
        console.error("Error fetching existing materials:", err);
        return [];
      }),
    prisma.materialVariantAttribute
      .findMany({
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
      })
      .catch(() => []),
  ]);

  const variantColors = (variantColorAttrs || [])
    .flatMap((va) => (va.attributeValue ? va.attributeValue.split(",").map((s) => s.trim()) : []))
    .filter(Boolean);

  const materialColors = (existingMaterials || []).flatMap((p) => p.colors || []).filter(Boolean);

  // Build disabled lookup set to ensure deactivated options never leak through distinct lists
  const disabledMap = new Map();
  (userSaved || []).forEach((o) => {
    if (o.isActive === false || o.label === "__DELETED__") {
      const f = o.field.toLowerCase();
      if (!disabledMap.has(f)) disabledMap.set(f, new Set());
      if (o.value) disabledMap.get(f).add(o.value.trim().toLowerCase());
      if (o.label && o.label !== "__DELETED__") disabledMap.get(f).add(o.label.trim().toLowerCase());
    }
  });

  const cleanValues = (field, arr, ignoredList = []) => {
    const ignoredSet = new Set(ignoredList.map((s) => s.toLowerCase()));
    const disabledSet = disabledMap.get(field.toLowerCase());
    return [
      ...new Set(
        arr
          .filter(
            (v) =>
              v &&
              typeof v === "string" &&
              v.trim() &&
              !ignoredSet.has(v.trim().toLowerCase()) &&
              !v.trim().toLowerCase().startsWith("no ") &&
              (!disabledSet || !disabledSet.has(v.trim().toLowerCase()))
          )
          .map((v) => v.trim())
      ),
    ];
  };

  const disabledGst = disabledMap.get("gstrate") || disabledMap.get("gst");
  const distinctMaterials = {
    categories: cleanValues("category", existingMaterials.map((p) => p.category), ["no category"]),
    subCategories: cleanValues("subcategory", existingMaterials.map((p) => p.subCategory), ["no sub category"]),
    forUses: cleanValues("foruse", existingMaterials.map((p) => p.forUse), ["no for use"]),
    manufacturingGroups: cleanValues("manufacturinggroup", existingMaterials.map((p) => p.manufacturingGroup), ["no manufacturing group"]),
    brands: cleanValues("brand", existingMaterials.map((p) => p.brand), ["no brand"]),
    units: cleanValues("unit", existingMaterials.map((p) => p.unit), ["no unit"]),
    costApplyingModes: cleanValues("costapplyingmode", existingMaterials.map((p) => p.costApplyingMode), ["no cost applying mode"]),
    purchaseTypes: cleanValues("purchasetype", existingMaterials.map((p) => p.purchaseType), ["no purchase type"]),
    issueModes: cleanValues("issuemode", existingMaterials.map((p) => p.issueMode), ["no issue mode"]),
    consumptionModes: cleanValues("consumptionmode", existingMaterials.map((p) => p.consumptionMode), ["no consumption mode"]),
    genders: cleanValues("gender", existingMaterials.map((p) => p.gender)),
    referenceParties: cleanValues("referenceparty", existingMaterials.map((p) => p.referenceParty)),
    rackAddresses: cleanValues("rackaddress", existingMaterials.map((p) => p.rackAddress)),
    availabilities: cleanValues("availability", existingMaterials.map((p) => p.availability)),
    colors: cleanValues("color", [...materialColors, ...variantColors]),
    gstRates: [
      ...new Set(
        existingMaterials
          .map((p) => p.gstRate)
          .filter((g) => g !== null && g !== undefined && (!disabledGst || !disabledGst.has(String(g).trim().toLowerCase())))
      ),
    ],
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
    parties: parties
      .map((p) => p.partyName)
      .filter((p) => Boolean(p) && (!disabledMap.get("referenceparty") || !disabledMap.get("referenceparty").has(p.trim().toLowerCase()))),
    distinctFromProducts: distinctMaterials,
    distinctFromMaterials: distinctMaterials,
  };
};

export const saveDropdownOptionService = async (userId, data) => {
  const rawField = data?.field ? String(data.field).trim().toLowerCase() : "";
  let targetField = rawField;
  if (rawField === "materialcategory" || rawField === "category") {
    targetField = "materialcategory";
  } else if (rawField === "materialsubcategory" || rawField === "subcategory") {
    targetField = "materialsubcategory";
  } else if (rawField === "colour" || rawField === "colours") {
    targetField = "color";
  } else {
    targetField = normalizeFieldKey(rawField);
  }
  if (targetField) {
    await ensureFieldDefaultsInDb(userId, targetField);
  }
  return await upsertDropdownOption(userId, { ...data, field: targetField });
};


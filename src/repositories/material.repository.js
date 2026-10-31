import prisma from "../config/prisma.js";

// ======================================================
// Count Materials By User
// ======================================================

export const countMaterialsByUserId = async (userId) => {
  return await prisma.material.count({
    where: {
      userId,
    },
  });
};

// ======================================================
// Helper: Generate Cartesian Combinations of Attributes
// ======================================================

function generateCartesianCombinations(attributesWithParts) {
  const activeAttrs = attributesWithParts.filter(
    (a) => a.materialAttributeId && Array.isArray(a.parts) && a.parts.length > 0
  );

  if (activeAttrs.length === 0) {
    return [];
  }

  let combinations = [[]];
  for (const attr of activeAttrs) {
    const nextCombos = [];
    for (const combo of combinations) {
      for (const val of attr.parts) {
        nextCombos.push([
          ...combo,
          {
            materialAttributeId: attr.materialAttributeId,
            attributeName: attr.attributeName,
            attributeValue: val,
          },
        ]);
      }
    }
    combinations = nextCombos;
  }

  return combinations;
}

// ======================================================
// Create Material
// ======================================================

export const createMaterial = async (data) => {
  const { attributes = [], ...materialData } = data;
  const updateData = { ...materialData };
  if (Array.isArray(materialData.colors)) {
    updateData.colors = materialData.colors;
  }
  if (materialData.marketplace !== undefined) {
    updateData.marketplace = Array.isArray(materialData.marketplace)
      ? materialData.marketplace.join(", ")
      : String(materialData.marketplace || "All");
  }

  return await prisma.$transaction(
    async (tx) => {
      // Create Material
      const material = await tx.material.create({
        data: updateData,
      });

      // Create Material Attributes
      let createdAttributes = [];
      const validAttributes = attributes.filter(
        (attribute) => attribute.attributeName && attribute.attributeName.trim()
      );

      if (validAttributes.length > 0) {
        await tx.materialAttribute.createMany({
          data: validAttributes.map((attribute) => ({
            materialId: material.id,
            attributeName: attribute.attributeName.trim(),
          })),
          skipDuplicates: true,
        });

        createdAttributes = await tx.materialAttribute.findMany({
          where: {
            materialId: material.id,
          },
        });
      }

      // If attributes have attributeValue, create initial variant(s)
      const hasValues = attributes.some((a) => a.attributeValue && a.attributeValue.trim());
      if (hasValues && createdAttributes.length > 0) {
        const parsedAttrs = attributes.map((attr) => {
          const matched = createdAttributes.find(
            (ca) => ca.attributeName.toLowerCase() === attr.attributeName.trim().toLowerCase()
          );
          const raw = attr.attributeValue ? String(attr.attributeValue).trim() : "";
          const parts = raw
            ? raw
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0)
            : [];
          return {
            materialAttributeId: matched ? matched.id : null,
            attributeName: attr.attributeName,
            parts,
          };
        });

        const combinations = generateCartesianCombinations(parsedAttrs);

        if (combinations.length > 0) {
          await Promise.all(
            combinations.map(async (combo) => {
              const skuParts = combo
                .filter((va) => (va.attributeName || "").toLowerCase() !== "gender")
                .map((va) => va.attributeValue)
                .filter(Boolean);
              const autoVariantSku =
                skuParts.length > 0 ? `${material.masterSku}-${skuParts.join("-")}` : material.masterSku;

              const variant = await tx.materialVariant.create({
                data: {
                  materialId: material.id,
                  variantSku: autoVariantSku,
                  asin: material.asin,
                  rackAddress: material.rackAddress,
                  isActive: material.isActive,
                },
              });

              await tx.materialVariantAttribute.createMany({
                data: combo.map((va) => ({
                  materialVariantId: variant.id,
                  materialAttributeId: va.materialAttributeId,
                  attributeValue: va.attributeValue,
                })),
              });
            })
          );
        } else {
          const baseVariant = await tx.materialVariant.create({
            data: {
              materialId: material.id,
              variantSku: material.masterSku,
              asin: material.asin,
              rackAddress: material.rackAddress,
              isActive: material.isActive,
            },
          });
          const validAttrsToLink = parsedAttrs
            .filter((a) => a.materialAttributeId && a.parts.length > 0)
            .map((a) => ({
              materialVariantId: baseVariant.id,
              materialAttributeId: a.materialAttributeId,
              attributeValue: a.parts[0],
            }));
          if (validAttrsToLink.length > 0) {
            await tx.materialVariantAttribute.createMany({
              data: validAttrsToLink,
            });
          }
        }
      }

      // Return Material With Attributes and Variants
      return await tx.material.findUnique({
        where: {
          id: material.id,
        },
        include: {
          attributes: true,
          variants: {
            include: {
              attributes: {
                include: {
                  materialAttribute: true,
                },
              },
            },
          },
        },
      });
    },
    {
      maxWait: 15000,
      timeout: 60000,
    }
  );
};

// ======================================================
// Get All Materials
// ======================================================

export const getMaterialsByUserId = async (userId) => {
  return await prisma.material.findMany({
    where: {
      userId,
    },
    include: {
      attributes: true,
      variants: {
        include: {
          attributes: {
            include: {
              materialAttribute: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// ======================================================
// Get Material By Id
// ======================================================

export const getMaterialById = async (id, userId) => {
  return await prisma.material.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      attributes: true,
      variants: {
        include: {
          attributes: {
            include: {
              materialAttribute: true,
            },
          },
        },
      },
    },
  });
};

// ======================================================
// Find Material By Master SKU
// ======================================================

export const findMaterialByMasterSku = async (masterSku, userId) => {
  return await prisma.material.findFirst({
    where: {
      masterSku,
      userId,
    },
  });
};

export const findMaterialBySkuOrMasterSku = async (sku, masterSku, userId) => {
  const orConditions = [];
  if (masterSku) orConditions.push({ masterSku });
  if (sku) orConditions.push({ sku }, { masterSku: sku });
  if (orConditions.length === 0) return null;

  return await prisma.material.findFirst({
    where: {
      userId,
      OR: orConditions,
    },
  });
};

// ======================================================
// Update Material
// ======================================================

export const updateMaterial = async (id, data) => {
  const { attributes = [], ...materialData } = data;
  const updateData = { ...materialData };
  if (Array.isArray(materialData.colors)) {
    updateData.colors = { set: materialData.colors };
  }
  if (materialData.marketplace !== undefined) {
    updateData.marketplace = Array.isArray(materialData.marketplace)
      ? materialData.marketplace.join(", ")
      : String(materialData.marketplace || "All");
  }

  return await prisma.$transaction(
    async (tx) => {
      // Update Material
      await tx.material.update({
        where: { id },
        data: updateData,
      });

      // Existing Attributes
      const existingAttributes = await tx.materialAttribute.findMany({
        where: { materialId: id },
      });

      for (const attribute of attributes) {
        if (!attribute.id && attribute.attributeName) {
          const matched = existingAttributes.find(
            (ea) => ea.attributeName.trim().toLowerCase() === attribute.attributeName.trim().toLowerCase()
          );
          if (matched) {
            attribute.id = matched.id;
          }
        }
      }

      const existingIds = existingAttributes.map((item) => item.id);
      const incomingIds = attributes.filter((item) => item.id).map((item) => item.id);

      const attributesToUpdate = attributes.filter((a) => a.id);
      if (attributesToUpdate.length > 0) {
        await Promise.all(
          attributesToUpdate.map((attribute) =>
            tx.materialAttribute.updateMany({
              where: {
                id: attribute.id,
                materialId: id,
              },
              data: {
                attributeName: attribute.attributeName.trim(),
              },
            })
          )
        );
      }

      // Create new attributes
      const newAttributes = attributes.filter((item) => !item.id && item.attributeName?.trim());
      if (newAttributes.length > 0) {
        await tx.materialAttribute.createMany({
          data: newAttributes.map((attr) => ({
            materialId: id,
            attributeName: attr.attributeName.trim(),
          })),
          skipDuplicates: true,
        });
      }

      return await tx.material.findUnique({
        where: { id },
        include: {
          attributes: true,
          variants: {
            include: {
              attributes: {
                include: {
                  materialAttribute: true,
                },
              },
            },
          },
        },
      });
    },
    {
      maxWait: 15000,
      timeout: 60000,
    }
  );
};

// ======================================================
// Delete Material
// ======================================================

export const deleteMaterial = async (id, userId) => {
  return await prisma.material.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Update Material Status
// ======================================================

export const updateMaterialStatus = async (id, isActive) => {
  return await prisma.material.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });
};

// ======================================================
// Get Material Stats
// ======================================================

export const getMaterialStats = async (userId) => {
  const totalMaterials = await prisma.material.count({
    where: {
      userId,
    },
  });

  const activeMaterials = await prisma.material.count({
    where: {
      userId,
      isActive: true,
    },
  });

  const inactiveMaterials = await prisma.material.count({
    where: {
      userId,
      isActive: false,
    },
  });

  return {
    totalMaterials,
    activeMaterials,
    inactiveMaterials,
  };
};

// ======================================================
// Find Material By ASIN
// ======================================================

export const findMaterialByAsin = async (asin, userId) => {
  if (!asin) return null;
  return await prisma.material.findFirst({
    where: {
      asin,
      userId,
    },
  });
};

// ======================================================
// Find Material By Name
// ======================================================

export const findMaterialByName = async (materialName, userId) => {
  return await prisma.material.findFirst({
    where: {
      materialName,
      userId,
    },
  });
};

// ======================================================
// Dropdown Option Repository
// ======================================================

export const upsertDropdownOption = async (userId, { field, value, label }) => {
  if (!field || !value) return null;
  const cleanField = field.trim().toLowerCase();
  const cleanValue = value.trim();
  const cleanLabel = label ? label.trim() : cleanValue;

  return await prisma.dropdownOption.upsert({
    where: {
      userId_field_value: {
        userId,
        field: cleanField,
        value: cleanValue,
      },
    },
    update: {
      label: cleanLabel,
    },
    create: {
      userId,
      field: cleanField,
      value: cleanValue,
      label: cleanLabel,
    },
  });
};

export const getDropdownOptionsByUserId = async (userId) => {
  return await prisma.dropdownOption.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
};

export const getPartiesByUserId = async (userId) => {
  try {
    return await prisma.party.findMany({
      where: { userId },
      select: { partyName: true },
      orderBy: { partyName: "asc" },
    });
  } catch (err) {
    return [];
  }
};


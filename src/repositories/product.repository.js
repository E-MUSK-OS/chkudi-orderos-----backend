import prisma from "../config/prisma.js";

// ======================================================
// Count Products By User
// ======================================================

export const countProductsByUserId = async (userId) => {
  return await prisma.product.count({
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
    (a) => a.productAttributeId && Array.isArray(a.parts) && a.parts.length > 0
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
            productAttributeId: attr.productAttributeId,
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
// Create Product
// ======================================================

export const createProduct = async (data) => {
  const { attributes = [], ...productData } = data;
  const updateData = { ...productData };
  if (Array.isArray(productData.colors)) {
    updateData.colors = productData.colors;
  }
  if (productData.marketplace !== undefined) {
    updateData.marketplace = Array.isArray(productData.marketplace)
      ? productData.marketplace.join(", ")
      : String(productData.marketplace || "All");
  }

  return await prisma.$transaction(
    async (tx) => {
    // Create Product
    const product = await tx.product.create({
      data: updateData,
    });

    // Create Product Attributes
    let createdAttributes = [];
    const validAttributes = attributes.filter(
      (attribute) => attribute.attributeName && attribute.attributeName.trim()
    );

    if (validAttributes.length > 0) {
      await tx.productAttribute.createMany({
        data: validAttributes.map((attribute) => ({
          productId: product.id,
          attributeName: attribute.attributeName.trim(),
        })),
        skipDuplicates: true,
      });

      createdAttributes = await tx.productAttribute.findMany({
        where: {
          productId: product.id,
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
          productAttributeId: matched ? matched.id : null,
          attributeName: attr.attributeName,
          parts,
        };
      });

      const combinations = generateCartesianCombinations(parsedAttrs);

      if (combinations.length > 0) {
        await Promise.all(combinations.map(async (combo) => {
        const skuParts = combo
          .filter((va) => (va.attributeName || "").toLowerCase() !== "gender")
          .map((va) => va.attributeValue)
          .filter(Boolean);
        const autoVariantSku =
          skuParts.length > 0 ? `${product.masterSku}-${skuParts.join("-")}` : product.masterSku;

        const variant = await tx.productVariant.create({
          data: {
            productId: product.id,
            variantSku: autoVariantSku,
            asin: product.asin,
            rackAddress: product.rackAddress,
            isActive: product.isActive,
          },
        });

        await tx.productVariantAttribute.createMany({
          data: combo.map((va) => ({
            productVariantId: variant.id,
            productAttributeId: va.productAttributeId,
            attributeValue: va.attributeValue,

          })),
        });
      }));
    } else {
      const baseVariant = await tx.productVariant.create({
        data: {
          productId: product.id,
          variantSku: product.masterSku,
          asin: product.asin,
          rackAddress: product.rackAddress,
          isActive: product.isActive,
        },
      });
      const validAttrsToLink = parsedAttrs
        .filter((a) => a.productAttributeId && a.parts.length > 0)
        .map((a) => ({
          productVariantId: baseVariant.id,
          productAttributeId: a.productAttributeId,
          attributeValue: a.parts[0],
        }));
      if (validAttrsToLink.length > 0) {
        await tx.productVariantAttribute.createMany({
          data: validAttrsToLink,
        });
      }
    }
  }

    // Return Product With Attributes and Variants
    return await tx.product.findUnique({
      where: {
        id: product.id,
      },
      include: {
        attributes: true,
        variants: {
          include: {
            attributes: {
              include: {
                productAttribute: true,
              },
            },
          },
        },
      },
    });
  }, {
    maxWait: 15000,
    timeout: 60000,
  });
};

// ======================================================
// Get All Products
// ======================================================

export const getProductsByUserId = async (userId) => {
  return await prisma.product.findMany({
    where: {
      userId,
    },

    include: {
      attributes: true,
      variants: {
        include: {
          attributes: {
            include: {
              productAttribute: true,
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
// Get Product By Id
// ======================================================

export const getProductById = async (id, userId) => {
  return await prisma.product.findFirst({
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
              productAttribute: true,
            },
          },
        },
      },
    },
  });
};

// ======================================================
// Find Product By Master SKU
// ======================================================

export const findProductByMasterSku = async (masterSku, userId) => {
  return await prisma.product.findFirst({
    where: {
      masterSku,
      userId,
    },
  });
};


// ======================================================
// Update Product
// ======================================================

export const updateProduct = async (id, data) => {
  const { attributes = [], ...productData } = data;
  const updateData = { ...productData };
  if (Array.isArray(productData.colors)) {
    updateData.colors = { set: productData.colors };
  }
  if (productData.marketplace !== undefined) {
    updateData.marketplace = Array.isArray(productData.marketplace)
      ? productData.marketplace.join(", ")
      : String(productData.marketplace || "All");
  }

  return await prisma.$transaction(
    async (tx) => {
    // ======================================================
    // Update Product
    // ======================================================

    await tx.product.update({
      where: {
        id,
      },
      data: updateData,
    });

    // ======================================================
    // Existing Attributes
    // ======================================================

    const existingAttributes = await tx.productAttribute.findMany({
      where: {
        productId: id,
      },
    });

    // If any incoming attribute is missing id, match it with existing attributes by attributeName
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

    // Existing IDs
    const existingIds = existingAttributes.map((item) => item.id);

    // Incoming IDs
    const incomingIds = attributes
      .filter((item) => item.id)
      .map((item) => item.id);

    // ======================================================
    // Update Existing Attributes in Parallel
    // ======================================================

    const attributesToUpdate = attributes.filter((a) => a.id);
    if (attributesToUpdate.length > 0) {
      await Promise.all(
        attributesToUpdate.map((attribute) =>
          tx.productAttribute.updateMany({
            where: {
              id: attribute.id,
              productId: id,
            },
            data: {
              attributeName: attribute.attributeName.trim(),
            },
          })
        )
      );
    }

    // ======================================================
    // Create New Attributes
    // ======================================================

    const duplicateNames = new Set();

    for (const attribute of attributes) {
      const key = attribute.attributeName.trim().toLowerCase();

      if (duplicateNames.has(key)) {
        throw new Error(`Duplicate attribute "${attribute.attributeName}".`);
      }

      duplicateNames.add(key);
    }

    const newAttributes = attributes.filter(
      (item) => !item.id && item.attributeName && item.attributeName.trim()
    );

    if (newAttributes.length > 0) {
      await tx.productAttribute.createMany({
        data: newAttributes.map((attribute) => ({
          productId: id,
          attributeName: attribute.attributeName.trim(),
        })),
        skipDuplicates: true,
      });
    }

    // ======================================================
    // Delete Removed Attributes in Batch
    // ======================================================

    const deletedIds = existingIds.filter(
      (item) => !incomingIds.includes(item),
    );

    if (deletedIds.length > 0) {
      await tx.productVariantAttribute.deleteMany({
        where: {
          productAttributeId: { in: deletedIds },
        },
      });

      await tx.productAttribute.deleteMany({
        where: {
          id: { in: deletedIds },
        },
      });
    }

    // ======================================================
    // Update or Create Variant Values
    // ======================================================

    const allProductAttributes = await tx.productAttribute.findMany({
      where: { productId: id },
    });

    const allVariants = await tx.productVariant.findMany({
      where: { productId: id },
      orderBy: { createdAt: "asc" },
      include: { attributes: true },
    });

    const parsedAttrValues = attributes.map((attr) => {
      const matched = allProductAttributes.find(
        (pa) =>
          (attr.id && pa.id === attr.id) ||
          pa.attributeName.trim().toLowerCase() === attr.attributeName.trim().toLowerCase()
      );
      const rawVal =
        attr.attributeValue !== undefined && attr.attributeValue !== null
          ? String(attr.attributeValue).trim()
          : "";
      const parts = rawVal
        ? rawVal
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];
      return {
        productAttributeId: matched ? matched.id : attr.id,
        attributeName: attr.attributeName,
        parts,
        rawVal,
      };
    });

    const activeProduct = await tx.product.findUnique({ where: { id } });
    const activeMasterSku = productData.masterSku || activeProduct?.masterSku || "";
    const oldMasterSku = activeProduct?.masterSku ? activeProduct.masterSku.trim() : "";
    const newMasterSku = activeMasterSku.trim();
    const isMasterSkuChanged = Boolean(oldMasterSku && newMasterSku && oldMasterSku !== newMasterSku);

    const targetCombinations = generateCartesianCombinations(parsedAttrValues);

    if (targetCombinations.length > 0) {
      const matchedVariantIds = new Set();
      const usedComboIndices = new Set();
      const usedSkusSet = new Set(
        allVariants.map((v) => (v.variantSku || "").toLowerCase().trim()).filter(Boolean)
      );

      // Pass 1: Match existing variants accurately by Color & Size or by variantSku
      const pass1Ops = [];
      for (let cIdx = 0; cIdx < targetCombinations.length; cIdx++) {
        const combo = targetCombinations[cIdx];
        const comboColor = combo.find((ca) =>
          ["colour", "color"].includes((ca.attributeName || "").toLowerCase().trim())
        )?.attributeValue?.toLowerCase().trim();
        const comboSize = combo.find((ca) =>
          ["size"].includes((ca.attributeName || "").toLowerCase().trim())
        )?.attributeValue?.toLowerCase().trim();

        const skuParts = combo
          .filter((va) => (va.attributeName || "").toLowerCase() !== "gender")
          .map((va) => va.attributeValue)
          .filter(Boolean);
        const autoVariantSku =
          skuParts.length > 0 && activeMasterSku
            ? `${activeMasterSku}-${skuParts.join("-")}`
            : activeMasterSku;

        // 1. Try matching by exact variantSku
        let matched = allVariants.find(
          (v) =>
            v &&
            !matchedVariantIds.has(v.id) &&
            v.variantSku.toLowerCase().trim() === autoVariantSku.toLowerCase().trim()
        );

        // 2. Try matching by Color and Size attributes
        if (!matched) {
          matched = allVariants.find((v) => {
            if (!v || matchedVariantIds.has(v.id)) return false;
            const vAttrs = v.attributes || [];
            const vColor = vAttrs.find((va) =>
              ["colour", "color"].includes(
                (va.productAttribute?.attributeName || "").toLowerCase().trim()
              )
            )?.attributeValue?.toLowerCase().trim();
            const vSize = vAttrs.find((va) =>
              ["size"].includes(
                (va.productAttribute?.attributeName || "").toLowerCase().trim()
              )
            )?.attributeValue?.toLowerCase().trim();

            if (comboColor && comboSize) {
              return vColor === comboColor && vSize === comboSize;
            }
            if (comboSize) {
              return vSize === comboSize;
            }
            if (comboColor) {
              return vColor === comboColor;
            }
            return false;
          });
        }

        // 3. Fallback: match by SKU substring
        if (!matched) {
          matched = allVariants.find((v) => {
            if (!v || matchedVariantIds.has(v.id)) return false;
            const skuLower = (v.variantSku || "").toLowerCase();
            if (comboColor && comboSize) {
              return skuLower.includes(comboColor) && skuLower.includes(comboSize);
            }
            if (comboSize) {
              return skuLower.endsWith(`-${comboSize}`) || skuLower === comboSize;
            }
            return false;
          });
        }

        if (matched) {
          matchedVariantIds.add(matched.id);
          usedComboIndices.add(cIdx);

          pass1Ops.push(async () => {
            // Only update variantSku if masterSku actually changed AND won't collide
            if (isMasterSkuChanged) {
              let updatedSku = matched.variantSku;
              if (updatedSku.startsWith(oldMasterSku)) {
                updatedSku = `${newMasterSku}${updatedSku.slice(oldMasterSku.length)}`;
              } else {
                updatedSku = autoVariantSku;
              }

              // Check if another variant already holds this updatedSku
              const isTaken = allVariants.some(
                (v) => v.id !== matched.id && v.variantSku.toLowerCase().trim() === updatedSku.toLowerCase().trim()
              );

              if (!isTaken && updatedSku !== matched.variantSku) {
                await tx.productVariant.update({
                  where: { id: matched.id },
                  data: { variantSku: updatedSku },
                });
                usedSkusSet.delete(matched.variantSku.toLowerCase().trim());
                usedSkusSet.add(updatedSku.toLowerCase().trim());
              }
            }

            const existingAttrs = matched.attributes || [];
            const attrOps = [];
            for (const ca of combo) {
              const existingPva = existingAttrs.find((a) => {
                if (ca.productAttributeId && a.productAttributeId === ca.productAttributeId) return true;
                const eaName = (a.productAttribute?.attributeName || "").toLowerCase().trim();
                const caName = (ca.attributeName || "").toLowerCase().trim();
                return eaName && caName && eaName === caName;
              });

              if (existingPva) {
                if (existingPva.attributeValue?.trim() !== ca.attributeValue?.trim()) {
                  attrOps.push(
                    tx.productVariantAttribute.update({
                      where: { id: existingPva.id },
                      data: { attributeValue: ca.attributeValue },
                    })
                  );
                }
              } else if (ca.productAttributeId) {
                attrOps.push(
                  tx.productVariantAttribute.create({
                    data: {
                      productVariantId: matched.id,
                      productAttributeId: ca.productAttributeId,
                      attributeValue: ca.attributeValue,
                    },
                  })
                );
              }
            }
            if (attrOps.length > 0) {
              await Promise.all(attrOps);
            }
          });
        }
      }

      if (pass1Ops.length > 0) {
        await Promise.all(pass1Ops.map((op) => op()));
      }

      // Pass 2: Reuse unmatched existing variants for remaining combos in parallel
      const remainingComboIndices = targetCombinations
        .map((_, idx) => idx)
        .filter((idx) => !usedComboIndices.has(idx));

      const unmatchedVariants = allVariants.filter((v) => !matchedVariantIds.has(v.id));

      const pass2Ops = [];
      for (let i = 0; i < Math.min(remainingComboIndices.length, unmatchedVariants.length); i++) {
        const cIdx = remainingComboIndices[i];
        const combo = targetCombinations[cIdx];
        const variant = unmatchedVariants[i];

        matchedVariantIds.add(variant.id);
        usedComboIndices.add(cIdx);

        const skuParts = combo
          .filter((va) => (va.attributeName || "").toLowerCase() !== "gender")
          .map((va) => va.attributeValue)
          .filter(Boolean);
        const autoVariantSku =
          skuParts.length > 0 && activeMasterSku
            ? `${activeMasterSku}-${skuParts.join("-")}`
            : activeMasterSku;

        // Determine safe, collision-free targetSku
        let targetSku = autoVariantSku;
        const isSkuTaken = allVariants.some(
          (v) => v.id !== variant.id && v.variantSku.toLowerCase().trim() === targetSku.toLowerCase().trim()
        );

        if (isSkuTaken) {
          let counter = 1;
          let candidate = `${targetSku}-${counter}`;
          while (
            allVariants.some(
              (v) => v.id !== variant.id && v.variantSku.toLowerCase().trim() === candidate.toLowerCase().trim()
            )
          ) {
            counter++;
            candidate = `${targetSku}-${counter}`;
          }
          targetSku = candidate;
        }

        pass2Ops.push(async () => {
          if (variant.variantSku !== targetSku) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: { variantSku: targetSku },
            });
            usedSkusSet.delete(variant.variantSku.toLowerCase().trim());
            usedSkusSet.add(targetSku.toLowerCase().trim());
          }

          const existingAttrs = variant.attributes || [];
          const attrOps = [];
          for (const ca of combo) {
            const existingPva = existingAttrs.find((a) => {
              if (ca.productAttributeId && a.productAttributeId === ca.productAttributeId) return true;
              const eaName = (a.productAttribute?.attributeName || "").toLowerCase().trim();
              const caName = (ca.attributeName || "").toLowerCase().trim();
              return eaName && caName && eaName === caName;
            });

            if (existingPva) {
              if (existingPva.attributeValue?.trim() !== ca.attributeValue?.trim()) {
                attrOps.push(
                  tx.productVariantAttribute.update({
                    where: { id: existingPva.id },
                    data: { attributeValue: ca.attributeValue },
                  })
                );
              }
            } else if (ca.productAttributeId) {
              attrOps.push(
                tx.productVariantAttribute.create({
                  data: {
                    productVariantId: variant.id,
                    productAttributeId: ca.productAttributeId,
                    attributeValue: ca.attributeValue,
                  },
                })
              );
            }
          }

          const deleteAttrIds = existingAttrs
            .filter((ea) => !combo.some((ca) => ca.productAttributeId === ea.productAttributeId))
            .map((ea) => ea.id);

          if (deleteAttrIds.length > 0) {
            attrOps.push(
              tx.productVariantAttribute.deleteMany({
                where: { id: { in: deleteAttrIds } },
              })
            );
          }

          if (attrOps.length > 0) {
            await Promise.all(attrOps);
          }
        });
      }

      if (pass2Ops.length > 0) {
        await Promise.all(pass2Ops.map((op) => op()));
      }

      // Pass 3: Create missing combination variants in parallel with collision-free SKUs
      const stillUnusedComboIndices = targetCombinations
        .map((_, idx) => idx)
        .filter((idx) => !usedComboIndices.has(idx));

      if (stillUnusedComboIndices.length > 0) {
        await Promise.all(
          stillUnusedComboIndices.map(async (cIdx) => {
            const combo = targetCombinations[cIdx];
            const skuParts = combo
              .filter((va) => (va.attributeName || "").toLowerCase() !== "gender")
              .map((va) => va.attributeValue)
              .filter(Boolean);
            const autoVariantSku =
              skuParts.length > 0 && activeMasterSku
                ? `${activeMasterSku}-${skuParts.join("-")}`
                : activeMasterSku;

            let targetSku = autoVariantSku;
            let counter = 1;
            while (usedSkusSet.has(targetSku.toLowerCase().trim())) {
              targetSku = `${autoVariantSku}-${counter}`;
              counter++;
            }
            usedSkusSet.add(targetSku.toLowerCase().trim());

            const newVar = await tx.productVariant.create({
              data: {
                productId: id,
                variantSku: targetSku,
                asin: activeProduct?.asin,
                rackAddress: activeProduct?.rackAddress,
                isActive: activeProduct?.isActive ?? true,
              },
            });

            await tx.productVariantAttribute.createMany({
              data: combo
                .filter((ca) => Boolean(ca.productAttributeId))
                .map((ca) => ({
                  productVariantId: newVar.id,
                  productAttributeId: ca.productAttributeId,
                  attributeValue: ca.attributeValue,
                })),
            });
          })
        );
      }

      // Pass 4: Clean up excess variants in batch
      const excessVariantIds = allVariants
        .filter((v) => !matchedVariantIds.has(v.id))
        .map((v) => v.id);

      if (excessVariantIds.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: excessVariantIds } },
        });
      }
    }

    // ======================================================
    // Return Updated Product
    // ======================================================

    return await tx.product.findUnique({
      where: {
        id,
      },
      include: {
        attributes: true,
        variants: {
          include: {
            attributes: {
              include: {
                productAttribute: true,
              },
            },
          },
        },
      },
    });
  },
  {
    maxWait: 10000,
    timeout: 60000,
  });
};

// ======================================================
// Delete Product
// ======================================================

export const deleteProduct = async (id, userId) => {
  return await prisma.product.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

// ======================================================
// Update Product Status
// ======================================================

export const updateProductStatus = async (id, isActive) => {
  return await prisma.product.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
  });
};

// ======================================================
// Get Product Stats
// ======================================================

export const getProductStats = async (userId) => {
  const totalProducts = await prisma.product.count({
    where: {
      userId,
    },
  });

  const activeProducts = await prisma.product.count({
    where: {
      userId,
      isActive: true,
    },
  });

  const inactiveProducts = await prisma.product.count({
    where: {
      userId,
      isActive: false,
    },
  });

  return {
    totalProducts,
    activeProducts,
    inactiveProducts,
  };
};

// ======================================================
// Find Product By ASIN
// ======================================================

export const findProductByAsin = async (asin, userId) => {
  if (!asin) return null;
  return await prisma.product.findFirst({
    where: {
      asin,
      userId,
    },
  });
};

// ======================================================
// Find Product By Name
// ======================================================

export const findProductByName = async (productName, userId) => {
  return await prisma.product.findFirst({
    where: {
      productName,
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

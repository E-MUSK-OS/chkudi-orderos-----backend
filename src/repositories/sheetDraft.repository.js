import prisma from "../config/prisma.js";

// ======================================================
// Get Draft
// ======================================================

export const getSheetDraftByUserId = async (userId, tx = prisma) => {
  return tx.sheetDraft.findFirst({
    where: {
      userId,
    },
  });
};

// ======================================================
// Create Draft
// ======================================================

export const createSheetDraft = async (data, tx = prisma) => {
  return tx.sheetDraft.create({
    data,
  });
};

// ======================================================
// Update Draft
// ======================================================

export const updateSheetDraft = async (id, data, tx = prisma) => {
  return tx.sheetDraft.update({
    where: {
      id,
    },
    data,
  });
};

// ======================================================
// Delete Draft
// ======================================================

export const deleteSheetDraft = async (id, tx = prisma) => {
  return tx.sheetDraft.delete({
    where: {
      id,
    },
  });
};

export const deleteExpiredSheetDrafts = async (date) => {
  return prisma.sheetDraft.deleteMany({
    where: {
      updatedAt: {
        lt: date,
      },
    },
  });
};

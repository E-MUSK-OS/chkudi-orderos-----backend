import prisma from "../config/prisma.js";

// =====================================
// Find Overlapping Tag Loop
// =====================================

export const findOverlappingTagLoop = async ({
  userId,
  prefix,
  startNumber,
  endNumber,
}) => {
  return prisma.tagLoop.findFirst({
    where: {
      userId,
      prefix,

      startNumber: {
        lte: endNumber,
      },

      endNumber: {
        gte: startNumber,
      },
    },
  });
};

// =====================================
// Create Tag Loop
// =====================================

export const createTagLoop = async ({
  tx,
  userId,
  prefix,
  startTag,
  endTag,
  startNumber,
  endNumber,
  total,
}) => {
  return tx.tagLoop.create({
    data: {
      userId,
      prefix,
      startTag,
      endTag,
      startNumber,
      endNumber,
      total,
    },
  });
};

// =====================================
// Create Many Tags
// =====================================

export const createManyTags = async ({ tx, tags }) => {
  return tx.tag.createMany({
    data: tags,
  });
};

// =====================================
// Get All Tag Loops
// =====================================

export const getTagLoops = async (userId) => {
  return prisma.tagLoop.findMany({
    where: {
      userId,
    },
    include: {
      tags: {
        select: {
          tagNumber: true,
          status: true,
        },
        orderBy: {
          tagNumber: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// =====================================
// Count Tags By Status
// =====================================

export const countTagsByStatus = async ({ loopId, status }) => {
  return prisma.tag.count({
    where: {
      loopId,
      status,
    },
  });
};

// =====================================
// Dashboard Stats
// =====================================

export const countTagLoops = async (userId) => {
  return prisma.tagLoop.count({
    where: {
      userId,
    },
  });
};

export const countTags = async (userId) => {
  return prisma.tag.count({
    where: {
      userId,
    },
  });
};

export const countAvailableTags = async (userId) => {
  return prisma.tag.count({
    where: {
      userId,
      status: "AVAILABLE",
    },
  });
};

export const countUsedTags = async (userId) => {
  return prisma.tag.count({
    where: {
      userId,
      status: "USED",
    },
  });
};

export { prisma };

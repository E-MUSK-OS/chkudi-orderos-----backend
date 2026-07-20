import { prisma } from "../repositories/tagLoop.repository.js";

import {
  findOverlappingTagLoop,
  createTagLoop,
  createManyTags,
  getTagLoops,
  countTagLoops,
  countTags,
  countAvailableTags,
  countUsedTags,
} from "../repositories/tagLoop.repository.js";

import {
  parseTag,
  generateEndTag,
  generateTags,
} from "../utils/tagLoop.util.js";

// =====================================
// Create Tag Loop
// =====================================

export const createTagLoopService = async ({ userId, startTag, total }) => {
  // -----------------------------
  // Parse Start Tag
  // -----------------------------

  const { prefix, number: startNumber } = parseTag(startTag);

  // -----------------------------
  // Generate End Tag
  // -----------------------------

  const { endNumber, endTag } = generateEndTag({
    prefix,
    startNumber,
    total,
  });

  // -----------------------------
  // Check Overlapping Range
  // -----------------------------

  const existingLoop = await findOverlappingTagLoop({
    userId,
    prefix,
    startNumber,
    endNumber,
  });

  if (existingLoop) {
    throw new Error("TAG range overlaps with an existing range.");
  }

  // -----------------------------
  // Transaction
  // -----------------------------

  return prisma.$transaction(async (tx) => {
    // Create Loop

    const loop = await createTagLoop({
      tx,
      userId,
      prefix,
      startTag,
      endTag,
      startNumber,
      endNumber,
      total,
    });

    // Generate Tags

    const tags = generateTags({
      prefix,
      startNumber,
      endNumber,
      loopId: loop.id,
      userId,
    });

    // Bulk Insert

    await createManyTags({
      tx,
      tags,
    });

    return loop;
  });
};

export const getTagLoopsService = async (userId) => {
  const loops = await getTagLoops(userId);

  return loops.map((loop) => {
    const available = loop.tags.filter(
      (tag) => tag.status === "AVAILABLE",
    ).length;

    const used = loop.tags.filter((tag) => tag.status === "USED").length;

    const nextAvailableTag = loop.tags.find(
      (tag) => tag.status === "AVAILABLE",
    );

    return {
      id: loop.id,
      prefix: loop.prefix,
      startTag: loop.startTag,
      endTag: loop.endTag,
      nextAvailableTag: nextAvailableTag?.tagNumber || null,
      total: loop.total,
      available,
      used,
      createdAt: loop.createdAt,
    };
  });
};

// =====================================
// Dashboard
// =====================================

export const getTagLoopDashboardService = async (userId) => {
  const [totalLoops, totalTags, availableTags, usedTags] = await Promise.all([
    countTagLoops(userId),
    countTags(userId),
    countAvailableTags(userId),
    countUsedTags(userId),
  ]);

  return {
    totalLoops,
    totalTags,
    availableTags,
    usedTags,
  };
};

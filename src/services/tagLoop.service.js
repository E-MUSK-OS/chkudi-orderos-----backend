import { prisma } from "../repositories/tagLoop.repository.js";
import { createNotificationService } from "./notification.service.js";

import {
  findOverlappingTagLoop,
  createTagLoop,
  createManyTags,
  getTagLoops,
  countTagLoops,
  countTags,
  countAvailableTags,
  countUsedTags,
  getTagLoopWithTags,
  updateTagLoopNotificationFlags,
  getTagLoopById,
  deleteTagLoop,
} from "../repositories/tagLoop.repository.js";

import {
  parseTag,
  generateEndTag,
  generateTags,
} from "../utils/tagLoop.util.js";
import ExcelJS from "exceljs";

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

const notificationConfig = {
  50: {
    flag: "notify50",
    title: "Only 50 Tags Remaining",
    priority: "MEDIUM",
  },
  30: {
    flag: "notify30",
    title: "Only 30 Tags Remaining",
    priority: "MEDIUM",
  },
  10: {
    flag: "notify10",
    title: "Only 10 Tags Remaining",
    priority: "HIGH",
  },
  0: {
    flag: "notify0",
    title: "Tag Loop Exhausted",
    priority: "CRITICAL",
  },
};

const checkTagLoopNotification = async ({ userId, loop, available }) => {
  const config = notificationConfig[available];

  if (!config) {
    return;
  }

  if (loop[config.flag]) {
    return;
  }

  await createNotificationService({
    userId,
    title: config.title,
    message:
      available === 0
        ? `${loop.startTag} has no tags remaining.`
        : `${loop.startTag} has only ${available} tags remaining.`,
    type: "TAG_LOOP",
    priority: config.priority,
    entityId: loop.id,
    entityType: "TAG_LOOP",
  });

  await updateTagLoopNotificationFlags({
    loopId: loop.id,
    data: {
      [config.flag]: true,
    },
  });
};

// export const getTagLoopsService = async (userId) => {
//   const loops = await getTagLoops(userId);

//   return loops.map((loop) => {
//     const available = loop.tags.filter(
//       (tag) => tag.status === "AVAILABLE",
//     ).length;

//     const used = loop.tags.filter((tag) => tag.status === "USED").length;

//     const nextAvailableTag = loop.tags.find(
//       (tag) => tag.status === "AVAILABLE",
//     );

//     return {
//       id: loop.id,
//       prefix: loop.prefix,
//       startTag: loop.startTag,
//       endTag: loop.endTag,
//       nextAvailableTag: nextAvailableTag?.tagNumber || null,
//       total: loop.total,
//       available,
//       used,
//       createdAt: loop.createdAt,
//     };
//   });
// };

export const getTagLoopsService = async (userId) => {
  const loops = await getTagLoops(userId);

  const result = [];

  for (const loop of loops) {
    const available = loop.tags.filter(
      (tag) => tag.status === "AVAILABLE",
    ).length;

    const used = loop.tags.filter((tag) => tag.status === "USED").length;

    const nextAvailableTag = loop.tags.find(
      (tag) => tag.status === "AVAILABLE",
    );

    // =====================================
    // Check Notification (Temporary)
    // =====================================

    await checkTagLoopNotification({
      userId,
      loop,
      available,
    });

    result.push({
      id: loop.id,
      prefix: loop.prefix,
      startTag: loop.startTag,
      endTag: loop.endTag,
      nextAvailableTag: nextAvailableTag?.tagNumber || null,
      total: loop.total,
      available,
      used,
      createdAt: loop.createdAt,
    });
  }

  return result;
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

export const exportTagLoopService = async ({ userId, loopId }) => {
  const loop = await getTagLoopWithTags({
    userId,
    loopId,
  });

  if (!loop) {
    throw new Error("Tag Loop not found.");
  }

  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("Tags");

  sheet.columns = [
    {
      header: "Tag Number",
      key: "tagNumber",
      width: 25,
    },
    {
      header: "Status",
      key: "status",
      width: 20,
    },
    {
      header: "orderItemId(SKU)",
      key: "orderItemId",
      width: 20,
    },
    {
      header: "Order ID",
      key: "orderId",
      width: 25,
    },
    {
      header: "Used At",
      key: "usedAt",
      width: 25,
    },
  ];

  const headerRow = sheet.getRow(1);

  headerRow.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "0A0E1A" },
  };

  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // 3. Freeze Header (Optional)
  sheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  // 4. Auto Filter (Optional)
  sheet.autoFilter = {
    from: "A1",
    to: "E1",
  };

  loop.tags.forEach((tag) => {
    sheet.addRow({
      tagNumber: tag.tagNumber,
      status: tag.status,
      orderItemId: tag.orderItemId ?? "-",
      orderId: tag.orderId ?? "-",
      usedAt: tag.usedAt ? new Date(tag.usedAt).toLocaleString("en-IN") : "-",
    });
  });

  return {
    workbook,
    fileName: `${loop.startTag}-${loop.endTag}.xlsx`,
  };
};

// =====================================
// Delete Tag Loop
// =====================================

export const deleteTagLoopService = async ({ userId, loopId }) => {
  const loop = await getTagLoopById({
    userId,
    loopId,
  });

  if (!loop) {
    throw new Error("Tag Loop not found.");
  }

  await prisma.$transaction(async (tx) => {
    await deleteTagLoop({
      tx,
      loopId,
    });
  });

  return;
};

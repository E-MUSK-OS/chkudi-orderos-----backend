import prisma from "../config/prisma.js";

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata (IST) timezone
 */
export const getIstDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(date);
};

/**
 * Get date range for matching literal IST createdAt in PostgreSQL
 */
export const getDateRangeForDay = (dateString) => {
  const parts = String(dateString).split("-").map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [year, month, day] = parts;
    const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return { gte: startUtc, lte: endUtc };
  }
  const parsed = new Date(dateString);
  return {
    gte: new Date(new Date(parsed).setHours(0, 0, 0, 0)),
    lte: new Date(new Date(parsed).setHours(23, 59, 59, 999)),
  };
};

/**
 * Sync / upsert daily summary for a specific user and date
 */
export const syncDailySummaryForUserAndDate = async (userId, dateString) => {
  if (!userId || !dateString) return null;

  const dateRange = getDateRangeForDay(dateString);

  const [pendingCount, scannedCount] = await Promise.all([
    prisma.amazonOrder.count({
      where: {
        userId,
        createdAt: dateRange,
        packingScanStatus: "PENDING",
      },
    }),
    prisma.amazonOrder.count({
      where: {
        userId,
        createdAt: dateRange,
        packingScanStatus: "SCANNED",
      },
    }),
  ]);

  const totalCount = pendingCount + scannedCount;

  // If there are orders in amazonOrder, upsert summary
  if (totalCount > 0) {
    return prisma.amazonDailyOrderSummary.upsert({
      where: {
        userId_date: {
          userId,
          date: dateString,
        },
      },
      update: {
        totalOrders: totalCount,
        scannedOrders: scannedCount,
        pendingOrders: pendingCount,
      },
      create: {
        userId,
        date: dateString,
        totalOrders: totalCount,
        scannedOrders: scannedCount,
        pendingOrders: pendingCount,
      },
    });
  }

  // If no raw orders exist (e.g. past orders pruned by 7-day retention), check existing summary
  return prisma.amazonDailyOrderSummary.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateString,
      },
    },
  });
};

/**
 * Get daily summary for a user and date.
 * If date is today, actively syncs live orders first.
 * If summary exists in DB (even if older than 7 days), returns it.
 */
export const getDailySummary = async (userId, dateString) => {
  const targetDate = dateString || getIstDateString();
  const todayStr = getIstDateString();

  // If querying today, ensure live counts are synced
  if (targetDate === todayStr) {
    await syncDailySummaryForUserAndDate(userId, targetDate);
  }

  let summary = await prisma.amazonDailyOrderSummary.findUnique({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
  });

  // If not found in table yet, try to compute and store from AmazonOrder
  if (!summary) {
    summary = await syncDailySummaryForUserAndDate(userId, targetDate);
  }

  if (summary) {
    return {
      date: summary.date,
      totalOrders: summary.totalOrders,
      scannedOrders: summary.scannedOrders,
      pendingOrders: summary.pendingOrders,
    };
  }

  return {
    date: targetDate,
    totalOrders: 0,
    scannedOrders: 0,
    pendingOrders: 0,
  };
};

/**
 * Get all-time summary (sum of all daily summaries)
 */
export const getAllTimeSummary = async (userId) => {
  const todayStr = getIstDateString();
  await syncDailySummaryForUserAndDate(userId, todayStr);

  const agg = await prisma.amazonDailyOrderSummary.aggregate({
    where: { userId },
    _sum: {
      totalOrders: true,
      scannedOrders: true,
      pendingOrders: true,
    },
  });

  return {
    date: null,
    totalOrders: agg._sum.totalOrders || 0,
    scannedOrders: agg._sum.scannedOrders || 0,
    pendingOrders: agg._sum.pendingOrders || 0,
  };
};

/**
 * Snapshot all active orders in DB into AmazonDailyOrderSummary.
 * Called before running 7-day retention cleanup cron and for one-time backfill.
 */
export const snapshotAllActiveOrdersToSummaries = async () => {
  const distinctUsers = await prisma.amazonOrder.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  let totalUpdated = 0;

  for (const { userId } of distinctUsers) {
    const orders = await prisma.amazonOrder.findMany({
      where: { userId },
      select: { createdAt: true, packingScanStatus: true },
    });

    const dateMap = new Map();
    for (const ord of orders) {
      const dateStr = ord.createdAt.toISOString().slice(0, 10);
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { total: 0, scanned: 0, pending: 0 });
      }
      const item = dateMap.get(dateStr);
      item.total += 1;
      if (ord.packingScanStatus === "SCANNED") {
        item.scanned += 1;
      } else {
        item.pending += 1;
      }
    }

    for (const [dateStr, counts] of dateMap.entries()) {
      await prisma.amazonDailyOrderSummary.upsert({
        where: {
          userId_date: {
            userId,
            date: dateStr,
          },
        },
        update: {
          totalOrders: counts.total,
          scannedOrders: counts.scanned,
          pendingOrders: counts.pending,
        },
        create: {
          userId,
          date: dateStr,
          totalOrders: counts.total,
          scannedOrders: counts.scanned,
          pendingOrders: counts.pending,
        },
      });
      totalUpdated++;
    }
  }

  return { totalUpdated };
};

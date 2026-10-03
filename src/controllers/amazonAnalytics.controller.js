import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAmazonAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { day, operator } = req.query;

    const where = { userId };
    if (day && day !== "all") {
      where.day = { equals: day, mode: "insensitive" };
    }
    if (operator && operator !== "all") {
      where.operatorName = { equals: operator, mode: "insensitive" };
    }

    const data = await prisma.amazonAnalytics.findMany({
      where,
      include: { history: true },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      results: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAmazonAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        status: "fail",
        message: "Please provide an array of data with sku and url",
      });
    }

    // We will use Prisma's upsert for each item to handle conflicts
    const upsertPromises = data.map((item) => {
      return prisma.amazonAnalytics.upsert({
        where: {
          userId_sku: {
            userId,
            sku: item.sku,
          },
        },
        update: {
          url: item.url,
          operatorName: item.operatorName !== undefined ? item.operatorName : undefined,
          day: item.day !== undefined ? item.day : undefined,
        },
        create: {
          userId,
          sku: item.sku,
          url: item.url,
          operatorName: item.operatorName || null,
          day: item.day || null,
        },
      });
    });

    await prisma.$transaction(upsertPromises);

    res.status(200).json({
      status: "success",
      message: `${data.length} records processed successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const setting = await prisma.amazonAnalyticsSetting.findUnique({
      where: { userId },
    });

    res.status(200).json({
      status: "success",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

export const upsertSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { time } = req.body;

    if (!time) {
      return res.status(400).json({
        status: "fail",
        message: "Time is required",
      });
    }

    const setting = await prisma.amazonAnalyticsSetting.upsert({
      where: { userId },
      update: { time },
      create: { userId, time },
    });

    res.status(200).json({
      status: "success",
      message: "Settings updated successfully",
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBulkAmazonAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No record IDs provided for deletion",
      });
    }

    const deleteResult = await prisma.amazonAnalytics.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    res.status(200).json({
      status: "success",
      message: `${deleteResult.count} record(s) deleted successfully`,
      count: deleteResult.count,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAmazonAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existing = await prisma.amazonAnalytics.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      return res.status(404).json({
        status: "fail",
        message: "Record not found or unauthorized",
      });
    }

    await prisma.amazonAnalytics.delete({
      where: {
        id,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Amazon Analytics record deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};


import prisma from "../config/prisma.js";

// =====================================
// Create Notification
// =====================================

export const createNotification = async ({
  userId,
  title,
  message,
  type,
  priority = "MEDIUM",
  entityId = null,
  entityType = null,
}) => {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
      priority,
      entityId,
      entityType,
    },
  });
};

// =====================================
// Get All Notifications
// =====================================

export const getNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: {
      userId,
      status: {
        not: "DISMISSED",
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

// =====================================
// Get Unread Count
// =====================================

export const getUnreadNotificationCount = async (userId) => {
  return prisma.notification.count({
    where: {
      userId,
      status: "UNREAD",
    },
  });
};

// =====================================
// Get Notification By Id
// =====================================

export const getNotificationById = async ({ notificationId, userId }) => {
  return prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });
};

// =====================================
// Mark Notification Read
// =====================================

export const markNotificationRead = async (id) => {
  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });
};

export const dismissNotification = async (id) => {
  return prisma.notification.update({
    where: {
      id,
    },
    data: {
      status: "DISMISSED",
      dismissedAt: new Date(),
    },
  });
};

// =====================================
// Mark All Read
// =====================================

export const markAllNotificationsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
};

// =====================================
// Find Existing Notification
// =====================================

export const findNotification = async ({ userId, type, entityId, title }) => {
  return prisma.notification.findFirst({
    where: {
      userId,
      type,
      entityId,
      title,
    },
  });
};

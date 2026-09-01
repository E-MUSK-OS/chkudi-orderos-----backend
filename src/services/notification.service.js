import {
  createNotification,
  getNotifications,
  getUnreadNotificationCount,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  findNotification,
  dismissNotification,
} from "../repositories/notification.repository.js";

import { getIO } from "../socket/socket.js";

// =====================================
// Create Notification
// =====================================

export const createNotificationService = async ({
  userId,
  title,
  message,
  type,
  priority,
  entityId,
  entityType,
}) => {
  const notification = await createNotification({
    userId,
    title,
    message,
    type,
    priority,
    entityId,
    entityType,
  });

  // =====================================
  // Send Real-Time Notification
  // =====================================

  try {
    const io = getIO();

    io.to(`user:${userId}`).emit(
      "notification:new",
      notification,
    );

    console.log(
      `🔔 Notification sent to user:${userId}`,
    );
  } catch (error) {
    console.error(
      "❌ Socket notification failed:",
      error,
    );
  }

  return notification;
};

// =====================================
// Get Notifications
// =====================================

export const getNotificationsService = async (userId) => {
  return getNotifications(userId);
};

// =====================================
// Get Unread Count
// =====================================

export const getUnreadNotificationCountService = async (userId) => {
  return getUnreadNotificationCount(userId);
};

// =====================================
// Mark Notification Read
// =====================================

export const markNotificationReadService = async ({
  notificationId,
  userId,
}) => {
  const notification = await getNotificationById({
    notificationId,
    userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.isRead) {
    return notification;
  }

  return markNotificationRead(notification.id);
};

// =====================================
// Mark All Read
// =====================================

export const markAllNotificationsReadService = async (userId) => {
  return markAllNotificationsRead(userId);
};

// =====================================
// Dismiss Notification
// =====================================

export const dismissNotificationService = async ({
  notificationId,
  userId,
}) => {
  const notification = await getNotificationById({
    notificationId,
    userId,
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  if (notification.status === "DISMISSED") {
    return notification;
  }

  return dismissNotification(notification.id);
};
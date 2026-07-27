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
  // const exists = await findNotification({
  //   userId,
  //   type,
  //   entityId,
  //   title,
  // });

  // if (exists) {
  //   return exists;
  // }

  return createNotification({
    userId,
    title,
    message,
    type,
    priority,
    entityId,
    entityType,
  });
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

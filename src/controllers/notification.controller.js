import {
  getNotificationsService,
  getUnreadNotificationCountService,
  markNotificationReadService,
  markAllNotificationsReadService,
  dismissNotificationService,
} from "../services/notification.service.js";

// ========================================
// Get Notifications
// ========================================

export const getNotifications = async (req, res) => {
  try {
    const notifications = await getNotificationsService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully.",
      data: notifications,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Get Unread Count
// ========================================

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const count = await getUnreadNotificationCountService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Unread count fetched successfully.",
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Mark Notification Read
// ========================================

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await markNotificationReadService({
      notificationId: req.params.id,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Mark All Notifications Read
// ========================================

export const markAllNotificationsRead = async (req, res) => {
  try {
    await markAllNotificationsReadService(req.user.id);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================
// Dismiss Notification
// ========================================

export const dismissNotification = async (req, res) => {
  try {
    const notification = await dismissNotificationService({
      notificationId: req.params.id,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Notification dismissed successfully.",
      data: notification,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

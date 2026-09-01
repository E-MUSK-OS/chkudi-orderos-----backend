import { Router } from "express";

import { verifyJWT } from "../middleware/auth.middleware.js";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "../controllers/notification.controller.js";

const router = Router();

// ========================================
// Notification
// ========================================

router.get("/", verifyJWT, getNotifications);

router.get("/unread-count", verifyJWT, getUnreadNotificationCount);

router.patch("/:id/read", verifyJWT, markNotificationRead);

router.patch("/:id/dismiss", verifyJWT, dismissNotification);

router.patch("/read-all", verifyJWT, markAllNotificationsRead);

export default router;

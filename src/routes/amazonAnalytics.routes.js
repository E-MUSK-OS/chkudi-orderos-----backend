import express from "express";
import * as amazonAnalyticsController from "../controllers/amazonAnalytics.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", amazonAnalyticsController.getAmazonAnalytics);
router.post("/upload", amazonAnalyticsController.uploadAmazonAnalytics);

router.get("/settings", amazonAnalyticsController.getSettings);
router.put("/settings", amazonAnalyticsController.upsertSettings);

router.delete("/bulk", amazonAnalyticsController.deleteBulkAmazonAnalytics);
router.post("/bulk-delete", amazonAnalyticsController.deleteBulkAmazonAnalytics);
router.delete("/:id", amazonAnalyticsController.deleteAmazonAnalytics);

export default router;

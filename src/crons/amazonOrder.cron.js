import cron from "node-cron";
import { deleteExpiredOrdersService } from "../services/amazonOrder.service.js";
import { deleteExpiredBatchesService } from "../services/amazonBatch.service.js";

/**
 * Cleanup Amazon orders and processed batches older than 7 days (or expired at 6:00 PM).
 * Runs every hour on the hour (including 18:00 / 6:00 PM).
 */
cron.schedule("0 * * * *", async () => {
  try {
    // 1. Cleanup individual printed scan orders older than 7 days
    const orderResult = await deleteExpiredOrdersService();
    if (orderResult && orderResult.count > 0) {
      console.log(`[AmazonOrder Cleanup] Deleted ${orderResult.count} expired Amazon order(s) older than 7 days.`);
    }

    // 2. Cleanup expired batches and disk files (expired at 6:00 PM on 7th day)
    const batchResult = await deleteExpiredBatchesService();
    if (batchResult && batchResult.count > 0) {
      console.log(`[AmazonBatch Cleanup] Deleted ${batchResult.count} expired Amazon batch(es) and files.`);
    }
  } catch (error) {
    console.error("[Amazon Cleanup Error]:", error);
  }
});

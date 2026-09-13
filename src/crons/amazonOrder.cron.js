import cron from "node-cron";
import { deleteExpiredOrdersService } from "../services/amazonOrder.service.js";

/**
 * Cleanup Amazon orders older than 7 days.
 * Runs every hour on the hour.
 */
cron.schedule("0 * * * *", async () => {
  try {
    const result = await deleteExpiredOrdersService();
    if (result && result.count > 0) {
      console.log(`[AmazonOrder Cleanup] Deleted ${result.count} expired Amazon order(s) older than 7 days.`);
    }
  } catch (error) {
    console.error("[AmazonOrder Cleanup Error]:", error);
  }
});

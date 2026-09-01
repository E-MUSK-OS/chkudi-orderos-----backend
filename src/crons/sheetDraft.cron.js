import cron from "node-cron";

import { deleteExpiredSheetDraftsService } from "../services/sheetDraft.service.js";

cron.schedule("0 * * * *", async () => {
  console.log("Running Sheet Draft Cleanup...");

  try {
    const result = await deleteExpiredSheetDraftsService();

    console.log(`Deleted ${result.count} expired draft(s).`);
  } catch (error) {
    console.error("Sheet Draft Cleanup Error:", error);
  }
});
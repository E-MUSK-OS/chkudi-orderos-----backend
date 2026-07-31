import cron from "node-cron";

import { deleteExpiredSheetDraftsService } from "../services/sheetDraft.service.js";

cron.schedule("* * * * *", async () => {
  console.log("Cron Running...");

  try {
    const result = await deleteExpiredSheetDraftsService();

    console.log(result);
  } catch (error) {
    console.log(error);
  }
});
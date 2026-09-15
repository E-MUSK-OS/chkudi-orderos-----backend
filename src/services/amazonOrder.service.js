import {
  savePrintedAmazonOrders,
  getAmazonOrders,
  updatePackingScanStatusByAwb,
  updatePackingScanStatusById,
  deleteExpiredAmazonOrders,
} from "../repositories/amazonOrder.repository.js";
import { updateBatchPrintedOrders } from "../repositories/amazonBatch.repository.js";

export const savePrintedOrdersService = async (userId, orders, batchId) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { count: 0, orders: [] };
  }
  const saved = await savePrintedAmazonOrders(userId, orders);

  if (batchId) {
    try {
      await updateBatchPrintedOrders(userId, batchId, orders);
    } catch (e) {
      console.warn("Failed to update batch printed orders in summary:", e);
    }
  }

  return { count: saved.length, orders: saved };
};

export const getAmazonOrdersService = async ({
  userId,
  search,
  packingScanStatus,
  date,
  page,
  limit,
}) => {
  return getAmazonOrders({
    userId,
    search,
    packingScanStatus,
    date,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
  });
};

export const updatePackingScanStatusService = async ({
  userId,
  id,
  awb,
  status = "SCANNED",
}) => {
  if (id) {
    return updatePackingScanStatusById(userId, id, status);
  }
  if (awb) {
    return updatePackingScanStatusByAwb(userId, awb, status);
  }
  throw new Error("Either id or awb is required to update packing scan status");
};

export const deleteExpiredOrdersService = async () => {
  return deleteExpiredAmazonOrders();
};

import {
  savePrintedAmazonOrders,
  getAmazonOrders,
  updatePackingScanStatusByAwb,
  updatePackingScanStatusById,
  deleteExpiredAmazonOrders,
} from "../repositories/amazonOrder.repository.js";
import { updateBatchPrintedOrders } from "../repositories/amazonBatch.repository.js";
import { getIO } from "../socket/socket.js";

export const savePrintedOrdersService = async (userId, orders, batchId) => {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { count: 0, orders: [] };
  }
  const saved = await savePrintedAmazonOrders(userId, orders, batchId);

  if (batchId) {
    try {
      await updateBatchPrintedOrders(userId, batchId);
    } catch (e) {
      console.warn("Failed to update batch printed orders in summary:", e);
    }
  }

  if (saved.length > 0) {
    try {
      const payload = {
        userId,
        batchId,
        count: saved.length,
        awbs: saved.map((o) => o.awb),
        orders: saved,
      };
      getIO()
        .to(`user:${userId}`)
        .emit("amazonOrderPrinted", payload);
      console.log(`📡 [Socket] Emitted amazonOrderPrinted to user:${userId} (${saved.length} orders)`);
    } catch (e) {
      console.warn("Failed to emit amazonOrderPrinted socket event:", e);
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
  batchId,
}) => {
  return getAmazonOrders({
    userId,
    search,
    packingScanStatus,
    date,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
    batchId,
  });
};

export const updatePackingScanStatusService = async ({
  userId,
  id,
  awb,
  status = "SCANNED",
}) => {
  let updated = null;
  if (id) {
    updated = await updatePackingScanStatusById(userId, id, status);
  } else if (awb) {
    updated = await updatePackingScanStatusByAwb(userId, awb, status);
  } else {
    throw new Error("Either id or awb is required to update packing scan status");
  }

  if (updated && !updated.alreadyScanned) {
    try {
      getIO()
        .to(`user:${userId}`)
        .emit("amazonOrderStatusUpdated", {
          userId,
          id: updated.id,
          awb: updated.awb,
          orderId: updated.orderId,
          packingScanStatus: updated.packingScanStatus,
          order: updated,
        });
      console.log(`📡 [Socket] Emitted amazonOrderStatusUpdated to user:${userId} (AWB: ${updated.awb}, status: ${updated.packingScanStatus})`);
    } catch (e) {
      console.warn("Failed to emit amazonOrderStatusUpdated socket event:", e);
    }
  }

  return updated;
};

export const deleteExpiredOrdersService = async () => {
  return deleteExpiredAmazonOrders();
};

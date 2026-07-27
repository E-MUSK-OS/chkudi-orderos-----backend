import { createNotificationService } from "./notification.service.js";

export const checkInventoryNotifications = async (inventory) => {
  const stock = inventory.availableStock;

  const productName = inventory.productVariant.product.productName;
  const variantSku = inventory.productVariant.variantSku;

  // ======================================================
  // Reset Notification Level
  // ======================================================

  let newLevel = inventory.lastNotificationLevel;

  if (stock > 25) {
    newLevel = null;
  } else if (stock > 10) {
    if (inventory.lastNotificationLevel === 0) {
      newLevel = 25;
    } else if (inventory.lastNotificationLevel === 10) {
      newLevel = 25;
    }
  } else if (stock > 0) {
    if (inventory.lastNotificationLevel === 0) {
      newLevel = 10;
    }
  }

  // ======================================================
  // Out Of Stock
  // ======================================================

  if (stock <= 0 && inventory.lastNotificationLevel !== 0) {
    await createNotificationService({
      userId: inventory.userId,
      title: "Out of Stock",
      message: `${productName} (${variantSku}) is out of stock.`,
      type: "INVENTORY",
      priority: "CRITICAL",
      entityId: inventory.id,
      entityType: "PRODUCT_INVENTORY",
    });

    return {
      lastNotificationLevel: 0,
    };
  }

  // ======================================================
  // Critical Low Stock
  // ======================================================

  if (stock > 0 && stock <= 10 && inventory.lastNotificationLevel !== 10) {
    await createNotificationService({
      userId: inventory.userId,
      title: "Critical Low Stock",
      message: `${productName} (${variantSku}) has only ${stock} items remaining.`,
      type: "INVENTORY",
      priority: "HIGH",
      entityId: inventory.id,
      entityType: "PRODUCT_INVENTORY",
    });

    return {
      lastNotificationLevel: 10,
    };
  }

  // ======================================================
  // Low Stock
  // ======================================================

  if (stock > 10 && stock <= 25 && inventory.lastNotificationLevel !== 25) {
    await createNotificationService({
      userId: inventory.userId,
      title: "Low Stock Alert",
      message: `${productName} (${variantSku}) stock is running low (${stock}).`,
      type: "INVENTORY",
      priority: "MEDIUM",
      entityId: inventory.id,
      entityType: "PRODUCT_INVENTORY",
    });

    return {
      lastNotificationLevel: 25,
    };
  }

  // ======================================================
  // Only Reset Level
  // ======================================================

  if (newLevel !== inventory.lastNotificationLevel) {
    return {
      lastNotificationLevel: newLevel,
    };
  }

  return null;
};
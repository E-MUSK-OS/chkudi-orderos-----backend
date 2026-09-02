import { Router } from "express";

import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import vmsRoutes from "./vms.routes.js";
import mediaImageRoutes from "./mediaImage.routes.js";
import operatorRoutes from "./operator.routes.js";
import operatorAuthRoutes from "./operatorAuth.routes.js";
import accountRoutes from "./account.routes.js";
import walletRoutes from "./wallet.routes.js";
import tagLoopRoutes from "./tagLoop.routes.js";
import notificationRoutes from "./notification.routes.js";
import warehouseRoutes from "./warehouse.routes.js";
import productRoutes from "./product.routes.js";
import productVariantRoutes from "./productVariant.routes.js";
import inventoryRoutes from "./inventory.routes.js";
import transferRoutes from "./transfer.routes.js";
import skuMappingRoutes from "./skuMapping.routes.js";
import sheetDraftRoutes from "./sheetDraft.route.js";
import marketplaceRoutes from "./marketplace.routes.js";
import marketplaceAccountRoutes from "./marketplaceAccount.routes.js";
import labelRoutes from "./label.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/vms", vmsRoutes);
router.use("/media", mediaImageRoutes);
router.use("/operators", operatorRoutes);
router.use("/operator-auth", operatorAuthRoutes);
router.use("/accounts", accountRoutes);
router.use("/wallet", walletRoutes);
router.use("/tag-loops", tagLoopRoutes);
router.use("/notifications", notificationRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/products", productRoutes);
router.use("/product-variants", productVariantRoutes);
router.use("/inventories", inventoryRoutes);
router.use("/stock-transfers", transferRoutes);
router.use("/sku-mappings", skuMappingRoutes);
router.use("/sheet-drafts", sheetDraftRoutes);
router.use("/marketplaces", marketplaceRoutes);
router.use("/marketplace-accounts", marketplaceAccountRoutes);
router.use("/labels", labelRoutes);

export default router;

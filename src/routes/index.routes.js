import { Router } from "express";

import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import vmsRoutes from "./vms.routes.js";
import operatorRoutes from "./operator.routes.js";
import operatorAuthRoutes from "./operatorAuth.routes.js";
import accountRoutes from "./account.routes.js";
import walletRoutes from "./wallet.routes.js";
import tagLoopRoutes from "./tagLoop.routes.js";
import notificationRoutes from "./notification.routes.js";
import warehouseRoutes from "./warehouse.routes.js";
import productRoutes from "./product.routes.js";
import productVariantRoutes from "./productVariant.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/vms", vmsRoutes);
router.use("/operators", operatorRoutes);
router.use("/operator-auth", operatorAuthRoutes);
router.use("/accounts", accountRoutes);
router.use("/wallet", walletRoutes);
router.use("/tag-loops", tagLoopRoutes);
router.use("/notifications", notificationRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/products", productRoutes);
router.use("/product-variants", productVariantRoutes);

export default router;

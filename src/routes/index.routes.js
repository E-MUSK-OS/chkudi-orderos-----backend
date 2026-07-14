import { Router } from "express";

import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import vmsRoutes from "./vms.routes.js";
import operatorRoutes from "./operator.routes.js";
import operatorAuthRoutes from "./operatorAuth.routes.js";
import accountRoutes from "./account.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/vms", vmsRoutes);
router.use("/operators", operatorRoutes);
router.use("/operator-auth", operatorAuthRoutes);
router.use("/accounts", accountRoutes);

export default router;

import { Router } from "express";

import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import vmsRoutes from "./vms.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/vms", vmsRoutes)
export default router;

import { Router } from "express";

import {
  operatorLogin,
  getOperatorProfile,
  operatorLogout,
  heartbeat,
} from "../controllers/operatorAuth.controller.js";
import { verifyOperatorJWT } from "../middleware/operatorAuth.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/login", verifyJWT, operatorLogin);
router.get("/me", verifyOperatorJWT, getOperatorProfile);
router.post("/logout", verifyOperatorJWT, operatorLogout);
router.post("/heartbeat", verifyOperatorJWT, heartbeat);

export default router;

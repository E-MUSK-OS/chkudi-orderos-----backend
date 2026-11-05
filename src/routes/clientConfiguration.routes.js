import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getClientConfig,
  getClientConfiguration,
  updateClientConfig,
  updateClientConfiguration,
} from "../controllers/clientConfiguration.controller.js";

// Optional JWT middleware: authenticates user if token provided, but doesn't block unauthenticated requests
const optionalJWT = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return verifyJWT(req, res, next);
  }
  return next();
};

const router = Router();

router.get("/", optionalJWT, getClientConfig);
router.put("/", optionalJWT, updateClientConfig);
router.post("/", optionalJWT, updateClientConfig);
router.patch("/", optionalJWT, updateClientConfig);

export default router;

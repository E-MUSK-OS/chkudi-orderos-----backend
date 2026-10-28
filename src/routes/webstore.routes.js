import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getWebstores,
  getNextWebstoreCode,
  getWebstoreById,
  createWebstore,
  updateWebstore,
  toggleWebstoreStatus,
  deleteWebstore,
  testSpapiConnection,
} from "../controllers/webstore.controller.js";

const router = Router();

router.get("/", verifyJWT, getWebstores);
router.get("/next-code", verifyJWT, getNextWebstoreCode);
router.post("/test-spapi", verifyJWT, testSpapiConnection);
router.get("/:id", verifyJWT, getWebstoreById);
router.post("/", verifyJWT, createWebstore);
router.put("/:id", verifyJWT, updateWebstore);
router.patch("/:id/status", verifyJWT, toggleWebstoreStatus);
router.delete("/:id", verifyJWT, deleteWebstore);

export default router;


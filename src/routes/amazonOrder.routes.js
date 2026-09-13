import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  savePrintedOrdersController,
  getAmazonOrdersController,
  updatePackingScanStatusByAwbController,
  updatePackingScanStatusByIdController,
} from "../controllers/amazonOrder.controller.js";

const router = Router();

router.use(verifyJWT);

// Save printed orders
router.post("/save-printed", savePrintedOrdersController);

// List orders with search, filter, pagination
router.get("/", getAmazonOrdersController);

// Update packing scan status by AWB / Tracking ID
router.patch("/scan/:awb", updatePackingScanStatusByAwbController);

// Update packing scan status by ID
router.patch("/:id/status", updatePackingScanStatusByIdController);

export default router;

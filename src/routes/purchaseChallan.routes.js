import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createPurchaseChallan,
  getAllPurchaseChallans,
  getPurchaseChallanById,
  updatePurchaseChallan,
  deletePurchaseChallan,
  getNextPurchaseChallanNo,
  searchProductSkus,
  downloadChallansExcel,
  downloadSkuWiseExcel,
  downloadBlankFormatExcel,
} from "../controllers/purchaseChallan.controller.js";

const router = express.Router();

router.get("/next-no", verifyJWT, getNextPurchaseChallanNo);
router.get("/search-skus", verifyJWT, searchProductSkus);
router.get("/export/challans", verifyJWT, downloadChallansExcel);
router.get("/export/sku-wise", verifyJWT, downloadSkuWiseExcel);
router.get("/export/blank-format", verifyJWT, downloadBlankFormatExcel);

router.post("/", verifyJWT, createPurchaseChallan);
router.get("/", verifyJWT, getAllPurchaseChallans);
router.get("/:id", verifyJWT, getPurchaseChallanById);
router.put("/:id", verifyJWT, updatePurchaseChallan);
router.delete("/:id", verifyJWT, deletePurchaseChallan);

export default router;

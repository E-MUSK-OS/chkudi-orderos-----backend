import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createSalesChallan,
  getAllSalesChallans,
  getSalesChallanById,
  updateSalesChallan,
  deleteSalesChallan,
  getNextChallanNo,
  searchProductSkus,
  downloadChallansExcel,
  downloadSkuWiseExcel,
  downloadBlankFormatExcel,
} from "../controllers/salesChallan.controller.js";

const router = express.Router();

router.get("/next-no", verifyJWT, getNextChallanNo);
router.get("/search-skus", verifyJWT, searchProductSkus);
router.get("/export/challans", verifyJWT, downloadChallansExcel);
router.get("/export/sku-wise", verifyJWT, downloadSkuWiseExcel);
router.get("/export/blank-format", verifyJWT, downloadBlankFormatExcel);

router.post("/", verifyJWT, createSalesChallan);
router.get("/", verifyJWT, getAllSalesChallans);
router.get("/:id", verifyJWT, getSalesChallanById);
router.put("/:id", verifyJWT, updateSalesChallan);
router.delete("/:id", verifyJWT, deleteSalesChallan);

export default router;

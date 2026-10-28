import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getNextPurchaseInvoiceNo,
  createPurchaseInvoice,
  getAllPurchaseInvoices,
  getPurchaseInvoiceById,
  getPurchaseInvoiceByChallanId,
  updatePurchaseInvoice,
  deletePurchaseInvoice,
  exportPurchaseInvoiceDetail,
  exportPurchaseInvoiceSkuWise,
  exportPurchaseInvoiceTally,
} from "../controllers/purchaseInvoice.controller.js";

const router = Router();

router.use(verifyJWT);

router.get("/next-no", getNextPurchaseInvoiceNo);
router.get("/export/detail", exportPurchaseInvoiceDetail);
router.get("/export/sku-wise", exportPurchaseInvoiceSkuWise);
router.get("/export/tally", exportPurchaseInvoiceTally);
router.get("/by-challan/:challanId", getPurchaseInvoiceByChallanId);

router.route("/")
  .get(getAllPurchaseInvoices)
  .post(createPurchaseInvoice);

router.route("/:id")
  .get(getPurchaseInvoiceById)
  .put(updatePurchaseInvoice)
  .delete(deletePurchaseInvoice);

export default router;

import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getNextInvoiceNo,
  createSalesInvoice,
  getAllSalesInvoices,
  getSalesInvoiceById,
  getSalesInvoiceByChallanId,
  updateSalesInvoice,
  deleteSalesInvoice,
  exportInvoiceDetail,
  exportInvoiceSkuWise,
  exportInvoiceTally,
} from "../controllers/salesInvoice.controller.js";

const router = Router();

router.use(verifyJWT);

router.get("/next-no", getNextInvoiceNo);
router.get("/export/detail", exportInvoiceDetail);
router.get("/export/sku-wise", exportInvoiceSkuWise);
router.get("/export/tally", exportInvoiceTally);
router.get("/by-challan/:challanId", getSalesInvoiceByChallanId);

router.route("/")
  .get(getAllSalesInvoices)
  .post(createSalesInvoice);

router.route("/:id")
  .get(getSalesInvoiceById)
  .put(updateSalesInvoice)
  .delete(deleteSalesInvoice);

export default router;

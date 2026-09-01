import { Router } from "express";
import { createTemplate, getTemplates, getTemplateById, updateTemplate, deleteTemplate, lookupProduct } from "../controllers/label.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// Apply auth middleware to all label routes
router.use(verifyJWT);

router.post("/templates", createTemplate);
router.get("/templates", getTemplates);
router.get("/templates/:id", getTemplateById);
router.put("/templates/:id", updateTemplate);
router.delete("/templates/:id", deleteTemplate);
router.get("/product-lookup", lookupProduct);

export default router;

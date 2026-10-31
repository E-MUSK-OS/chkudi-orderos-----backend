import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getCompanies,
  getCompanyById,
  createCompanyDraft,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
} from "../controllers/company.controller.js";

const router = Router();

router.get("/", verifyJWT, getCompanies);
router.post("/draft", verifyJWT, createCompanyDraft);
router.post("/", verifyJWT, createCompany);
router.get("/:id", verifyJWT, getCompanyById);
router.put("/:id", verifyJWT, updateCompany);
router.patch("/:id/status", verifyJWT, toggleCompanyStatus);
router.delete("/:id", verifyJWT, deleteCompany);

export default router;

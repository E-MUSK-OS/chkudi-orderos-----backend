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
  createCompanyBranch,
  getBranches,
  getCompanyBranches,
  deleteCompanyBranch,
  updateCompanyBranchStatus,
} from "../controllers/company.controller.js";

const router = Router();

router.get("/", verifyJWT, getCompanies);
router.get("/branches", verifyJWT, getBranches);
router.post("/branches", verifyJWT, createCompanyBranch);
router.patch("/branches/:id/status", verifyJWT, updateCompanyBranchStatus);
router.patch("/branches/:id", verifyJWT, updateCompanyBranchStatus);
router.delete("/branches/:id", verifyJWT, deleteCompanyBranch);

router.post("/draft", verifyJWT, createCompanyDraft);
router.post("/", verifyJWT, createCompany);

router.get("/:id", verifyJWT, getCompanyById);
router.get("/:id/branches", verifyJWT, getCompanyBranches);
router.post("/:id/branches", verifyJWT, createCompanyBranch);
router.patch("/:id/branches/:branchId/status", verifyJWT, updateCompanyBranchStatus);
router.patch("/:id/branches/:branchId", verifyJWT, updateCompanyBranchStatus);
router.delete("/:id/branches/:branchId", verifyJWT, deleteCompanyBranch);

router.put("/:id", verifyJWT, updateCompany);
router.patch("/:id/status", verifyJWT, toggleCompanyStatus);
router.delete("/:id", verifyJWT, deleteCompany);

export default router;

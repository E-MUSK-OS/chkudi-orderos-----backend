import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getSalariedEmployees,
  getSalariedEmployeeById,
  updateSalaryDetails,
  createAbsentRecord,
  updateAbsentRecord,
  deleteAbsentRecord,
  uploadAttendance,
} from "../controllers/salariedEmployee.controller.js";

const router = express.Router();

router.use(verifyJWT);

router.get("/", getSalariedEmployees);
router.post("/upload-attendance", uploadAttendance);
router.get("/:id", getSalariedEmployeeById);
router.put("/:id/salary-details", updateSalaryDetails);
router.post("/:id/absent-records", createAbsentRecord);
router.put("/:id/absent-records/:recordId", updateAbsentRecord);
router.delete("/:id/absent-records/:recordId", deleteAbsentRecord);

export default router;


import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

const router = express.Router();

router.post("/", verifyJWT, createEmployee);
router.get("/", verifyJWT, getEmployees);
router.get("/:id", verifyJWT, getEmployeeById);
router.put("/:id", verifyJWT, updateEmployee);
router.delete("/:id", verifyJWT, deleteEmployee);

export default router;


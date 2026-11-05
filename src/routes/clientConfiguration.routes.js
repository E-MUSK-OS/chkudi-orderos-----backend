import { Router } from "express";
import {
  getClientConfiguration,
  updateClientConfiguration,
} from "../controllers/clientConfiguration.controller.js";

const router = Router();

router.get("/", getClientConfiguration);
router.put("/", updateClientConfiguration);
router.post("/", updateClientConfiguration);

export default router;


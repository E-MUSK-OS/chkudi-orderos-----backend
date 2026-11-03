import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getFieldGroups,
  getFieldOptions,
  createOption,
  updateOption,
  toggleOptionActive,
  deleteOption,
  seedAllSettingMasterDefaults,
} from "../controllers/settingMasters.controller.js";

const router = Router();

router.get("/groups", verifyJWT, getFieldGroups);
router.post("/seed-defaults", verifyJWT, seedAllSettingMasterDefaults);
router.get("/", verifyJWT, getFieldOptions);
router.post("/", verifyJWT, createOption);
router.put("/:id", verifyJWT, updateOption);
router.patch("/:id/toggle", verifyJWT, toggleOptionActive);
router.delete("/:id", verifyJWT, deleteOption);

export default router;


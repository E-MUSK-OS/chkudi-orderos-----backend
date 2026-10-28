import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  createParty,
  getAllParties,
  getPartyById,
  updateParty,
  deleteParty,
} from "../controllers/party.controller.js";

const router = express.Router();

router.post("/", verifyJWT, createParty);
router.get("/", verifyJWT, getAllParties);
router.get("/:id", verifyJWT, getPartyById);
router.put("/:id", verifyJWT, updateParty);
router.delete("/:id", verifyJWT, deleteParty);

export default router;

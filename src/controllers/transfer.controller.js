import { createTransferService } from "../services/transfer.service.js";

export const createTransfer = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await createTransferService(userId, req.body);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
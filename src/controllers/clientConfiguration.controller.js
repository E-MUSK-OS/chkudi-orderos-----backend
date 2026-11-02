import {
  getClientConfigService,
  updateClientConfigService,
} from "../services/clientConfiguration.service.js";

export const getClientConfig = async (req, res) => {
  try {
    const config = await getClientConfigService(req.user);
    return res.status(200).json({
      success: true,
      message: "Client configuration fetched successfully.",
      data: config,
    });
  } catch (error) {
    return res.status(error.message.includes("Access denied") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to fetch client configuration",
    });
  }
};

export const updateClientConfig = async (req, res) => {
  try {
    const updated = await updateClientConfigService(req.user, req.body);
    return res.status(200).json({
      success: true,
      message: "Client configuration updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(error.message.includes("Access denied") ? 403 : 400).json({
      success: false,
      message: error.message || "Failed to update client configuration",
    });
  }
};


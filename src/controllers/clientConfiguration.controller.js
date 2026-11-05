import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  getClientConfigService,
  updateClientConfigService,
} from "../services/clientConfiguration.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE_PATH = path.join(__dirname, "../config/client-configuration.json");

const DEFAULT_CONFIGURATION = {
  clientName: "Enterprise Plus",
  subscriptionPlan: "Enterprise Plus",
  hasSeparateInventoryDept: false,
  dropdownManagementMode: "SETTING_MASTERS",
  enabledSections: [
    "dashboard",
    "vms",
    "products",
    "order-process",
    "products-analytics",
    "transaction",
    "offline-sales",
    "purchase",
    "settings",
    "account",
  ],
  enabledRoutes: [],
  configurationData: { dropdownManagementMode: "SETTING_MASTERS" },
  isDefault: true,
};

function readConfigFile() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf8");
      if (raw) {
        return JSON.parse(raw);
      }
    }
  } catch (err) {
    console.error("Error reading client-configuration.json:", err);
  }
  return DEFAULT_CONFIGURATION;
}

function writeConfigFile(data) {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing client-configuration.json:", err);
  }
}

export const getClientConfig = async (req, res) => {
  try {
    if (req.user) {
      const config = await getClientConfigService(req.user);
      return res.status(200).json({
        success: true,
        message: "Client configuration fetched successfully.",
        data: config,
      });
    }

    const config = readConfigFile();
    return res.status(200).json({
      success: true,
      message: "Client configuration fetched successfully",
      data: config,
    });
  } catch (error) {
    console.error("getClientConfig error, falling back to local configuration:", error.message);
    const fallback = readConfigFile();
    return res.status(200).json({
      success: true,
      message: "Client configuration fetched successfully",
      data: fallback,
    });
  }
};

export const getClientConfiguration = getClientConfig;

export const updateClientConfig = async (req, res) => {
  try {
    let updated;
    if (req.user) {
      try {
        updated = await updateClientConfigService(req.user, req.body);
      } catch (serviceErr) {
        console.warn("DB updateClientConfigService failed, updating local configuration:", serviceErr.message);
      }
    }

    if (!updated) {
      const current = readConfigFile();
      updated = {
        ...current,
        ...req.body,
        isDefault: false,
        updatedAt: new Date().toISOString(),
      };
    }

    writeConfigFile(updated);

    return res.status(200).json({
      success: true,
      message: "Client configuration updated successfully.",
      data: updated,
    });
  } catch (error) {
    return res.status(error.message?.includes("Access denied") ? 403 : 500).json({
      success: false,
      message: error.message || "Failed to update client configuration",
    });
  }
};

export const updateClientConfiguration = updateClientConfig;

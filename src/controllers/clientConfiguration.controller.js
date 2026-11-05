import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE_PATH = path.join(__dirname, "../config/client-configuration.json");

const DEFAULT_CONFIGURATION = {
  clientName: "Enterprise Plus",
  subscriptionPlan: "Enterprise Plus",
  hasSeparateInventoryDept: false,
  dropdownManagementMode: "FORM_OTHER",
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
  configurationData: null,
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

export const getClientConfiguration = async (req, res) => {
  try {
    const config = readConfigFile();
    return res.status(200).json({
      success: true,
      message: "Client configuration fetched successfully",
      data: config,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch client configuration",
      data: DEFAULT_CONFIGURATION,
    });
  }
};

export const updateClientConfiguration = async (req, res) => {
  try {
    const current = readConfigFile();
    const updated = {
      ...current,
      ...req.body,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    writeConfigFile(updated);

    return res.status(200).json({
      success: true,
      message: "Client configuration updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update client configuration",
    });
  }
};


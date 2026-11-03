import {
  findClientConfigByWorkspaceId,
  upsertClientConfigByWorkspaceId,
} from "../repositories/clientConfiguration.repository.js";

// Default standard sections that are enabled out of the box (only currently available sections)
export const DEFAULT_ENABLED_SECTIONS = [
  "dashboard",
  "vms",
  "products",
  "order-process",
  "products-analytics",
  "transaction",
  "offline-sales",
  "purchase",
  "settings",
];

export const getClientConfigService = async (requestingUser) => {
  if (!requestingUser) {
    throw new Error("Authentication required");
  }

  const workspaceSuperAdminId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.actualId ||
    requestingUser.id;

  let config = await findClientConfigByWorkspaceId(workspaceSuperAdminId);

  // If no custom configuration exists yet, return default full configuration
  if (!config) {
    return {
      id: null,
      workspaceSuperAdminId,
      clientName: "Enterprise Plus",
      subscriptionPlan: "Enterprise Plus",
      hasSeparateInventoryDept: false,
      dropdownManagementMode: "SETTING_MASTERS",
      enabledSections: DEFAULT_ENABLED_SECTIONS,
      enabledRoutes: [], // empty means all permitted unless explicitly filtered
      configurationData: { dropdownManagementMode: "SETTING_MASTERS" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    };
  }

  const dropdownManagementMode =
    config.configurationData?.dropdownManagementMode || "FORM_OTHER";

  return {
    ...config,
    dropdownManagementMode,
    isDefault: false,
  };
};

export const getWorkspaceDropdownManagementMode = async (userId) => {
  if (!userId) return "FORM_OTHER";
  try {
    const config = await findClientConfigByWorkspaceId(userId);
    if (config?.configurationData && typeof config.configurationData === "object") {
      const mode = config.configurationData.dropdownManagementMode;
      if (mode === "FORM_OTHER" || mode === "SETTING_MASTERS") {
        return mode;
      }
    }
  } catch (err) {
    console.error("Error querying getWorkspaceDropdownManagementMode:", err);
  }
  return "FORM_OTHER";
};

export const updateClientConfigService = async (requestingUser, updateData) => {
  if (!requestingUser) {
    throw new Error("Authentication required");
  }

  if (!["SUPERADMIN", "ADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Only SuperAdmin and Admin can modify Client Configuration.");
  }

  const workspaceSuperAdminId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.actualId ||
    requestingUser.id;

  const actorId = requestingUser.actualId || requestingUser.id;

  const rawConfigData =
    updateData.configurationData && typeof updateData.configurationData === "object"
      ? updateData.configurationData
      : {};

  const effectiveDropdownMode =
    updateData.dropdownManagementMode ||
    rawConfigData.dropdownManagementMode ||
    "SETTING_MASTERS";

  const payload = {
    clientName: updateData.clientName || "Enterprise Plus",
    subscriptionPlan: updateData.subscriptionPlan || "Enterprise Plus",
    hasSeparateInventoryDept: Boolean(updateData.hasSeparateInventoryDept),
    enabledSections: Array.isArray(updateData.enabledSections)
      ? updateData.enabledSections
      : DEFAULT_ENABLED_SECTIONS,
    enabledRoutes: Array.isArray(updateData.enabledRoutes)
      ? updateData.enabledRoutes
      : [],
    configurationData: {
      ...rawConfigData,
      dropdownManagementMode: effectiveDropdownMode,
    },
  };

  const saved = await upsertClientConfigByWorkspaceId(
    workspaceSuperAdminId,
    payload,
    actorId
  );

  return {
    ...saved,
    dropdownManagementMode: effectiveDropdownMode,
  };
};


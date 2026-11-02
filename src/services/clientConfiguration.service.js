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
      enabledSections: DEFAULT_ENABLED_SECTIONS,
      enabledRoutes: [], // empty means all permitted unless explicitly filtered
      configurationData: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true,
    };
  }

  return {
    ...config,
    isDefault: false,
  };
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
    configurationData: updateData.configurationData || null,
  };

  return await upsertClientConfigByWorkspaceId(
    workspaceSuperAdminId,
    payload,
    actorId
  );
};


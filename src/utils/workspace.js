/**
 * Resolves the managing Super Admin ID (Workspace ID) for a user.
 * - SUPERADMIN: returns their own ID.
 * - ADMIN / USER: returns their managing Super Admin's ID so all
 *   resource queries automatically access the Super Admin's data.
 */
export const resolveWorkspaceSuperAdminId = (user) => {
  if (!user) return null;

  if (user.role === "SUPERADMIN") {
    return user.id;
  }

  // 1. Direct superAdminId in userMapping
  if (user.userMapping?.superAdminId) {
    return user.userMapping.superAdminId;
  }

  // 2. Direct superAdmin relation in userMapping
  if (user.userMapping?.superAdmin?.id) {
    return user.userMapping.superAdmin.id;
  }

  // 3. If userMapping.admin is a SUPERADMIN (legacy mapping or direct creation)
  if (user.userMapping?.admin?.role === "SUPERADMIN") {
    return user.userMapping.admin.id;
  }

  // 4. If admin has a superAdminId in their mapping
  if (user.userMapping?.admin?.userMapping?.superAdminId) {
    return user.userMapping.admin.userMapping.superAdminId;
  }

  // 5. Fallback to creator if creator was set and not self
  if (user.createdById && user.createdById !== user.id) {
    return user.createdById;
  }

  // Fallback to user's own ID if unmapped
  return user.id;
};


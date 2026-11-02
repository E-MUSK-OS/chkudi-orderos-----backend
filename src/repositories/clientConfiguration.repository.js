import prisma from "../config/prisma.js";

/**
 * Finds the ClientConfiguration for a given workspace SuperAdmin.
 */
export const findClientConfigByWorkspaceId = async (workspaceSuperAdminId) => {
  return await prisma.clientConfiguration.findUnique({
    where: { workspaceSuperAdminId },
  });
};

/**
 * Upserts the ClientConfiguration for a given workspace SuperAdmin.
 */
export const upsertClientConfigByWorkspaceId = async (
  workspaceSuperAdminId,
  data,
  userId
) => {
  return await prisma.clientConfiguration.upsert({
    where: { workspaceSuperAdminId },
    update: {
      ...data,
      updatedById: userId,
    },
    create: {
      ...data,
      workspaceSuperAdminId,
      createdById: userId,
      updatedById: userId,
    },
  });
};


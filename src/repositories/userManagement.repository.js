import prisma from "../config/prisma.js";

const USER_SELECT_FIELDS = {
  id: true,
  firstName: true,
  middleName: true,
  lastName: true,
  fullName: true,
  username: true,
  email: true,
  phone: true,
  dob: true,
  gender: true,
  departments: true,
  companies: true,
  avatar: true,
  role: true,
  allowedPages: true,
  rights: true,
  createdById: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
  userMapping: {
    select: {
      superAdminId: true,
      adminId: true,
      allowedPages: true,
      departments: true,
      companies: true,
      superAdmin: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      admin: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
  },
  adminMappings: {
    select: {
      userId: true,
      allowedPages: true,
      departments: true,
      companies: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  },
  superAdminMappings: {
    select: {
      userId: true,
      adminId: true,
      allowedPages: true,
      departments: true,
      companies: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
      },
    },
  },
};

export const findManagedUsers = async ({
  requestingUser,
  search = "",
  sort = "oldest",
  page = 1,
  limit = 16,
}) => {
  const where = {};

  // Scoped access:
  // - SUPERADMIN: sees themselves and only the Admins and Users created under their account/hierarchy (must have mapping)
  // - ADMIN: sees the Super Admin, other Admins, themselves, and Users under their managing Super Admin / workspace
  const actorId = requestingUser.actualId || requestingUser.id;
  let workspaceSuperAdminId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.userMapping?.superAdminId;

  if (!workspaceSuperAdminId && requestingUser.role === "ADMIN") {
    const adminRecord = await prisma.user.findUnique({
      where: { id: actorId },
      select: {
        createdById: true,
        userMapping: {
          select: {
            superAdminId: true,
            adminId: true,
            admin: { select: { id: true, role: true } },
          },
        },
      },
    });
    if (adminRecord) {
      workspaceSuperAdminId =
        adminRecord.userMapping?.superAdminId ||
        (adminRecord.userMapping?.admin?.role === "SUPERADMIN" ? adminRecord.userMapping.admin.id : null) ||
        adminRecord.userMapping?.adminId ||
        adminRecord.createdById;
    }
    if (!workspaceSuperAdminId) {
      const sa = await prisma.user.findFirst({
        where: { role: "SUPERADMIN" },
        select: { id: true },
      });
      workspaceSuperAdminId = sa?.id;
    }
  }

  if (requestingUser.role === "SUPERADMIN") {
    where.OR = [
      { id: actorId },
      { userMapping: { superAdminId: actorId } },
      { userMapping: { adminId: actorId } },
      { userMapping: { admin: { createdById: actorId } } },
      { userMapping: { admin: { userMapping: { superAdminId: actorId } } } },
      { AND: [{ createdById: actorId }, { userMapping: { isNot: null } }] },
    ];
  } else if (requestingUser.role === "ADMIN") {
    const targetSaId = workspaceSuperAdminId || actorId;
    where.OR = [
      { id: actorId },
      { id: targetSaId },
      { userMapping: { superAdminId: targetSaId } },
      { userMapping: { adminId: targetSaId } },
      { userMapping: { adminId: actorId } },
      { userMapping: { admin: { createdById: targetSaId } } },
      { userMapping: { admin: { userMapping: { superAdminId: targetSaId } } } },
      { AND: [{ createdById: targetSaId }, { userMapping: { isNot: null } }] },
      { AND: [{ createdById: actorId }, { userMapping: { isNot: null } }] },
    ];
  }

  // Global search filtering
  if (search && search.trim()) {
    const q = search.trim();
    const searchConditions = [
      { fullName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { username: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { departments: { has: q } },
    ];

    if (where.OR) {
      where.AND = [
        { OR: where.OR },
        { OR: searchConditions },
      ];
      delete where.OR;
    } else {
      where.OR = searchConditions;
    }
  }

  // Sorting (defaults to oldest first)
  let orderBy = { createdAt: "asc" };
  if (sort === "name_asc") {
    orderBy = { fullName: "asc" };
  } else if (sort === "name_desc") {
    orderBy = { fullName: "desc" };
  } else if (sort === "newest") {
    orderBy = { createdAt: "desc" };
  } else if (sort === "oldest") {
    orderBy = { createdAt: "asc" };
  } else if (sort === "role") {
    orderBy = { role: "asc" };
  }

  const skip = (Math.max(1, page) - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_SELECT_FIELDS,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
};

export const findUserById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT_FIELDS,
  });
};

export const findUserByEmailOrUsername = async (email, username) => {
  const or = [];
  if (email) or.push({ email: email.toLowerCase().trim() });
  if (username) or.push({ username: username.trim() });

  if (or.length === 0) return null;

  return await prisma.user.findFirst({
    where: { OR: or },
  });
};

export const createUserWithMapping = async (
  userData,
  creatorId,
  superAdminId = null,
  adminId = null
) => {
  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: userData,
      select: USER_SELECT_FIELDS,
    });

    if (creatorId && creatorId !== newUser.id) {
      await tx.adminUserMapping.create({
        data: {
          superAdminId,
          adminId,
          userId: newUser.id,
          allowedPages: userData.allowedPages || [],
          departments: userData.departments || [],
          companies: userData.companies || [],
        },
      });
    }

    return newUser;
  });
};

export const updateUserData = async (id, data) => {
  return await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data,
      select: USER_SELECT_FIELDS,
    });

    const mappingUpdate = {};
    if (data.allowedPages !== undefined) mappingUpdate.allowedPages = data.allowedPages;
    if (data.departments !== undefined) mappingUpdate.departments = data.departments;
    if (data.companies !== undefined) mappingUpdate.companies = data.companies;

    if (Object.keys(mappingUpdate).length > 0) {
      const existingMapping = await tx.adminUserMapping.findUnique({
        where: { userId: id },
      });

      if (existingMapping) {
        await tx.adminUserMapping.update({
          where: { userId: id },
          data: mappingUpdate,
        });
      } else {
        await tx.adminUserMapping.create({
          data: {
            userId: id,
            allowedPages: data.allowedPages || updated.allowedPages || [],
            departments: data.departments || updated.departments || [],
            companies: data.companies || updated.companies || [],
            superAdminId: updated.createdById || null,
          },
        });
      }
    }

    return updated;
  });
};

export const updateUserStatusData = async (id, isActive) => {
  return await prisma.user.update({
    where: { id },
    data: { isActive },
    select: USER_SELECT_FIELDS,
  });
};

export const deleteUserById = async (id) => {
  return await prisma.$transaction(async (tx) => {
    // 1. If this user was managing any users as an admin, unbind them so they remain under SuperAdmin
    await tx.adminUserMapping.updateMany({
      where: { adminId: id },
      data: { adminId: null },
    });

    // 2. Delete this user's own mapping
    await tx.adminUserMapping.deleteMany({
      where: { userId: id },
    });

    // 3. Delete this user's refresh tokens if any
    await tx.refreshToken.deleteMany({
      where: { userId: id },
    });

    // 4. Permanently delete the user record
    return await tx.user.delete({
      where: { id },
    });
  });
};


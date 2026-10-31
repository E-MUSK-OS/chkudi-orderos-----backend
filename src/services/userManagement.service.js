import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";
import {
  findManagedUsers,
  findUserById,
  findUserByEmailOrUsername,
  createUserWithMapping,
  updateUserData,
  updateUserStatusData,
  deleteUserById,
} from "../repositories/userManagement.repository.js";
import { generateUniqueUsername } from "../utils/username.js";

const resolveUserHierarchy = async (user) => {
  if (!user) return user;

  const normalized = { ...user };

  // 1. Initialize userMapping if missing
  if (!normalized.userMapping) {
    normalized.userMapping = {
      superAdminId: null,
      adminId: null,
      allowedPages: normalized.allowedPages || [],
      departments: normalized.departments || [],
      companies: normalized.companies || [],
      superAdmin: null,
      admin: null,
    };
  }

  // 2. Sync allowedPages
  const allowed =
    normalized.allowedPages && normalized.allowedPages.length > 0
      ? normalized.allowedPages
      : normalized.userMapping?.allowedPages || [];
  normalized.allowedPages = allowed;
  normalized.userMapping.allowedPages = allowed;

  let superAdmin = normalized.userMapping.superAdmin || null;
  let admin = normalized.userMapping.admin || null;

  // 3. Resolve if admin relation is actually a SuperAdmin
  if (!superAdmin && admin?.role === "SUPERADMIN") {
    superAdmin = admin;
    if (normalized.role === "ADMIN") {
      admin = null;
    }
  }

  // 4. Resolve superAdmin by superAdminId or createdById if still missing
  const superAdminCandidateId =
    normalized.userMapping.superAdminId ||
    (normalized.createdById && normalized.createdById !== normalized.id ? normalized.createdById : null);

  if (!superAdmin && superAdminCandidateId) {
    try {
      const candidate = await prisma.user.findUnique({
        where: { id: superAdminCandidateId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      });
      if (candidate && candidate.role === "SUPERADMIN") {
        superAdmin = candidate;
        normalized.userMapping.superAdminId = candidate.id;
      } else if (candidate && candidate.role === "ADMIN" && !admin) {
        admin = candidate;
        normalized.userMapping.adminId = candidate.id;
      }
    } catch (e) {
      console.error("Failed to resolve candidate:", e);
    }
  }

  // 5. If superAdmin is still missing and adminId is present
  if (!superAdmin && normalized.userMapping.adminId) {
    try {
      const adminUser = await prisma.user.findUnique({
        where: { id: normalized.userMapping.adminId },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          createdById: true,
          userMapping: {
            select: {
              superAdminId: true,
              superAdmin: {
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
        },
      });

      if (adminUser) {
        if (adminUser.role === "SUPERADMIN") {
          superAdmin = {
            id: adminUser.id,
            fullName: adminUser.fullName,
            email: adminUser.email,
            phone: adminUser.phone,
            role: adminUser.role,
          };
          if (normalized.role === "ADMIN") {
            admin = null;
          }
        } else {
          if (!admin) {
            admin = {
              id: adminUser.id,
              fullName: adminUser.fullName,
              email: adminUser.email,
              phone: adminUser.phone,
              role: adminUser.role,
            };
          }
          if (adminUser.userMapping?.superAdmin) {
            superAdmin = adminUser.userMapping.superAdmin;
          } else if (adminUser.createdById) {
            const sa = await prisma.user.findUnique({
              where: { id: adminUser.createdById },
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
                role: true,
              },
            });
            if (sa && sa.role === "SUPERADMIN") {
              superAdmin = sa;
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to resolve adminUser:", e);
    }
  }

  // 6. If target is an ADMIN or USER and still no superAdmin found, find who created them or the system SuperAdmin
  if (!superAdmin && normalized.role !== "SUPERADMIN") {
    try {
      if (normalized.createdById) {
        const creator = await prisma.user.findUnique({
          where: { id: normalized.createdById },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        });
        if (creator && creator.role === "SUPERADMIN") {
          superAdmin = creator;
          normalized.userMapping.superAdminId = creator.id;
        }
      }
      if (!superAdmin) {
        const systemSuperAdmin = await prisma.user.findFirst({
          where: { role: "SUPERADMIN" },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        });
        if (systemSuperAdmin) {
          superAdmin = systemSuperAdmin;
          normalized.userMapping.superAdminId = systemSuperAdmin.id;
        }
      }
    } catch (e) {
      console.error("Failed to resolve systemSuperAdmin:", e);
    }
  }

  // 7. If target is an ADMIN, also include the users managed by this Admin
  let managedUsers = [];
  if (normalized.role === "ADMIN") {
    try {
      const mappings = await prisma.adminUserMapping.findMany({
        where: { adminId: normalized.id },
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
              phone: true,
              role: true,
              isActive: true,
            },
          },
        },
      });
      managedUsers = mappings.map((m) => m.user).filter(Boolean);
    } catch (e) {
      console.error("Failed to query managedUsers for admin:", e);
    }
  }

  normalized.userMapping = {
    ...normalized.userMapping,
    superAdmin,
    admin,
  };

  normalized.superAdmin = superAdmin;
  normalized.admin = admin;
  normalized.managedUsers = managedUsers;

  return normalized;
};

export const getManagedUsersService = async ({
  requestingUser,
  search,
  sort,
  page,
  limit,
}) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  const result = await findManagedUsers({
    requestingUser,
    search,
    sort,
    page: Number(page) || 1,
    limit: Number(limit) || 16,
  });

  return {
    ...result,
    users: await Promise.all((result.users || []).map(resolveUserHierarchy)),
  };
};

export const getUserByIdService = async ({ id, requestingUser }) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found.");
  }

  const viewerId = requestingUser.actualId || requestingUser.id;
  let workspaceSaId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.userMapping?.superAdminId;

  if (!workspaceSaId && requestingUser.role === "ADMIN") {
    const adminRecord = await prisma.user.findUnique({
      where: { id: viewerId },
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
      workspaceSaId =
        adminRecord.userMapping?.superAdminId ||
        (adminRecord.userMapping?.admin?.role === "SUPERADMIN" ? adminRecord.userMapping.admin.id : null) ||
        adminRecord.userMapping?.adminId ||
        adminRecord.createdById;
    }
    if (!workspaceSaId) {
      const sa = await prisma.user.findFirst({
        where: { role: "SUPERADMIN" },
        select: { id: true },
      });
      workspaceSaId = sa?.id;
    }
  }

  // Scoped check: only self or users under hierarchy
  if (requestingUser.role === "SUPERADMIN") {
    const isUnderHierarchy =
      user.id === viewerId ||
      user.createdById === viewerId ||
      user.userMapping?.superAdminId === viewerId ||
      user.userMapping?.adminId === viewerId ||
      user.userMapping?.admin?.createdById === viewerId ||
      user.userMapping?.admin?.userMapping?.superAdminId === viewerId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only view users under your account.");
    }
  } else if (requestingUser.role === "ADMIN") {
    const isUnderHierarchy =
      user.id === viewerId ||
      user.id === workspaceSaId ||
      user.userMapping?.superAdminId === workspaceSaId ||
      user.userMapping?.adminId === workspaceSaId ||
      user.userMapping?.adminId === viewerId ||
      user.createdById === workspaceSaId ||
      user.createdById === viewerId ||
      user.userMapping?.admin?.createdById === workspaceSaId ||
      user.userMapping?.admin?.userMapping?.superAdminId === workspaceSaId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only view users under your account.");
    }
  }

  return await resolveUserHierarchy(user);
};

export const createUserService = async ({ requestingUser, data }) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  // Non-superadmin cannot create SUPERADMIN accounts
  if (data.role === "SUPERADMIN" && requestingUser.role !== "SUPERADMIN") {
    throw new Error("Only SuperAdmin can create another SuperAdmin.");
  }

  // Duplicate email check
  const existingUser = await findUserByEmailOrUsername(data.email, null);
  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  const fullName = [data.firstName, data.middleName, data.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const username = await generateUniqueUsername(fullName || data.email.split("@")[0]);
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const userData = {
    firstName: data.firstName.trim(),
    middleName: data.middleName ? data.middleName.trim() : null,
    lastName: data.lastName.trim(),
    fullName,
    username,
    email: data.email.toLowerCase().trim(),
    phone: data.phone.trim(),
    password: hashedPassword,
    dob: data.dob ? new Date(data.dob) : null,
    gender: data.gender || null,
    departments: Array.isArray(data.departments) ? data.departments : [],
    companies: Array.isArray(data.companies) ? data.companies : [],
    avatar: data.avatar || null,
    role: data.role || "USER",
    allowedPages: Array.isArray(data.allowedPages) ? data.allowedPages : [],
    rights: data.rights || null,
    createdById: requestingUser.actualId || requestingUser.id,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    isVerified: true,
  };

  const actorId = requestingUser.actualId || requestingUser.id;
  let superAdminId = null;
  let adminId = null;

  if (requestingUser.role === "SUPERADMIN") {
    superAdminId = actorId;
    adminId = data.role === "ADMIN" ? null : actorId;
  } else if (requestingUser.role === "ADMIN") {
    adminId = actorId;
    superAdminId = requestingUser.workspaceId || requestingUser.superAdminId || null;
    if (!superAdminId) {
      const adminDetails = await findUserById(actorId);
      superAdminId = adminDetails?.userMapping?.superAdminId || null;
    }

    // Downstream grant restriction: Admin cannot grant pages they do not have access to
    const adminDetails = await findUserById(actorId);
    const adminAllowed = requestingUser.allowedPages || adminDetails?.allowedPages || [];
    if (adminAllowed.length > 0 && !adminAllowed.includes("ALL")) {
      const attemptedPages = Array.isArray(data.allowedPages) ? data.allowedPages : [];
      const invalidPages = attemptedPages.filter((p) => p !== "ALL" && !adminAllowed.includes(p));
      if (invalidPages.length > 0 || (attemptedPages.includes("ALL") && !adminAllowed.includes("ALL"))) {
        throw new Error(
          `You cannot grant access to pages you do not have permission to access: ${invalidPages.join(", ")}`
        );
      }
    }
  }

  const created = await createUserWithMapping(userData, actorId, superAdminId, adminId);
  return await resolveUserHierarchy(created);
};

export const updateUserService = async ({ id, requestingUser, data }) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found.");
  }

  const editorId = requestingUser.actualId || requestingUser.id;
  let workspaceSaId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.userMapping?.superAdminId;

  if (!workspaceSaId && requestingUser.role === "ADMIN") {
    const adminRecord = await prisma.user.findUnique({
      where: { id: editorId },
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
      workspaceSaId =
        adminRecord.userMapping?.superAdminId ||
        (adminRecord.userMapping?.admin?.role === "SUPERADMIN" ? adminRecord.userMapping.admin.id : null) ||
        adminRecord.userMapping?.adminId ||
        adminRecord.createdById;
    }
  }

  // Scoped check: only self or users under hierarchy
  if (requestingUser.role === "SUPERADMIN") {
    const isUnderHierarchy =
      user.id === editorId ||
      user.createdById === editorId ||
      user.userMapping?.superAdminId === editorId ||
      user.userMapping?.adminId === editorId ||
      user.userMapping?.admin?.createdById === editorId ||
      user.userMapping?.admin?.userMapping?.superAdminId === editorId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only edit users under your account.");
    }
  } else if (requestingUser.role === "ADMIN") {
    if (user.role === "SUPERADMIN") {
      throw new Error("Access denied. Admins cannot edit the Super Admin account.");
    }
    const isUnderHierarchy =
      user.id === editorId ||
      user.userMapping?.adminId === editorId ||
      user.userMapping?.superAdminId === workspaceSaId ||
      user.userMapping?.adminId === workspaceSaId ||
      user.createdById === editorId ||
      user.createdById === workspaceSaId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only edit users under your account.");
    }
  }

  // Non-superadmin cannot assign SUPERADMIN role
  if (data.role === "SUPERADMIN" && requestingUser.role !== "SUPERADMIN") {
    throw new Error("Only SuperAdmin can assign the SuperAdmin role.");
  }

  // Email duplicate check if changed
  if (data.email && data.email.toLowerCase().trim() !== user.email.toLowerCase()) {
    const existing = await findUserByEmailOrUsername(data.email, null);
    if (existing && existing.id !== id) {
      throw new Error("A user with this email address already exists.");
    }
  }

  // Downstream grant restriction for ADMIN
  if (requestingUser.role === "ADMIN" && data.allowedPages !== undefined) {
    const adminDetails = await findUserById(requestingUser.id);
    const adminAllowed = requestingUser.allowedPages || adminDetails?.allowedPages || [];
    if (adminAllowed.length > 0 && !adminAllowed.includes("ALL")) {
      const attemptedPages = Array.isArray(data.allowedPages) ? data.allowedPages : [];
      const invalidPages = attemptedPages.filter((p) => p !== "ALL" && !adminAllowed.includes(p));
      if (invalidPages.length > 0 || (attemptedPages.includes("ALL") && !adminAllowed.includes("ALL"))) {
        throw new Error(
          `You cannot grant access to pages you do not have permission to access: ${invalidPages.join(", ")}`
        );
      }
    }
  }

  const updatePayload = {};

  if (data.firstName !== undefined || data.middleName !== undefined || data.lastName !== undefined) {
    const fn = data.firstName !== undefined ? data.firstName.trim() : user.firstName;
    const mn = data.middleName !== undefined ? (data.middleName ? data.middleName.trim() : null) : user.middleName;
    const ln = data.lastName !== undefined ? data.lastName.trim() : user.lastName;

    updatePayload.firstName = fn;
    updatePayload.middleName = mn;
    updatePayload.lastName = ln;
    updatePayload.fullName = [fn, mn, ln].filter(Boolean).join(" ").trim();
  }

  if (data.email) updatePayload.email = data.email.toLowerCase().trim();
  if (data.phone) updatePayload.phone = data.phone.trim();
  if (data.dob !== undefined) updatePayload.dob = data.dob ? new Date(data.dob) : null;
  if (data.gender !== undefined) updatePayload.gender = data.gender || null;
  if (data.departments !== undefined) updatePayload.departments = data.departments;
  if (data.companies !== undefined) updatePayload.companies = data.companies;
  if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
  if (data.role !== undefined) updatePayload.role = data.role;
  if (data.allowedPages !== undefined) updatePayload.allowedPages = data.allowedPages;
  if (data.rights !== undefined) updatePayload.rights = data.rights;
  if (data.isActive !== undefined) updatePayload.isActive = Boolean(data.isActive);

  if (data.password && data.password.trim()) {
    updatePayload.password = await bcrypt.hash(data.password.trim(), 10);
  }

  const updated = await updateUserData(id, updatePayload);
  return await resolveUserHierarchy(updated);
};

export const updateUserStatusService = async ({ id, requestingUser, isActive }) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  const updaterId = requestingUser.actualId || requestingUser.id;

  if (id === updaterId && !isActive) {
    throw new Error("You cannot deactivate your own account.");
  }

  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found.");
  }

  let workspaceSaId =
    requestingUser.workspaceId ||
    requestingUser.superAdminId ||
    requestingUser.userMapping?.superAdminId;

  if (!workspaceSaId && requestingUser.role === "ADMIN") {
    const adminRecord = await prisma.user.findUnique({
      where: { id: updaterId },
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
      workspaceSaId =
        adminRecord.userMapping?.superAdminId ||
        (adminRecord.userMapping?.admin?.role === "SUPERADMIN" ? adminRecord.userMapping.admin.id : null) ||
        adminRecord.userMapping?.adminId ||
        adminRecord.createdById;
    }
  }

  // Scoped check: only self or users under hierarchy
  if (requestingUser.role === "SUPERADMIN") {
    const isUnderHierarchy =
      user.id === updaterId ||
      user.createdById === updaterId ||
      user.userMapping?.superAdminId === updaterId ||
      user.userMapping?.adminId === updaterId ||
      user.userMapping?.admin?.createdById === updaterId ||
      user.userMapping?.admin?.userMapping?.superAdminId === updaterId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only update users under your account.");
    }
  } else if (requestingUser.role === "ADMIN") {
    if (user.role === "SUPERADMIN") {
      throw new Error("Access denied. Admins cannot deactivate the Super Admin account.");
    }
    const isUnderHierarchy =
      user.id === updaterId ||
      user.userMapping?.adminId === updaterId ||
      user.userMapping?.superAdminId === workspaceSaId ||
      user.userMapping?.adminId === workspaceSaId ||
      user.createdById === updaterId ||
      user.createdById === workspaceSaId;
    if (!isUnderHierarchy) {
      throw new Error("Access denied. You can only update users under your account.");
    }
  }

  return await updateUserStatusData(id, Boolean(isActive));
};

export const getUserDropdownOptionsService = async (userId) => {
  const [savedOptions, companies, existingUsers] = await Promise.all([
    prisma.dropdownOption.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.company.findMany({
      where: { userId },
      select: { companyName: true },
    }).catch(() => []),
    prisma.user.findMany({
      where: {
        OR: [
          { id: userId },
          { userMapping: { superAdminId: userId } },
          { userMapping: { adminId: userId } },
        ],
      },
      select: {
        departments: true,
        companies: true,
        gender: true,
      },
    }).catch(() => []),
  ]);

  const userDepts = existingUsers.flatMap((u) => u.departments || []).filter(Boolean);
  const userCompanies = [
    ...companies.map((c) => c.companyName).filter(Boolean),
    ...existingUsers.flatMap((u) => u.companies || []).filter(Boolean),
  ];
  const userGenders = existingUsers.map((u) => u.gender).filter(Boolean);

  const savedDepts = savedOptions.filter((o) => o.field.toLowerCase() === "department").map((o) => o.value);
  const savedCompanies = savedOptions.filter((o) => o.field.toLowerCase() === "company").map((o) => o.value);
  const savedGenders = savedOptions.filter((o) => o.field.toLowerCase() === "gender").map((o) => o.value);

  return {
    savedOptions,
    departments: [...new Set([...savedDepts, ...userDepts])],
    companies: [...new Set([...savedCompanies, ...userCompanies])],
    genders: [...new Set([...savedGenders, ...userGenders])],
  };
};

export const saveUserDropdownOptionService = async (userId, data) => {
  const { field, value, label } = data;
  if (!field || !value) {
    throw new Error("Field and value are required.");
  }
  const cleanField = field.trim().toLowerCase();
  const cleanValue = value.trim();
  const cleanLabel = label ? label.trim() : cleanValue;

  return await prisma.dropdownOption.upsert({
    where: {
      userId_field_value: {
        userId,
        field: cleanField,
        value: cleanValue,
      },
    },
    update: { label: cleanLabel },
    create: {
      userId,
      field: cleanField,
      value: cleanValue,
      label: cleanLabel,
    },
  });
};

export const deleteUserService = async ({ requestingUser, id }) => {
  if (!requestingUser || !["ADMIN", "SUPERADMIN"].includes(requestingUser.role)) {
    throw new Error("Access denied. Admin rights required.");
  }

  if (!id) {
    throw new Error("User ID is required.");
  }

  const actorId = requestingUser.actualId || requestingUser.id;
  if (actorId === id) {
    throw new Error("You cannot delete your own account.");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      createdById: true,
      userMapping: {
        select: {
          superAdminId: true,
          adminId: true,
        },
      },
    },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.role === "SUPERADMIN") {
    throw new Error("SuperAdmin accounts cannot be deleted.");
  }

  return await deleteUserById(id);
};


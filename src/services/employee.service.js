import prisma from "../config/prisma.js";
import { saveBase64Media } from "../utils/companyMediaNasPath.js";

const parseDateSafe = (val) => {
  if (!val || val === "" || val === "-") return null;
  // If DD-MM-YYYY format
  if (typeof val === "string" && /^\d{2}-\d{2}-\d{4}$/.test(val)) {
    const [day, month, year] = val.split("-");
    const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const buildFullName = (firstName, middleName, lastName) => {
  const parts = [firstName, middleName, lastName].filter((p) => Boolean(p && p.trim()));
  return parts.join(" ").trim();
};

const processDocumentsList = async (rawDocs, empId) => {
  if (!Array.isArray(rawDocs)) return [];
  return await Promise.all(
    rawDocs.map(async (doc, idx) => {
      let url = doc.url || "";
      if (typeof url === "string" && url.startsWith("data:")) {
        url = await saveBase64Media(url, "employees", `emp_doc_${empId}_${idx}`);
      }
      return {
        id: doc.id || `doc_${Date.now()}_${idx}`,
        name: doc.name || `Document ${idx + 1}`,
        type: doc.type || "Other",
        url,
        fileName: doc.fileName || "",
        fileSize: doc.fileSize || 0,
        uploadedAt: doc.uploadedAt || new Date().toISOString(),
      };
    })
  );
};

const formatEmployeeWithDocs = (emp) => {
  if (!emp) return emp;
  let docs = Array.isArray(emp.documents) ? emp.documents : [];
  if (docs.length === 0 && emp.identityDocUrl) {
    docs = [
      {
        id: "legacy_id_doc",
        name: "Identity Document",
        type: "Identity Proof",
        url: emp.identityDocUrl,
        uploadedAt: emp.createdAt,
      },
    ];
  }
  return {
    ...emp,
    documents: docs,
  };
};

export const createEmployeeService = async (userId, data, authUser) => {
  const fullName = buildFullName(data.firstName, data.middleName, data.lastName);
  const createdByName = authUser?.fullName || authUser?.username || authUser?.email || "Admin";
  const empId = data.employeeId ? data.employeeId.trim() : "emp";

  const photoUrl = await saveBase64Media(data.photoUrl, "employees", `photo_${empId}`);
  let identityDocUrl = await saveBase64Media(data.identityDocUrl, "employees", `id_doc_${empId}`);
  const bankDocUrl = await saveBase64Media(data.bankDocUrl, "employees", `bank_doc_${empId}`);

  let documents = await processDocumentsList(data.documents, empId);
  if (documents.length > 0 && !identityDocUrl) {
    identityDocUrl = documents[0].url;
  } else if (identityDocUrl && documents.length === 0) {
    documents = [
      {
        id: `doc_id_${Date.now()}`,
        name: "Identity Document",
        type: "Identity Proof",
        url: identityDocUrl,
        uploadedAt: new Date().toISOString(),
      },
    ];
  }

  const rawBasicSalary =
    data.basicSalary !== undefined && data.basicSalary !== null && data.basicSalary !== ""
      ? Number(data.basicSalary)
      : 0.0;
  const basicSalary = isNaN(rawBasicSalary) ? 0.0 : rawBasicSalary;
  const defaultTotalHours = 248.0;
  const wageRate =
    defaultTotalHours > 0 && basicSalary > 0
      ? Number((basicSalary / defaultTotalHours).toFixed(2))
      : 0.0;

  const employee = await prisma.employee.create({
    data: {
      userId,
      firstName: data.firstName.trim(),
      middleName: data.middleName ? data.middleName.trim() : null,
      lastName: data.lastName.trim(),
      fullName,
      employeeId: data.employeeId.trim(),
      machineCode: data.machineCode ? data.machineCode.trim() : null,
      loginId: data.loginId ? data.loginId.trim() : null,
      email: data.email ? data.email.trim() : null,
      contactNo: data.contactNo.trim(),
      aadhaarNo: data.aadhaarNo ? data.aadhaarNo.trim() : null,
      dob: parseDateSafe(data.dob),
      bloodGroup: data.bloodGroup || null,
      company: data.company ? data.company.trim() : null,
      branch: data.branch || null,
      department: data.department.trim(),
      designation: data.designation.trim(),
      salaryType: data.salaryType || "Salaried",
      joiningDate: parseDateSafe(data.joiningDate),
      workerProcess: data.workerProcess || null,
      basicSalary,
      wageRate,
      addressLine1: data.addressLine1 || null,
      addressLine2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || "India",
      pincode: data.pincode || null,
      accountNumber: data.accountNumber || null,
      accountHolderName: data.accountHolderName || null,
      bankName: data.bankName || null,
      branchName: data.branchName || null,
      accountType: data.accountType || null,
      ifscCode: data.ifscCode || null,
      photoUrl: photoUrl || null,
      identityDocUrl: identityDocUrl || null,
      bankDocUrl: bankDocUrl || null,
      documents: documents,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdByName,
      updatedByName: createdByName,
    },
  });

  return formatEmployeeWithDocs(employee);
};

export const getEmployeesService = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {
    userId,
  };

  // Status filter
  if (query.status && query.status !== "all") {
    if (query.status.toLowerCase() === "active") {
      where.isActive = true;
    } else if (query.status.toLowerCase() === "inactive") {
      where.isActive = false;
    }
  }

  // Department filter
  if (query.department && query.department !== "all") {
    where.department = {
      equals: query.department,
      mode: "insensitive",
    };
  }

  // Company filter
  if (query.company && query.company !== "all") {
    where.company = {
      equals: query.company,
      mode: "insensitive",
    };
  }

  // Branch filter
  if (query.branch && query.branch !== "all") {
    where.branch = {
      equals: query.branch,
      mode: "insensitive",
    };
  }

  // Machine code filter
  if (query.machineCode && query.machineCode.trim()) {
    where.machineCode = {
      contains: query.machineCode.trim(),
      mode: "insensitive",
    };
  }

  // Employee name filter
  if (query.employeeName && query.employeeName.trim()) {
    where.fullName = {
      contains: query.employeeName.trim(),
      mode: "insensitive",
    };
  }

  // Global search
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { fullName: { contains: term, mode: "insensitive" } },
      { employeeId: { contains: term, mode: "insensitive" } },
      { contactNo: { contains: term, mode: "insensitive" } },
      { aadhaarNo: { contains: term, mode: "insensitive" } },
      { loginId: { contains: term, mode: "insensitive" } },
      { machineCode: { contains: term, mode: "insensitive" } },
      { department: { contains: term, mode: "insensitive" } },
      { designation: { contains: term, mode: "insensitive" } },
      { company: { contains: term, mode: "insensitive" } },
      { branch: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, rawEmployees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const employees = rawEmployees.map(formatEmployeeWithDocs);

  return {
    employees,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getEmployeeByIdService = async (id, userId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      id,
      userId,
    },
  });

  if (!employee) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  return formatEmployeeWithDocs(employee);
};

export const updateEmployeeService = async (id, userId, data, authUser) => {
  const existing = await prisma.employee.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  const firstName = data.firstName !== undefined ? data.firstName : existing.firstName;
  const middleName = data.middleName !== undefined ? data.middleName : existing.middleName;
  const lastName = data.lastName !== undefined ? data.lastName : existing.lastName;
  const fullName = buildFullName(firstName, middleName, lastName);

  const updatedByName = authUser?.fullName || authUser?.username || authUser?.email || "Admin";

  const updateData = {
    ...data,
    fullName,
    updatedByName,
  };

  const empId = data.employeeId || existing.employeeId || "emp";
  if (data.photoUrl !== undefined) {
    updateData.photoUrl = await saveBase64Media(data.photoUrl, "employees", `photo_${empId}`);
  }
  if (data.identityDocUrl !== undefined) {
    updateData.identityDocUrl = await saveBase64Media(data.identityDocUrl, "employees", `id_doc_${empId}`);
  }
  if (data.bankDocUrl !== undefined) {
    updateData.bankDocUrl = await saveBase64Media(data.bankDocUrl, "employees", `bank_doc_${empId}`);
  }

  if (data.documents !== undefined) {
    const processed = await processDocumentsList(data.documents, empId);
    updateData.documents = processed;
    if (processed.length > 0 && !updateData.identityDocUrl) {
      updateData.identityDocUrl = processed[0].url;
    }
  }

  if (data.dob !== undefined) {
    updateData.dob = parseDateSafe(data.dob);
  }
  if (data.joiningDate !== undefined) {
    updateData.joiningDate = parseDateSafe(data.joiningDate);
  }

  if (data.basicSalary !== undefined) {
    const rawVal = data.basicSalary;
    const parsedNum = rawVal === "" || rawVal === null ? 0.0 : Number(rawVal);
    const safeBasic = isNaN(parsedNum) ? 0.0 : parsedNum;
    updateData.basicSalary = safeBasic;

    const currentTotalHours = existing.totalHours || 248.0;
    if (data.wageRate === undefined && currentTotalHours > 0) {
      updateData.wageRate = Number((safeBasic / currentTotalHours).toFixed(2));
    }
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: updateData,
  });

  return formatEmployeeWithDocs(updated);
};

export const deleteEmployeeService = async (id, userId) => {
  const existing = await prisma.employee.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  await prisma.employee.delete({
    where: { id },
  });

  return true;
};

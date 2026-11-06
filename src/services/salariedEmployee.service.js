import prisma from "../config/prisma.js";

const parseDateSafe = (val) => {
  if (!val || val === "" || val === "-") return null;
  if (typeof val === "string" && /^\d{2}-\d{2}-\d{4}$/.test(val)) {
    const [day, month, year] = val.split("-");
    const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const getSalariedEmployeesService = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {
    userId,
    OR: [
      { salaryType: "Salaried" },
      { salaryType: null },
      { salaryType: "" },
    ],
  };

  // Status filter (active/inactive)
  if (query.status && query.status !== "all") {
    if (query.status.toLowerCase() === "active") {
      where.isActive = true;
    } else if (query.status.toLowerCase() === "inactive") {
      where.isActive = false;
    }
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
    where.AND = [
      {
        OR: [
          { fullName: { contains: term, mode: "insensitive" } },
          { employeeId: { contains: term, mode: "insensitive" } },
          { machineCode: { contains: term, mode: "insensitive" } },
          { contactNo: { contains: term, mode: "insensitive" } },
          { department: { contains: term, mode: "insensitive" } },
          { designation: { contains: term, mode: "insensitive" } },
          { bankName: { contains: term, mode: "insensitive" } },
          { accountNumber: { contains: term, mode: "insensitive" } },
        ],
      },
    ];
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "asc" },
      include: {
        absentRecords: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
  ]);

  return {
    employees,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getSalariedEmployeeByIdService = async (
  id,
  userId,
  financialYear = "2026-2027"
) => {
  const employee = await prisma.employee.findFirst({
    where: { id, userId },
    include: {
      absentRecords: {
        where: { financialYear },
        orderBy: [{ monthIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!employee) {
    const err = new Error("Salaried Employee not found.");
    err.status = 404;
    throw err;
  }

  const now = new Date();
  const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (!employee.workingDays || employee.workingDays > currentMonthDays) {
    employee.workingDays = currentMonthDays;
    employee.totalHours = currentMonthDays * (employee.workingHoursPerDay || 8);
    if (employee.basicSalary && employee.totalHours > 0) {
      employee.wageRate = Number((employee.basicSalary / employee.totalHours).toFixed(2));
    }
  }

  return employee;
};

export const updateSalaryDetailsService = async (id, userId, data) => {
  const existing = await prisma.employee.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  const now = new Date();
  const currentMonthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const rawWorkingDays = data.workingDays ?? existing.workingDays ?? currentMonthDays;
  const workingDays = Math.min(
    Math.max(1, Number(rawWorkingDays) || currentMonthDays),
    currentMonthDays
  );
  const workingHoursPerDay =
    data.workingHoursPerDay ?? existing.workingHoursPerDay ?? 8.0;
  const totalHours = workingDays * workingHoursPerDay;

  const basicSalary = Number(data.basicSalary ?? existing.basicSalary ?? 0);
  const wageRate = totalHours > 0 ? Number((basicSalary / totalHours).toFixed(2)) : 0;

  const otRatePercent = Number(data.otRatePercent ?? existing.otRatePercent ?? 0);
  const otRatePerHour =
    otRatePercent > 0
      ? Number(((wageRate * otRatePercent) / 100).toFixed(2))
      : 0;

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      basicSalary,
      workingDayMode: data.workingDayMode || "Monthly",
      workingDays,
      workingHoursPerDay,
      totalHours,
      wageRate: data.wageRate !== undefined ? Number(data.wageRate) : wageRate,
      otRatePercent,
      otRatePerHour:
        data.otRatePerHour !== undefined ? Number(data.otRatePerHour) : otRatePerHour,
      transportAllowance: Number(data.transportAllowance ?? 0),
      medicalAllowance: Number(data.medicalAllowance ?? 0),
    },
  });

  return updated;
};

export const createAbsentRecordService = async (employeeId, userId, data) => {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, userId },
  });

  if (!employee) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  const record = await prisma.employeeAbsentRecord.create({
    data: {
      employeeId,
      financialYear: data.financialYear || "2026-2027",
      monthName: data.monthName,
      monthIndex: data.monthIndex ?? 0,
      periodStartDate: parseDateSafe(data.periodStartDate),
      periodEndDate: parseDateSafe(data.periodEndDate),
      periodString: data.periodString || null,
      absentHours: Number(data.absentHours || 0),
      overtimeHours: Number(data.overtimeHours || 0),
    },
  });

  return record;
};

export const updateAbsentRecordService = async (
  recordId,
  employeeId,
  userId,
  data
) => {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, userId },
  });

  if (!employee) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  const existing = await prisma.employeeAbsentRecord.findFirst({
    where: { id: recordId, employeeId },
  });

  if (!existing) {
    const err = new Error("Absent record not found.");
    err.status = 404;
    throw err;
  }

  const updated = await prisma.employeeAbsentRecord.update({
    where: { id: recordId },
    data: {
      periodStartDate:
        data.periodStartDate !== undefined
          ? parseDateSafe(data.periodStartDate)
          : existing.periodStartDate,
      periodEndDate:
        data.periodEndDate !== undefined
          ? parseDateSafe(data.periodEndDate)
          : existing.periodEndDate,
      periodString:
        data.periodString !== undefined ? data.periodString : existing.periodString,
      absentHours:
        data.absentHours !== undefined
          ? Number(data.absentHours)
          : existing.absentHours,
      overtimeHours:
        data.overtimeHours !== undefined
          ? Number(data.overtimeHours)
          : existing.overtimeHours,
    },
  });

  return updated;
};

export const deleteAbsentRecordService = async (recordId, employeeId, userId) => {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, userId },
  });

  if (!employee) {
    const err = new Error("Employee not found.");
    err.status = 404;
    throw err;
  }

  await prisma.employeeAbsentRecord.delete({
    where: { id: recordId },
  });

  return true;
};

export const bulkUploadAttendanceService = async (userId, records = []) => {
  let importedCount = 0;
  const errors = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    try {
      const identifier = String(row.employeeId || row.employeeName || "").trim();
      if (!identifier) continue;

      const employee = await prisma.employee.findFirst({
        where: {
          userId,
          OR: [
            { employeeId: { equals: identifier, mode: "insensitive" } },
            { fullName: { equals: identifier, mode: "insensitive" } },
          ],
        },
      });

      if (!employee) {
        errors.push(`Row ${i + 1}: Employee "${identifier}" not found.`);
        continue;
      }

      await prisma.employeeAbsentRecord.create({
        data: {
          employeeId: employee.id,
          financialYear: row.financialYear || "2026-2027",
          monthName: row.monthName || "April 2026",
          monthIndex: Number(row.monthIndex ?? 0),
          periodString: row.periodString || null,
          absentHours: Number(row.absentHours || 0),
          overtimeHours: Number(row.overtimeHours || 0),
        },
      });

      importedCount++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  return { importedCount, errors };
};


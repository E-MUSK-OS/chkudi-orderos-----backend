import {
  getSalariedEmployeesService,
  getSalariedEmployeeByIdService,
  updateSalaryDetailsService,
  createAbsentRecordService,
  updateAbsentRecordService,
  deleteAbsentRecordService,
  bulkUploadAttendanceService,
} from "../services/salariedEmployee.service.js";
import {
  updateSalaryDetailsSchema,
  createAbsentRecordSchema,
  updateAbsentRecordSchema,
} from "../validations/salariedEmployee.validation.js";

export const getSalariedEmployees = async (req, res, next) => {
  try {
    const result = await getSalariedEmployeesService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Salaried employees fetched successfully.",
      data: result.employees,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSalariedEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { financialYear } = req.query;
    const employee = await getSalariedEmployeeByIdService(
      id,
      req.user.id,
      financialYear || "2026-2027"
    );

    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSalaryDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateSalaryDetailsSchema.parse(req.body);
    const updated = await updateSalaryDetailsService(id, req.user.id, data);

    return res.status(200).json({
      success: true,
      message: "Salary and working details updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const createAbsentRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = createAbsentRecordSchema.parse(req.body);
    const record = await createAbsentRecordService(id, req.user.id, data);

    return res.status(201).json({
      success: true,
      message: "Absent record created successfully.",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAbsentRecord = async (req, res, next) => {
  try {
    const { id, recordId } = req.params;
    const data = updateAbsentRecordSchema.parse(req.body);
    const updated = await updateAbsentRecordService(
      recordId,
      id,
      req.user.id,
      data
    );

    return res.status(200).json({
      success: true,
      message: "Absent record updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAbsentRecord = async (req, res, next) => {
  try {
    const { id, recordId } = req.params;
    await deleteAbsentRecordService(recordId, id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Absent record deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAttendance = async (req, res, next) => {
  try {
    const records = Array.isArray(req.body) ? req.body : req.body.records || [];
    const result = await bulkUploadAttendanceService(req.user.id, records);

    return res.status(200).json({
      success: true,
      message: `Uploaded ${result.importedCount} attendance records successfully.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


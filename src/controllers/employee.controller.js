import {
  createEmployeeService,
  getEmployeesService,
  getEmployeeByIdService,
  updateEmployeeService,
  deleteEmployeeService,
} from "../services/employee.service.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../validations/employee.validation.js";

export const createEmployee = async (req, res, next) => {
  try {
    const data = createEmployeeSchema.parse(req.body);
    const employee = await createEmployeeService(req.user.id, data, req.user);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully.",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployees = async (req, res, next) => {
  try {
    const result = await getEmployeesService(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully.",
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

export const getEmployeeById = async (req, res, next) => {
  try {
    const employee = await getEmployeeByIdService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const data = updateEmployeeSchema.parse(req.body);
    const updated = await updateEmployeeService(
      req.params.id,
      req.user.id,
      data,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully.",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    await deleteEmployeeService(req.params.id, req.user.id);
    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


import { z } from "zod";

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First Name is required."),
  middleName: z.string().trim().optional().nullable().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last Name is required."),
  employeeId: z.string().trim().min(1, "Employee ID is required."),
  machineCode: z.string().trim().optional().nullable().or(z.literal("")),
  loginId: z.string().trim().optional().nullable().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  contactNo: z.string().trim().min(1, "Contact No. is required."),
  aadhaarNo: z.string().trim().optional().nullable().or(z.literal("")),

  dob: z.string().trim().optional().nullable().or(z.literal("")),
  bloodGroup: z.string().trim().optional().nullable().or(z.literal("")),
  company: z.string().trim().optional().nullable().or(z.literal("")),
  branch: z.string().trim().optional().nullable().or(z.literal("")),
  department: z.string().trim().min(1, "Department is required."),
  designation: z.string().trim().min(1, "Designation is required."),
  salaryType: z.string().trim().optional().nullable().default("Salaried"),
  joiningDate: z.string().trim().optional().nullable().or(z.literal("")),
  workerProcess: z.string().trim().optional().nullable().or(z.literal("")),
  basicSalary: z
    .preprocess((val) => {
      if (val === "" || val === null || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    }, z.number().min(0))
    .optional()
    .default(0),

  // Address
  addressLine1: z.string().trim().optional().nullable().or(z.literal("")),
  addressLine2: z.string().trim().optional().nullable().or(z.literal("")),
  city: z.string().trim().optional().nullable().or(z.literal("")),
  state: z.string().trim().optional().nullable().or(z.literal("")),
  country: z.string().trim().optional().nullable().default("India"),
  pincode: z.string().trim().optional().nullable().or(z.literal("")),

  // Bank
  accountNumber: z.string().trim().optional().nullable().or(z.literal("")),
  accountHolderName: z.string().trim().optional().nullable().or(z.literal("")),
  bankName: z.string().trim().optional().nullable().or(z.literal("")),
  branchName: z.string().trim().optional().nullable().or(z.literal("")),
  accountType: z.string().trim().optional().nullable().or(z.literal("")),
  ifscCode: z.string().trim().optional().nullable().or(z.literal("")),

  // Media
  photoUrl: z.string().trim().optional().nullable().or(z.literal("")),
  identityDocUrl: z.string().trim().optional().nullable().or(z.literal("")),
  bankDocUrl: z.string().trim().optional().nullable().or(z.literal("")),
  documents: z.any().optional().nullable(),

  isActive: z.boolean().optional().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

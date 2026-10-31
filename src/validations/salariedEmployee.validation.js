import { z } from "zod";

export const updateSalaryDetailsSchema = z.object({
  basicSalary: z.coerce.number().min(0).default(0),
  workingDayMode: z.string().optional().default("Monthly"),
  workingDays: z.coerce.number().int().min(1).max(366).optional().default(31),
  workingHoursPerDay: z.coerce.number().min(0).max(24).optional().default(8),
  totalHours: z.coerce.number().min(0).optional().default(248),
  wageRate: z.coerce.number().min(0).optional().default(0),
  otRatePercent: z.coerce.number().min(0).optional().default(0),
  otRatePerHour: z.coerce.number().min(0).optional().default(0),
  transportAllowance: z.coerce.number().min(0).optional().default(0),
  medicalAllowance: z.coerce.number().min(0).optional().default(0),
});

export const createAbsentRecordSchema = z.object({
  financialYear: z.string().optional().default("2026-2027"),
  monthName: z.string(),
  monthIndex: z.coerce.number().int().min(0).max(11).optional().default(0),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  periodString: z.string().optional().nullable(),
  absentHours: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
});

export const updateAbsentRecordSchema = z.object({
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  periodString: z.string().optional().nullable(),
  absentHours: z.coerce.number().min(0).default(0),
  overtimeHours: z.coerce.number().min(0).default(0),
});


import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128)
});

export const employeeCreateSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  personalEmail: z.string().email().optional(),
  phone: z.string().min(8).optional(),
  joiningDate: z.string(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]),
  departmentId: z.string(),
  designationId: z.string(),
  managerId: z.string().optional(),
  workLocationId: z.string().optional(),
  salaryMonthly: z.number().positive(),
  salaryType: z.enum(["FIXED", "HOURLY"]).default("FIXED"),
  baseSalary: z.number().nonnegative().optional(),
  hourlyRate: z.number().nonnegative().optional(),
  allowances: z.number().nonnegative().default(0),
  deductions: z.number().nonnegative().default(0),
  skills: z.array(z.string()).default([])
}).refine((value) => value.salaryType !== "HOURLY" || Number(value.hourlyRate || 0) > 0, {
  message: "Hourly rate is required for hourly employees",
  path: ["hourlyRate"]
});

export const leaveApplySchema = z.object({
  leaveTypeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().max(400).optional()
}).refine((v) => {
  const start = new Date(v.startDate);
  const end = new Date(v.endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
}, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"]
});

export const jobOpeningSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(20),
  requisitionId: z.string(),
  recruiterId: z.string().optional(),
  locationId: z.string().optional(),
  openingsCount: z.number().int().positive()
});

export const candidateCreateSchema = z.object({
  jobOpeningId: z.string(),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  currentLocation: z.string().optional(),
  noticePeriodDays: z.number().int().nonnegative().optional(),
  totalExperience: z.number().nonnegative().optional(),
  skills: z.array(z.string()).default([]),
  education: z.string().optional(),
  source: z.enum(["CAREERS_PORTAL", "REFERRAL", "LINKEDIN", "JOB_BOARD", "DIRECT", "AGENCY"])
});

export const candidateStageSchema = z.object({
  stage: z.enum([
    "APPLIED",
    "SCREENING",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "INTERVIEWED",
    "SELECTED",
    "OFFERED",
    "JOINED",
    "REJECTED",
    "ON_HOLD"
  ]),
  rejectionReason: z.string().optional()
});

export const timesheetEntrySchema = z.object({
  date: z.string(),
  projectName: z.string().min(2).max(120).optional(),
  taskDescription: z.string().min(2).max(500).optional(),
  hoursWorked: z.number().positive().max(24).optional(),
  project: z.string().min(2).max(120).optional(),
  task: z.string().min(2).max(500).optional(),
  hours: z.number().positive().max(24).optional(),
  notes: z.string().max(1000).optional()
}).refine((value) => !Number.isNaN(new Date(value.date).getTime()), {
  message: "A valid work date is required",
  path: ["date"]
}).refine((value) => Boolean(value.projectName || value.project), {
  message: "Project name is required",
  path: ["projectName"]
}).refine((value) => Boolean(value.taskDescription || value.task), {
  message: "Task description is required",
  path: ["taskDescription"]
}).refine((value) => Number(value.hoursWorked ?? value.hours) > 0, {
  message: "Hours worked is required",
  path: ["hoursWorked"]
});

export const timesheetDecisionSchema = z.object({
  id: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(400).optional(),
  comment: z.string().max(400).optional()
});

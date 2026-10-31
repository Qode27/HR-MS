import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/http";
import { withPermission } from "@/lib/server";

export async function GET(req: NextRequest) {
  const access = await withPermission(req, "reports:read");
  if (access.error) return access.error;
  const tenantWhere = access.session.role === "MASTER_ADMIN" ? {} : { tenantId: access.session.tenantId ?? "__missing_tenant__" };
  const timesheetWhere = access.session.role === "MASTER_ADMIN" ? {} : { tenantId: access.session.tenantId ?? "__missing_tenant__" };

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const [timesheets, leaves, headcountByDept, pipeline, payroll, todayTimesheets, openJobs, activeCandidates, interviewsToday, sourceAnalysis] = await Promise.all([
    prisma.timesheet.groupBy({ by: ["status"], where: timesheetWhere, _count: true, _sum: { hoursWorked: true } }),
    prisma.leaveRequest.groupBy({ by: ["status"], where: { employee: tenantWhere }, _count: true }),
    prisma.employee.groupBy({ by: ["departmentId"], where: tenantWhere, _count: true }),
    prisma.candidate.groupBy({ by: ["stage"], where: tenantWhere, _count: true }),
    prisma.payrollRun.findMany({ where: tenantWhere, orderBy: [{ year: "desc" }, { month: "desc" }], take: 6 }),
    prisma.timesheet.groupBy({ by: ["status"], where: { ...timesheetWhere, date: { gte: start, lte: end } }, _count: true, _sum: { hoursWorked: true } }),
    prisma.jobOpening.count({ where: { status: "OPEN", ...tenantWhere } }),
    prisma.candidate.count({ where: { ...tenantWhere, stage: { in: ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "ON_HOLD"] } } }),
    prisma.interview.count({ where: { scheduledAt: { gte: start, lte: end }, jobOpening: tenantWhere } }),
    prisma.candidate.groupBy({ by: ["source"], where: tenantWhere, _count: true })
  ]);

  return ok({
    attendance: timesheets,
    timesheets,
    leaves,
    headcountByDept,
    pipeline,
    payroll,
    kpis: {
      openJobs,
      activeCandidates,
      interviewsToday,
      todayAttendance: todayTimesheets,
      todayTimesheets
    },
    sourceAnalysis
  });
}

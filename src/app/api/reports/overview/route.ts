import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/http";
import { withPermission } from "@/lib/server";

export async function GET(req: NextRequest) {
  const access = await withPermission(req, "reports:read");
  if (access.error) return access.error;

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const [attendance, leaves, headcountByDept, pipeline, payroll, todayAttendance, openJobs, activeCandidates, interviewsToday, sourceAnalysis] = await Promise.all([
    prisma.attendance.groupBy({ by: ["status"], _count: true }),
    prisma.leaveRequest.groupBy({ by: ["status"], _count: true }),
    prisma.employee.groupBy({ by: ["departmentId"], _count: true }),
    prisma.candidate.groupBy({ by: ["stage"], _count: true }),
    prisma.payrollRun.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }], take: 6 }),
    prisma.attendance.groupBy({ by: ["status"], where: { date: { gte: start, lte: end } }, _count: true }),
    prisma.jobOpening.count({ where: { status: "OPEN" } }),
    prisma.candidate.count({ where: { stage: { in: ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW_SCHEDULED", "INTERVIEWED", "SELECTED", "OFFERED", "ON_HOLD"] } } }),
    prisma.interview.count({ where: { scheduledAt: { gte: start, lte: end } } }),
    prisma.candidate.groupBy({ by: ["source"], _count: true })
  ]);

  return ok({
    attendance,
    leaves,
    headcountByDept,
    pipeline,
    payroll,
    kpis: {
      openJobs,
      activeCandidates,
      interviewsToday,
      todayAttendance
    },
    sourceAnalysis
  });
}

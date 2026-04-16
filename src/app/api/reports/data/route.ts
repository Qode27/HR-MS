import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getReportDefinition } from "@/lib/report-catalog";
import { documentScope, DOCUMENT_CATEGORY_BY_TYPE } from "@/lib/document-center";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { AppError } from "@backend/utils/errors";
import { success } from "@backend/utils/api-response";

function parsePeriod(searchParams: URLSearchParams) {
  const now = new Date();
  const month = Number(searchParams.get("month") || now.getMonth() + 1);
  const year = Number(searchParams.get("year") || now.getFullYear());
  return { month, year };
}

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "reports:read");

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "";
  const definition = getReportDefinition(key);
  if (!definition) throw new AppError("Unknown report", 404);

  const { month, year } = parsePeriod(searchParams);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const departmentId = searchParams.get("departmentId") || undefined;

  let rows: Record<string, unknown>[] = [];

  switch (key) {
    case "employee-master":
      rows = (
        await prisma.employee.findMany({
          where: {
            deletedAt: null,
            departmentId: departmentId || undefined,
            ...(searchParams.get("year")
              ? {
                  joiningDate: {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31, 23, 59, 59, 999)
                  }
                }
              : {})
          },
          include: { department: true, designation: true },
          orderBy: { joiningDate: "desc" }
        })
      ).map((employee) => ({
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department.name,
        designation: employee.designation.name,
        status: employee.status,
        joiningDate: employee.joiningDate.toISOString().slice(0, 10)
      }));
      break;
    case "department-headcount":
      rows = await prisma.department
        .findMany({
          include: {
            employees: { where: { deletedAt: null } }
          },
          orderBy: { name: "asc" }
        })
        .then((departments) => departments.map((department) => ({ department: department.name, employees: department.employees.length })));
      break;
    case "joining-report":
      rows = (
        await prisma.employee.findMany({
          where: {
            deletedAt: null,
            joiningDate: { gte: monthStart, lte: monthEnd }
          },
          include: { department: true },
          orderBy: { joiningDate: "desc" }
        })
      ).map((employee) => ({
        employeeCode: employee.employeeCode,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department.name,
        joiningDate: employee.joiningDate.toISOString().slice(0, 10)
      }));
      break;
    case "attendance-monthly":
      rows = await prisma.employee.findMany({
        where: { deletedAt: null },
        include: {
          attendanceRecords: {
            where: { date: { gte: monthStart, lte: monthEnd } }
          }
        },
        orderBy: { firstName: "asc" }
      }).then((employees) =>
        employees.map((employee) => ({
          employee: `${employee.firstName} ${employee.lastName}`,
          present: employee.attendanceRecords.filter((row) => row.status === "PRESENT").length,
          absent: employee.attendanceRecords.filter((row) => row.status === "ABSENT").length,
          onLeave: employee.attendanceRecords.filter((row) => row.status === "ON_LEAVE").length,
          lateMinutes: employee.attendanceRecords.reduce((sum, row) => sum + row.lateMinutes, 0)
        }))
      );
      break;
    case "leave-history":
      rows = (
        await prisma.leaveRequest.findMany({
          where: {
            createdAt: { gte: monthStart, lte: monthEnd }
          },
          include: { employee: true, leaveType: true },
          orderBy: { createdAt: "desc" }
        })
      ).map((leave) => ({
        employee: `${leave.employee.firstName} ${leave.employee.lastName}`,
        leaveType: leave.leaveType.name,
        startDate: leave.startDate.toISOString().slice(0, 10),
        endDate: leave.endDate.toISOString().slice(0, 10),
        status: leave.status
      }));
      break;
    case "payroll-summary":
      rows = (
        await prisma.payrollRun.findMany({
          where: searchParams.get("year") ? { year } : undefined,
          orderBy: [{ year: "desc" }, { month: "desc" }]
        })
      ).map((run) => ({
        month: run.month,
        year: run.year,
        status: run.status,
        employees: Number((run.summaryJson as { employees?: number } | null)?.employees || 0),
        netPay: Number((run.summaryJson as { totals?: { net?: number } } | null)?.totals?.net || 0)
      }));
      break;
    case "ats-pipeline": {
      const [pipeline, openJobs] = await Promise.all([
        prisma.candidate.groupBy({ by: ["stage"], _count: true }),
        prisma.jobOpening.count({ where: { status: "OPEN" } })
      ]);
      rows = pipeline.map((item) => ({
        stage: item.stage === "JOINED" ? "HIRED" : item.stage.replaceAll("_", " "),
        candidates: item._count
      }));
      rows.push({ stage: "OPEN JOBS", candidates: openJobs });
      break;
    }
    case "document-register":
      rows = (
        await prisma.document.findMany({
          include: {
            employee: { select: { employeeCode: true, firstName: true, lastName: true } },
            candidate: { select: { fullName: true } }
          },
          orderBy: { createdAt: "desc" }
        })
      ).map((document) => ({
        file: document.fileName,
        type: document.type.replaceAll("_", " "),
        category: DOCUMENT_CATEGORY_BY_TYPE[document.type],
        scope: documentScope(document),
        owner: document.employee ? `${document.employee.employeeCode} - ${document.employee.firstName} ${document.employee.lastName}` : document.candidate?.fullName || "Company-wide",
        uploaded: document.createdAt.toISOString().slice(0, 10)
      }));
      break;
    default:
      throw new AppError("Report not implemented", 422);
  }

  return success({
    definition,
    filters: { month, year, departmentId: departmentId || null },
    rows
  });
});

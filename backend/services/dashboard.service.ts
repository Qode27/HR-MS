import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { normalizeRole, type AppRole } from "@/lib/roles";

export class DashboardService {
  private companySummaryCache = unstable_cache(
    async () => {
      const [employees, pendingLeaves, openPositions, candidates, announcements] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null } }),
        prisma.leaveRequest.count({ where: { status: "PENDING" } }),
        prisma.jobOpening.count({ where: { status: "OPEN" } }),
        prisma.candidate.groupBy({ by: ["stage"], _count: true }),
        prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
      ]);

      return {
        stats: { employees, pendingLeaves, openPositions },
        candidatesByStage: candidates,
        announcements
      };
    },
    ["dashboard-summary"],
    { revalidate: 60 }
  );

  private async employeeScope(userId: string, role: AppRole) {
    const employee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null },
      include: {
        department: true,
        designation: true,
        leaveBalances: { include: { leaveType: true } }
      }
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (!employee) {
      return {
        scope: role === "MANAGER" ? "team" : "self",
        stats: { profileReady: 0, pendingLeaves: 0, documents: 0, payslips: 0 },
        announcements: await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
        quickLinks: ["/profile", "/leave", "/documents"]
      };
    }

    const reporteeIds =
      role === "MANAGER"
        ? (await prisma.employee.findMany({ where: { managerId: employee.id, deletedAt: null }, select: { id: true } })).map((item) => item.id)
        : [];

    const scopedEmployeeIds = role === "MANAGER" ? [employee.id, ...reporteeIds] : [employee.id];

    const [attendanceSummary, pendingLeaves, payslips, documents, announcements] = await Promise.all([
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          employeeId: { in: scopedEmployeeIds },
          date: { gte: monthStart }
        },
        _count: true
      }),
      prisma.leaveRequest.count({
        where: role === "MANAGER" ? { employeeId: { in: reporteeIds }, status: "PENDING" } : { employeeId: employee.id, status: "PENDING" }
      }),
      prisma.payslip.count({
        where: role === "MANAGER" ? { employeeId: { in: scopedEmployeeIds } } : { employeeId: employee.id }
      }),
      prisma.document.count({
        where: role === "MANAGER" ? { OR: [{ employeeId: { in: scopedEmployeeIds } }, { employeeId: null, candidateId: null }] } : { OR: [{ employeeId: employee.id }, { employeeId: null, candidateId: null }] }
      }),
      prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    return {
      scope: role === "MANAGER" ? "team" : "self",
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        department: employee.department.name,
        designation: employee.designation.name
      },
      stats: {
        profileReady: 1,
        pendingLeaves,
        documents,
        payslips
      },
      attendanceSummary,
      leaveBalances: employee.leaveBalances.map((balance) => ({
        id: balance.id,
        leaveType: balance.leaveType.name,
        allocated: Number(balance.allocated),
        used: Number(balance.used),
        remaining: Number(balance.allocated) - Number(balance.used)
      })),
      teamSummary:
        role === "MANAGER"
          ? {
              reportees: reporteeIds.length,
              openApprovals: pendingLeaves
            }
          : null,
      announcements,
      quickLinks: role === "MANAGER" ? ["/attendance", "/leave", "/documents", "/profile"] : ["/profile", "/attendance", "/leave", "/payroll/payslips", "/documents"]
    };
  }

  async summary(role?: string, userId?: string) {
    const normalizedRole = normalizeRole(role);
    if ((normalizedRole === "EMPLOYEE" || normalizedRole === "MANAGER") && userId) {
      return this.employeeScope(userId, normalizedRole);
    }

    const [base, departments, attendanceToday, payrollRun, documentCount] = await Promise.all([
      this.companySummaryCache(),
      prisma.department.groupBy({ by: ["id"], _count: true }),
      prisma.attendance.groupBy({
        by: ["status"],
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          }
        },
        _count: true
      }),
      prisma.payrollRun.findFirst({ orderBy: [{ year: "desc" }, { month: "desc" }] }),
      prisma.document.count()
    ]);

    return {
      scope: "company",
      stats: {
        employees: base.stats.employees,
        pendingLeaves: base.stats.pendingLeaves,
        openPositions: base.stats.openPositions,
        departments: departments.length,
        documents: documentCount
      },
      attendanceToday,
      payroll: payrollRun
        ? {
            month: payrollRun.month,
            year: payrollRun.year,
            status: payrollRun.status,
            employees: Number((payrollRun.summaryJson as { employees?: number } | null)?.employees || 0)
          }
        : null,
      candidatesByStage: base.candidatesByStage,
      announcements: base.announcements,
      quickLinks: ["/employees", "/attendance", "/leave", "/payroll", "/ats", "/documents", "/reports", "/settings"]
    };
  }
}

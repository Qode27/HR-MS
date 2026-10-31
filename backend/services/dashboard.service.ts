import { prisma } from "@/lib/db";
import { normalizeRole, type AppRole } from "@/lib/roles";

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function daysAgo(days: number) {
  const value = startOfDay();
  value.setDate(value.getDate() - days);
  return value;
}

function monthEnd(year: number, month: number) {
  return new Date(year, month + 1, 0, 23, 59, 59, 999);
}

function tenantWhere(tenantId?: string | null) {
  return tenantId ? { tenantId } : {};
}

function money(value: unknown) {
  return Number(value || 0);
}

function platformStats(stats: Partial<Record<string, number>>) {
  return {
    clients: 0,
    activeClients: 0,
    trialClients: 0,
    suspendedClients: 0,
    employees: 0,
    categories: 0,
    departments: 0,
    dailyRequirements: 0,
    documents: 0,
    openJobs: 0,
    monthlyRevenue: 0,
    ...stats
  };
}

function companyStats(stats: Partial<Record<string, number>>) {
  return {
    employees: 0,
    departments: 0,
    dailyRequirements: 0,
    pendingLeaves: 0,
    payrollStatus: 0,
    documents: 0,
    openJobs: 0,
    approvedHours: 0,
    submittedHours: 0,
    ...stats
  };
}

function employeeStats(stats: Partial<Record<string, number>>) {
  return {
    timesheetHours: 0,
    pendingLeaves: 0,
    payslips: 0,
    documents: 0,
    ...stats
  };
}

export class DashboardService {
  private async employeeGrowth(tenantId?: string | null) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return { label: date.toLocaleString("en-US", { month: "short" }), year: date.getFullYear(), month: date.getMonth() };
    });

    return Promise.all(
      months.map(async (month) => {
        const end = monthEnd(month.year, month.month);
        const start = new Date(month.year, month.month, 1);
        const where = { deletedAt: null, ...tenantWhere(tenantId) };
        const [total, newEmployees] = await Promise.all([
          prisma.employee.count({ where: { ...where, createdAt: { lte: end } } }),
          prisma.employee.count({ where: { ...where, createdAt: { gte: start, lte: end } } })
        ]);
        return { label: month.label, total, newEmployees };
      })
    );
  }

  private async timesheetTrend(tenantId?: string | null, employeeIds?: string[]) {
    const days = Array.from({ length: 7 }, (_, index) => daysAgo(6 - index));
    return Promise.all(
      days.map(async (day) => {
        const rows = await prisma.timesheet.groupBy({
          by: ["status"],
          where: {
            ...(tenantId ? { tenantId } : {}),
            user: employeeIds ? { employee: { id: { in: employeeIds } } } : undefined,
            date: { gte: startOfDay(day), lte: endOfDay(day) }
          },
          _sum: { hoursWorked: true },
          _count: true
        });
        const approved = rows.filter((row) => row.status === "APPROVED").reduce((sum, row) => sum + Number(row._sum.hoursWorked || 0), 0);
        const submitted = rows.filter((row) => row.status === "SUBMITTED").reduce((sum, row) => sum + Number(row._sum.hoursWorked || 0), 0);
        const rejected = rows.filter((row) => row.status === "REJECTED").reduce((sum, row) => sum + Number(row._sum.hoursWorked || 0), 0);
        return { label: day.toLocaleString("en-US", { weekday: "short" }), approved, submitted, rejected };
      })
    );
  }

  private async payrollDistribution(tenantId?: string | null) {
    const latest = await prisma.payrollRun.findFirst({
      where: tenantWhere(tenantId),
      include: { items: true },
      orderBy: [{ year: "desc" }, { month: "desc" }]
    });
    if (!latest) return { status: "No payroll run", month: null, items: [] };

    const totals = latest.items.reduce(
      (acc, item) => {
        acc.gross += money(item.grossPay);
        acc.deductions += money(item.deductions);
        acc.reimbursement += money(item.reimbursement);
        acc.net += money(item.netPay);
        return acc;
      },
      { gross: 0, deductions: 0, reimbursement: 0, net: 0 }
    );

    return {
      status: latest.status,
      month: `${latest.month}/${latest.year}`,
      items: [
        { label: "Net Pay", value: totals.net },
        { label: "Deductions", value: totals.deductions },
        { label: "Reimbursements", value: totals.reimbursement }
      ].filter((item) => item.value > 0),
      totals
    };
  }

  private async platformScope() {
    const today = { gte: startOfDay(), lte: endOfDay() };
    const [clients, activeClients, trialClients, suspendedClients, employees, categories, dailyRequirements, documents, openJobs, revenue, alerts, recentClients, onboarding, growth, trend, payroll] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.tenant.count({ where: { deletedAt: null, status: "TRIAL" } }),
      prisma.tenant.count({ where: { deletedAt: null, status: "SUSPENDED" } }),
      prisma.employee.count({ where: { deletedAt: null } }),
      prisma.department.count({ where: { deletedAt: null } }),
      prisma.jobRequisition.count({ where: { createdAt: today } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.jobOpening.count({ where: { status: "OPEN" } }),
      prisma.tenantSubscription.aggregate({ where: { status: "ACTIVE" }, _sum: { mrr: true } }),
      prisma.platformAlert.findMany({ where: { resolvedAt: null }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 5 }),
      prisma.tenantSubscription.findMany({ include: { tenant: true, plan: true }, orderBy: { createdAt: "desc" }, take: 5 }),
      this.employeeGrowth(),
      this.timesheetTrend(),
      this.payrollDistribution()
    ]);

    const mrr = money(revenue._sum.mrr);
    return {
      scope: "platform",
      stats: platformStats({ clients, activeClients, trialClients, suspendedClients, employees, categories, departments: categories, dailyRequirements, documents, openJobs, monthlyRevenue: mrr }),
      recentClientActivity: recentClients.map((client) => ({
        id: client.id,
        title: client.name,
        description: `${client.status} client`,
        timestamp: client.updatedAt,
        status: client.status
      })),
      onboarding: onboarding.map((subscription) => ({
        id: subscription.id,
        title: subscription.tenant.name,
        description: `${subscription.plan.name} plan`,
        timestamp: subscription.createdAt,
        status: subscription.status
      })),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        title: alert.title,
        description: alert.message,
        severity: alert.severity,
        timestamp: alert.createdAt
      })),
      quickActions: [
        { label: "Add New Client", href: "/clients", description: "Onboard a tenant" },
        { label: "Create Department", href: "/settings", description: "Add department/category" },
        { label: "Add Job Opening", href: "/ats/jobs", description: "Publish a role" },
        { label: "View Reports", href: "/reports", description: "Open analytics" },
        { label: "Manage Plans", href: "/settings?tab=plans", description: "Subscriptions and billing" }
      ],
      charts: { employeeGrowth: growth, attendanceTrend: trend, payrollDistribution: payroll }
    };
  }

  private async companyScope(tenantId?: string | null) {
    const where = tenantWhere(tenantId);
    const today = { gte: startOfDay(), lte: endOfDay() };
    const [employees, departments, dailyRequirements, pendingLeaves, documents, payroll, timesheets, openJobs, employeeEvents, recentEmployees, growth, trend, distribution] = await Promise.all([
      prisma.employee.count({ where: { deletedAt: null, ...where } }),
      prisma.department.count({ where: { deletedAt: null, ...where } }),
      prisma.jobRequisition.count({ where: { ...where, createdAt: today } }),
      prisma.leaveRequest.count({ where: { status: "PENDING", employee: tenantId ? { tenantId } : undefined } }),
      prisma.document.count({ where: { ...where, deletedAt: null } }),
      prisma.payrollRun.findFirst({ where, orderBy: [{ year: "desc" }, { month: "desc" }] }),
      prisma.timesheet.groupBy({ by: ["status"], where: { ...(tenantId ? { tenantId } : {}), date: today }, _sum: { hoursWorked: true }, _count: true }),
      prisma.jobOpening.count({ where: { ...where, status: "OPEN" } }),
      prisma.employeeEvent.findMany({ where: { employee: where }, include: { employee: true }, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.employee.findMany({ where: { deletedAt: null, ...where }, orderBy: { createdAt: "desc" }, take: 4 }),
      this.employeeGrowth(tenantId),
      this.timesheetTrend(tenantId),
      this.payrollDistribution(tenantId)
    ]);

    const approvedHours = timesheets.filter((row) => row.status === "APPROVED").reduce((sum, row) => sum + Number(row._sum.hoursWorked || 0), 0);
    const submittedHours = timesheets.filter((row) => row.status === "SUBMITTED").reduce((sum, row) => sum + Number(row._sum.hoursWorked || 0), 0);

    return {
      scope: "company",
      stats: companyStats({
        employees,
        departments,
        dailyRequirements,
        pendingLeaves,
        payrollStatus: payroll ? 1 : 0,
        documents,
        openJobs,
        approvedHours,
        submittedHours
      }),
      payroll: payroll ? { status: payroll.status, month: payroll.month, year: payroll.year } : null,
      timesheetSummary: [
        { label: "Approved hours", value: approvedHours },
        { label: "Awaiting approval", value: submittedHours },
        { label: "Entries today", value: timesheets.reduce((sum, row) => sum + row._count, 0) }
      ],
      openPositions: openJobs,
      recentEmployeeActivity: [
        ...employeeEvents.map((event) => ({
          id: event.id,
          title: event.title,
          description: `${event.employee.firstName} ${event.employee.lastName}`,
          timestamp: event.createdAt
        })),
        ...recentEmployees.map((employee) => ({
          id: employee.id,
          title: "Employee profile created",
          description: `${employee.firstName} ${employee.lastName}`,
          timestamp: employee.createdAt
        }))
      ].slice(0, 5),
      quickActions: [
        { label: "Add Employee", href: "/employees/new", description: "Create employee profile" },
        { label: "Create Department", href: "/settings", description: "Configure org structure" },
        { label: "Add Job Opening", href: "/ats/jobs", description: "Create an active role" },
        { label: "Run Payroll", href: "/payroll", description: "Prepare monthly payroll" },
        { label: "Upload Documents", href: "/documents", description: "Add company or employee files" }
      ],
      charts: { employeeGrowth: growth, attendanceTrend: trend, payrollDistribution: distribution }
    };
  }

  private async employeeScope(userId: string, role: AppRole, tenantId?: string | null) {
    const where = tenantWhere(tenantId);
    const employee = await prisma.employee.findFirst({
      where: { userId, deletedAt: null, ...where },
      include: { leaveBalances: { include: { leaveType: true } } }
    });

    if (!employee) {
      return {
        scope: "self",
        stats: employeeStats({}),
        tasks: [],
        announcements: await prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" }, take: 5 }),
        charts: { attendanceTrend: [] }
      };
    }

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [timesheetHours, pendingLeaves, payslips, documents, tasks, announcements, trend] = await Promise.all([
      prisma.timesheet.aggregate({ where: { userId, date: { gte: monthStart }, ...(tenantId ? { tenantId } : {}) }, _sum: { hoursWorked: true } }),
      prisma.leaveRequest.count({ where: { employeeId: employee.id, status: "PENDING" } }),
      prisma.payslip.count({ where: { employeeId: employee.id } }),
      prisma.document.count({ where: { ...where, deletedAt: null, OR: [{ employeeId: employee.id }, { scope: "COMPANY" }] } }),
      prisma.onboardingTask.findMany({ where: { employeeId: employee.id, status: { not: "DONE" } }, orderBy: { dueDate: "asc" }, take: 5 }),
      prisma.announcement.findMany({ where, orderBy: { createdAt: "desc" }, take: 5 }),
      this.timesheetTrend(tenantId, [employee.id])
    ]);

    return {
      scope: "self",
      employee: { id: employee.id, name: `${employee.firstName} ${employee.lastName}`, employeeCode: employee.employeeCode },
      stats: employeeStats({
        timesheetHours: Number(timesheetHours._sum.hoursWorked || 0),
        pendingLeaves,
        payslips,
        documents
      }),
      leaveBalances: employee.leaveBalances.map((balance) => ({
        id: balance.id,
        leaveType: balance.leaveType.name,
        remaining: Number(balance.allocated) - Number(balance.used)
      })),
      tasks,
      announcements,
      quickActions: [
        { label: "Submit Timesheet", href: "/my-timesheets", description: "Log project hours" },
        { label: "Apply Leave", href: "/my-leave/apply", description: "Request time off" },
        { label: "View Payslips", href: "/payroll/payslips", description: "Open salary slips" },
        { label: "My Documents", href: "/documents", description: "Access files" }
      ],
      charts: { attendanceTrend: trend }
    };
  }

  async summary(role?: string, userId?: string, tenantId?: string | null) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === "MASTER_ADMIN") return this.platformScope();
    if (normalizedRole === "EMPLOYEE" && userId) return this.employeeScope(userId, normalizedRole, tenantId);
    return this.companyScope(tenantId);
  }
}

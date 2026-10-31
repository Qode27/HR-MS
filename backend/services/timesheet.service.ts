import { Prisma, TimesheetStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

const adminRoles = new Set(["MASTER_ADMIN", "SUPER_ADMIN", "ADMIN", "HR_ADMIN"]);
const approverRoles = new Set(["MASTER_ADMIN", "SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER"]);

function tenantFilter(tenantId?: string | null) {
  return tenantId ? { tenantId } : {};
}

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  value.setDate(value.getDate() + (day === 0 ? -6 : 1 - day));
  return value;
}

function endOfWeek(date = new Date()) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function normalizeDate(input: Date) {
  const value = new Date(input);
  value.setHours(0, 0, 0, 0);
  return value;
}

function normalizeStatus(status?: TimesheetStatus) {
  return status === "PENDING" ? "SUBMITTED" : status;
}

function toDto(row: any) {
  const employee = row.user?.employee;
  return {
    id: row.id,
    userId: row.userId,
    tenantId: row.tenantId,
    date: row.date,
    projectName: row.projectName,
    taskDescription: row.taskDescription,
    hoursWorked: Number(row.hoursWorked),
    status: row.status,
    submittedAt: row.submittedAt,
    approvedById: row.approvedById,
    approvedAt: row.approvedAt,
    rejectionReason: row.rejectionReason,
    payrollRunId: row.payrollRunId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: row.user
      ? {
          id: row.user.id,
          name: row.user.fullName,
          email: row.user.email,
          employee: employee
            ? {
                id: employee.id,
                employeeCode: employee.employeeCode,
                firstName: employee.firstName,
                lastName: employee.lastName,
                managerId: employee.managerId
              }
            : null
        }
      : null,
    approver: row.approver ? { id: row.approver.id, name: row.approver.fullName, email: row.approver.email } : null
  };
}

export class TimesheetService {
  private async currentEmployee(userId: string, tenantId?: string | null) {
    return prisma.employee.findFirst({
      where: { userId, deletedAt: null, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, userId: true, tenantId: true }
    });
  }

  private async scopeFor(input: { userId: string; role: string; tenantId?: string | null; mine?: boolean }): Promise<Prisma.TimesheetWhereInput> {
    if (input.role === "MASTER_ADMIN" && !input.mine) return {};
    const tenantWhere = tenantFilter(input.tenantId);
    const currentEmployee = await this.currentEmployee(input.userId, input.tenantId);

    if (input.mine || input.role === "EMPLOYEE") {
      return { ...tenantWhere, userId: input.userId };
    }

    if (adminRoles.has(input.role)) return tenantWhere;

    if (input.role === "MANAGER" && currentEmployee) {
      const reportees = await prisma.employee.findMany({
        where: { managerId: currentEmployee.id, deletedAt: null, ...(input.tenantId ? { tenantId: input.tenantId } : {}) },
        select: { userId: true }
      });
      const reporteeUserIds = reportees.map((employee) => employee.userId).filter(Boolean) as string[];
      return { ...tenantWhere, userId: { in: reporteeUserIds.length ? reporteeUserIds : ["__no_reportees__"] } };
    }

    return { ...tenantWhere, userId: "__unauthorized__" };
  }

  private async assertDailyTotal(input: { userId: string; tenantId?: string | null; date: Date; hoursWorked: number; excludeId?: string }) {
    const date = normalizeDate(input.date);
    const existing = await prisma.timesheet.aggregate({
      where: {
        userId: input.userId,
        ...tenantFilter(input.tenantId),
        date,
        ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
        status: { not: "REJECTED" }
      },
      _sum: { hoursWorked: true }
    });
    const total = Number(existing._sum.hoursWorked || 0) + input.hoursWorked;
    if (total > 24) throw new AppError("Total timesheet hours for a day cannot exceed 24", 422);
  }

  async list(input: {
    tenantId?: string | null;
    userId: string;
    role: string;
    page: number;
    pageSize: number;
    status?: TimesheetStatus;
    employeeId?: string;
    from?: Date;
    to?: Date;
    q?: string;
    mine?: boolean;
  }) {
    const scopedWhere = await this.scopeFor(input);
    const employeeUser = input.employeeId
      ? await prisma.employee.findFirst({
          where: { id: input.employeeId, deletedAt: null, ...(input.tenantId && input.role !== "MASTER_ADMIN" ? { tenantId: input.tenantId } : {}) },
          select: { userId: true }
        })
      : null;
    if (input.employeeId && !employeeUser?.userId) throw new AppError("Employee not found", 404);

    const where: Prisma.TimesheetWhereInput = {
      ...scopedWhere,
      ...(employeeUser?.userId ? { userId: employeeUser.userId } : {}),
      status: normalizeStatus(input.status),
      date: input.from || input.to ? { gte: input.from ? normalizeDate(input.from) : undefined, lte: input.to ? normalizeDate(input.to) : undefined } : undefined,
      OR: input.q
        ? [
            { projectName: { contains: input.q, mode: "insensitive" } },
            { taskDescription: { contains: input.q, mode: "insensitive" } },
            { user: { fullName: { contains: input.q, mode: "insensitive" } } },
            { user: { email: { contains: input.q, mode: "insensitive" } } }
          ]
        : undefined
    };

    const skip = (input.page - 1) * input.pageSize;
    const weekStart = startOfWeek();
    const weekEnd = endOfWeek();
    const [items, total, grouped, week, pendingApprovals] = await Promise.all([
      prisma.timesheet.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, email: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true } } } },
          approver: { select: { id: true, fullName: true, email: true } }
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: input.pageSize
      }),
      prisma.timesheet.count({ where }),
      prisma.timesheet.groupBy({ by: ["status"], where, _count: true, _sum: { hoursWorked: true } }),
      prisma.timesheet.aggregate({ where: { ...where, date: { gte: weekStart, lte: weekEnd } }, _sum: { hoursWorked: true } }),
      prisma.timesheet.count({ where: { ...where, status: "SUBMITTED" } })
    ]);

    const byStatus = grouped.map((group) => ({ status: group.status, count: group._count, hours: Number(group._sum.hoursWorked || 0) }));
    const approvedCount = byStatus.find((item) => item.status === "APPROVED")?.count || 0;
    const submittedCount = byStatus.find((item) => item.status === "SUBMITTED")?.count || 0;
    const draftCount = byStatus.find((item) => item.status === "DRAFT")?.count || 0;
    const rejectedCount = byStatus.find((item) => item.status === "REJECTED")?.count || 0;
    const decidedCount = approvedCount + rejectedCount;
    return {
      items: items.map(toDto),
      total,
      summary: {
        totalHours: byStatus.reduce((sum, group) => sum + group.hours, 0),
        approvedHours: byStatus.find((item) => item.status === "APPROVED")?.hours || 0,
        submittedHours: byStatus.find((item) => item.status === "SUBMITTED")?.hours || 0,
        pendingHours: byStatus.find((item) => item.status === "SUBMITTED")?.hours || 0,
        draftHours: byStatus.find((item) => item.status === "DRAFT")?.hours || 0,
        weeklyHours: Number(week._sum.hoursWorked || 0),
        pendingApprovals,
        approvedCount,
        submittedCount,
        pendingCount: submittedCount,
        draftCount,
        rejectedCount,
        approvalRate: decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0,
        approvalRatio: decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0,
        byStatus
      }
    };
  }

  async create(input: { tenantId?: string | null; userId: string; date: Date; projectName: string; taskDescription: string; hoursWorked: number }) {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, status: "ACTIVE", ...(input.tenantId ? { tenantId: input.tenantId } : {}) },
      include: { employee: { select: { id: true, deletedAt: true } } }
    });
    if (!user?.employee || user.employee.deletedAt) throw new AppError("No active employee profile is linked to this user", 404);
    await this.assertDailyTotal({ userId: input.userId, tenantId: input.tenantId ?? user.tenantId, date: input.date, hoursWorked: input.hoursWorked });

    return toDto(
      await prisma.timesheet.create({
        data: {
          tenantId: input.tenantId ?? user.tenantId,
          userId: input.userId,
          date: normalizeDate(input.date),
          projectName: input.projectName,
          taskDescription: input.taskDescription,
          hoursWorked: input.hoursWorked,
          status: "DRAFT"
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true } } } },
          approver: { select: { id: true, fullName: true, email: true } }
        }
      })
    );
  }

  async update(input: { tenantId?: string | null; userId: string; id: string; date: Date; projectName: string; taskDescription: string; hoursWorked: number }) {
    const entry = await prisma.timesheet.findFirst({ where: { id: input.id, userId: input.userId, ...tenantFilter(input.tenantId) } });
    if (!entry) throw new AppError("Timesheet entry not found", 404);
    if (entry.payrollRunId) throw new AppError("This timesheet is locked by payroll and cannot be edited", 409);
    if (!["DRAFT", "REJECTED"].includes(entry.status)) throw new AppError("Submitted and approved timesheets are locked", 409);
    await this.assertDailyTotal({ userId: input.userId, tenantId: input.tenantId, date: input.date, hoursWorked: input.hoursWorked, excludeId: entry.id });

    return toDto(
      await prisma.timesheet.update({
        where: { id: entry.id },
        data: {
          date: normalizeDate(input.date),
          projectName: input.projectName,
          taskDescription: input.taskDescription,
          hoursWorked: input.hoursWorked,
          status: "DRAFT",
          submittedAt: null,
          approvedById: null,
          approvedAt: null,
          rejectionReason: null
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true } } } },
          approver: { select: { id: true, fullName: true, email: true } }
        }
      })
    );
  }

  async submit(input: { tenantId?: string | null; userId: string; id: string }) {
    const entry = await prisma.timesheet.findFirst({ where: { id: input.id, userId: input.userId, ...tenantFilter(input.tenantId) } });
    if (!entry) throw new AppError("Timesheet entry not found", 404);
    if (entry.payrollRunId) throw new AppError("This timesheet is locked by payroll and cannot be submitted again", 409);
    if (!["DRAFT", "REJECTED"].includes(entry.status)) throw new AppError("Only draft or rejected timesheets can be submitted", 409);

    return toDto(
      await prisma.timesheet.update({
        where: { id: entry.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          approvedById: null,
          approvedAt: null,
          rejectionReason: null
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true } } } },
          approver: { select: { id: true, fullName: true, email: true } }
        }
      })
    );
  }

  async decide(input: { tenantId?: string | null; userId: string; role: string; id: string; decision: "APPROVED" | "REJECTED"; comment?: string }) {
    if (!approverRoles.has(input.role)) throw new AppError("Only managers and admins can approve timesheets", 403);

    const entry = await prisma.timesheet.findFirst({
      where: { id: input.id, ...(input.role === "MASTER_ADMIN" ? {} : tenantFilter(input.tenantId)) },
      include: { user: { select: { id: true, employee: { select: { id: true, managerId: true } } } } }
    });
    if (!entry) throw new AppError("Timesheet entry not found", 404);
    if (entry.payrollRunId) throw new AppError("This timesheet is locked by payroll and cannot be changed", 409);
    if (entry.status !== "SUBMITTED") throw new AppError("Only submitted timesheets can be approved or rejected", 409);
    if (entry.userId === input.userId) throw new AppError("You cannot approve your own timesheet", 403);

    const approverEmployee = await this.currentEmployee(input.userId, input.tenantId);
    const isAdmin = adminRoles.has(input.role);
    if (!isAdmin && entry.user.employee?.managerId !== approverEmployee?.id) {
      throw new AppError("You can approve only your team's timesheets", 403);
    }

    const approved = input.decision === "APPROVED";
    if (!approved && !input.comment?.trim()) throw new AppError("Rejection reason is required", 422);

    return toDto(
      await prisma.timesheet.update({
        where: { id: entry.id },
        data: {
          status: approved ? "APPROVED" : "REJECTED",
          approvedById: input.userId,
          approvedAt: new Date(),
          rejectionReason: approved ? null : input.comment?.trim()
        },
        include: {
          user: { select: { id: true, fullName: true, email: true, employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true } } } },
          approver: { select: { id: true, fullName: true, email: true } }
        }
      })
    );
  }
}

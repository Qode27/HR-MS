import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";
import { LeaveStatus } from "@prisma/client";

type ApprovalMeta = {
  stage: "MANAGER_PENDING" | "HR_PENDING" | "COMPLETED" | "REJECTED";
  managerDecisionAt?: string;
  managerDecisionBy?: string;
  hrDecisionAt?: string;
  hrDecisionBy?: string;
  note?: string;
};

function parseMeta(raw?: string | null): ApprovalMeta {
  if (!raw) return { stage: "MANAGER_PENDING" };
  try {
    const parsed = JSON.parse(raw) as ApprovalMeta;
    if (!parsed.stage) return { stage: "MANAGER_PENDING" };
    return parsed;
  } catch {
    return { stage: "MANAGER_PENDING" };
  }
}

function dayStart(input: Date) {
  return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

function diffDaysInclusive(startDate: Date, endDate: Date) {
  return Math.floor((dayStart(endDate).getTime() - dayStart(startDate).getTime()) / 86_400_000) + 1;
}

export class LeaveService {
  async selfDashboard(userId: string) {
    const employee = await prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new AppError("Employee profile missing", 404);

    const [requests, balances, leaveTypes] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { employeeId: employee.id },
        include: { leaveType: true },
        orderBy: { createdAt: "desc" }
      }),
      prisma.leaveBalance.findMany({ where: { employeeId: employee.id }, include: { leaveType: true } }),
      prisma.leaveType.findMany({ orderBy: { name: "asc" } })
    ]);

    return { employee, requests, balances, leaveTypes };
  }

  async approvalQueue(input: { userId: string; role: string }) {
    const where =
      input.role === "MANAGER"
        ? {
            status: "PENDING" as LeaveStatus,
            employee: { manager: { user: { id: input.userId } } }
          }
        : {
            status: "PENDING" as LeaveStatus
          };

    const rows = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        leaveType: true
      },
      orderBy: { createdAt: "asc" },
      take: 200
    });

    return rows.filter((row) => {
      const meta = parseMeta(row.rejectionReason);
      if (input.role === "MANAGER") return meta.stage === "MANAGER_PENDING";
      if (input.role === "HR_ADMIN" || input.role === "SUPER_ADMIN") return meta.stage === "HR_PENDING";
      return false;
    });
  }

  async apply(input: {
    userId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const employee = await prisma.employee.findFirst({ where: { userId: input.userId } });
    if (!employee) throw new AppError("Employee profile missing", 404);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new AppError("Invalid dates", 422);
    if (startDate > endDate) throw new AppError("Start date must be before end date", 422);

    const duration = diffDaysInclusive(startDate, endDate);
    if (duration > 30) throw new AppError("Leave request cannot exceed 30 days", 422);

    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate }
      }
    });
    if (overlap) throw new AppError("Leave request overlaps with existing leave", 409);

    const year = startDate.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId_year: { employeeId: employee.id, leaveTypeId: input.leaveTypeId, year } }
    });

    if (!balance) throw new AppError("Leave balance not configured", 422);
    const remaining = Number(balance.allocated) - Number(balance.used);
    if (remaining < duration) throw new AppError("Insufficient leave balance", 422);

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveTypeId: input.leaveTypeId,
        startDate,
        endDate,
        reason: input.reason,
        status: "PENDING",
        rejectionReason: JSON.stringify({ stage: "MANAGER_PENDING" satisfies ApprovalMeta["stage"] })
      },
      include: { leaveType: true }
    });

    return request;
  }

  async decide(input: {
    leaveRequestId: string;
    decision: "APPROVED" | "REJECTED";
    actorUserId: string;
    actorRole: string;
    note?: string;
  }) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: input.leaveRequestId },
      include: { employee: { include: { manager: { include: { user: true } } } }, leaveType: true }
    });
    if (!request) throw new AppError("Leave request not found", 404);
    if (request.status !== "PENDING") throw new AppError("Leave request already processed", 409);

    const meta = parseMeta(request.rejectionReason);

    if (meta.stage === "MANAGER_PENDING") {
      const managerUserId = request.employee.manager?.user?.id;
      if (input.actorRole === "MANAGER" && managerUserId !== input.actorUserId) {
        throw new AppError("You can only approve your team requests", 403);
      }
      if (!["MANAGER", "HR_ADMIN", "SUPER_ADMIN"].includes(input.actorRole)) {
        throw new AppError("Forbidden", 403);
      }

      if (input.decision === "REJECTED") {
        return prisma.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED",
            approverId: input.actorUserId,
            rejectionReason: JSON.stringify({
              ...meta,
              stage: "REJECTED",
              managerDecisionAt: new Date().toISOString(),
              managerDecisionBy: input.actorUserId,
              note: input.note
            } satisfies ApprovalMeta)
          }
        });
      }

      return prisma.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: "PENDING",
          approverId: input.actorUserId,
          rejectionReason: JSON.stringify({
            ...meta,
            stage: "HR_PENDING",
            managerDecisionAt: new Date().toISOString(),
            managerDecisionBy: input.actorUserId,
            note: input.note
          } satisfies ApprovalMeta)
        }
      });
    }

    if (meta.stage === "HR_PENDING") {
      if (!["HR_ADMIN", "SUPER_ADMIN"].includes(input.actorRole)) throw new AppError("Only HR/Admin can finalize", 403);

      if (input.decision === "REJECTED") {
        return prisma.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED",
            approverId: input.actorUserId,
            rejectionReason: JSON.stringify({
              ...meta,
              stage: "REJECTED",
              hrDecisionAt: new Date().toISOString(),
              hrDecisionBy: input.actorUserId,
              note: input.note
            } satisfies ApprovalMeta)
          }
        });
      }

      const leaveDays = diffDaysInclusive(request.startDate, request.endDate);
      const year = request.startDate.getFullYear();

      return prisma.$transaction(async (tx) => {
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: request.employeeId,
              leaveTypeId: request.leaveTypeId,
              year
            }
          }
        });
        if (!balance) throw new AppError("Leave balance missing", 422);
        const remaining = Number(balance.allocated) - Number(balance.used);
        if (remaining < leaveDays) throw new AppError("Insufficient leave balance", 422);

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { used: Number(balance.used) + leaveDays }
        });

        return tx.leaveRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            approverId: input.actorUserId,
            rejectionReason: JSON.stringify({
              ...meta,
              stage: "COMPLETED",
              hrDecisionAt: new Date().toISOString(),
              hrDecisionBy: input.actorUserId,
              note: input.note
            } satisfies ApprovalMeta)
          }
        });
      });
    }

    throw new AppError("Invalid leave workflow stage", 409);
  }
}

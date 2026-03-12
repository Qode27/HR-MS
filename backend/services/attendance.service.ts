import { prisma } from "@/lib/db";
import { AttendanceStatus } from "@prisma/client";
import { AppError } from "@backend/utils/errors";

const FULL_DAY_MINUTES = 8 * 60;
const HALF_DAY_MINUTES = 4 * 60;
const DEFAULT_SHIFT_START = { hour: 9, minute: 30 };

type RegularizationPayload = {
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string;
  requestedAt: string;
  decisionBy?: string;
  decisionAt?: string;
  decisionNote?: string;
};

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function computeLateMinutes(checkIn: Date) {
  const shiftStart = new Date(checkIn);
  shiftStart.setHours(DEFAULT_SHIFT_START.hour, DEFAULT_SHIFT_START.minute, 0, 0);
  return Math.max(0, Math.floor((checkIn.getTime() - shiftStart.getTime()) / 60000));
}

function classifyStatus(workMinutes: number, baseStatus: AttendanceStatus): AttendanceStatus {
  if (["HOLIDAY", "WEEK_OFF", "ON_LEAVE"].includes(baseStatus)) return baseStatus;
  if (workMinutes < HALF_DAY_MINUTES) return "ABSENT";
  if (workMinutes < FULL_DAY_MINUTES) return "HALF_DAY";
  return "PRESENT";
}

function getRegularization(note?: string | null): RegularizationPayload | null {
  if (!note) return null;
  try {
    const parsed = JSON.parse(note) as RegularizationPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.status) return null;
    return parsed;
  } catch {
    return null;
  }
}

export class AttendanceService {
  async mark(employeeId: string) {
    const now = new Date();
    const date = startOfDay(now);

    const [existing, holiday] = await Promise.all([
      prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } }),
      prisma.holiday.findFirst({ where: { date } })
    ]);

    const day = now.getDay();
    const defaultStatus: AttendanceStatus = holiday ? "HOLIDAY" : day === 0 || day === 6 ? "WEEK_OFF" : "PRESENT";

    if (!existing) {
      if (defaultStatus === "HOLIDAY" || defaultStatus === "WEEK_OFF") {
        const record = await prisma.attendance.create({
          data: { employeeId, date, status: defaultStatus }
        });
        return { mode: "blocked", record, message: `Today is marked as ${defaultStatus}` };
      }

      const lateMinutes = computeLateMinutes(now);
      const created = await prisma.attendance.create({
        data: { employeeId, date, checkIn: now, status: "PRESENT", lateMinutes }
      });
      return { mode: "check-in", record: created, message: "Check-in captured" };
    }

    if (existing.checkOut) {
      throw new AppError("Attendance already completed for today", 409);
    }

    const workMinutes = existing.checkIn ? Math.max(0, Math.floor((now.getTime() - existing.checkIn.getTime()) / 60000)) : 0;
    const status = classifyStatus(workMinutes, existing.status);
    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOut: now, workMinutes, status }
    });

    return {
      mode: "check-out",
      record: updated,
      overtimeMinutes: Math.max(0, workMinutes - FULL_DAY_MINUTES),
      message: "Check-out captured"
    };
  }

  async list(input: {
    page: number;
    pageSize: number;
    month?: number;
    year?: number;
    q?: string;
    employeeId?: string;
    status?: AttendanceStatus;
  }) {
    const start = input.month && input.year ? new Date(input.year, input.month - 1, 1) : undefined;
    const end = input.month && input.year ? new Date(input.year, input.month, 0, 23, 59, 59, 999) : undefined;

    const where = {
      employeeId: input.employeeId || undefined,
      status: input.status || undefined,
      date: start && end ? { gte: start, lte: end } : undefined,
      employee: input.q
        ? {
            OR: [
              { firstName: { contains: input.q, mode: "insensitive" as const } },
              { lastName: { contains: input.q, mode: "insensitive" as const } },
              { employeeCode: { contains: input.q, mode: "insensitive" as const } }
            ]
          }
        : undefined
    };

    const skip = (input.page - 1) * input.pageSize;
    const [items, total, grouped] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: input.pageSize
      }),
      prisma.attendance.count({ where }),
      prisma.attendance.groupBy({ by: ["status"], where, _count: true })
    ]);

    const summary = {
      present: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      holiday: 0,
      weekOff: 0,
      averageWorkMinutes: 0
    };

    for (const g of grouped) {
      if (g.status === "PRESENT") summary.present = g._count;
      if (g.status === "ABSENT") summary.absent = g._count;
      if (g.status === "HALF_DAY") summary.halfDay = g._count;
      if (g.status === "ON_LEAVE") summary.onLeave = g._count;
      if (g.status === "HOLIDAY") summary.holiday = g._count;
      if (g.status === "WEEK_OFF") summary.weekOff = g._count;
    }
    summary.averageWorkMinutes = items.length > 0 ? Math.round(items.reduce((acc, row) => acc + row.workMinutes, 0) / items.length) : 0;

    return { items, total, summary };
  }

  async requestRegularization(input: {
    employeeId: string;
    attendanceId: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason: string;
  }) {
    const attendance = await prisma.attendance.findFirst({ where: { id: input.attendanceId, employeeId: input.employeeId } });
    if (!attendance) throw new AppError("Attendance record not found", 404);

    const existing = getRegularization(attendance.regularizationNote);
    if (existing?.status === "PENDING") throw new AppError("Regularization already pending", 409);

    const payload: RegularizationPayload = {
      requestedCheckIn: input.requestedCheckIn,
      requestedCheckOut: input.requestedCheckOut,
      reason: input.reason,
      status: "PENDING",
      requestedBy: input.employeeId,
      requestedAt: new Date().toISOString()
    };

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: { regularizationNote: JSON.stringify(payload) }
    });
  }

  async listRegularizations(input: { employeeId?: string; onlyPending?: boolean }) {
    const rows = await prisma.attendance.findMany({
      where: {
        employeeId: input.employeeId || undefined,
        regularizationNote: { not: null }
      },
      include: { employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true } } },
      orderBy: { updatedAt: "desc" },
      take: 200
    });

    const mapped = rows
      .map((r) => ({ ...r, regularization: getRegularization(r.regularizationNote) }))
      .filter((r) => r.regularization)
      .filter((r) => (input.onlyPending ? r.regularization?.status === "PENDING" : true));

    return mapped;
  }

  async decideRegularization(input: {
    attendanceId: string;
    decision: "APPROVED" | "REJECTED";
    decisionBy: string;
    note?: string;
  }) {
    const attendance = await prisma.attendance.findUnique({ where: { id: input.attendanceId } });
    if (!attendance) throw new AppError("Attendance record not found", 404);

    const existing = getRegularization(attendance.regularizationNote);
    if (!existing || existing.status !== "PENDING") throw new AppError("No pending regularization found", 409);

    const next: RegularizationPayload = {
      ...existing,
      status: input.decision,
      decisionBy: input.decisionBy,
      decisionAt: new Date().toISOString(),
      decisionNote: input.note
    };

    if (input.decision === "REJECTED") {
      return prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          regularizationNote: JSON.stringify(next),
          approvedByUserId: input.decisionBy
        }
      });
    }

    const requestedIn = existing.requestedCheckIn ? new Date(existing.requestedCheckIn) : attendance.checkIn;
    const requestedOut = existing.requestedCheckOut ? new Date(existing.requestedCheckOut) : attendance.checkOut;
    if (!requestedIn || !requestedOut) throw new AppError("Requested check-in and check-out are required", 422);

    const workMinutes = Math.max(0, Math.floor((requestedOut.getTime() - requestedIn.getTime()) / 60000));
    const status = classifyStatus(workMinutes, attendance.status);

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkIn: requestedIn,
        checkOut: requestedOut,
        workMinutes,
        status,
        lateMinutes: computeLateMinutes(requestedIn),
        approvedByUserId: input.decisionBy,
        regularizationNote: JSON.stringify(next)
      }
    });
  }
}

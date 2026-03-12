import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AttendanceService } from "@backend/services/attendance.service";
import { AppError } from "@backend/utils/errors";
import { prisma } from "@/lib/db";

const service = new AttendanceService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const session = mine ? await requirePermission(req, "attendance:self") : await requirePermission(req, "attendance:read");

  let employeeId: string | undefined;
  if (mine) {
    const employee = await prisma.employee.findFirst({ where: { userId: session.sub } });
    employeeId = employee?.id;
  }

  const rows = await service.listRegularizations({ employeeId, onlyPending: searchParams.get("pending") === "1" });
  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "attendance:self");
  const employee = await prisma.employee.findFirst({ where: { userId: session.sub } });
  if (!employee) throw new AppError("Employee profile missing", 404);

  const payload = await req.json();
  if (!payload?.attendanceId) throw new AppError("attendanceId is required", 422);
  if (!payload?.reason) throw new AppError("reason is required", 422);

  const row = await service.requestRegularization({
    employeeId: employee.id,
    attendanceId: String(payload.attendanceId),
    reason: String(payload.reason),
    requestedCheckIn: payload.requestedCheckIn,
    requestedCheckOut: payload.requestedCheckOut
  });

  return success(row, undefined, 201);
});

import { NextRequest } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AttendanceService } from "@backend/services/attendance.service";
import { prisma } from "@/lib/db";

const service = new AttendanceService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  if (mine) {
    await requirePermission(req, "attendance:self");
  } else {
    await requirePermission(req, "attendance:read");
  }
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const month = searchParams.get("month") ? Number(searchParams.get("month")) : undefined;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
  const q = searchParams.get("q") || "";
  const status = (searchParams.get("status") as AttendanceStatus | null) || undefined;

  let employeeId: string | undefined;
  if (mine) {
    const session = await requirePermission(req, "attendance:self");
    const employee = await prisma.employee.findFirst({ where: { userId: session.sub } });
    employeeId = employee?.id;
  }

  const result = await service.list({ page, pageSize, month, year, q, status, employeeId });
  return success({ page, pageSize, total: result.total, summary: result.summary, items: result.items });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "attendance:self");
  const employee = await prisma.employee.findFirst({ where: { userId: session.sub } });
  if (!employee) return success({ message: "No employee linked" }, undefined, 404);

  const data = await service.mark(employee.id);
  return success(data);
});

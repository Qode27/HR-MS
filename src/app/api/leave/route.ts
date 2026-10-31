import { NextRequest } from "next/server";
import { leaveApplySchema } from "@/lib/validators/schemas";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission, requireRole } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { parseBody } from "@backend/utils/request";
import { LeaveService } from "@backend/services/leave.service";
import { AppError } from "@backend/utils/errors";
import { LeaveStatus } from "@prisma/client";

const service = new LeaveService();
const leaveStatuses = new Set(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requireRole(req, ["SUPER_ADMIN", "ADMIN", "HR_ADMIN", "MANAGER", "EMPLOYEE"]);
  const searchParams = req.nextUrl.searchParams;
  const scope = searchParams.get("scope") || (session.role === "EMPLOYEE" ? "self" : session.role === "MANAGER" ? "team" : "management");
  const statusParam = searchParams.get("status") || undefined;
  const status = statusParam && leaveStatuses.has(statusParam) ? (statusParam as LeaveStatus) : undefined;
  if (statusParam && !status) throw new AppError("Invalid leave status", 422);

  if (scope === "self") {
    if (session.role !== "EMPLOYEE") throw new AppError("Employee leave view is only available to employees", 403);
    const dashboard = await service.selfDashboard(session.sub, session.tenantId);
    return success({
      scope: "self",
      leaveTypes: dashboard.leaveTypes,
      balances: dashboard.balances,
      requests: dashboard.requests
    });
  }

  if (scope === "team") {
    const data = await service.teamDashboard({ userId: session.sub, role: session.role, tenantId: session.tenantId, status });
    return success(data);
  }

  if (scope === "management") {
    const data = await service.managementDashboard({
      userId: session.sub,
      role: session.role,
      tenantId: session.tenantId,
      status,
      employeeId: searchParams.get("employeeId") || undefined,
      departmentId: searchParams.get("departmentId") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined
    });
    return success(data);
  }

  throw new AppError("Invalid leave scope", 422);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "leave:self");
  if (session.role !== "EMPLOYEE") throw new AppError("Only employees can apply for leave", 403);
  const payload = parseBody(leaveApplySchema, await req.json());

  const leave = await service.apply({
    userId: session.sub,
    leaveTypeId: payload.leaveTypeId,
    startDate: payload.startDate,
    endDate: payload.endDate,
    reason: payload.reason
  });

  return success(leave, undefined, 201);
});

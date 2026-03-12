import { NextRequest } from "next/server";
import { leaveApplySchema } from "@/lib/validators/schemas";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { parseBody } from "@backend/utils/request";
import { LeaveService } from "@backend/services/leave.service";

const service = new LeaveService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "leave:self");
  const dashboard = await service.selfDashboard(session.sub);

  let approvalQueue: unknown[] = [];
  if (["MANAGER", "HR_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
    approvalQueue = await service.approvalQueue({ userId: session.sub, role: session.role });
  }

  return success({
    leaveTypes: dashboard.leaveTypes,
    balances: dashboard.balances,
    requests: dashboard.requests,
    approvalQueue
  });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "leave:self");
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

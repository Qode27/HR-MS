import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { LeaveService } from "@backend/services/leave.service";

type Params = { params: Promise<{ id: string }> };
const service = new LeaveService();

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "leave:self");
  if (session.role !== "EMPLOYEE") throw new AppError("Only employees can cancel their own leave requests", 403);
  const leave = await service.cancelOwn({ leaveRequestId: id, userId: session.sub, tenantId: session.tenantId });
  return success(leave);
});

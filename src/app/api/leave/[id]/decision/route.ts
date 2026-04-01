import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { LeaveService } from "@backend/services/leave.service";

type Params = { params: Promise<{ id: string }> };
const service = new LeaveService();

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "leave:approve");
  const payload = await req.json();
  if (!["APPROVED", "REJECTED"].includes(payload?.decision)) throw new AppError("Invalid decision", 422);

  const leave = await service.decide({
    leaveRequestId: id,
    decision: payload.decision,
    actorUserId: session.sub,
    actorRole: session.role,
    note: payload.note
  });

  return success(leave);
});

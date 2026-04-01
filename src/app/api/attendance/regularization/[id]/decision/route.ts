import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AttendanceService } from "@backend/services/attendance.service";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };
const service = new AttendanceService();

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "attendance:manage");
  const payload = await req.json();
  const decision = payload?.decision;
  if (decision !== "APPROVED" && decision !== "REJECTED") throw new AppError("Invalid decision", 422);

  const updated = await service.decideRegularization({
    attendanceId: id,
    decision,
    decisionBy: session.sub,
    note: payload?.note
  });

  return success(updated);
});

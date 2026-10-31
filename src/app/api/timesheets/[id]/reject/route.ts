import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { TimesheetService } from "@backend/services/timesheet.service";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };

const service = new TimesheetService();

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "timesheet:approve");
  const { id } = await params;
  const payload = await req.json().catch(() => ({}));
  const entry = await service.decide({
    tenantId: session.tenantId,
    userId: session.sub,
    role: session.role,
    id,
    decision: "REJECTED",
    comment: payload?.comment || payload?.note
  });
  return success(entry, undefined, 200, "Timesheet rejected");
});

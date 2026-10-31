import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { TimesheetService } from "@backend/services/timesheet.service";
import { success } from "@backend/utils/api-response";

type Params = { params: Promise<{ id: string }> };

const service = new TimesheetService();

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "timesheet:self");
  const { id } = await params;
  const entry = await service.submit({
    tenantId: session.tenantId,
    userId: session.sub,
    id
  });
  return success(entry, undefined, 200, "Timesheet submitted");
});

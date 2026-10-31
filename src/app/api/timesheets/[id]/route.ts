import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { TimesheetService } from "@backend/services/timesheet.service";
import { success } from "@backend/utils/api-response";
import { parseBody } from "@backend/utils/request";
import { timesheetEntrySchema } from "@/lib/validators/schemas";

type Params = { params: Promise<{ id: string }> };

const service = new TimesheetService();

export const PUT = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "timesheet:self");
  const { id } = await params;
  const payload = parseBody(timesheetEntrySchema, await req.json());
  const entry = await service.update({
    tenantId: session.tenantId,
    userId: session.sub,
    id,
    date: new Date(payload.date),
    projectName: payload.projectName || payload.project || "",
    taskDescription: payload.taskDescription || payload.task || "",
    hoursWorked: Number(payload.hoursWorked ?? payload.hours)
  });
  return success(entry, undefined, 200, "Timesheet updated");
});

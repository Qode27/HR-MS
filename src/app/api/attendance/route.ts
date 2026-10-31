import { NextRequest } from "next/server";
import { TimesheetStatus } from "@prisma/client";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { TimesheetService } from "@backend/services/timesheet.service";

const service = new TimesheetService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const session = await requirePermission(req, mine ? "timesheet:self" : "timesheet:read");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const status = (searchParams.get("status") as TimesheetStatus | null) || undefined;
  const from = searchParams.get("from") ? new Date(String(searchParams.get("from"))) : undefined;
  const to = searchParams.get("to") ? new Date(String(searchParams.get("to"))) : undefined;

  const result = await service.list({
    tenantId: session.tenantId,
    userId: session.sub,
    role: session.role,
    page,
    pageSize,
    status,
    from,
    to,
    q: searchParams.get("q") || "",
    mine
  });
  return success({ page, pageSize, total: result.total, summary: result.summary, items: result.items }, undefined, 200, "Timesheets loaded");
});

export const POST = withApiGuard(async () => {
  throw new AppError("Punch attendance has been replaced by timesheets. Use POST /api/timesheets.", 410);
});

import { NextRequest } from "next/server";
import { TimesheetStatus } from "@prisma/client";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { TimesheetService } from "@backend/services/timesheet.service";
import { success } from "@backend/utils/api-response";
import { parseBody } from "@backend/utils/request";
import { timesheetDecisionSchema, timesheetEntrySchema } from "@/lib/validators/schemas";

const service = new TimesheetService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "1";
  const session = await requirePermission(req, mine ? "timesheet:self" : "timesheet:read");
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "20")));
  const status = (searchParams.get("status") as TimesheetStatus | null) || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const from = searchParams.get("from") ? new Date(String(searchParams.get("from"))) : undefined;
  const to = searchParams.get("to") ? new Date(String(searchParams.get("to"))) : undefined;
  const q = searchParams.get("q") || "";

  const result = await service.list({
    tenantId: session.tenantId,
    userId: session.sub,
    role: session.role,
    page,
    pageSize,
    status,
    employeeId,
    from,
    to,
    q,
    mine
  });

  return success({ page, pageSize, total: result.total, summary: result.summary, items: result.items });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "timesheet:self");
  const payload = parseBody(timesheetEntrySchema, await req.json());
  const entry = await service.create({
    tenantId: session.tenantId,
    userId: session.sub,
    date: new Date(payload.date),
    projectName: payload.projectName || payload.project || "",
    taskDescription: payload.taskDescription || payload.task || "",
    hoursWorked: Number(payload.hoursWorked ?? payload.hours)
  });
  return success(entry, undefined, 201);
});

export const PATCH = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "timesheet:approve");
  const payload = parseBody(timesheetDecisionSchema, await req.json());
  const entry = await service.decide({
    tenantId: session.tenantId,
    userId: session.sub,
    role: session.role,
    id: payload.id,
    decision: payload.decision,
    comment: payload.comment || payload.note
  });
  return success(entry);
});

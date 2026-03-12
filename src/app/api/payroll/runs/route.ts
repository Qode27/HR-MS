import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { PayrollService } from "@backend/services/payroll.service";

const service = new PayrollService();

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "payroll:manage");
  const runs = await service.listRuns();
  return success(runs);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "payroll:manage");
  const { month, year } = await req.json();
  const run = await service.runPayroll({ month: Number(month), year: Number(year), actorUserId: session.sub });
  return success(run, undefined, 201);
});

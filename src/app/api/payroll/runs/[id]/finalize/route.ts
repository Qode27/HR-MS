import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { PayrollService } from "@backend/services/payroll.service";

type Params = { params: Promise<{ id: string }> };
const service = new PayrollService();

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "payroll:manage");
  const { id } = await params;
  const run = await service.finalizeRun({ runId: id, actorUserId: session.sub });
  return success(run);
});

import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { PayrollService } from "@backend/services/payroll.service";

const service = new PayrollService();

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "payroll:self");
  const payslips = await service.selfPayslips(session.sub);
  return success(payslips);
});

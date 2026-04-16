import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { PayrollService } from "@backend/services/payroll.service";

const service = new PayrollService();

export const GET = withApiGuard(async (_req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canReadPayroll, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "payroll:manage"),
    hasPermissionDynamic(session.role, "payroll:read"),
    hasPermissionDynamic(session.role, "payroll:self")
  ]);

  if (canManage || canReadPayroll) {
    const data = await service.adminOverview();
    return success({ role: session.role, canManage: canManage, ...data });
  }

  if (canSelf) {
    const payslips = await service.selfPayslips(session.sub);
    return success({
      role: session.role,
      canManage: false,
      totals: {
        runs: payslips.length,
        draft: 0,
        completed: payslips.length,
        net: payslips.reduce((sum, slip) => sum + Number(slip.payrollItem.netPay), 0),
        employees: 1
      },
      payslips
    });
  }

  throw new AppError("Forbidden", 403);
});

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
  const canManage = await hasPermissionDynamic(session.role, "payroll:manage");
  const canRead = await hasPermissionDynamic(session.role, "payroll:read");
  const canSelf = await hasPermissionDynamic(session.role, "payroll:self");
  if (canManage || canRead) return success({ role: session.role, canManage, ...(await service.adminOverview(session.tenantId)) });
  if (canSelf) {
    const payslips = await service.selfPayslips(session.sub, session.tenantId);
    return success({
      role: session.role,
      canManage: false,
      totals: { runs: payslips.length, locked: payslips.length, processing: 0, net: payslips.reduce((sum, slip) => sum + Number(slip.payrollItem.netPay), 0), gross: payslips.reduce((sum, slip) => sum + Number(slip.payrollItem.grossPay), 0), approvedHours: 0, employees: 1 },
      payslips
    });
  }
  throw new AppError("Forbidden", 403);
});

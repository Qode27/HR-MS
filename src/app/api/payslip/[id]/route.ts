import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { AppError } from "@backend/utils/errors";
import { PayrollService } from "@backend/services/payroll.service";

type Params = { params: Promise<{ id: string }> };

const service = new PayrollService();

export const GET = withApiGuard(async (_req: NextRequest, { params }: Params) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);
  const canAccess = (await hasPermissionDynamic(session.role, "payroll:self")) || (await hasPermissionDynamic(session.role, "payroll:read")) || (await hasPermissionDynamic(session.role, "payroll:manage"));
  if (!canAccess) throw new AppError("Forbidden", 403);
  const { id } = await params;
  const pdf = await service.payslipPdf({ payrollItemId: id, userId: session.sub, role: session.role, tenantId: session.tenantId });
  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="payslip-${id}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
});

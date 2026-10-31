import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "ats:manage");
  const tenantWhere = session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId ?? "__missing_tenant__" };
  const [requisitions, recruiters, locations] = await Promise.all([
    prisma.jobRequisition.findMany({
      where: { opening: null, ...tenantWhere },
      include: { department: true },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.user.findMany({
      where: { ...tenantWhere, role: { name: { in: ["SUPER_ADMIN", "HR_ADMIN", "RECRUITER"] } } },
      select: { id: true, fullName: true, email: true },
      take: 50
    }),
    prisma.workLocation.findMany({ where: tenantWhere, orderBy: { name: "asc" }, take: 50 })
  ]);

  return success({ requisitions, recruiters, locations });
});

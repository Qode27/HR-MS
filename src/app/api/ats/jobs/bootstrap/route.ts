import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  const [requisitions, recruiters, locations] = await Promise.all([
    prisma.jobRequisition.findMany({
      where: { opening: null },
      include: { department: true },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.user.findMany({
      where: { role: { name: { in: ["SUPER_ADMIN", "HR_ADMIN", "RECRUITER"] } } },
      select: { id: true, fullName: true, email: true },
      take: 50
    }),
    prisma.workLocation.findMany({ orderBy: { name: "asc" }, take: 50 })
  ]);

  return success({ requisitions, recruiters, locations });
});

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

type Params = { params: { id: string } };

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "ats:manage");
  const row = await prisma.jobOpening.findUnique({
    where: { id: params.id },
    include: {
      requisition: true,
      candidates: { orderBy: { createdAt: "desc" } },
      interviews: { orderBy: { scheduledAt: "desc" } },
      offers: true
    }
  });
  return success(row);
});

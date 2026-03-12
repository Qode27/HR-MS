import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { prisma } from "@/lib/db";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "onboarding:manage");
  const tasks = await prisma.onboardingTask.findMany({
    include: { employee: true, candidate: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  return success(tasks);
});

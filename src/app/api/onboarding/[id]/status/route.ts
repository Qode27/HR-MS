import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "onboarding:manage");
  const tasks = await prisma.onboardingTask.findMany({
    include: { employee: true, candidate: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
  return success(tasks);
});

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  await requirePermission(req, "onboarding:manage");
  const { id } = await params;
  const payload = await req.json();
  if (!["TODO", "IN_PROGRESS", "DONE", "BLOCKED"].includes(payload?.status)) throw new AppError("Invalid status", 422);

  const task = await prisma.onboardingTask.update({
    where: { id },
    data: { status: payload.status }
  });

  return success(task);
});

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const POST = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:manage");
  const payload = await req.json();
  if (!payload?.employeeId || !payload?.cycleId || !payload?.title) throw new AppError("employeeId, cycleId, title required", 422);

  const row = await prisma.performanceGoal.create({
    data: {
      employeeId: payload.employeeId,
      cycleId: payload.cycleId,
      title: String(payload.title).slice(0, 200),
      description: payload.description ? String(payload.description).slice(0, 2000) : undefined,
      targetValue: payload.targetValue ? Number(payload.targetValue) : undefined,
      weight: payload.weight ? Number(payload.weight) : 10
    }
  });

  return success(row, undefined, 201);
});

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:read");
  const [cycles, reviews] = await Promise.all([
    prisma.performanceCycle.findMany({ orderBy: { createdAt: "desc" }, include: { goals: true } }),
    prisma.performanceReview.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
  ]);

  return success({ cycles, reviews });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:manage");
  const payload = await req.json();

  const cycle = await prisma.performanceCycle.create({
    data: {
      name: payload.name,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      status: payload.status || "DRAFT"
    }
  });
  return success(cycle, undefined, 201);
});

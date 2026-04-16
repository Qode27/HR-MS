import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { candidateStageSchema } from "@/lib/validators/schemas";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  await requirePermission(req, "ats:manage");
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      jobOpening: { include: { requisition: true } },
      comments: { orderBy: { createdAt: "desc" } },
      activity: { orderBy: { createdAt: "desc" } },
      interviews: { orderBy: { scheduledAt: "desc" } },
      offer: true,
      onboardingTasks: true,
      documents: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!candidate) throw new AppError("Candidate not found", 404);
  return success(candidate);
});

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "ats:manage");
  const { id } = await params;
  const payload = parseBody(candidateStageSchema, await req.json());
  const updated = await prisma.candidate.update({
    where: { id },
    data: {
      stage: payload.stage,
      rejectionReason: payload.rejectionReason,
      activity: { create: { action: "Stage changed", meta: { to: payload.stage, by: session.sub } } }
    }
  });
  return success(updated);
});

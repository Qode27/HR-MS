import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  const rows = await prisma.interview.findMany({
    include: {
      candidate: { select: { id: true, fullName: true, stage: true } },
      jobOpening: { select: { id: true, title: true } },
      feedback: true
    },
    orderBy: { scheduledAt: "desc" },
    take: 200
  });
  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "ats:manage");
  const payload = await req.json();
  if (!payload?.candidateId || !payload?.jobOpeningId || !payload?.scheduledAt) throw new AppError("candidateId, jobOpeningId, scheduledAt are required", 422);

  const row = await prisma.interview.create({
    data: {
      candidateId: payload.candidateId,
      jobOpeningId: payload.jobOpeningId,
      scheduledById: session.sub,
      scheduledAt: new Date(payload.scheduledAt),
      mode: payload.mode || "Video",
      panelists: Array.isArray(payload.panelists) ? payload.panelists.slice(0, 10).map(String) : [],
      notes: payload.notes ? String(payload.notes).slice(0, 2000) : null
    }
  });

  await prisma.candidate.update({
    where: { id: payload.candidateId },
    data: {
      stage: "INTERVIEW_SCHEDULED",
      activity: { create: { action: "Interview scheduled", meta: { interviewId: row.id } } }
    }
  });

  return success(row, undefined, 201);
});

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "ats:manage");
  const tenantWhere = session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId ?? "__missing_tenant__" };
  const rows = await prisma.interview.findMany({
    where: { jobOpening: tenantWhere },
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

  const tenantWhere = session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId ?? "__missing_tenant__" };
  const job = await prisma.jobOpening.findFirst({ where: { id: payload.jobOpeningId, ...tenantWhere }, select: { id: true, tenantId: true } });
  if (!job) throw new AppError("Job opening not found", 404);
  const candidate = await prisma.candidate.findFirst({ where: { id: payload.candidateId, ...tenantWhere }, select: { id: true } });
  if (!candidate) throw new AppError("Candidate not found", 404);

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

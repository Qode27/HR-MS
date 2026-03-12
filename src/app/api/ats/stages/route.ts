import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

const defaults = [
  { stage: "APPLIED", order: 1, label: "Applied" },
  { stage: "SCREENING", order: 2, label: "Screening" },
  { stage: "SHORTLISTED", order: 3, label: "Shortlisted" },
  { stage: "INTERVIEW_SCHEDULED", order: 4, label: "Interview" },
  { stage: "INTERVIEWED", order: 5, label: "Technical" },
  { stage: "SELECTED", order: 6, label: "HR Round" },
  { stage: "OFFERED", order: 7, label: "Offer" },
  { stage: "JOINED", order: 8, label: "Hired" },
  { stage: "REJECTED", order: 9, label: "Rejected" },
  { stage: "ON_HOLD", order: 10, label: "On Hold" }
] as const;

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  const rows = await prisma.recruitmentStageConfig.findMany({ orderBy: { order: "asc" } });
  if (rows.length > 0) return success(rows);
  await prisma.recruitmentStageConfig.createMany({ data: defaults as never });
  return success(await prisma.recruitmentStageConfig.findMany({ orderBy: { order: "asc" } }));
});

export const PUT = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "ats:manage");
  const payload = (await req.json()) as Array<{ stage: string; order: number; label: string }>;
  await prisma.$transaction(
    payload.map((row) =>
      prisma.recruitmentStageConfig.upsert({
        where: { stage: row.stage as never },
        update: { order: row.order, label: row.label },
        create: { stage: row.stage as never, order: row.order, label: row.label }
      })
    )
  );
  return success(await prisma.recruitmentStageConfig.findMany({ orderBy: { order: "asc" } }));
});

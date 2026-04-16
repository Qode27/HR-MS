import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  await requirePermission(req, "ats:manage");
  const { id } = await params;
  const row = await prisma.jobOpening.findUnique({
    where: { id },
    include: {
      requisition: true,
      candidates: { orderBy: { createdAt: "desc" } },
      interviews: { orderBy: { scheduledAt: "desc" } },
      offers: true
    }
  });
  if (!row) throw new AppError("Job opening not found", 404);
  return success(row);
});

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "ats:manage");
  const { id } = await params;
  const payload = await req.json();
  const updated = await prisma.jobOpening.update({
    where: { id },
    data: {
      title: payload?.title ? String(payload.title).slice(0, 120) : undefined,
      description: payload?.description ? String(payload.description).slice(0, 5000) : undefined,
      status: payload?.status || undefined,
      openingsCount: payload?.openingsCount ? Number(payload.openingsCount) : undefined,
      recruiterId: payload?.recruiterId ? String(payload.recruiterId) : payload?.recruiterId === "" ? null : undefined,
      closeDate: payload?.closeDate ? new Date(String(payload.closeDate)) : payload?.closeDate === "" ? null : undefined
    }
  });
  return success(updated);
});

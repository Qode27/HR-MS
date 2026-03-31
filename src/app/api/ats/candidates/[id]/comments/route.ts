import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "ats:manage");
  const { id } = await params;
  const body = await req.json();
  if (!body?.comment) throw new AppError("Comment is required", 422);

  const row = await prisma.candidateComment.create({
    data: {
      candidateId: id,
      authorId: session.sub,
      comment: String(body.comment).slice(0, 2000)
    }
  });

  await prisma.candidateActivity.create({
    data: {
      candidateId: id,
      action: "Comment added",
      meta: { by: session.sub }
    }
  });

  return success(row, undefined, 201);
});

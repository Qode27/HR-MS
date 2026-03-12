import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "dashboard:read");
  const rows = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "settings:manage");
  const payload = await req.json();
  if (!payload?.title || !payload?.content) throw new AppError("title and content required", 422);

  const row = await prisma.announcement.create({
    data: {
      title: String(payload.title).slice(0, 200),
      content: String(payload.content).slice(0, 5000),
      publishedById: session.sub,
      publishedAt: new Date(),
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined
    }
  });

  return success(row, undefined, 201);
});

import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { prisma } from "@/lib/db";
import { AppError } from "@backend/utils/errors";

type Params = { params: { id: string } };

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "dashboard:read");
  const row = await prisma.notification.findFirst({ where: { id: params.id, userId: session.sub } });
  if (!row) throw new AppError("Notification not found", 404);

  const updated = await prisma.notification.update({ where: { id: row.id }, data: { readAt: new Date() } });
  return success(updated);
});

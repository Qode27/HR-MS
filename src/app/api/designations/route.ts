import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "settings:manage");
  const rows = await prisma.designation.findMany({ where: session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId }, orderBy: { name: "asc" } });
  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "settings:manage");
  const payload = await req.json();
  if (!payload?.name) throw new AppError("Designation name is required", 422);
  const row = await prisma.designation.create({ data: { tenantId: session.role === "MASTER_ADMIN" ? null : session.tenantId, name: payload.name } });
  return success(row, undefined, 201);
});

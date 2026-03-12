import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "settings:manage");
  const rows = await prisma.department.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "settings:manage");
  const payload = await req.json();
  if (!payload?.name) throw new AppError("Department name is required", 422);
  if (!payload?.code) throw new AppError("Department code is required", 422);
  const row = await prisma.department.create({ data: { name: payload.name, code: payload.code } });
  return success(row, undefined, 201);
});

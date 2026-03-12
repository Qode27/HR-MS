import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac";
import { AppError } from "@backend/utils/errors";

export async function requirePermission(req: NextRequest, permission: string) {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);
  if (!(await hasPermissionDynamic(session.role, permission))) throw new AppError("Forbidden", 403);
  return session;
}

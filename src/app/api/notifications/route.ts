import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/http";
import { withPermission } from "@/lib/server";

export async function GET(req: NextRequest) {
  const access = await withPermission(req, "dashboard:read");
  if (access.error) return access.error;
  const notifications = await prisma.notification.findMany({ where: { userId: access.session!.sub }, orderBy: { createdAt: "desc" }, take: 50 });
  return ok(notifications);
}

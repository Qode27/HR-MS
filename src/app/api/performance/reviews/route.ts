import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "employee:read");
  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId") || undefined;

  const rows = await prisma.performanceReview.findMany({
    where: { cycleId },
    include: {
      employee: { select: { id: true, employeeCode: true, firstName: true, lastName: true, manager: { include: { user: true } } } },
      cycle: true
    },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  if (session.role === "EMPLOYEE") {
    const employee = await prisma.employee.findFirst({ where: { userId: session.sub } });
    return success(rows.filter((r) => r.employeeId === employee?.id));
  }

  return success(rows);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "employee:read");
  const payload = await req.json();
  if (!payload?.employeeId || !payload?.cycleId) throw new AppError("employeeId and cycleId required", 422);

  const employee = await prisma.employee.findUnique({ where: { id: payload.employeeId }, include: { manager: { include: { user: true } }, user: true } });
  if (!employee) throw new AppError("Employee not found", 404);

  const existing = await prisma.performanceReview.findUnique({ where: { employeeId_cycleId: { employeeId: payload.employeeId, cycleId: payload.cycleId } } });

  let patch: Record<string, unknown> = {};
  if (session.role === "EMPLOYEE") {
    if (employee.userId !== session.sub) throw new AppError("Cannot submit for another employee", 403);
    patch = { selfRating: Number(payload.selfRating), notes: payload.notes ? String(payload.notes).slice(0, 2000) : undefined };
  } else if (session.role === "MANAGER") {
    if (employee.manager?.user?.id !== session.sub) throw new AppError("Cannot review outside your team", 403);
    patch = { managerRating: Number(payload.managerRating), notes: payload.notes ? String(payload.notes).slice(0, 2000) : undefined, reviewerId: session.sub };
  } else if (["HR_ADMIN", "SUPER_ADMIN"].includes(session.role)) {
    patch = {
      selfRating: payload.selfRating ? Number(payload.selfRating) : undefined,
      managerRating: payload.managerRating ? Number(payload.managerRating) : undefined,
      notes: payload.notes ? String(payload.notes).slice(0, 2000) : undefined,
      reviewerId: session.sub
    };
  } else {
    throw new AppError("Forbidden", 403);
  }

  const row = existing
    ? await prisma.performanceReview.update({ where: { id: existing.id }, data: patch })
    : await prisma.performanceReview.create({ data: { employeeId: payload.employeeId, cycleId: payload.cycleId, ...patch } });

  return success(row);
});

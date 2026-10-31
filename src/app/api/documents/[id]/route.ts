import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { writeAuditLog } from "@/lib/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export const DELETE = withApiGuard(async (_req: NextRequest, { params }: Params) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canSelf) throw new AppError("Forbidden", 403);

  const { id } = await params;
  const tenantId = session.role === "MASTER_ADMIN" ? undefined : session.tenantId ?? "__missing_tenant__";
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) throw new AppError("Document not found", 404);
  if (tenantId && doc.tenantId !== tenantId) throw new AppError("Document not found", 404);

  const employee = canSelf
    ? await prisma.employee.findFirst({
        where: { userId: session.sub, ...(tenantId ? { tenantId } : {}) },
        select: { id: true }
      })
    : null;

  const allowed = canManage || (canSelf && doc.scope === "EMPLOYEE" && doc.employeeId === employee?.id);
  if (!allowed) throw new AppError("Forbidden", 403);

  await prisma.document.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedById: session.sub
    }
  });

  await writeAuditLog({
    userId: session.sub,
    action: "DELETE",
    module: "DOCUMENT",
    entityId: id,
    meta: { version: doc.version, scope: doc.scope, employeeId: doc.employeeId }
  });

  return success({ id }, undefined, 200, "Document deleted");
});

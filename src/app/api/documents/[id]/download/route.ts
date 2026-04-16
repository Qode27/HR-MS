import path from "node:path";
import { promises as fs } from "node:fs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { AppError } from "@backend/utils/errors";

type Params = { params: Promise<{ id: string }> };

function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export const GET = withApiGuard(async (_req: NextRequest, { params }: Params) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canRead, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:read"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canRead && !canSelf) throw new AppError("Forbidden", 403);

  const { id } = await params;
  const employee = await prisma.employee.findFirst({ where: { userId: session.sub }, select: { id: true } });
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError("Document not found", 404);

  const allowed =
    canManage ||
    canRead ||
    (canSelf && (doc.employeeId === employee?.id || (!doc.employeeId && !doc.candidateId)));
  if (!allowed) throw new AppError("Forbidden", 403);

  const bytes = await fs.readFile(doc.filePath);
  return new Response(bytes, {
    headers: {
      "Content-Type": contentTypeFor(doc.fileName),
      "Content-Disposition": `attachment; filename="${doc.fileName.replaceAll('"', "")}"`
    }
  });
});

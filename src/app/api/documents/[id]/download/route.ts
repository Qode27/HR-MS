import path from "node:path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { AppError } from "@backend/utils/errors";
import { readFileFromObjectStorage } from "@/lib/services/storage.service";

type Params = { params: Promise<{ id: string }> };

function contentTypeFor(fileName: string, mimeType?: string | null) {
  if (mimeType) return mimeType;
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canRead, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:read"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canRead && !canSelf) throw new AppError("Forbidden", 403);

  const { id } = await params;
  const tenantId = session.role === "MASTER_ADMIN" ? undefined : session.tenantId ?? "__missing_tenant__";
  const [employee, doc] = await Promise.all([
    prisma.employee.findFirst({ where: { userId: session.sub, ...(tenantId ? { tenantId } : {}) }, select: { id: true } }),
    prisma.document.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" } } } })
  ]);

  if (!doc || doc.deletedAt) throw new AppError("Document not found", 404);
  if (tenantId && doc.tenantId !== tenantId) throw new AppError("Document not found", 404);

  const allowed =
    canManage ||
    canRead ||
    (canSelf && (doc.employeeId === employee?.id || doc.scope === "COMPANY" || (!doc.employeeId && !doc.candidateId)));
  if (!allowed) throw new AppError("Forbidden", 403);

  const versionId = req.nextUrl.searchParams.get("versionId");
  const requestedVersion = req.nextUrl.searchParams.get("version");
  const version =
    (versionId ? doc.versions.find((item) => item.id === versionId) : undefined) ||
    (requestedVersion ? doc.versions.find((item) => item.version === Number(requestedVersion)) : undefined) ||
    doc.versions[0];

  if (!version?.storageKey) throw new AppError("Document version not found", 404);

  const bytes = await readFileFromObjectStorage(version.storageKey);
  const disposition = req.nextUrl.searchParams.get("preview") === "1" ? "inline" : "attachment";
  return new Response(bytes, {
    headers: {
      "Content-Type": contentTypeFor(version.fileName, version.mimeType),
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${disposition}; filename="${version.fileName.replaceAll('"', "")}"`,
      "X-Content-Type-Options": "nosniff"
    }
  });
});

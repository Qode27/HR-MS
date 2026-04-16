import { NextRequest } from "next/server";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { saveFile } from "@/lib/services/storage.service";
import { documentScope, DOCUMENT_CATEGORY_BY_TYPE } from "@/lib/document-center";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canRead, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:read"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canRead && !canSelf) throw new AppError("Forbidden", 403);

  const employee = await prisma.employee.findFirst({ where: { userId: session.sub }, select: { id: true } });
  const docs = await prisma.document.findMany({
    where:
      canManage || canRead
        ? undefined
        : {
            OR: [{ employeeId: employee?.id || "__none__" }, { employeeId: null, candidateId: null }]
          },
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      candidate: { select: { fullName: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  return success({
    role: session.role,
    canManage,
    canViewAll: canManage || canRead,
    items: docs.map((doc) => ({
      id: doc.id,
      type: doc.type,
      typeLabel: doc.type.replaceAll("_", " "),
      category: DOCUMENT_CATEGORY_BY_TYPE[doc.type],
      fileName: doc.fileName,
      version: doc.version,
      createdAt: doc.createdAt,
      scope: documentScope(doc),
      ownerLabel: doc.employee
        ? `${doc.employee.employeeCode} - ${doc.employee.firstName} ${doc.employee.lastName}`
        : doc.candidate?.fullName || "Company-wide",
      employeeId: doc.employeeId,
      candidateId: doc.candidateId
    }))
  });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "documents:manage");
  const formData = await req.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "OTHER") as DocumentType;
  const employeeId = formData.get("employeeId") ? String(formData.get("employeeId")) : undefined;
  const candidateId = formData.get("candidateId") ? String(formData.get("candidateId")) : undefined;

  if (employeeId && candidateId) throw new AppError("Choose either employee or candidate scope", 422);
  if (!(file instanceof File)) throw new AppError("File is required", 422);
  if (file.size > 8 * 1024 * 1024) throw new AppError("File exceeds 8MB limit", 422);
  if (!allowedTypes.has(file.type)) throw new AppError("Unsupported file type", 422);

  const bytes = Buffer.from(await file.arrayBuffer());
  const saved = await saveFile(bytes, file.name);

  const latest = await prisma.document.findFirst({
    where: { employeeId, candidateId, type },
    orderBy: { version: "desc" }
  });
  const version = (latest?.version || 0) + 1;

  const row = await prisma.document.create({
    data: {
      employeeId,
      candidateId,
      type,
      fileName: file.name,
      filePath: saved.path,
      version,
      uploadedById: session.sub
    }
  });

  return success({
    id: row.id,
    type: row.type,
    typeLabel: row.type.replaceAll("_", " "),
    category: DOCUMENT_CATEGORY_BY_TYPE[row.type],
    fileName: row.fileName,
    version: row.version,
    createdAt: row.createdAt,
    scope: documentScope(row),
    employeeId: row.employeeId,
    candidateId: row.candidateId
  }, undefined, 201);
});

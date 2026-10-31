import { NextRequest } from "next/server";
import { Prisma, DocumentScope, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasPermissionDynamic } from "@/lib/rbac.server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { writeAuditLog } from "@/lib/services/audit.service";
import { saveFileToObjectStorage } from "@/lib/services/storage.service";
import { documentScope, DOCUMENT_CATEGORY_BY_TYPE } from "@/lib/document-center";

const validDocumentTypes = new Set(Object.values(DocumentType));
const validScopes = new Set(Object.values(DocumentScope));

function serializeDocument(
  doc: Prisma.DocumentGetPayload<{
    include: {
      employee: { select: { employeeCode: true; firstName: true; lastName: true } };
      candidate: { select: { fullName: true } };
      versions: { orderBy: { version: "desc" } };
    };
  }>,
  uploadedByNames: Map<string, string>,
  canDelete: boolean
) {
  return {
    id: doc.id,
    type: doc.type,
    typeLabel: doc.type.replaceAll("_", " "),
    category: DOCUMENT_CATEGORY_BY_TYPE[doc.type],
    fileName: doc.fileName,
    version: doc.version,
    mimeType: doc.mimeType,
    fileSize: doc.fileSize,
    createdAt: doc.createdAt,
    uploadedById: doc.uploadedById,
    uploadedBy: doc.uploadedById ? uploadedByNames.get(doc.uploadedById) || "Unknown user" : "System",
    scope: documentScope(doc),
    ownerLabel: doc.employee
      ? `${doc.employee.employeeCode} - ${doc.employee.firstName} ${doc.employee.lastName}`
      : doc.candidate?.fullName || "Company-wide",
    employeeId: doc.employeeId,
    candidateId: doc.candidateId,
    canDelete,
    versions: doc.versions.map((version) => ({
      id: version.id,
      version: version.version,
      fileName: version.fileName,
      mimeType: version.mimeType,
      fileSize: version.fileSize,
      uploadedById: version.uploadedById,
      uploadedBy: version.uploadedById ? uploadedByNames.get(version.uploadedById) || "Unknown user" : "System",
      createdAt: version.createdAt
    }))
  };
}

export const GET = withApiGuard(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canRead, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:read"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canRead && !canSelf) throw new AppError("Forbidden", 403);

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const scope = params.get("scope")?.toUpperCase();
  const employeeId = params.get("employeeId") || undefined;
  const from = params.get("from");
  const to = params.get("to");

  if (scope && scope !== "ALL" && !validScopes.has(scope as DocumentScope)) throw new AppError("Invalid document scope", 422);

  const employee = await prisma.employee.findFirst({
    where: { userId: session.sub, ...(session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId ?? "__missing_tenant__" }) },
    select: { id: true }
  });
  const tenantWhere = session.role === "MASTER_ADMIN" ? {} : { tenantId: session.tenantId ?? "__missing_tenant__" };

  const where: Prisma.DocumentWhereInput = {
    ...tenantWhere,
    deletedAt: null,
    ...(scope && scope !== "ALL" ? { scope: scope as DocumentScope } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(q
      ? {
          OR: [
            { fileName: { contains: q, mode: "insensitive" } },
            { employee: { firstName: { contains: q, mode: "insensitive" } } },
            { employee: { lastName: { contains: q, mode: "insensitive" } } },
            { employee: { employeeCode: { contains: q, mode: "insensitive" } } }
          ]
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {})
          }
        }
      : {})
  };

  if (!canManage && !canRead) {
    where.OR = [{ employeeId: employee?.id || "__none__" }, { scope: "COMPANY" }, { employeeId: null, candidateId: null }];
  }

  const docs = await prisma.document.findMany({
    where,
    include: {
      employee: { select: { employeeCode: true, firstName: true, lastName: true } },
      candidate: { select: { fullName: true } },
      versions: { orderBy: { version: "desc" } }
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  const uploadedByIds = Array.from(new Set(docs.flatMap((doc) => [doc.uploadedById, ...doc.versions.map((version) => version.uploadedById)]).filter(Boolean))) as string[];
  const users = uploadedByIds.length
    ? await prisma.user.findMany({ where: { id: { in: uploadedByIds } }, select: { id: true, fullName: true } })
    : [];
  const uploadedByNames = new Map(users.map((user) => [user.id, user.fullName]));

  return success({
    role: session.role,
    canManage,
    canViewAll: canManage || canRead,
    items: docs.map((doc) => serializeDocument(doc, uploadedByNames, canManage || (canSelf && doc.employeeId === employee?.id)))
  });
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await getSession();
  if (!session) throw new AppError("Unauthorized", 401);

  const [canManage, canSelf] = await Promise.all([
    hasPermissionDynamic(session.role, "documents:manage"),
    hasPermissionDynamic(session.role, "documents:self")
  ]);
  if (!canManage && !canSelf) throw new AppError("Forbidden", 403);

  const formData = await req.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "OTHER") as DocumentType;
  const requestedScope = String(formData.get("scope") || "COMPANY").toUpperCase() as DocumentScope;
  let employeeId = formData.get("employeeId") ? String(formData.get("employeeId")) : undefined;

  if (!validDocumentTypes.has(type)) throw new AppError("Invalid document type", 422);
  if (!validScopes.has(requestedScope)) throw new AppError("Invalid document scope", 422);
  if (requestedScope === "CANDIDATE") throw new AppError("Candidate documents must be uploaded from the ATS module", 422);
  if (!(file instanceof File)) throw new AppError("File is required", 422);

  const tenantId = session.role === "MASTER_ADMIN" ? null : session.tenantId;
  if (session.role !== "MASTER_ADMIN" && !tenantId) throw new AppError("Tenant context missing", 403);
  let documentTenantId = tenantId;

  const currentEmployee = await prisma.employee.findFirst({
    where: { userId: session.sub, ...(tenantId ? { tenantId } : {}) },
    select: { id: true, tenantId: true }
  });

  if (!canManage) {
    if (!currentEmployee) throw new AppError("Employee profile not found", 404);
    if (requestedScope !== "EMPLOYEE") throw new AppError("Employees can upload only their own documents", 403);
    employeeId = currentEmployee.id;
  }

  if (requestedScope === "EMPLOYEE") {
    if (!employeeId) throw new AppError("Employee is required for employee-specific documents", 422);
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, ...(tenantId ? { tenantId } : {}) },
      select: { id: true, tenantId: true }
    });
    if (!employee) throw new AppError("Employee not found", 404);
    documentTenantId = tenantId ?? employee.tenantId;
  } else {
    employeeId = undefined;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const existing = await prisma.document.findFirst({
    where: {
      tenantId: documentTenantId,
      scope: requestedScope,
      employeeId: employeeId ?? null,
      candidateId: null,
      type,
      fileName: file.name,
      deletedAt: null
    },
    orderBy: { version: "desc" }
  });
  const nextVersion = (existing?.version || 0) + 1;
  const storage = await saveFileToObjectStorage({
    buffer: bytes,
    fileName: file.name,
    mimeType: file.type,
    tenantId: documentTenantId,
    documentId: existing?.id,
    version: nextVersion
  });

  const row = await prisma.$transaction(async (tx) => {
    const doc = existing
      ? await tx.document.update({
          where: { id: existing.id },
          data: {
            fileName: file.name,
            filePath: storage.storageKey,
            fileUrl: storage.fileUrl,
            storageKey: storage.storageKey,
            mimeType: file.type,
            fileSize: file.size,
            version: nextVersion,
            uploadedById: session.sub
          }
        })
      : await tx.document.create({
          data: {
            tenantId: documentTenantId,
            scope: requestedScope,
            employeeId,
            candidateId: null,
            type,
            fileName: file.name,
            filePath: storage.storageKey,
            fileUrl: storage.fileUrl,
            storageKey: storage.storageKey,
            mimeType: file.type,
            fileSize: file.size,
            version: nextVersion,
            uploadedById: session.sub
          }
        });

    await tx.documentVersion.create({
      data: {
        documentId: doc.id,
        version: nextVersion,
        fileName: file.name,
        fileUrl: storage.fileUrl,
        storageKey: storage.storageKey,
        mimeType: file.type,
        fileSize: file.size,
        uploadedById: session.sub
      }
    });

    return doc;
  });

  await writeAuditLog({
    userId: session.sub,
    action: "UPLOAD",
    module: "DOCUMENT",
    entityId: row.id,
    meta: { version: nextVersion, storageKey: storage.storageKey, scope: requestedScope, employeeId }
  });

  return success(
    {
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
    },
    undefined,
    201
  );
});

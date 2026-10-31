import { NextRequest } from "next/server";
import { DocumentType } from "@prisma/client";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { saveFileToObjectStorage } from "@/lib/services/storage.service";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/services/audit.service";

type Params = { params: Promise<{ id: string }> };

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const { id } = await params;
  const session = await requirePermission(req, "employee:manage");
  const formData = await req.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "OTHER") as DocumentType;

  if (!(file instanceof File)) throw new AppError("File is required", 422);

  const tenantId = session.role === "MASTER_ADMIN" ? null : session.tenantId;
  const employee = await prisma.employee.findFirst({
    where: { id, ...(tenantId ? { tenantId } : {}) },
    select: { id: true, tenantId: true }
  });
  if (!employee) throw new AppError("Employee not found", 404);
  const documentTenantId = tenantId ?? employee.tenantId;

  const existing = await prisma.document.findFirst({
    where: {
      tenantId: documentTenantId,
      scope: "EMPLOYEE",
      employeeId: id,
      candidateId: null,
      type,
      fileName: file.name,
      deletedAt: null
    },
    orderBy: { version: "desc" }
  });
  const nextVersion = (existing?.version || 0) + 1;
  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveFileToObjectStorage({
    buffer: bytes,
    fileName: file.name,
    mimeType: file.type,
    tenantId: documentTenantId,
    documentId: existing?.id,
    version: nextVersion
  });

  const doc = await prisma.$transaction(async (tx) => {
    const row = existing
      ? await tx.document.update({
          where: { id: existing.id },
          data: {
            filePath: stored.storageKey,
            fileUrl: stored.fileUrl,
            storageKey: stored.storageKey,
            mimeType: file.type,
            fileSize: file.size,
            version: nextVersion,
            uploadedById: session.sub
          }
        })
      : await tx.document.create({
          data: {
            employeeId: id,
            tenantId: documentTenantId,
            scope: "EMPLOYEE",
            type,
            fileName: file.name,
            filePath: stored.storageKey,
            fileUrl: stored.fileUrl,
            storageKey: stored.storageKey,
            mimeType: file.type,
            fileSize: file.size,
            uploadedById: session.sub,
            version: nextVersion
          }
        });

    await tx.documentVersion.create({
      data: {
        documentId: row.id,
        version: nextVersion,
        fileName: file.name,
        fileUrl: stored.fileUrl,
        storageKey: stored.storageKey,
        mimeType: file.type,
        fileSize: file.size,
        uploadedById: session.sub
      }
    });

    return row;
  });

  await writeAuditLog({
    userId: session.sub,
    action: "UPLOAD",
    module: "DOCUMENT",
    entityId: doc.id,
    meta: { version: nextVersion, scope: "EMPLOYEE", employeeId: id }
  });

  return success(doc, undefined, 201);
});

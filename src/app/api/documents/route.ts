import { NextRequest } from "next/server";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { saveFile } from "@/lib/services/storage.service";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:read");
  const docs = await prisma.document.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return success(docs);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "employee:manage");
  const formData = await req.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "OTHER") as DocumentType;
  const employeeId = formData.get("employeeId") ? String(formData.get("employeeId")) : undefined;
  const candidateId = formData.get("candidateId") ? String(formData.get("candidateId")) : undefined;

  if (!employeeId && !candidateId) throw new AppError("employeeId or candidateId is required", 422);
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

  return success(row, undefined, 201);
});

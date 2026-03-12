import { NextRequest } from "next/server";
import { DocumentType } from "@prisma/client";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { EmployeeService } from "@backend/services/employee.service";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";
import { saveFile } from "@/lib/services/storage.service";

type Params = { params: { id: string } };
const service = new EmployeeService();

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "employee:manage");
  const formData = await req.formData();
  const file = formData.get("file");
  const type = String(formData.get("type") || "OTHER") as DocumentType;

  if (!(file instanceof File)) throw new AppError("File is required", 422);
  if (file.size > 8 * 1024 * 1024) throw new AppError("File exceeds 8MB limit", 422);
  if (!allowedTypes.has(file.type)) throw new AppError("Unsupported file type", 422);

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await saveFile(bytes, file.name);
  const doc = await service.addDocument({
    employeeId: params.id,
    type,
    fileName: file.name,
    filePath: stored.path,
    uploadedById: session.sub
  });

  return success(doc, undefined, 201);
});

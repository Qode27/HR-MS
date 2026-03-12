import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { EmployeeService } from "@backend/services/employee.service";
import { success } from "@backend/utils/api-response";
import { AppError } from "@backend/utils/errors";

type Params = { params: { id: string } };
const service = new EmployeeService();

export const POST = withApiGuard(async (req: NextRequest, { params }: Params) => {
  const session = await requirePermission(req, "employee:manage");
  const payload = await req.json();
  if (!payload?.title) throw new AppError("Note title is required", 422);

  const note = await service.addNote(params.id, {
    title: String(payload.title).slice(0, 200),
    description: payload.description ? String(payload.description).slice(0, 2000) : undefined,
    actorUserId: session.sub
  });
  return success(note, undefined, 201);
});

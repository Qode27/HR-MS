import { NextRequest } from "next/server";
import { EmployeeController } from "@backend/controllers/employee.controller";
import { EmployeeService } from "@backend/services/employee.service";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { success } from "@backend/utils/api-response";

type Params = { params: { id: string } };

const controller = new EmployeeController();
const service = new EmployeeService();

export const GET = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "employee:read");
  return controller.detail(params.id);
});

export const PATCH = withApiGuard(async (req: NextRequest, { params }: Params) => {
  await requirePermission(req, "employee:manage");
  const payload = await req.json();
  const updated = await service.update(params.id, payload);
  return success(updated);
});

import { NextRequest } from "next/server";
import { employeeCreateSchema } from "@/lib/validators/schemas";
import { writeAuditLog } from "@/lib/services/audit.service";
import { EmployeeController } from "@backend/controllers/employee.controller";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { parseBody } from "@backend/utils/request";
import { success } from "@backend/utils/api-response";
import { EmployeeService } from "@backend/services/employee.service";

const controller = new EmployeeController();
const service = new EmployeeService();

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:read");
  return controller.list(req);
});

export const POST = withApiGuard(async (req: NextRequest) => {
  const session = await requirePermission(req, "employee:manage");
  const payload = parseBody(employeeCreateSchema, await req.json());

  const employee = await service.create(payload);

  await writeAuditLog({ userId: session.sub, action: "CREATE", module: "EMPLOYEE", entityId: employee.id });
  return success(employee, undefined, 201);
});

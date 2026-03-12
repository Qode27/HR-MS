import { NextRequest } from "next/server";
import { withApiGuard } from "@backend/middleware/with-api-guard";
import { requirePermission } from "@backend/middleware/auth-guard";
import { EmployeeController } from "@backend/controllers/employee.controller";

const controller = new EmployeeController();

export const GET = withApiGuard(async (req: NextRequest) => {
  await requirePermission(req, "employee:read");
  return controller.bootstrap();
});
